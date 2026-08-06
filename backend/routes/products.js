const express = require('express');
const supabase = require('../lib/supabase');
const { requireTelegramAuth } = require('../lib/telegramAuth');

const router = express.Router();

async function getUser(telegramId) {
  const { data } = await supabase.from('users').select('*').eq('telegram_id', telegramId).maybeSingle();
  return data;
}

/**
 * GET /api/products
 * Active products for the browsing/purchase screen.
 */
router.get('/', requireTelegramAuth, async (req, res) => {
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, image_url, level, price, daily_percent, duration_days, max_total_payout_multiple')
    .eq('is_active', true)
    .order('level', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ products });
});

/**
 * POST /api/products/:id/purchase
 * Buys a product: bonus first, then balance, same pattern as
 * every other spend in this app. Locks in the payout cap at
 * purchase time so later product edits can't retroactively change
 * what an existing purchase pays out.
 */
router.post('/:id/purchase', requireTelegramAuth, async (req, res) => {
  const user = await getUser(req.telegramUser.id);
  if (!user) return res.status(404).json({ error: 'User not found, call /session first' });

  const { data, error } = await supabase.rpc('purchase_product', {
    p_user_id: user.id,
    p_product_id: req.params.id
  });

  if (error) return res.status(400).json({ error: error.message });

  const result = data?.[0];
  return res.json({
    purchaseId: result?.purchase_id,
    balance: result?.new_balance,
    signupBonus: result?.new_signup_bonus
  });
});

/**
 * GET /api/products/mine
 * The user's own purchases (active and finished), with progress
 * toward each one's payout cap, for their portfolio view.
 */
router.get('/mine', requireTelegramAuth, async (req, res) => {
  const user = await getUser(req.telegramUser.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { data: purchases, error } = await supabase
    .from('purchases')
    .select('id, price_paid, daily_percent, duration_days, max_total_payout, total_credited, is_active, last_credited_at, created_at, products(name, image_url)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ purchases });
});

module.exports = router;
