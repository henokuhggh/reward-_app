const express = require('express');
const supabase = require('../lib/supabase');
const { requireTelegramAuth } = require('../lib/telegramAuth');
const { requireAdmin } = require('../lib/adminAuth');

const router = express.Router();

router.use(requireTelegramAuth, requireAdmin);

/**
 * GET /api/admin/stats
 * Total users, active users (made at least one deposit), and total
 * deposited across the platform - the headline numbers for the
 * admin dashboard.
 */
router.get('/stats', async (req, res) => {
  const { count: totalUsers, error: totalErr } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  if (totalErr) return res.status(500).json({ error: totalErr.message });

  const { count: activeUsers, error: activeErr } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('has_deposited', true);

  if (activeErr) return res.status(500).json({ error: activeErr.message });

  const { data: totals, error: totalsErr } = await supabase
    .from('users')
    .select('total_deposited');

  if (totalsErr) return res.status(500).json({ error: totalsErr.message });

  const totalDeposited = (totals || []).reduce((sum, u) => sum + Number(u.total_deposited || 0), 0);

  return res.json({
    totalUsers: totalUsers ?? 0,
    activeUsers: activeUsers ?? 0,
    totalDeposited
  });
});

/**
 * GET /api/admin/users
 * Every user with balance and referral counts, for the admin table
 * showing name / balance / invited users.
 */
router.get('/users', async (req, res) => {
  const { data: users, error } = await supabase
    .from('users')
    .select('id, telegram_id, telegram_username, first_name, balance, signup_bonus, has_deposited, total_deposited, is_banned, created_at')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  // Attach invited count per user without an N+1 query - pull all
  // referred_by values in one shot and tally them client-side.
  const { data: referredRows } = await supabase.from('users').select('referred_by').not('referred_by', 'is', null);
  const inviteCounts = {};
  for (const row of referredRows || []) {
    inviteCounts[row.referred_by] = (inviteCounts[row.referred_by] || 0) + 1;
  }

  const withCounts = (users || []).map((u) => ({ ...u, invited_count: inviteCounts[u.id] || 0 }));

  return res.json({ users: withCounts });
});

// ============================================================
// PRODUCTS
// ============================================================

/**
 * GET /api/admin/products
 * All products including inactive ones, for the admin management view.
 */
router.get('/products', async (req, res) => {
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .order('level', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ products });
});

/**
 * POST /api/admin/products
 * Body: { name, imageUrl, level, price, dailyPercent, durationDays?, maxTotalPayoutMultiple? }
 */
router.post('/products', async (req, res) => {
  const { name, imageUrl, level, price, dailyPercent, durationDays, maxTotalPayoutMultiple } = req.body || {};

  if (!name || level === undefined || !price || !dailyPercent) {
    return res.status(400).json({ error: 'name, level, price, and dailyPercent are required' });
  }

  const { data: product, error } = await supabase
    .from('products')
    .insert({
      name,
      image_url: imageUrl || null,
      level,
      price,
      daily_percent: dailyPercent,
      duration_days: durationDays || null,
      max_total_payout_multiple: maxTotalPayoutMultiple || 3.0
    })
    .select('*')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ product });
});

/**
 * PATCH /api/admin/products/:id
 * Body: any subset of the same fields as POST, plus isActive
 */
router.patch('/products/:id', async (req, res) => {
  const { name, imageUrl, level, price, dailyPercent, durationDays, maxTotalPayoutMultiple, isActive } = req.body || {};

  const updates = {};
  if (name !== undefined) updates.name = name;
  if (imageUrl !== undefined) updates.image_url = imageUrl;
  if (level !== undefined) updates.level = level;
  if (price !== undefined) updates.price = price;
  if (dailyPercent !== undefined) updates.daily_percent = dailyPercent;
  if (durationDays !== undefined) updates.duration_days = durationDays;
  if (maxTotalPayoutMultiple !== undefined) updates.max_total_payout_multiple = maxTotalPayoutMultiple;
  if (isActive !== undefined) updates.is_active = isActive;

  const { data: product, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', req.params.id)
    .select('*')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ product });
});

// ============================================================
// PAYMENT METHODS
// ============================================================

router.get('/payment-methods', async (req, res) => {
  const { data: methods, error } = await supabase
    .from('payment_methods')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ methods });
});

/**
 * POST /api/admin/payment-methods
 * Body: { name, logoUrl, accountName, accountNumber, instructions?, sortOrder? }
 */
