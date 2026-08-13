const supabase = require('./supabase');

// Looks up the requesting user in the `admins` table and attaches
// their role to the request. An admin can be identified either by
// Telegram ID (requestor opened the mini app) or by phone number
// (requestor logged into the website with phone/password) - whichever
// identity the current request carries. Replaces the old flat
// ADMIN_TELEGRAM_IDS env-var check, which couldn't express "some
// admins can do less than others" and couldn't recognize a
// phone-based admin at all.
async function requireAdmin(req, res, next) {
  const requestingTelegramId = req.telegramUser?.id ? String(req.telegramUser.id) : null;
  const requestingPhone = req.user?.phone || null;

  if (!requestingTelegramId && !requestingPhone) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  let query = supabase.from('admins').select('id, role, telegram_id, phone');

  if (requestingTelegramId && requestingPhone) {
    query = query.or(`telegram_id.eq.${requestingTelegramId},phone.eq.${requestingPhone}`);
  } else if (requestingTelegramId) {
    query = query.eq('telegram_id', requestingTelegramId);
  } else {
    query = query.eq('phone', requestingPhone);
  }

  const { data: admin, error } = await query.maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!admin) return res.status(403).json({ error: 'Admin access required' });

  req.admin = admin;
  next();
}

// Gate for owner-only actions: adding/removing admins, approving
// or rejecting withdrawals, approving or rejecting deposits, and
// editing payment methods. Must run after requireAdmin.
function requireOwner(req, res, next) {
  if (req.admin?.role !== 'owner') {
    return res.status(403).json({ error: 'Only the owner admin can do this' });
  }
  next();
}

// One-time convenience: if the `admins` table is completely empty
// (fresh deploy) and ADMIN_TELEGRAM_IDS is set in the environment,
// seed those IDs in as owners so the first deploy isn't locked out
// with no way to grant anyone access. No-ops once any admin exists.
async function seedOwnersFromEnv() {
  const { count, error: countErr } = await supabase
    .from('admins')
    .select('*', { count: 'exact', head: true });

  if (countErr) {
    console.error('seedOwnersFromEnv: failed to check admins table:', countErr.message);
    return;
  }
  if ((count ?? 0) > 0) return;

  const ids = (process.env.ADMIN_TELEGRAM_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  if (ids.length === 0) return;

  const rows = ids.map((telegram_id) => ({ telegram_id, role: 'owner' }));
  const { error: insertErr } = await supabase.from('admins').insert(rows);
  if (insertErr) {
    console.error('seedOwnersFromEnv: failed to seed owners:', insertErr.message);
  } else {
    console.log(`Seeded ${rows.length} owner admin(s) from ADMIN_TELEGRAM_IDS`);
  }
}

module.exports = { requireAdmin, requireOwner, seedOwnersFromEnv };
