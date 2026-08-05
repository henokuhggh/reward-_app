const express = require('express');
const supabase = require('../lib/supabase');
const { requireTelegramAuth } = require('../lib/telegramAuth');

const router = express.Router();

async function getUser(telegramId) {
  const { data } = await supabase.from('users').select('*').eq('telegram_id', telegramId).maybeSingle();
  return data;
}

/**
 * GET /api/bingo/stakes
 * The prize-tier picker screen: 10 / 20 / 50 / 100 birr (or
 * whatever the admin has configured).
 */
router.get('/stakes', requireTelegramAuth, async (req, res) => {
  const { data: stakes, error } = await supabase
    .from('bingo_stake_tiers')
    .select('id, amount')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ stakes });
});

/**
 * GET /api/bingo/rounds/open?stakeTierId=...
 * Step 2: the cartel-choosing page summary - how many people are
 * already in, and the total birr entered (after the 20% cut), for
 * the stake tier the player picked.
 */
router.get('/rounds/open', requireTelegramAuth, async (req, res) => {
  const { stakeTierId } = req.query;
  if (!stakeTierId) return res.status(400).json({ error: 'stakeTierId is required' });

  const { data, error } = await supabase.rpc('get_open_round', { p_stake_tier_id: stakeTierId });
  if (error) return res.status(400).json({ error: error.message });

  const round = data?.[0];
  if (!round) return res.status(404).json({ error: 'No open round found' });

  return res.json({
    roundId: round.round_id,
    status: round.status,
    stakeAmount: round.stake_amount,
    playerCount: round.player_count,
    totalPool: round.total_pool,
    prizePool: round.prize_pool
  });
});

/**
 * GET /api/bingo/rounds/:roundId/cartels
 * The grid of 1-100 cartel numbers, marked taken/available, for
 * the picking screen.
 */
router.get('/rounds/:roundId/cartels', requireTelegramAuth, async (req, res) => {
  const { data: all, error: allErr } = await supabase
    .from('bingo_cartels')
    .select('id')
    .order('id', { ascending: true });
  if (allErr) return res.status(500).json({ error: allErr.message });

  const { data: taken, error: takenErr } = await supabase
    .from('bingo_entries')
    .select('cartel_id')
    .eq('round_id', req.params.roundId);
  if (takenErr) return res.status(500).json({ error: takenErr.message });

  const takenSet = new Set((taken || []).map((t) => t.cartel_id));
  const cartels = (all || []).map((c) => ({ id: c.id, taken: takenSet.has(c.id) }));

  return res.json({ cartels });
});

/**
 * POST /api/bingo/rounds/:roundId/join
 * Player commits to a cartel and pays the stake (bonus first, then
 * balance; 20% platform cut is taken here). Body: { cartelId }
 */
router.post('/rounds/:roundId/join', requireTelegramAuth, async (req, res) => {
  const { cartelId } = req.body || {};
  if (!cartelId) return res.status(400).json({ error: 'cartelId is required' });

  const user = await getUser(req.telegramUser.id);
  if (!user) return res.status(404).json({ error: 'User not found, call /session first' });

  const { data, error } = await supabase.rpc('join_bingo_round', {
    p_user_id: user.id,
    p_round_id: req.params.roundId,
    p_cartel_id: cartelId
  });

  if (error) return res.status(400).json({ error: error.message });

  const result = data?.[0];

  // Let the engine know a player joined so it can broadcast the
  // updated lobby count and check whether the round can now start.
  const engine = req.app.locals.bingoEngine;
  if (engine) await engine.onPlayerJoined(req.params.roundId);

  return res.json({
    entryId: result?.entry_id,
    balance: result?.new_balance,
    signupBonus: result?.new_signup_bonus
  });
});

/**
 * GET /api/bingo/rounds/:roundId/card
 * The current user's card (grid + which numbers are called so far)
 * for the live game screen.
 */
router.get('/rounds/:roundId/card', requireTelegramAuth, async (req, res) => {
  const user = await getUser(req.telegramUser.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { data, error } = await supabase.rpc('get_bingo_card', {
    p_round_id: req.params.roundId,
    p_user_id: user.id
  });

  if (error) return res.status(500).json({ error: error.message });
  const card = data?.[0];
  if (!card) return res.status(404).json({ error: 'You have not joined this round' });

  return res.json({
    userId: user.id,
    cartelId: card.cartel_id,
    grid: card.grid,
    calledNumbers: card.called_numbers
  });
});

/**
 * GET /api/bingo/rounds/:roundId
 * Full round state (status, called numbers, pool) - used on
 * reconnect so a player who refreshes mid-round isn't stuck.
 */
router.get('/rounds/:roundId', requireTelegramAuth, async (req, res) => {
  const { data: round, error } = await supabase
    .from('bingo_rounds')
    .select('id, status, stake_amount, called_numbers, total_pool, prize_pool, winner_ids, win_pattern')
    .eq('id', req.params.roundId)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!round) return res.status(404).json({ error: 'Round not found' });

  return res.json({ round });
});

/**
 * GET /api/bingo/history/mine
 * A player's past rounds (win/loss, payout) for their profile.
 */
router.get('/history/mine', requireTelegramAuth, async (req, res) => {
  const user = await getUser(req.telegramUser.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { data: entries, error } = await supabase
    .from('bingo_entries')
    .select('id, amount_paid, is_winner, payout, created_at, bingo_rounds(status, stake_amount, finished_at, win_pattern)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ entries });
});

module.exports = router;
