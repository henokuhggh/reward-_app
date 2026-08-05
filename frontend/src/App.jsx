import React, { useEffect, useState, useCallback } from 'react';
import { api } from './api.js';
import HomeScreen from './screens/HomeScreen.jsx';
import BingoScreen from './screens/bingo/BingoScreen.jsx';
import WalletScreen from './screens/WalletScreen.jsx';
import TeamScreen from './screens/TeamScreen.jsx';
import ProfileScreen from './screens/ProfileScreen.jsx';
import TabBar from './components/TabBar.jsx';
import LoadingScreen from './components/LoadingScreen.jsx';
import ErrorScreen from './components/ErrorScreen.jsx';
import AdminApp from './admin/AdminApp.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('home');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [adminMode, setAdminMode] = useState(false);

  const refreshUser = useCallback(async () => {
    const { user } = await api.getMe();
    setUser(user);
    return user;
  }, []);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    tg?.ready();
    tg?.expand();

    async function init() {
      try {
        // Referral code arrives via Telegram's start_param when the
        // mini app is opened from a t.me/bot?start=CODE deep link
        const startParam = tg?.initDataUnsafe?.start_param;
        await api.startSession(startParam);
        await refreshUser();
      } catch (err) {
        // Include diagnostic context so "Failed to fetch" (a generic
        // browser message) can actually be debugged - which API URL
        // was baked into this build, and did Telegram give us initData.
        const apiUrl = import.meta.env.VITE_API_URL || '(not set, using localhost fallback)';
        const hasInitData = Boolean(tg?.initData);
        setError(`${err.message} | API: ${apiUrl} | initData present: ${hasInitData}`);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [refreshUser]);

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} />;

  // adminMode is purely a UI convenience toggle for admins. It does
  // not grant any access on its own - every /api/admin/* call is
  // independently re-checked against ADMIN_TELEGRAM_IDS server-side,
  // so a non-admin can never reach real admin functionality even if
  // they somehow forced this flag on client-side.
  if (adminMode && user?.is_admin) {
    return <AdminApp onExit={() => setAdminMode(false)} />;
  }

  return (
    <div className="app-shell">
      {tab === 'home' && (
        <HomeScreen
          user={user}
          onNavigate={setTab}
          onOpenAdmin={user?.is_admin ? () => setAdminMode(true) : null}
        />
      )}
      {tab === 'bingo' && <BingoScreen user={user} onBalanceChange={refreshUser} />}
      {tab === 'wallet' && <WalletScreen user={user} onBalanceChange={refreshUser} />}
      {tab === 'team' && <TeamScreen user={user} />}
      {tab === 'profile' && <ProfileScreen user={user} onBalanceChange={refreshUser} />}

      <TabBar active={tab} onChange={setTab} />

      <style>{`
        .app-shell {
          min-height: 100vh;
          padding-bottom: 84px;
          background: var(--surface-0);
        }
      `}</style>
    </div>
  );
}
