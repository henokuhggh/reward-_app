function requireAdmin(req, res, next) {
  const adminIds = (process.env.ADMIN_TELEGRAM_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  const requestingId = String(req.telegramUser?.id || '');

  if (!requestingId || !adminIds.includes(requestingId)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
}

module.exports = { requireAdmin };
