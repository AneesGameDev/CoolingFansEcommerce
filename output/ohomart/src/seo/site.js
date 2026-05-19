// Centralized site-level constants used by SEO components.
export const SITE = {
  name: "OHo Mart",
  // Default to the production domain; falls back to current origin in browser.
  defaultOrigin: "https://ohomart.online",
  logoPath: "/manifest.json", // used as a stable URL anchor for schemas
};

export function siteOrigin() {
  if (typeof window !== "undefined" && window.location && window.location.origin) {
    return window.location.origin;
  }
  return SITE.defaultOrigin;
}

export function abs(path) {
  if (!path) return siteOrigin();
  if (/^https?:\/\//i.test(path)) return path;
  return `${siteOrigin()}${path.startsWith("/") ? path : "/" + path}`;
}
