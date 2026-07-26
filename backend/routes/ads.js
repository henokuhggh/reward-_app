const express = require('express');
const supabase = require('../lib/supabase');
const { requireTelegramAuth } = require('../lib/telegramAuth');

const router = express.Router();

/**
 * POST /api/ads/reward
 * Called by the mini app frontend after AdsGram confirms the user
 * watched a rewarded ad to completion (AdsGram SDK fires an
 * onReward callback client-side; this endpoint should ideally also
 * verify server-side using AdsGram's server-to-server callback/
 * postback if their plan supports it, to prevent a manipulated
 * client from calling this endpoint without watching an ad).
 *
 * IMPORTANT: check AdsGram's docs for a server-side postback URL -
 * that is the trustworthy way to confirm ad completion. Relying
 * solely on the client calling this endpoint is spoofable.
 */
router.post('/reward', requireTelegramAuth, async (req, res) => {
  const { adsgramBlockId } = req.body || {};

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', req.telegramUser.id)
    .maybeSingle();

  if (!user) return res.status(404).json({ error: 'User not found, call /session first' });

  const { data: settings } = await supabase.from('app_settings').select('*').single();
  const reward = settings?.ad_reward ?? 5.0;

  const { data: result, error } = await supabase.rpc('credit_ad_view', {
    p_user_id: user.id,
    p_reward: reward,
    p_adsgram_block_id: adsgramBlockId || null
  });

  if (error) return res.status(500).json({ error: error.message });

  // Pay any pending referral bonus now that this user has a real action
  await supabase.rpc('pay_referral_bonus_if_pending', { p_referred_user_id: user.id });

  return res.json({ success: true, reward, new_balance: result?.[0]?.new_balance });
});

module.exports = router;