router.post('/payment-methods', async (req, res) => {
  const { name, logoUrl, accountName, accountNumber, instructions, sortOrder } = req.body || {};

  if (!name || !accountName || !accountNumber) {
    return res.status(400).json({ error: 'name, accountName, and accountNumber are required' });
  }

  const { data: method, error } = await supabase
    .from('payment_methods')
    .insert({
      name,
      logo_url: logoUrl || null,
      account_name: accountName,
      account_number: accountNumber,
      instructions: instructions || null,
      sort_order: sortOrder || 0
    })
    .select('*')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ method });
});

router.patch('/payment-methods/:id', async (req, res) => {
  const { name, logoUrl, accountName, accountNumber, instructions, sortOrder, isActive } = req.body || {};

  const updates = {};
  if (name !== undefined) updates.name = name;
  if (logoUrl !== undefined) updates.logo_url = logoUrl;
  if (accountName !== undefined) updates.account_name = accountName;
  if (accountNumber !== undefined) updates.account_number = accountNumber;
  if (instructions !== undefined) updates.instructions = instructions;
  if (sortOrder !== undefined) updates.sort_order = sortOrder;
  if (isActive !== undefined) updates.is_active = isActive;

  const { data: method, error } = await supabase
    .from('payment_methods')
    .update(updates)
    .eq('id', req.params.id)
    .select('*')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ method });
});

// ============================================================
// DEPOSITS
// ============================================================

/**
 * GET /api/admin/deposits?status=pending
 */
router.get('/deposits', async (req, res) => {
  const status = req.query.status || 'pending';

  const { data: deposits, error } = await supabase
    .from('deposits')
    .select('*, users(telegram_id, telegram_username, first_name), payment_methods(name)')
    .eq('status', status)
    .order('requested_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ deposits });
});

/**
 * POST /api/admin/deposits/:id/approve
 * Body: { note? }
 * Credits balance, unlocks withdrawals, pays referral bonus - all
 * atomically via the approve_deposit RPC.
 */
router.post('/deposits/:id/approve', async (req, res) => {
  const { data, error } = await supabase.rpc('approve_deposit', {
    p_deposit_id: req.params.id,
    p_admin_note: req.body?.note || null
  });

  if (error) return res.status(400).json({ error: error.message });
  return res.json({ success: true, newBalance: data?.[0]?.new_balance });
});

/**
 * POST /api/admin/deposits/:id/reject
 * Body: { note? }
 * No balance change - user can submit a new deposit if they want.
 */
router.post('/deposits/:id/reject', async (req, res) => {
  const { data: deposit, error } = await supabase
    .from('deposits')
    .update({ status: 'rejected', reviewed_at: new Date().toISOString(), admin_note: req.body?.note || null })
    .eq('id', req.params.id)
    .eq('status', 'pending')
    .select('*')
    .single();

  if (error) return res.status(400).json({ error: error.message });
  if (!deposit) return res.status(409).json({ error: 'Deposit already processed' });

  return res.json({ deposit });
});

// ============================================================
// WITHDRAWALS
// ============================================================

router.get('/withdrawals', async (req, res) => {
  const status = req.query.status || 'pending';

  const { data: withdrawals, error } = await supabase
    .from('withdrawals')
    .select('*, users(telegram_id, telegram_username, first_name)')
    .eq('status', status)
    .order('requested_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ withdrawals });
});

/**
 * POST /api/admin/withdrawals/:id/approve
 * Body: { note? }
 * Deducts balance and marks approved. Actually sending the money
 * (Telebirr/bank transfer) happens outside this system, manually -
 * this just marks it done in the ledger.
 */
router.post('/withdrawals/:id/approve', async (req, res) => {
  const { data, error } = await supabase.rpc('approve_withdrawal', {
    p_withdrawal_id: req.params.id,
    p_admin_note: req.body?.note || null
  });

  if (error) return res.status(400).json({ error: error.message });
  return res.json({ success: true, newBalance: data?.[0]?.new_balance });
});

/**
 * POST /api/admin/withdrawals/:id/reject
 * Body: { note? }
 * No balance change - user keeps their balance and can request again.
 */
router.post('/withdrawals/:id/reject', async (req, res) => {
  const { data: withdrawal, error } = await supabase
    .from('withdrawals')
    .update({ status: 'rejected', reviewed_at: new Date().toISOString(), admin_note: req.body?.note || null })
    .eq('id', req.params.id)
    .eq('status', 'pending')
    .select('*')
    .single();

  if (error) return res.status(400).json({ error: error.message });
  if (!withdrawal) return res.status(409).json({ error: 'Withdrawal already processed' });

  return res.json({ withdrawal });
});

// ============================================================
// APP SETTINGS (min withdrawal, withdrawal fee percent)
// ============================================================

router.get('/settings', async (req, res) => {
  const { data: settings, error } = await supabase.from('app_settings').select('*').single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ settings });
});

