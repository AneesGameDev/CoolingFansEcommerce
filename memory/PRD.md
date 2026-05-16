# CoolBreeze PK - E-Commerce Fan Website PRD

## Project Overview
Complete e-commerce website for portable summer fans (Neck Fans, Baby Fans, Desk Fans, Travel Fans). Pakistani market focus with Cash on Delivery ordering, Google login for reviews, and full order tracking.

## Architecture
- **Frontend**: React + TailwindCSS + Shadcn UI + Sonner (toasts)
- **Backend**: FastAPI (port 8001)
- **Database**: MongoDB (coolbreeze_db)
- **Auth**: Emergent-managed Google OAuth (review/order-history gate) + JWT (admin)
- **Deployment**: Kubernetes (Emergent)

## What's Been Implemented

### v1.0 (2026-05-16) — MVP
- Homepage, ProductDetailPage, single-item CheckoutPage, OrderSuccessPage
- Admin Panel (Dashboard / Orders / Products / Reviews) with JWT auth
- 10 seeded products, 9 seed reviews
- WhatsApp CTA buttons

### v2.2 (2026-05-16) — Multi-Admin + Mobile + Carousel
**Multi-Admin with Google Gating**
- 3 shared admin accounts seeded: ockmicrosoft.games@gmail.com, tradebyabdul@gmail.com, royalu101@gmail.com (all password: `Anees@3221.`)
- Admin button in Header HIDDEN until a Google-signed-in user's email is in `ALLOWED_ADMIN_EMAILS` (via /api/admin/check-access)
- Forgot Password flow: enter Gmail → /api/admin/forgot-password sends 6-digit bcrypt-hashed code (15-min expiry, 5-attempt limit, brute-force protected) via Resend → enter code + new password (8+ char) → /api/admin/reset-password updates the hash
- Resend integration: RESEND_API_KEY env var, asyncio.to_thread non-blocking send, anti-enumeration generic response
- Note: Resend free sandbox only delivers to the account-owner email (`ockmicrosoft.games@gmail.com`). For the other 2 admins, verify a custom domain at resend.com/domains to enable real delivery

**Mobile Optimization**
- Compact hero on mobile: py-8 instead of py-16, smaller text-2xl headline, hidden hero subtitle, mini trust ribbon
- Compact stats strip (4-col tiny) on mobile vs full version on tablet+
- Products grid now visible after one short scroll (~705px in 844px viewport)

**Auto-Sliding Testimonials Carousel**
- CSS-only continuous left-loop via `animate-slide-left` keyframes (35s base; scales with item count)
- Duplicated array for seamless wrap; pauses on hover (group-hover:[animation-play-state:paused])
- Edge fades on both sides; supports unlimited testimonials

**Admin Testimonials Editor**
- New "Customer Testimonials" panel inside Site Content tab
- Per-row fields: name, city, date (date picker), rating (1-5 stars), avatar URL, quote textarea
- PUT /api/admin/testimonials bulk-replaces the list

**Other**
- Admin Review form datetime-local input restored (was missing in iter_4)

### v2.1 (2026-05-16) — Elite Branding + 8 Enhancements
**Trust & Branding**
- ❄️ Cooling animations on hero: drifting snowflakes, wind streams, frost overlay, animated radial spotlight, golden shimmer on "Premium Quality"
- 📊 Stats Strip (dark band, amber border): 50,000+ Happy Customers / 12,000+ Orders Delivered / 4.9/5 Rating / 100+ Cities Served
- 🎫 Continuous-scroll animated sale ticker (animate-ticker)
- 🛡️ "100% Satisfaction Guarantee" green banner with shield watermark
- 💬 "Real Reviews from Real Homes" — 3 testimonial cards (admin-editable via featured_testimonials)
- 🎤 Dark Founder Quote section with gradient blobs
- 🎨 Bigger, bolder unique value text + elite footer

**Admin Power**
- ⚙️ "Site Content" admin tab — edit Brand / Hero / Sale Banner / Products section / Why Buy / Stats / Founder / Guarantee / WhatsApp CTA / Footer texts. PUT /api/admin/site-settings whitelists known keys.
- 📅 Admin can set custom Review Date & Time (datetime-local input) when adding/editing reviews — perfect for backdating seeded testimonials

**Stock Behavior**
- 🚫 stock=0 → "SOLD OUT" overlay badge (red, rotated, -12deg) + grayscale image + disabled "Currently Sold Out" button on cards
- 🚫 PDP: "Currently Sold Out" button replaces Add to Cart / Order Now; "Out of Stock — More coming soon!" notice

