import React, { useEffect, useState, useCallback } from 'react';
import { api } from './api.js';
import HomeScreen from './screens/HomeScreen.jsx';
import EarnScreen from './screens/EarnScreen.jsx';
import WithdrawScreen from './screens/WithdrawScreen.jsx';
import TabBar from './components/TabBar.jsx';
import LoadingScreen from './components/LoadingScreen.jsx';
import ErrorScreen from './components/ErrorScreen.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('home');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [refreshUser]);

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} />;

  return (
    <div className="app-shell">
      {tab === 'home' && <HomeScreen user={user} onNavigate={setTab} />}
      {tab === 'earn' && <EarnScreen user={user} onBalanceChange={refreshUser} />}
      {tab === 'withdraw' && <WithdrawScreen user={user} onBalanceChange={refreshUser} />}

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
