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

/**
 * GET /api/admin/settings
 * Returns current app settings, including which campaign is the
 * required referral channel.
 */
router.get('/settings', async (req, res) => {
  const { data: settings, error } = await supabase.from('app_settings').select('*').single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ settings });
});

/**
 * PATCH /api/admin/settings/min-withdrawal
 * Body: { newValue }
 * Updates min withdrawal and logs the change in min_withdrawal_history.
 */
router.patch('/settings/min-withdrawal', async (req, res) => {
  const { newValue } = req.body || {};
  if (!newValue || Number(newValue) <= 0) {
    return res.status(400).json({ error: 'newValue must be a positive number' });
  }

  const { error } = await supabase.rpc('update_min_withdrawal', {
    p_new_value: newValue,
    p_admin_telegram_id: req.telegramUser.id
  });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ success: true, newValue: Number(newValue) });
});

/**
 * GET /api/admin/settings/min-withdrawal/history
 */
router.get('/settings/min-withdrawal/history', async (req, res) => {
  const { data: history, error } = await supabase
    .from('min_withdrawal_history')
    .select('*')
    .order('changed_at', { ascending: false })
    .limit(50);

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ history });
});

/**
 * PATCH /api/admin/settings/required-channel
 * Body: { campaignId }
 * Sets which channel campaign a referred user must verify-join
 * before their referrer's bonus pays out. Pass null to disable
 * the requirement (referrals then never auto-pay via this path).
 */
router.patch('/settings/required-channel', async (req, res) => {
  const { campaignId } = req.body || {};

  const { error } = await supabase
    .from('app_settings')
    .update({ required_campaign_id: campaignId || null })
    .eq('id', 1);

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ success: true, requiredCampaignId: campaignId || null });
});

/**
 * GET /api/admin/stats
 * Total users and an approximate "online now" count based on
 * last_active_at within the last 15 minutes. Telegram gives no true
 * live-presence signal, so this is a best-effort proxy, not exact.
 */
router.get('/stats', async (req, res) => {
  const { count: totalUsers, error: totalErr } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  if (totalErr) return res.status(500).json({ error: totalErr.message });

  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { count: onlineNow, error: onlineErr } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .gte('last_active_at', fifteenMinAgo);

  if (onlineErr) return res.status(500).json({ error: onlineErr.message });

  return res.json({
    totalUsers: totalUsers ?? 0,
    onlineNow: onlineNow ?? 0,
    onlineWindowMinutes: 15
  });
});

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

  await supabase.from('broadcasts').insert({
    message_text: text || null,
    image_url: imageUrl || null,
    sent_by: req.telegramUser.id,
    recipient_count: users.length,
    success_count: successCount
  });

  return res.json({ success: true, recipientCount: users.length, successCount });
});

module.exports = router;
