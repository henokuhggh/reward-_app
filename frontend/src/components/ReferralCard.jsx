import React, { useState } from 'react';

export default function ReferralCard({ user }) {
  const [copied, setCopied] = useState(false);

  const link = user?.referral_link;

  function handleCopy() {
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleShare() {
    if (!link) return;
    const shareText = `Join and start investing - use my link:`;
    // Telegram's native share sheet for mini apps
    window.Telegram?.WebApp?.openTelegramLink(
      `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareText)}`
    );
  }

  return (
    <div className="referral-card">
      <div className="referral-header">
        <p className="note-title">Invite friends</p>
        <span className="referral-count">{user?.active_invited ?? 0} active</span>
      </div>
      <p className="note-body">
        Share your link below. You earn 10 Birr as soon as someone you invite joins.
      </p>

      {link ? (
        <>
          <div className="link-box">
            <span className="link-text">{link}</span>
          </div>
          <div className="referral-actions">
            <button className="ghost-btn" onClick={handleCopy}>
              {copied ? 'Copied' : 'Copy link'}
            </button>
            <button className="primary-btn" onClick={handleShare}>
              Share
            </button>
          </div>
        </>
      ) : (
        <p className="note-body muted">Your link is being set up, check back shortly.</p>
      )}

      <style>{`
        .referral-card {
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-md);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .referral-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .note-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .referral-count {
          font-size: 11.5px;
          font-weight: 700;
          color: var(--gold-400);
          background: rgba(224, 184, 84, 0.12);
          padding: 3px 9px;
          border-radius: 999px;
        }
        .note-body {
          font-size: 12.5px;
          color: var(--text-secondary);
          line-height: 1.5;
        }
        .note-body.muted {
          color: var(--text-muted);
        }
        .link-box {
          background: var(--surface-2);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-sm);
          padding: 10px 12px;
          overflow: hidden;
        }
        .link-text {
          font-family: var(--font-mono);
          font-size: 11.5px;
          color: var(--silver-300);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: block;
        }
        .referral-actions {
          display: flex;
          gap: 8px;
        }
        .ghost-btn {
          flex: 1;
          background: transparent;
          border: 1px solid var(--surface-border);
          color: var(--text-secondary);
          font-size: 12.5px;
          font-weight: 600;
          padding: 10px;
          border-radius: var(--radius-sm);
          text-align: center;
        }
        .primary-btn {
          flex: 1;
          background: linear-gradient(90deg, var(--gold-500), var(--gold-600));
          color: var(--ink-950);
          font-weight: 700;
          font-size: 12.5px;
          padding: 10px;
          border-radius: var(--radius-sm);
          text-align: center;
        }
      `}</style>
    </div>
  );
}
