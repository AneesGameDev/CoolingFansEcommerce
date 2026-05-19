// OHo Mart — Single Express handler for ALL /api/* routes.
// Exported as a Vercel serverless function. vercel.json rewrites /api/(.*) → /api/index.js.
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const crypto = require("crypto");
const { ObjectId, GridFSBucket } = require("mongodb");

const { getDb, getClient } = require("./_lib/db");
const { DEFAULT_SITE_SETTINGS } = require("./_lib/seed");
const {
  hashPassword,
  verifyPassword,
  signToken,
  setSessionCookie,
  clearSessionCookie,
  isAdminEmail,
  requireAdmin,
  requireUser,
  optionalUser,
} = require("./_lib/auth");
const { verifyGoogleIdToken, GOOGLE_CLIENT_ID } = require("./_lib/google");
const { sendEmail } = require("./_lib/email");

const CORS_ORIGINS = (process.env.CORS_ORIGINS || "https://ohomart.online,https://www.ohomart.online")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const app = express();
app.disable("x-powered-by");

// CORS — allow listed origins + same-origin (no Origin header) + Vercel previews
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (CORS_ORIGINS.includes(origin)) return cb(null, true);
      // Allow *.vercel.app preview deploys
      try {
        const u = new URL(origin);
        if (u.hostname.endsWith(".vercel.app")) return cb(null, true);
      } catch (_) {}
      cb(null, false);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: false, limit: "20mb" }));

// All paths are /api/... (Vercel rewrites /api/* → this function with original URL)
const router = express.Router();

// ---- Helpers ----
function docToDict(d) {
  if (!d) return d;
  if (d._id) {
    d.id = d._id.toString();
    delete d._id;
  }
  return d;
}

function asyncH(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// ---- Health ----
router.get("/health", asyncH(async (_req, res) => {
  let db_status = "ok";
  try {
    const client = await getClient();
    await client.db().admin().command({ ping: 1 });
  } catch (e) {
    db_status = `error: ${e.message}`;
  }
  res.json({
    service: "ohomart-backend",
    status: db_status === "ok" ? "ok" : "degraded",
    db: db_status,
  });
}));

// ---- Google Auth ----
router.post("/auth/google", asyncH(async (req, res) => {
  const credential = req.body && req.body.credential;
  if (!credential) return res.status(400).json({ detail: "credential required" });
  if (!GOOGLE_CLIENT_ID) return res.status(500).json({ detail: "Google auth not configured" });

  let payload;
  try {
    payload = await verifyGoogleIdToken(credential);
  } catch {
    return res.status(401).json({ detail: "Invalid Google credential" });
  }
  const email = (payload.email || "").toLowerCase();
  if (!email || !payload.email_verified) {
    return res.status(401).json({ detail: "Email not verified by Google" });
  }
  const name = payload.name || "";
  const picture = payload.picture || "";
  const now = new Date().toISOString();
  const db = await getDb();

  const existing = await db.collection("users").findOne({ email }, { projection: { _id: 0 } });
  let user_id;
  if (existing) {
    user_id = existing.user_id || `user_${crypto.randomBytes(6).toString("hex")}`;
    await db.collection("users").updateOne(
      { email },
      { $set: { name, picture, last_login_at: now, user_id } }
    );
  } else {
    user_id = `user_${crypto.randomBytes(6).toString("hex")}`;
    await db.collection("users").insertOne({
      user_id, email, name, picture, provider: "google",
      created_at: now, last_login_at: now,
    });
  }
  const adminFlag = await isAdminEmail(db, email);
  const token = signToken(email, adminFlag ? "admin" : "user");
  setSessionCookie(res, token);
  res.json({ id: user_id, email, name, picture, is_admin: adminFlag });
}));

router.get("/auth/me", asyncH(async (req, res) => {
  await new Promise((resolve, reject) => optionalUser(getDb)(req, res, (e) => (e ? reject(e) : resolve())));
  if (!req.user) return res.status(401).json({ detail: "Not authenticated" });
  res.json({
    user_id: req.user.user_id,
    email: req.user.email,
    name: req.user.name,
    picture: req.user.picture,
    is_admin: !!req.user.is_admin,
  });
}));

router.post("/auth/logout", (req, res) => {
  clearSessionCookie(res);
  res.json({ message: "Logged out" });
});

// ---- Admin Auth ----
router.post("/admin/login", asyncH(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ detail: "Email and password required" });
  const db = await getDb();
  const admin = await db.collection("admin_users").findOne({ email: String(email).trim().toLowerCase(), is_active: true });
  if (!admin || !(await verifyPassword(password, admin.password_hash))) {
    return res.status(401).json({ detail: "Invalid email or password" });
  }
  const token = signToken(admin.email, "admin");
  res.json({ token, email: admin.email, name: admin.name || "Admin" });
}));

