import React, { useEffect, useState } from 'react';
import { api } from '../../api.js';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.admin.getStats().then(setStats).catch((err) => setError(err.message));
    api.admin
      .getUsers()
      .then(({ users }) => setUsers(users || []))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="dashboard-page">
      <h1 className="page-title">Dashboard</h1>

      {error && <p className="error-text">{error}</p>}

      {stats && (
        <div className="stat-grid">
          <div className="stat-card">
            <span className="stat-value">{stats.totalUsers}</span>
            <span className="stat-label">Total users</span>
          </div>
          <div className="stat-card">
            <span className="stat-value good">{stats.activeUsers}</span>
            <span className="stat-label">Active (deposited)</span>
          </div>
          <div className="stat-card wide">
            <span className="stat-value">{Number(stats.totalDeposited).toLocaleString()} ETB</span>
            <span className="stat-label">Total deposited</span>
          </div>
        </div>
      )}

      <p className="section-title">Users</p>
      <div className="user-table">
        <div className="table-header">
          <span>Name</span>
          <span>Balance</span>
          <span>Invited</span>
          <span>Status</span>
        </div>
        {users.map((u) => (
          <div key={u.id} className="table-row">
            <span className="cell-name">{u.first_name || u.telegram_username || 'User'}</span>
            <span>{Number(u.balance).toLocaleString()} ETB</span>
            <span>{u.invited_count}</span>
            <span className={`cell-status ${u.has_deposited ? 'good' : 'muted'}`}>
              {u.has_deposited ? 'Active' : 'New'}
            </span>
          </div>
        ))}
        {users.length === 0 && <p className="muted-text">No users yet.</p>}
      </div>

      <style>{`
        .dashboard-page {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .page-title {
          font-family: var(--font-display);
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .error-text {
          font-size: 13px;
          color: var(--danger);
        }
        .muted-text {
          font-size: 12.5px;
          color: var(--text-muted);
        }
        .stat-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .stat-card {
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-md);
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .stat-card.wide {
          grid-column: span 2;
        }
        .stat-value {
          font-family: var(--font-display);
          font-size: 26px;
          font-weight: 700;
          color: var(--gold-400);
        }
        .stat-value.good {
          color: var(--success);
        }
        .stat-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .section-title {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .user-table {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .table-header, .table-row {
          display: grid;
          grid-template-columns: 1.6fr 1.2fr 0.8fr 0.9fr;
          gap: 6px;
          padding: 10px 8px;
          font-size: 11.5px;
        }
        .table-header {
          color: var(--text-muted);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        .table-row {
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
        }
        .cell-name {
          color: var(--text-primary);
          font-weight: 600;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .cell-status.good {
          color: var(--success);
          font-weight: 700;
        }
        .cell-status.muted {
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
