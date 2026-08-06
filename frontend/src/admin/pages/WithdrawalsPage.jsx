import React, { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { sharedAdminListStyles } from './DepositsPage.jsx';

export default function WithdrawalsPage({ role }) {
  const isOwner = role === 'owner';
  const [withdrawals, setWithdrawals] = useState([]);
  const [status, setStatus] = useState('pending');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    load();
  }, [status]);

  function load() {
    api.admin
      .getWithdrawals(status)
      .then(({ withdrawals }) => setWithdrawals(withdrawals || []))
      .catch((err) => setError(err.message));
  }

  async function handleApprove(id) {
    setBusyId(id);
    setError('');
    try {
      await api.admin.approveWithdrawal(id, '');
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
      await api.admin.rejectWithdrawal(id, '');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="withdrawals-page">
      <h1 className="page-title">Withdrawals</h1>

      <div className="status-tabs">
        {['pending', 'approved', 'rejected'].map((s) => (
          <button key={s} className={status === s ? 'active' : ''} onClick={() => setStatus(s)}>
            {s}
          </button>
        ))}
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="list">
        {withdrawals.length === 0 && <p className="muted-text">No {status} withdrawals.</p>}
        {withdrawals.map((w) => (
          <div key={w.id} className="req-card">
            <div className="req-top">
              <span className="req-name">{w.users?.first_name || w.users?.telegram_username || 'User'}</span>
              <span className="req-amount">{Number(w.amount).toLocaleString()} ETB</span>
            </div>
            <div className="req-meta">
              <span>{w.method}</span>
              <span className="mono">{w.account_details}</span>
            </div>
            <div className="fee-note">
              Send user <strong>{Number(w.net_amount ?? w.amount).toLocaleString()} ETB</strong> - fee kept:{' '}
              {Number(w.fee_amount ?? 0).toLocaleString()} ETB
            </div>
            <span className="req-date">{new Date(w.requested_at).toLocaleString()}</span>
            {status === 'pending' && isOwner && (
              <div className="req-actions">
                <button className="reject-btn" disabled={busyId === w.id} onClick={() => handleReject(w.id)}>
                  Reject
                </button>
                <button className="approve-btn" disabled={busyId === w.id} onClick={() => handleApprove(w.id)}>
                  {busyId === w.id ? 'Working...' : 'Approve'}
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
