import React, { useEffect, useState } from 'react';
import { api } from '../../api.js';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, []);

  function load() {
    api.admin
      .getProducts()
      .then(({ products }) => setProducts(products || []))
      .catch((err) => setError(err.message));
    api.admin.getProductStats().then(setStats).catch(() => {});
  }

  return (
    <div className="products-page">
      <h1 className="page-title">Products</h1>
      {error && <p className="error-text">{error}</p>}

      {stats && (
        <div className="stats-grid">
          <StatCard label="Total invested" value={`${Number(stats.totalInvested).toLocaleString()} ETB`} />
          <StatCard label="Total paid out" value={`${Number(stats.totalPaidOut).toLocaleString()} ETB`} />
          <StatCard label="Active purchases" value={stats.activePurchases} />
        </div>
      )}

      <ProductForm onChange={load} />

      <p className="section-title">All products</p>
      <div className="list">
        {products.map((p) => (
          <ProductRow key={p.id} product={p} onChange={load} />
        ))}
        {products.length === 0 && <p className="muted-text">No products yet.</p>}
      </div>

      <style>{`
        .products-page {
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
        .muted-text {
          font-size: 12.5px;
          color: var(--text-muted);
        }
        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .stats-grid > :first-child {
          grid-column: span 2;
        }
        .section-title {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.03em;
          text-transform: uppercase;
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

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>

      <style>{`
        .stat-card {
          display: flex;
          flex-direction: column;
          gap: 4px;
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-md);
          padding: 12px;
        }
        .stat-value {
          font-family: var(--font-display);
          font-size: 16px;
          font-weight: 700;
          color: var(--gold-400);
        }
        .stat-label {
          font-size: 10.5px;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}

function ProductForm({ onChange }) {
  const [form, setForm] = useState({
    name: '',
    imageUrl: '',
    level: '',
    price: '',
    dailyPercent: '',
    durationDays: '',
    maxTotalPayoutMultiple: '3'
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.name || form.level === '' || !form.price || !form.dailyPercent) {
      setError('Name, level, price, and daily percent are required');
      return;
    }

    setSaving(true);
    try {
      await api.admin.createProduct({
        name: form.name,
        imageUrl: form.imageUrl || undefined,
        level: Number(form.level),
        price: Number(form.price),
        dailyPercent: Number(form.dailyPercent),
        durationDays: form.durationDays ? Number(form.durationDays) : undefined,
        maxTotalPayoutMultiple: form.maxTotalPayoutMultiple ? Number(form.maxTotalPayoutMultiple) : undefined
      });
      setForm({ name: '', imageUrl: '', level: '', price: '', dailyPercent: '', durationDays: '', maxTotalPayoutMultiple: '3' });
      onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="product-form" onSubmit={handleSubmit}>
      <p className="section-title">Add product</p>
      {error && <p className="error-text">{error}</p>}

      <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <input placeholder="Image URL" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />

      <div className="form-row">
        <input type="number" placeholder="Level" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} />
        <input type="number" placeholder="Price (ETB)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
      </div>

      <div className="form-row">
        <input
          type="number"
          step="0.1"
          placeholder="Daily % return"
          value={form.dailyPercent}
          onChange={(e) => setForm({ ...form, dailyPercent: e.target.value })}
        />
        <input
          type="number"
          placeholder="Duration (days, optional)"
          value={form.durationDays}
          onChange={(e) => setForm({ ...form, durationDays: e.target.value })}
        />
      </div>

      <label className="field-label">Max total payout (multiple of price)</label>
      <input
        type="number"
        step="0.1"
        placeholder="3"
        value={form.maxTotalPayoutMultiple}
        onChange={(e) => setForm({ ...form, maxTotalPayoutMultiple: e.target.value })}
      />
      <p className="card-hint">
        Caps total daily-return payouts at this multiple of the price - so this product will never over-credit
        a buyer beyond {form.maxTotalPayoutMultiple || 3}x what they paid.
      </p>

      <button className="primary-btn" type="submit" disabled={saving}>
        {saving ? 'Adding...' : 'Add product'}
      </button>

      <style>{`
        .product-form {
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
        .form-row {
          display: flex;
          gap: 8px;
        }
        .form-row input {
          flex: 1;
        }
        .field-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          margin-top: 4px;
        }
        .card-hint {
          font-size: 11px;
          color: var(--text-secondary);
          line-height: 1.4;
        }
        input {
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

function ProductRow({ product, onChange }) {
  const [busy, setBusy] = useState(false);

  async function toggleActive() {
    setBusy(true);
    try {
      await api.admin.updateProduct(product.id, { isActive: !product.is_active });
      onChange();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="product-row">
      {product.image_url && <img src={product.image_url} alt={product.name} className="product-thumb" />}
      <div className="product-row-info">
        <span className="product-row-title">{product.name}</span>
        <span className="product-row-meta">
          {Number(product.price).toLocaleString()} ETB - {product.daily_percent}%/day
          {product.duration_days ? ` - ${product.duration_days}d` : ''} - cap {product.max_total_payout_multiple}x
        </span>
      </div>
      <button className={`toggle-btn ${product.is_active ? 'on' : 'off'}`} onClick={toggleActive} disabled={busy}>
        {product.is_active ? 'Active' : 'Inactive'}
      </button>

      <style>{`
        .product-row {
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-sm);
          padding: 10px 12px;
        }
        .product-thumb {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-sm);
          object-fit: cover;
          flex-shrink: 0;
        }
        .product-row-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .product-row-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .product-row-meta {
          font-size: 10.5px;
          color: var(--text-muted);
        }
        .toggle-btn {
          font-size: 10.5px;
          font-weight: 700;
          padding: 6px 10px;
          border-radius: 999px;
          flex-shrink: 0;
        }
        .toggle-btn.on {
          color: var(--success);
          background: rgba(62, 207, 142, 0.14);
        }
        .toggle-btn.off {
          color: var(--text-muted);
          background: var(--surface-2);
        }
      `}</style>
    </div>
  );
}
