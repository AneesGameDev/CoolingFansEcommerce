# OHo Mart — Vercel-Ready E-Commerce

**Single-project, Node.js serverless backend + React frontend, deployable to Vercel's free tier with the domain `ohomart.online`. No card required, no separate backend host, no always-on server.**

- React 19 frontend (Create React App + Tailwind + shadcn/ui)
- Node.js serverless API on `/api/*` (Express, runs on Vercel Functions)
- MongoDB Atlas as the database (client is **cached across warm invocations**)
- Self-seeding on first DB connect (indexes + default products + admins + site settings)
- Google Sign-In for customers, email+password auth for admins
- Cash-on-Delivery checkout, order tracking, reviews, dynamic site content, WhatsApp button
- **Automatic order confirmation:** branded email via Resend + one-tap WhatsApp confirmation to the buyer's own number with a deep-link to track the order
- Optional Resend (password-reset emails) — **no-ops when env vars are blank**

---

## 1. Prerequisites

| You need | Where to get it |
|---|---|
| GitHub account | https://github.com |
| Vercel account (free) | https://vercel.com/signup — sign in with GitHub |
| MongoDB Atlas free cluster | https://cloud.mongodb.com (M0 free tier, no card) |
| Google OAuth Client ID | https://console.cloud.google.com → APIs & Services → Credentials |
| (Optional) Resend API key | https://resend.com/api-keys |

---

## 2. Deploy in 5 Steps

### Step 1 — Push to GitHub
```bash
cd ohomart
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<YOUR_USERNAME>/ohomart.git
git push -u origin main
```

### Step 2 — Import on Vercel
1. Open https://vercel.com/new
2. Select the GitHub repo you just pushed
3. **Framework Preset:** `Create React App` (auto-detected)
4. **Root Directory:** `.` (the project root)
5. **Build Command:** `yarn build` (auto-detected)
6. **Output Directory:** `build` (auto-detected)
7. **Install Command:** `yarn install` (auto-detected)
8. Do **NOT** click Deploy yet — first add env vars (next step)

### Step 3 — Add Environment Variables
Click **Environment Variables**, then add each row below. Apply to **Production, Preview, and Development** unless noted.

| Key | Value | Notes |
|---|---|---|
| `MONGO_URL` | `mongodb+srv://...` | Your MongoDB Atlas SRV URI. Whitelist `0.0.0.0/0` in Atlas → Network Access (Vercel uses dynamic IPs). |
| `DB_NAME` | `OhoMartDB` | Any name; will be auto-created |
| `JWT_SECRET` | _32+ char random string_ | Run `openssl rand -hex 32` |
| `GOOGLE_CLIENT_ID` | `xxxxx.apps.googleusercontent.com` | From Google Cloud Console |
| `ADMIN_EMAILS` | `you@gmail.com,team@gmail.com` | Comma-separated. Seeded as admins on first DB connect. |
| `DEFAULT_ADMIN_PASSWORD` | _strong password_ | Used for all seeded admins. Change after first login. |
| `CORS_ORIGINS` | `https://ohomart.online,https://www.ohomart.online` | Allowed origins for the API |
| `COOKIE_DOMAIN` | `.ohomart.online` | Leading dot lets the cookie work on `www.` subdomain too |
| `WHATSAPP_NUMBER` | `923000000000` | With country code, **no `+`** — used by the floating WhatsApp button |
| `PUBLIC_SITE_URL` | `https://ohomart.online` | Used to build the tracking link inside order confirmation emails |
| `REACT_APP_BACKEND_URL` | _(leave empty)_ | Empty value → frontend calls `/api/...` on the same domain |
| `REACT_APP_GOOGLE_CLIENT_ID` | _same as `GOOGLE_CLIENT_ID`_ | Build-time variable for the React app |
| `RESEND_API_KEY` | (optional) | Enables password-reset emails |
| `SENDER_EMAIL` | `noreply@ohomart.online` | Must match a verified domain in Resend |

A full reference list lives in **`.env.example`**.

### Step 4 — Deploy
Click **Deploy**. Vercel will:
1. Install dependencies (`yarn install`)
2. Build the React app (`yarn build`)
3. Bundle `/api/index.js` as a serverless function
4. Publish at `https://<project>.vercel.app`

On the first API request, MongoDB indexes are created, the 10 seed products + reviews are inserted, the site settings document is written, and your admin emails are seeded with `DEFAULT_ADMIN_PASSWORD`.

### Step 5 — Connect Your Domain `ohomart.online`
1. In Vercel: **Project → Settings → Domains**
2. Add `ohomart.online` and `www.ohomart.online`
3. Update your domain registrar's DNS (Vercel shows exact values):
   - `A` record `@` → `76.76.21.21`
   - `CNAME` record `www` → `cname.vercel-dns.com`
4. Wait ~5–30 minutes. Vercel issues SSL automatically.
5. In Google Cloud Console → Credentials → your OAuth Client:
   - **Authorized JavaScript origins:** `https://ohomart.online`, `https://www.ohomart.online`
   - **Authorized redirect URIs:** `https://ohomart.online`, `https://www.ohomart.online`

Done. Visit `https://ohomart.online`.

---

## 3. URLs

| Route | Purpose |
|---|---|
| `/` | Storefront |
| `/product/:id` | Product detail |
| `/checkout` | Cash-on-Delivery checkout |
| `/track` | Public order tracking |
| `/my-orders` | Customer order history (Google login required) |
| `/admin` | Admin login |
| `/admin/dashboard` | Admin panel: products, orders, reviews, site settings, admin users |
| `/api/health` | API liveness + DB ping |

---

## 4. First-Time Admin Login

