import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api.js';
import BalanceCard from '../components/BalanceCard.jsx';

const MIN_WITHDRAWAL = Number(import.meta.env.VITE_MIN_WITHDRAWAL || 50);

const METHODS = [
  { id: 'telebirr', label: 'Telebirr' },
  { id: 'cbe', label: 'CBE Birr' },
  { id: 'awash_bank', label: 'Awash Bank' }
];

export default function WithdrawScreen({ user, onBalanceChange }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(METHODS[0].id);
  const [accountDetails, setAccountDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [history, setHistory] = useState([]);

  const loadHistory = useCallback(async () => {
    try {
      const { withdrawals } = await api.getMyWithdrawals();
      setHistory(withdrawals);
    } catch {
      // history is non-critical, fail silently
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);

    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount < MIN_WITHDRAWAL) {
      setMessage({ type: 'error', text: `Minimum withdrawal is ${MIN_WITHDRAWAL} ETB` });
      return;
    }
    if (numericAmount > Number(user?.balance || 0)) {
      setMessage({ type: 'error', text: 'Amount exceeds your available balance' });
      return;
    }
    if (!accountDetails.trim()) {
      setMessage({ type: 'error', text: 'Enter your account or phone number' });
      return;
    }

    setSubmitting(true);
    try {
      await api.requestWithdrawal(numericAmount, method, accountDetails.trim());
      setMessage({ type: 'success', text: 'Withdrawal requested. It will be reviewed shortly.' });
      setAmount('');
      setAccountDetails('');
      await onBalanceChange();
      await loadHistory();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  const canWithdraw = Number(user?.balance || 0) >= MIN_WITHDRAWAL;

  return (
    <div className="withdraw-screen">
      <BalanceCard balance={user?.balance} />

      {!canWithdraw && (
        <p className="min-note">
          You need at least {MIN_WITHDRAWAL} ETB to withdraw. Keep earning to reach the minimum.
        </p>
      )}

      <form className="withdraw-form" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field-label">Amount (ETB)</span>
          <input
            type="number"
            inputMode="decimal"
            placeholder={`Min. ${MIN_WITHDRAWAL}`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="field-label">Withdrawal method</span>
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            {METHODS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">Account or phone number</span>
          <input
            type="text"
            placeholder="e.g. 09xxxxxxxx"
            value={accountDetails}
            onChange={(e) => setAccountDetails(e.target.value)}
          />
        </label>

        <button className="submit-btn" type="submit" disabled={submitting || !canWithdraw}>
          {submitting ? 'Submitting…' : 'Request withdrawal'}
        </button>

        {message && <p className={`form-message ${message.type}`}>{message.text}</p>}
      </form>

      {history.length > 0 && (
        <section className="history">
          <h2 className="section-title">History</h2>
          <div className="history-list">
            {history.map((w) => (
              <div className="history-row" key={w.id}>
                <div>
                  <p className="history-amount">{Number(w.amount).toFixed(2)} ETB</p>
                  <p className="history-meta">{new Date(w.requested_at).toLocaleDateString()}</p>
                </div>
                <span className={`status-pill ${w.status}`}>{w.status}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <style>{`
        .withdraw-screen {
          padding: 20px 18px 12px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .min-note {
          font-size: 12.5px;
          color: var(--text-secondary);
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-sm);
          padding: 10px 14px;
        }
        .withdraw-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-md);
          padding: 18px;
        }
        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .field-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
        }
        input, select {
          background: var(--surface-2);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-sm);
          padding: 12px 14px;
          color: var(--text-primary);
          font-size: 14px;
        }
        input:focus, select:focus {
          outline: 2px solid var(--gold-500);
          outline-offset: 1px;
        }
        .submit-btn {
          margin-top: 4px;
          background: linear-gradient(90deg, var(--gold-500), var(--gold-600));
          color: var(--ink-950);
          font-weight: 700;
          font-size: 14px;
          padding: 13px;
          border-radius: var(--radius-sm);
        }
        .submit-btn:disabled {
          opacity: 0.5;
        }
        .form-message {
          font-size: 12.5px;
          font-weight: 600;
        }
        .form-message.error {
          color: var(--danger);
        }
        .form-message.success {
          color: var(--success);
        }
        .section-title {
          font-family: var(--font-display);
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 10px;
        }
        .history-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .history-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-md);
          padding: 12px 16px;
        }
        .history-amount {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .history-meta {
          font-size: 11.5px;
          color: var(--text-muted);
          margin-top: 2px;
        }
        .status-pill {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          padding: 5px 10px;
          border-radius: 999px;
        }
        .status-pill.pending {
          background: rgba(224, 184, 84, 0.15);
          color: var(--gold-400);
        }
        .status-pill.approved {
          background: rgba(62, 207, 142, 0.15);
          color: var(--success);
        }
        .status-pill.rejected {
          background: rgba(229, 99, 122, 0.15);
          color: var(--danger);
        }
      `}</style>
    </div>
  );
}