/**
 * PATCH /api/admin/settings
 * Body: any subset of { minDeposit, signupBonusAmount, referralBonus, minWithdrawal, withdrawalFeePercent }
 */
router.patch('/settings', async (req, res) => {
  const { minDeposit, signupBonusAmount, referralBonus, minWithdrawal, withdrawalFeePercent } = req.body || {};

  const updates = {};
  if (minDeposit !== undefined) updates.min_deposit = minDeposit;
  if (signupBonusAmount !== undefined) updates.signup_bonus_amount = signupBonusAmount;
  if (referralBonus !== undefined) updates.referral_bonus = referralBonus;
  if (minWithdrawal !== undefined) updates.min_withdrawal = minWithdrawal;
  if (withdrawalFeePercent !== undefined) updates.withdrawal_fee_percent = withdrawalFeePercent;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid settings fields provided' });
  }

  const { data: settings, error } = await supabase
    .from('app_settings')
    .update(updates)
    .eq('id', 1)
    .select('*')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ settings });
});

// ============================================================
// BONUS RELEASES
// ============================================================

/**
 * POST /api/admin/bonus
 * Body: { amount, label?, expiresAt? }
 * Releases a new claimable bonus. Every user can claim it once via
 * the claim_bonus RPC until expiresAt (or forever if not set).
 */
router.post('/bonus', async (req, res) => {
  const { amount, label, expiresAt } = req.body || {};

  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }

  const { data: release, error } = await supabase
    .from('bonus_releases')
    .insert({
      amount,
      label: label || null,
      released_by: req.telegramUser.id,
      expires_at: expiresAt || null
    })
    .select('*')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ release });
});

router.get('/bonus', async (req, res) => {
  const { data: releases, error } = await supabase
    .from('bonus_releases')
    .select('*')
    .order('released_at', { ascending: false })
    .limit(50);

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ releases });
});

// ============================================================
// APP LINKS (channels / groups / support)
// ============================================================

router.get('/links', async (req, res) => {
  const { data: links, error } = await supabase
    .from('app_links')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ links });
});

/**
 * POST /api/admin/links
 * Body: { label, url, kind, sortOrder? }
 */
router.post('/links', async (req, res) => {
  const { label, url, kind, sortOrder } = req.body || {};

  if (!label || !url || !kind) {
    return res.status(400).json({ error: 'label, url, and kind are required' });
  }

  const { data: link, error } = await supabase
    .from('app_links')
    .insert({ label, url, kind, sort_order: sortOrder || 0 })
    .select('*')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ link });
});

router.patch('/links/:id', async (req, res) => {
  const { label, url, kind, sortOrder, isActive } = req.body || {};

  const updates = {};
  if (label !== undefined) updates.label = label;
  if (url !== undefined) updates.url = url;
  if (kind !== undefined) updates.kind = kind;
  if (sortOrder !== undefined) updates.sort_order = sortOrder;
  if (isActive !== undefined) updates.is_active = isActive;

  const { data: link, error } = await supabase
    .from('app_links')
    .update(updates)
    .eq('id', req.params.id)
    .select('*')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ link });
});

// ============================================================
// BROADCAST (kept from the old app - still useful for announcements)
// ============================================================

/**
 * POST /api/admin/broadcast
 * Body: { text?, imageUrl? }
 * Sends a message (and optional image) to every user via the bot.
 * Telegram rate-limits outgoing messages (~30/sec across all chats),
 * so this sends in small batches with a short delay to avoid
 * hitting that limit and getting throttled or banned temporarily.
 */
router.post('/broadcast', async (req, res) => {
  const { text, imageUrl } = req.body || {};

  if (!text && !imageUrl) {
    return res.status(400).json({ error: 'Provide text, imageUrl, or both' });
  }

  const bot = req.app.locals.bot;

  const { data: users, error } = await supabase.from('users').select('telegram_id').eq('is_banned', false);
  if (error) return res.status(500).json({ error: error.message });

  let successCount = 0;
  const BATCH_SIZE = 25;
  const BATCH_DELAY_MS = 1000;

  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (u) => {
        try {
          if (imageUrl) {
            await bot.sendPhoto(u.telegram_id, imageUrl, text ? { caption: text } : {});
          } else {
            await bot.sendMessage(u.telegram_id, text);
          }
          successCount += 1;
        } catch {
          // User may have blocked the bot or deleted their account -
          // skip and continue, don't fail the whole broadcast.
        }
      })
    );

    if (i + BATCH_SIZE < users.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  return res.json({ success: true, recipientCount: users.length, successCount });
});

module.exports = router;
