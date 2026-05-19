// Dynamic robots.txt served by Vercel. Disallow private routes, allow
// everything else, and point crawlers at the sitemap.
module.exports = (req, res) => {
  const host = req.headers["x-forwarded-host"] || req.headers.host || "ohomart.online";
  const proto = (req.headers["x-forwarded-proto"] || "https").split(",")[0];
  const base = `${proto}://${host}`;

  const body = [
    "User-agent: *",
    "Disallow: /admin",
    "Disallow: /admin/",
    "Disallow: /cart",
    "Disallow: /checkout",
    "Disallow: /order-success",
    "Disallow: /track",
    "Disallow: /my-orders",
    "Disallow: /api",
    "Disallow: /api/",
    "Allow: /",
    "",
    `Sitemap: ${base}/sitemap.xml`,
    "",
  ].join("\n");

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400");
  res.status(200).send(body);
};
