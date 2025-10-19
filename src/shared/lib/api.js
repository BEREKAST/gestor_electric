import http from "./http";

/* ====== TUS APIS EXISTENTES (sin cambios) ====== */
export const SellerAPI = {
  taxes: () => http.get("/seller/taxes"),
  addTax: (data) => http.post("/seller/taxes", data),
  delTax: (id) => http.del(`/seller/taxes/${id}`),
  finance: () => http.get("/seller/finance"),
  analytics: () => http.get("/seller/analytics/summary"),
};

export const OrdersAPI = {
  checkout: (payload) => http.post("/checkout", payload),
  list: () => http.get("/orders"),
  detail: (id) => http.get(`/orders/${id}`),
  stats: () => http.get("/orders/stats"),
};

/* ====== AuthAPI con cookies httpOnly ====== */
const AUTH_BASE = import.meta.env.VITE_AUTH_URL ?? "http://localhost:3001";

export const AuthAPI = {
  async register(payload) {
    const res = await fetch(`${AUTH_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload), // { name, email, password, role } → plan se ignora (free por backend)
    });
    if (!res.ok) throw new Error("Register failed");
    return res.json(); // { user }
  },

  async login({ email, password }) {
    const res = await fetch(`${AUTH_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error("Login failed");
    return res.json(); // { user }
  },

  async me() {
    const res = await fetch(`${AUTH_BASE}/auth/me`, { credentials: "include" });
    if (!res.ok) throw new Error("Me failed");
    return res.json(); // { user } | { user:null }
  },

  async logout() {
    const res = await fetch(`${AUTH_BASE}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) throw new Error("Logout failed");
    return res.json(); // { ok:true }
  },

  // ✅ usar tras pago (pro/enterprise). Actualiza cookie + devuelve user.
  async changePlan(plan) {
    const res = await fetch(`${AUTH_BASE}/auth/plan`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ plan }), // 'pro' | 'enterprise' | 'free'
    });
    if (!res.ok) throw new Error("Change plan failed");
    return res.json(); // { user }
  },
};
