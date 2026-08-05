import React, { useEffect, useState } from 'react';
import { api } from '../../api.js';

export default function BingoPage() {
  const [stats, setStats] = useState(null);
  const [stakes, setStakes] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, []);

  function load() {
    api.admin.getBingoStats().then(setStats).catch((err) => setError(err.message));
    api.admin
      .getBingoStakes()
      .then(({ stakes }) => setStakes(stakes || []))
      .catch((err) => setError(err.message));
    api.admin
      .getBingoRounds()
      .then(({ rounds }) => setRounds(rounds || []))
      .catch((err) => setError(err.message));
  }

  return (
    <div className="bingo-page">
      <h1 className="page-title">Bingo</h1>
      {error && <p className="error-text">{error}</p>}

      {stats && (
        <div className="stats-grid">
          <StatCard label="Platform earnings" value={`${Number(stats.totalPlatformEarnings).toLocaleString()} Birr`} />
          <StatCard label="Total wagered" value={`${Number(stats.totalWagered).toLocaleString()} Birr`} />
          <StatCard label="Rounds finished" value={stats.totalRoundsFinished} />
          <StatCard label="Live rounds" value={stats.totalRoundsLive} />
        </div>
      )}

      <StakeTiersSection stakes={stakes} onChange={load} />

      <p className="section-title">Recent rounds</p>
      <div className="list">
        {rounds.map((r) => (
          <RoundRow key={r.id} round={r} onChange={load} />
        ))}
        {rounds.length === 0 && <p className="muted-text">No rounds yet.</p>}
      </div>

      <style>{`
        .bingo-page {
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

function StakeTiersSection({ stakes, onChange }) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    if (!amount || Number(amount) <= 0) {
      setError('Enter a valid amount');
      return;
    }
    setSaving(true);
    try {
      await api.admin.createBingoStake({ amount: Number(amount), sortOrder: stakes.length });
      setAmount('');
      onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(stake) {
    try {
      await api.admin.updateBingoStake(stake.id, { isActive: !stake.is_active });
      onChange();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="stake-section">
      <p className="section-title">Stake tiers</p>

      <form className="stake-form" onSubmit={handleAdd}>
        {error && <p className="error-text">{error}</p>}
        <input
          placeholder="Amount (Birr)"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <button type="submit" className="primary-btn" disabled={saving}>
          {saving ? 'Adding...' : 'Add tier'}
        </button>
      </form>

      <div className="list">
        {stakes.map((s) => (
          <div key={s.id} className="stake-row">
            <span className="stake-row-amount">{Number(s.amount).toLocaleString()} Birr</span>
            <button className={`toggle-btn ${s.is_active ? 'on' : 'off'}`} onClick={() => toggleActive(s)}>
              {s.is_active ? 'Active' : 'Inactive'}
            </button>
          </div>
        ))}
        {stakes.length === 0 && <p className="muted-text">No stake tiers yet.</p>}
      </div>

      <style>{`
        .stake-section {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .stake-form {
          display: flex;
          gap: 8px;
        }
        .stake-form input {
          flex: 1;
          background: var(--surface-2);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-sm);
          padding: 10px 12px;
          font-size: 12.5px;
          color: var(--text-primary);
          outline: none;
        }
        .primary-btn {
          background: linear-gradient(90deg, var(--gold-500), var(--gold-600));
          color: var(--ink-950);
          font-weight: 700;
          font-size: 12.5px;
          padding: 0 16px;
          border-radius: var(--radius-sm);
        }
        .primary-btn:disabled {
          opacity: 0.6;
        }
        .error-text {
          font-size: 12px;
          color: var(--danger);
        }
        .muted-text {
          font-size: 12.5px;
          color: var(--text-muted);
        }
        .list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .stake-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-sm);
          padding: 10px 12px;
        }
        .stake-row-amount {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
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
      `}</style>
    </div>
  );
}

function RoundRow({ round, onChange }) {
  const [busy, setBusy] = useState(false);
  const canCancel = round.status === 'waiting' || round.status === 'active';

  async function handleCancel() {
    setBusy(true);
    try {
      await api.admin.cancelBingoRound(round.id);
      onChange();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="round-row">
      <div className="round-row-info">
        <span className="round-row-title">
          {Number(round.stake_amount).toLocaleString()} Birr - {round.status}
        </span>
        <span className="round-row-meta">
          Pool {Number(round.total_pool).toLocaleString()} - Cut {Number(round.platform_cut).toLocaleString()} - Prize{' '}
          {Number(round.prize_pool).toLocaleString()}
          {round.win_pattern ? ` - won by ${round.win_pattern}` : ''}
        </span>
      </div>
      {canCancel && (
        <button className="cancel-btn" onClick={handleCancel} disabled={busy}>
          {busy ? '...' : 'Cancel & refund'}
        </button>
      )}

      <style>{`
        .round-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-sm);
          padding: 10px 12px;
        }
        .round-row-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .round-row-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          text-transform: capitalize;
        }
        .round-row-meta {
          font-size: 10.5px;
          color: var(--text-muted);
        }
        .cancel-btn {
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
