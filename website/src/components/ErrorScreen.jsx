import React from 'react';

export default function ErrorScreen({ message }) {
  return (
    <div className="error-screen">
      <p className="title">Couldn't load the app</p>
      <p className="detail">{message}</p>
      <button className="retry" onClick={() => window.location.reload()}>
        Try again
      </button>

      <style>{`
        .error-screen {
          height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 24px;
          text-align: center;
          background: var(--surface-0);
        }
        .title {
          font-family: var(--font-display);
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .detail {
          font-size: 14px;
          color: var(--text-secondary);
          max-width: 280px;
        }
        .retry {
          margin-top: 8px;
          padding: 10px 20px;
          border-radius: var(--radius-sm);
          background: var(--surface-2);
          color: var(--text-primary);
          font-weight: 600;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}
