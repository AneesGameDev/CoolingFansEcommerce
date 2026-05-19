// Auto-generated SEO defaults for products: title, description, slug,
// image alt text. All strings are written to read like a human wrote them,
// never use spam phrases, never use the double-dash sequence, never use
// em dashes, en dashes, or smart quotes. ASCII straight characters only.

const SPAM_WORDS = [
  "best price",
  "lowest price",
  "cheapest",
  "number one",
  "#1",
  "guaranteed",
  "instant",
  "limited time",
  "act now",
  "click here",
  "buy now",
];

// Stable hash over a string so two products always get the same pattern.
function hashStr(s) {
  let h = 0;
  const str = String(s || "");
  for (let i = 0; i < str.length; i += 1) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function stripSpamPhrases(text) {
  if (!text) return "";
  let out = text;
  SPAM_WORDS.forEach((w) => {
    const re = new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    out = out.replace(re, "");
  });
  return out;
}

// Replace fancy punctuation with plain ASCII equivalents so AI text signals
// never leak into Google's index.
export function sanitizePunct(text) {
  if (!text) return "";
  return String(text)
    .replace(/\u2014/g, ", ") // em dash
    .replace(/\u2013/g, ", ") // en dash
    .replace(/[\u2018\u2019]/g, "'") // smart single quotes
    .replace(/[\u201C\u201D]/g, '"') // smart double quotes
    .replace(/\u2026/g, "...") // ellipsis
    .replace(/!+/g, ".") // strip exclamations
    .replace(/-{2,}/g, " ") // any run of dashes
    .replace(/\s+/g, " ")
    .trim();
}

// Truncate at a word boundary, never mid-word. Adds nothing on the end
// (no ellipsis) because Google trims tails on its own.
export function truncateAtWord(text, max) {
  const t = (text || "").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim();
}

// Extract a short, human-feeling sentence fragment from a long description.
function firstSentenceFragment(desc, max = 90) {
  if (!desc) return "";
  const clean = sanitizePunct(desc);
  const firstStop = clean.search(/[.!?]/);
  const piece = firstStop > 20 ? clean.slice(0, firstStop) : clean.slice(0, max);
  return truncateAtWord(piece, max).replace(/[,;:\s]+$/, "");
}

function readableCategory(cat) {
  if (!cat) return "fan";
  return String(cat).replace(/-/g, " ").toLowerCase();
}

// Title patterns (3 variants, rotated by product id hash). Each ends with
// "| OHo Mart" and stays inside 60 characters after truncation.
const TITLE_PATTERNS = [
  (p) => `${p.name} in Pakistan | OHo Mart`,
  (p) => `${p.name} | Online with COD | OHo Mart`,
  (p) => `${p.name} | Buy from OHo Mart`,
];

export function autoSeoTitle(product) {
  const idx = hashStr(product.id || product.name) % TITLE_PATTERNS.length;
  const raw = sanitizePunct(TITLE_PATTERNS[idx](product));
  return truncateAtWord(raw, 60);
}

// Description patterns (4 variants, rotated by product id hash). Each stays
// inside 160 characters after truncation, ends on a word boundary, uses
// straight punctuation only.
const DESC_PATTERNS = [
  (p) => `${p.name} for daily use in Pakistan. ${firstSentenceFragment(p.description, 70)}. Order online with cash on delivery.`,
  (p) => `Looking for a ${readableCategory(p.category)}? ${p.name} offers ${firstSentenceFragment(p.description, 55)}. Free delivery across Pakistan with 7 day warranty.`,
  (p) => `${p.name}: ${firstSentenceFragment(p.description, 70)}. Trusted by buyers across Pakistan. Cash on delivery available.`,
  (p) => `Shop ${p.name} from OHo Mart. ${firstSentenceFragment(p.description, 70)}. Quick delivery and easy returns within Pakistan.`,
];

export function autoSeoDescription(product) {
  // Prefer admin-written short_description when available.
  if (product.short_description && product.short_description.trim().length >= 40) {
    const cleaned = stripSpamPhrases(sanitizePunct(product.short_description));
    return truncateAtWord(cleaned, 160);
  }
  const idx = hashStr(product.id || product.name) % DESC_PATTERNS.length;
  const raw = sanitizePunct(stripSpamPhrases(DESC_PATTERNS[idx](product)));
  return truncateAtWord(raw, 160);
}

const STOPWORDS = new Set(["the", "a", "an", "of", "for"]);

export function slugify(input, { dropStopwords = false } = {}) {
  let s = sanitizePunct(input || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (dropStopwords) {
    s = s.split("-").filter((w) => !STOPWORDS.has(w)).join("-");
  }
  return s;
}

export function autoSlug(product) {
  let s = slugify(product.name);
  if (s.length > 60) s = slugify(product.name, { dropStopwords: true });
  if (s.length > 60) s = s.slice(0, 60).replace(/-[^-]*$/, "");
  if (s.length === 0 && product.id) s = `product-${String(product.id).slice(-8)}`;
  return s;
}

// Image alt text. First image uses product name only; variant images include
// the color name; remaining images get a numeric angle.
export function autoImageAlt(product, imageIndex, variant) {
  const name = sanitizePunct(product.name || "Product");
  if (variant) return `${name} ${sanitizePunct(variant)}`.trim();
  if (imageIndex === 0) return name;
  return `${name} angle ${imageIndex + 1}`;
}

// Resolve the SEO data for a product, respecting manual overrides stored
// under product.seo when present.
export function resolveProductSeo(product) {
  const seo = product.seo || {};
  return {
    title: seo.title && seo.title.trim() ? truncateAtWord(sanitizePunct(seo.title), 60) : autoSeoTitle(product),
    description:
      seo.description && seo.description.trim()
        ? truncateAtWord(sanitizePunct(seo.description), 160)
        : autoSeoDescription(product),
    slug: seo.slug && seo.slug.trim() ? slugify(seo.slug) : autoSlug(product),
    ogImage:
      (seo.og_image && seo.og_image.trim()) ||
      (product.images && product.images[0]) ||
      "",
    brand: (seo.brand_name && seo.brand_name.trim()) || "OHo Mart",
    robots: (seo.robots && seo.robots.trim()) || "index, follow",
    focusKeyword: seo.focus_keyword || "",
  };
}
