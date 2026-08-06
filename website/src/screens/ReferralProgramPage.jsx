import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';

function formatETB(n) {
  return `ETB ${Math.round(n).toLocaleString('en-US')}`;
}

/**
 * ReferralProgramPage
 *
 * Props:
 *  - user: the current user object (needs referral_link)
 *  - team: { invited: [...], total_invited, active_invited } - same
 *    shape TeamScreen already fetches from GET /api/team, passed
 *    down rather than re-fetched here (used for the "Team members"
 *    stat card - rank/salary come from the backend below).
 *  - onBack: called when the user taps the back arrow
 *
 * Rank ladder and the user's current qualifying rank both come from
 * the backend (GET /api/team/ranks and GET /api/team/rank), which
 * run the exact same get_user_referral_rank() SQL function used to
 * actually pay out monthly salaries - so what's shown here always
 * matches what gets paid, with no separate client-side copy of the
 * business rules to drift out of sync.
 */
export default function ReferralProgramPage({ user, team, onBack }) {
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('level');
  const [ranks, setRanks] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.getReferralRanks(), api.getMyReferralRank()])
      .then(([ranksRes, rankRes]) => {
        setRanks(ranksRes.ranks || []);
        setMyRank(rankRes.rank || null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const teamSize = myRank?.team_size ?? team?.total_invited ?? 0;
  const teamDeposit = myRank?.team_deposit ?? 0;
  const currentLevel = myRank?.level ?? null;

  const nextRank = useMemo(() => {
    if (!myRank?.next_level) return null;
    return {
      level: myRank.next_level,
      position: myRank.next_position,
      teamSize: myRank.next_team_size_required,
      deposit: myRank.next_team_deposit_required
    };
  }, [myRank]);

  const progressPct = useMemo(() => {
    if (!nextRank) return myRank?.level ? 100 : 0;
    const sizePct = Math.min(1, teamSize / nextRank.teamSize);
    const depositPct = Math.min(1, teamDeposit / nextRank.deposit);
    return Math.round(Math.min(sizePct, depositPct) * 100);
  }, [nextRank, teamSize, teamDeposit, myRank]);

  const filteredRanks = useMemo(() => {
    let rows = ranks;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((r) => r.position.toLowerCase().includes(q));
    }
    rows = [...rows].sort((a, b) =>
      sortBy === 'salary' ? b.monthly_salary - a.monthly_salary : a.level - b.level
    );
    return rows;
  }, [ranks, search, sortBy]);

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
    const shareText = `Join me and start earning - use my referral link:`;
    window.Telegram?.WebApp?.openTelegramLink(
      `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareText)}`
    );
  }

  return (
    <div className="ref-page">
      {/* ---------- Hero ---------- */}
      <div className="ref-hero">
        <button className="back-btn" onClick={onBack} aria-label="Back">
          <BackIcon />
        </button>
        <p className="hero-eyebrow">Referral Program</p>
        <h1 className="hero-title">Build Your Team &amp; Earn Monthly Rewards</h1>
        <p className="hero-subtitle">
          Grow your network, increase your team deposit, and unlock higher ranks with
          bigger monthly salaries.
        </p>
      </div>

      {/* ---------- Stats ---------- */}
      <div className="stats-grid">
        <StatCard label="Team members" value={teamSize.toLocaleString()} icon={<UsersIcon />} />
        <StatCard label="Team deposit" value={formatETB(teamDeposit)} icon={<CoinIcon />} />
        <StatCard
          label="Current level"
          value={currentLevel ? `L${currentLevel}` : 'Unranked'}
          icon={<BadgeIcon />}
        />
        <StatCard
          label="Monthly salary"
          value={myRank?.monthly_salary ? formatETB(myRank.monthly_salary) : 'ETB 0'}
          icon={<CoinIcon />}
          highlight
        />
      </div>

      {/* ---------- Progress ---------- */}
      <div className="progress-card">
        <div className="progress-head">
          <span className="progress-current">
            {myRank?.position || 'No rank yet'}
          </span>
          {nextRank && <span className="progress-next">Next: {nextRank.position}</span>}
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        {nextRank ? (
          <p className="progress-hint">
            {teamSize.toLocaleString()}/{nextRank.teamSize.toLocaleString()} members ·{' '}
            {formatETB(teamDeposit)}/{formatETB(nextRank.deposit)} deposit
          </p>
        ) : myRank?.level ? (
          <p className="progress-hint">You've reached the top rank 🎉</p>
        ) : (
          <p className="progress-hint">Invite your first member to start climbing ranks.</p>
        )}
      </div>

      {/* ---------- Referral link actions ---------- */}
      <div className="link-card">
        <p className="link-label">Your referral link</p>
        <div className="link-box">
          <span className="link-text">{link || 'Setting up your link...'}</span>
        </div>
        <div className="link-actions">
          <button className="ghost-btn" onClick={handleCopy} disabled={!link}>
            <CopyIcon /> {copied ? 'Copied' : 'Copy link'}
          </button>
          <button className="gold-btn" onClick={handleShare} disabled={!link}>
            <ShareIcon /> Share
          </button>
        </div>
      </div>

      {/* ---------- Rank table controls ---------- */}
      <div className="table-controls">
        <div className="search-box">
          <SearchIcon />
          <input
            placeholder="Search by position..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="sort-group">
          <button
            className={`sort-btn ${sortBy === 'level' ? 'active' : ''}`}
            onClick={() => setSortBy('level')}
          >
            Level
          </button>
          <button
            className={`sort-btn ${sortBy === 'salary' ? 'active' : ''}`}
            onClick={() => setSortBy('salary')}
          >
            Salary
          </button>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}
      {loading && <p className="loading-text">Loading ranks...</p>}

      {/* ---------- Rank table (desktop/tablet) ---------- */}
      <div className="rank-table-wrap">
        <table className="rank-table">
          <thead>
            <tr>
              <th>Level</th>
              <th>Position</th>
              <th>Team size</th>
              <th>Team deposit</th>
              <th>Monthly salary</th>
            </tr>
          </thead>
          <tbody>
            {filteredRanks.map((r) => (
              <tr key={r.level} className={currentLevel === r.level ? 'is-current' : ''}>
                <td>
                  <span className="level-badge">L{r.level}</span>
                </td>
                <td className="position-cell">
                  {r.position}
                  {currentLevel === r.level && <span className="you-pill">You</span>}
                </td>
                <td>{r.team_size_required.toLocaleString()}</td>
                <td>{formatETB(r.team_deposit_required)}</td>
                <td className="salary-cell">{formatETB(r.monthly_salary)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---------- Rank cards (mobile) ---------- */}
      <div className="rank-cards">
        {filteredRanks.map((r) => (
          <div
            key={r.level}
            className={`rank-card ${currentLevel === r.level ? 'is-current' : ''}`}
          >
            <div className="rank-card-top">
              <span className="level-badge">L{r.level}</span>
              <span className="rank-card-position">{r.position}</span>
              {currentLevel === r.level && <span className="you-pill">You</span>}
            </div>
            <div className="rank-card-rows">
              <div className="rank-card-row">
                <span>Team size</span>
                <span>{r.team_size_required.toLocaleString()}</span>
              </div>
              <div className="rank-card-row">
                <span>Team deposit</span>
                <span>{formatETB(r.team_deposit_required)}</span>
              </div>
              <div className="rank-card-row">
                <span>Monthly salary</span>
                <span className="salary-cell">{formatETB(r.monthly_salary)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .ref-page {
          padding-bottom: 24px;
          animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ---------- Hero ---------- */
        .ref-hero {
          position: relative;
          padding: 20px 18px 26px;
          background:
            radial-gradient(120% 140% at 0% 0%, rgba(224, 184, 84, 0.16), transparent 55%),
            linear-gradient(160deg, var(--ink-900), var(--ink-950) 70%);
          border-bottom: 1px solid var(--surface-border);
          overflow: hidden;
        }
        .back-btn {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 14px;
        }
        .hero-eyebrow {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--gold-400);
          margin-bottom: 6px;
        }
        .hero-title {
          font-family: var(--font-display);
          font-size: 23px;
          line-height: 1.25;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 8px;
        }
        .hero-subtitle {
          font-size: 13px;
          line-height: 1.5;
          color: var(--text-secondary);
          max-width: 46ch;
        }

        /* ---------- Stats ---------- */
        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          padding: 16px;
        }
        .stat-card {
          background: rgba(20, 34, 74, 0.55);
          backdrop-filter: blur(10px);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-md);
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          transition: transform 0.15s ease, border-color 0.15s ease;
        }
        .stat-card:active {
          transform: scale(0.98);
        }
        .stat-card.highlight {
          border-color: rgba(224, 184, 84, 0.35);
          background: linear-gradient(150deg, rgba(224, 184, 84, 0.12), rgba(20, 34, 74, 0.55));
        }
        .stat-icon {
          width: 30px;
          height: 30px;
          border-radius: 9px;
          background: rgba(224, 184, 84, 0.14);
          color: var(--gold-400);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .stat-value {
          font-family: var(--font-display);
          font-size: 17px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .stat-label {
          font-size: 11px;
          color: var(--text-muted);
        }

        /* ---------- Progress ---------- */
        .progress-card {
          margin: 0 16px 16px;
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-md);
          padding: 14px 16px;
        }
        .progress-head {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 10px;
          flex-wrap: wrap;
          gap: 4px;
        }
        .progress-current {
          font-size: 13.5px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .progress-next {
          font-size: 11px;
          color: var(--text-muted);
        }
        .progress-track {
          height: 8px;
          border-radius: 999px;
          background: var(--surface-2);
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, var(--gold-600), var(--gold-400));
          transition: width 0.5s ease;
        }
        .progress-hint {
          margin-top: 8px;
          font-size: 11px;
          color: var(--text-muted);
        }

        /* ---------- Link card ---------- */
        .link-card {
          margin: 0 16px 16px;
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-md);
          padding: 14px 16px;
        }
        .link-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          color: var(--text-muted);
          margin-bottom: 8px;
        }
        .link-box {
          background: var(--surface-2);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-sm);
          padding: 10px 12px;
          margin-bottom: 10px;
          overflow-x: auto;
          white-space: nowrap;
        }
        .link-text {
          font-family: var(--font-mono);
          font-size: 11.5px;
          color: var(--silver-300);
        }
        .link-actions {
          display: flex;
          gap: 10px;
        }
        .ghost-btn, .gold-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px;
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 700;
          transition: transform 0.15s ease, opacity 0.15s ease;
        }
        .ghost-btn:active, .gold-btn:active {
          transform: scale(0.97);
        }
        .ghost-btn:disabled, .gold-btn:disabled {
          opacity: 0.5;
        }
        .ghost-btn {
          background: var(--surface-2);
          border: 1px solid var(--surface-border);
          color: var(--text-primary);
        }
        .gold-btn {
          background: linear-gradient(135deg, var(--gold-500), var(--gold-600));
          color: var(--ink-950);
        }

        /* ---------- Table controls ---------- */
        .table-controls {
          padding: 0 16px 12px;
          display: flex;
          gap: 10px;
        }
        .search-box {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-sm);
          padding: 9px 12px;
          color: var(--text-muted);
        }
        .search-box input {
          flex: 1;
          background: none;
          border: none;
          outline: none;
          color: var(--text-primary);
          font-size: 12.5px;
        }
        .sort-group {
          display: flex;
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-sm);
          overflow: hidden;
        }
        .sort-btn {
          padding: 9px 12px;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
        }
        .sort-btn.active {
          background: rgba(224, 184, 84, 0.14);
          color: var(--gold-400);
        }
        .error-text {
          padding: 0 16px 10px;
          font-size: 12.5px;
          color: var(--danger);
        }
        .loading-text {
          padding: 0 16px 10px;
          font-size: 12.5px;
          color: var(--text-muted);
        }

        /* ---------- Table (tablet/desktop) ---------- */
        .rank-table-wrap {
          display: none;
          padding: 0 16px;
          margin-bottom: 16px;
        }
        .rank-table {
          width: 100%;
          border-collapse: collapse;
          background: var(--surface-1);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-md);
          overflow: hidden;
        }
        .rank-table thead th {
          position: sticky;
          top: 0;
          background: var(--surface-2);
          text-align: left;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          color: var(--text-muted);
          padding: 12px 14px;
        }
        .rank-table tbody td {
          padding: 12px 14px;
          font-size: 13px;
          color: var(--text-secondary);
          border-top: 1px solid var(--surface-border);
        }
        .rank-table tbody tr {
          transition: background 0.15s ease;
        }
        .rank-table tbody tr:hover {
          background: rgba(224, 184, 84, 0.06);
        }
        .rank-table tbody tr.is-current {
          background: rgba(224, 184, 84, 0.1);
        }
        .level-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 30px;
          padding: 4px 8px;
          border-radius: 999px;
          background: rgba(224, 184, 84, 0.14);
          color: var(--gold-400);
          font-weight: 700;
          font-size: 11.5px;
        }
        .position-cell {
          font-weight: 600;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .you-pill {
          font-size: 9.5px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 999px;
          background: var(--gold-400);
          color: var(--ink-950);
        }
        .salary-cell {
          font-weight: 700;
          color: var(--gold-400);
        }

        /* ---------- Cards (mobile) ---------- */
        .rank-cards {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 0 16px;
        }
        .rank-card {
          background: rgba(20, 34, 74, 0.55);
          backdrop-filter: blur(10px);
          border: 1px solid var(--surface-border);
          border-radius: var(--radius-md);
          padding: 14px;
          transition: border-color 0.15s ease, transform 0.15s ease;
        }
        .rank-card:active {
          transform: scale(0.99);
        }
        .rank-card.is-current {
          border-color: rgba(224, 184, 84, 0.4);
        }
        .rank-card-top {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
        }
        .rank-card-position {
          font-size: 13.5px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .rank-card-rows {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .rank-card-row {
          display: flex;
          justify-content: space-between;
          font-size: 12.5px;
          color: var(--text-secondary);
        }

        /* Switch to table layout on wider screens */
        @media (min-width: 720px) {
          .rank-table-wrap { display: block; }
          .rank-cards { display: none; }
        }
      `}</style>
    </div>
  );
}

function StatCard({ label, value, icon, highlight }) {
  return (
    <div className={`stat-card ${highlight ? 'highlight' : ''}`}>
      <div className="stat-icon">{icon}</div>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

/* ---------- Icons (inline SVG, no external icon library) ---------- */

function BackIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}
function CoinIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M9 9.5c0-1 1-2 3-2s3 1 3 2-1 1.5-3 1.5-3 .5-3 1.5 1 2 3 2 3-1 3-2" />
    </svg>
  );
}
function BadgeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6" />
      <path d="M9 13.5L7 22l5-3 5 3-2-8.5" />
    </svg>
  );
}
function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}
function ShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}
