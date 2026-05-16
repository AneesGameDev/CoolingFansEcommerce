import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { Wind, ShieldCheck, Eye, EyeOff, Mail, KeyRound, ArrowLeft, CheckCircle } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login"); // login | forgot | reset
  const [form, setForm] = useState({ email: "", password: "" });
  const [forgot, setForgot] = useState({ email: "", code: "", new_password: "", new_password_confirm: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await axios.post(`${API}/admin/login`, form);
      localStorage.setItem("adminToken", res.data.token);
      localStorage.setItem("adminEmail", res.data.email);
      localStorage.setItem("adminName", res.data.name);
      navigate("/admin/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid email or password");
    } finally { setLoading(false); }
  };

  const handleForgotSend = async (e) => {
    e.preventDefault();
    setError(""); setSuccess(""); setLoading(true);
    try {
      await axios.post(`${API}/admin/forgot-password`, { email: forgot.email });
      setSuccess("If this email is registered, a 6-digit code has been sent. Check your inbox (and spam folder).");
      setMode("reset");
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to send code");
    } finally { setLoading(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError(""); setSuccess(""); setLoading(true);
    if (forgot.new_password !== forgot.new_password_confirm) {
      setError("Passwords do not match"); setLoading(false); return;
    }
    if (forgot.new_password.length < 8) {
      setError("Password must be at least 8 characters"); setLoading(false); return;
    }
    try {
      await axios.post(`${API}/admin/reset-password`, {
        email: forgot.email, code: forgot.code, new_password: forgot.new_password
      });
      setSuccess("Password updated! You can now log in with your new password.");
      setMode("login");
      setForm({ email: forgot.email, password: "" });
      setForgot({ email: "", code: "", new_password: "", new_password_confirm: "" });
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to reset password");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#F0F9FF] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-sky-400 to-sky-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Wind className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
            CoolBreeze PK
          </h1>
          <p className="text-slate-500 text-sm mt-1">Admin Panel</p>
        </div>

        <div className="bg-white rounded-2xl border border-sky-100 p-6 shadow-sm" data-testid="admin-login-card">
          {mode === "login" && (
            <>
              <div className="flex items-center gap-2 mb-5">
                <ShieldCheck className="w-5 h-5 text-sky-500" />
                <h2 className="font-bold text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>Admin Login</h2>
              </div>
              {error && (<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm" data-testid="login-error">{error}</div>)}
              {success && (<div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm flex items-center gap-2"><CheckCircle className="w-4 h-4" />{success}</div>)}
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="your-email@gmail.com" required
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:bg-white transition-all"
                    data-testid="admin-email-input" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
                  <div className="relative">
                    <input type={showPass ? "text" : "password"} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="••••••••" required
                      className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:bg-white transition-all"
                      data-testid="admin-password-input" />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 rounded-xl transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                  data-testid="admin-login-btn">
                  {loading ? "Signing In..." : "Sign In"}
                </button>
                <button type="button" onClick={() => { setMode("forgot"); setError(""); setSuccess(""); }}
                  className="w-full text-sm text-slate-500 hover:text-sky-600 font-semibold transition-colors flex items-center justify-center gap-1.5"
                  data-testid="forgot-password-link">
                  <KeyRound className="w-3.5 h-3.5" /> Forgot Password?
                </button>
              </form>
            </>
          )}

          {mode === "forgot" && (
            <>
              <div className="flex items-center gap-2 mb-5">
                <Mail className="w-5 h-5 text-sky-500" />
                <h2 className="font-bold text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>Forgot Password</h2>
              </div>
              <p className="text-sm text-slate-500 mb-4">Enter your admin email. We'll send a 6-digit code to reset your password.</p>
              {error && (<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm" data-testid="forgot-error">{error}</div>)}
              <form onSubmit={handleForgotSend} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Admin Email</label>
                  <input type="email" value={forgot.email} onChange={e => setForgot(p => ({ ...p, email: e.target.value }))} placeholder="your-email@gmail.com" required
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:bg-white transition-all"
                    data-testid="forgot-email-input" />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 rounded-xl transition-all active:scale-95 disabled:opacity-70"
                  data-testid="send-code-btn">
                  {loading ? "Sending..." : "Send Reset Code"}
                </button>
                <button type="button" onClick={() => { setMode("login"); setError(""); }}
                  className="w-full text-sm text-slate-500 hover:text-sky-600 font-semibold flex items-center justify-center gap-1.5"
                  data-testid="back-to-login-btn">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
                </button>
              </form>
            </>
          )}

          {mode === "reset" && (
            <>
              <div className="flex items-center gap-2 mb-3">
                <KeyRound className="w-5 h-5 text-sky-500" />
                <h2 className="font-bold text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>Enter Code & New Password</h2>
              </div>
              {success && (<div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm flex items-center gap-2" data-testid="reset-info"><CheckCircle className="w-4 h-4" />{success}</div>)}
              {error && (<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm" data-testid="reset-error">{error}</div>)}
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">6-Digit Code</label>
                  <input type="text" inputMode="numeric" maxLength={6} value={forgot.code}
                    onChange={e => setForgot(p => ({ ...p, code: e.target.value.replace(/\D/g, '') }))}
                    placeholder="123456" required
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-lg font-mono tracking-[0.5em] text-center focus:outline-none focus:ring-2 focus:ring-sky-400 focus:bg-white transition-all"
                    data-testid="reset-code-input" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">New Password</label>
                  <input type="password" value={forgot.new_password}
                    onChange={e => setForgot(p => ({ ...p, new_password: e.target.value }))}
                    placeholder="Min 8 characters" required minLength={8}
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:bg-white transition-all"
                    data-testid="reset-new-password" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Confirm New Password</label>
                  <input type="password" value={forgot.new_password_confirm}
                    onChange={e => setForgot(p => ({ ...p, new_password_confirm: e.target.value }))}
                    placeholder="Re-enter password" required
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:bg-white transition-all"
                    data-testid="reset-confirm-password" />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 rounded-xl transition-all active:scale-95 disabled:opacity-70"
                  data-testid="reset-submit-btn">
                  {loading ? "Updating..." : "Update Password"}
                </button>
                <button type="button" onClick={() => { setMode("forgot"); setError(""); }}
                  className="w-full text-sm text-slate-500 hover:text-sky-600 font-semibold flex items-center justify-center gap-1.5">
                  <ArrowLeft className="w-3.5 h-3.5" /> Resend Code
                </button>
              </form>
            </>
          )}
        </div>

        <div className="text-center mt-4">
          <Link to="/" className="text-sm text-slate-500 hover:text-sky-500 transition-colors">
            ← Back to Shop
          </Link>
        </div>
      </div>
    </div>
  );
}