1. Go to `https://ohomart.online/admin`
2. Email: any address listed in `ADMIN_EMAILS`
3. Password: `DEFAULT_ADMIN_PASSWORD`
4. Open **Admin Users** tab → set a strong, unique password.
5. Add new admins from the same panel.

---

## 5. Optional Features

### Order Confirmation: Email + WhatsApp (FREE, no Twilio)
After the customer places an order on `/checkout`, the app automatically:

1. **Emails the buyer** a beautifully-branded order-confirmation email via Resend — order number, itemized list, total, delivery address, and a one-tap **"Track Your Order →"** button that links to `/track?order=<order_number>`. *Requires `RESEND_API_KEY` + `SENDER_EMAIL`; silently skipped when blank.*
2. **Opens WhatsApp on the buyer's phone** (via a `wa.me/<their_number>?text=...` deep link) with the full order summary + tracking link pre-filled. The customer taps "Send" once and the confirmation lands permanently in their own WhatsApp chat — **for free, no Twilio, no WhatsApp Business API, no monthly fees.**

How the WhatsApp half works (since there's no truly free server-to-WhatsApp send):
- The `/order-success` page calls `window.open("https://wa.me/<customer_whatsapp>?text=<encoded_order>")` 800 ms after rendering
- The customer's WhatsApp opens to a chat with **themselves**, message pre-filled, ready to send
- They tap Send → the confirmation is now in their WhatsApp inbox, persisted forever, searchable
- If the popup is blocked, a prominent green **"Send Confirmation to My WhatsApp"** button on the success page does the same thing on demand
- The tracking link `https://ohomart.online/track?order=CB-XXX...` is **deep-linkable** — the `/track` page auto-fetches when opened with the query param

### Password-Reset Emails (Resend)
- Add `RESEND_API_KEY` and `SENDER_EMAIL` to env vars
- Verify `ohomart.online` in Resend → Domains
- "Forgot password?" on `/admin` will email a 6-digit reset code

**Leave the env vars blank to disable — the app keeps working.**

The floating **WhatsApp button** on the storefront opens `https://wa.me/<WHATSAPP_NUMBER>` directly in the customer's WhatsApp app — no third-party integration, no webhook, no backend required.

---

## 6. Local Development (Optional)

```bash
# 1. Copy env
cp .env.example .env
#    fill in MONGO_URL, JWT_SECRET, ADMIN_EMAILS, GOOGLE_CLIENT_ID etc.

# 2. Install
yarn install

# 3. Run the React dev server (frontend only)
yarn start                       # http://localhost:3000

# 4. Run the API locally with Vercel CLI (recommended)
npm i -g vercel
vercel dev                       # serves both /api and frontend on http://localhost:3000
```

For frontend-only local dev, set `REACT_APP_BACKEND_URL=https://<your-vercel-preview>.vercel.app` in `.env` so the dev server talks to the deployed API.

---

## 7. Architecture Notes

```
ohomart/
├── api/
│   ├── index.js              # Express app — all /api/* routes
│   └── _lib/
│       ├── db.js             # Cached MongoClient + first-connect seeding hook
│       ├── seed.js           # Idempotent self-seeding (indexes, admins, products, settings)
│       ├── auth.js           # JWT + bcrypt + cookie helpers, requireAdmin / requireUser middleware
│       ├── google.js         # Google ID token verification (google-auth-library)
│       └── email.js          # Resend send wrapper (no-op when blank)
├── src/                      # React app
├── public/                   # CRA public assets
├── vercel.json               # Rewrites /api/* → api/index.js, SPA fallback
├── craco.config.js           # CRA tweaks (supports `@/` alias)
├── tailwind.config.js
├── postcss.config.js
├── package.json              # Both frontend + serverless deps
├── .env.example
└── README.md
```

### Why one `api/index.js` instead of many files?
Vercel charges/limits per **serverless function**, not per route. A single Express handler keeps the entire API in one function (1 cold start, 1 deployment unit, 1 set of warm connections) and is the cheapest, fastest pattern for the free tier.

### MongoDB connection caching
`api/_lib/db.js` stores the `MongoClient` on `global.__OHOMART_MONGO__`. Vercel keeps the Node.js process warm across invocations of the same instance, so the second request and onward reuse the open connection — no reconnect cost.

### Self-seeding
Runs **once per warm container**, gated by an in-memory flag. Idempotent — safe across cold starts. Backfills missing fields on existing documents (`color_variants`, `video_url`, `total_sold`).

### Large file uploads
Vercel free-tier serverless body limit is ~4.5 MB. Image uploads (max 10 MB) and video uploads (max 50 MB) declared in the code work locally; on Vercel free tier, large uploads above ~4.5 MB will be rejected by the platform before reaching the function. If you need large media, host them on a CDN (Cloudinary, S3, R2) and paste the URL into the product editor.

---

## 8. Troubleshooting

| Symptom | Fix |
|---|---|
| 500 on first request, then OK | First cold start runs the seeder. Subsequent requests are fast. |
| `Login required` on admin pages | Make sure your email is in `ADMIN_EMAILS` and you logged in with the seeded password. |
| Google Sign-In doesn't render | Add `https://ohomart.online` and `https://www.ohomart.online` to Authorized JavaScript Origins in Google Cloud Console. Wait 5 min for propagation. |
| Cookie not sticking on `www.` | Set `COOKIE_DOMAIN=.ohomart.online` (note the leading dot). |
| CORS error | Add the calling origin to `CORS_ORIGINS`. |
| `MONGO_URL is required` in function logs | Set `MONGO_URL` in Vercel env vars and redeploy. |
| MongoDB Atlas connection timeout | Atlas → Network Access → allow `0.0.0.0/0` (Vercel uses dynamic IPs). |

---

## 9. License
Proprietary — OHo Mart.
