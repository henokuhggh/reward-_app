import React, { useEffect, useState } from 'react';
import { api } from '../../api.js';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.admin
      .getStats()
      .then(setStats)
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
            <span className="stat-value online">{stats.onlineNow}</span>
            <span className="stat-label">Online now</span>
            <span className="stat-note">active in last {stats.onlineWindowMinutes} min</span>
          </div>
        </div>
      )}

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
        .stat-value {
          font-family: var(--font-display);
          font-size: 30px;
          font-weight: 700;
          color: var(--gold-400);
        }
        .stat-value.online {
          color: var(--success);
        }
        .stat-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .stat-note {
          font-size: 10.5px;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