router.get("/admin/me", requireAdmin(getDb), (req, res) => {
  res.json({ email: req.admin.email, role: "admin" });
});

router.get("/admin/check-access", requireUser(getDb), asyncH(async (req, res) => {
  const email = (req.user.email || "").toLowerCase();
  res.json({ is_admin: await isAdminEmail(req.db, email), email });
}));

// ---- Admin Users CRUD ----
router.get("/admin/admins", requireAdmin(getDb), asyncH(async (req, res) => {
  const docs = await req.db.collection("admin_users")
    .find({}, { projection: { _id: 0, password_hash: 0 } })
    .toArray();
  res.json(docs);
}));

router.post("/admin/admins", requireAdmin(getDb), asyncH(async (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !password) return res.status(400).json({ detail: "Email and password required" });
  if (password.length < 8) return res.status(400).json({ detail: "Password must be at least 8 characters" });
  const e = String(email).toLowerCase();
  const exists = await req.db.collection("admin_users").findOne({ email: e });
  if (exists) return res.status(400).json({ detail: "Admin already exists" });
  const doc = {
    email: e,
    password_hash: await hashPassword(password),
    name: name || e.split("@")[0].replace(/\b\w/g, (c) => c.toUpperCase()),
    is_active: true,
    created_at: new Date().toISOString(),
    created_by: req.admin.email,
  };
  await req.db.collection("admin_users").insertOne(doc);
  delete doc.password_hash;
  delete doc._id;
  res.json(doc);
}));

router.patch("/admin/admins/:email", requireAdmin(getDb), asyncH(async (req, res) => {
  const email = decodeURIComponent(req.params.email).toLowerCase();
  const target = await req.db.collection("admin_users").findOne({ email });
  if (!target) return res.status(404).json({ detail: "Admin not found" });
  const { password, name, is_active } = req.body || {};
  const update = {};
  if (password != null) {
    if (password.length < 8) return res.status(400).json({ detail: "Password must be at least 8 characters" });
    update.password_hash = await hashPassword(password);
  }
  if (name != null) update.name = name;
  if (is_active != null) {
    if (!is_active && target.is_active) {
      const active = await req.db.collection("admin_users").countDocuments({ is_active: true });
      if (active <= 1) return res.status(400).json({ detail: "Cannot deactivate the last active admin" });
    }
    update.is_active = !!is_active;
  }
  if (!Object.keys(update).length) return res.status(400).json({ detail: "No fields to update" });
  update.updated_at = new Date().toISOString();
  await req.db.collection("admin_users").updateOne({ email }, { $set: update });
  const doc = await req.db.collection("admin_users").findOne({ email }, { projection: { _id: 0, password_hash: 0 } });
  res.json(doc);
}));

router.delete("/admin/admins/:email", requireAdmin(getDb), asyncH(async (req, res) => {
  const email = decodeURIComponent(req.params.email).toLowerCase();
  const target = await req.db.collection("admin_users").findOne({ email });
  if (!target) return res.status(404).json({ detail: "Admin not found" });
  if (target.is_active) {
    const active = await req.db.collection("admin_users").countDocuments({ is_active: true });
    if (active <= 1) return res.status(400).json({ detail: "Cannot delete the last active admin" });
  }
  await req.db.collection("admin_users").deleteOne({ email });
  res.json({ message: "Admin deleted" });
}));

