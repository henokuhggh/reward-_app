import React from 'react';
import BalanceCard from '../components/BalanceCard.jsx';
import ReferralCard from '../components/ReferralCard.jsx';

export default function HomeScreen({ user, onNavigate }) {
  return (
    <div className="home-screen">
      <header className="header">
        <span className="greeting">Hello, {user?.first_name || 'there'}</span>
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
