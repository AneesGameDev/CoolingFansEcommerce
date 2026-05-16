# CoolBreeze PK - E-Commerce Fan Website PRD

## Project Overview
Complete e-commerce website for portable summer fans (Neck Fans, Baby Fans, Desk Fans, Travel Fans). Pakistani market focus with Cash on Delivery ordering.

## Architecture
- **Frontend**: React + TailwindCSS + Shadcn UI
- **Backend**: FastAPI (port 8001)
- **Database**: MongoDB (coolbreeze_db)
- **Deployment**: Kubernetes (Emergent)

## What's Been Implemented (v1.0 - 2026-05-16)

### Frontend Pages
- **HomePage** (`/`) - Hero banner, summer sale strip, features section, 10-product grid with discount badges, WhatsApp CTA, footer
- **ProductDetailPage** (`/product/:id`) - Image gallery, color/size selectors, quantity control, order button, reviews section, write review form
- **CheckoutPage** (`/checkout`) - COD form with Name, Phone, WhatsApp, Email, Address, City, Province, Notes
- **OrderSuccessPage** (`/order-success`) - Order number, order details, WhatsApp confirm button
- **AdminLoginPage** (`/admin`) - JWT-based admin authentication
- **AdminDashboard** (`/admin/dashboard`) - Full admin panel

### Admin Panel Features
- Dashboard Overview (total orders, pending, revenue, products stats)
- Orders Tab: List all orders, expand for details, change status (pending/confirmed/shipped/delivered/cancelled), WhatsApp button, delete
- Products Tab: Grid view, Add/Edit/Delete products with full form (name, description, price, discounted price, category, images URLs, video URL, colors, sizes, features, battery life, stock, active toggle)
- Reviews Tab: List all reviews, approve/hide toggle, edit, delete, add new review

### Backend APIs
- `GET /api/products` - Public product listing (active only)
- `GET /api/products/{id}` - Product detail
- `POST /api/products` - Admin: add product
- `PUT /api/products/{id}` - Admin: update product
- `DELETE /api/products/{id}` - Admin: delete product
- `POST /api/orders` - Public: place COD order
- `GET /api/admin/orders` - Admin: all orders
- `PUT /api/admin/orders/{id}` - Admin: update order status
- `DELETE /api/admin/orders/{id}` - Admin: delete order
- `GET /api/reviews/{product_id}` - Public: product reviews
- `POST /api/reviews` - Public: submit review
- `GET /api/admin/reviews` - Admin: all reviews
- `POST /api/admin/reviews` - Admin: add review
- `PUT /api/admin/reviews/{id}` - Admin: edit review
- `DELETE /api/admin/reviews/{id}` - Admin: delete review
- `PUT /api/admin/reviews/{id}/toggle` - Admin: approve/hide review
- `GET /api/admin/stats` - Admin: dashboard statistics
- `POST /api/admin/login` - Admin authentication

### Seed Data
- 10 products (Neck Fan, Baby Fan, Desk Fan, Handheld Fan, Bladeless Neck Fan, Baby Night Fan, Travel Fan, Car Fan, Tower Fan, Kids Fan)
- 9 seed reviews distributed across products
- Admin account seeded at startup

## Admin Credentials
- Email: admin@coolbreeze.pk
- Password: Admin@123

## Design
- Theme: Cool Blue (#0EA5E9) + White + Sky Blue (#F0F9FF background)
- Sale badge: Amber (#F59E0B)
- Fonts: Outfit (headings) + Plus Jakarta Sans (body)
- Mobile-first: 2-col product grid on mobile, 5-col on desktop

## Prioritized Backlog

### P0 (Critical - Next Steps)
- [ ] Product image upload (file upload to cloud storage)
- [ ] WhatsApp business number configuration (currently +923000000000)

### P1 (High Priority)
- [ ] Order SMS/WhatsApp notifications when status changes
- [ ] Product search and filter (by category, price range)
- [ ] Coupon/discount code system

### P2 (Nice to Have)
- [ ] Product stock management alerts
- [ ] Analytics dashboard with charts
- [ ] Multi-image upload from admin with drag-and-drop
- [ ] Email confirmation on order

## Test Results (v1.0)
- Backend: 100% (15/15 tests passed)
- Frontend: 95% (1 bug found and auto-fixed by testing agent)
