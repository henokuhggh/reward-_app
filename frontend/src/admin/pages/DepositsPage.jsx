import React, { useEffect, useState } from 'react';
import { api } from '../../api.js';

function CopyButton({ value }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <button type="button" className={`copy-btn ${copied ? 'copied' : ''}`} onClick={handleCopy}>
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

export default function DepositsPage() {
  const [deposits, setDeposits] = useState([]);
  const [status, setStatus] = useState('pending');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    load();
  }, [status]);

  function load() {
    api.admin
      .getDeposits(status)
      .then(({ deposits }) => setDeposits(deposits || []))
      .catch((err) => setError(err.message));
  }

  async function handleApprove(id) {
    setBusyId(id);
    setError('');
    try {
      await api.admin.approveDeposit(id, '');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id) {
    setBusyId(id);
    setError('');
    try {
      await api.admin.rejectDeposit(id, '');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="deposits-page">
      <h1 className="page-title">Deposits</h1>

      <div className="status-tabs">
        {['pending', 'approved', 'rejected'].map((s) => (
          <button key={s} className={status === s ? 'active' : ''} onClick={() => setStatus(s)}>
            {s}
          </button>
        ))}
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="list">
        {deposits.length === 0 && <p className="muted-text">No {status} deposits.</p>}
        {deposits.map((d) => (
          <div key={d.id} className="req-card">
            <div className="req-top">
              <span className="req-name">{d.users?.first_name || d.users?.telegram_username || 'User'}</span>
              <span className="req-amount">{Number(d.amount).toLocaleString()} ETB</span>
            </div>
            <div className="req-meta">
              <span>{d.payment_methods?.name}</span>
              <span className="mono">{d.reference_code}</span>
              <CopyButton value={d.reference_code} />
            </div>
            <span className="req-date">{new Date(d.requested_at).toLocaleString()}</span>
            {status === 'pending' && (
              <div className="req-actions">
                <button className="reject-btn" disabled={busyId === d.id} onClick={() => handleReject(d.id)}>
                  Reject
                </button>
                <button className="approve-btn" disabled={busyId === d.id} onClick={() => handleApprove(d.id)}>
                  {busyId === d.id ? 'Working...' : 'Approve'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <style>{sharedAdminListStyles}</style>
    </div>
  );
}

export const sharedAdminListStyles = `
  .deposits-page, .withdrawals-page {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .page-title {
    font-family: var(--font-display);
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary);
  }
  .status-tabs {
    display: flex;
    gap: 6px;
  }
  .status-tabs button {
    flex: 1;
    padding: 9px;
    font-size: 12px;
    font-weight: 700;
    text-transform: capitalize;
    background: var(--surface-1);
    border: 1px solid var(--surface-border);
    color: var(--text-muted);
    border-radius: var(--radius-sm);
  }
  .status-tabs button.active {
    background: rgba(224, 184, 84, 0.12);
    border-color: rgba(224, 184, 84, 0.3);
    color: var(--gold-400);
  }
  .error-text {
    font-size: 12.5px;
    color: var(--danger);
  }
  .muted-text {
    font-size: 12.5px;
    color: var(--text-muted);
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .req-card {
    background: var(--surface-1);
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-md);
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .req-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .req-name {
    font-size: 13.5px;
    font-weight: 700;
    color: var(--text-primary);
  }
  .req-amount {
    font-size: 14px;
    font-weight: 700;
    color: var(--gold-400);
  }
  .req-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 11.5px;
    color: var(--text-secondary);
  }
  .req-meta .mono {
    font-family: var(--font-mono);
  }
  .copy-btn {
    background: var(--surface-2);
    border: 1px solid var(--surface-border);
    color: var(--gold-400);
    font-size: 10px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 999px;
  }
  .copy-btn.copied {
    color: var(--success);
    border-color: rgba(62, 207, 142, 0.35);
  }
  .req-date {
    font-size: 10.5px;
    color: var(--text-muted);
  }
  .fee-note {
    font-size: 11.5px;
    color: var(--gold-400);
  }
  .req-actions {
    display: flex;
    gap: 8px;
    margin-top: 6px;
  }
  .approve-btn, .reject-btn {
    flex: 1;
    font-size: 12.5px;
    font-weight: 700;
    padding: 9px;
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
    opacity: 0.6;
  }
`;
