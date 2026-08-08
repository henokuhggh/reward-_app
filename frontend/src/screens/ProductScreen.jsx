import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

// Daily returns are stored as a percent rate, but users think in
// birr, not percentages - showing "8%" next to a 1000 ETB product
// means doing mental math to see it's 80 birr/day. Convert once here
// so every display spot shows the actual money amount instead.
function dailyBirr(price, dailyPercent) {
  return (Number(price) * Number(dailyPercent)) / 100;
}

export default function ProductScreen({ user, onBalanceChange }) {
  const [mode, setMode] = useState('browse'); // 'browse' | 'owned'

  return (
    <div className="product-screen">
      <p className="screen-title">Products</p>

      <div className="mode-toggle">
        <button className={mode === 'browse' ? 'active' : ''} onClick={() => setMode('browse')}>
          Browse
        </button>
        <button className={mode === 'owned' ? 'active' : ''} onClick={() => setMode('owned')}>
          My purchases
        </button>
      </div>

      {mode === 'browse' ? (
        <BrowseProducts user={user} onBalanceChange={onBalanceChange} />
      ) : (
        <MyPurchases />
      )}

      <style>{`
        .product-screen {
          padding: 20px 16px 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .screen-title {
          font-family: var(--font-display);
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .mode-toggle {
          display: flex;
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-md);
          padding: 4px;
        }
        .mode-toggle button {
          flex: 1;
          padding: 9px;
          font-size: 12.5px;
          font-weight: 700;
          color: var(--text-muted);
          border-radius: var(--radius-sm);
        }
        .mode-toggle button.active {
          background: rgba(224, 184, 84, 0.12);
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
      `}</style>
    </div>
  );
}

