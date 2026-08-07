const express = require('express');
const supabase = require('../lib/supabase');
const { requireTelegramAuth } = require('../lib/telegramAuth');

const router = express.Router();

/**
 * POST /api/users/session
 * Called once when the mini app opens. Creates the user row if it
 * doesn't exist yet (this IS the "sign up" - there is no separate
 * form, opening the mini app through Telegram is the signup/login).
 * Registration is Telegram-only by design: Telegram's initData gives
 * a verified, real identity for free, so there is no separate phone
 * or password signup path for this app.
 * Body: { referralCode?: string }
 */
router.post('/session', requireTelegramAuth, async (req, res) => {
  const tgUser = req.telegramUser;
  const { referralCode } = req.body || {};

  const { data: existing, error: findErr } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', tgUser.id)
    .maybeSingle();

  if (findErr) return res.status(500).json({ error: findErr.message });

  if (existing) {
    return res.json({ user: existing, isNew: false });
  }

  // register_user grants the signup bonus and records the referral
  // atomically, so there is no window where a user exists without
  // their bonus or a referral goes unrecorded.
  const { data: created, error: registerErr } = await supabase.rpc('register_user', {
    p_telegram_id: tgUser.id,
    p_telegram_username: tgUser.username || null,
    p_first_name: tgUser.first_name || null,
    p_referral_code: referralCode || null
  });

  if (registerErr) return res.status(500).json({ error: registerErr.message });

  const newUser = created?.[0];

  // Referral invite bonus (credit_referral_bonus, formerly 10 birr
  // per invite) has been discontinued - inviters no longer receive a
  // bonus just for a referred signup. The referral relationship
  // (referred_by) is still recorded above, so team/invite counts and
  // any ongoing referral rank payouts are unaffected.

  return res.json({ user: newUser, isNew: true });
});

/**
 * GET /api/users/me
 * Returns current balance, signup bonus, and profile.
 */
router.get('/me', requireTelegramAuth, async (req, res) => {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', req.telegramUser.id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!user) return res.status(404).json({ error: 'User not found, call /session first' });

  // Count all users this person referred, and separately how many of
  // those have made a deposit (the "active" definition used across
  // the app - active means deposited, not just registered).
  const { count: totalInvited } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('referred_by', user.id);

  const { count: activeInvited } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('referred_by', user.id)
    .eq('has_deposited', true);

  const botUsername = process.env.BOT_USERNAME;
  const referralLink = botUsername ? `https://t.me/${botUsername}?start=${user.referral_code}` : null;

  // This flag only controls whether the admin toggle appears in the
  // UI. It grants no actual access - every /api/admin/* route
  // independently re-checks the `admins` table via requireAdmin, so
  // a modified client claiming isAdmin=true still gets rejected
  // server-side on any real admin action.
  const { data: adminRow } = await supabase
    .from('admins')
    .select('role')
    .eq('telegram_id', String(req.telegramUser.id))
    .maybeSingle();
  const isAdmin = Boolean(adminRow);

  return res.json({
    user: {
      ...user,
      total_invited: totalInvited ?? 0,
      active_invited: activeInvited ?? 0,
      referral_link: referralLink,
      is_admin: isAdmin,
      admin_role: adminRow?.role ?? null
    }
  });
});

module.exports = router;
