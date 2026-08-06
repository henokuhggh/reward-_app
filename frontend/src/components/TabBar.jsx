import React from 'react';

const TABS = [
  { id: 'home', label: 'Home', icon: HomeIcon },
  { id: 'product', label: 'Products', icon: LayersIcon },
  { id: 'wallet', label: 'Wallet', icon: WalletIcon },
  { id: 'team', label: 'Team', icon: TeamIcon },
  { id: 'profile', label: 'Profile', icon: ProfileIcon }
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
          padding: 10px 6px calc(10px + env(safe-area-inset-bottom));
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
          font-size: 10.5px;
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
  const stroke = active ? '#f0d492' : '#5f6f95';
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 11.5L12 4l8 7.5M6 10v9a1 1 0 001 1h4v-6h2v6h4a1 1 0 001-1v-9"
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LayersIcon({ active }) {
  const stroke = active ? '#f0d492' : '#5f6f95';
  const fill = active ? 'rgba(240,212,146,0.15)' : 'none';
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 3l8.5 4.5L12 12 3.5 7.5 12 3z" stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" fill={fill} />
      <path d="M3.5 12l8.5 4.5 8.5-4.5" stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M3.5 16.5L12 21l8.5-4.5" stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function WalletIcon({ active }) {
  const stroke = active ? '#f0d492' : '#5f6f95';
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3.5" y="6.5" width="17" height="12" rx="2.5" stroke={stroke} strokeWidth="1.8" />
      <path d="M14.5 12.5h3" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function TeamIcon({ active }) {
  const stroke = active ? '#f0d492' : '#5f6f95';
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="8" r="3" stroke={stroke} strokeWidth="1.8" />
      <path d="M3.5 20c0-3.3 2.5-6 5.5-6s5.5 2.7 5.5 6" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="17" cy="7.5" r="2.4" stroke={stroke} strokeWidth="1.6" />
      <path d="M15.2 12.2c2.5.2 4.3 2.5 4.3 5.4" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ProfileIcon({ active }) {
  const stroke = active ? '#f0d492' : '#5f6f95';
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="3.5" stroke={stroke} strokeWidth="1.8" />
      <path d="M4.5 20c0-4.1 3.4-7 7.5-7s7.5 2.9 7.5 7" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
