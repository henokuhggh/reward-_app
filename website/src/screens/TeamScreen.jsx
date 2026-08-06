import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import ReferralCard from '../components/ReferralCard.jsx';
import ReferralProgramPage from './ReferralProgramPage.jsx';

export default function TeamScreen({ user }) {
  const [team, setTeam] = useState({ invited: [], total_invited: 0, active_invited: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showProgram, setShowProgram] = useState(false);

  useEffect(() => {
    api
      .getTeam()
      .then(setTeam)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (showProgram) {
    return <ReferralProgramPage user={user} team={team} onBack={() => setShowProgram(false)} />;
  }

  return (
    <div className="team-screen">
      <p className="screen-title">Team</p>

      <ReferralCard user={user} />

      <button className="program-link-btn" onClick={() => setShowProgram(true)}>
        View referral program &amp; ranks
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>

      <div className="stats-row">
        <StatBox label="Total invited" value={team.total_invited} />
        <StatBox label="Active (deposited)" value={team.active_invited} />
      </div>

      <p className="section-label">Your invitees</p>

      {error && <p className="error-text">{error}</p>}
      {loading ? (
        <p className="muted-text">Loading...</p>
      ) : team.invited.length === 0 ? (
        <p className="muted-text">No one has joined with your link yet.</p>
      ) : (
        <div className="invitee-list">
          {team.invited.map((u) => (
            <InviteeRow key={u.id} invitee={u} />
          ))}
        </div>
      )}

      <style>{`
        .team-screen {
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
        .program-link-btn {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: linear-gradient(135deg, rgba(224, 184, 84, 0.14), rgba(20, 34, 74, 0.4));
          border: 1px solid rgba(224, 184, 84, 0.3);
          border-radius: var(--radius-md);
          padding: 13px 16px;
          font-size: 13px;
          font-weight: 700;
          color: var(--gold-400);
          transition: transform 0.15s ease;
        }
        .program-link-btn:active {
          transform: scale(0.98);
        }
        .stats-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .section-label {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .error-text {
          font-size: 12.5px;
          color: var(--danger);
        }
        .muted-text {
          font-size: 12.5px;
          color: var(--text-muted);
        }
        .invitee-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
      `}</style>
    </div>
  );
}

function StatBox({ label, value }) {
  return (
    <div className="stat-box">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>

      <style>{`
        .stat-box {
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-md);
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .stat-value {
          font-family: var(--font-display);
          font-size: 22px;
          font-weight: 700;
          color: var(--gold-400);
        }
        .stat-label {
          font-size: 11px;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}

function InviteeRow({ invitee }) {
  const name = invitee.first_name || invitee.telegram_username || 'User';
  return (
    <div className="invitee-row">
      <div className="invitee-avatar">{name[0]?.toUpperCase()}</div>
      <div className="invitee-info">
        <span className="invitee-name">{name}</span>
        <span className="invitee-date">Joined {new Date(invitee.created_at).toLocaleDateString()}</span>
      </div>
      <span className={`status-pill ${invitee.has_deposited ? 'good' : 'pending'}`}>
        {invitee.has_deposited ? 'Active' : 'Pending'}
      </span>

      <style>{`
        .invitee-row {
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-sm);
          padding: 10px 12px;
        }
        .invitee-avatar {
          width: 36px;
          height: 36px;
          border-radius: 999px;
          background: rgba(224, 184, 84, 0.14);
          color: var(--gold-400);
          font-weight: 700;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .invitee-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .invitee-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .invitee-date {
          font-size: 10.5px;
          color: var(--text-muted);
        }
        .status-pill {
          font-size: 10.5px;
          font-weight: 700;
          padding: 3px 9px;
          border-radius: 999px;
          flex-shrink: 0;
        }
        .status-pill.good {
          color: var(--success);
          background: rgba(62, 207, 142, 0.14);
        }
        .status-pill.pending {
          color: var(--text-muted);
          background: var(--surface-2);
        }
      `}</style>
    </div>
  );
}