// ---- Admin Password Reset (Resend) ----
router.post("/admin/forgot-password", asyncH(async (req, res) => {
  const email = String((req.body && req.body.email) || "").trim().toLowerCase();
  if (!email) return res.status(400).json({ detail: "Email required" });
  const db = await getDb();
  const admin = await db.collection("admin_users").findOne({ email, is_active: true });
  if (admin) {
    const code = Array.from({ length: 6 }, () => Math.floor(Math.random() * 10)).join("");
    const expires = new Date(Date.now() + 15 * 60 * 1000);
    await db.collection("admin_reset_codes").updateOne(
      { email },
      { $set: { email, code_hash: await hashPassword(code), expires_at: expires, attempts: 0, created_at: new Date() } },
      { upsert: true }
    );
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #F0F9FF; border-radius: 16px;">
        <div style="text-align: center; background: linear-gradient(135deg, #0EA5E9, #06B6D4); padding: 24px; border-radius: 12px; color: white;">
          <h1 style="margin: 0; font-size: 22px;">OHo Mart — Admin Reset</h1>
          <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">Password reset code</p>
        </div>
        <div style="background: white; margin-top: 16px; padding: 24px; border-radius: 12px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <p style="color: #475569; margin: 0 0 12px;">Your verification code is:</p>
          <div style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #0EA5E9; background: #F0F9FF; padding: 16px; border-radius: 12px; margin-bottom: 16px;">${code}</div>
          <p style="color: #94A3B8; font-size: 12px; margin: 0;">Code expires in 15 minutes. Don't share it.</p>
        </div>
        <p style="text-align: center; margin-top: 16px; color: #94A3B8; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
      </div>`;
    await sendEmail({ to: email, subject: "OHo Mart Admin Password Reset Code", html });
  }
  res.json({ message: "If this email is registered, a reset code has been sent." });
}));

router.post("/admin/reset-password", asyncH(async (req, res) => {
  const { email, code, new_password } = req.body || {};
  if (!email || !code || !new_password) return res.status(400).json({ detail: "Missing fields" });
  if (String(new_password).length < 8) return res.status(400).json({ detail: "Password must be at least 8 characters" });
  const db = await getDb();
  const e = String(email).trim().toLowerCase();
  const record = await db.collection("admin_reset_codes").findOne({ email: e });
  if (!record) return res.status(400).json({ detail: "Invalid or expired code" });
  if (record.expires_at && new Date(record.expires_at) < new Date()) {
    await db.collection("admin_reset_codes").deleteOne({ email: e });
    return res.status(400).json({ detail: "Code has expired. Request a new one." });
  }
  if ((record.attempts || 0) >= 5) return res.status(429).json({ detail: "Too many attempts. Request a new code." });
  if (!(await verifyPassword(String(code), record.code_hash))) {
    await db.collection("admin_reset_codes").updateOne({ email: e }, { $inc: { attempts: 1 } });
    return res.status(400).json({ detail: "Invalid code" });
  }
  const result = await db.collection("admin_users").updateOne(
    { email: e },
    { $set: { password_hash: await hashPassword(new_password), updated_at: new Date().toISOString() } }
  );
  if (result.matchedCount === 0) return res.status(404).json({ detail: "Admin not found" });
  await db.collection("admin_reset_codes").deleteOne({ email: e });
  res.json({ message: "Password updated. You can now log in with your new password." });
}));

// ---- Products ----
router.get("/products", asyncH(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const per_page = parseInt(req.query.per_page) || 12;
  const category = req.query.category;
  const db = await getDb();
  const query = { is_active: true };
  if (category) query.category = category;
  const total = await db.collection("products").countDocuments(query);
  if (per_page <= 0) {
    const docs = await db.collection("products").find(query).sort({ total_sold: -1, created_at: -1 }).limit(1000).toArray();
    return res.json({ products: docs.map(docToDict), total, page: 1, per_page: total, pages: 1 });
  }
  const skip = (Math.max(page, 1) - 1) * per_page;
  const docs = await db.collection("products").find(query).sort({ total_sold: -1, created_at: -1 }).skip(skip).limit(per_page).toArray();
  res.json({
    products: docs.map(docToDict),
    total, page, per_page,
    pages: per_page > 0 ? Math.ceil(total / per_page) : 1,
  });
}));

router.get("/admin/products", requireAdmin(getDb), asyncH(async (req, res) => {
  const docs = await req.db.collection("products").find({}).sort({ created_at: -1 }).limit(1000).toArray();
  res.json(docs.map(docToDict));
}));

router.get("/products/:id", asyncH(async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ detail: "Invalid product ID" });
  const db = await getDb();
  const p = await db.collection("products").findOne({ _id: new ObjectId(req.params.id) });
  if (!p) return res.status(404).json({ detail: "Product not found" });
  res.json(docToDict(p));
}));

router.post("/products", requireAdmin(getDb), asyncH(async (req, res) => {
  const now = new Date().toISOString();
  const doc = { ...(req.body || {}), created_at: now, updated_at: now };
  const result = await req.db.collection("products").insertOne(doc);
  res.json({ ...doc, id: result.insertedId.toString(), _id: undefined });
}));

router.put("/products/:id", requireAdmin(getDb), asyncH(async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ detail: "Invalid product ID" });
  const update = { ...(req.body || {}), updated_at: new Date().toISOString() };
  delete update.id;
  delete update._id;
  const result = await req.db.collection("products").updateOne({ _id: new ObjectId(req.params.id) }, { $set: update });
  if (result.matchedCount === 0) return res.status(404).json({ detail: "Product not found" });
  const updated = await req.db.collection("products").findOne({ _id: new ObjectId(req.params.id) });
  res.json(docToDict(updated));
}));

router.delete("/products/:id", requireAdmin(getDb), asyncH(async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ detail: "Invalid product ID" });
  const result = await req.db.collection("products").deleteOne({ _id: new ObjectId(req.params.id) });
  if (result.deletedCount === 0) return res.status(404).json({ detail: "Product not found" });
  res.json({ message: "Product deleted" });
}));

// ---- Orders ----
router.post("/orders", optionalUser(getDb), asyncH(async (req, res) => {
  const data = req.body || {};
  if (!data.items || !data.items.length) return res.status(400).json({ detail: "Cart is empty" });
  const db = req.db;
  const now = new Date().toISOString();
  let linked_email = null;
  if (req.user) {
    linked_email = req.user.email;
  } else if (data.email) {
    const existing = await db.collection("users").findOne({ email: String(data.email).toLowerCase() }, { projection: { _id: 0, email: 1 } });
    if (existing) linked_email = existing.email;
  }
  const orderNumber = `CB-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  const doc = {
    customer_name: data.customer_name,
    phone: data.phone,
    whatsapp: data.whatsapp,
    email: data.email || null,
    address: data.address,
    city: data.city,
    province: data.province || "Punjab",
    items: data.items,
    total_price: data.total_price,
    notes: data.notes || null,
    status: "pending",
    order_number: orderNumber,
    user_email: linked_email || (data.email || null),
    guest_phone: data.phone,
    created_at: now,
    updated_at: now,
  };
  const result = await db.collection("orders").insertOne(doc);
  // Increment total_sold
  await Promise.all(
    data.items.map((it) => {
      if (it.product_id && ObjectId.isValid(it.product_id)) {
        return db.collection("products").updateOne(
          { _id: new ObjectId(it.product_id) },
          { $inc: { total_sold: it.quantity || 1 } }
        );
      }
      return null;
    })
  );

  res.json({ ...doc, id: result.insertedId.toString(), _id: undefined });
}));

router.post("/orders/link-guest", requireUser(getDb), asyncH(async (req, res) => {
  const order_numbers = (req.body && req.body.order_numbers) || [];
  if (!order_numbers.length) return res.json({ linked: 0 });
  const result = await req.db.collection("orders").updateMany(
    {
      order_number: { $in: order_numbers },
      $or: [{ user_email: null }, { user_email: { $exists: false } }, { user_email: req.user.email }],
    },
    { $set: { user_email: req.user.email, updated_at: new Date().toISOString() } }
  );
  res.json({ linked: result.modifiedCount });
}));

router.get("/orders/track/:order_number", asyncH(async (req, res) => {
  const db = await getDb();
  const order = await db.collection("orders").findOne({ order_number: req.params.order_number });
  if (!order) return res.status(404).json({ detail: "Order not found" });
  res.json(docToDict(order));
}));

router.get("/orders/my", requireUser(getDb), asyncH(async (req, res) => {
  const orders = await req.db.collection("orders")
    .find({ user_email: req.user.email })
    .sort({ created_at: -1 })
    .limit(500)
    .toArray();
  res.json(orders.map(docToDict));
}));

router.get("/admin/orders", requireAdmin(getDb), asyncH(async (req, res) => {
  const orders = await req.db.collection("orders").find({}).sort({ created_at: -1 }).limit(1000).toArray();
  res.json(orders.map(docToDict));
}));

router.put("/admin/orders/:id", requireAdmin(getDb), asyncH(async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ detail: "Invalid order ID" });
  const status = req.body && req.body.status;
  const result = await req.db.collection("orders").updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { status, updated_at: new Date().toISOString() } }
  );
  if (result.matchedCount === 0) return res.status(404).json({ detail: "Order not found" });
  const updated = await req.db.collection("orders").findOne({ _id: new ObjectId(req.params.id) });
  res.json(docToDict(updated));
}));

