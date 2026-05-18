import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Wind, Menu, X, ShieldCheck, ShoppingBag, User, LogOut, Package, ChevronDown } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { useSiteSettings } from "../contexts/SiteSettingsContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "./ui/dropdown-menu";
import GoogleLoginButton from "./GoogleLoginButton";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, isAdmin, logout } = useAuth();
  const { totalQty, setOpen: openCart } = useCart();
  const { whatsapp_number } = useSiteSettings();
  const waPhone = whatsapp_number || "923000000000";

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-sky-100 shadow-sm" data-testid="site-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 group flex-shrink-0" data-testid="header-logo">
            <div className="w-9 h-9 bg-gradient-to-br from-sky-400 to-sky-600 rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform">
              <Wind className="w-5 h-5 text-white" />
            </div>
            <div className="hidden xs:block">
              <span className="font-black text-lg sm:text-xl text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
                OHo
              </span>
              <span className="text-sky-500 font-black text-lg sm:text-xl" style={{ fontFamily: 'Outfit, sans-serif' }}> Mart</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-5">
            <Link to="/" className="text-slate-600 hover:text-sky-500 font-medium transition-colors" data-testid="nav-home">Home</Link>
            <Link to="/#products" className="text-slate-600 hover:text-sky-500 font-medium transition-colors" data-testid="nav-products">Products</Link>
            <Link to="/track" className="text-slate-600 hover:text-sky-500 font-medium transition-colors" data-testid="nav-track">Track Order</Link>
            <a
              href={`https://wa.me/${waPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 hover:text-green-500 font-medium transition-colors"
              data-testid="nav-whatsapp"
            >
              WhatsApp
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => openCart(true)}
              className="relative p-2 sm:px-3 sm:py-2 bg-sky-50 hover:bg-sky-100 rounded-full text-sky-700 transition-all"
              data-testid="cart-icon-btn"
              aria-label="Open cart"
            >
              <ShoppingBag className="w-5 h-5" />
              {totalQty > 0 && (
                <span
                  className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-black rounded-full min-w-[22px] h-[22px] flex items-center justify-center px-1 shadow-md shadow-red-300 ring-2 ring-white animate-bounce"
                  data-testid="cart-badge"
                  style={{ animationDuration: "0.8s", animationIterationCount: 3 }}
                >
                  {totalQty > 99 ? "99+" : totalQty}
                </span>
              )}
            </button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 bg-white border border-sky-200 hover:bg-sky-50 px-2 py-1.5 rounded-full transition-all" data-testid="user-menu-btn">
                    {user.picture ? (
                      <img src={user.picture} alt={user.name} className="w-7 h-7 rounded-full object-cover" referrerPolicy="no-referrer" crossOrigin="anonymous" />
                    ) : (
                      <div className="w-7 h-7 bg-sky-100 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-sky-600" />
                      </div>
                    )}
                    <span className="hidden sm:inline text-sm font-semibold text-slate-700 max-w-[120px] truncate">{user.name || user.email}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500 hidden sm:block" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5 border-b border-slate-100 mb-1">
                    <p className="text-xs text-slate-400">Signed in as</p>
                    <p className="text-sm font-semibold text-slate-900 truncate">{user.name || user.email}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  </div>
                  <DropdownMenuItem onClick={() => navigate("/my-orders")} data-testid="menu-my-orders">
                    <Package className="w-4 h-4 mr-2" /> My Orders
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/track")} data-testid="menu-track-order">
                    <ShieldCheck className="w-4 h-4 mr-2" /> Track Order
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} data-testid="menu-logout" className="text-red-600">
                    <LogOut className="w-4 h-4 mr-2" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden sm:block" data-testid="google-login-slot">
                <GoogleLoginButton />
              </div>
            )}

            {user && isAdmin && (
              <Link
                to="/admin"
                className="hidden lg:flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3 py-2 rounded-full font-semibold text-xs transition-all border border-amber-400/50"
                data-testid="admin-panel-btn"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                Admin Panel
              </Link>
            )}

            <button
              className="md:hidden p-2 text-slate-600 hover:text-sky-500"
              onClick={() => setMenuOpen(!menuOpen)}
              data-testid="mobile-menu-btn"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-sky-100 py-3 space-y-1 animate-fade-in" data-testid="mobile-menu">
            <Link to="/" className="block px-4 py-2 text-slate-700 hover:text-sky-500 font-medium" onClick={() => setMenuOpen(false)}>Home</Link>
            <Link to="/#products" className="block px-4 py-2 text-slate-700 hover:text-sky-500 font-medium" onClick={() => setMenuOpen(false)}>Products</Link>
            <Link to="/track" className="block px-4 py-2 text-slate-700 hover:text-sky-500 font-medium" onClick={() => setMenuOpen(false)}>Track Order</Link>
            {user && (
              <Link to="/my-orders" className="block px-4 py-2 text-slate-700 hover:text-sky-500 font-medium" onClick={() => setMenuOpen(false)}>My Orders</Link>
            )}
            <a
              href={`https://wa.me/${waPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-2 text-green-600 font-medium"
            >
              WhatsApp Chat
            </a>
            {!user && (
              <div className="px-4 py-2" data-testid="mobile-google-login">
                <GoogleLoginButton />
              </div>
            )}
            {user && isAdmin && (
              <Link to="/admin" className="block px-4 py-2 text-slate-900 font-bold flex items-center gap-2" onClick={() => setMenuOpen(false)} data-testid="mobile-admin-link">
                <ShieldCheck className="w-4 h-4 text-amber-500" /> Admin Panel
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
