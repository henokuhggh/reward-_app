const express = require('express');
const supabase = require('../lib/supabase');
const { requireTelegramAuth } = require('../lib/telegramAuth');

const router = express.Router();

/**
 * GET /api/team
 * Everyone the current user has referred, with each one's deposit
 * status - "active" here means they have made at least one approved
 * deposit, matching the definition used on the admin dashboard.
 */
router.get('/', requireTelegramAuth, async (req, res) => {
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('telegram_id', req.telegramUser.id)
    .maybeSingle();

  if (!user) return res.status(404).json({ error: 'User not found, call /session first' });

  const { data: invited, error } = await supabase
    .from('users')
    .select('id, first_name, telegram_username, has_deposited, total_deposited, created_at')
    .eq('referred_by', user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const activeCount = (invited || []).filter((u) => u.has_deposited).length;

  return res.json({
    invited: invited || [],
    total_invited: invited?.length ?? 0,
    active_invited: activeCount
  });
});

module.exports = router;