**Guest → User Order Linking** (critical UX fix)
- On checkout, order_number is saved to `localStorage.coolbreeze_guest_orders_v1`
- Backend `POST /api/orders/link-guest` (auth required) — claims orders by number, sets user_email
- AuthContext automatically calls link-guest after `/auth/me` resolves on login
- Also: order creation auto-links to a registered user when the email field matches a known user

### v2.0 (2026-05-16) — 13-Feature Drop
**Auth & Personalization**
- Emergent Google OAuth integration (`/api/auth/session`, `/api/auth/me`, `/api/auth/logout`)
- AuthContext + AuthCallback (synchronous session_id hash detection prevents race)
- User dropdown in Header (My Orders, Track Order, Sign Out)
- httpOnly secure cookie session_token, 7-day expiry

**Cart & Checkout**
- CartContext (localStorage persisted, `coolbreeze_cart_v1`)
- Slide-out CartDrawer (Sheet) with qty +/-, remove, total, savings
- Quick "+ Add to Cart" button on every product card
- "Add to Cart" + "Order Now" buttons on ProductDetailPage
- Multi-item COD checkout (items[]) with strict fields: Name, Phone, WhatsApp, Address, City/Location, Province

**Product Enhancements**
- `color_variants` field [{name, hex, image_url}] — main image swaps when a color is clicked
- `video_url` field — "Watch Video" button overlay opens HTML5 video player
- `total_sold` field — "X+ sold" badge on cards and PDP

**Reviews**
- Login-gated review form (Google sign-in required); auto-fills name/email
- Up to 3 review images uploaded as base64 (1.5MB cap each)
- Customer-facing image lightbox (click thumbnail → full-size dialog)
- Admin can add/edit "fake" reviews with file-upload images (base64)

**Order Tracking**
- `/track` — public guest tracking by order number only
- `/my-orders` — logged-in users see all orders linked to their email
- Backend: `GET /api/orders/track/{order_number}`, `GET /api/orders/my`

**Trust UI & Branding**
- Hero: "Pakistan's #1 Imported Fan Store" + "Beat the Heat with Premium Quality"
- "Why Buy With Us" section with 6 cards (Imported, 1-2 Day Delivery, 7-Day Check Warranty, Easy Returns, COD Only, Long Battery)
- Trust strip on PDP (Delivery / Warranty / Returns)

**Admin Panel Enhancements**
- Color Variants editor (name + hex picker + image URL rows; add/remove)
- File-upload review images (base64) replacing URL-list textarea
- Multi-item order display (items[]) with backward-compat fallback

### Migration & Schema Safety (v2.0)
- Startup migration backfills `color_variants=[]`, `video_url=None`, `total_sold=0` on existing products
- Old single-item orders deleted (clean cutover); new orders use items[]

## Admin Credentials
- Email: admin@coolbreeze.pk
- Password: Admin@123

## Test Google Session (preview/testing)
- session_token: `test_session_fixed_abc123`
- user_id: `test-user-fixed-001`
- email: `test.reviewer@coolbreeze.pk`
- (Use cookie or Bearer header; re-seed in `/app/memory/test_credentials.md`)

## Design
- Theme: Sky Blue (#0EA5E9) + Sky Blue background (#F0F9FF) + White
- Accent: Amber (#F59E0B) for sales / Add to Cart
- Fonts: Outfit (headings) + Plus Jakarta Sans (body)
- Mobile-first: 2-col products on mobile, 5-col desktop

## Prioritized Backlog (v2.1+)

### P0
- [ ] Replace placeholder WhatsApp `+923000000000` with real business number (env var: WHATSAPP_NUMBER)
- [ ] Product image upload from admin (currently URL-only)

### P1
- [ ] Order SMS/WhatsApp notifications on status change
- [ ] Product search & filter (category / price / stock)
- [ ] Coupon / promo code system
- [ ] Address book / saved addresses for logged-in users (re-fill at checkout)

### P2
- [ ] Stock-alert low-inventory notifications
- [ ] Analytics dashboard with revenue & top-product charts
- [ ] Multi-image upload for products (drag-and-drop)
- [ ] Email confirmation on order (Resend / SendGrid)
- [ ] A11y: add `Description`/aria-describedby on Radix DialogContent (lightbox & modals)
- [ ] Suppress unauth /auth/me 401 console error on initial load

## Test Results
- **v1.0**: Backend 100% (15/15), Frontend 95% (1 auto-fix)
- **v2.0 iter 2**: Backend 100% (20/20), Frontend 85% (1 CRITICAL nav bug)
- **v2.0 iter 3 (post-fix)**: Backend 100%, Frontend 100% — all critical flows verified
