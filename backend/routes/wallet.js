const express = require('express');
const supabase = require('../lib/supabase');
const { requireTelegramAuth } = require('../lib/telegramAuth');

const router = express.Router();

async function getUser(telegramId) {
  const { data } = await supabase.from('users').select('*').eq('telegram_id', telegramId).maybeSingle();
  return data;
}

/**
 * GET /api/wallet/payment-methods
 * Step 2 of the deposit flow: the list of admin-configured banks
 * and mobile wallets (name, logo, account details) a user can pay
 * into. Only active methods are shown.
 */
router.get('/payment-methods', requireTelegramAuth, async (req, res) => {
  const { data: methods, error } = await supabase
    .from('payment_methods')
    .select('id, name, logo_url, account_name, account_number, instructions')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ methods });
});

/**
 * POST /api/wallet/deposits
 * Step 3 of the deposit flow: user has already sent money manually
 * to the account shown in step 2, and now submits the transaction
 * reference for admin review. Body: { amount, paymentMethodId, referenceCode }
 */
router.post('/deposits', requireTelegramAuth, async (req, res) => {
  const { amount, paymentMethodId, referenceCode } = req.body || {};

  if (!amount || !paymentMethodId || !referenceCode) {
    return res.status(400).json({ error: 'amount, paymentMethodId, and referenceCode are required' });
  }

  const user = await getUser(req.telegramUser.id);
  if (!user) return res.status(404).json({ error: 'User not found, call /session first' });

  const { data: settings } = await supabase.from('app_settings').select('*').single();
  const minDeposit = settings?.min_deposit ?? 1000;

  if (Number(amount) < minDeposit) {
    return res.status(400).json({ error: `Minimum deposit is ${minDeposit} birr` });
  }

  const { data: deposit, error } = await supabase
    .from('deposits')
    .insert({
      user_id: user.id,
      payment_method_id: paymentMethodId,
      amount,
      reference_code: referenceCode
    })
    .select('*')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ deposit });
});

/**
 * GET /api/wallet/deposits/mine
 */
router.get('/deposits/mine', requireTelegramAuth, async (req, res) => {
  const user = await getUser(req.telegramUser.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { data: deposits, error } = await supabase
    .from('deposits')
    .select('*, payment_methods(name, logo_url)')
    .eq('user_id', user.id)
    .order('requested_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ deposits });
});

/**
 * POST /api/wallet/withdrawals
 * Only allowed once the user has made at least one approved deposit
 * (has_deposited). Balance is NOT deducted here - only on admin
 * approval - so a rejected request never costs the user anything.
 * Body: { amount, method, accountDetails }
 */
router.post('/withdrawals', requireTelegramAuth, async (req, res) => {
  const { amount, method, accountDetails } = req.body || {};

  if (!amount || !method || !accountDetails) {
    return res.status(400).json({ error: 'amount, method, and accountDetails are required' });
  }

  const user = await getUser(req.telegramUser.id);
  if (!user) return res.status(404).json({ error: 'User not found, call /session first' });

  if (!user.has_deposited) {
    return res.status(403).json({ error: 'You must make a deposit before you can withdraw' });
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
 * GET /api/wallet/withdrawals/mine
 */
router.get('/withdrawals/mine', requireTelegramAuth, async (req, res) => {
  const user = await getUser(req.telegramUser.id);
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
