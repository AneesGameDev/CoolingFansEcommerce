import { useEffect, useState } from "react";
import axios from "axios";
import { Wind, Shield, Star, ChevronRight, Truck, Package, RotateCcw, BadgeCheck, Plane, MessageCircle, Sparkles, Heart, ShieldCheck, Award, Quote, Flame } from "lucide-react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import ProductCard from "../components/ProductCard";
import CoolingFX from "../components/CoolingFX";
import { useSiteSettings } from "../contexts/SiteSettingsContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const WHY_BUY = [
  { icon: Plane, title: "Directly Imported", desc: "Premium-grade fans straight from top factories. No local copies, no shortcuts — only the real thing.", color: "from-sky-400 to-blue-500" },
  { icon: Truck, title: "1-2 Day Delivery", desc: "Lightning-fast nationwide delivery across Pakistan. Free shipping on orders over Rs. 2000.", color: "from-amber-400 to-orange-500" },
  { icon: ShieldCheck, title: "7-Day Check Warranty", desc: "Open the box, test the fan, only pay if you're 100% happy with it.", color: "from-green-400 to-emerald-500" },
  { icon: RotateCcw, title: "Easy Returns", desc: "Not satisfied? No questions asked. Return-back policy active on every order.", color: "from-rose-400 to-pink-500" },
  { icon: BadgeCheck, title: "COD Only", desc: "Pay cash on delivery — no advance payment, no online fraud, total peace of mind.", color: "from-violet-400 to-purple-500" },
  { icon: Award, title: "Quality Guaranteed", desc: "Every fan is tested before dispatch. We stand behind every product we ship.", color: "from-yellow-400 to-amber-500" },
];

