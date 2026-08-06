const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function getInitData() {
  return window.Telegram?.WebApp?.initData || '';
}

// Website (phone/password) sessions are stored as a JWT in
// localStorage. Telegram sessions need no local storage - initData
// is supplied fresh by Telegram on every load.
function getToken() {
  return localStorage.getItem('auth_token') || '';
}

function setToken(token) {
  if (token) localStorage.setItem('auth_token', token);
  else localStorage.removeItem('auth_token');
}

// Only one auth header is ever sent per request. Telegram takes
// priority when both are somehow present, since initData is the
// stronger, freshly-verified signal; the website flow never runs
// inside Telegram anyway, so this doesn't collide in practice.
function authHeaders() {
  const initData = getInitData();
  if (initData) return { 'x-telegram-init-data': initData };

  const token = getToken();
  if (token) return { Authorization: `Bearer ${token}` };

  return {};
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
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
  isTelegram: () => Boolean(getInitData()),
  setToken,
  getToken,

  // ---- Telegram auth ----
  startSession: (referralCode) =>
    request('/api/users/session', {
      method: 'POST',
      body: JSON.stringify({ referralCode: referralCode || undefined })
    }),

  // ---- Website (phone/password) auth ----
  register: ({ phone, password, firstName, referralCode }) =>
    request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ phone, password, firstName, referralCode })
    }),

  login: ({ phone, password }) =>
    request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password })
    }),

  // Telegram sessions read from /api/users/me (also returns
  // is_admin); website sessions read from /api/auth/me.
  getMe: () => request(api.isTelegram() ? '/api/users/me' : '/api/auth/me'),

  // ---- Products ----
  getProducts: () => request('/api/products'),

  purchaseProduct: (productId) =>
    request(`/api/products/${productId}/purchase`, { method: 'POST' }),

  getMyPurchases: () => request('/api/products/mine'),

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
  getReferralRanks: () => request('/api/team/ranks'),
  getMyReferralRank: () => request('/api/team/rank'),

  // ---- Profile ----
  getProfileLinks: () => request('/api/profile/links'),

  getBonus: () => request('/api/profile/bonus'),

  claimBonus: (bonusId) =>
    request(`/api/profile/bonus/${bonusId}/claim`, { method: 'POST' }),

  // ---- Admin ----
  admin: {
    getMe: () => request('/api/admin/me'),

    getStats: () => request('/api/admin/stats'),

    getUsers: () => request('/api/admin/users'),

    // Admins (owner-only to add/remove; viewable by both roles)
    getAdmins: () => request('/api/admin/admins'),

    addAdmin: ({ telegramId, telegramUsername, role }) =>
      request('/api/admin/admins', {
        method: 'POST',
        body: JSON.stringify({ telegramId, telegramUsername, role })
      }),

    removeAdmin: (id) => request(`/api/admin/admins/${id}`, { method: 'DELETE' }),

    // Referral program ranks
    getReferralRanks: () => request('/api/admin/referral-ranks'),

    updateReferralRank: (level, updates) =>
      request(`/api/admin/referral-ranks/${level}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      }),

    createReferralRank: (rank) =>
      request('/api/admin/referral-ranks', {
        method: 'POST',
        body: JSON.stringify(rank)
      }),

    runReferralPayouts: (period) =>
      request('/api/admin/referral-ranks/run-payouts', {
        method: 'POST',
        body: JSON.stringify(period ? { period } : {})
      }),

    getReferralPayouts: (period) =>
      request(`/api/admin/referral-ranks/payouts${period ? `?period=${period}` : ''}`),

    // Products
    getProducts: () => request('/api/admin/products'),

    // Uploads a product photo file and returns { imageUrl }. Kept
    // outside request() because this is the only multipart call in
    // the app - it must NOT send Content-Type: application/json or
    // JSON.stringify the body, so the browser can set its own
    // multipart boundary header.
    uploadProductImage: async (file) => {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch(`${API_BASE}/api/admin/products/upload-image`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Upload failed with status ${res.status}`);
      return data;
    },

    createProduct: (product) =>
      request('/api/admin/products', {
        method: 'POST',
        body: JSON.stringify(product)
      }),

    updateProduct: (id, updates) =>
      request(`/api/admin/products/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      }),

    getProductStats: () => request('/api/admin/products/stats'),

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
