const express = require('express');
const bcrypt = require('bcryptjs');
const supabase = require('../lib/supabase');
const { signToken } = require('../lib/webAuth');

const router = express.Router();

// Basic E.164-ish check - digits only, optional leading +, 8-15
// digits. Deliberately loose (not country-specific) since this app
// serves users who may enter local-format numbers.
function isValidPhone(phone) {
  return /^\+?[0-9]{8,15}$/.test(phone);
}

/**
 * POST /api/auth/register
 * Body: { phone, password, firstName?, referralCode? }
 * Website signup - completely separate from Telegram's
 * POST /api/users/session, but grants the same signup bonus and
 * records referrals the same way, via register_user_by_phone().
 */
router.post('/register', async (req, res) => {
  const { phone, password, firstName, referralCode } = req.body || {};

  if (!phone || !isValidPhone(phone)) {
    return res.status(400).json({ error: 'A valid phone number is required' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('phone', phone)
    .maybeSingle();

  if (existing) {
    return res.status(409).json({ error: 'An account with this phone number already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const { data: created, error } = await supabase.rpc('register_user_by_phone', {
    p_phone: phone,
    p_password_hash: passwordHash,
    p_first_name: firstName || null,
    p_referral_code: referralCode || null
  });

  if (error) return res.status(500).json({ error: error.message });

  const newUser = created?.[0];
  if (!newUser) return res.status(500).json({ error: 'Registration failed' });

  // Referral invite bonus (credit_referral_bonus) has been
  // discontinued - inviters no longer receive a bonus just for a
  // referred signup. The referral relationship (referred_by) is
  // still recorded above, so team/invite counts and any ongoing
  // referral rank payouts are unaffected.

  const token = signToken(newUser.id);
  const { password_hash, ...safeUser } = newUser;
  return res.json({ token, user: safeUser });
});

/**
 * POST /api/auth/login
 * Body: { phone, password }
 */
router.post('/login', async (req, res) => {
  const { phone, password } = req.body || {};

  if (!phone || !password) {
    return res.status(400).json({ error: 'Phone and password are required' });
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('phone', phone)
    .eq('auth_provider', 'phone')
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });

  // Same generic error whether the phone doesn't exist or the
  // password is wrong, so a login attempt can't be used to probe
  // which phone numbers have accounts.
  if (!user || !user.password_hash) {
    return res.status(401).json({ error: 'Invalid phone number or password' });
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    return res.status(401).json({ error: 'Invalid phone number or password' });
  }

  const token = signToken(user.id);
  const { password_hash, ...safeUser } = user;
  return res.json({ token, user: safeUser });
});

/**
 * GET /api/auth/me
 * Website equivalent of GET /api/users/me (which is Telegram-only).
 * Requires Authorization: Bearer <jwt> from a prior login/register.
 */
router.get('/me', require('../lib/webAuth').requireAnyAuth, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not logged in' });

  const { count: totalInvited } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('referred_by', req.user.id);

  const { count: activeInvited } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('referred_by', req.user.id)
    .eq('has_deposited', true);

  const siteUrl = process.env.SITE_URL;
  const referralLink = siteUrl ? `${siteUrl.replace(/\/$/, '')}/r/${req.user.referral_code}` : null;

  const { password_hash, ...safeUser } = req.user;

  return res.json({
    user: {
      ...safeUser,
      total_invited: totalInvited ?? 0,
      active_invited: activeInvited ?? 0,
      referral_link: referralLink,
      is_admin: false,
      admin_role: null
    }
  });
});

module.exports = router;