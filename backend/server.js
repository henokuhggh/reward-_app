require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const TelegramBot = require('node-telegram-bot-api');
const supabase = require('./lib/supabase');
const { BingoEngine } = require('./lib/bingoEngine');

const usersRoutes = require('./routes/users');
const bingoRoutes = require('./routes/bingo');
const walletRoutes = require('./routes/wallet');
const teamRoutes = require('./routes/team');
const profileRoutes = require('./routes/profile');
const adminRoutes = require('./routes/admin');

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = http.createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

// Every player watching a round's lobby or live game joins a room
// named `bingo:<roundId>` so number-calls and lobby updates only go
// to people actually in that round, not every connected client.
io.on('connection', (socket) => {
  socket.on('join_round', (roundId) => {
    if (roundId) socket.join(`bingo:${roundId}`);
  });
  socket.on('leave_round', (roundId) => {
    if (roundId) socket.leave(`bingo:${roundId}`);
  });
});

const bingoEngine = new BingoEngine(io);
app.locals.bingoEngine = bingoEngine;

// Bot runs in polling mode for simplicity. On Railway this is fine
// for a single instance; switch to webhooks if you scale to
// multiple instances to avoid duplicate polling conflicts.
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
app.locals.bot = bot;

const MINI_APP_URL = process.env.MINI_APP_URL;

// /start command - this doubles as the referral entry point.
// Telegram deep links pass the referral code as the start param:
// https://t.me/YourBot?start=REFERRALCODE
bot.onText(/\/start(?:\s+(.+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const referralCode = match?.[1];

  const startAppUrl = referralCode
    ? `${MINI_APP_URL}?startapp=${encodeURIComponent(referralCode)}`
    : MINI_APP_URL;

  bot.sendMessage(chatId, 'Welcome! Open the app to play Bingo.', {
    reply_markup: {
      inline_keyboard: [[{ text: 'Open App', web_app: { url: startAppUrl } }]]
    }
  });
});

app.use('/api/users', usersRoutes);
app.use('/api/bingo', bingoRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// On boot, resume driving any rounds that were left active/waiting
// from before a restart (e.g. a deploy), so a mid-game restart
// doesn't strand players with a round that never finishes.
async function resumeInFlightRounds() {
  const { data: rounds, error } = await supabase
    .from('bingo_rounds')
    .select('id, status')
    .in('status', ['waiting', 'active']);

  if (error) {
    console.error('resumeInFlightRounds failed:', error.message);
    return;
  }

  for (const round of rounds || []) {
    if (round.status === 'waiting') {
      bingoEngine.ensureWaitingWatcher(round.id);
    } else if (round.status === 'active') {
      bingoEngine.driveDraws(round.id);
    }
  }
}

resumeInFlightRounds();
