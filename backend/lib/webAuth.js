const jwt = require('jsonwebtoken');
const supabase = require('./supabase');
const { verifyTelegramInitData } = require('./telegramAuth');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = '30d';

if (!JWT_SECRET) {
  // Fail loudly at startup rather than silently signing tokens with
  // `undefined`, which would make every website session forgeable.
  console.error('FATAL: JWT_SECRET is not set. Website phone/password auth will not work.');
}

function signToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * Express middleware: accepts EITHER a Telegram mini app request
 * (header x-telegram-init-data, verified the same way it always
 * has been) OR a website request (header Authorization: Bearer
 * <jwt>, issued by POST /api/auth/login or /register).
 *
 * On success sets req.user = { id, ... } (the full users row) so
 * downstream routes have one consistent shape to read from,
 * regardless of which auth path was used. Existing routes that
 * currently do `.eq('telegram_id', req.telegramUser.id)` keep
 * working unchanged for Telegram requests - req.telegramUser is
 * still set exactly as before. New/updated routes should prefer
 * req.user.id instead, since it works for both auth types.
 */
async function requireAnyAuth(req, res, next) {
  const initData = req.header('x-telegram-init-data');
  const authHeader = req.header('authorization');

  if (initData) {
    const tgUser = verifyTelegramInitData(initData, process.env.BOT_TOKEN);
    if (!tgUser) return res.status(401).json({ error: 'Invalid or missing Telegram authentication' });

    req.telegramUser = tgUser;

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', tgUser.id)
      .maybeSingle();

    req.user = user || null;

    supabase.rpc('touch_user_activity', { p_telegram_id: tgUser.id }).then(() => {}, () => {});

    return next();
  }

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length);
    const payload = verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Invalid or expired session' });

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', payload.sub)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!user) return res.status(401).json({ error: 'Account no longer exists' });

    req.user = user;
    return next();
  }

  return res.status(401).json({ error: 'Authentication required' });
}

module.exports = { signToken, verifyToken, requireAnyAuth };
