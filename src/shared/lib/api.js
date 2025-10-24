// src/shared/lib/api.js
import http from "./http";

/* ====== SELLER API ====== */
export const SellerAPI = {
  taxes: () => http.get("/seller/taxes"),
  addTax: (data) => http.post("/seller/taxes", data),
  delTax: (id) => http.del(`/seller/taxes/${id}`),
  finance: () => http.get("/seller/finance"),
  analytics: () => http.get("/seller/analytics/summary"),
};

/* ====== ORDERS API ====== */
export const OrdersAPI = {
  checkout: (payload) => http.post("/checkout", payload),
  list: () => http.get("/orders"),
  detail: (id) => http.get(`/orders/${id}`),
  stats: () => http.get("/orders/stats"),
};

/* ====== AUTH API (cookies httpOnly + JWT backend) ====== */
const AUTH_BASE = import.meta.env.VITE_AUTH_URL ?? "http://localhost:3001";

export const AuthAPI = {
  /** Registro de nuevo usuario → plan 'free' fijo en backend */
  async register(payload) {
    const res = await fetch(`${AUTH_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload), // { name, email, password, role }
    });
    if (!res.ok) throw new Error("Register failed");
    return res.json(); // { user }
  },

  /** Login → genera cookie JWT */
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

  /** Obtener usuario autenticado desde cookie */
  async me() {
    const res = await fetch(`${AUTH_BASE}/auth/me`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Me failed");
    return res.json(); // { user } | { user:null }
  },

  /** Logout → limpia cookie JWT */
  async logout() {
    const res = await fetch(`${AUTH_BASE}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) throw new Error("Logout failed");
    return res.json(); // { ok:true }
  },

  /** ✅ Actualizar plan de usuario (free | pro | enterprise) */
  async updatePlan(plan) {
    const res = await fetch(`${AUTH_BASE}/auth/plan`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ plan }),
    });
    if (!res.ok) throw new Error("Update plan failed");
    return res.json(); // { user }
  },
};
