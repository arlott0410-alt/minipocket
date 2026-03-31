const BASE_URL = import.meta.env.VITE_WORKER_URL;
let adminAccessToken = localStorage.getItem("admin_access_token") || null;

function getInitData() {
  if (window.Telegram?.WebApp?.initData) return window.Telegram.WebApp.initData;
  return import.meta.env.VITE_DEV_INIT_DATA || "";
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Init-Data": getInitData(),
      ...(adminAccessToken ? { Authorization: `Bearer ${adminAccessToken}` } : {}),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, ...data };
  return data;
}

export const api = {
  login: () => request("/api/auth/login", { method: "POST" }),
  getMeta: () => request("/api/users/meta"),
  getWallets: () => request("/api/wallets"),
  createWallet: (body) => request("/api/wallets", { method: "POST", body }),
  updateWallet: (id, body) => request(`/api/wallets/${id}`, { method: "PATCH", body }),
  deleteWallet: (id) => request(`/api/wallets/${id}`, { method: "DELETE" }),
  shareWallet: (id, body) => request(`/api/wallets/${id}/share`, { method: "POST", body }),
  revokeAccess: (id, userId) => request(`/api/wallets/${id}/members/${userId}`, { method: "DELETE" }),
  getTransactions: (params = {}) => request(`/api/transactions?${new URLSearchParams(params)}`),
  createTransaction: (body) => request("/api/transactions", { method: "POST", body }),
  updateTransaction: (id, body) => request(`/api/transactions/${id}`, { method: "PATCH", body }),
  deleteTransaction: (id) => request(`/api/transactions/${id}`, { method: "DELETE" }),
  getTransfers: () => request("/api/transfers"),
  createTransfer: (body) => request("/api/transfers", { method: "POST", body }),
  getSummary: (month) => request(`/api/reports/summary?month=${month}`),
  getChart: (months = 6) => request(`/api/reports/chart?months=${months}`),
  getByCategory: (month, type) => request(`/api/reports/by-category?month=${month}&type=${type}`),
  getSettings: () => request("/api/users/settings"),
  getMyPayments: () => request("/api/users/payments"),
  createPaymentRequest: (body) => request("/api/users/payments", { method: "POST", body }),
  adminLogin: (body) => request("/api/admin/login", { method: "POST", body }),
  adminGetSettings: () => request("/api/admin/settings"),
  adminSaveSettings: (body) => request("/api/admin/settings", { method: "POST", body }),
  adminGetUsers: () => request("/api/admin/users"),
  adminUpdateUser: (id, body) => request(`/api/admin/users/${id}`, { method: "PATCH", body }),
  adminGetPayments: (status = "") => request(`/api/admin/payments${status ? `?status=${status}` : ""}`),
  adminReviewPayment: (id, body) => request(`/api/admin/payments/${id}`, { method: "PATCH", body }),
  adminGetCurrencies: () => request("/api/admin/currencies"),
  adminCreateCurrency: (body) => request("/api/admin/currencies", { method: "POST", body }),
  adminGetCategories: () => request("/api/admin/categories"),
  adminCreateCategory: (body) => request("/api/admin/categories", { method: "POST", body }),
  adminUpdateCategory: (id, body) => request(`/api/admin/categories/${id}`, { method: "PATCH", body }),
};

export function setAdminAccessToken(token) {
  adminAccessToken = token;
  if (token) localStorage.setItem("admin_access_token", token);
  else localStorage.removeItem("admin_access_token");
}

export function clearAdminAccessToken() {
  setAdminAccessToken(null);
}
