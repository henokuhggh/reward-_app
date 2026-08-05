const crypto = require('crypto');
const supabase = require('./supabase');

/**
 * Validates Telegram Mini App initData per Telegram's documented algorithm.
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * This is the ONLY legitimate way to know a request really comes from
 * Telegram and really is the user it claims to be - there is no
 * separate "login form", sign-up is just opening the mini app.
 */
function verifyTelegramInitData(initData, botToken) {
  if (!initData) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;

  params.delete('hash');

  const dataCheckArr = [];
  for (const [key, value] of [...params.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    dataCheckArr.push(`${key}=${value}`);
  }
  const dataCheckString = dataCheckArr.join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (computedHash !== hash) return null;

  // Reject stale initData (older than 24h) to limit replay window
  const authDate = parseInt(params.get('auth_date'), 10);
  if (!authDate || Date.now() / 1000 - authDate > 86400) return null;

  const userJson = params.get('user');
  if (!userJson) return null;

  try {
    return JSON.parse(userJson); // { id, first_name, username, ... }
  } catch {
    return null;
  }
}

/**
 * Express middleware: expects header 'x-telegram-init-data'.
 * Attaches req.telegramUser on success, 401s otherwise.
 * Also updates last_active_at (fire-and-forget, doesn't block the
 * request or fail it if this update has a problem).
 */
function requireTelegramAuth(req, res, next) {
  const initData = req.header('x-telegram-init-data');
  const user = verifyTelegramInitData(initData, process.env.BOT_TOKEN);

  if (!user) {
    return res.status(401).json({ error: 'Invalid or missing Telegram authentication' });
  }

  req.telegramUser = user;

  supabase.rpc('touch_user_activity', { p_telegram_id: user.id }).then(
    () => {},
    () => {} // activity tracking is best-effort, never blocks the request
  );

  next();
}

module.exports = { verifyTelegramInitData, requireTelegramAuth };
