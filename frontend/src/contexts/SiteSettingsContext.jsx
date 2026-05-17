import { createContext, useContext, useEffect, useState, useCallback } from "react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const FALLBACK = {
  brand_name: "OHo Mart",
  brand_tagline: "Beat the Heat with Premium Quality",
  hero_badge: "Pakistan's #1 Imported Fan Store",
  hero_title_main: "Beat the Heat with",
  hero_title_accent: "Premium Quality",
  hero_subtitle: "Premium portable fans — long battery, 7-day warranty, Cash on Delivery!",
  hero_cta_primary: "Shop Summer Sale",
  hero_cta_secondary: "Chat on WhatsApp",
  sale_banner_primary: "🌡️ SUMMER SALE — UP TO 80% OFF",
  sale_banner_secondary: "FREE DELIVERY on orders over Rs. 2000",
  sale_banner_tertiary: "Limited Stock!",
  why_buy_title: "Why Buy With Us?",
  why_buy_subtitle: "Imported quality, real cooling.",
  products_section_title: "Our Fan Collection",
  products_section_subtitle: "Premium imported fans on sale.",
  stats_customers_value: "50,000+", stats_customers_label: "Happy Customers",
  stats_orders_value: "12,000+", stats_orders_label: "Orders Delivered",
  stats_rating_value: "4.9/5", stats_rating_label: "Customer Rating",
  stats_cities_value: "100+", stats_cities_label: "Cities Served",
  founder_quote: "Real cooling for real homes.", founder_name: "Team OHo Mart", founder_role: "",
  guarantee_title: "100% Satisfaction Guarantee",
  guarantee_text: "Test it, love it, or send it back.",
  whatsapp_cta_title: "Need Help?", whatsapp_cta_subtitle: "Chat with us on WhatsApp.",
  footer_tagline: "Pakistan's #1 Imported Fan Store",
  featured_testimonials: [],
  trust_badges: [],
};

const SiteSettingsContext = createContext(FALLBACK);

export function SiteSettingsProvider({ children }) {
  const [settings, setSettings] = useState(FALLBACK);

  const refresh = useCallback(() => {
    axios.get(`${API}/site-settings`).then((r) => {
      setSettings({ ...FALLBACK, ...r.data });
    }).catch(() => {});
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <SiteSettingsContext.Provider value={{ ...settings, refresh, setSettings }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export const useSiteSettings = () => useContext(SiteSettingsContext);
