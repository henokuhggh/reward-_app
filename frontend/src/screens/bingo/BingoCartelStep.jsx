import React, { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { getSocket } from '../../socket.js';

export default function BingoCartelStep({ stake, user, onBack, onJoined, onBalanceChange }) {
  const [round, setRound] = useState(null);
  const [cartels, setCartels] = useState([]);
  const [selectedCartel, setSelectedCartel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const openRound = await api.getOpenBingoRound(stake.id);
        if (cancelled) return;
        setRound(openRound);

        const { cartels } = await api.getBingoCartels(openRound.roundId);
        if (cancelled) return;
        setCartels(cartels || []);
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
  }, [stake.id]);

  // Live player count / pool total, and jump straight into the game
  // step the instant the backend flips this round to active.
  useEffect(() => {
    if (!round?.roundId) return;

    const socket = getSocket();
    socket.emit('join_round', round.roundId);

    function onLobbyUpdate(payload) {
      if (payload.roundId !== round.roundId) return;
      setRound((prev) => (prev ? { ...prev, playerCount: payload.playerCount, totalPool: payload.totalPool, prizePool: payload.prizePool, status: payload.status } : prev));
    }

    function onRoundStarted(payload) {
      if (payload.roundId !== round.roundId) return;
      onJoined(round.roundId);
    }

    socket.on('lobby_update', onLobbyUpdate);
    socket.on('round_started', onRoundStarted);

    return () => {
      socket.emit('leave_round', round.roundId);
      socket.off('lobby_update', onLobbyUpdate);
      socket.off('round_started', onRoundStarted);
    };
  }, [round?.roundId, onJoined]);

  async function handleJoin() {
    if (!selectedCartel || !round) return;
    setJoining(true);
    setError('');
    try {
      await api.joinBingoRound(round.roundId, selectedCartel);
      await onBalanceChange?.();
      onJoined(round.roundId);
    } catch (err) {
      setError(err.message);
    } finally {
      setJoining(false);
    }
  }

  const availableFunds = Number(user?.balance || 0) + Number(user?.signup_bonus || 0);
  const canAfford = availableFunds >= Number(stake.amount);

  return (
    <>
      <button className="back-link" onClick={onBack}>
        &larr; Change tier
      </button>
      <p className="screen-title">{Number(stake.amount).toLocaleString()} Birr Cartel</p>
      <p className="screen-subtitle">Pick a card. The game starts once a second player joins.</p>

      {error && <p className="error-text">{error}</p>}

      {round && (
        <div className="lobby-bar">
          <div className="lobby-stat">
            <span className="lobby-value">{round.playerCount}</span>
            <span className="lobby-label">Playing</span>
          </div>
          <div className="lobby-stat">
            <span className="lobby-value">{Number(round.prizePool).toLocaleString()}</span>
            <span className="lobby-label">Prize pool (Birr)</span>
          </div>
        </div>
      )}

      {!canAfford && <p className="error-text">Insufficient funds for this tier.</p>}

      {loading ? (
        <p className="muted-text">Loading cartels...</p>
      ) : (
        <div className="cartel-grid">
          {cartels.map((c) => (
            <button
              key={c.id}
              className={`cartel-cell ${c.taken ? 'taken' : ''} ${selectedCartel === c.id ? 'selected' : ''}`}
              disabled={c.taken}
              onClick={() => setSelectedCartel(c.id)}
            >
              {c.id}
            </button>
          ))}
        </div>
      )}

      <button className="primary-btn join-btn" disabled={!selectedCartel || joining || !canAfford} onClick={handleJoin}>
        {joining ? 'Joining...' : selectedCartel ? `Play with cartel #${selectedCartel}` : 'Select a cartel'}
      </button>

      <style>{`
        .lobby-bar {
          display: flex;
          gap: 10px;
        }
        .lobby-stat {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-md);
          padding: 12px;
        }
        .lobby-value {
          font-family: var(--font-display);
          font-size: 19px;
          font-weight: 700;
          color: var(--gold-400);
        }
        .lobby-label {
          font-size: 10.5px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .cartel-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 8px;
          max-height: 46vh;
          overflow-y: auto;
          padding: 2px;
        }
        .cartel-cell {
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-mono);
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-secondary);
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-sm);
        }
        .cartel-cell.taken {
          opacity: 0.35;
          text-decoration: line-through;
        }
        .cartel-cell.selected {
          border-color: var(--gold-500);
          background: rgba(224, 184, 84, 0.14);
          color: var(--gold-400);
        }
        .primary-btn {
          background: linear-gradient(90deg, var(--gold-500), var(--gold-600));
          color: var(--ink-950);
          font-weight: 700;
          font-size: 14px;
          padding: 14px;
          border-radius: var(--radius-sm);
        }
        .primary-btn:disabled {
          opacity: 0.5;
        }
        .join-btn {
          position: sticky;
          bottom: 0;
        }
      `}</style>
    </>
  );
}
