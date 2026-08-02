import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function ProductScreen({ user, onBalanceChange }) {
  const [products, setProducts] = useState([]);
  const [myPurchases, setMyPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [purchasingId, setPurchasingId] = useState(null);
  const [confirmProduct, setConfirmProduct] = useState(null);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [{ products }, { purchases }] = await Promise.all([api.getProducts(), api.getMyPurchases()]);
      setProducts(products || []);
      setMyPurchases(purchases || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePurchase(product) {
    setPurchasingId(product.id);
    setError('');
    try {
      await api.purchaseProduct(product.id);
      setConfirmProduct(null);
      await Promise.all([loadAll(), onBalanceChange?.()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setPurchasingId(null);
    }
  }

  const availableFunds = Number(user?.balance || 0) + Number(user?.signup_bonus || 0);
  const activePurchases = myPurchases.filter((p) => p.status === 'active');

  return (
    <div className="product-screen">
      <p className="screen-title">Products</p>
      <p className="screen-subtitle">Buy a product to start earning a daily return.</p>

      {error && <p className="error-text">{error}</p>}

      {activePurchases.length > 0 && (
        <div className="owned-section">
          <p className="section-label">Your active products</p>
          <div className="owned-list">
            {activePurchases.map((p) => (
              <OwnedCard key={p.id} purchase={p} />
            ))}
          </div>
        </div>
      )}

      <p className="section-label">Available levels</p>

      {loading ? (
        <p className="muted-text">Loading products...</p>
      ) : products.length === 0 ? (
        <p className="muted-text">No products available right now.</p>
      ) : (
        <div className="product-list">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              canAfford={availableFunds >= Number(product.price)}
              onSelect={() => setConfirmProduct(product)}
            />
          ))}
        </div>
      )}

      {confirmProduct && (
        <ConfirmSheet
          product={confirmProduct}
          busy={purchasingId === confirmProduct.id}
          onCancel={() => setConfirmProduct(null)}
          onConfirm={() => handlePurchase(confirmProduct)}
        />
      )}

      <style>{`
        .product-screen {
          padding: 20px 16px 24px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .screen-title {
          font-family: var(--font-display);
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .screen-subtitle {
          font-size: 12.5px;
          color: var(--text-secondary);
          margin-top: -8px;
        }
        .error-text {
          font-size: 12.5px;
          color: var(--danger);
        }
        .muted-text {
          font-size: 12.5px;
          color: var(--text-muted);
        }
        .section-label {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-top: 6px;
        }
        .owned-section, .product-list, .owned-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
      `}</style>
    </div>
  );
}

function ProductCard({ product, canAfford, onSelect }) {
  return (
    <button className="product-card" onClick={onSelect} disabled={!canAfford}>
      <div className="product-image">
        {product.image_url ? <img src={product.image_url} alt={product.name} /> : <span className="level-tag">L{product.level}</span>}
      </div>
      <div className="product-info">
        <div className="product-top-row">
          <span className="product-name">{product.name}</span>
          <span className="product-level">Level {product.level}</span>
        </div>
        <div className="product-stats">
          <span className="stat-value">{Number(product.price).toLocaleString()} ETB</span>
          <span className="stat-sep">•</span>
          <span className="stat-daily">{Number(product.daily_percent)}% / day</span>
        </div>
        {!canAfford && <span className="insufficient-note">Insufficient funds</span>}
      </div>

      <style>{`
        .product-card {
          display: flex;
          align-items: center;
          gap: 12px;
          text-align: left;
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-md);
          padding: 12px;
        }
        .product-card:disabled {
          opacity: 0.55;
        }
        .product-image {
          width: 52px;
          height: 52px;
          border-radius: var(--radius-sm);
          background: var(--surface-2);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
        }
        .product-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .level-tag {
          font-family: var(--font-mono);
          font-size: 13px;
          color: var(--gold-400);
          font-weight: 700;
        }
        .product-info {
          flex: 1;
          min-width: 0;
        }
        .product-top-row {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 8px;
        }
        .product-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .product-level {
          font-size: 10.5px;
          color: var(--text-muted);
          flex-shrink: 0;
        }
        .product-stats {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 4px;
        }
        .stat-value {
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .stat-sep {
          color: var(--text-muted);
          font-size: 11px;
        }
        .stat-daily {
          font-size: 12.5px;
          font-weight: 700;
          color: var(--success);
        }
        .insufficient-note {
          display: block;
          font-size: 11px;
          color: var(--danger);
          margin-top: 4px;
        }
      `}</style>
    </button>
  );
}

function OwnedCard({ purchase }) {
  const product = purchase.products || {};
  return (
    <div className="owned-card">
      <div className="owned-info">
        <span className="owned-name">{product.name || 'Product'}</span>
        <span className="owned-meta">
          Cycle {purchase.cycles_paid} • {Number(purchase.total_paid_out).toLocaleString()} ETB earned so far
        </span>
      </div>
      <span className="owned-badge">Active</span>

      <style>{`
        .owned-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-md);
          padding: 12px 14px;
        }
        .owned-info {
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 0;
        }
        .owned-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .owned-meta {
          font-size: 11px;
          color: var(--text-muted);
        }
        .owned-badge {
          font-size: 10.5px;
          font-weight: 700;
          color: var(--success);
          background: rgba(62, 207, 142, 0.14);
          padding: 3px 9px;
          border-radius: 999px;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}

function ConfirmSheet({ product, busy, onCancel, onConfirm }) {
  return (
    <div className="sheet-backdrop" onClick={onCancel}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <p className="sheet-title">Confirm purchase</p>
        <p className="sheet-body">
          Buy <strong>{product.name}</strong> for{' '}
          <strong>{Number(product.price).toLocaleString()} ETB</strong>. This product pays{' '}
          <strong>{Number(product.daily_percent)}%</strong> daily.
        </p>
        <div className="sheet-actions">
          <button className="ghost-btn" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button className="primary-btn" onClick={onConfirm} disabled={busy}>
            {busy ? 'Processing...' : 'Confirm purchase'}
          </button>
        </div>
      </div>

      <style>{`
        .sheet-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(6, 13, 31, 0.7);
          display: flex;
          align-items: flex-end;
          z-index: 20;
        }
        .sheet {
          width: 100%;
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          border-radius: 20px 20px 0 0;
          padding: 20px 18px calc(20px + env(safe-area-inset-bottom));
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .sheet-title {
          font-family: var(--font-display);
          font-size: 17px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .sheet-body {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.6;
        }
        .sheet-actions {
          display: flex;
          gap: 10px;
          margin-top: 6px;
        }
        .ghost-btn {
          flex: 1;
          background: transparent;
          border: 1px solid var(--surface-border);
          color: var(--text-secondary);
          font-size: 13px;
          font-weight: 600;
          padding: 12px;
          border-radius: var(--radius-sm);
        }
        .primary-btn {
          flex: 1;
          background: linear-gradient(90deg, var(--gold-500), var(--gold-600));
          color: var(--ink-950);
          font-weight: 700;
          font-size: 13px;
          padding: 12px;
          border-radius: var(--radius-sm);
        }
        .primary-btn:disabled, .ghost-btn:disabled {
          opacity: 0.6;
        }
      `}</style>
    </div>
  );
}
