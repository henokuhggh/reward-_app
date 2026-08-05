import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import BalanceCard from '../components/BalanceCard.jsx';

export default function ProfileScreen({ user, onBalanceChange }) {
  const [links, setLinks] = useState([]);
  const [bonus, setBonus] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getProfileLinks().then(({ links }) => setLinks(links || [])).catch(() => {});
    loadBonus();
  }, []);

  function loadBonus() {
    api.getBonus().then(({ bonus }) => setBonus(bonus)).catch(() => {});
  }

  async function handleClaim() {
    if (!bonus) return;
    setClaiming(true);
    setError('');
    try {
      await api.claimBonus(bonus.id);
      loadBonus();
      onBalanceChange?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div className="profile-screen">
      <p className="screen-title">Profile</p>

      <div className="identity-row">
        <div className="avatar">{(user?.first_name || 'U')[0]?.toUpperCase()}</div>
        <div className="identity-info">
          <span className="identity-name">{user?.first_name || 'Player'}</span>
          {user?.telegram_username && <span className="identity-handle">@{user.telegram_username}</span>}
        </div>
      </div>

      <BalanceCard balance={user?.balance} signupBonus={user?.signup_bonus} />

      {bonus && (
        <div className="bonus-card">
          <div className="bonus-info">
            <span className="bonus-title">{bonus.label || 'Daily bonus'}</span>
            <span className="bonus-amount">{Number(bonus.amount).toLocaleString()} ETB</span>
          </div>
          <button className="claim-btn" onClick={handleClaim} disabled={bonus.claimed || claiming}>
            {bonus.claimed ? 'Claimed' : claiming ? 'Claiming...' : 'Claim'}
          </button>
        </div>
      )}
      {error && <p className="error-text">{error}</p>}

      {links.length > 0 && (
        <div className="links-section">
          <p className="section-label">Community</p>
          {links.map((link) => (
            <a key={link.id} className="link-row" href={link.url} target="_blank" rel="noreferrer">
              <span className="link-label">{link.label}</span>
              <span className="link-arrow">→</span>
            </a>
          ))}
        </div>
      )}

      <style>{`
        .profile-screen {
          padding: 20px 16px 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .screen-title {
          font-family: var(--font-display);
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .identity-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .avatar {
          width: 48px;
          height: 48px;
          border-radius: 999px;
          background: rgba(224, 184, 84, 0.14);
          color: var(--gold-400);
          font-weight: 700;
          font-size: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .identity-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .identity-name {
          font-size: 15px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .identity-handle {
          font-size: 12px;
          color: var(--text-muted);
        }
        .bonus-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-md);
          padding: 14px 16px;
        }
        .bonus-info {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .bonus-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .bonus-amount {
          font-size: 15px;
          font-weight: 700;
          color: var(--gold-400);
        }
        .claim-btn {
          background: linear-gradient(90deg, var(--gold-500), var(--gold-600));
          color: var(--ink-950);
          font-weight: 700;
          font-size: 12.5px;
          padding: 10px 18px;
          border-radius: var(--radius-sm);
        }
        .claim-btn:disabled {
          opacity: 0.5;
          background: var(--surface-2);
          color: var(--text-muted);
        }
        .error-text {
          font-size: 12.5px;
          color: var(--danger);
        }
        .links-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .section-label {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .link-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-sm);
          padding: 13px 14px;
          text-decoration: none;
        }
        .link-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .link-arrow {
          color: var(--gold-400);
          font-weight: 700;
        }
      `}</style>
    </div>
  );
}
