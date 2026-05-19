// Auth helpers: JWT issue/verify, password hashing, admin checks, session cookie helpers.
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookie = require("cookie");

const JWT_SECRET = process.env.JWT_SECRET || "change-me";
const JWT_ALGO = "HS256";
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || "";
const COOKIE_NAME = "session_token";
const COOKIE_MAX_AGE = 24 * 60 * 60; // 24 hours

function hashPassword(pw) {
  return bcrypt.hash(pw, 10);
}

function verifyPassword(plain, hashed) {
  return bcrypt.compare(plain, hashed);
}

function signToken(email, role = "admin") {
  return jwt.sign({ email, role }, JWT_SECRET, { algorithm: JWT_ALGO, expiresIn: "24h" });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function readTokenFromReq(req) {
  // 1) cookie header
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const parsed = cookie.parse(cookieHeader);
    if (parsed[COOKIE_NAME]) return parsed[COOKIE_NAME];
  }
  // 2) Authorization: Bearer
  const auth = req.headers.authorization || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

function setSessionCookie(res, token) {
  const opts = {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  };
  if (COOKIE_DOMAIN) opts.domain = COOKIE_DOMAIN;
  res.setHeader("Set-Cookie", cookie.serialize(COOKIE_NAME, token, opts));
}

function clearSessionCookie(res) {
  const opts = { path: "/", maxAge: 0 };
  if (COOKIE_DOMAIN) opts.domain = COOKIE_DOMAIN;
  res.setHeader("Set-Cookie", cookie.serialize(COOKIE_NAME, "", opts));
}

async function isAdminEmail(db, email) {
  if (!email) return false;
  const doc = await db.collection("admin_users").findOne(
    { email: email.toLowerCase(), is_active: true },
    { projection: { _id: 0, email: 1 } }
  );
  return !!doc;
}

// Express middleware: requires a valid admin JWT
function requireAdmin(getDb) {
  return async (req, res, next) => {
    const token = readTokenFromReq(req);
    if (!token) return res.status(401).json({ detail: "Not authenticated" });
    const payload = verifyToken(token);
    if (!payload) return res.status(401).json({ detail: "Invalid or expired token" });
    if (payload.role !== "admin") return res.status(403).json({ detail: "Admin access required" });
    const db = await getDb();
    if (!(await isAdminEmail(db, payload.email))) {
      return res.status(403).json({ detail: "Admin access revoked" });
    }
    req.admin = payload;
    req.db = db;
    next();
  };
}

// Express middleware: requires any logged-in (Google) user
function requireUser(getDb) {
  return async (req, res, next) => {
    const token = readTokenFromReq(req);
    if (!token) return res.status(401).json({ detail: "Login required" });
    const payload = verifyToken(token);
    if (!payload || !payload.email) return res.status(401).json({ detail: "Login required" });
    const db = await getDb();
    const user = await db.collection("users").findOne({ email: payload.email.toLowerCase() }, { projection: { _id: 0 } });
    if (!user) return res.status(401).json({ detail: "Login required" });
    user.is_admin = await isAdminEmail(db, user.email);
    req.user = user;
    req.db = db;
    next();
  };
}

// Express middleware: attaches `req.user` if logged in, otherwise null (does not block)
function optionalUser(getDb) {
  return async (req, res, next) => {
    const token = readTokenFromReq(req);
    req.db = await getDb();
    req.user = null;
    if (token) {
      const payload = verifyToken(token);
      if (payload && payload.email) {
        const user = await req.db.collection("users").findOne({ email: payload.email.toLowerCase() }, { projection: { _id: 0 } });
        if (user) {
          user.is_admin = await isAdminEmail(req.db, user.email);
          req.user = user;
        }
      }
    }
    next();
  };
}

module.exports = {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  readTokenFromReq,
  setSessionCookie,
  clearSessionCookie,
  isAdminEmail,
  requireAdmin,
  requireUser,
  optionalUser,
};
