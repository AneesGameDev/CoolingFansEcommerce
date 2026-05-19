// Dynamic sitemap.xml served by Vercel. Pulls active products from MongoDB
// and emits a valid XML sitemap. Cached for one hour.
const { getDb } = require("./_lib/db");

const CATEGORIES = [
  "neck-fan", "baby-fan", "desk-fan", "handheld-fan",
  "car-fan", "travel-fan", "tower-fan", "kids-fan",
];

const STATIC_PAGES = [
  { path: "/about", priority: "0.5", changefreq: "monthly" },
  { path: "/contact", priority: "0.5", changefreq: "monthly" },
  { path: "/terms", priority: "0.3", changefreq: "yearly" },
  { path: "/privacy", priority: "0.3", changefreq: "yearly" },
];

function escapeXml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlEntry({ loc, lastmod, changefreq, priority }) {
  const lines = [`  <url>`, `    <loc>${escapeXml(loc)}</loc>`];
  if (lastmod) lines.push(`    <lastmod>${lastmod}</lastmod>`);
  if (changefreq) lines.push(`    <changefreq>${changefreq}</changefreq>`);
  if (priority) lines.push(`    <priority>${priority}</priority>`);
  lines.push(`  </url>`);
  return lines.join("\n");
}

module.exports = async (req, res) => {
  const host = req.headers["x-forwarded-host"] || req.headers.host || "ohomart.online";
  const proto = (req.headers["x-forwarded-proto"] || "https").split(",")[0];
  const base = `${proto}://${host}`;

  let products = [];
  try {
    const db = await getDb();
    products = await db
      .collection("products")
      .find({ is_active: true }, { projection: { _id: 1, updated_at: 1, seo: 1 } })
      .sort({ updated_at: -1 })
      .limit(5000)
      .toArray();
  } catch (e) {
    // If the DB is unreachable, still serve a minimal sitemap so the file
    // never 500s on a crawler.
    products = [];
  }

  const today = new Date().toISOString().slice(0, 10);
  const entries = [];

  entries.push(urlEntry({ loc: `${base}/`, lastmod: today, changefreq: "daily", priority: "1.0" }));

  for (const cat of CATEGORIES) {
    entries.push(urlEntry({
      loc: `${base}/?category=${cat}`,
      lastmod: today,
      changefreq: "weekly",
      priority: "0.7",
    }));
  }

  for (const p of products) {
    const lastmod = (p.updated_at || "").slice(0, 10) || today;
    entries.push(urlEntry({
      loc: `${base}/product/${p._id.toString()}`,
      lastmod,
      changefreq: "weekly",
      priority: "0.9",
    }));
  }

  for (const sp of STATIC_PAGES) {
    entries.push(urlEntry({
      loc: `${base}${sp.path}`,
      lastmod: today,
      changefreq: sp.changefreq,
      priority: sp.priority,
    }));
  }

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    entries.join("\n") +
    `\n</urlset>\n`;

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");
  res.status(200).send(xml);
};
