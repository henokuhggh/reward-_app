import React, { useEffect, useState } from 'react';
import { api } from '../../api.js';

export default function AdminsPage({ role }) {
  const isOwner = role === 'owner';

  const [admins, setAdmins] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, []);

  function load() {
    api.admin
      .getAdmins()
      .then(({ admins }) => setAdmins(admins || []))
      .catch((err) => setError(err.message));
  }

  return (
    <div className="admins-page">
      <h1 className="page-title">Admins</h1>
      {error && <p className="error-text">{error}</p>}

      {isOwner ? (
        <AddAdminForm onChange={load} />
      ) : (
        <p className="card-hint">Only the owner admin can add or remove admins.</p>
      )}

      <div className="list">
        {admins.map((a) => (
          <AdminRow key={a.id} admin={a} isOwner={isOwner} onChange={load} />
        ))}
        {admins.length === 0 && <p className="muted-text">No admins yet.</p>}
      </div>

      <style>{`
        .admins-page {
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
          font-size: 12px;
          color: var(--danger);
        }
        .muted-text, .card-hint {
          font-size: 12.5px;
          color: var(--text-muted);
        }
        .list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
      `}</style>
    </div>
  );
}

function AddAdminForm({ onChange }) {
  const [telegramId, setTelegramId] = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');
  const [role, setRole] = useState('sub_admin');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!telegramId) {
      setError('Telegram ID is required');
      return;
    }
    setSaving(true);
    try {
      await api.admin.addAdmin({ telegramId, telegramUsername: telegramUsername || undefined, role });
      setTelegramId('');
      setTelegramUsername('');
      setRole('sub_admin');
      onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <p className="section-title">Add admin</p>
      {error && <p className="error-text">{error}</p>}

      <input placeholder="Telegram ID" value={telegramId} onChange={(e) => setTelegramId(e.target.value)} />
      <input placeholder="Telegram username (optional)" value={telegramUsername} onChange={(e) => setTelegramUsername(e.target.value)} />

      <select value={role} onChange={(e) => setRole(e.target.value)}>
        <option value="sub_admin">Sub-admin (limited access)</option>
        <option value="owner">Owner (full access)</option>
      </select>
      <p className="card-hint">
        Sub-admins can see everything (users, deposits, withdrawals, totals) and manage products, but can't
        approve or reject withdrawals or deposits, change payment methods, or add other admins.
      </p>

      <button className="primary-btn" type="submit" disabled={saving}>
        {saving ? 'Adding...' : 'Add admin'}
      </button>

      <style>{`
        .admin-form {
          display: flex;
          flex-direction: column;
          gap: 8px;
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-md);
          padding: 14px;
        }
        .section-title {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .error-text {
          font-size: 12px;
          color: var(--danger);
        }
        .card-hint {
          font-size: 11px;
          color: var(--text-secondary);
          line-height: 1.4;
        }
        input, select {
          background: var(--surface-2);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-sm);
          padding: 10px 12px;
          font-size: 12.5px;
          color: var(--text-primary);
          outline: none;
          width: 100%;
        }
        .primary-btn {
          background: linear-gradient(90deg, var(--gold-500), var(--gold-600));
          color: var(--ink-950);
          font-weight: 700;
          font-size: 12.5px;
          padding: 11px 16px;
          border-radius: var(--radius-sm);
          margin-top: 4px;
        }
        .primary-btn:disabled {
          opacity: 0.6;
        }
      `}</style>
    </form>
  );
}

function AdminRow({ admin, isOwner, onChange }) {
  const [busy, setBusy] = useState(false);

  async function handleRemove() {
    setBusy(true);
    try {
      await api.admin.removeAdmin(admin.id);
      onChange();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-row">
      <div className="admin-row-info">
        <span className="admin-row-title">{admin.telegram_username || admin.telegram_id}</span>
        <span className="admin-row-meta">{admin.telegram_id}</span>
      </div>
      <span className={`role-badge ${admin.role}`}>{admin.role === 'owner' ? 'Owner' : 'Sub-admin'}</span>
      {isOwner && (
        <button className="remove-btn" onClick={handleRemove} disabled={busy}>
          {busy ? '...' : 'Remove'}
        </button>
      )}

      <style>{`
        .admin-row {
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-sm);
          padding: 10px 12px;
        }
        .admin-row-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .admin-row-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .admin-row-meta {
          font-size: 10.5px;
          color: var(--text-muted);
        }
        .role-badge {
          font-size: 10.5px;
          font-weight: 700;
          padding: 6px 10px;
          border-radius: 999px;
          flex-shrink: 0;
        }
        .role-badge.owner {
          color: var(--gold-400);
          background: rgba(224, 184, 84, 0.14);
        }
        .role-badge.sub_admin {
          color: var(--text-secondary);
          background: var(--surface-2);
        }
        .remove-btn {
          font-size: 10.5px;
          font-weight: 700;
          color: var(--danger);
          padding: 6px 10px;
          border: 1px solid rgba(229, 99, 122, 0.3);
          border-radius: var(--radius-sm);
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}
