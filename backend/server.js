require('dotenv').config();
const express = require('express');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');
const supabase = require('./lib/supabase');
const { seedOwnersFromEnv } = require('./lib/adminAuth');

const usersRoutes = require('./routes/users');
const authRoutes = require('./routes/auth');
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

  bot.sendMessage(chatId, 'Welcome! Open the app to get started.', {
    reply_markup: {
      inline_keyboard: [[{ text: 'Open App', web_app: { url: startAppUrl } }]]
    }
  });
});

app.use('/api/users', usersRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes);

// Catches multer errors (file too large, wrong type) and any other
// thrown/next(err) errors from the routes above, so they come back
// as JSON instead of crashing the request with an HTML stack trace.
app.use((err, req, res, next) => {
  if (err) {
    console.error(err);
    return res.status(400).json({ error: err.message || 'Unexpected error' });
  }
  next();
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Seed owner admin(s) from ADMIN_TELEGRAM_IDS on first boot only
// (no-ops once the `admins` table has any rows). See lib/adminAuth.js.
seedOwnersFromEnv();

// Daily product-return crediting. Runs credit_daily_returns() every
// hour; the function itself is idempotent per calendar day (it
// skips any purchase already credited today), so an hourly interval
// just means credits land within an hour of midnight rather than
// needing a precise cron - no external scheduler required.
const DAILY_CREDIT_CHECK_INTERVAL_MS = 60 * 60 * 1000;

async function runDailyCredits() {
  const { data, error } = await supabase.rpc('credit_daily_returns');
  if (error) {
    console.error('credit_daily_returns failed:', error.message);
    return;
  }
  const result = data?.[0];
  if (result && result.purchases_credited > 0) {
    console.log(`Daily credits: ${result.purchases_credited} purchases, ${result.total_credited} birr total`);
  }
}

runDailyCredits();
setInterval(runDailyCredits, DAILY_CREDIT_CHECK_INTERVAL_MS);
