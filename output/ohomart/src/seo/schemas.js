// schema.org JSON-LD builders. Every output is a plain JS object, ready
// to JSON.stringify and inject in a <script type="application/ld+json">.
// All prices are strings (Google requires this), availability uses the
// full schema.org URI, and every nested object carries its own @type.

const ORG_NAME = "OHo Mart";

export function organizationSchema({ siteUrl, logoUrl, whatsappNumber, sameAs = [] }) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: ORG_NAME,
    url: siteUrl,
    logo: logoUrl,
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer service",
        availableLanguage: ["English", "Urdu"],
        telephone: whatsappNumber ? `+${String(whatsappNumber).replace(/\D/g, "")}` : undefined,
        contactOption: "WhatsApp",
        areaServed: "PK",
      },
    ],
    sameAs: Array.isArray(sameAs) ? sameAs.filter(Boolean) : [],
  };
}

export function websiteSchema({ siteUrl }) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: ORG_NAME,
    url: siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbSchema(items) {
  // items: [{ name, url }]
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

export function itemListSchema({ products, siteUrl }) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: products.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${siteUrl}/product/${p.id}`,
      name: p.name,
      image: (p.images && p.images[0]) || undefined,
    })),
  };
}

function inOneYearISO() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

function aggregateRating(reviews) {
  if (!reviews || reviews.length === 0) return null;
  const sum = reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0);
  const avg = sum / reviews.length;
  return {
    "@type": "AggregateRating",
    ratingValue: avg.toFixed(1),
    reviewCount: reviews.length,
    bestRating: "5",
    worstRating: "1",
  };
}

function reviewList(reviews) {
  return reviews.map((r) => ({
    "@type": "Review",
    author: { "@type": "Person", name: r.reviewer_name || "Customer" },
    datePublished: (r.created_at || "").slice(0, 10),
    reviewBody: String(r.comment || "").slice(0, 500),
    reviewRating: {
      "@type": "Rating",
      ratingValue: String(r.rating || 5),
      bestRating: "5",
      worstRating: "1",
    },
  }));
}

export function productSchema({ product, siteUrl, reviews = [], brand }) {
  const canonicalUrl = `${siteUrl}/product/${product.id}`;
  const images = (product.images || []).filter(Boolean);
  const availability =
    Number(product.stock) > 0
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock";

  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: images.length ? images : [],
    description: product.description || "",
    sku: product.id,
    mpn: product.id,
    brand: { "@type": "Brand", name: brand || "OHo Mart" },
    category: product.category || "fan",
    offers: {
      "@type": "Offer",
      url: canonicalUrl,
      priceCurrency: "PKR",
      price: String(product.discounted_price ?? product.price ?? 0),
      availability,
      priceValidUntil: inOneYearISO(),
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: ORG_NAME },
    },
  };

  const agg = aggregateRating(reviews);
  if (agg) {
    schema.aggregateRating = agg;
    schema.review = reviewList(reviews.slice(0, 10));
  }
  return schema;
}

export function localBusinessSchema({ siteUrl, logoUrl, whatsappNumber, address, openingHours }) {
  const base = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: ORG_NAME,
    url: siteUrl,
    logo: logoUrl,
  };
  if (whatsappNumber) base.telephone = `+${String(whatsappNumber).replace(/\D/g, "")}`;
  if (address) base.address = { "@type": "PostalAddress", ...address };
  if (openingHours) base.openingHours = openingHours;
  return base;
}
