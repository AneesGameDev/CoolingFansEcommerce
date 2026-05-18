# OHo Mart PRD

## Problem Statement
Pakistan's #1 Imported Fan Store — full e-commerce platform for portable/neck/baby/travel fans.
Must be independently deployable on `ohomart.online` with no manual DB setup.

## Architecture
- **Frontend:** React 19 + Tailwind CSS + shadcn/ui (port 3000)
- **Backend:** FastAPI Python (port 8001)
- **Database:** MongoDB (auto-seeded on startup) — single instance, free 512MB tier safe
- **Auth:** Google Sign-In (One Tap) for customers + JWT (Bearer) for admins
- **Media:** GridFS storage with client-side image compression (5MB → ~200KB)
- **WhatsApp:** Twilio API for order notifications + inbound webhook auto-reply
- **Domain:** ohomart.online (Docker + nginx reverse proxy)

## Core Requirements
1. Product catalog with cart (color/size selection) + pagination
2. COD checkout + public order tracking by order number
3. Google Sign-In for customers, email+password for admins
4. Admin panel: products, orders, reviews, site settings, admin team management
5. GridFS media uploads (compressed client-side) — no external CDN dependency
6. Twilio WhatsApp notifications + inbound auto-reply webhook
7. Zero manual DB setup — auto-creates collections/indexes/admins on startup
8. **Zero third-party platform branding** anywhere in code/UI/text
9. Independently deployable via Docker Compose

## User Personas
- **Customer (Pakistan):** Browses fan catalog, adds to cart, places COD order, tracks order, signs in with Google
- **Admin:** Manages products/orders/reviews/site content/WhatsApp messages, adds/disables fellow admins

---

## What's Been Implemented

### 2026-05-18 — Final Verification & Code Quality (FINALIZED)
- [x] Verified zero "emergent" references in `/app/backend`, `/app/frontend/src`, `/app/frontend/public`
- [x] Verified `reviewer_avatar` end-to-end: admin-created reviews now save & return avatar correctly
- [x] Verified `/api/health` returns `{status: ok, db: ok}` (used by Docker healthcheck)
- [x] Verified paginated `/api/products` returns `{products, total, pages}` shape
- [x] Verified admin login + protected admin review endpoints with seeded credentials
- [x] Smoke-tested homepage UI — clean OHo Mart branding, Google Sign-in, hero, stats, marquee
- [x] Code Quality fixes (kept from previous session): stable React keys, fixed empty catches,
      Python `is`→`==`, hardcoded test secrets moved to env vars, `console.error` → `logger.js`

### 2026-05-18 — Media Upload + Pagination + Cart UI
- [x] MediaUploader: client-side image compression via Canvas API (5MB → ~200KB)
- [x] ProductCard: larger cart button, rotating icon, amber styling, sold badges
- [x] Header cart badge: red, bounce animation, ring-2, 99+ cap
- [x] Backend GET /api/products: pagination (page, per_page, returns {products, total, pages})
- [x] Frontend HomePage: paginated grid with Prev/Next + page numbers + count indicator

### 2026-05-18 — WhatsApp + Auto-Reply
- [x] Twilio WhatsApp integration (twilio==9.10.9)
- [x] Order notifications: every new order sends detailed WhatsApp to ADMIN_WHATSAPP_NOTIFY
- [x] Auto-reply webhook `POST /api/whatsapp/webhook` — stores inbound + returns TwiML
- [x] `/api/admin/whatsapp-messages` admin viewer
- [x] All credentials env-var driven — zero hardcoding
- [x] Webhook URL for Twilio: `https://ohomart.online/api/whatsapp/webhook`

### 2026-05-18 — Deployment + Admin Seeding
- [x] Fixed `ALLOWED_ADMIN_EMAILS` → `ADMIN_EMAILS` (3 admin accounts seed correctly)
- [x] Google Client ID set in both backend & frontend `.env`
- [x] Admin Users tab — list, add, toggle active, delete, reset password
- [x] Full deployment package: `docker-compose.yml`, Dockerfiles, `nginx.conf`, `.env.example`
- [x] README.md with complete deployment guide for ohomart.online
- [x] SEO meta tags (title, description, OG tags, canonical URL)
- [x] 3 admins seeded: ockmicrosoft.games@gmail.com, tradebyabdul@gmail.com, royalu101@gmail.com

### Existing Features
- [x] Full product catalog (10 seeded fans)
- [x] Cart with color/size selection, COD checkout, order tracking, My Orders
- [x] Admin panel (products/orders/reviews/site settings)
- [x] Resend email for password reset

---

## Prioritized Backlog

### P0 — Required for Production Launch on `ohomart.online`
- [ ] Configure DNS: `ohomart.online` → server IP (A record)
- [ ] Install nginx on VPS + SSL via certbot
- [ ] Add `https://ohomart.online` to Google Cloud Console OAuth authorized origins
- [ ] Run `docker-compose up -d` on VPS

### P1 — Nice to Have (Post-Launch)
- [ ] Replace Unsplash placeholder product photos with real product photos via MediaUploader
- [ ] Update real WhatsApp number in admin site settings
- [ ] Configure Resend with verified `ohomart.online` domain for password reset emails
- [ ] **Security: Migrate JWT auth from `localStorage` to `httpOnly` cookies** (XSS hardening)

### P2 — Future Improvements
- [ ] Refactor `AdminDashboard.jsx` (1500+ lines) into sub-components: `ProductManagement`, `OrderManagement`, `ReviewManagement`, `AdminUsersManagement`, etc.
- [ ] Refactor `backend/server.py` (1300+ lines) into routers (`routes/products.py`, `routes/orders.py`, `routes/admin.py`, `routes/auth.py`)
- [ ] Integrate Sentry for production error logging (replace basic `logger.js`)
- [ ] Discount coupon codes
- [ ] Product search + filter (price range, category)
- [ ] Analytics dashboard (orders over time chart)

---

## Next Tasks
1. Deploy to VPS using `docker-compose up -d`
2. Set up nginx + SSL for `ohomart.online`
3. Add `ohomart.online` to Google OAuth authorized origins
4. Update WhatsApp number in admin settings
5. Replace placeholder product images with real photos
