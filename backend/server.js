require('dotenv').config();
const express = require('express');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');
const supabase = require('./lib/supabase');

const usersRoutes = require('./routes/users');
const productsRoutes = require('./routes/products');
const walletRoutes = require('./routes/wallet');
const teamRoutes = require('./routes/team');
const profileRoutes = require('./routes/profile');
const adminRoutes = require('./routes/admin');

const app = express();
app.use(cors());
app.use(express.json());

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

  bot.sendMessage(chatId, 'Welcome! Open the app to start investing.', {
    reply_markup: {
      inline_keyboard: [[{ text: 'Open App', web_app: { url: startAppUrl } }]]
    }
  });
});

app.use('/api/users', usersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Daily earnings run on a rolling 24h cycle per purchase, not a
// fixed midnight cron - run_due_earnings() finds whatever purchases
// are due right now and credits them, so this just needs to run
// often enough that no one waits too long past their actual due
// time. Every 5 minutes keeps that lag small without hammering the
// database. FOR UPDATE SKIP LOCKED in the RPC means overlapping runs
// (e.g. a slow run plus the next scheduled tick) can't double-pay.
const EARNINGS_INTERVAL_MS = 5 * 60 * 1000;

async function runEarningsTick() {
  const { data, error } = await supabase.rpc('run_due_earnings');
  if (error) {
    console.error('run_due_earnings failed:', error.message);
    return;
  }
  if (data) {
    console.log(`run_due_earnings: credited ${data} purchase cycle(s)`);
  }
}

setInterval(runEarningsTick, EARNINGS_INTERVAL_MS);
runEarningsTick();
