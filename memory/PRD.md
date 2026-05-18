# OHo Mart PRD

## Problem Statement
Pakistan's #1 Imported Fan Store — full e-commerce platform for portable/neck/baby/travel fans.
Must be independently deployable on ohomart.online with no manual DB setup.

## Architecture
- **Frontend:** React 19 + Tailwind CSS + shadcn/ui (port 3000)
- **Backend:** FastAPI Python (port 8001)
- **Database:** MongoDB (auto-seeded on startup)
- **Auth:** Google Sign-In (One Tap) + JWT cookies for customers; email+password for admins
- **Domain:** ohomart.online

## Core Requirements (Static)
1. Product catalog with cart (color/size selection)
2. COD checkout (Cash on Delivery)
3. Order tracking (public, by order number)
4. Google Sign-In for customers
5. Admin panel: products, orders, reviews, site content, admin user management
6. Zero manual DB setup — auto creates collections/indexes/seeds on startup
7. No Emergent branding anywhere
8. Independently deployable via Docker or manual

## User Personas
- **Customer (Pakistan):** Browses fan catalog, adds to cart, places COD order, tracks order
- **Admin:** Manages products/orders/reviews/site content, adds new admin users

## What's Been Implemented

### 2026-05-18 — Initial Setup + Deployment Package
- [x] Fixed ALLOWED_ADMIN_EMAILS → ADMIN_EMAILS (bug: 3 admin accounts were never seeding)
- [x] Set Google Client ID in both backend and frontend .env
- [x] Admin Users tab UI added to AdminDashboard — list, add, toggle, delete, reset PW
- [x] Full deployment package: docker-compose.yml, Dockerfiles, nginx.conf, .env.example files
- [x] README.md with complete deployment guide for ohomart.online
- [x] SEO meta tags updated (title, description, OG tags, canonical URL)
- [x] 3 initial admin users seeded: ockmicrosoft.games@gmail.com, tradebyabdul@gmail.com, royalu101@gmail.com

### Existing Features (Already Implemented)
- [x] Full product catalog (10 seeded fans)
- [x] Shopping cart with color/size selection
- [x] Checkout (COD) + order placement
- [x] Order tracking page
- [x] My Orders (for logged-in users)
- [x] Admin panel (products/orders/reviews/site settings)
- [x] WhatsApp integration
- [x] Resend email for password reset
- [x] Google Sign-In skeleton (now configured with real client ID)

## Prioritized Backlog

### P0 (Critical for production)
- [ ] Configure DNS: ohomart.online → server IP
- [ ] Install nginx on VPS + SSL via certbot
- [ ] Add ohomart.online to Google Cloud Console OAuth authorized domains

### P1 (Nice to have)
- [ ] Product images — replace Unsplash URLs with real product photos
- [ ] WhatsApp number — update to real number in admin settings
- [ ] Email — configure Resend with verified domain

### P2 (Future)
- [ ] SMS/WhatsApp order notifications
- [ ] Discount coupon codes
- [ ] Product search/filter
- [ ] Analytics dashboard (orders over time chart)

## Next Tasks
1. Deploy to VPS using docker-compose
2. Set up nginx + SSL for ohomart.online
3. Add ohomart.online to Google OAuth console
4. Update WhatsApp number in admin settings
5. Replace product images with real photos
