import React, { useState } from 'react';
import { api } from './api.js';

export default function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [referralCode, setReferralCode] = useState(
    () => new URLSearchParams(window.location.search).get('ref') || ''
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result =
        mode === 'login'
          ? await api.login({ phone, password })
          : await api.register({ phone, password, firstName, referralCode: referralCode || undefined });
      onAuthed(result.token, result.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <p className="auth-eyebrow">Welcome</p>
        <h1 className="auth-title">{mode === 'login' ? 'Log in' : 'Create your account'}</h1>

        <div className="mode-switch">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')} type="button">
            Log in
          </button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')} type="button">
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'register' && (
            <div className="field">
              <label>Name</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Your name" />
            </div>
          )}

          <div className="field">
            <label>Phone number</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+2519XXXXXXXX"
              type="tel"
              required
            />
          </div>

          <div className="field">
            <label>Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'register' ? 'At least 6 characters' : 'Your password'}
              type="password"
              required
            />
          </div>

          {mode === 'register' && (
            <div className="field">
              <label>Referral code (optional)</label>
              <input value={referralCode} onChange={(e) => setReferralCode(e.target.value)} placeholder="Optional" />
            </div>
          )}

          {error && <p className="auth-error">{error}</p>}

          <button className="submit-btn" type="submit" disabled={submitting}>
            {submitting ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>
      </div>

      <style>{`
        .auth-screen {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background:
            radial-gradient(120% 140% at 0% 0%, rgba(224, 184, 84, 0.12), transparent 55%),
            var(--surface-0);
        }
        .auth-card {
          width: 100%;
          max-width: 380px;
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-lg);
          padding: 28px 24px;
        }
        .auth-eyebrow {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--gold-400);
          margin-bottom: 6px;
        }
        .auth-title {
          font-family: var(--font-display);
          font-size: 22px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 20px;
        }
        .mode-switch {
          display: flex;
          background: var(--surface-2);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-sm);
          overflow: hidden;
          margin-bottom: 20px;
        }
        .mode-switch button {
          flex: 1;
          padding: 10px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-muted);
        }
        .mode-switch button.active {
          background: rgba(224, 184, 84, 0.14);
          color: var(--gold-400);
        }
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .field label {
          font-size: 11.5px;
          font-weight: 600;
          color: var(--text-muted);
        }
        .field input {
          background: var(--surface-2);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-sm);
          padding: 11px 12px;
          color: var(--text-primary);
          font-size: 14px;
        }
        .auth-error {
          font-size: 12.5px;
          color: var(--danger);
        }
        .submit-btn {
          margin-top: 4px;
          background: linear-gradient(135deg, var(--gold-500), var(--gold-600));
          color: var(--ink-950);
          font-weight: 700;
          font-size: 14px;
          padding: 13px;
          border-radius: var(--radius-sm);
        }
        .submit-btn:disabled {
          opacity: 0.6;
        }
      `}</style>
    </div>
  );
}
