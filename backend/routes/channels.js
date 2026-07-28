const express = require('express');
const supabase = require('../lib/supabase');
const { requireTelegramAuth } = require('../lib/telegramAuth');

const router = express.Router();

// Shared bot instance is attached to app.locals in server.js
function getBot(req) {
  return req.app.locals.bot;
}

async function getOrCreateUser(telegramId) {
  const { data } = await supabase.from('users').select('*').eq('telegram_id', telegramId).maybeSingle();
  return data;
}

/**
 * GET /api/channels
 * Lists active campaigns the current user hasn't already claimed,
 * and haven't hit their max_joins cap.
 */
router.get('/', requireTelegramAuth, async (req, res) => {
  const user = await getOrCreateUser(req.telegramUser.id);
  if (!user) return res.status(404).json({ error: 'User not found, call /session first' });

  const { data: campaigns, error } = await supabase
    .from('channel_campaigns')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  // Filter out campaigns already claimed by this user or fully spent
  const { data: alreadyJoined } = await supabase
    .from('channel_joins')
    .select('campaign_id')
    .eq('user_id', user.id)
    .eq('verified', true);

  const claimedIds = new Set((alreadyJoined || []).map((j) => j.campaign_id));

  const available = campaigns
    .filter((c) => !claimedIds.has(c.id))
    .filter((c) => c.current_joins < c.max_joins)
    .map((c) => ({
      id: c.id,
      channel_username: c.channel_username,
      channel_title: c.channel_title,
      reward_per_join: c.reward_per_join,
      spots_remaining: c.max_joins - c.current_joins
    }));

  return res.json({ campaigns: available });
});

/**
 * POST /api/channels/:id/verify
 * Called when user taps "I Joined". Uses getChatMember to check
 * real membership - the bot MUST be an admin of the channel for
 * this to return accurate results for public/private channels.
 */
router.post('/:id/verify', requireTelegramAuth, async (req, res) => {
  const { id: campaignId } = req.params;
  const bot = getBot(req);

  const user = await getOrCreateUser(req.telegramUser.id);
  if (!user) return res.status(404).json({ error: 'User not found, call /session first' });

  const { data: campaign, error: campaignErr } = await supabase
    .from('channel_campaigns')
    .select('*')
    .eq('id', campaignId)
    .maybeSingle();

  if (campaignErr) return res.status(500).json({ error: campaignErr.message });
  if (!campaign || !campaign.is_active) {
    return res.status(404).json({ error: 'Campaign not found or inactive' });
  }
  if (campaign.current_joins >= campaign.max_joins) {
    return res.status(409).json({ error: 'This campaign has reached its reward limit' });
  }

  // Prevent double-claiming
  const { data: existingJoin } = await supabase
    .from('channel_joins')
    .select('*')
    .eq('user_id', user.id)
    .eq('campaign_id', campaignId)
    .maybeSingle();

  if (existingJoin?.verified) {
    return res.status(409).json({ error: 'Already claimed for this channel' });
  }

  // The real verification: ask Telegram directly whether this user
  // is currently a member of the channel. Requires the bot to be an
  // admin of the channel (or at least a member with permission to
  // see the member list) - otherwise this call fails.
  let membershipStatus;
  try {
    const chatIdentifier = campaign.channel_id || `@${campaign.channel_username}`;
    const member = await bot.getChatMember(chatIdentifier, req.telegramUser.id);
    membershipStatus = member.status; // 'creator' | 'administrator' | 'member' | 'restricted' | 'left' | 'kicked'
  } catch (err) {
    return res.status(400).json({
      error: 'Could not verify membership. Make sure you have joined the channel and try again.',
      detail: err.message
    });
  }

  const isMember = ['creator', 'administrator', 'member'].includes(membershipStatus);

  if (!isMember) {
    return res.status(400).json({ error: 'You have not joined this channel yet' });
  }

  // Record the verified join and pay out atomically via RPC
  // (see supabase/functions.sql for credit_channel_join)
  const { data: result, error: rpcErr } = await supabase.rpc('credit_channel_join', {
    p_user_id: user.id,
    p_campaign_id: campaignId,
    p_reward: campaign.reward_per_join
  });

  if (rpcErr) return res.status(500).json({ error: rpcErr.message });

  // Pays the referrer's bonus, but only if this join is for the
  // channel configured as the required referral channel in
  // app_settings. Joining any other campaign channel does not
  // trigger a referral payout.
  await supabase.rpc('pay_referral_bonus_for_required_join', {
    p_referred_user_id: user.id,
    p_campaign_id: campaignId
  });

  return res.json({
    success: true,
    reward: campaign.reward_per_join,
    new_balance: result?.[0]?.new_balance
  });
});

module.exports = router;
