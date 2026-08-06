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

/**
 * GET /api/team/ranks
 * The full rank ladder, public to any logged-in user (needed to
 * render the Referral Program page's table). Admin-editable via
 * routes/admin.js - see PATCH /api/admin/referral-ranks/:level.
 */
router.get('/ranks', requireTelegramAuth, async (req, res) => {
  const { data: ranks, error } = await supabase
    .from('referral_ranks')
    .select('*')
    .eq('is_active', true)
    .order('level', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  // rank_position is the DB column name (position is a reserved
  // word in some Postgres contexts) - aliased back to `position`
  // here so the frontend's field names stay simple.
  const shaped = (ranks || []).map((r) => ({ ...r, position: r.rank_position }));
  return res.json({ ranks: shaped });
});

/**
 * GET /api/team/rank
 * The current user's real qualifying rank, computed from their
 * actual team size and team deposit via get_user_referral_rank().
 * This is the SAME function run_referral_salary_payouts() uses, so
 * whatever rank this returns is exactly what determines their
 * actual monthly payout - no drift between what's displayed and
 * what's paid.
 */
router.get('/rank', requireTelegramAuth, async (req, res) => {
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('telegram_id', req.telegramUser.id)
    .maybeSingle();

  if (!user) return res.status(404).json({ error: 'User not found, call /session first' });

  const { data, error } = await supabase.rpc('get_user_referral_rank', { p_user_id: user.id });
  if (error) return res.status(500).json({ error: error.message });

  const row = data?.[0];
  const shaped = row
    ? {
        ...row,
        position: row.rank_position,
        next_position: row.next_rank_position
      }
    : null;

  return res.json({ rank: shaped });
});

module.exports = router;
