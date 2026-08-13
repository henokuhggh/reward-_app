import React, { useEffect, useState } from 'react';
import { api } from '../../api.js';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    load();
    api.admin.getProducts().then(({ products }) => setProducts(products || [])).catch(() => {});
  }, []);

  function load() {
    api.admin
      .getUsers()
      .then(({ users }) => setUsers(users || []))
      .catch((err) => setError(err.message));
  }

  const filtered = search.trim()
    ? users.filter((u) => {
        const q = search.trim().toLowerCase();
        return (
          (u.phone || '').toLowerCase().includes(q) ||
          (u.first_name || '').toLowerCase().includes(q) ||
          (u.telegram_username || '').toLowerCase().includes(q)
        );
      })
    : users;

  return (
    <div className="users-page">
      <h1 className="page-title">Users</h1>
      {error && <p className="error-text">{error}</p>}

      <ByPhoneActions products={products} onChange={load} />

      <input
        className="search-input"
        placeholder="Search by phone, name, or username"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <p className="section-title">All users ({filtered.length})</p>
      <div className="list">
        {filtered.map((u) => (
          <UserRow key={u.id} user={u} onChange={load} />
        ))}
        {filtered.length === 0 && <p className="muted-text">No users found.</p>}
      </div>

      <style>{`
        .users-page {
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
          font-size: 12.5px;
          color: var(--danger);
        }
        .muted-text {
          font-size: 12.5px;
          color: var(--text-muted);
        }
        .section-title {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .search-input {
          background: var(--surface-2);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-sm);
          padding: 10px 12px;
          font-size: 12.5px;
          color: var(--text-primary);
          outline: none;
          width: 100%;
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

// Actions that operate by phone number directly, without needing to
// find the user in the list first - ban/unban, remove, gift a
// product, and adjust bonus/balance all work this way per the
// owner's request.
function ByPhoneActions({ products, onChange }) {
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [productId, setProductId] = useState('');
  const [bonusDelta, setBonusDelta] = useState('');

  async function run(action, fn) {
    setError('');
    setMessage('');
    if (!phone) {
      setError('Enter a phone number first');
      return;
    }
    setBusy(true);
    try {
      await fn();
      setMessage(`${action} succeeded`);
      onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    if (!window.confirm(`Permanently remove the user with phone ${phone}? This cannot be undone.`)) return;
    run('Remove', () => api.admin.removeUserByPhone(phone));
  }

  return (
    <div className="by-phone-card">
      <p className="section-title">Manage by phone number</p>
      {error && <p className="error-text">{error}</p>}
      {message && <p className="success-text">{message}</p>}

      <input placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} />

      <div className="btn-row">
        <button className="ghost-btn" disabled={busy} onClick={() => run('Ban', () => api.admin.banUser(phone, true))}>
          Ban
        </button>
        <button className="ghost-btn" disabled={busy} onClick={() => run('Unban', () => api.admin.banUser(phone, false))}>
          Unban
        </button>
        <button className="danger-btn" disabled={busy} onClick={handleRemove}>
          Remove user
        </button>
      </div>

      <div className="sub-block">
        <span className="sub-label">Gift a product</span>
        <div className="btn-row">
          <select value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">Select product...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button
            className="ghost-btn"
            disabled={busy || !productId}
            onClick={() => run('Gift product', () => api.admin.giftProduct(phone, productId))}
          >
            Gift
          </button>
        </div>
      </div>

      <div className="sub-block">
        <span className="sub-label">Adjust balance / bonus (ETB)</span>
        <div className="btn-row">
          <input
            className="delta-input"
            placeholder="e.g. 50 or -50"
            value={bonusDelta}
            onChange={(e) => setBonusDelta(e.target.value)}
          />
          <button
            className="ghost-btn"
            disabled={busy || !bonusDelta}
            onClick={() => run('Adjust balance', () => api.admin.adjustUserBonus(phone, Number(bonusDelta)))}
          >
            Apply
          </button>
        </div>
      </div>

      <style>{`
        .by-phone-card {
          display: flex;
          flex-direction: column;
          gap: 10px;
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
        .success-text {
          font-size: 12px;
          color: var(--success);
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
        .btn-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .btn-row select {
          flex: 1;
          min-width: 140px;
        }
        .delta-input {
          flex: 1;
        }
        .ghost-btn {
          font-size: 12px;
          font-weight: 700;
          padding: 9px 14px;
          border-radius: var(--radius-sm);
          background: rgba(224, 184, 84, 0.12);
          border: 1px solid rgba(224, 184, 84, 0.3);
          color: var(--gold-400);
          flex-shrink: 0;
        }
        .ghost-btn:disabled {
          opacity: 0.5;
        }
        .danger-btn {
          font-size: 12px;
          font-weight: 700;
          padding: 9px 14px;
          border-radius: var(--radius-sm);
          background: transparent;
          border: 1px solid rgba(229, 99, 122, 0.3);
          color: var(--danger);
          flex-shrink: 0;
        }
        .sub-block {
          display: flex;
          flex-direction: column;
          gap: 6px;
          border-top: 1px solid var(--surface-border);
          padding-top: 10px;
        }
        .sub-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
}

function UserRow({ user, onChange }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function toggleEarning() {
    setBusy(true);
    setError('');
    try {
      await api.admin.setUserEarningPaused(user.id, !user.earning_paused);
      onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function resetPurchases() {
    if (!window.confirm(`Remove ALL products owned by ${user.first_name || user.phone || 'this user'}? This cannot be undone.`)) return;
    setBusy(true);
    setError('');
    try {
      await api.admin.resetUserPurchases(user.id);
      onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="user-row">
      <div className="user-row-top">
        <div className="user-info">
          <span className="user-name">{user.first_name || user.telegram_username || user.phone || 'User'}</span>
          <span className="user-meta">
            {user.phone || (user.telegram_username ? `@${user.telegram_username}` : user.telegram_id || '—')}
          </span>
        </div>
        <div className="badges">
          {user.is_banned && <span className="badge danger">Banned</span>}
          {user.earning_paused && <span className="badge muted">Earning paused</span>}
          <span className={`badge ${user.has_deposited ? 'good' : 'muted'}`}>
            {user.has_deposited ? 'Active' : 'New'}
          </span>
        </div>
      </div>

      <div className="user-row-stats">
        <span>Balance: <strong>{Number(user.balance).toLocaleString()} ETB</strong></span>
        <span>Deposited: {Number(user.total_deposited || 0).toLocaleString()} ETB</span>
        <span>Invited: {user.invited_count}</span>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="user-row-actions">
        <button className="mini-btn" disabled={busy} onClick={toggleEarning}>
          {user.earning_paused ? 'Resume earning' : 'Stop earning'}
        </button>
        <button className="mini-btn" disabled={busy} onClick={resetPurchases}>
          Reset purchases
        </button>
      </div>

      <style>{`
        .user-row {
          display: flex;
          flex-direction: column;
          gap: 8px;
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-sm);
          padding: 12px;
        }
        .user-row-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
        }
        .user-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .user-name {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .user-meta {
          font-size: 10.5px;
          color: var(--text-muted);
        }
        .badges {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .badge {
          font-size: 9.5px;
          font-weight: 700;
          padding: 3px 7px;
          border-radius: 999px;
          white-space: nowrap;
        }
        .badge.danger {
          color: var(--danger);
          background: rgba(229, 99, 122, 0.14);
        }
        .badge.good {
          color: var(--success);
          background: rgba(80, 200, 120, 0.14);
        }
        .badge.muted {
          color: var(--text-muted);
          background: var(--surface-2);
        }
        .user-row-stats {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          font-size: 11px;
          color: var(--text-secondary);
        }
        .error-text {
          font-size: 11px;
          color: var(--danger);
        }
        .user-row-actions {
          display: flex;
          gap: 8px;
        }
        .mini-btn {
          font-size: 11px;
          font-weight: 700;
          padding: 7px 12px;
          border-radius: var(--radius-sm);
          background: var(--surface-2);
          border: 1px solid var(--surface-border);
          color: var(--text-secondary);
        }
        .mini-btn:disabled {
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
}
