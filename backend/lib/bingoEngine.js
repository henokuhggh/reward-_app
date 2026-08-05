const supabase = require('./supabase');
const { checkWin } = require('./bingoPatterns');

// How often a new number is called once a round is active.
const DRAW_INTERVAL_MS = 4000;
// How long a 'waiting' round with exactly 1 player sits before we
// re-check for a second player (cheap poll, not a hard timeout -
// per the product decision a round simply can't start on 1 player).
const WAITING_POLL_MS = 3000;

// In-memory registry of rounds this process is actively driving, so
// we never attach two interval timers to the same round. Keyed by
// round_id. This is fine for a single Railway instance; if this is
// ever scaled horizontally, round ownership would need to move to a
// DB-level lock (e.g. an "active_worker" column) to avoid double-draws.
const drivingRounds = new Map();

class BingoEngine {
  constructor(io) {
    this.io = io;
  }

  roomFor(roundId) {
    return `bingo:${roundId}`;
  }

  /**
   * Called after a successful join. Broadcasts the updated lobby
   * numbers (player count / pool) to everyone watching this round,
   * and kicks off the start-check.
   */
  async onPlayerJoined(roundId) {
    await this.broadcastLobbyState(roundId);
    this.ensureWaitingWatcher(roundId);
  }

  async broadcastLobbyState(roundId) {
    const { data: round } = await supabase
      .from('bingo_rounds')
      .select('id, status, stake_amount, total_pool, prize_pool')
      .eq('id', roundId)
      .maybeSingle();
    if (!round) return;

    const { count } = await supabase
      .from('bingo_entries')
      .select('*', { count: 'exact', head: true })
      .eq('round_id', roundId);

    this.io.to(this.roomFor(roundId)).emit('lobby_update', {
      roundId,
      status: round.status,
      playerCount: count ?? 0,
      totalPool: round.total_pool,
      prizePool: round.prize_pool
    });
  }

  // Polls a waiting round until it has >= 2 players, then starts it.
  // Cheap and simple; avoids needing a separate pub/sub trigger.
  ensureWaitingWatcher(roundId) {
    if (drivingRounds.has(roundId)) return;

    const timer = setInterval(async () => {
      const { data: round } = await supabase
        .from('bingo_rounds')
        .select('id, status')
        .eq('id', roundId)
        .maybeSingle();

      if (!round || round.status !== 'waiting') {
        clearInterval(timer);
        drivingRounds.delete(roundId);
        return;
      }

      const { count } = await supabase
        .from('bingo_entries')
        .select('*', { count: 'exact', head: true })
        .eq('round_id', roundId);

      if ((count ?? 0) >= 2) {
        clearInterval(timer);
        drivingRounds.delete(roundId);
        await this.startRound(roundId);
      }
    }, WAITING_POLL_MS);

    drivingRounds.set(roundId, timer);
  }

  async startRound(roundId) {
    const { error } = await supabase.rpc('start_bingo_round', { p_round_id: roundId });
    if (error) {
      console.error('startRound failed:', error.message);
      return;
    }

    this.io.to(this.roomFor(roundId)).emit('round_started', { roundId });
    this.driveDraws(roundId);
  }

  // Runs the actual number-calling loop for an active round: every
  // DRAW_INTERVAL_MS, pick an uncalled number 1-75, persist it,
  // broadcast it, then check every player's card for a win.
  driveDraws(roundId) {
    if (drivingRounds.has(roundId)) return;

    const timer = setInterval(async () => {
      const finished = await this.drawOneNumber(roundId);
      if (finished) {
        clearInterval(timer);
        drivingRounds.delete(roundId);
      }
    }, DRAW_INTERVAL_MS);

    drivingRounds.set(roundId, timer);
  }

  async drawOneNumber(roundId) {
    const { data: round } = await supabase
      .from('bingo_rounds')
      .select('id, status, called_numbers')
      .eq('id', roundId)
      .maybeSingle();

    if (!round || round.status !== 'active') return true;

    const called = round.called_numbers || [];
    const remaining = [];
    for (let n = 1; n <= 75; n++) {
      if (!called.includes(n)) remaining.push(n);
    }

    if (remaining.length === 0) {
      // Pool exhausted with no winner (very rare with real players) -
      // finish with no winner rather than looping forever.
      await this.finishRound(roundId, [], null);
      return true;
    }

    const number = remaining[Math.floor(Math.random() * remaining.length)];
    const { data: updatedCalled, error } = await supabase.rpc('call_bingo_number', {
      p_round_id: roundId,
      p_number: number
    });
    if (error) {
      console.error('call_bingo_number failed:', error.message);
      return false;
    }

    this.io.to(this.roomFor(roundId)).emit('number_called', {
      roundId,
      number,
      calledNumbers: updatedCalled
    });

    const winners = await this.findWinners(roundId, updatedCalled);
    if (winners.length > 0) {
      await this.finishRound(roundId, winners.map((w) => w.user_id), winners[0].pattern);
      return true;
    }

    return false;
  }

  async findWinners(roundId, calledNumbers) {
    const { data: entries } = await supabase
      .from('bingo_entries')
      .select('user_id, cartel_id, bingo_cartels(grid)')
      .eq('round_id', roundId);

    if (!entries) return [];

    const winners = [];
    for (const entry of entries) {
      const grid = entry.bingo_cartels?.grid;
      if (!grid) continue;
      const pattern = checkWin(grid, calledNumbers);
      if (pattern) {
        winners.push({ user_id: entry.user_id, pattern });
      }
    }
    return winners;
  }

  async finishRound(roundId, winnerIds, pattern) {
    const { error } = await supabase.rpc('finish_bingo_round', {
      p_round_id: roundId,
      p_winner_ids: winnerIds,
      p_win_pattern: pattern
    });
    if (error) {
      console.error('finish_bingo_round failed:', error.message);
      return;
    }

    const { data: round } = await supabase
      .from('bingo_rounds')
      .select('prize_pool')
      .eq('id', roundId)
      .maybeSingle();

    const share = winnerIds.length > 0 ? round?.prize_pool / winnerIds.length : 0;

    this.io.to(this.roomFor(roundId)).emit('round_finished', {
      roundId,
      winnerIds,
      pattern,
      share
    });
  }
}

module.exports = { BingoEngine };