router.delete("/admin/orders/:id", requireAdmin(getDb), asyncH(async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ detail: "Invalid order ID" });
  const result = await req.db.collection("orders").deleteOne({ _id: new ObjectId(req.params.id) });
  if (result.deletedCount === 0) return res.status(404).json({ detail: "Order not found" });
  res.json({ message: "Order deleted" });
}));

// ---- Reviews ----
router.get("/reviews/:product_id", asyncH(async (req, res) => {
  const db = await getDb();
  const reviews = await db.collection("reviews")
    .find({ product_id: req.params.product_id, is_approved: true })
    .sort({ created_at: -1 })
    .limit(100)
    .toArray();
  res.json(reviews.map(docToDict));
}));

router.post("/reviews", requireUser(getDb), asyncH(async (req, res) => {
  const { product_id, rating, comment, images = [], reviewer_avatar = "" } = req.body || {};
  if (images.length > 3) return res.status(400).json({ detail: "Max 3 images allowed" });
  if (rating < 1 || rating > 5) return res.status(400).json({ detail: "Rating must be 1-5" });
  const doc = {
    product_id,
    reviewer_name: req.user.name || req.user.email || "User",
    reviewer_avatar: reviewer_avatar || req.user.picture || "",
    user_email: req.user.email,
    rating,
    comment,
    images,
    verified_purchase: false,
    is_approved: true,
    created_at: new Date().toISOString(),
  };
  const result = await req.db.collection("reviews").insertOne(doc);
  res.json({ ...doc, id: result.insertedId.toString(), _id: undefined });
}));

