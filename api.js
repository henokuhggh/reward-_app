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

  // ---- Bingo ----
  getBingoStakes: () => request('/api/bingo/stakes'),

  getOpenBingoRound: (stakeTierId) =>
    request(`/api/bingo/rounds/open?stakeTierId=${encodeURIComponent(stakeTierId)}`),

  getBingoCartels: (roundId) => request(`/api/bingo/rounds/${roundId}/cartels`),

  joinBingoRound: (roundId, cartelId) =>
    request(`/api/bingo/rounds/${roundId}/join`, {
      method: 'POST',
      body: JSON.stringify({ cartelId })
    }),

  getBingoCard: (roundId) => request(`/api/bingo/rounds/${roundId}/card`),

  getBingoRound: (roundId) => request(`/api/bingo/rounds/${roundId}`),

  getMyBingoHistory: () => request('/api/bingo/history/mine'),

  // ---- Wallet: deposits ----
  getPaymentMethods: () => request('/api/wallet/payment-methods'),

  submitDeposit: (amount, paymentMethodId, referenceCode) =>
    request('/api/wallet/deposits', {
      method: 'POST',
      body: JSON.stringify({ amount, paymentMethodId, referenceCode })
    }),

  getMyDeposits: () => request('/api/wallet/deposits/mine'),

  getDepositTerms: () => request('/api/wallet/deposit-terms'),

  // ---- Wallet: withdrawals ----
  requestWithdrawal: (amount, method, accountDetails) =>
    request('/api/wallet/withdrawals', {
      method: 'POST',
      body: JSON.stringify({ amount, method, accountDetails })
    }),

  getMyWithdrawals: () => request('/api/wallet/withdrawals/mine'),

  getWithdrawalTerms: () => request('/api/wallet/withdrawal-terms'),

  // ---- Team ----
  getTeam: () => request('/api/team'),

  // ---- Profile ----
  getProfileLinks: () => request('/api/profile/links'),

  getBonus: () => request('/api/profile/bonus'),

  claimBonus: (bonusId) =>
    request(`/api/profile/bonus/${bonusId}/claim`, { method: 'POST' }),

  // ---- Admin ----
  admin: {
    getStats: () => request('/api/admin/stats'),

    getUsers: () => request('/api/admin/users'),

    // Bingo
    getBingoStats: () => request('/api/admin/bingo/stats'),

    getBingoStakes: () => request('/api/admin/bingo/stakes'),

    createBingoStake: (stake) =>
      request('/api/admin/bingo/stakes', {
        method: 'POST',
        body: JSON.stringify(stake)
      }),

    updateBingoStake: (id, updates) =>
      request(`/api/admin/bingo/stakes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      }),

    getBingoRounds: (status) =>
      request(`/api/admin/bingo/rounds${status ? `?status=${status}` : ''}`),

    cancelBingoRound: (id) =>
      request(`/api/admin/bingo/rounds/${id}/cancel`, { method: 'POST' }),

    // Payment methods
    getPaymentMethods: () => request('/api/admin/payment-methods'),

    createPaymentMethod: (method) =>
      request('/api/admin/payment-methods', {
        method: 'POST',
        body: JSON.stringify(method)
      }),

    updatePaymentMethod: (id, updates) =>
      request(`/api/admin/payment-methods/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      }),

    // Deposits
    getDeposits: (status = 'pending') => request(`/api/admin/deposits?status=${status}`),

    approveDeposit: (id, note) =>
      request(`/api/admin/deposits/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ note })
      }),

    rejectDeposit: (id, note) =>
      request(`/api/admin/deposits/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ note })
      }),

    // Withdrawals
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

    // Bonus
    getBonusReleases: () => request('/api/admin/bonus'),

    releaseBonus: (amount, label, expiresAt) =>
      request('/api/admin/bonus', {
        method: 'POST',
        body: JSON.stringify({ amount, label, expiresAt })
      }),

    // App settings (min withdrawal, withdrawal fee percent)
    getSettings: () => request('/api/admin/settings'),

    updateSettings: (updates) =>
      request('/api/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify(updates)
      }),

    // Links
    getLinks: () => request('/api/admin/links'),

    createLink: (link) =>
      request('/api/admin/links', {
        method: 'POST',
        body: JSON.stringify(link)
      }),

    updateLink: (id, updates) =>
      request(`/api/admin/links/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      }),

    broadcast: (text, imageUrl) =>
      request('/api/admin/broadcast', {
        method: 'POST',
        body: JSON.stringify({ text, imageUrl })
      })
  }
};
