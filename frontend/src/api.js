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

  getMyWithdrawals: () => request('/api/withdrawals/mine'),

  // ---- Admin ----
  admin: {
    getStats: () => request('/api/admin/stats'),

    getAllChannels: () => request('/api/admin/channels'),

    getSettings: () => request('/api/admin/settings'),

    updateMinWithdrawal: (newValue) =>
      request('/api/admin/settings/min-withdrawal', {
        method: 'PATCH',
        body: JSON.stringify({ newValue })
      }),

    getMinWithdrawalHistory: () => request('/api/admin/settings/min-withdrawal/history'),

    setRequiredChannel: (campaignId) =>
      request('/api/admin/settings/required-channel', {
        method: 'PATCH',
        body: JSON.stringify({ campaignId })
      }),

    createChannel: (channelUsername, channelTitle, sponsorBudget, rewardPerJoin) =>
      request('/api/admin/channels', {
        method: 'POST',
        body: JSON.stringify({ channelUsername, channelTitle, sponsorBudget, rewardPerJoin })
      }),

    setChannelActive: (campaignId, isActive) =>
      request(`/api/admin/channels/${campaignId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive })
      }),

    getWithdrawals: (status = 'pending') => request(`/api/admin/withdrawals?status=${status}`),

    approveWithdrawal: (id, note) =>
      request(`/api/admin/withdrawals/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ note })
      }),

    rejectWithdrawal: (id, note) =>
      request(`/api/admin/withdrawals/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ note })
      }),

    broadcast: (text, imageUrl) =>
      request('/api/admin/broadcast', {
        method: 'POST',
        body: JSON.stringify({ text, imageUrl })
      })
  }
};
