const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function getToken() {
  return localStorage.getItem('auth_token') || '';
}

function setToken(token) {
  if (token) localStorage.setItem('auth_token', token);
  else localStorage.removeItem('auth_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
  setToken,
  getToken,

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

  getMe: () => request('/api/auth/me'),

  // ---- Products ----
  getProducts: () => request('/api/products'),
  purchaseProduct: (productId) => request(`/api/products/${productId}/purchase`, { method: 'POST' }),
  getMyPurchases: () => request('/api/products/mine'),

  // ---- Wallet ----
  getPaymentMethods: () => request('/api/wallet/payment-methods'),
  getDepositTerms: () => request('/api/wallet/deposit-terms'),
  createDeposit: (body) => request('/api/wallet/deposits', { method: 'POST', body: JSON.stringify(body) }),
  getMyDeposits: () => request('/api/wallet/deposits/mine'),
  getWithdrawalTerms: () => request('/api/wallet/withdrawal-terms'),
  createWithdrawal: (body) => request('/api/wallet/withdrawals', { method: 'POST', body: JSON.stringify(body) }),
  getMyWithdrawals: () => request('/api/wallet/withdrawals/mine'),

  // ---- Team / Referral program ----
  getTeam: () => request('/api/team'),
  getReferralRanks: () => request('/api/team/ranks'),
  getMyReferralRank: () => request('/api/team/rank'),

  // ---- Profile ----
  getProfileLinks: () => request('/api/profile/links'),
  getBonus: () => request('/api/profile/bonus'),
  claimBonus: (id) => request(`/api/profile/bonus/${id}/claim`, { method: 'POST' })
};