router.get("/admin/reviews", requireAdmin(getDb), asyncH(async (req, res) => {
  const reviews = await req.db.collection("reviews").find({}).sort({ created_at: -1 }).limit(1000).toArray();
  res.json(reviews.map(docToDict));
}));

router.post("/admin/reviews", requireAdmin(getDb), asyncH(async (req, res) => {
  const doc = { ...(req.body || {}) };
  if ((doc.images || []).length > 3) return res.status(400).json({ detail: "Max 3 images allowed" });
  if (!doc.created_at) doc.created_at = new Date().toISOString();
  if (doc.is_approved === undefined) doc.is_approved = true;
  const result = await req.db.collection("reviews").insertOne(doc);
  res.json({ ...doc, id: result.insertedId.toString(), _id: undefined });
}));

router.put("/admin/reviews/:id", requireAdmin(getDb), asyncH(async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ detail: "Invalid review ID" });
  const update = { ...(req.body || {}) };
  delete update.id;
  delete update._id;
  if ((update.images || []).length > 3) return res.status(400).json({ detail: "Max 3 images allowed" });
  if (!update.created_at) delete update.created_at;
  const result = await req.db.collection("reviews").updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: update }
  );
  if (result.matchedCount === 0) return res.status(404).json({ detail: "Review not found" });
  const updated = await req.db.collection("reviews").findOne({ _id: new ObjectId(req.params.id) });
  res.json(docToDict(updated));
}));

router.delete("/admin/reviews/:id", requireAdmin(getDb), asyncH(async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ detail: "Invalid review ID" });
  const result = await req.db.collection("reviews").deleteOne({ _id: new ObjectId(req.params.id) });
  if (result.deletedCount === 0) return res.status(404).json({ detail: "Review not found" });
  res.json({ message: "Review deleted" });
}));

router.put("/admin/reviews/:id/toggle", requireAdmin(getDb), asyncH(async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ detail: "Invalid review ID" });
  const review = await req.db.collection("reviews").findOne({ _id: new ObjectId(req.params.id) });
  if (!review) return res.status(404).json({ detail: "Review not found" });
  const newStatus = !(review.is_approved !== false);
  await req.db.collection("reviews").updateOne({ _id: new ObjectId(req.params.id) }, { $set: { is_approved: newStatus } });
  review.is_approved = newStatus;
  res.json(docToDict(review));
}));

