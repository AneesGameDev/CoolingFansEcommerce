import { createContext, useContext, useEffect, useState, useCallback } from "react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const GUEST_ORDERS_KEY = "coolbreeze_guest_orders_v1";

axios.defaults.withCredentials = true;

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const linkGuestOrders = useCallback(async () => {
    try {
      const stored = JSON.parse(localStorage.getItem(GUEST_ORDERS_KEY) || "[]");
      if (stored.length === 0) return;
      const r = await axios.post(`${API}/orders/link-guest`, { order_numbers: stored }, { withCredentials: true });
      if (r.data?.linked > 0) {
        // Successfully claimed; clear local cache
        localStorage.removeItem(GUEST_ORDERS_KEY);
      }
    } catch {
      /* non-blocking */
    }
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const r = await axios.get(`${API}/auth/me`, { withCredentials: true });
      setUser(r.data);
      linkGuestOrders();
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [linkGuestOrders]);

  useEffect(() => {
    // CRITICAL: If returning from OAuth callback, skip the /me check.
    // AuthCallback will exchange the session_id and establish the session first.
    if (window.location.hash?.includes("session_id=")) {
      setLoading(false);
      return;
    }
    checkAuth();
  }, [checkAuth]);

  const login = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    } catch {}
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh: checkAuth, linkGuestOrders }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export const GUEST_ORDERS_STORAGE_KEY = GUEST_ORDERS_KEY;
