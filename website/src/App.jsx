import React, { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import AuthScreen from './AuthScreen.jsx';
import HomeScreen from './screens/HomeScreen.jsx';
import ProductScreen from './screens/ProductScreen.jsx';
import WalletScreen from './screens/WalletScreen.jsx';
import TeamScreen from './screens/TeamScreen.jsx';
import ProfileScreen from './screens/ProfileScreen.jsx';
import TabBar from './components/TabBar.jsx';
import LoadingScreen from './components/LoadingScreen.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('home');
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const { user } = await api.getMe();
    setUser(user);
    return user;
  }, []);

  useEffect(() => {
    // If a token from a previous visit exists, try to resume that
    // session silently. An invalid/expired token just drops back to
    // the login screen - no error shown, since this is the normal
    // "never logged in" case too.
    if (api.getToken()) {
      refreshUser().catch(() => api.setToken(null)).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
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

  if (!user) {
    return <AuthScreen onAuthed={handleAuthed} />;
  }

  return (
    <div className="app-shell">
      {tab === 'home' && <HomeScreen user={user} onNavigate={setTab} onOpenAdmin={null} />}
      {tab === 'product' && <ProductScreen user={user} onBalanceChange={refreshUser} />}
      {tab === 'wallet' && <WalletScreen user={user} onBalanceChange={refreshUser} />}
      {tab === 'team' && <TeamScreen user={user} />}
      {tab === 'profile' && <ProfileScreen user={user} onBalanceChange={refreshUser} />}

      <div className="logout-row">
        <button className="logout-btn" onClick={handleLogout}>Log out</button>
      </div>

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
