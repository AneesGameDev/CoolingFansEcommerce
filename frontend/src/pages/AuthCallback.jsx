import { useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Wind } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refresh } = useAuth();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const hash = location.hash || window.location.hash;
    const m = hash.match(/session_id=([^&]+)/);
    if (!m) {
      navigate("/", { replace: true });
      return;
    }
    const sessionId = m[1];
    (async () => {
      try {
        await axios.post(`${API}/auth/session`, { session_id: sessionId }, { withCredentials: true });
        await refresh();
      } catch (e) {
        console.error("Session exchange failed", e);
      } finally {
        // Clean hash, go home
        window.history.replaceState(null, "", "/");
        navigate("/", { replace: true });
      }
    })();
  }, [location, navigate, refresh]);

  return (
    <div className="min-h-screen bg-[#F0F9FF] flex items-center justify-center">
      <div className="text-center">
        <div className="w-14 h-14 bg-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-spin">
          <Wind className="w-7 h-7 text-white" />
        </div>
        <p className="text-slate-600 font-semibold">Signing you in…</p>
      </div>
    </div>
  );
}
