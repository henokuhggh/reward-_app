const express = require('express');
const supabase = require('../lib/supabase');
const { requireTelegramAuth } = require('../lib/telegramAuth');
const { requireAdmin } = require('../lib/adminAuth');

const router = express.Router();

router.use(requireTelegramAuth, requireAdmin);

/**
 * POST /api/admin/channels
 * Creates a new channel campaign.
 * Body: { channelUsername, channelTitle, sponsorBudget, rewardPerJoin }
 *
 * max_joins is computed as 80% of sponsor_budget divided by the
 * per-join reward, matching your stated 80%-to-users split.
 *
 * Before this campaign goes live, the bot MUST be added as an
 * admin of the channel - otherwise getChatMember calls in
 * routes/channels.js will fail and no one can claim the reward.
 */
router.post('/channels', async (req, res) => {
  const { channelUsername, channelTitle, sponsorBudget, rewardPerJoin } = req.body || {};

  if (!channelUsername || !channelTitle || !sponsorBudget || !rewardPerJoin) {
    return res.status(400).json({
      error: 'channelUsername, channelTitle, sponsorBudget, and rewardPerJoin are required'
    });
  }

  const userSharePool = Number(sponsorBudget) * 0.8;
  const maxJoins = Math.floor(userSharePool / Number(rewardPerJoin));

  if (maxJoins < 1) {
    return res.status(400).json({ error: 'Budget too small to fund even one join at this reward rate' });
  }

  // Verify the bot can actually see this channel and is an admin,
  // so campaigns are never created for channels that will silently
  // fail every verification request.
  const bot = req.app.locals.bot;
  try {
    const chat = await bot.getChat(`@${channelUsername.replace('@', '')}`);
    const me = await bot.getMe();
    const botMember = await bot.getChatMember(chat.id, me.id);
    if (!['administrator', 'creator'].includes(botMember.status)) {
      return res.status(400).json({
        error: 'Bot must be an admin of this channel before creating the campaign'
      });
    }

    const { data: campaign, error } = await supabase
      .from('channel_campaigns')
      .insert({
        channel_username: channelUsername.replace('@', ''),
        channel_title: channelTitle,
        channel_id: chat.id,
        sponsor_budget: sponsorBudget,
        reward_per_join: rewardPerJoin,
        max_joins: maxJoins
      })
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: error.message });

    return res.json({ campaign });
  } catch (err) {
    return res.status(400).json({
      error: 'Could not verify bot admin status on this channel. Add the bot as an admin first.',
      detail: err.message
    });
  }
});

/**
 * PATCH /api/admin/channels/:id
 * Body: { isActive }
 */
router.patch('/channels/:id', async (req, res) => {
  const { isActive } = req.body || {};
  const { data: campaign, error } = await supabase
    .from('channel_campaigns')
    .update({ is_active: isActive })
    .eq('id', req.params.id)
    .select('*')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ campaign });
});

/**
 * GET /api/admin/withdrawals?status=pending
 */
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
 * (Telebirr/bank transfer) happens outside this system, manually,
 * as you specified - this just marks it done in the ledger.
 */
router.post('/withdrawals/:id/approve', async (req, res) => {
  const { error } = await supabase.rpc('approve_withdrawal', {
    p_withdrawal_id: req.params.id,
    p_admin_note: req.body?.note || null
  });

  if (error) return res.status(400).json({ error: error.message });
  return res.json({ success: true });
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

module.exports = router;
