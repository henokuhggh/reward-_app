import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../api.js';

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [history, setHistory] = useState([]);
  const [minWithdrawalInput, setMinWithdrawalInput] = useState('');
  const [savingMin, setSavingMin] = useState(false);

  const [broadcastText, setBroadcastText] = useState('');
  const [broadcastImage, setBroadcastImage] = useState('');
  const [sending, setSending] = useState(false);

  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    try {
      const [settingsRes, historyRes] = await Promise.all([
        api.admin.getSettings(),
        api.admin.getMinWithdrawalHistory()
      ]);
      setSettings(settingsRes.settings);
      setMinWithdrawalInput(String(settingsRes.settings.min_withdrawal));
      setHistory(historyRes.history);
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  async function handleUpdateMin(e) {
    e.preventDefault();
    setSavingMin(true);
    try {
      await api.admin.updateMinWithdrawal(Number(minWithdrawalInput));
      setToast({ type: 'success', message: 'Minimum withdrawal updated' });
      await load();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setSavingMin(false);
    }
  }

  async function handleBroadcast(e) {
    e.preventDefault();
    if (!broadcastText && !broadcastImage) {
      setToast({ type: 'error', message: 'Enter text, an image URL, or both' });
      return;
    }
    setSending(true);
    try {
      const result = await api.admin.broadcast(broadcastText || undefined, broadcastImage || undefined);
      setToast({
        type: 'success',
        message: `Sent to ${result.successCount}/${result.recipientCount} users`
      });
      setBroadcastText('');
      setBroadcastImage('');
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="settings-page">
      <h1 className="page-title">Settings</h1>

      <section className="card">
        <h2 className="card-title">Minimum withdrawal</h2>
        <form className="min-form" onSubmit={handleUpdateMin}>
          <input
            type="number"
            value={minWithdrawalInput}
            onChange={(e) => setMinWithdrawalInput(e.target.value)}
          />
          <button className="primary-btn" type="submit" disabled={savingMin}>
            {savingMin ? 'Saving…' : 'Update'}
          </button>
        </form>

        {history.length > 0 && (
          <div className="history-list">
            {history.map((h) => (
              <div className="history-row" key={h.id}>
                <span>
                  {h.old_value} → {h.new_value} ETB
                </span>
                <span className="history-date">{new Date(h.changed_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="card-title">Broadcast to all users</h2>
        <p className="card-hint">
          Sends a Telegram message to every non-banned user. Large user counts send in
          batches, so this may take a moment.
        </p>
        <form className="broadcast-form" onSubmit={handleBroadcast}>
          <textarea
            placeholder="Message text"
            rows={4}
            value={broadcastText}
            onChange={(e) => setBroadcastText(e.target.value)}
          />
          <input
            placeholder="Image URL (optional)"
            value={broadcastImage}
            onChange={(e) => setBroadcastImage(e.target.value)}
          />
          <button className="primary-btn" type="submit" disabled={sending}>
            {sending ? 'Sending…' : 'Send broadcast'}
          </button>
        </form>
      </section>

      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}

      <style>{`
        .settings-page {
          display: flex;
          flex-direction: column;
          gap: 18px;
          padding-bottom: 20px;
        }
        .page-title {
          font-family: var(--font-display);
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .card {
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-md);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .card-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .card-hint {
          font-size: 11.5px;
          color: var(--text-secondary);
          line-height: 1.4;
        }
        .min-form {
          display: flex;
          gap: 8px;
        }
        input, textarea {
          background: var(--surface-2);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-sm);
          padding: 11px 12px;
          color: var(--text-primary);
          font-size: 13.5px;
          font-family: inherit;
          width: 100%;
          resize: vertical;
        }
        .min-form input {
          flex: 1;
        }
        .primary-btn {
          background: linear-gradient(90deg, var(--gold-500), var(--gold-600));
          color: var(--ink-950);
          font-weight: 700;
          font-size: 13px;
          padding: 11px 16px;
          border-radius: var(--radius-sm);
          white-space: nowrap;
        }
        .primary-btn:disabled {
          opacity: 0.6;
        }
        .history-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          max-height: 160px;
          overflow-y: auto;
        }
        .history-row {
          display: flex;
          justify-content: space-between;
          font-size: 11.5px;
          color: var(--text-secondary);
          padding: 6px 0;
          border-top: 1px solid var(--surface-border);
        }
        .history-date {
          color: var(--text-muted);
        }
        .broadcast-form {
          display: flex;
          flex-direction: column;
          gap: 10px;
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
