const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function getInitData() {
  return window.Telegram?.WebApp?.initData || '';
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-telegram-init-data': getInitData(),
      ...(options.headers || {})
    }
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data;
}

export const api = {
  startSession: (referralCode) =>
    request('/api/users/session', {
      method: 'POST',
      body: JSON.stringify({ referralCode: referralCode || undefined })
    }),

  getMe: () => request('/api/users/me'),

  getChannels: () => request('/api/channels'),

  verifyChannelJoin: (campaignId) =>
    request(`/api/channels/${campaignId}/verify`, { method: 'POST' }),

  rewardAdView: (adsgramBlockId) =>
    request('/api/ads/reward', {
      method: 'POST',
      body: JSON.stringify({ adsgramBlockId })
    }),

  requestWithdrawal: (amount, method, accountDetails) =>
    request('/api/withdrawals', {
      method: 'POST',
      body: JSON.stringify({ amount, method, accountDetails })
    }),

  getMyWithdrawals: () => request('/api/withdrawals/mine')
};