export default function HomePage() {
  const settings = useSiteSettings();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/products`)
      .then((r) => setProducts(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    { value: settings.stats_customers_value, label: settings.stats_customers_label, icon: Heart, color: "text-rose-500" },
    { value: settings.stats_orders_value, label: settings.stats_orders_label, icon: Package, color: "text-sky-500" },
    { value: settings.stats_rating_value, label: settings.stats_rating_label, icon: Star, color: "text-amber-500" },
    { value: settings.stats_cities_value, label: settings.stats_cities_label, icon: Truck, color: "text-green-500" },
  ];

  const testimonials = settings.featured_testimonials || [];

  return (
    <div className="min-h-screen bg-[#F0F9FF]">
      <Header />

      {/* Hero Section with cooling animations — compact on mobile so products are visible quickly */}
      <section className="relative overflow-hidden py-8 sm:py-16 lg:py-24 bg-gradient-to-br from-sky-500 via-sky-600 to-cyan-700" data-testid="hero-section">
        <CoolingFX density={18} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 frost-glass text-white px-4 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold mb-3 sm:mb-6 shadow-lg" data-testid="hero-badge">
              <BadgeCheck className="w-4 h-4 fill-current text-amber-300" />
              {settings.hero_badge}
            </div>

            <h1 className="text-2xl sm:text-5xl lg:text-7xl font-black text-white mb-3 sm:mb-6 leading-tight tracking-tight" data-testid="hero-title">
              {settings.hero_title_main}
              <br />
              <span className="shimmer-text inline-block">{settings.hero_title_accent}</span>
            </h1>

            <p className="text-sm sm:text-xl text-sky-100 mb-5 sm:mb-9 leading-relaxed max-w-2xl mx-auto hidden xs:block sm:block" data-testid="hero-subtitle">
              {settings.hero_subtitle}
            </p>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
              <a
                href="#products"
                className="group bg-white text-sky-600 font-bold px-5 sm:px-8 py-2.5 sm:py-4 rounded-full hover:bg-sky-50 transition-all active:scale-95 shadow-2xl inline-flex items-center justify-center gap-2 text-sm sm:text-base"
                data-testid="shop-now-btn"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                {settings.hero_cta_primary}
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
              <a
                href={`https://wa.me/${settings.whatsapp_number || "923000000000"}?text=Hi%20CoolBreeze!%20I%20need%20help%20choosing%20a%20fan.`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-500 hover:bg-green-600 text-white font-bold px-5 sm:px-8 py-2.5 sm:py-4 rounded-full transition-all active:scale-95 inline-flex items-center justify-center gap-2 shadow-xl text-sm sm:text-base"
                data-testid="whatsapp-hero-btn"
              >
                <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                {settings.hero_cta_secondary}
              </a>
            </div>

            {/* Trust Badges — hidden on small mobile to save space */}
            <div className="hidden sm:flex flex-wrap justify-center gap-x-5 gap-y-2 mt-10 text-white/90 text-sm font-medium" data-testid="hero-trust-badges">
              <div className="flex items-center gap-1.5"><Truck className="w-4 h-4 text-amber-300" /> Cash on Delivery</div>
              <div className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-amber-300" /> 7-Day Check Warranty</div>
              <div className="flex items-center gap-1.5"><RotateCcw className="w-4 h-4 text-amber-300" /> Return Back Policy</div>
              <div className="flex items-center gap-1.5"><Package className="w-4 h-4 text-amber-300" /> 1-2 Day Delivery</div>
            </div>
            {/* Mobile-only mini trust ribbon */}
            <div className="flex sm:hidden flex-wrap justify-center gap-x-3 gap-y-1 mt-4 text-white/90 text-[10px] font-bold">
              <span className="flex items-center gap-1"><Truck className="w-3 h-3 text-amber-300" /> COD</span>
              <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-amber-300" /> Warranty</span>
              <span className="flex items-center gap-1"><Package className="w-3 h-3 text-amber-300" /> 1-2 Day Ship</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Strip — hidden on tiny mobile so products come up faster */}
      <section className="hidden sm:block bg-slate-900 text-white py-8 border-y-4 border-amber-400" data-testid="stats-strip">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {stats.map((s, i) => (
              <div key={i} className="flex flex-col items-center gap-1" data-testid={`stat-${i}`}>
                <s.icon className={`w-6 h-6 mb-1 ${s.color}`} />
                <p className="text-2xl sm:text-3xl font-black text-white">{s.value}</p>
                <p className="text-xs sm:text-sm text-slate-400 font-semibold uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mobile-only compact stats row */}
      <section className="sm:hidden bg-slate-900 text-white py-3 border-y-2 border-amber-400">
        <div className="grid grid-cols-4 gap-1 text-center px-2">
          {stats.map((s, i) => (
            <div key={i} className="flex flex-col items-center">
              <p className="text-sm font-black text-white">{s.value}</p>
              <p className="text-[8px] text-slate-400 uppercase tracking-wide leading-tight">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Summer Sale Ticker */}
      <div className="bg-gradient-to-r from-red-500 via-amber-500 to-red-500 text-white py-3 overflow-hidden relative" data-testid="sale-banner">
        <div className="animate-ticker whitespace-nowrap flex">
          {[...Array(2)].map((_, idx) => (
            <div key={idx} className="flex items-center gap-12 px-6">
              <span className="font-black text-sm sm:text-base whitespace-nowrap">{settings.sale_banner_primary}</span>
              <span className="font-bold text-sm whitespace-nowrap">•</span>
              <span className="font-bold text-sm whitespace-nowrap">{settings.sale_banner_secondary}</span>
              <span className="font-bold text-sm whitespace-nowrap">•</span>
              <span className="font-black text-sm sm:text-base whitespace-nowrap">{settings.sale_banner_tertiary}</span>
              <span className="font-bold text-sm whitespace-nowrap">•</span>
            </div>
          ))}
        </div>
      </div>

      {/* Features Strip */}
      <div className="bg-white border-b border-sky-100 py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {[
              { icon: "⚡", title: "Long Battery", desc: "Up to 20 hours" },
              { icon: "🌬️", title: "Turbo Speed", desc: "Real cooling power" },
              { icon: "🔇", title: "Ultra Quiet", desc: "< 35dB whisper mode" },
              { icon: "🏅", title: "Certified Imports", desc: "Premium tested quality" },
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
      <section id="products" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14" data-testid="products-section">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 bg-sky-100 text-sky-700 text-xs font-bold px-4 py-1.5 rounded-full mb-3 uppercase tracking-wider">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            Summer Collection 2024
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }} data-testid="products-title">
            {settings.products_section_title}
          </h2>
          <p className="text-slate-500 mt-3 max-w-xl mx-auto" data-testid="products-subtitle">{settings.products_section_subtitle}</p>
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
      <section className="bg-white border-y border-sky-100 py-16" data-testid="why-buy-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-block bg-amber-100 text-amber-700 text-xs font-bold px-4 py-1.5 rounded-full mb-3 uppercase tracking-wider">
              The CoolBreeze Promise
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }} data-testid="why-buy-title">
              {settings.why_buy_title}
            </h2>
            <p className="text-slate-500 mt-3 max-w-2xl mx-auto" data-testid="why-buy-subtitle">{settings.why_buy_subtitle}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {WHY_BUY.map((b, i) => (
              <div
                key={i}
                className="group bg-gradient-to-br from-sky-50 to-white border border-sky-100 rounded-2xl p-6 hover:shadow-xl hover:border-sky-300 hover:-translate-y-1 transition-all duration-300"
                data-testid={`why-buy-${i}`}
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${b.color} flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-lg`}>
                  <b.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-black text-slate-900 text-lg mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>{b.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Money-Back Guarantee Banner */}
      <section className="relative py-14 overflow-hidden bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500" data-testid="guarantee-section">
        <div className="absolute inset-0 opacity-10">
          {[...Array(8)].map((_, i) => (
            <ShieldCheck key={i} className="absolute text-white" style={{
              width: `${40 + i * 15}px`, height: `${40 + i * 15}px`,
              top: `${(i * 13) % 100}%`, left: `${(i * 17) % 100}%`,
            }} />
          ))}
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center text-white">
          <div className="w-20 h-20 rounded-full bg-white/20 frost-glass flex items-center justify-center mx-auto mb-5 shadow-2xl">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-3xl sm:text-4xl font-black mb-3" style={{ fontFamily: 'Outfit, sans-serif' }} data-testid="guarantee-title">
            {settings.guarantee_title}
          </h3>
          <p className="text-lg text-white/95 max-w-2xl mx-auto leading-relaxed" data-testid="guarantee-text">
            {settings.guarantee_text}
          </p>
        </div>
      </section>

      {/* Testimonials — auto-sliding left-loop carousel */}
      {testimonials.length > 0 && (
        <section className="bg-[#F0F9FF] py-16 overflow-hidden" data-testid="testimonials-section">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <div className="inline-block bg-rose-100 text-rose-700 text-xs font-bold px-4 py-1.5 rounded-full mb-3 uppercase tracking-wider">
                Loved by Pakistan
              </div>
              <h2 className="text-3xl sm:text-5xl font-black text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Real Reviews from Real Homes
              </h2>
              <p className="text-slate-500 mt-3">Verified buyers across Pakistan share their CoolBreeze experience.</p>
            </div>
          </div>
          {/* Continuous left-sliding carousel — duplicates list for seamless loop, pauses on hover */}
          <div className="relative group" data-testid="testimonials-carousel">
            <div
              className="flex gap-5 w-max animate-slide-left group-hover:[animation-play-state:paused]"
              style={{ animationDuration: `${Math.max(20, testimonials.length * 7)}s` }}
            >
              {[...testimonials, ...testimonials].map((t, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl p-6 border border-sky-100 hover:shadow-xl transition-all relative w-[300px] sm:w-[360px] flex-shrink-0"
                  data-testid={`testimonial-${i % testimonials.length}`}
                >
                  <Quote className="absolute top-4 right-4 w-8 h-8 text-sky-100" />
                  <div className="flex items-center gap-3 mb-4">
                    {t.avatar ? (
                      <img src={t.avatar} alt={t.name} className="w-12 h-12 rounded-full object-cover border-2 border-sky-100" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-400 to-cyan-500 flex items-center justify-center text-white font-bold">
                        {(t.name || "?").charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="font-black text-slate-900">{t.name}</p>
                      <p className="text-xs text-slate-500">{t.city}{t.date ? ` • ${t.date}` : ""}</p>
                    </div>
                  </div>
                  <div className="flex gap-0.5 mb-2">
                    {[...Array(t.rating || 5)].map((_, j) => <Star key={j} className="w-4 h-4 text-amber-400 fill-amber-400" />)}
                  </div>
                  <p className="text-slate-700 text-sm leading-relaxed italic">"{t.quote}"</p>
                </div>
              ))}
            </div>
            {/* Edge fades */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#F0F9FF] to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#F0F9FF] to-transparent" />
          </div>
        </section>
      )}

      {/* Founder Quote Section */}
      <section className="bg-slate-900 py-16 relative overflow-hidden" data-testid="founder-section">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-sky-500 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <Quote className="w-12 h-12 text-amber-400 mx-auto mb-5" />
          <p className="text-xl sm:text-2xl text-white leading-relaxed font-medium mb-6" style={{ fontFamily: 'Outfit, sans-serif' }} data-testid="founder-quote">
            "{settings.founder_quote}"
          </p>
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-400 to-cyan-500 flex items-center justify-center">
              <Wind className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <p className="font-black text-white" data-testid="founder-name">{settings.founder_name}</p>
              {settings.founder_role && <p className="text-sm text-amber-300" data-testid="founder-role">{settings.founder_role}</p>}
            </div>
          </div>
        </div>
      </section>

      {/* WhatsApp CTA Section */}
      <section className="bg-green-50 border-y border-green-100 py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mb-3" style={{ fontFamily: 'Outfit, sans-serif' }} data-testid="whatsapp-cta-title">
            {settings.whatsapp_cta_title}
          </h3>
          <p className="text-slate-600 mb-5" data-testid="whatsapp-cta-subtitle">{settings.whatsapp_cta_subtitle}</p>
          <a
            href={`https://wa.me/${settings.whatsapp_number || "923000000000"}?text=Hi%20CoolBreeze!%20I%20need%20help%20choosing%20the%20right%20fan.`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold px-8 py-3.5 rounded-full transition-all shadow-lg hover:shadow-xl active:scale-95"
            data-testid="whatsapp-cta-btn"
          >
            <MessageCircle className="w-5 h-5" />
            Chat on WhatsApp
          </a>
          <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-center text-sm">
            <Link to="/track" className="text-slate-600 hover:text-sky-600 font-semibold underline-offset-4 hover:underline">Track Your Order →</Link>
            <span className="text-slate-300 hidden sm:inline">|</span>
            <a href="#products" className="text-slate-600 hover:text-sky-600 font-semibold underline-offset-4 hover:underline">Browse All Fans →</a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-br from-sky-400 to-sky-600 rounded-xl flex items-center justify-center">
                <Wind className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-white font-black text-lg" style={{ fontFamily: 'Outfit, sans-serif' }}>{settings.brand_name}</span>
                <p className="text-xs text-amber-300 font-semibold">{settings.brand_tagline}</p>
              </div>
            </div>
            <p className="text-sm text-center" data-testid="footer-tagline">{settings.footer_tagline}</p>
            <p className="text-sm">&copy; 2024 {settings.brand_name}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
