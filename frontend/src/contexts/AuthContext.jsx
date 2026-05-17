import { createContext, useContext, useEffect, useState, useCallback } from "react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const GUEST_ORDERS_KEY = "ohomart_guest_orders_v1";

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
        localStorage.removeItem(GUEST_ORDERS_KEY);
      }
    } catch (e) {
      console.error("link-guest failed:", e?.message || e);
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
    checkAuth();
  }, [checkAuth]);

  const handleGoogleCredential = useCallback(async (credential) => {
    await axios.post(`${API}/auth/google`, { credential }, { withCredentials: true });
    await checkAuth();
  }, [checkAuth]);

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    } catch (e) {
      console.error("logout failed:", e?.message || e);
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin: !!user?.is_admin,
        handleGoogleCredential,
        logout,
        refresh: checkAuth,
        linkGuestOrders,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export const GUEST_ORDERS_STORAGE_KEY = GUEST_ORDERS_KEY;
