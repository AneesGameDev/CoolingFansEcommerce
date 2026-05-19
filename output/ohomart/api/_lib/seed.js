// Idempotent self-seeding: indexes, admin users, products, reviews, site settings.
const bcrypt = require("bcryptjs");

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || "ChangeMe@2024";
const WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER || "923000000000";

const DEFAULT_SITE_SETTINGS = {
  brand_name: "OHo Mart",
  brand_tagline: "Beat the Heat with Premium Quality",
  whatsapp_number: WHATSAPP_NUMBER,
  hero_badge: "Pakistan's #1 Imported Fan Store",
  hero_title_main: "Beat the Heat with",
  hero_title_accent: "Premium Quality",
  hero_subtitle:
    "Directly imported neck fans, baby fans & travel fans — long battery, 7-day warranty, Cash on Delivery!",
  hero_cta_primary: "Shop Summer Sale",
  hero_cta_secondary: "Chat on WhatsApp",
  sale_banner_primary: "SUMMER SALE — UP TO 80% OFF",
  sale_banner_secondary: "FREE DELIVERY on orders over Rs. 2000",
  sale_banner_tertiary: "Limited Stock — Selling Fast!",
  why_buy_title: "Why Pakistan Trusts OHo Mart",
  why_buy_subtitle:
    "We import premium fans directly — no middlemen, no copies. Real quality, real cooling, real value.",
  products_section_title: "Our Premium Fan Collection",
  products_section_subtitle:
    "10 imported fans — each handpicked, each on sale, each ready to ship today.",
  stats_customers_value: "50,000+",
  stats_customers_label: "Happy Customers",
  stats_orders_value: "12,000+",
  stats_orders_label: "Orders Delivered",
  stats_rating_value: "4.9/5",
  stats_rating_label: "Customer Rating",
  stats_cities_value: "100+",
  stats_cities_label: "Cities Served",
  founder_quote:
    "Every Pakistani family deserves real cooling comfort — not cheap copies. That's why we import directly from premium factories and stand behind every single fan we sell.",
  founder_name: "Team OHo Mart",
  founder_role: "Bringing Real Cool to Real Homes",
  guarantee_title: "100% Satisfaction Guarantee",
  guarantee_text:
    "Open the box. Test the fan. Fall in love — or send it back, no questions asked.",
  whatsapp_cta_title: "Need Help Choosing?",
  whatsapp_cta_subtitle:
    "Chat with us directly on WhatsApp. Our team will help you pick the perfect fan.",
  footer_tagline: "Pakistan's #1 Imported Fan Store • Cash on Delivery",
  trust_badges: [
    { label: "Cash on Delivery" },
    { label: "7-Day Check Warranty" },
    { label: "Return Back Policy" },
    { label: "Delivery in 1-2 Days" },
  ],
  featured_testimonials: [
    {
      name: "Ayesha K.", city: "Karachi", rating: 5,
      quote: "The Neck Fan Pro is a game-changer in summer. Honestly the best Rs. 2500 I've spent this year!",
      avatar: "https://i.pravatar.cc/100?img=47",
    },
    {
      name: "Bilal R.", city: "Lahore", rating: 5,
      quote: "Got it for load-shedding nights — my whole family loves it. Solid build, real battery life. Genuine product.",
      avatar: "https://i.pravatar.cc/100?img=12",
    },
    {
      name: "Hira M.", city: "Islamabad", rating: 5,
      quote: "I was scared to order COD online. But OHo Mart delivered in 2 days, packaging was premium, fan works perfectly.",
      avatar: "https://i.pravatar.cc/100?img=32",
    },
  ],
};

