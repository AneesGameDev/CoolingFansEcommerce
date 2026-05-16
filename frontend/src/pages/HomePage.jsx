import { useEffect, useState } from "react";
import axios from "axios";
import { Wind, Zap, Shield, Star, ChevronRight, Truck } from "lucide-react";
import Header from "../components/Header";
import ProductCard from "../components/ProductCard";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/products`)
      .then(r => setProducts(r.data))
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
              <Zap className="w-4 h-4 fill-current" />
              Summer Sale 2024 — Up to 80% OFF!
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-5 leading-tight" data-testid="hero-title">
              Stay Cool This
              <br />
              <span className="text-amber-300">Summer Season</span>
            </h1>

            <p className="text-lg sm:text-xl text-sky-100 mb-8 leading-relaxed">
              Premium portable fans — Neck fans, Baby fans &amp; Travel fans with long battery life. Cash on Delivery available!
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="#products"
                className="bg-white text-sky-600 font-bold px-8 py-3.5 rounded-full hover:bg-sky-50 transition-all active:scale-95 shadow-lg inline-flex items-center justify-center gap-2"
                data-testid="shop-now-btn"
              >
                Shop Now
                <ChevronRight className="w-4 h-4" />
              </a>
              <a
                href="https://wa.me/923000000000?text=Hi%20CoolBreeze!%20I%20need%20help%20choosing%20a%20fan."
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-400 hover:bg-green-500 text-white font-bold px-8 py-3.5 rounded-full transition-all active:scale-95 inline-flex items-center justify-center gap-2"
                data-testid="whatsapp-hero-btn"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Chat on WhatsApp
              </a>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap justify-center gap-4 mt-8 text-white/80 text-sm">
              <div className="flex items-center gap-1.5"><Truck className="w-4 h-4" /> Cash on Delivery</div>
              <div className="flex items-center gap-1.5"><Shield className="w-4 h-4" /> 7-Day Return</div>
              <div className="flex items-center gap-1.5"><Star className="w-4 h-4 fill-current text-amber-300" /> 4.8/5 Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* Summer Sale Banner */}
      <div className="bg-gradient-to-r from-red-500 to-amber-500 text-white py-3 overflow-hidden" data-testid="sale-banner">
        <div className="flex animate-pulse items-center justify-center gap-8 flex-wrap px-4">
          <span className="font-black text-sm sm:text-base whitespace-nowrap">🌡️ SUMMER SALE</span>
          <span className="font-bold text-sm whitespace-nowrap">FREE DELIVERY on orders above Rs. 2000</span>
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
          <p className="text-slate-500 mt-2">10 premium fans — all with Summer discounts!</p>
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
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
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
            <p className="text-sm text-center">Cash on Delivery | WhatsApp: +92-300-0000000 | Pakistan</p>
            <p className="text-sm">&copy; 2024 CoolBreeze PK. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
