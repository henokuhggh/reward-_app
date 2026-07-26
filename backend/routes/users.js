const express = require('express');
const { nanoid } = require('nanoid');
const supabase = require('../lib/supabase');
const { requireTelegramAuth } = require('../lib/telegramAuth');

const router = express.Router();

/**
 * POST /api/users/session
 * Called once when the mini app opens. Creates the user row if it
 * doesn't exist yet (this IS the "sign up" - there is no separate
 * form, opening the mini app through Telegram is the signup/login).
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

  // Resolve referrer, if a valid referral code was passed
  let referredBy = null;
  if (referralCode) {
    const { data: referrer } = await supabase
      .from('users')
      .select('id')
      .eq('referral_code', referralCode)
      .maybeSingle();
    if (referrer) referredBy = referrer.id;
  }

  const { data: created, error: insertErr } = await supabase
    .from('users')
    .insert({
      telegram_id: tgUser.id,
      telegram_username: tgUser.username || null,
      first_name: tgUser.first_name || null,
      referral_code: nanoid(8),
      referred_by: referredBy
    })
    .select('*')
    .single();

  if (insertErr) return res.status(500).json({ error: insertErr.message });

  // Record referral bonus (not yet paid - paid out after the referred
  // user completes at least one real action, handled in referrals.js)
  if (referredBy) {
    const { data: settings } = await supabase.from('app_settings').select('*').single();
    await supabase.from('referrals').insert({
      referrer_id: referredBy,
      referred_id: created.id,
      bonus_amount: settings?.referral_bonus ?? 100.0
    });
  }

  return res.json({ user: created, isNew: true });
});

/**
 * GET /api/users/me
 * Returns current balance and profile.
 */
router.get('/me', requireTelegramAuth, async (req, res) => {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', req.telegramUser.id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!user) return res.status(404).json({ error: 'User not found, call /session first' });

  return res.json({ user });
});

module.exports = router;
