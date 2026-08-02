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
 * Lists all active products, ordered by level. This is the public
 * product list shown on the Product page.
 */
router.get('/', requireTelegramAuth, async (req, res) => {
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, image_url, level, price, daily_percent, duration_days')
    .eq('is_active', true)
    .order('level', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ products });
});

/**
 * POST /api/products/:id/purchase
 * Buys a product using signup bonus first, then balance, for the
 * remainder. All balance math happens inside purchase_product so a
 * user can never be charged twice for one click or spend money they
 * don't have due to a race between two requests.
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
    purchase_id: result?.purchase_id,
    balance: result?.new_balance,
    signup_bonus: result?.new_signup_bonus
  });
});

/**
 * GET /api/products/mine
 * The current user's purchases (active and past), with product
 * details joined in, newest first.
 */
router.get('/mine', requireTelegramAuth, async (req, res) => {
  const user = await getUser(req.telegramUser.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { data: purchases, error } = await supabase
    .from('purchases')
    .select('*, products(name, image_url, level)')
    .eq('user_id', user.id)
    .order('purchased_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ purchases });
});

module.exports = router;
