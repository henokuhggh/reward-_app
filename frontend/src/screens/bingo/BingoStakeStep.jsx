import React, { useEffect, useState } from 'react';
import { api } from '../../api.js';

export default function BingoStakeStep({ onChoose }) {
  const [stakes, setStakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getBingoStakes()
      .then(({ stakes }) => setStakes(stakes || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <p className="screen-title">Bingo</p>
      <p className="screen-subtitle">Choose a prize tier to start playing.</p>

      {error && <p className="error-text">{error}</p>}

      {loading ? (
        <p className="muted-text">Loading tiers...</p>
      ) : stakes.length === 0 ? (
        <p className="muted-text">No stake tiers available right now.</p>
      ) : (
        <div className="stake-grid">
          {stakes.map((s) => (
            <button key={s.id} className="stake-card" onClick={() => onChoose(s)}>
              <span className="stake-amount">{Number(s.amount).toLocaleString()}</span>
              <span className="stake-currency">Birr</span>
            </button>
          ))}
        </div>
      )}

      <style>{`
        .stake-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .stake-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 26px 10px;
          background: linear-gradient(160deg, var(--surface-1), var(--surface-2));
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-lg);
        }
        .stake-card:active {
          border-color: rgba(224, 184, 84, 0.4);
        }
        .stake-amount {
          font-family: var(--font-display);
          font-size: 28px;
          font-weight: 700;
          color: var(--gold-400);
        }
        .stake-currency {
          font-size: 11.5px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
      `}</style>
    </>
  );
}
