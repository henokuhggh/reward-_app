import React from 'react';

const TABS = [
  { id: 'home', label: 'Home', icon: HomeIcon },
  { id: 'earn', label: 'Earn', icon: BoltIcon },
  { id: 'withdraw', label: 'Withdraw', icon: WalletIcon }
];

export default function TabBar({ active, onChange }) {
  return (
    <nav className="tab-bar">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          className={`tab ${active === id ? 'active' : ''}`}
          onClick={() => onChange(id)}
        >
          <Icon active={active === id} />
          <span>{label}</span>
        </button>
      ))}

      <style>{`
        .tab-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          display: flex;
          background: rgba(10, 18, 40, 0.92);
          backdrop-filter: blur(20px);
          border-top: 1px solid var(--surface-border);
          padding: 10px 12px calc(10px + env(safe-area-inset-bottom));
          z-index: 10;
        }
        .tab {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 6px 0;
          color: var(--text-muted);
          font-size: 11px;
          font-weight: 600;
          transition: color 0.2s ease;
        }
        .tab.active {
          color: var(--gold-400);
        }
      `}</style>
    </nav>
  );
}

function HomeIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 11.5L12 4l8 7.5M6 10v9a1 1 0 001 1h4v-6h2v6h4a1 1 0 001-1v-9"
        stroke={active ? '#f0d492' : '#5f6f95'}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BoltIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M13 3L5 14h6l-1 7 8-11h-6l1-7z"
        stroke={active ? '#f0d492' : '#5f6f95'}
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill={active ? 'rgba(240,212,146,0.15)' : 'none'}
      />
    </svg>
  );
}

function WalletIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect
        x="3.5"
        y="6.5"
        width="17"
        height="12"
        rx="2.5"
        stroke={active ? '#f0d492' : '#5f6f95'}
        strokeWidth="1.8"
      />
      <path d="M14.5 12.5h3" stroke={active ? '#f0d492' : '#5f6f95'} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
