const express = require('express');
const supabase = require('../lib/supabase');
const { requireTelegramAuth } = require('../lib/telegramAuth');

const router = express.Router();

/**
 * POST /api/withdrawals
 * Body: { amount, method, accountDetails }
 * Balance is NOT deducted here - only on admin approval - so a
 * rejected request never costs the user anything they can't get back.
 */
router.post('/', requireTelegramAuth, async (req, res) => {
  const { amount, method, accountDetails } = req.body || {};

  if (!amount || !method || !accountDetails) {
    return res.status(400).json({ error: 'amount, method, and accountDetails are required' });
  }

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', req.telegramUser.id)
    .maybeSingle();

  if (!user) return res.status(404).json({ error: 'User not found, call /session first' });

  const { data: settings } = await supabase.from('app_settings').select('*').single();
  const minWithdrawal = settings?.min_withdrawal ?? 50.0;

  if (Number(amount) < minWithdrawal) {
    return res.status(400).json({ error: `Minimum withdrawal is ${minWithdrawal} ETB` });
  }
  if (Number(amount) > Number(user.balance)) {
    return res.status(400).json({ error: 'Insufficient balance' });
  }

  // Check for an existing pending withdrawal to avoid stacking requests
  // against the same balance before the first is reviewed
  const { data: pending } = await supabase
    .from('withdrawals')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .maybeSingle();

  if (pending) {
    return res.status(409).json({ error: 'You already have a pending withdrawal request' });
  }

  const { data: withdrawal, error } = await supabase
    .from('withdrawals')
    .insert({
      user_id: user.id,
      amount,
      method,
      account_details: accountDetails
    })
    .select('*')
    .single();

  if (error) return res.status(500).json({ error: error.message });

  return res.json({ withdrawal });
});

/**
 * GET /api/withdrawals/mine
 * Withdrawal history for the current user.
 */
router.get('/mine', requireTelegramAuth, async (req, res) => {
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('telegram_id', req.telegramUser.id)
    .maybeSingle();

  if (!user) return res.status(404).json({ error: 'User not found' });

  const { data: withdrawals, error } = await supabase
    .from('withdrawals')
    .select('*')
    .eq('user_id', user.id)
    .order('requested_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  return res.json({ withdrawals });
});

module.exports = router;
