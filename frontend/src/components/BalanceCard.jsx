import React from 'react';

export default function BalanceCard({ balance }) {
  const formatted = Number(balance || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return (
    <div className="balance-card">
      <div className="foil-sweep" />
      <div className="card-top">
        <span className="eyebrow">Available balance</span>
        <ChipIcon />
      </div>
      <div className="amount-row">
        <span className="amount">{formatted}</span>
        <span className="currency">ETB</span>
      </div>

      <style>{`
        .balance-card {
          position: relative;
          overflow: hidden;
          border-radius: var(--radius-lg);
          padding: 22px 22px 20px;
          background:
            radial-gradient(120% 140% at 100% 0%, rgba(224, 184, 84, 0.16), transparent 55%),
            linear-gradient(155deg, var(--ink-800) 0%, var(--ink-950) 65%, var(--ink-900) 100%);
          border: 1px solid rgba(159, 176, 201, 0.18);
          box-shadow: 0 20px 40px -20px rgba(0, 0, 0, 0.6);
        }
        .foil-sweep {
          position: absolute;
          top: -60%;
          left: -20%;
          width: 160%;
          height: 220%;
          background: linear-gradient(
            115deg,
            transparent 40%,
            rgba(224, 184, 84, 0.12) 48%,
            rgba(240, 212, 146, 0.22) 50%,
            rgba(224, 184, 84, 0.12) 52%,
            transparent 60%
          );
          pointer-events: none;
        }
        .card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          position: relative;
        }
        .eyebrow {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.04em;
          color: var(--silver-500);
          text-transform: uppercase;
        }
        .amount-row {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-top: 18px;
          position: relative;
        }
        .amount {
          font-family: var(--font-display);
          font-size: 38px;
          font-weight: 700;
          letter-spacing: -0.01em;
          background: linear-gradient(90deg, var(--gold-400), var(--silver-300) 60%, var(--gold-500));
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .currency {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
}

function ChipIcon() {
  return (
    <svg width="30" height="22" viewBox="0 0 30 22" fill="none">
      <rect x="0.5" y="0.5" width="29" height="21" rx="4" fill="url(#chipGrad)" stroke="rgba(255,255,255,0.25)" />
      <line x1="10" y1="0.5" x2="10" y2="21.5" stroke="rgba(6,18,43,0.4)" />
      <line x1="20" y1="0.5" x2="20" y2="21.5" stroke="rgba(6,18,43,0.4)" />
      <line x1="0.5" y1="11" x2="29.5" y2="11" stroke="rgba(6,18,43,0.4)" />
      <defs>
        <linearGradient id="chipGrad" x1="0" y1="0" x2="30" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f0d492" />
          <stop offset="1" stopColor="#b8863a" />
        </linearGradient>
      </defs>
    </svg>
  );
}
