import React from 'react';
import BalanceCard from '../components/BalanceCard.jsx';
import ReferralCard from '../components/ReferralCard.jsx';

export default function HomeScreen({ user, onNavigate, onOpenAdmin }) {
  return (
    <div className="home-screen">
      <header className="header">
        <span className="greeting">Hello, {user?.first_name || 'there'}</span>
        {onOpenAdmin && (
          <button className="admin-switch" onClick={onOpenAdmin}>
            Admin
          </button>
        )}
      </header>

      <BalanceCard balance={user?.balance} />

      <div className="quick-actions">
        <button className="action-tile" onClick={() => onNavigate('earn')}>
          <span className="tile-label">Earn</span>
          <span className="tile-sub">Watch ads or join channels</span>
        </button>
        <button className="action-tile" onClick={() => onNavigate('withdraw')}>
          <span className="tile-label">Withdraw</span>
          <span className="tile-sub">Send your balance out</span>
        </button>
      </div>

      <ReferralCard user={user} />

      <style>{`
        .home-screen {
          padding: 20px 18px 12px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .greeting {
          font-family: var(--font-display);
          font-size: 20px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .admin-switch {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          color: var(--gold-400);
          background: rgba(224, 184, 84, 0.12);
          border: 1px solid rgba(224, 184, 84, 0.3);
          padding: 6px 12px;
          border-radius: 999px;
        }
        .quick-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .action-tile {
          text-align: left;
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-md);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .tile-label {
          font-family: var(--font-display);
          font-size: 15px;
          font-weight: 600;
          color: var(--gold-400);
        }
        .tile-sub {
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.4;
        }
      `}</style>
    </div>
  );
}
