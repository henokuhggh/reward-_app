import React, { useEffect, useState } from 'react';
import { api } from '../../api.js';

const EMPTY_FORM = {
  name: '',
  imageUrl: '',
  level: '',
  price: '',
  dailyPercent: '',
  durationDays: '',
  maxTotalPayoutMultiple: ''
};

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  function load() {
    api.admin
      .getProducts()
      .then(({ products }) => setProducts(products || []))
      .catch((err) => setError(err.message));
  }

  function startEdit(product) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      imageUrl: product.image_url || '',
      level: product.level,
      price: product.price,
      dailyPercent: product.daily_percent,
      durationDays: product.duration_days || '',
      maxTotalPayoutMultiple: product.max_total_payout_multiple
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.name || form.level === '' || !form.price || !form.dailyPercent) {
      setError('Name, level, price, and daily percent are required');
      return;
    }

    setSaving(true);
    const payload = {
      name: form.name,
      imageUrl: form.imageUrl || undefined,
      level: Number(form.level),
      price: Number(form.price),
      dailyPercent: Number(form.dailyPercent),
      durationDays: form.durationDays ? Number(form.durationDays) : undefined,
      maxTotalPayoutMultiple: form.maxTotalPayoutMultiple ? Number(form.maxTotalPayoutMultiple) : undefined
    };

    try {
      if (editingId) {
        await api.admin.updateProduct(editingId, payload);
      } else {
        await api.admin.createProduct(payload);
      }
      resetForm();
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(product) {
    try {
      await api.admin.updateProduct(product.id, { isActive: !product.is_active });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="products-page">
      <h1 className="page-title">Products</h1>

      <form className="product-form" onSubmit={handleSubmit}>
        <p className="form-title">{editingId ? 'Edit product' : 'Add product'}</p>
        {error && <p className="error-text">{error}</p>}

        <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input
          placeholder="Image URL"
          value={form.imageUrl}
          onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
        />
        <div className="form-row">
          <input
            placeholder="Level"
            type="number"
            value={form.level}
            onChange={(e) => setForm({ ...form, level: e.target.value })}
          />
          <input
            placeholder="Price (ETB)"
            type="number"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />
        </div>
        <div className="form-row">
          <input
            placeholder="Daily %"
            type="number"
            step="0.01"
            value={form.dailyPercent}
            onChange={(e) => setForm({ ...form, dailyPercent: e.target.value })}
          />
          <input
            placeholder="Duration days (optional)"
            type="number"
            value={form.durationDays}
            onChange={(e) => setForm({ ...form, durationDays: e.target.value })}
          />
        </div>
        <input
          placeholder="Max payout multiple (default 3.0)"
          type="number"
          step="0.1"
          value={form.maxTotalPayoutMultiple}
          onChange={(e) => setForm({ ...form, maxTotalPayoutMultiple: e.target.value })}
        />
        <p className="hint-text">
          Max payout multiple caps total lifetime payout at this multiple of price, so a product can
          never over-credit even if left running indefinitely.
        </p>

        <div className="form-actions">
          {editingId && (
            <button type="button" className="ghost-btn" onClick={resetForm}>
              Cancel
            </button>
          )}
          <button type="submit" className="primary-btn" disabled={saving}>
            {saving ? 'Saving...' : editingId ? 'Save changes' : 'Add product'}
          </button>
        </div>
      </form>

      <p className="section-title">All products</p>
      <div className="list">
        {products.map((p) => (
          <div key={p.id} className="product-row">
            <div className="product-row-info">
              <span className="product-row-name">
                L{p.level} - {p.name}
              </span>
              <span className="product-row-meta">
                {Number(p.price).toLocaleString()} ETB - {Number(p.daily_percent)}%/day
              </span>
            </div>
            <div className="product-row-actions">
              <button className={`toggle-btn ${p.is_active ? 'on' : 'off'}`} onClick={() => toggleActive(p)}>
                {p.is_active ? 'Active' : 'Inactive'}
              </button>
              <button className="edit-btn" onClick={() => startEdit(p)}>
                Edit
              </button>
            </div>
          </div>
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
        .product-form {
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-md);
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .form-title {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          color: var(--gold-400);
        }
        .form-row {
          display: flex;
          gap: 8px;
        }
        .product-form input {
          flex: 1;
          background: var(--surface-2);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-sm);
          padding: 10px 12px;
          font-size: 12.5px;
          color: var(--text-primary);
          outline: none;
        }
        .hint-text {
          font-size: 10.5px;
          color: var(--text-muted);
          line-height: 1.4;
        }
        .form-actions {
          display: flex;
          gap: 8px;
          margin-top: 4px;
        }
        .primary-btn {
          flex: 1;
          background: linear-gradient(90deg, var(--gold-500), var(--gold-600));
          color: var(--ink-950);
          font-weight: 700;
          font-size: 12.5px;
          padding: 11px;
          border-radius: var(--radius-sm);
        }
        .primary-btn:disabled {
          opacity: 0.6;
        }
        .ghost-btn {
          flex: 1;
          background: transparent;
          border: 1px solid var(--surface-border);
          color: var(--text-secondary);
          font-weight: 600;
          font-size: 12.5px;
          padding: 11px;
          border-radius: var(--radius-sm);
        }
        .error-text {
          font-size: 12px;
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
        .list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .product-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-sm);
          padding: 10px 12px;
        }
        .product-row-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .product-row-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .product-row-meta {
          font-size: 11px;
          color: var(--text-muted);
        }
        .product-row-actions {
          display: flex;
          gap: 6px;
          flex-shrink: 0;
        }
        .toggle-btn {
          font-size: 10.5px;
          font-weight: 700;
          padding: 6px 10px;
          border-radius: 999px;
        }
        .toggle-btn.on {
          color: var(--success);
          background: rgba(62, 207, 142, 0.14);
        }
        .toggle-btn.off {
          color: var(--text-muted);
          background: var(--surface-2);
        }
        .edit-btn {
          font-size: 11px;
          font-weight: 600;
          color: var(--gold-400);
          padding: 6px 10px;
          border: 1px solid rgba(224, 184, 84, 0.3);
          border-radius: var(--radius-sm);
        }
      `}</style>
    </div>
  );
}
