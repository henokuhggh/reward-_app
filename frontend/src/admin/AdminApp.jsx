import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import DashboardPage from './pages/DashboardPage.jsx';
import UsersPage from './pages/UsersPage.jsx';
import ProductsPage from './pages/ProductsPage.jsx';
import DepositsPage from './pages/DepositsPage.jsx';
import WithdrawalsPage from './pages/WithdrawalsPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import AdminsPage from './pages/AdminsPage.jsx';
import ReferralRanksPage from './pages/ReferralRanksPage.jsx';

const PAGES = [
  { id: 'dashboard', label: 'Dashboard', component: DashboardPage },
  { id: 'users', label: 'Users', component: UsersPage },
  { id: 'products', label: 'Products', component: ProductsPage },
  { id: 'deposits', label: 'Deposits', component: DepositsPage },
  { id: 'withdrawals', label: 'Withdrawals', component: WithdrawalsPage },
  { id: 'referrals', label: 'Referral Program', component: ReferralRanksPage },
  { id: 'settings', label: 'Settings', component: SettingsPage },
  { id: 'admins', label: 'Admins', component: AdminsPage }
];

export default function AdminApp({ onExit }) {
  const [page, setPage] = useState('dashboard');
  const [role, setRole] = useState(null);

  useEffect(() => {
    api.admin
      .getMe()
      .then(({ role }) => setRole(role))
      .catch(() => setRole(null));
  }, []);

  const ActivePage = PAGES.find((p) => p.id === page)?.component || DashboardPage;

  return (
    <div className="admin-app">
      <header className="admin-header">
        <button className="exit-btn" onClick={onExit}>
          &larr; Exit admin
        </button>
        <span className="admin-badge">{role === 'owner' ? 'OWNER' : role === 'sub_admin' ? 'ADMIN' : '...'}</span>
      </header>

      <nav className="admin-nav">
        {PAGES.map((p) => (
          <button
            key={p.id}
            className={`nav-item ${page === p.id ? 'active' : ''}`}
            onClick={() => setPage(p.id)}
          >
            {p.label}
          </button>
        ))}
      </nav>

      <main className="admin-content">
        <ActivePage role={role} />
      </main>

      <style>{`
        .admin-app {
          min-height: 100vh;
          background: var(--surface-0);
          padding-bottom: 24px;
        }
        .admin-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 18px 8px;
        }
        .exit-btn {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .admin-badge {
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: var(--gold-400);
          background: rgba(224, 184, 84, 0.12);
          padding: 4px 10px;
          border-radius: 999px;
        }
        .admin-nav {
          display: flex;
          gap: 6px;
          padding: 8px 18px 16px;
          overflow-x: auto;
        }
        .nav-item {
          flex-shrink: 0;
          font-size: 12.5px;
          font-weight: 600;
          padding: 8px 14px;
          border-radius: var(--radius-sm);
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          color: var(--text-secondary);
        }
        .nav-item.active {
          background: rgba(224, 184, 84, 0.12);
          border-color: rgba(224, 184, 84, 0.3);
          color: var(--gold-400);
        }
        .admin-content {
          padding: 0 18px;
        }
      `}</style>
    </div>
  );
}
