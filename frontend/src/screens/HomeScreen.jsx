import React from 'react';
import BalanceCard from '../components/BalanceCard.jsx';

export default function HomeScreen({ user, onNavigate, onOpenAdmin }) {
  return (
    <div className="home-screen">
      <div className="top-row">
        <div>
          <p className="greeting">Welcome back</p>
          <p className="name">{user?.first_name || 'Investor'}</p>
        </div>
        {onOpenAdmin && (
          <button className="admin-btn" onClick={onOpenAdmin}>
            Admin
          </button>
        )}
      </div>

      <BalanceCard balance={user?.balance} signupBonus={user?.signup_bonus} />

      <div className="quick-actions">
        <ActionButton label="Deposit" onClick={() => onNavigate('wallet')} icon={PlusIcon} />
        <ActionButton label="Withdraw" onClick={() => onNavigate('wallet')} icon={MinusIcon} />
        <ActionButton label="Products" onClick={() => onNavigate('product')} icon={LayersIcon} />
        <ActionButton label="Team" onClick={() => onNavigate('team')} icon={TeamIcon} />
      </div>

      <div className="status-card">
        <p className="status-title">Account status</p>
        <div className="status-row">
          <span className="status-label">Deposit status</span>
          <span className={`status-pill ${user?.has_deposited ? 'good' : 'pending'}`}>
            {user?.has_deposited ? 'Active' : 'Not yet deposited'}
          </span>
        </div>
        {!user?.has_deposited && (
          <p className="status-note">
            Make your first deposit to unlock withdrawals and start earning daily returns.
          </p>
        )}
      </div>

      <style>{`
        .home-screen {
          padding: 20px 16px 24px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .greeting {
          font-size: 12.5px;
          color: var(--text-muted);
        }
        .name {
          font-family: var(--font-display);
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
          margin-top: 2px;
        }
        .admin-btn {
          font-size: 12px;
          font-weight: 700;
          color: var(--gold-400);
          border: 1px solid rgba(224, 184, 84, 0.35);
          padding: 7px 14px;
          border-radius: 999px;
        }
        .quick-actions {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }
        .status-card {
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-md);
          padding: 16px;
        }
        .status-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 10px;
        }
        .status-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .status-label {
          font-size: 12.5px;
          color: var(--text-secondary);
        }
        .status-pill {
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 999px;
        }
        .status-pill.good {
          color: var(--success);
          background: rgba(62, 207, 142, 0.14);
        }
        .status-pill.pending {
          color: var(--gold-400);
          background: rgba(224, 184, 84, 0.14);
        }
        .status-note {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 10px;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
}

function ActionButton({ label, onClick, icon: Icon }) {
  return (
    <button className="action-btn" onClick={onClick}>
      <span className="action-icon">
        <Icon />
      </span>
      <span className="action-label">{label}</span>

      <style>{`
        .action-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 12px 4px;
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-md);
        }
        .action-icon {
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(224, 184, 84, 0.12);
          border-radius: 999px;
        }
        .action-label {
          font-size: 10.5px;
          font-weight: 600;
          color: var(--text-secondary);
        }
      `}</style>
    </button>
  );
}

function PlusIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke="#f0d492" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
      <path d="M5 12h14" stroke="#f0d492" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
      <path d="M12 3l8.5 4.5L12 12 3.5 7.5 12 3z" stroke="#f0d492" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M3.5 12l8.5 4.5 8.5-4.5" stroke="#f0d492" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function TeamIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="8" r="3" stroke="#f0d492" strokeWidth="1.8" />
      <path d="M3.5 20c0-3.3 2.5-6 5.5-6s5.5 2.7 5.5 6" stroke="#f0d492" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
