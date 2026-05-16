import { useEffect, useState } from "react";
import axios from "axios";
import { Wind, Zap, Shield, Star, ChevronRight, Truck, Package, RotateCcw, BadgeCheck, Plane, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import ProductCard from "../components/ProductCard";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const WHY_BUY = [
  { icon: Plane, title: "Directly Imported", desc: "Premium-grade imported fans, not local copies. Real quality, real performance.", color: "from-sky-400 to-blue-500" },
  { icon: Truck, title: "1-2 Day Delivery", desc: "Lightning-fast nationwide delivery across Pakistan. Free shipping on orders over Rs. 2000.", color: "from-amber-400 to-orange-500" },
  { icon: Shield, title: "7-Day Check Warranty", desc: "Open the box, test the fan, only pay if you're 100% happy.", color: "from-green-400 to-emerald-500" },
  { icon: RotateCcw, title: "Easy Returns", desc: "Not satisfied? No questions asked. Return-back policy active for every order.", color: "from-rose-400 to-pink-500" },
  { icon: BadgeCheck, title: "COD Only", desc: "Pay cash on delivery — no advance payment, no online fraud risk.", color: "from-violet-400 to-purple-500" },
  { icon: Zap, title: "Long Battery", desc: "Rechargeable fans with up to 20-hour battery, perfect for load-shedding.", color: "from-yellow-400 to-amber-500" },
];

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/products`)
      .then((r) => setProducts(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#F0F9FF]">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden hero-gradient py-14 sm:py-20" data-testid="hero-section">
        <div className="absolute inset-0 opacity-10">
          {[...Array(6)].map((_, i) => (
            <Wind
              key={i}
              className="absolute text-white"
              style={{ width: `${40 + i * 20}px`, height: `${40 + i * 20}px`, top: `${10 + i * 15}%`, left: `${5 + i * 16}%`, transform: `rotate(${i * 30}deg)`, opacity: 0.5 }}
            />
          ))}
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-4 py-1.5 rounded-full text-sm font-semibold mb-5 border border-white/30">
              <BadgeCheck className="w-4 h-4 fill-current" />
              Pakistan's #1 Imported Fan Store
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-5 leading-tight" data-testid="hero-title">
              Beat the Heat with
              <br />
              <span className="text-amber-300">Premium Quality</span>
            </h1>

            <p className="text-lg sm:text-xl text-sky-100 mb-8 leading-relaxed">
              Directly imported neck fans, baby fans & travel fans — long battery, 7-day warranty, Cash on Delivery!
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="#products"
                className="bg-white text-sky-600 font-bold px-8 py-3.5 rounded-full hover:bg-sky-50 transition-all active:scale-95 shadow-lg inline-flex items-center justify-center gap-2"
                data-testid="shop-now-btn"
              >
                Shop Summer Sale
                <ChevronRight className="w-4 h-4" />
              </a>
              <a
                href="https://wa.me/923000000000?text=Hi%20CoolBreeze!%20I%20need%20help%20choosing%20a%20fan."
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-400 hover:bg-green-500 text-white font-bold px-8 py-3.5 rounded-full transition-all active:scale-95 inline-flex items-center justify-center gap-2"
                data-testid="whatsapp-hero-btn"
              >
                <MessageCircle className="w-5 h-5" />
                Chat on WhatsApp
              </a>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-8 text-white/90 text-sm">
              <div className="flex items-center gap-1.5"><Truck className="w-4 h-4" /> Cash on Delivery</div>
              <div className="flex items-center gap-1.5"><Shield className="w-4 h-4" /> 7-Day Check Warranty</div>
              <div className="flex items-center gap-1.5"><RotateCcw className="w-4 h-4" /> Return Back Policy</div>
              <div className="flex items-center gap-1.5"><Package className="w-4 h-4" /> Delivery in 1-2 Days</div>
            </div>
          </div>
        </div>
      </section>

      {/* Summer Sale Banner */}
      <div className="bg-gradient-to-r from-red-500 to-amber-500 text-white py-3 overflow-hidden" data-testid="sale-banner">
        <div className="flex animate-pulse items-center justify-center gap-8 flex-wrap px-4">
          <span className="font-black text-sm sm:text-base whitespace-nowrap">🌡️ SUMMER SALE — UP TO 80% OFF</span>
          <span className="font-bold text-sm whitespace-nowrap">FREE DELIVERY on orders over Rs. 2000</span>
          <span className="font-black text-sm sm:text-base whitespace-nowrap">Limited Stock!</span>
        </div>
      </div>

      {/* Features Strip */}
      <div className="bg-white border-y border-sky-100 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {[
              { icon: "⚡", title: "Long Battery", desc: "Up to 20 hours" },
              { icon: "🌬️", title: "High Speed", desc: "Turbo Mode" },
              { icon: "🔇", title: "Ultra Quiet", desc: "< 35dB noise" },
              { icon: "🏅", title: "Import Quality", desc: "Certified products" },
            ].map((f, i) => (
              <div key={i} className="flex flex-col items-center gap-1 p-2">
                <span className="text-2xl">{f.icon}</span>
                <p className="font-bold text-slate-800 text-sm">{f.title}</p>
                <p className="text-xs text-slate-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Products Section */}
      <section id="products" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" data-testid="products-section">
        <div className="text-center mb-8">
          <div className="inline-block bg-sky-100 text-sky-700 text-xs font-bold px-4 py-1.5 rounded-full mb-3 uppercase tracking-wider">
            Summer Collection 2024
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Our Fan Collection
          </h2>
          <p className="text-slate-500 mt-2">10 premium imported fans — all with Summer discounts!</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4" data-testid="products-loading">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-sky-100 overflow-hidden animate-pulse">
                <div className="aspect-square bg-slate-100" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-3/4" />
                  <div className="h-4 bg-slate-100 rounded w-1/2" />
                  <div className="h-8 bg-slate-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4" data-testid="products-grid">
            {products.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* Why Buy With Us */}
      <section className="bg-white border-y border-sky-100 py-14" data-testid="why-buy-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="inline-block bg-amber-100 text-amber-700 text-xs font-bold px-4 py-1.5 rounded-full mb-3 uppercase tracking-wider">
              Why CoolBreeze PK
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Why Buy With Us?
            </h2>
            <p className="text-slate-500 mt-2 max-w-2xl mx-auto">We import premium fans directly — no middlemen, no compromises. Just real quality at the best Pakistani prices.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {WHY_BUY.map((b, i) => (
              <div
                key={i}
                className="group bg-gradient-to-br from-sky-50 to-white border border-sky-100 rounded-2xl p-5 hover:shadow-lg hover:border-sky-200 transition-all"
                data-testid={`why-buy-${i}`}
              >
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${b.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <b.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-black text-slate-900 mb-1.5" style={{ fontFamily: 'Outfit, sans-serif' }}>{b.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/track"
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-7 py-3 rounded-full transition-all active:scale-95 inline-flex items-center justify-center gap-2"
              data-testid="cta-track"
            >
              <Package className="w-4 h-4" /> Track Your Order
            </Link>
            <a
              href="#products"
              className="bg-sky-500 hover:bg-sky-600 text-white font-bold px-7 py-3 rounded-full transition-all active:scale-95 inline-flex items-center justify-center gap-2"
            >
              Browse All Fans <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* WhatsApp CTA Section */}
      <section className="bg-green-50 border-y border-green-100 py-10">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mb-3" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Need Help Choosing?
          </h3>
          <p className="text-slate-600 mb-5">Chat with us directly on WhatsApp. Our team will help you pick the perfect fan.</p>
          <a
            href="https://wa.me/923000000000?text=Hi%20CoolBreeze!%20I%20need%20help%20choosing%20the%20right%20fan."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold px-8 py-3.5 rounded-full transition-all shadow-lg hover:shadow-xl active:scale-95"
            data-testid="whatsapp-cta-btn"
          >
            <MessageCircle className="w-5 h-5" />
            Chat on WhatsApp
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 mt-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
                <Wind className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>CoolBreeze PK</span>
            </div>
            <p className="text-sm text-center">Pakistan's #1 Imported Fan Store • Cash on Delivery • WhatsApp: +92-300-0000000</p>
            <p className="text-sm">&copy; 2024 CoolBreeze PK</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
