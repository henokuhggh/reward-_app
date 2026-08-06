const express = require('express');
const supabase = require('../lib/supabase');
const { requireAnyAuth } = require('../lib/webAuth');

const router = express.Router();

/**
 * GET /api/profile/links
 * Admin-configured channel/group/support links shown on the profile
 * page (e.g. "Join our Telegram Channel", "Support").
 */
router.get('/links', requireAnyAuth, async (req, res) => {
  const { data: links, error } = await supabase
    .from('app_links')
    .select('id, label, url, kind')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ links });
});

/**
 * GET /api/profile/bonus
 * The latest bonus release the admin has put out, and whether the
 * current user has already claimed it - drives the claim button's
 * state on the profile page.
 */
router.get('/bonus', requireAnyAuth, async (req, res) => {
  const user = req.user;
  if (!user) return res.status(404).json({ error: 'User not found, call /session first' });

  const { data: release, error } = await supabase
    .from('bonus_releases')
    .select('*')
    .or('expires_at.is.null,expires_at.gt.now()')
    .order('released_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!release) return res.json({ bonus: null });

  const { data: claim } = await supabase
    .from('bonus_claims')
    .select('id, claimed_at')
    .eq('bonus_release_id', release.id)
    .eq('user_id', user.id)
    .maybeSingle();

  return res.json({
    bonus: {
      id: release.id,
      amount: release.amount,
      label: release.label,
      released_at: release.released_at,
      claimed: Boolean(claim)
    }
  });
});

/**
 * POST /api/profile/bonus/:id/claim
 * Claims a specific bonus release. claim_bonus enforces one claim
 * per user per release even under concurrent requests.
 */
router.post('/bonus/:id/claim', requireAnyAuth, async (req, res) => {
  const user = req.user;
  if (!user) return res.status(404).json({ error: 'User not found, call /session first' });

  const { data, error } = await supabase.rpc('claim_bonus', {
    p_user_id: user.id,
    p_bonus_release_id: req.params.id
  });

  if (error) return res.status(400).json({ error: error.message });
  return res.json({ balance: data?.[0]?.new_balance });
});

module.exports = router;
