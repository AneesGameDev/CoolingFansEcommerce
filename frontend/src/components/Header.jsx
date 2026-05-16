import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Wind, Menu, X, ShieldCheck } from "lucide-react";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-sky-100 shadow-sm" data-testid="site-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group" data-testid="header-logo">
            <div className="w-9 h-9 bg-sky-500 rounded-xl flex items-center justify-center group-hover:bg-sky-600 transition-colors">
              <Wind className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-black text-xl text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
                CoolBreeze
              </span>
              <span className="text-sky-500 font-black text-xl" style={{ fontFamily: 'Outfit, sans-serif' }}> PK</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-slate-600 hover:text-sky-500 font-medium transition-colors" data-testid="nav-home">Home</Link>
            <Link to="/#products" className="text-slate-600 hover:text-sky-500 font-medium transition-colors" data-testid="nav-products">Products</Link>
            <a
              href="https://wa.me/923000000000?text=Hi%20CoolBreeze!%20I%20want%20to%20know%20more%20about%20your%20fans."
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 hover:text-green-500 font-medium transition-colors"
              data-testid="nav-whatsapp"
            >
              WhatsApp
            </a>
          </nav>

          {/* Admin + Mobile Menu */}
          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              className="hidden sm:flex items-center gap-1.5 bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-sky-600 px-4 py-2 rounded-full font-semibold text-sm transition-all border border-transparent hover:border-sky-200"
              data-testid="admin-panel-btn"
            >
              <ShieldCheck className="w-4 h-4" />
              Admin Panel
            </Link>

            {/* Summer Sale Badge */}
            <div className="hidden md:flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1.5 rounded-full text-xs font-bold">
              Summer Sale - Up to 80% OFF
            </div>

            <button
              className="md:hidden p-2 text-slate-600 hover:text-sky-500"
              onClick={() => setMenuOpen(!menuOpen)}
              data-testid="mobile-menu-btn"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-sky-100 py-3 space-y-2 animate-fade-in" data-testid="mobile-menu">
            <Link to="/" className="block px-4 py-2 text-slate-700 hover:text-sky-500 font-medium" onClick={() => setMenuOpen(false)}>Home</Link>
            <Link to="/#products" className="block px-4 py-2 text-slate-700 hover:text-sky-500 font-medium" onClick={() => setMenuOpen(false)}>Products</Link>
            <a
              href="https://wa.me/923000000000?text=Hi%20CoolBreeze!%20I%20want%20to%20know%20more%20about%20your%20fans."
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-2 text-green-600 font-medium"
            >
              WhatsApp Chat
            </a>
            <Link to="/admin" className="block px-4 py-2 text-slate-600 font-medium" onClick={() => setMenuOpen(false)}>
              Admin Panel
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
