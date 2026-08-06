import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../api.js';

export default function ReferralRanksPage({ role }) {
  const isOwner = role === 'owner';

  const [ranks, setRanks] = useState([]);
  const [editing, setEditing] = useState(null); // level currently being edited, or null
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const [payoutPeriod, setPayoutPeriod] = useState('');
  const [running, setRunning] = useState(false);
  const [payouts, setPayouts] = useState([]);

  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    try {
      const [ranksRes, payoutsRes] = await Promise.all([
        api.admin.getReferralRanks(),
        api.admin.getReferralPayouts()
      ]);
      setRanks(ranksRes.ranks || []);
      setPayouts(payoutsRes.payouts || []);
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

  function startEdit(rank) {
    setEditing(rank.level);
    setEditForm({
      position: rank.position,
      teamSizeRequired: String(rank.team_size_required),
      teamDepositRequired: String(rank.team_deposit_required),
      monthlySalary: String(rank.monthly_salary)
    });
  }

  async function saveEdit(level) {
    setSaving(true);
    try {
      await api.admin.updateReferralRank(level, {
        position: editForm.position,
        teamSizeRequired: Number(editForm.teamSizeRequired),
        teamDepositRequired: Number(editForm.teamDepositRequired),
        monthlySalary: Number(editForm.monthlySalary)
      });
      setToast({ type: 'success', message: `Level ${level} updated` });
      setEditing(null);
      load();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(rank) {
    try {
      await api.admin.updateReferralRank(rank.level, { isActive: !rank.is_active });
      load();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
  }

  async function handleRunPayouts() {
    if (!confirm(
      payoutPeriod
        ? `Run salary payouts for ${payoutPeriod}? This pays every currently-qualifying user immediately.`
        : `Run salary payouts for the current month? This pays every currently-qualifying user immediately.`
    )) {
      return;
    }
    setRunning(true);
    try {
      const result = await api.admin.runReferralPayouts(payoutPeriod || undefined);
      setToast({
        type: 'success',
        message: result.count > 0 ? `Paid ${result.count} user(s)` : 'No new payouts - everyone qualifying was already paid for this period'
      });
      load();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="settings-page">
      <h1 className="page-title">Referral Program</h1>

      <section className="card">
        <h2 className="card-title">Rank ladder</h2>
        <p className="card-hint">
          Shown to users on their Referral Program page. Team size and deposit are both
          required to reach a level - a user needs both thresholds met.
        </p>
        <div className="rank-list">
          {ranks.map((r) => (
            <div key={r.level} className="rank-item">
              {editing === r.level ? (
                <div className="stacked-form">
                  <label className="field-label">Position title</label>
                  <input value={editForm.position} onChange={(e) => setEditForm({ ...editForm, position: e.target.value })} />
                  <label className="field-label">Team size required</label>
                  <input type="number" value={editForm.teamSizeRequired} onChange={(e) => setEditForm({ ...editForm, teamSizeRequired: e.target.value })} />
                  <label className="field-label">Team deposit required (ETB)</label>
                  <input type="number" value={editForm.teamDepositRequired} onChange={(e) => setEditForm({ ...editForm, teamDepositRequired: e.target.value })} />
                  <label className="field-label">Monthly salary (ETB)</label>
                  <input type="number" value={editForm.monthlySalary} onChange={(e) => setEditForm({ ...editForm, monthlySalary: e.target.value })} />
                  <div className="edit-actions">
                    <button className="primary-btn" onClick={() => saveEdit(r.level)} disabled={saving}>
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button className="ghost-btn-sm" onClick={() => setEditing(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="rank-item-head">
                    <span className="level-tag">L{r.level}</span>
                    <span className="rank-item-position">{r.position}</span>
                    {isOwner ? (
                      <button className={`toggle-btn ${r.is_active ? 'on' : 'off'}`} onClick={() => toggleActive(r)}>
                        {r.is_active ? 'Active' : 'Inactive'}
                      </button>
                    ) : (
                      <span className={`toggle-btn ${r.is_active ? 'on' : 'off'}`}>{r.is_active ? 'Active' : 'Inactive'}</span>
                    )}
                  </div>
                  <div className="rank-item-details">
                    <span>{r.team_size_required.toLocaleString()} members</span>
                    <span>ETB {r.team_deposit_required.toLocaleString()} deposit</span>
                    <span className="salary-highlight">ETB {r.monthly_salary.toLocaleString()}/mo</span>
                  </div>
                  {isOwner && (
                    <button className="ghost-btn-sm" onClick={() => startEdit(r)}>Edit</button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      {isOwner && (
        <section className="card">
          <h2 className="card-title">Run monthly payouts</h2>
          <p className="card-hint">
            Pays every currently-qualifying user their rank's monthly salary, straight into
            their balance. Safe to click more than once for the same month - already-paid
            users are automatically skipped, never double-paid.
          </p>
          <div className="stacked-form">
            <label className="field-label">Period (optional, defaults to current month)</label>
            <input placeholder="YYYY-MM, e.g. 2026-08" value={payoutPeriod} onChange={(e) => setPayoutPeriod(e.target.value)} />
            <button className="primary-btn" onClick={handleRunPayouts} disabled={running}>
              {running ? 'Running...' : 'Run payouts now'}
            </button>
          </div>
        </section>
      )}

      <section className="card">
        <h2 className="card-title">Recent payouts</h2>
        {payouts.length === 0 ? (
          <p className="card-hint">No payouts have been run yet.</p>
        ) : (
          <div className="mini-list">
            {payouts.map((p) => (
              <div key={p.id} className="mini-row">
                <span>
                  {p.users?.first_name || p.users?.telegram_username || 'User'} - L{p.rank_level} - {p.period}
                </span>
                <span className="salary-highlight">ETB {Number(p.amount).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
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
        .stacked-form {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .field-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          margin-bottom: -4px;
        }
        input, textarea, select {
          background: var(--surface-2);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-sm);
          padding: 11px 12px;
          color: var(--text-primary);
          font-size: 13px;
          font-family: inherit;
          width: 100%;
        }
        .primary-btn {
          background: linear-gradient(90deg, var(--gold-500), var(--gold-600));
          color: var(--ink-950);
          font-weight: 700;
          font-size: 13px;
          padding: 11px 16px;
          border-radius: var(--radius-sm);
        }
        .primary-btn:disabled {
          opacity: 0.6;
        }
        .ghost-btn-sm {
          align-self: flex-start;
          background: var(--surface-2);
          border: 1px solid var(--surface-border);
          color: var(--text-primary);
          font-size: 11.5px;
          font-weight: 600;
          padding: 7px 12px;
          border-radius: var(--radius-sm);
        }
        .edit-actions {
          display: flex;
          gap: 8px;
        }
        .rank-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .rank-item {
          background: var(--surface-2);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-sm);
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .rank-item-head {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .level-tag {
          font-size: 10.5px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 999px;
          background: rgba(224, 184, 84, 0.14);
          color: var(--gold-400);
        }
        .rank-item-position {
          flex: 1;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .rank-item-details {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          font-size: 11.5px;
          color: var(--text-secondary);
        }
        .salary-highlight {
          font-weight: 700;
          color: var(--gold-400);
        }
        .mini-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .mini-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12.5px;
          color: var(--text-secondary);
          padding: 8px 10px;
          background: var(--surface-2);
          border-radius: var(--radius-sm);
          gap: 10px;
        }
        .toggle-btn {
          font-size: 10.5px;
          font-weight: 700;
          padding: 5px 10px;
          border-radius: 999px;
        }
        .toggle-btn.on {
          color: var(--success);
          background: rgba(62, 207, 142, 0.14);
        }
        .toggle-btn.off {
          color: var(--text-muted);
          background: var(--surface-1);
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