// ---- Site Settings ----
router.get("/site-settings", asyncH(async (_req, res) => {
  const db = await getDb();
  const doc = await db.collection("site_settings").findOne({ key: "main" }, { projection: { _id: 0, key: 0 } });
  res.json(doc || DEFAULT_SITE_SETTINGS);
}));

router.put("/admin/site-settings", requireAdmin(getDb), asyncH(async (req, res) => {
  const incoming = (req.body && req.body.settings) || {};
  const safe = {};
  for (const [k, v] of Object.entries(incoming)) {
    if (k in DEFAULT_SITE_SETTINGS) safe[k] = v;
  }
  await req.db.collection("site_settings").updateOne({ key: "main" }, { $set: safe }, { upsert: true });
  const doc = await req.db.collection("site_settings").findOne({ key: "main" }, { projection: { _id: 0, key: 0 } });
  res.json(doc);
}));

router.put("/admin/testimonials", requireAdmin(getDb), asyncH(async (req, res) => {
  const items = (req.body && req.body.testimonials) || [];
  await req.db.collection("site_settings").updateOne(
    { key: "main" },
    { $set: { featured_testimonials: items } },
    { upsert: true }
  );
  res.json({ featured_testimonials: items });
}));

// ---- Media Upload (GridFS) ----
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

router.post("/admin/upload-media", requireAdmin(getDb), upload.single("file"), asyncH(async (req, res) => {
  if (!req.file) return res.status(400).json({ detail: "file required" });
  const isVideo = (req.file.mimetype || "").startsWith("video/");
  const maxBytes = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
  if (req.file.size > maxBytes) {
    return res.status(413).json({ detail: `File too large. Max ${isVideo ? "50 MB" : "10 MB"}.` });
  }
  const bucket = new GridFSBucket(req.db, { bucketName: "media" });
  const filename = req.file.originalname || "upload";
  const stream = bucket.openUploadStream(filename, {
    metadata: { content_type: req.file.mimetype, original_name: filename },
  });
  await new Promise((resolve, reject) => {
    stream.on("error", reject);
    stream.on("finish", resolve);
    stream.end(req.file.buffer);
  });
  res.json({
    url: `/api/media/${stream.id.toString()}`,
    file_id: stream.id.toString(),
    filename,
    content_type: req.file.mimetype,
    size_bytes: req.file.size,
  });
}));

router.get("/media/:file_id", asyncH(async (req, res) => {
  if (!ObjectId.isValid(req.params.file_id)) return res.status(400).json({ detail: "Invalid file ID" });
  const db = await getDb();
  const bucket = new GridFSBucket(db, { bucketName: "media" });
  try {
    const fileDoc = await db.collection("media.files").findOne({ _id: new ObjectId(req.params.file_id) });
    if (!fileDoc) return res.status(404).json({ detail: "Media not found" });
    const contentType = (fileDoc.metadata && fileDoc.metadata.content_type) || "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    if (fileDoc.length) res.setHeader("Content-Length", String(fileDoc.length));
    bucket.openDownloadStream(new ObjectId(req.params.file_id))
      .on("error", () => res.status(404).end())
      .pipe(res);
  } catch (e) {
    res.status(404).json({ detail: "Media not found" });
  }
}));

// ---- Admin Stats ----
router.get("/admin/stats", requireAdmin(getDb), asyncH(async (req, res) => {
  const [total_orders, pending_orders, total_products, total_reviews, all_orders] = await Promise.all([
    req.db.collection("orders").countDocuments({}),
    req.db.collection("orders").countDocuments({ status: "pending" }),
    req.db.collection("products").countDocuments({}),
    req.db.collection("reviews").countDocuments({}),
    req.db.collection("orders").find({}, { projection: { total_price: 1 } }).limit(10000).toArray(),
  ]);
  const total_revenue = all_orders.reduce((s, o) => s + (Number(o.total_price) || 0), 0);
  res.json({ total_orders, pending_orders, total_products, total_reviews, total_revenue });
}));

// Mount router on /api so Vercel's rewrite (which preserves the path) lands here correctly.
app.use("/api", router);

// 404 fallback for unknown /api paths
app.use("/api", (req, res) => {
  res.status(404).json({ detail: "Not found" });
});

// Error handler — convert thrown errors to JSON
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error("API error:", err);
  const status = err.status || 500;
  res.status(status).json({ detail: err.message || "Internal server error" });
});

module.exports = app;
