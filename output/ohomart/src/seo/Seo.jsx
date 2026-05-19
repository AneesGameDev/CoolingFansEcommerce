// Shared SEO meta-tag component. Drop it into any page and pass props.
// Title/description are sanitized and truncated to the SEO-safe lengths.
import { Helmet } from "react-helmet-async";
import { useLocale } from "./useLocale";
import { sanitizePunct, truncateAtWord } from "./seoDefaults";

const SITE_NAME = "OHo Mart";

function absoluteUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const origin =
    (typeof window !== "undefined" && window.location && window.location.origin) ||
    "https://ohomart.online";
  return `${origin}${path.startsWith("/") ? path : "/" + path}`;
}

function stripQuery(url) {
  if (!url) return "";
  return url.split("?")[0].split("#")[0];
}

export default function Seo({
  title,
  description,
  canonicalPath,
  ogImage,
  ogType = "website",
  robots = "index, follow",
  jsonLd,
}) {
  const { lang, ogLocale } = useLocale();
  const safeTitle = truncateAtWord(sanitizePunct(title || SITE_NAME), 60);
  const safeDesc = truncateAtWord(sanitizePunct(description || ""), 160);
  const canonical = stripQuery(absoluteUrl(canonicalPath || (typeof window !== "undefined" ? window.location.pathname : "/")));
  const ogImg = ogImage ? absoluteUrl(ogImage) : "";

  // Allow either a single object or an array of JSON-LD blocks
  const blocks = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];

  return (
    <Helmet>
      <html lang={lang} />
      <title>{safeTitle}</title>
      <meta name="description" content={safeDesc} />
      <meta name="robots" content={robots} />
      <link rel="canonical" href={canonical} />

      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content={ogLocale} />
      <meta property="og:title" content={safeTitle} />
      <meta property="og:description" content={safeDesc} />
      <meta property="og:url" content={canonical} />
      {ogImg ? <meta property="og:image" content={ogImg} /> : null}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={safeTitle} />
      <meta name="twitter:description" content={safeDesc} />
      {ogImg ? <meta name="twitter:image" content={ogImg} /> : null}

      {blocks.map((block, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(block)}
        </script>
      ))}
    </Helmet>
  );
}
