import React, { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { getSocket } from '../../socket.js';

const COLUMN_LETTERS = ['B', 'I', 'N', 'G', 'O'];

export default function BingoGameStep({ roundId, onExit, onBalanceChange }) {
  const [card, setCard] = useState(null);
  const [calledNumbers, setCalledNumbers] = useState([]);
  const [lastCalled, setLastCalled] = useState(null);
  const [result, setResult] = useState(null); // { winnerIds, pattern, share } once finished
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [cardData, roundData] = await Promise.all([api.getBingoCard(roundId), api.getBingoRound(roundId)]);
        if (cancelled) return;
        setCard(cardData);
        setCalledNumbers(roundData.round.calledNumbers || roundData.round.called_numbers || []);

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
      setLastCalled(payload.number);
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
  }, [roundId, onBalanceChange]);

  if (loading) return <p className="muted-text">Loading your card...</p>;
  if (error) return <p className="error-text">{error}</p>;
  if (!card) return null;

  const calledSet = new Set(calledNumbers);
  const isWinner = result?.winnerIds?.includes(card.userId) ?? false;

  return (
    <>
      <div className="game-top">
        <span className="round-tag">Cartel #{card.cartelId}</span>
        <span className="called-count">{calledNumbers.length} / 75 called</span>
      </div>

      {lastCalled != null && !result && (
        <div className="last-called">
          <span className="last-called-label">Last number</span>
          <span className="last-called-value">{lastCalled}</span>
        </div>
      )}

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
        .game-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .round-tag {
          font-size: 12.5px;
          font-weight: 700;
          color: var(--gold-400);
        }
        .called-count {
          font-size: 11.5px;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }
        .last-called {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-md);
          padding: 14px;
        }
        .last-called-label {
          font-size: 11.5px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .last-called-value {
          font-family: var(--font-display);
          font-size: 26px;
          font-weight: 700;
          color: var(--gold-400);
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