const SEED_PRODUCTS = [
  {
    name: "Neck Fan Pro 360°",
    description: "Hands-free bladeless neck fan with 360° airflow technology. Perfect for outdoor activities, daily commute, and summer walks. Ultra-quiet motor with 3 speed settings and 8-hour battery life.",
    price: 4999, discounted_price: 2499, category: "neck-fan",
    images: [
      "https://images.unsplash.com/photo-1657537488218-f7eb744c5b0b?crop=entropy&cs=srgb&fm=jpg&w=500&q=80",
      "https://images.unsplash.com/photo-1776183422641-5dc7d7ab7d95?crop=entropy&cs=srgb&fm=jpg&w=500&q=80",
    ],
    video_url: null, colors: ["White", "Black", "Pink", "Blue"], color_variants: [], sizes: [],
    stock: 150, battery_life: "8-10 hours",
    features: ["Bladeless Design", "3 Speed Settings", "USB-C Charging", "Ultra Quiet <35dB", "360° Airflow"],
    is_active: true, total_sold: 248,
  },
  {
    name: "Baby Stroller Clip Fan",
    description: "Whisper-quiet clip fan designed for baby strollers, cribs, and car seats. Safe protective grill design with 360° rotation. Keeps your baby cool all summer long.",
    price: 2499, discounted_price: 899, category: "baby-fan",
    images: ["https://images.unsplash.com/photo-1566441699339-0c7bac167c58?crop=entropy&cs=srgb&fm=jpg&w=500&q=80"],
    video_url: null, colors: ["White", "Blue", "Pink"], color_variants: [], sizes: [],
    stock: 200, battery_life: "12 hours",
    features: ["Baby Safe Design", "Super Quiet", "360° Rotation", "Strong Clip", "USB-C Powered"],
    is_active: true, total_sold: 412,
  },
  {
    name: "USB Mini Desk Fan",
    description: "Compact yet powerful USB desk fan with 5 wind speed settings. Flexible 360° tilt design. Ideal for home office, study table, and bedside. Extremely quiet for night use.",
    price: 3299, discounted_price: 1799, category: "desk-fan",
    images: ["https://images.unsplash.com/photo-1618941716939-553df3c6c278?crop=entropy&cs=srgb&fm=jpg&w=500&q=80"],
    video_url: null, colors: ["White", "Black", "Blue"], color_variants: [], sizes: ["4-inch", "6-inch"],
    stock: 120, battery_life: "USB Powered",
    features: ["5 Speed Settings", "360° Tilt", "Quiet Operation", "USB Powered", "Compact Design"],
    is_active: true, total_sold: 156,
  },
  {
    name: "Foldable Handheld Fan",
    description: "Ultra-portable foldable mini fan that fits in your pocket or bag. Built-in 2000mAh battery with USB charging. 3 speed settings for personal cooling on the go. Perfect travel companion.",
    price: 1999, discounted_price: 799, category: "handheld-fan",
    images: ["https://images.unsplash.com/photo-1718815416565-c65944a5ec14?crop=entropy&cs=srgb&fm=jpg&w=500&q=80"],
    video_url: null, colors: ["Pink", "White", "Black", "Gold"], color_variants: [], sizes: [],
    stock: 300, battery_life: "4-6 hours",
    features: ["Foldable Design", "Pocket Size", "3 Speed Settings", "2000mAh Battery", "USB-C Charging"],
    is_active: true, total_sold: 587,
  },
  {
    name: "Bladeless Neck Fan - Turbo",
    description: "Premium bladeless wearable neck fan with powerful turbo airflow. 4000mAh long-lasting battery, ergonomic lightweight design. Whisper-quiet even at max speed. Best seller for outdoor use.",
    price: 6999, discounted_price: 3499, category: "neck-fan",
    images: [
      "https://images.unsplash.com/photo-1776183422641-5dc7d7ab7d95?crop=entropy&cs=srgb&fm=jpg&w=500&q=80",
      "https://images.unsplash.com/photo-1657537488218-f7eb744c5b0b?crop=entropy&cs=srgb&fm=jpg&w=500&q=80",
    ],
    video_url: null, colors: ["White", "Black", "Sky Blue"], color_variants: [], sizes: [],
    stock: 80, battery_life: "10-12 hours",
    features: ["Turbo Mode", "4000mAh Battery", "4 Speed Settings", "USB-C Fast Charge", "Ergonomic Design"],
    is_active: true, total_sold: 321,
  },
  {
    name: "Baby Night Cooling Fan",
    description: "Ultra-silent baby room fan with built-in soft ambient night light. Whisper mode produces less than 25dB noise. Safety certified with fully enclosed blade guard. Perfect for peaceful baby sleep.",
    price: 3999, discounted_price: 2199, category: "baby-fan",
    images: ["https://images.unsplash.com/photo-1564510182791-29645da7fac4?crop=entropy&cs=srgb&fm=jpg&w=500&q=80"],
    video_url: null, colors: ["White", "Pink"], color_variants: [], sizes: [],
    stock: 100, battery_life: "USB Powered",
    features: ["<25dB Whisper Mode", "Night Light", "Baby Safe", "3 Wind Speeds", "Timer Function"],
    is_active: true, total_sold: 89,
  },
  {
    name: "10000mAh Travel Fan",
    description: "High-capacity rechargeable fan with massive 10000mAh power bank. Charges your phone AND cools you simultaneously! 4 speed settings with turbo mode. Ideal for travel and load-shedding.",
    price: 8999, discounted_price: 4499, category: "travel-fan",
    images: ["https://images.unsplash.com/photo-1523437345381-db5ee4df9c04?crop=entropy&cs=srgb&fm=jpg&w=500&q=80"],
    video_url: null, colors: ["Black", "Blue", "White"], color_variants: [], sizes: [],
    stock: 60, battery_life: "16-20 hours",
    features: ["10000mAh Battery", "Phone Charger", "Turbo Mode", "4 Speeds", "LED Battery Display"],
    is_active: true, total_sold: 178,
  },
  {
    name: "Car Dashboard USB Fan",
    description: "Powerful flexible neck car fan for dashboard use. Connects directly to car USB port. 360° adjustable neck design with silent motor. Keeps you cool while driving.",
    price: 2999, discounted_price: 1299, category: "car-fan",
    images: ["https://images.unsplash.com/photo-1565151443833-29bf2ba5dd8d?crop=entropy&cs=srgb&fm=jpg&w=500&q=80"],
    video_url: null, colors: ["Black", "Silver", "White"], color_variants: [], sizes: [],
    stock: 180, battery_life: "Car USB Powered",
    features: ["360° Flexible Neck", "Silent Motor", "2 Speed Settings", "Plug & Play", "Universal USB"],
    is_active: true, total_sold: 234,
  },
  {
    name: "Mini Tower Fan (5 Speeds)",
    description: "Sleek portable tower-style fan with oscillation feature. 5 wind speeds with 2-hour auto-off timer. Built-in 6000mAh battery. Modern design for bedroom, living room, or office desk.",
    price: 9999, discounted_price: 5499, category: "tower-fan",
    images: [
      "https://images.unsplash.com/photo-1618941716939-553df3c6c278?crop=entropy&cs=srgb&fm=jpg&w=500&q=80",
      "https://images.unsplash.com/photo-1566441699339-0c7bac167c58?crop=entropy&cs=srgb&fm=jpg&w=500&q=80",
    ],
    video_url: null, colors: ["White", "Gray"], color_variants: [], sizes: ["12-inch", "18-inch"],
    stock: 40, battery_life: "8-15 hours",
    features: ["Oscillation", "5 Speed Settings", "Sleep Timer", "6000mAh Battery", "Touch Controls"],
    is_active: true, total_sold: 67,
  },
  {
    name: "Kids Cute Mini Fan",
    description: "Adorable mini fan designed specially for children. Extra-safe soft blades with full protective cover. Lightweight and easy to hold. USB charging with 1500mAh battery. Perfect summer gift for kids!",
    price: 1499, discounted_price: 599, category: "kids-fan",
    images: ["https://images.unsplash.com/photo-1718815416565-c65944a5ec14?crop=entropy&cs=srgb&fm=jpg&w=500&q=80"],
    video_url: null, colors: ["Pink", "Blue", "Yellow", "Green"], color_variants: [], sizes: [],
    stock: 250, battery_life: "3-5 hours",
    features: ["Safe Soft Blades", "Cute Design", "Lightweight", "1500mAh Battery", "Multiple Colors"],
    is_active: true, total_sold: 612,
  },
];

