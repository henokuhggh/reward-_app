import React, { useEffect, useState, useCallback } from 'react';
import { api } from './api.js';
import AuthScreen from './AuthScreen.jsx';
import HomeScreen from './screens/HomeScreen.jsx';
import ProductScreen from './screens/ProductScreen.jsx';
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
      // Telegram Mini App path: initData present means we're running
      // inside Telegram, so start/resume the Telegram session.
      if (tg?.initData) {
        try {
          // Referral code arrives via Telegram's start_param when the
          // mini app is opened from a t.me/bot?start=CODE deep link
          const startParam = tg?.initDataUnsafe?.start_param;
          await api.startSession(startParam);
          await refreshUser();
        } catch (err) {
          const apiUrl = import.meta.env.VITE_API_URL || '(not set, using localhost fallback)';
          setError(`${err.message} | API: ${apiUrl} | initData present: true`);
        } finally {
          setLoading(false);
        }
        return;
      }

      // Browser path: no Telegram context. Try to resume a saved
      // phone/password session; otherwise fall through to AuthScreen.
      // An invalid/expired token just drops back to login - no error
      // shown, since this is the normal "never logged in" case too.
      if (api.getToken()) {
        try {
          await refreshUser();
        } catch {
          api.setToken(null);
        }
      }
      setLoading(false);
    }

    init();
  }, [refreshUser]);

  function handleAuthed(token, authedUser) {
    api.setToken(token);
    setUser(authedUser);
  }

  function handleLogout() {
    api.setToken(null);
    setUser(null);
    setTab('home');
  }

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} />;

  // Browser, not logged in yet - show phone/password auth.
  if (!user && !api.isTelegram()) {
    return <AuthScreen onAuthed={handleAuthed} />;
  }

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
      {tab === 'product' && <ProductScreen user={user} onBalanceChange={refreshUser} />}
      {tab === 'wallet' && <WalletScreen user={user} onBalanceChange={refreshUser} />}
      {tab === 'team' && <TeamScreen user={user} />}
      {tab === 'profile' && <ProfileScreen user={user} onBalanceChange={refreshUser} />}

      {!api.isTelegram() && (
        <div className="logout-row">
          <button className="logout-btn" onClick={handleLogout}>Log out</button>
        </div>
      )}

      <TabBar active={tab} onChange={setTab} />

      <style>{`
        .app-shell {
          min-height: 100vh;
          padding-bottom: 84px;
          background: var(--surface-0);
        }
        .logout-row {
          padding: 4px 16px 20px;
          display: flex;
          justify-content: center;
        }
        .logout-btn {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
          padding: 8px 16px;
        }
      `}</style>
    </div>
  );
}
