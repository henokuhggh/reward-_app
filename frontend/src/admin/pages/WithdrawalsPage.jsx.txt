import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../api.js';

export default function WithdrawalsPage() {
  const [status, setStatus] = useState('pending');
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { withdrawals } = await api.admin.getWithdrawals(status);
      setWithdrawals(withdrawals);
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  async function handleApprove(id) {
    setBusyId(id);
    try {
      await api.admin.approveWithdrawal(id);
      setToast({ type: 'success', message: 'Approved' });
      await load();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id) {
    setBusyId(id);
    try {
      await api.admin.rejectWithdrawal(id);
      setToast({ type: 'success', message: 'Rejected' });
      await load();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="withdrawals-page">
      <h1 className="page-title">Withdrawals</h1>

      <div className="status-tabs">
        {['pending', 'approved', 'rejected'].map((s) => (
          <button
            key={s}
            className={`status-tab ${status === s ? 'active' : ''}`}
            onClick={() => setStatus(s)}
          >
            {s}
          </button>
        ))}
      </div>

      {loading && <p className="muted">Loading…</p>}
      {!loading && withdrawals.length === 0 && <p className="muted">No {status} withdrawals.</p>}

      <div className="withdrawal-list">
        {withdrawals.map((w) => (
          <div className="withdrawal-card" key={w.id}>
            <div className="withdrawal-header">
              <span className="withdrawal-amount">{Number(w.amount).toFixed(2)} ETB</span>
              <span className="withdrawal-date">{new Date(w.requested_at).toLocaleString()}</span>
            </div>
            <p className="withdrawal-user">
              {w.users?.first_name || 'Unknown'} {w.users?.telegram_username ? `(@${w.users.telegram_username})` : ''}
              {' '}&middot; ID {w.users?.telegram_id}
            </p>
            <p className="withdrawal-method">
              {w.method} &middot; {w.account_details}
            </p>

            {status === 'pending' && (
              <div className="withdrawal-actions">
                <button
                  className="reject-btn"
                  onClick={() => handleReject(w.id)}
                  disabled={busyId === w.id}
                >
                  Reject
                </button>
                <button
                  className="approve-btn"
                  onClick={() => handleApprove(w.id)}
                  disabled={busyId === w.id}
                >
                  {busyId === w.id ? 'Working…' : 'Approve'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}

      <style>{`
        .withdrawals-page {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding-bottom: 20px;
        }
        .page-title {
          font-family: var(--font-display);
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .status-tabs {
          display: flex;
          gap: 8px;
        }
        .status-tab {
          flex: 1;
          text-transform: capitalize;
          font-size: 12.5px;
          font-weight: 600;
          padding: 9px;
          border-radius: var(--radius-sm);
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          color: var(--text-secondary);
        }
        .status-tab.active {
          background: rgba(224, 184, 84, 0.12);
          border-color: rgba(224, 184, 84, 0.3);
          color: var(--gold-400);
        }
        .muted {
          font-size: 13px;
          color: var(--text-secondary);
        }
        .withdrawal-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .withdrawal-card {
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-md);
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .withdrawal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .withdrawal-amount {
          font-family: var(--font-display);
          font-size: 16px;
          font-weight: 700;
          color: var(--gold-400);
        }
        .withdrawal-date {
          font-size: 10.5px;
          color: var(--text-muted);
        }
        .withdrawal-user, .withdrawal-method {
          font-size: 12px;
          color: var(--text-secondary);
        }
        .withdrawal-actions {
          display: flex;
          gap: 8px;
          margin-top: 8px;
        }
        .approve-btn, .reject-btn {
          flex: 1;
          font-size: 12.5px;
          font-weight: 700;
          padding: 10px;
          border-radius: var(--radius-sm);
        }
        .approve-btn {
          background: linear-gradient(90deg, var(--gold-500), var(--gold-600));
          color: var(--ink-950);
        }
        .reject-btn {
          background: transparent;
          border: 1px solid var(--surface-border);
          color: var(--text-secondary);
        }
        .approve-btn:disabled, .reject-btn:disabled {
          opacity: 0.5;
        }
        .toast {
          position: fixed;
          bottom: 90px;
          left: 18px;
          right: 18px;
          padding: 12px 16px;
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 600;
          text-align: center;
          z-index: 30;
        }
        .toast.success {
          background: rgba(62, 207, 142, 0.15);
          color: var(--success);
          border: 1px solid rgba(62, 207, 142, 0.3);
        }
        .toast.error {
          background: rgba(229, 99, 122, 0.15);
          color: var(--danger);
          border: 1px solid rgba(229, 99, 122, 0.3);
        }
      `}</style>
    </div>
  );
}
