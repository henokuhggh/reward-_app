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
  const minDeposit = settings?.min_deposit ?? 10;

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
 * GET /api/wallet/deposit-terms
 * The current minimum deposit, so the frontend can show and
 * validate against the real admin-configured value instead of
 * guessing a hardcoded number.
 */
router.get('/deposit-terms', requireTelegramAuth, async (req, res) => {
  const { data: settings, error } = await supabase.from('app_settings').select('min_deposit').single();
  if (error) return res.status(500).json({ error: error.message });

  return res.json({
    minDeposit: settings?.min_deposit ?? 10
  });
});

/**
 * GET /api/wallet/withdrawal-terms
 * The current minimum withdrawal and fee percent, so the frontend
 * can show an accurate live breakdown before the user submits -
 * without needing admin access to read app_settings directly.
 */
router.get('/withdrawal-terms', requireTelegramAuth, async (req, res) => {
  const { data: settings, error } = await supabase.from('app_settings').select('min_withdrawal, withdrawal_fee_percent').single();
  if (error) return res.status(500).json({ error: error.message });

  return res.json({
    minWithdrawal: settings?.min_withdrawal ?? 200,
    feePercent: settings?.withdrawal_fee_percent ?? 10
  });
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

  const { data: settings } = await supabase.from('app_settings').select('*').single();
  const minWithdrawal = settings?.min_withdrawal ?? 200;
  const feePercent = settings?.withdrawal_fee_percent ?? 10;

  const requestedAmount = Number(amount);

  if (requestedAmount < minWithdrawal) {
    return res.status(400).json({ error: `Minimum withdrawal is ${minWithdrawal} birr` });
  }

  if (requestedAmount > Number(user.balance)) {
    return res.status(400).json({ error: 'Insufficient balance' });
  }

  // The full requested amount is deducted from the user's balance;
  // the fee is kept by the platform and only the net amount is paid
  // out to the user. Both figures are stored so the user and admin
  // see the same breakdown - fee_amount and net_amount are computed
  // once here, not recalculated later, so a mid-flight change to
  // withdrawal_fee_percent can never alter an already-submitted
  // request.
  const feeAmount = Math.round(requestedAmount * (feePercent / 100) * 100) / 100;
  const netAmount = Math.round((requestedAmount - feeAmount) * 100) / 100;

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
      amount: requestedAmount,
      fee_amount: feeAmount,
      net_amount: netAmount,
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
