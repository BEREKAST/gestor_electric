import { useEffect, useMemo, useState } from "react";
import storage from "../../../shared/lib/storage.js";
import AuthCtx from "./AuthCtx.js";
import { AuthAPI } from "../../../shared/lib/api.js";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => storage.get("user") || null);
  const [loading, setLoading] = useState(true);

  // Rehidratar sesión desde cookie httpOnly al montar
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { user } = await AuthAPI.me();
        if (mounted) setUser(user || null);
      } catch {
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Persistencia local
  useEffect(() => {
    if (user) storage.set("user", user);
    else storage.remove("user");
  }, [user]);

  async function login({ email, password }) {
    await AuthAPI.login({ email, password });
    const { user } = await AuthAPI.me();
    setUser(user || null);
  }

  // ✅ ya NO enviamos plan; backend lo fija a 'free'
  async function register({ name, email, password, role }) {
    await AuthAPI.register({ name, email, password, role });
    const { user } = await AuthAPI.me();
    setUser(user || null);
  }

  async function logout() {
    await AuthAPI.logout();
    setUser(null);
  }

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
