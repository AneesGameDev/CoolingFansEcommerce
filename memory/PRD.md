# OHo Mart — Vercel Refactor PRD

## Original Problem
Refactor the existing FastAPI + React "Cooling Fan" e-commerce repo (`AneesGameDev/CoolingFansEcommerce`) so it deploys to **Vercel's free tier as a single project** with domain `ohomart.online`. No backend host, no card, no always-on server. MongoDB Atlas stays as DB. All features preserved.

## Architecture
- React 19 frontend at repo root (CRA + craco for `@/` alias)
- Node.js Express serverless function at `/api/index.js` (Vercel Function)
- MongoDB Atlas via native driver, client cached on `global` across warm invocations
- vercel.json rewrites `/api/(.*)` → `api/index.js`, SPA fallback for everything else
- Self-seeding on first DB connect (indexes, admins, products, reviews, site settings)

## Implemented
- Date: 2026-01
- Backend rewritten Python→Node.js (Express) — all 40+ endpoints preserved
- JWT cookie auth + bcrypt for admins; Google ID-token verification for customers
- Cached MongoClient + idempotent seed gated on global flag
- Optional Resend + Twilio integrations — true no-ops when env vars are blank
- Frontend copied as-is from upstream repo; same admin panel, same checkout/COD, same WhatsApp button
- `vercel.json` + `.env.example` + comprehensive `README.md` with 5-step deploy guide
- Zero Emergent references — removed `.emergent/`, `memory/`, `test_reports/`, `.gitconfig`, docker-compose, nginx config, craco health-check plugin
- Build verified: 186 kB gzipped JS, compiles cleanly
- Delivery zip: `/app/output/ohomart-vercel.zip` (134 KB, 105 files)

## What's NOT Tested
Per user instruction "No preview deploys, no test runs — just deliver the code." Code was syntax-checked and the React app build passes; no E2E/curl tests run.

## Next Action Items
- User pushes to GitHub, imports on Vercel, adds env vars, connects domain
- Whitelist `0.0.0.0/0` on MongoDB Atlas Network Access
- Add `https://ohomart.online` to Authorized JavaScript Origins in Google Cloud Console
