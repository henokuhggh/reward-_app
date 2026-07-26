require('dotenv').config();
const express = require('express');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');

const usersRoutes = require('./routes/users');
const channelsRoutes = require('./routes/channels');
const adsRoutes = require('./routes/ads');
const withdrawalsRoutes = require('./routes/withdrawals');
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

  bot.sendMessage(chatId, 'Welcome! Open the app to start earning.', {
    reply_markup: {
      inline_keyboard: [[{ text: 'Open App', web_app: { url: startAppUrl } }]]
    }
  });
});

app.use('/api/users', usersRoutes);
app.use('/api/channels', channelsRoutes);
app.use('/api/ads', adsRoutes);
app.use('/api/withdrawals', withdrawalsRoutes);
app.use('/api/admin', adminRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
