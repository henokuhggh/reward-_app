import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api.js';
import BalanceCard from '../components/BalanceCard.jsx';

// Set this to your actual AdsGram block ID once you register at
// https://adsgram.ai - each rewarded ad placement gets its own ID.
const ADSGRAM_BLOCK_ID = import.meta.env.VITE_ADSGRAM_BLOCK_ID || 'YOUR_BLOCK_ID';

export default function EarnScreen({ user, onBalanceChange }) {
  const [channels, setChannels] = useState([]);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [watchingAd, setWatchingAd] = useState(false);
  const [toast, setToast] = useState(null);

  const loadChannels = useCallback(async () => {
    setLoadingChannels(true);
    try {
      const { campaigns } = await api.getChannels();
      setChannels(campaigns);
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setLoadingChannels(false);
    }
  }, []);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  async function handleWatchAd() {
    if (!window.Adsgram) {
      setToast({ type: 'error', message: 'Ad service unavailable right now, try again shortly' });
      return;
    }

    setWatchingAd(true);
    try {
      const AdController = window.Adsgram.init({ blockId: ADSGRAM_BLOCK_ID });
      await AdController.show(); // resolves only if the ad was watched to completion
      const { reward } = await api.rewardAdView(ADSGRAM_BLOCK_ID);
      setToast({ type: 'success', message: `+${reward} ETB credited` });
      await onBalanceChange();
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Ad was not completed' });
    } finally {
      setWatchingAd(false);
    }
  }

  async function handleJoinChannel(campaign) {
    // Open the channel first so the user can actually join it
    const url = `https://t.me/${campaign.channel_username}`;
    window.Telegram?.WebApp?.openTelegramLink(url);
  }

  async function handleVerify(campaign) {
    setBusyId(campaign.id);
    try {
      const { reward } = await api.verifyChannelJoin(campaign.id);
      setToast({ type: 'success', message: `+${reward} ETB credited` });
      await onBalanceChange();
      await loadChannels();
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="earn-screen">
      <BalanceCard balance={user?.balance} />

      <section className="section">
        <h2 className="section-title">Watch an ad</h2>
        <div className="ad-card">
          <div>
            <p className="ad-title">Rewarded video</p>
            <p className="ad-sub">Watch to completion to earn</p>
          </div>
          <button className="primary-btn" onClick={handleWatchAd} disabled={watchingAd}>
            {watchingAd ? 'Loading…' : 'Watch'}
          </button>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Join channels</h2>

        {loadingChannels && <p className="muted">Loading tasks…</p>}
        {!loadingChannels && channels.length === 0 && (
          <p className="muted">No channel tasks available right now. Check back later.</p>
        )}

        <div className="channel-list">
          {channels.map((c) => (
            <div className="channel-card" key={c.id}>
              <div className="channel-info">
                <p className="channel-name">{c.channel_title}</p>
                <p className="channel-meta">
                  {c.reward_per_join} ETB &middot; {c.spots_remaining} spots left
                </p>
              </div>
              <div className="channel-actions">
                <button className="ghost-btn" onClick={() => handleJoinChannel(c)}>
                  Open
                </button>
                <button
                  className="primary-btn small"
                  onClick={() => handleVerify(c)}
                  disabled={busyId === c.id}
                >
                  {busyId === c.id ? 'Checking…' : 'I joined'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}

      <style>{`
        .earn-screen {
          padding: 20px 18px 12px;
          display: flex;
          flex-direction: column;
          gap: 22px;
        }
        .section-title {
          font-family: var(--font-display);
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 10px;
        }
        .ad-card {
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-md);
          padding: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .ad-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .ad-sub {
          font-size: 12px;
          color: var(--text-secondary);
          margin-top: 2px;
        }
        .muted {
          font-size: 13px;
          color: var(--text-secondary);
        }
        .channel-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .channel-card {
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-md);
          padding: 14px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .channel-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .channel-meta {
          font-size: 11.5px;
          color: var(--text-secondary);
          margin-top: 2px;
        }
        .channel-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }
        .primary-btn {
          background: linear-gradient(90deg, var(--gold-500), var(--gold-600));
          color: var(--ink-950);
          font-weight: 700;
          font-size: 13px;
          padding: 10px 18px;
          border-radius: var(--radius-sm);
          white-space: nowrap;
        }
        .primary-btn.small {
          padding: 8px 14px;
          font-size: 12.5px;
        }
        .primary-btn:disabled {
          opacity: 0.6;
        }
        .ghost-btn {
          background: transparent;
          border: 1px solid var(--surface-border);
          color: var(--text-secondary);
          font-size: 12.5px;
          font-weight: 600;
          padding: 8px 14px;
          border-radius: var(--radius-sm);
        }
        .toast {
          position: fixed;
          bottom: 96px;
          left: 18px;
          right: 18px;
          padding: 12px 16px;
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 600;
          text-align: center;
          z-index: 20;
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