const SEED_REVIEWS = [
  { product_index: 0, reviewer_name: "Ahmed Hassan", rating: 5, comment: "Absolutely amazing neck fan! Battery lasts all day during my long walks. Very comfortable to wear. Highly recommend!", images: [], verified_purchase: true },
  { product_index: 0, reviewer_name: "Sara Malik", rating: 4, comment: "Very comfortable and the airflow is great. Only wish it came in more colors. Overall very happy with the purchase.", images: [], verified_purchase: true },
  { product_index: 1, reviewer_name: "Fatima Rashid", rating: 5, comment: "Perfect for my baby's stroller! Very quiet, baby doesn't get disturbed at all. The clip is super strong. 10/10!", images: [], verified_purchase: true },
  { product_index: 2, reviewer_name: "Hassan Ali", rating: 4, comment: "Good desk fan for the price. Very quiet for night use. The 5 speeds are great. Highly recommended!", images: [], verified_purchase: true },
  { product_index: 3, reviewer_name: "Zara Khan", rating: 5, comment: "Pocket-sized and very powerful! I take it everywhere. Fits perfectly in my bag. Battery is decent for the size.", images: [], verified_purchase: true },
  { product_index: 4, reviewer_name: "Muhammad Tariq", rating: 5, comment: "Best neck fan I have ever used! The turbo mode is incredible for hot summer days. Very well built. 5 stars!", images: [], verified_purchase: true },
  { product_index: 6, reviewer_name: "Amna Sheikh", rating: 5, comment: "This fan is a lifesaver during power outages! The 10000mAh battery ran for 18 hours straight. Also charged my phone. Amazing!", images: [], verified_purchase: true },
  { product_index: 7, reviewer_name: "Bilal Qureshi", rating: 4, comment: "Great car fan. Very silent during driving and the flexible neck can reach any direction. Good quality for the price.", images: [], verified_purchase: true },
  { product_index: 9, reviewer_name: "Hina Baig", rating: 5, comment: "Bought this for my 4-year-old daughter and she loves it! Very safe with the soft blades. The pink color is adorable!", images: [], verified_purchase: true },
];

