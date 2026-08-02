import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

function CopyButton({ value }) {
  const [copied, setCopied] = useState(false);

  function handleCopy(e) {
    e.stopPropagation();
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <button type="button" className={`copy-btn ${copied ? 'copied' : ''}`} onClick={handleCopy}>
      {copied ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M5 12.5l4.5 4.5L19 7" stroke="#3ecf8e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <rect x="8.5" y="8.5" width="11" height="11" rx="2" stroke="#f0d492" strokeWidth="1.8" />
          <path d="M15.5 8.5V6.5a2 2 0 00-2-2H6.5a2 2 0 00-2 2v7a2 2 0 002 2h2" stroke="#f0d492" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )}
      <span>{copied ? 'Copied' : 'Copy'}</span>
    </button>
  );
}

export default function WalletScreen({ user, onBalanceChange }) {
  const [mode, setMode] = useState('deposit'); // 'deposit' | 'withdraw'

  return (
    <div className="wallet-screen">
      <p className="screen-title">Wallet</p>

      <div className="mode-toggle">
        <button className={mode === 'deposit' ? 'active' : ''} onClick={() => setMode('deposit')}>
          Deposit
        </button>
        <button className={mode === 'withdraw' ? 'active' : ''} onClick={() => setMode('withdraw')}>
          Withdraw
        </button>
      </div>

      {mode === 'deposit' ? (
        <DepositFlow onBalanceChange={onBalanceChange} />
      ) : (
        <WithdrawFlow user={user} onBalanceChange={onBalanceChange} />
      )}

      <style>{`
        .wallet-screen {
          padding: 20px 16px 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .screen-title {
          font-family: var(--font-display);
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .mode-toggle {
          display: flex;
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-md);
          padding: 4px;
        }
        .mode-toggle button {
          flex: 1;
          padding: 10px;
          font-size: 13px;
          font-weight: 700;
          color: var(--text-muted);
          border-radius: var(--radius-sm);
        }
        .mode-toggle button.active {
          background: linear-gradient(90deg, var(--gold-500), var(--gold-600));
          color: var(--ink-950);
        }
      `}</style>
    </div>
  );
}

