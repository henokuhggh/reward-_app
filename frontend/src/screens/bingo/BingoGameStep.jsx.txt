import React, { useEffect, useRef, useState } from 'react';
import { api } from '../../api.js';
import { getSocket } from '../../socket.js';
import { speakNumber, COLUMN_FOR_NUMBER } from '../../speech.js';

const COLUMN_LETTERS = ['B', 'I', 'N', 'G', 'O'];
const RECENT_LIMIT = 5;

// Full 1-75 board laid out column-major (B: 1-15, I: 16-30, ...)
// to match standard bingo hall boards and the reference UI.
const FULL_BOARD = COLUMN_LETTERS.map((letter, colIdx) => {
  const start = colIdx * 15 + 1;
  return Array.from({ length: 15 }, (_, i) => start + i);
});

export default function BingoGameStep({ roundId, onExit, onBalanceChange }) {
  const [card, setCard] = useState(null);
  const [round, setRound] = useState(null);
  const [calledNumbers, setCalledNumbers] = useState([]);
  const [result, setResult] = useState(null); // { winnerIds, pattern, share } once finished
  const [voiceOn, setVoiceOn] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Tracks numbers we've already spoken so a reconnect (which replays
  // the full called_numbers list) doesn't re-announce everything.
  const spokenRef = useRef(new Set());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [cardData, roundData] = await Promise.all([api.getBingoCard(roundId), api.getBingoRound(roundId)]);
        if (cancelled) return;
        setCard(cardData);
        setRound(roundData.round);
        const called = roundData.round.calledNumbers || roundData.round.called_numbers || [];
        setCalledNumbers(called);
        called.forEach((n) => spokenRef.current.add(n));

        if (roundData.round.status === 'finished') {
          setResult({
            winnerIds: roundData.round.winner_ids || [],
            pattern: roundData.round.win_pattern
          });
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [roundId]);

  useEffect(() => {
    const socket = getSocket();
    socket.emit('join_round', roundId);

    function onNumberCalled(payload) {
      if (payload.roundId !== roundId) return;
      setCalledNumbers(payload.calledNumbers);
      setRound((prev) => (prev ? { ...prev, calledNumbers: payload.calledNumbers } : prev));

      if (voiceOn && !spokenRef.current.has(payload.number)) {
        spokenRef.current.add(payload.number);
        speakNumber(payload.number);
      }
    }

    async function onRoundFinished(payload) {
      if (payload.roundId !== roundId) return;
      setResult({ winnerIds: payload.winnerIds, pattern: payload.pattern, share: payload.share });
      await onBalanceChange?.();
    }

    socket.on('number_called', onNumberCalled);
    socket.on('round_finished', onRoundFinished);

    return () => {
      socket.emit('leave_round', roundId);
      socket.off('number_called', onNumberCalled);
      socket.off('round_finished', onRoundFinished);
    };
  }, [roundId, onBalanceChange, voiceOn]);

  if (loading) return <p className="muted-text">Loading your card...</p>;
  if (error) return <p className="error-text">{error}</p>;
  if (!card || !round) return null;

  const calledSet = new Set(calledNumbers);
  const isWinner = result?.winnerIds?.includes(card.userId) ?? false;
  const lastCalled = calledNumbers[calledNumbers.length - 1];
  const recentCalls = [...calledNumbers].reverse().slice(1, 1 + RECENT_LIMIT);

  return (
    <>
      <div className="stat-bar">
        <StatTile label="Pot (ደራሽ)" value={Number(round.prizePool ?? round.prize_pool ?? 0).toLocaleString()} />
        <StatTile label="Players" value={round.playerCount ?? '—'} />
        <StatTile label="Stake (መደብ)" value={Number(round.stakeAmount ?? round.stake_amount ?? 0).toLocaleString()} />
        <StatTile label="Called" value={calledNumbers.length} accent />
        <button className={`voice-toggle ${voiceOn ? 'on' : 'off'}`} onClick={() => setVoiceOn((v) => !v)} title="Toggle voice announcements">
          {voiceOn ? '🔊' : '🔇'}
        </button>
      </div>

      <div className="board-and-side">
        <div className="full-board">
          <div className="board-header">
            {COLUMN_LETTERS.map((l) => (
              <div key={l} className={`board-header-cell col-${l.toLowerCase()}`}>
                {l}
              </div>
            ))}
          </div>
          <div className="board-body">
            {FULL_BOARD.map((col, colIdx) => (
              <div key={colIdx} className="board-col">
                {col.map((num) => (
                  <div key={num} className={`board-num ${calledSet.has(num) ? 'called' : ''} ${num === lastCalled ? 'current' : ''}`}>
                    {num}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="side-panel">
          {lastCalled != null && !result && (
            <div className="current-call">
              <span className="current-call-label">Current</span>
              <div className="current-call-badge">
                {COLUMN_FOR_NUMBER(lastCalled)}-{lastCalled}
              </div>
            </div>
          )}

          {recentCalls.length > 0 && (
            <div className="recent-calls">
              <span className="recent-label">Recent</span>
              <div className="recent-chips">
                {recentCalls.map((n) => (
                  <span key={n} className="recent-chip">
                    {COLUMN_FOR_NUMBER(n)}-{n}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="section-label">Your card - #{card.cartelId}</p>
      <div className="bingo-card">
        <div className="bingo-header">
          {COLUMN_LETTERS.map((l) => (
            <div key={l} className="header-cell">
              {l}
            </div>
          ))}
        </div>
        <div className="bingo-body">
          {card.grid.map((num, idx) => {
            const isFree = num === 0;
            const isMarked = isFree || calledSet.has(num);
            return (
              <div key={idx} className={`bingo-cell ${isMarked ? 'marked' : ''} ${isFree ? 'free' : ''}`}>
                {isFree ? '★' : num}
              </div>
            );
          })}
        </div>
      </div>

      {result && (
        <div className={`result-banner ${isWinner ? 'won' : 'lost'}`}>
          {isWinner ? (
            <>
              <p className="result-title">Bingo! You won 🎉</p>
              <p className="result-body">
                {result.share ? `${Number(result.share).toLocaleString()} Birr credited to your balance.` : 'Prize credited to your balance.'}
              </p>
            </>
          ) : (
            <>
              <p className="result-title">Round over</p>
              <p className="result-body">
                {result.winnerIds?.length > 0 ? `Someone else got ${result.pattern || 'bingo'} first. Better luck next round!` : 'No winner this round.'}
              </p>
            </>
          )}
          <button className="primary-btn" onClick={onExit}>
            Play again
          </button>
        </div>
      )}

      <style>{`
        .stat-bar {
          display: grid;
          grid-template-columns: repeat(4, 1fr) auto;
          gap: 8px;
          align-items: stretch;
        }
        .voice-toggle {
          width: 40px;
          border-radius: var(--radius-sm);
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          font-size: 16px;
        }
        .voice-toggle.on {
          border-color: rgba(62, 207, 142, 0.4);
        }
        .board-and-side {
          display: flex;
          gap: 10px;
        }
        .full-board {
          flex: 1.3;
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-md);
          padding: 8px;
          overflow-x: auto;
        }
        .board-header {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 4px;
          margin-bottom: 4px;
        }
        .board-header-cell {
          text-align: center;
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 12px;
          padding: 3px 0;
          border-radius: 6px;
          color: var(--ink-950);
        }
        .col-b { background: #3ecf8e; }
        .col-i { background: #a855c9; }
        .col-n { background: #e0684f; }
        .col-g { background: #4f8ce0; }
        .col-o { background: #d6478f; }
        .board-body {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 4px;
        }
        .board-col {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .board-num {
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-mono);
          font-size: 10.5px;
          color: var(--text-muted);
          background: var(--surface-2);
          border-radius: 5px;
        }
        .board-num.called {
          background: rgba(62, 207, 142, 0.16);
          color: var(--success);
        }
        .board-num.current {
          background: var(--gold-500);
          color: var(--ink-950);
          font-weight: 700;
        }
        .side-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .current-call {
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-md);
          padding: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .current-call-label {
          font-size: 10.5px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .current-call-badge {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: linear-gradient(160deg, var(--gold-400), var(--gold-600));
          color: var(--ink-950);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 14px;
        }
        .recent-calls {
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-md);
          padding: 10px;
        }
        .recent-label {
          font-size: 10.5px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .recent-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 8px;
        }
        .recent-chip {
          font-family: var(--font-mono);
          font-size: 10.5px;
          font-weight: 600;
          color: var(--text-secondary);
          background: var(--surface-2);
          border-radius: 6px;
          padding: 4px 7px;
        }
        .section-label {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .bingo-card {
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-lg);
          overflow: hidden;
        }
        .bingo-header {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          background: rgba(224, 184, 84, 0.12);
        }
        .header-cell {
          text-align: center;
          padding: 10px 0;
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 15px;
          color: var(--gold-400);
        }
        .bingo-body {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 6px;
          padding: 10px;
        }
        .bingo-cell {
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-mono);
          font-size: 14px;
          font-weight: 600;
          color: var(--text-secondary);
          background: var(--surface-2);
          border-radius: var(--radius-sm);
        }
        .bingo-cell.marked {
          background: rgba(62, 207, 142, 0.18);
          color: var(--success);
          border: 1px solid rgba(62, 207, 142, 0.4);
        }
        .bingo-cell.free {
          color: var(--gold-400);
          font-size: 16px;
        }
        .result-banner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          text-align: center;
          padding: 20px;
          border-radius: var(--radius-lg);
          border: 1px solid var(--surface-border);
        }
        .result-banner.won {
          background: rgba(62, 207, 142, 0.1);
          border-color: rgba(62, 207, 142, 0.35);
        }
        .result-banner.lost {
          background: var(--surface-1);
        }
        .result-title {
          font-family: var(--font-display);
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .result-body {
          font-size: 13px;
          color: var(--text-secondary);
        }
        .primary-btn {
          background: linear-gradient(90deg, var(--gold-500), var(--gold-600));
          color: var(--ink-950);
          font-weight: 700;
          font-size: 13.5px;
          padding: 12px 20px;
          border-radius: var(--radius-sm);
          margin-top: 4px;
        }
      `}</style>
    </>
  );
}

function StatTile({ label, value, accent }) {
  return (
    <div className={`stat-tile ${accent ? 'accent' : ''}`}>
      <span className="stat-tile-label">{label}</span>
      <span className="stat-tile-value">{value}</span>

      <style>{`
        .stat-tile {
          display: flex;
          flex-direction: column;
          gap: 2px;
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-sm);
          padding: 8px 6px;
          min-width: 0;
        }
        .stat-tile-label {
          font-size: 8.5px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.03em;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .stat-tile-value {
          font-family: var(--font-display);
          font-size: 15px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .stat-tile.accent .stat-tile-value {
          color: var(--danger);
        }
      `}</style>
    </div>
  );
}
