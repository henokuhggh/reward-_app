import React from 'react';

export default function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="spinner" />
      <style>{`
        .loading-screen {
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--surface-0);
        }
        .spinner {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 3px solid var(--surface-2);
          border-top-color: var(--gold-500);
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
