import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../api.js';

export default function ChannelsPage() {
  const [channels, setChannels] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const [form, setForm] = useState({
    channelUsername: '',
    channelTitle: '',
    sponsorBudget: '',
    rewardPerJoin: '2'
  });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [channelsRes, settingsRes] = await Promise.all([
        api.admin.getAllChannels(),
        api.admin.getSettings()
      ]);
      setChannels(channelsRes.campaigns);
      setSettings(settingsRes.settings);
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
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

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    try {
      await api.admin.createChannel(
        form.channelUsername,
        form.channelTitle,
        Number(form.sponsorBudget),
        Number(form.rewardPerJoin)
      );
      setToast({ type: 'success', message: 'Campaign created' });
      setForm({ channelUsername: '', channelTitle: '', sponsorBudget: '', rewardPerJoin: '2' });
      await load();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleActive(campaign) {
    try {
      await api.admin.setChannelActive(campaign.id, !campaign.is_active);
      await load();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
  }

  async function handleSetRequired(campaignId) {
    try {
      await api.admin.setRequiredChannel(campaignId || null);
      setToast({ type: 'success', message: 'Required referral channel updated' });
      await load();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
  }

  return (
    <div className="channels-page">
      <h1 className="page-title">Channels</h1>

      <section className="card">
        <h2 className="card-title">Required referral channel</h2>
        <p className="card-hint">
          A referrer only gets paid once their invitee verifies joining this channel.
        </p>
        <select
          value={settings?.required_campaign_id || ''}
          onChange={(e) => handleSetRequired(e.target.value)}
        >
          <option value="">None set</option>
          {channels.map((c) => (
            <option key={c.id} value={c.id}>
              {c.channel_title}
            </option>
          ))}
        </select>
      </section>

      <section className="card">
        <h2 className="card-title">New campaign</h2>
        <p className="card-hint">
          Add the bot as admin of the channel first, or verification will fail.
        </p>
        <form className="channel-form" onSubmit={handleCreate}>
          <input
            placeholder="Channel username (no @)"
            value={form.channelUsername}
            onChange={(e) => setForm({ ...form, channelUsername: e.target.value })}
            required
          />
          <input
            placeholder="Display title"
            value={form.channelTitle}
            onChange={(e) => setForm({ ...form, channelTitle: e.target.value })}
            required
          />
          <div className="form-row">
            <input
              type="number"
              placeholder="Sponsor budget (ETB)"
              value={form.sponsorBudget}
              onChange={(e) => setForm({ ...form, sponsorBudget: e.target.value })}
              required
            />
            <input
              type="number"
              placeholder="Reward/join (ETB)"
              value={form.rewardPerJoin}
              onChange={(e) => setForm({ ...form, rewardPerJoin: e.target.value })}
              required
            />
          </div>
          <button className="primary-btn" type="submit" disabled={creating}>
            {creating ? 'Creating…' : 'Create campaign'}
          </button>
        </form>
      </section>

      <section>
        <h2 className="section-title">All campaigns</h2>
        {loading && <p className="muted">Loading…</p>}
        <div className="channel-list">
          {channels.map((c) => (
            <div className="channel-row" key={c.id}>
              <div>
                <p className="channel-name">{c.channel_title}</p>
                <p className="channel-meta">
                  {c.current_joins}/{c.max_joins} joins &middot; {c.reward_per_join} ETB each
                  {settings?.required_campaign_id === c.id && (
                    <span className="required-tag"> &middot; Required</span>
                  )}
                </p>
              </div>
              <button
                className={`toggle-btn ${c.is_active ? 'active' : ''}`}
                onClick={() => handleToggleActive(c)}
              >
                {c.is_active ? 'Active' : 'Inactive'}
              </button>
            </div>
          ))}
        </div>
      </section>

      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}

      <style>{`
        .channels-page {
          display: flex;
          flex-direction: column;
          gap: 20px;
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
          gap: 10px;
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
        select, input {
          background: var(--surface-2);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-sm);
          padding: 11px 12px;
          color: var(--text-primary);
          font-size: 13.5px;
          width: 100%;
        }
        .channel-form {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .primary-btn {
          background: linear-gradient(90deg, var(--gold-500), var(--gold-600));
          color: var(--ink-950);
          font-weight: 700;
          font-size: 13.5px;
          padding: 12px;
          border-radius: var(--radius-sm);
        }
        .primary-btn:disabled {
          opacity: 0.6;
        }
        .section-title {
          font-family: var(--font-display);
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 10px;
        }
        .muted {
          font-size: 13px;
          color: var(--text-secondary);
        }
        .channel-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .channel-row {
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-md);
          padding: 12px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .channel-name {
          font-size: 13.5px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .channel-meta {
          font-size: 11px;
          color: var(--text-secondary);
          margin-top: 2px;
        }
        .required-tag {
          color: var(--gold-400);
          font-weight: 600;
        }
        .toggle-btn {
          font-size: 11.5px;
          font-weight: 700;
          padding: 7px 12px;
          border-radius: 999px;
          background: rgba(159, 176, 201, 0.12);
          color: var(--text-muted);
          white-space: nowrap;
        }
        .toggle-btn.active {
          background: rgba(62, 207, 142, 0.15);
          color: var(--success);
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