async function ensureIndexes(db) {
  const tasks = [
    db.collection("products").createIndex({ is_active: 1 }),
    db.collection("products").createIndex({ slug: 1 }, { unique: true, sparse: true }).catch(() => null),
    db.collection("orders").createIndex({ created_at: 1 }),
    db.collection("orders").createIndex({ order_number: 1 }, { unique: true }),
    db.collection("orders").createIndex({ user_email: 1 }),
    db.collection("reviews").createIndex({ product_id: 1 }),
    db.collection("admin_users").createIndex({ email: 1 }, { unique: true }),
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
  ];
  await Promise.all(tasks);
}

async function seedAdmins(db) {
  if (!ADMIN_EMAILS.length) return;
  const existing = await db.collection("admin_users").countDocuments({});
  if (existing > 0) return;
  const hash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
  const docs = ADMIN_EMAILS.map((email) => ({
    email,
    password_hash: hash,
    name: email.split("@")[0].replace(/\b\w/g, (c) => c.toUpperCase()),
    is_active: true,
    created_at: new Date().toISOString(),
    created_by: "system_seed",
  }));
  try {
    await db.collection("admin_users").insertMany(docs, { ordered: false });
  } catch (e) {
    // Ignore duplicate-key races between cold starts
    if (e.code !== 11000) throw e;
  }
}

async function seedProductsAndReviews(db) {
  const count = await db.collection("products").countDocuments({});
  if (count > 0) {
    // Backfill any missing fields on existing rows
    await Promise.all([
      db.collection("products").updateMany({ color_variants: { $exists: false } }, { $set: { color_variants: [] } }),
      db.collection("products").updateMany({ video_url: { $exists: false } }, { $set: { video_url: null } }),
      db.collection("products").updateMany({ total_sold: { $exists: false } }, { $set: { total_sold: 0 } }),
    ]);
    return;
  }
  const now = new Date().toISOString();
  const products = SEED_PRODUCTS.map((p) => ({ ...p, created_at: now, updated_at: now }));
  const res = await db.collection("products").insertMany(products);
  const ids = Object.values(res.insertedIds).map((id) => id.toString());

  const reviewCount = await db.collection("reviews").countDocuments({});
  if (reviewCount === 0) {
    const reviews = SEED_REVIEWS
      .filter((r) => r.product_index < ids.length)
      .map((r) => ({
        product_id: ids[r.product_index],
        reviewer_name: r.reviewer_name,
        rating: r.rating,
        comment: r.comment,
        images: r.images,
        verified_purchase: r.verified_purchase,
        is_approved: true,
        created_at: now,
      }));
    if (reviews.length) await db.collection("reviews").insertMany(reviews);
  }
}

async function seedSiteSettings(db) {
  const existing = await db.collection("site_settings").findOne({ key: "main" });
  if (!existing) {
    await db.collection("site_settings").insertOne({
      key: "main",
      brand: "OHo Mart",
      currency: "PKR",
      whatsapp_number: WHATSAPP_NUMBER,
      ...DEFAULT_SITE_SETTINGS,
    });
  } else {
    const missing = {};
    for (const [k, v] of Object.entries(DEFAULT_SITE_SETTINGS)) {
      if (!(k in existing)) missing[k] = v;
    }
    if (Object.keys(missing).length) {
      await db.collection("site_settings").updateOne({ key: "main" }, { $set: missing });
    }
  }
}

async function seedDatabase(db) {
  await ensureIndexes(db);
  await seedAdmins(db);
  await seedProductsAndReviews(db);
  await seedSiteSettings(db);
}

module.exports = { seedDatabase, DEFAULT_SITE_SETTINGS };