// ============================================================
// DEPOSIT: 3-step flow
// Step 1: enter amount
// Step 2: pick a payment method (bank/wallet), see account details
// Step 3: paste the transaction reference and submit for review
// ============================================================
function DepositFlow({ onBalanceChange }) {
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState('');
  const [methods, setMethods] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    api.getMyDeposits().then(({ deposits }) => setHistory(deposits || [])).catch(() => {});
  }, [submitted]);

  async function goToStep2() {
    setError('');
    const numAmount = Number(amount);
    if (!numAmount || numAmount < 1000) {
      setError('Minimum deposit is 1000 birr');
      return;
    }
    setLoading(true);
    try {
      const { methods } = await api.getPaymentMethods();
      setMethods(methods || []);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function selectMethod(method) {
    setSelectedMethod(method);
    setStep(3);
  }

  async function submitDeposit() {
    setError('');
    if (!reference.trim()) {
      setError('Enter the transaction reference from your payment');
      return;
    }
    setLoading(true);
    try {
      await api.submitDeposit(Number(amount), selectedMethod.id, reference.trim());
      setSubmitted(true);
      setStep(1);
      setAmount('');
      setSelectedMethod(null);
      setReference('');
      onBalanceChange?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flow">
      {error && <p className="error-text">{error}</p>}
      {submitted && step === 1 && (
        <p className="success-text">Deposit submitted. It will be reviewed shortly.</p>
      )}

      {step === 1 && (
        <div className="step-card">
          <p className="step-label">Step 1 of 3 - Amount</p>
          <div className="amount-input-row">
            <span className="currency-prefix">ETB</span>
            <input
              type="number"
              inputMode="decimal"
              placeholder="1000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <p className="hint-text">Minimum deposit is 1,000 birr. No maximum.</p>
          <button className="primary-btn" onClick={goToStep2} disabled={loading}>
            {loading ? 'Loading...' : 'Continue'}
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="step-card">
          <p className="step-label">Step 2 of 3 - Choose payment method</p>
          <div className="method-list">
            {methods.length === 0 && <p className="hint-text">No payment methods available right now.</p>}
            {methods.map((m) => (
              <button key={m.id} className="method-row" onClick={() => selectMethod(m)}>
                <div className="method-logo">
                  {m.logo_url ? <img src={m.logo_url} alt={m.name} /> : <span>{m.name[0]}</span>}
                </div>
                <span className="method-name">{m.name}</span>
              </button>
            ))}
          </div>
          <button className="ghost-btn" onClick={() => setStep(1)}>
            Back
          </button>
        </div>
      )}

      {step === 3 && selectedMethod && (
        <div className="step-card">
          <p className="step-label">Step 3 of 3 - Pay and confirm</p>
          <div className="account-box">
            <div className="account-row">
              <span className="account-label">Send to</span>
              <div className="account-value-group">
                <span className="account-value">{selectedMethod.account_name}</span>
                <CopyButton value={selectedMethod.account_name} />
              </div>
            </div>
            <div className="account-row">
              <span className="account-label">Account / number</span>
              <div className="account-value-group">
                <span className="account-value mono">{selectedMethod.account_number}</span>
                <CopyButton value={selectedMethod.account_number} />
              </div>
            </div>
            <div className="account-row">
              <span className="account-label">Amount</span>
              <span className="account-value">{Number(amount).toLocaleString()} ETB</span>
            </div>
            {selectedMethod.instructions && (
              <p className="instructions-text">{selectedMethod.instructions}</p>
            )}
          </div>
          <p className="hint-text">
            After sending the money, paste the transaction reference you received below.
          </p>
          <input
            className="text-input"
            placeholder="Transaction reference"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
          <div className="two-btn-row">
            <button className="ghost-btn" onClick={() => setStep(2)} disabled={loading}>
              Back
            </button>
            <button className="primary-btn" onClick={submitDeposit} disabled={loading}>
              {loading ? 'Submitting...' : 'Submit for review'}
            </button>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="history-section">
          <p className="section-label">Deposit history</p>
          {history.map((d) => (
            <HistoryRow
              key={d.id}
              amount={d.amount}
              status={d.status}
              date={d.requested_at}
              subtitle={d.payment_methods?.name}
            />
          ))}
        </div>
      )}

      <style>{flowStyles}</style>
    </div>
  );
}

// ============================================================
// WITHDRAW
// ============================================================
function WithdrawFlow({ user, onBalanceChange }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  const [accountDetails, setAccountDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    api.getMyWithdrawals().then(({ withdrawals }) => setHistory(withdrawals || [])).catch(() => {});
  }, [submitted]);

  async function submit() {
    setError('');
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (!method.trim() || !accountDetails.trim()) {
      setError('Enter a withdrawal method and account details');
      return;
    }
    setLoading(true);
    try {
      await api.requestWithdrawal(numAmount, method.trim(), accountDetails.trim());
      setSubmitted(true);
      setAmount('');
      setMethod('');
      setAccountDetails('');
      onBalanceChange?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!user?.has_deposited) {
    return (
      <div className="flow">
        <div className="locked-card">
          <p className="locked-title">Withdrawals are locked</p>
          <p className="locked-body">
            You need to make at least one approved deposit before you can withdraw. Switch to the
            Deposit tab to get started.
          </p>
        </div>
        <style>{flowStyles}</style>
      </div>
    );
  }

  return (
    <div className="flow">
      {error && <p className="error-text">{error}</p>}
      {submitted && <p className="success-text">Withdrawal request submitted for review.</p>}

      <div className="step-card">
        <p className="step-label">Request withdrawal</p>
        <p className="hint-text">Available balance: {Number(user.balance).toLocaleString()} ETB</p>
        <div className="amount-input-row">
          <span className="currency-prefix">ETB</span>
          <input
            type="number"
            inputMode="decimal"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <input
          className="text-input"
          placeholder="Withdrawal method (e.g. Telebirr, CBE)"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
        />
        <input
          className="text-input"
          placeholder="Account name / number"
          value={accountDetails}
          onChange={(e) => setAccountDetails(e.target.value)}
        />
        <button className="primary-btn" onClick={submit} disabled={loading}>
          {loading ? 'Submitting...' : 'Submit request'}
        </button>
      </div>

      {history.length > 0 && (
        <div className="history-section">
          <p className="section-label">Withdrawal history</p>
          {history.map((w) => (
            <HistoryRow key={w.id} amount={w.amount} status={w.status} date={w.requested_at} subtitle={w.method} />
          ))}
        </div>
      )}

      <style>{flowStyles}</style>
    </div>
  );
}

function HistoryRow({ amount, status, date, subtitle }) {
  return (
    <div className="history-row">
      <div className="history-info">
        <span className="history-amount">{Number(amount).toLocaleString()} ETB</span>
        {subtitle && <span className="history-subtitle">{subtitle}</span>}
        <span className="history-date">{new Date(date).toLocaleDateString()}</span>
      </div>
      <span className={`status-pill ${status}`}>{status}</span>

      <style>{`
        .history-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-sm);
          padding: 10px 12px;
        }
        .history-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .history-amount {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .history-subtitle {
          font-size: 11px;
          color: var(--text-muted);
        }
        .history-date {
          font-size: 10.5px;
          color: var(--text-muted);
        }
        .status-pill {
          font-size: 10.5px;
          font-weight: 700;
          padding: 3px 9px;
          border-radius: 999px;
          text-transform: capitalize;
        }
        .status-pill.pending {
          color: var(--gold-400);
          background: rgba(224, 184, 84, 0.14);
        }
        .status-pill.approved {
          color: var(--success);
          background: rgba(62, 207, 142, 0.14);
        }
        .status-pill.rejected {
          color: var(--danger);
          background: rgba(224, 90, 90, 0.14);
        }
      `}</style>
    </div>
  );
}

const flowStyles = `
  .flow {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .error-text {
    font-size: 12.5px;
    color: var(--danger);
  }
  .success-text {
    font-size: 12.5px;
    color: var(--success);
  }
  .step-card {
    background: var(--surface-1);
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-md);
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .step-label {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: var(--gold-400);
  }
  .amount-input-row {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--surface-2);
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-sm);
    padding: 10px 12px;
  }
  .currency-prefix {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-muted);
  }
  .amount-input-row input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
  }
  .text-input {
    background: var(--surface-2);
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-sm);
    padding: 12px;
    font-size: 13px;
    color: var(--text-primary);
    outline: none;
  }
  .hint-text {
    font-size: 11.5px;
    color: var(--text-muted);
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
  .ghost-btn {
    background: transparent;
    border: 1px solid var(--surface-border);
    color: var(--text-secondary);
    font-weight: 600;
    font-size: 13px;
    padding: 12px;
    border-radius: var(--radius-sm);
  }
  .two-btn-row {
    display: flex;
    gap: 10px;
  }
  .two-btn-row .ghost-btn, .two-btn-row .primary-btn {
    flex: 1;
  }
  .method-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .method-row {
    display: flex;
    align-items: center;
    gap: 12px;
    background: var(--surface-2);
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-sm);
    padding: 12px;
    text-align: left;
  }
  .method-logo {
    width: 36px;
    height: 36px;
    border-radius: 999px;
    background: var(--surface-1);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    flex-shrink: 0;
    font-weight: 700;
    color: var(--gold-400);
  }
  .method-logo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .method-name {
    font-size: 13.5px;
    font-weight: 600;
    color: var(--text-primary);
  }
  .account-box {
    background: var(--surface-2);
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-sm);
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .account-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  .account-value-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .copy-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    background: var(--surface-1);
    border: 1px solid var(--surface-border);
    color: var(--gold-400);
    font-size: 10.5px;
    font-weight: 700;
    padding: 5px 9px;
    border-radius: 999px;
    flex-shrink: 0;
  }
  .copy-btn.copied {
    color: var(--success);
    border-color: rgba(62, 207, 142, 0.35);
  }
  .account-label {
    font-size: 11.5px;
    color: var(--text-muted);
  }
  .account-value {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-primary);
  }
  .account-value.mono {
    font-family: var(--font-mono);
  }
  .instructions-text {
    font-size: 11.5px;
    color: var(--text-secondary);
    line-height: 1.5;
    margin-top: 4px;
  }
  .locked-card {
    background: var(--surface-1);
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-md);
    padding: 20px;
    text-align: center;
  }
  .locked-title {
    font-size: 15px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 8px;
  }
  .locked-body {
    font-size: 12.5px;
    color: var(--text-secondary);
    line-height: 1.6;
  }
  .history-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .section-label {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    color: var(--text-muted);
  }
`;
