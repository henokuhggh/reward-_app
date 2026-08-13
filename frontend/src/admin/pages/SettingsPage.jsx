import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../api.js';

export default function SettingsPage({ role }) {
  const isOwner = role === 'owner';

  const [methods, setMethods] = useState([]);
  const [methodForm, setMethodForm] = useState({ name: '', logoUrl: '', accountName: '', accountNumber: '', instructions: '' });
  const [savingMethod, setSavingMethod] = useState(false);

  const [links, setLinks] = useState([]);
  const [linkForm, setLinkForm] = useState({ label: '', url: '', kind: 'channel' });
  const [savingLink, setSavingLink] = useState(false);

  const [bonusAmount, setBonusAmount] = useState('');
  const [bonusLabel, setBonusLabel] = useState('');
  const [releasingBonus, setReleasingBonus] = useState(false);

  const [broadcastText, setBroadcastText] = useState('');
  const [broadcastImage, setBroadcastImage] = useState('');
  const [sending, setSending] = useState(false);

  const [minWithdrawal, setMinWithdrawal] = useState('');
  const [withdrawalFeePercent, setWithdrawalFeePercent] = useState('');
  const [savingWithdrawalSettings, setSavingWithdrawalSettings] = useState(false);

  const [signupBonusAmount, setSignupBonusAmount] = useState('');
  const [savingSignupBonus, setSavingSignupBonus] = useState(false);

  const [earningPausedGlobally, setEarningPausedGlobally] = useState(false);
  const [togglingEarning, setTogglingEarning] = useState(false);

  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    try {
      const [methodsRes, linksRes, settingsRes] = await Promise.all([
        api.admin.getPaymentMethods(),
        api.admin.getLinks(),
        api.admin.getSettings()
      ]);
      setMethods(methodsRes.methods || []);
      setLinks(linksRes.links || []);
      setMinWithdrawal(String(settingsRes.settings?.min_withdrawal ?? 200));
      setWithdrawalFeePercent(String(settingsRes.settings?.withdrawal_fee_percent ?? 10));
      setSignupBonusAmount(String(settingsRes.settings?.signup_bonus_amount ?? 0));
      setEarningPausedGlobally(Boolean(settingsRes.settings?.earning_paused_globally));
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

  async function handleAddMethod(e) {
    e.preventDefault();
    if (!methodForm.name || !methodForm.accountName || !methodForm.accountNumber) {
      setToast({ type: 'error', message: 'Name, account name, and account number are required' });
      return;
    }
    setSavingMethod(true);
    try {
      await api.admin.createPaymentMethod(methodForm);
      setMethodForm({ name: '', logoUrl: '', accountName: '', accountNumber: '', instructions: '' });
      setToast({ type: 'success', message: 'Payment method added' });
      load();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setSavingMethod(false);
    }
  }

  async function toggleMethod(method) {
    try {
      await api.admin.updatePaymentMethod(method.id, { isActive: !method.is_active });
      load();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
  }

  async function handleAddLink(e) {
    e.preventDefault();
    if (!linkForm.label || !linkForm.url) {
      setToast({ type: 'error', message: 'Label and URL are required' });
      return;
    }
    setSavingLink(true);
    try {
      await api.admin.createLink(linkForm);
      setLinkForm({ label: '', url: '', kind: 'channel' });
      setToast({ type: 'success', message: 'Link added' });
      load();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setSavingLink(false);
    }
  }

  async function toggleLink(link) {
    try {
      await api.admin.updateLink(link.id, { isActive: !link.is_active });
      load();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
  }

  async function handleReleaseBonus(e) {
    e.preventDefault();
    if (!bonusAmount || Number(bonusAmount) <= 0) {
      setToast({ type: 'error', message: 'Enter a valid bonus amount' });
      return;
    }
    setReleasingBonus(true);
    try {
      await api.admin.releaseBonus(Number(bonusAmount), bonusLabel || undefined);
      setToast({ type: 'success', message: 'Bonus released - users can now claim it' });
      setBonusAmount('');
      setBonusLabel('');
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setReleasingBonus(false);
    }
  }

  async function handleUpdateWithdrawalSettings(e) {
    e.preventDefault();
    if (!minWithdrawal || Number(minWithdrawal) <= 0) {
      setToast({ type: 'error', message: 'Enter a valid minimum withdrawal' });
      return;
    }
    if (withdrawalFeePercent === '' || Number(withdrawalFeePercent) < 0 || Number(withdrawalFeePercent) > 100) {
      setToast({ type: 'error', message: 'Fee percent must be between 0 and 100' });
      return;
    }
    setSavingWithdrawalSettings(true);
    try {
      await api.admin.updateSettings({
        minWithdrawal: Number(minWithdrawal),
        withdrawalFeePercent: Number(withdrawalFeePercent)
      });
      setToast({ type: 'success', message: 'Withdrawal settings updated' });
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setSavingWithdrawalSettings(false);
    }
  }

  async function handleUpdateSignupBonus(e) {
    e.preventDefault();
    if (signupBonusAmount === '' || Number(signupBonusAmount) < 0) {
      setToast({ type: 'error', message: 'Enter a valid signup bonus amount' });
      return;
    }
    setSavingSignupBonus(true);
    try {
      await api.admin.updateSettings({ signupBonusAmount: Number(signupBonusAmount) });
      setToast({ type: 'success', message: 'Signup bonus updated - applies to new registrations' });
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setSavingSignupBonus(false);
    }
  }

  async function toggleGlobalEarning() {
    setTogglingEarning(true);
    try {
      await api.admin.setGlobalEarningPaused(!earningPausedGlobally);
      setEarningPausedGlobally(!earningPausedGlobally);
      setToast({
        type: 'success',
        message: !earningPausedGlobally ? 'Daily earning paused for all users' : 'Daily earning resumed for all users'
      });
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setTogglingEarning(false);
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
      setToast({ type: 'success', message: `Sent to ${result.successCount}/${result.recipientCount} users` });
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
        <h2 className="card-title">Payment methods</h2>
        <p className="card-hint">Shown to users in step 2 of the deposit flow.</p>
        {isOwner ? (
          <form className="stacked-form" onSubmit={handleAddMethod}>
            <input placeholder="Name (e.g. CBE, Telebirr)" value={methodForm.name} onChange={(e) => setMethodForm({ ...methodForm, name: e.target.value })} />
            <input placeholder="Logo URL" value={methodForm.logoUrl} onChange={(e) => setMethodForm({ ...methodForm, logoUrl: e.target.value })} />
            <input placeholder="Account name" value={methodForm.accountName} onChange={(e) => setMethodForm({ ...methodForm, accountName: e.target.value })} />
            <input placeholder="Account number" value={methodForm.accountNumber} onChange={(e) => setMethodForm({ ...methodForm, accountNumber: e.target.value })} />
            <input placeholder="Instructions (optional)" value={methodForm.instructions} onChange={(e) => setMethodForm({ ...methodForm, instructions: e.target.value })} />
            <button className="primary-btn" type="submit" disabled={savingMethod}>
              {savingMethod ? 'Saving...' : 'Add payment method'}
            </button>
          </form>
        ) : (
          <p className="card-hint">Only the owner admin can add or change payment methods.</p>
        )}
        <div className="mini-list">
          {methods.map((m) => (
            <div key={m.id} className="mini-row">
              <span>{m.name}</span>
              {isOwner ? (
                <button className={`toggle-btn ${m.is_active ? 'on' : 'off'}`} onClick={() => toggleMethod(m)}>
                  {m.is_active ? 'Active' : 'Inactive'}
                </button>
              ) : (
                <span className={`toggle-btn ${m.is_active ? 'on' : 'off'}`}>{m.is_active ? 'Active' : 'Inactive'}</span>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">Withdrawal rules</h2>
        <p className="card-hint">Applies to every withdrawal request going forward.</p>
        <form className="stacked-form" onSubmit={handleUpdateWithdrawalSettings}>
          <label className="field-label">Minimum withdrawal (ETB)</label>
          <input
            type="number"
            placeholder="200"
            value={minWithdrawal}
            onChange={(e) => setMinWithdrawal(e.target.value)}
          />
          <label className="field-label">Transaction fee (%)</label>
          <input
            type="number"
            step="0.1"
            placeholder="10"
            value={withdrawalFeePercent}
            onChange={(e) => setWithdrawalFeePercent(e.target.value)}
          />
          <p className="card-hint">
            Example: a {withdrawalFeePercent || 10}% fee on a 200 ETB withdrawal means the user
            receives {Math.round(200 * (1 - Number(withdrawalFeePercent || 10) / 100))} ETB and the
            platform keeps {Math.round(200 * (Number(withdrawalFeePercent || 10) / 100))} ETB.
          </p>
          <button className="primary-btn" type="submit" disabled={savingWithdrawalSettings}>
            {savingWithdrawalSettings ? 'Saving...' : 'Save withdrawal rules'}
          </button>
        </form>
      </section>

      <section className="card">
        <h2 className="card-title">Signup bonus</h2>
        <p className="card-hint">
          Amount every NEW user receives into their balance on registration. Doesn't change existing users'
          balances — use the "Adjust balance / bonus" action on the Users page for that.
        </p>
        <form className="stacked-form" onSubmit={handleUpdateSignupBonus}>
          <label className="field-label">Signup bonus (ETB)</label>
          <input
            type="number"
            placeholder="0"
            value={signupBonusAmount}
            onChange={(e) => setSignupBonusAmount(e.target.value)}
          />
          <button className="primary-btn" type="submit" disabled={savingSignupBonus}>
            {savingSignupBonus ? 'Saving...' : 'Save signup bonus'}
          </button>
        </form>
      </section>

      <section className="card">
        <h2 className="card-title">Daily product earning</h2>
        <p className="card-hint">
          {earningPausedGlobally
            ? 'Daily product earning is currently PAUSED for every user platform-wide.'
            : 'Daily product earning is currently running normally for all users.'}
        </p>
        <button
          className={`primary-btn ${earningPausedGlobally ? 'resume' : 'pause'}`}
          onClick={toggleGlobalEarning}
          disabled={togglingEarning}
        >
          {togglingEarning ? 'Saving...' : earningPausedGlobally ? 'Resume earning for everyone' : 'Pause earning for everyone'}
        </button>
        <p className="card-hint">To stop earning for just one user instead, use the Users page.</p>
      </section>

      <section className="card">
        <h2 className="card-title">Channels, groups &amp; support</h2>
        <p className="card-hint">Shown on the user's Profile page.</p>
        <form className="stacked-form" onSubmit={handleAddLink}>
          <input placeholder="Label (e.g. Join our Telegram Channel)" value={linkForm.label} onChange={(e) => setLinkForm({ ...linkForm, label: e.target.value })} />
          <input placeholder="URL" value={linkForm.url} onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })} />
          <select value={linkForm.kind} onChange={(e) => setLinkForm({ ...linkForm, kind: e.target.value })}>
            <option value="channel">Channel</option>
            <option value="group">Group</option>
            <option value="support">Support</option>
          </select>
          <button className="primary-btn" type="submit" disabled={savingLink}>
            {savingLink ? 'Saving...' : 'Add link'}
          </button>
        </form>
        <div className="mini-list">
          {links.map((l) => (
            <div key={l.id} className="mini-row">
              <span>{l.label}</span>
              <button className={`toggle-btn ${l.is_active ? 'on' : 'off'}`} onClick={() => toggleLink(l)}>
                {l.is_active ? 'Active' : 'Inactive'}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">Release daily bonus</h2>
        <p className="card-hint">Every user can claim this once from their Profile page.</p>
        <form className="stacked-form" onSubmit={handleReleaseBonus}>
          <input type="number" placeholder="Amount (ETB)" value={bonusAmount} onChange={(e) => setBonusAmount(e.target.value)} />
          <input placeholder="Label (optional)" value={bonusLabel} onChange={(e) => setBonusLabel(e.target.value)} />
          <button className="primary-btn" type="submit" disabled={releasingBonus}>
            {releasingBonus ? 'Releasing...' : 'Release bonus'}
          </button>
        </form>
      </section>

      <section className="card">
        <h2 className="card-title">Broadcast to all users</h2>
        <p className="card-hint">
          Sends a Telegram message to every non-banned user. Large user counts send in batches, so this
          may take a moment.
        </p>
        <form className="stacked-form" onSubmit={handleBroadcast}>
          <textarea placeholder="Message text" rows={4} value={broadcastText} onChange={(e) => setBroadcastText(e.target.value)} />
          <input placeholder="Image URL (optional)" value={broadcastImage} onChange={(e) => setBroadcastImage(e.target.value)} />
          <button className="primary-btn" type="submit" disabled={sending}>
            {sending ? 'Sending...' : 'Send broadcast'}
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
          resize: vertical;
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
        .primary-btn.pause {
          background: linear-gradient(90deg, #e5637a, #c94a60);
          color: #fff;
        }
        .primary-btn.resume {
          background: linear-gradient(90deg, var(--success), #2fa86e);
          color: #06122b;
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