function BrowseProducts({ user, onBalanceChange }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(null);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    api
      .getProducts()
      .then(({ products }) => setProducts(products || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const availableFunds = Number(user?.balance || 0) + Number(user?.signup_bonus || 0);

  async function handleConfirmPurchase() {
    if (!confirming) return;
    setBuying(true);
    setError('');
    try {
      await api.purchaseProduct(confirming.id);
      await onBalanceChange?.();
      setConfirming(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBuying(false);
    }
  }

  if (loading) return <p className="muted-text">Loading products...</p>;

  return (
    <>
      {error && <p className="error-text">{error}</p>}

      {products.length === 0 ? (
        <p className="muted-text">No products available right now.</p>
      ) : (
        <div className="product-grid">
          {products.map((p) => {
            const canAfford = availableFunds >= Number(p.price);
            return (
              <div key={p.id} className="product-card">
                {p.image_url && <img src={p.image_url} alt={p.name} className="product-image" />}
                <div className="product-info">
                  <p className="product-name">{p.name}</p>
                  <p className="product-price">{Number(p.price).toLocaleString()} ETB</p>
                  <p className="product-return">
                    {dailyBirr(p.price, p.daily_percent).toLocaleString()} ETB / day
                    {p.duration_days ? ` for ${p.duration_days} days` : ''}
                  </p>
                  <p className="product-cap">Up to {p.max_total_payout_multiple}x total return</p>
                </div>
                <button
                  className="buy-btn"
                  disabled={!canAfford}
                  onClick={() => setConfirming(p)}
                >
                  {canAfford ? 'Buy' : 'Insufficient funds'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {confirming && (
        <div className="sheet-backdrop" onClick={() => !buying && setConfirming(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <p className="sheet-title">Confirm purchase</p>
            <p className="sheet-body">
              Buy <strong>{confirming.name}</strong> for <strong>{Number(confirming.price).toLocaleString()} ETB</strong>?
              You'll earn {dailyBirr(confirming.price, confirming.daily_percent).toLocaleString()} ETB daily
              {confirming.duration_days ? ` for ${confirming.duration_days} days` : ''}, up to{' '}
              {confirming.max_total_payout_multiple}x your purchase price total.
            </p>
            <div className="sheet-actions">
              <button className="ghost-btn" onClick={() => setConfirming(null)} disabled={buying}>
                Cancel
              </button>
              <button className="primary-btn" onClick={handleConfirmPurchase} disabled={buying}>
                {buying ? 'Buying...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .product-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .product-card {
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-lg);
          padding: 14px;
        }
        .product-image {
          width: 100%;
          height: 140px;
          object-fit: cover;
          border-radius: var(--radius-md);
        }
        .product-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .product-name {
          font-size: 14.5px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .product-price {
          font-family: var(--font-display);
          font-size: 18px;
          font-weight: 700;
          color: var(--gold-400);
        }
        .product-return {
          font-size: 12px;
          color: var(--success);
          font-weight: 600;
        }
        .product-cap {
          font-size: 11px;
          color: var(--text-muted);
        }
        .buy-btn {
          background: linear-gradient(90deg, var(--gold-500), var(--gold-600));
          color: var(--ink-950);
          font-weight: 700;
          font-size: 13.5px;
          padding: 12px;
          border-radius: var(--radius-sm);
        }
        .buy-btn:disabled {
          opacity: 0.5;
          background: var(--surface-2);
          color: var(--text-muted);
        }
        .sheet-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(5, 10, 24, 0.7);
          display: flex;
          align-items: flex-end;
          z-index: 40;
        }
        .sheet {
          width: 100%;
          background: var(--surface-1);
          border-top: 1px solid var(--surface-border);
          border-radius: 20px 20px 0 0;
          padding: 22px 18px calc(22px + env(safe-area-inset-bottom));
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .sheet-title {
          font-family: var(--font-display);
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .sheet-body {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.5;
        }
        .sheet-actions {
          display: flex;
          gap: 10px;
          margin-top: 4px;
        }
        .ghost-btn, .primary-btn {
          flex: 1;
          padding: 12px;
          font-weight: 700;
          font-size: 13.5px;
          border-radius: var(--radius-sm);
        }
        .ghost-btn {
          background: var(--surface-2);
          color: var(--text-secondary);
          border: 1px solid var(--surface-border);
        }
        .primary-btn {
          background: linear-gradient(90deg, var(--gold-500), var(--gold-600));
          color: var(--ink-950);
        }
        .ghost-btn:disabled, .primary-btn:disabled {
          opacity: 0.6;
        }
      `}</style>
    </>
  );
}

function MyPurchases() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getMyPurchases()
      .then(({ purchases }) => setPurchases(purchases || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="muted-text">Loading your purchases...</p>;
  if (error) return <p className="error-text">{error}</p>;
  if (purchases.length === 0) return <p className="muted-text">You haven't bought any products yet.</p>;

  return (
    <div className="purchase-list">
      {purchases.map((p) => {
        const progress = Math.min(100, (Number(p.total_credited) / Number(p.max_total_payout)) * 100);
        return (
          <div key={p.id} className="purchase-card">
            <div className="purchase-top">
              <span className="purchase-name">{p.products?.name || 'Product'}</span>
              <span className={`purchase-status ${p.is_active ? 'active' : 'done'}`}>
                {p.is_active ? 'Earning' : 'Completed'}
              </span>
            </div>
            <div className="purchase-progress-track">
              <div className="purchase-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="purchase-meta">
              <span>{Number(p.total_credited).toLocaleString()} / {Number(p.max_total_payout).toLocaleString()} ETB earned</span>
              <span>{dailyBirr(p.price_paid, p.daily_percent).toLocaleString()} ETB/day</span>
            </div>
          </div>
        );
      })}

      <style>{`
        .purchase-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .purchase-card {
          display: flex;
          flex-direction: column;
          gap: 8px;
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-md);
          padding: 14px;
        }
        .purchase-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .purchase-name {
          font-size: 13.5px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .purchase-status {
          font-size: 10.5px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 999px;
        }
        .purchase-status.active {
          color: var(--success);
          background: rgba(62, 207, 142, 0.14);
        }
        .purchase-status.done {
          color: var(--text-muted);
          background: var(--surface-2);
        }
        .purchase-progress-track {
          height: 6px;
          background: var(--surface-2);
          border-radius: 999px;
          overflow: hidden;
        }
        .purchase-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--gold-500), var(--gold-600));
          border-radius: 999px;
        }
        .purchase-meta {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
