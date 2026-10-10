# PharmaTrack v2 — Roadmap

Phased build plan for the rewrite. Each phase is independently verifiable.
This supersedes the old `DrugFinderProjects/PHARMATRACK_INTEGRATION_README.md`
(full parity is the goal; this is the execution plan for it).

## Phase 0 — Monorepo scaffold

- [ ] Create repo structure: `backend/`, `pharmacy-web/`, `customer-app/`, `docs/`
- [ ] Root `package.json` with npm workspaces (`backend`, `pharmacy-web`)
- [ ] `.gitignore`, `LICENSE`, top-level `README.md`
- [ ] `backend/.env.example`, `backend/package.json` (`express`, `prisma`, `zod`,
      `jsonwebtoken`, `bcrypt`, `helmet`, `cors`, `pino`)
- [ ] `pharmacy-web` via Vite (React + TS + Tailwind) scaffold
- [ ] Copy `DrugFinderProjects/customer_mobile_app` → `customer-app/`
      (do not modify the source)
- [ ] `git init` + first commit

**Verify:** `npm install` at root; `flutter analyze` clean in `customer-app/`.

## Phase 1 — Data layer (Prisma)

- [ ] `backend/prisma/schema.prisma` implementing `DATA_MODEL.md`
- [ ] `prisma migrate dev` → initial migration on a local PostgreSQL/Neon DB
- [ ] Upsert-based seed (`prisma/seed.js`, gated by `SEED_DEMO=true`)
- [ ] Prisma client singleton in `src/lib/prisma.js`

**Verify:** migrate + seed run; tables/indexes match `DATA_MODEL.md`.

## Phase 2 — Backend core framework

- [ ] `app.js`: express, `helmet`, `cors` (from `CORS_ORIGINS`), `pino`
      request logging, JSON body limit
- [ ] Error plumbing: `AppError`, central `errorHandler`, error envelope
- [ ] `src/lib/`: `jwt.js` (sign/verify, access+refresh secrets), `password.js`
      (bcrypt), `asyncHandler`
- [ ] `GET /health`

**Verify:** `npm run dev` starts; `GET /health` returns `ok`.

## Phase 3 — Auth & tenancy

- [ ] `POST /auth/setup-admin` (one-time bootstrap, `ADMIN_SETUP_CODE`)
- [ ] `POST /auth/login` (identifier = name/email), `ACCOUNT_BLOCKED` checks
- [ ] DB-backed login lockout (`LoginAttempt`, 5/60s, web + api scopes)
- [ ] `POST /auth/refresh` (rotation) and `POST /auth/logout` (revocation +
      access-token blocklist)
- [ ] `GET /auth/me`
- [ ] `POST /auth/register/pharmacy` (pending application)
- [ ] `POST /auth/complete-profile` (first-login forced setup)
- [ ] Middleware: `auth`, `requireRole`, `requireTenant`, `validate(schema)`

**Verify:** full lifecycle test — bootstrap → pending applicant → blocked login →
admin approves → forced setup → normal login.

## Phase 4 — Inventory (products, batches, movements)

- [ ] `GET/POST/PATCH /products` + `GET/POST /products/:id/batches` + `PATCH /batches/:id`
- [ ] Batch remaining-stock computation (signed sums)
- [ ] `POST /movements` with sign rules, `NEGATIVE_STOCK` guard
- [ ] `LOSS` → auto `LossReport` creation
- [ ] `GET /movements` filtering + `GET /movements/export` (CSV)
- [ ] `GET /reports/dashboard` (totals, low-stock, expiry, recent movements)

**Verify:** unit + API tests (Vitest/supertest) for stock math, tenant
isolation, and CSV content.

## Phase 5 — Public discovery + admin + losses

- [ ] `GET /pharmacies`, `/pharmacies/:id`, `/pharmacies/:id/products`
      (active only, safe projection)
- [ ] `GET /products/search?q=` and `GET /products/popular`
- [ ] `PATCH /pharmacies/me` (own profile update)
- [ ] Admin: `GET /admin/pharmacies`, `POST /admin/pharmacies`,
      `PATCH /admin/pharmacies/:id/status`, `DELETE /admin/pharmacies/:id`
- [ ] `GET/POST/DELETE /users`
- [ ] Loss reports: `GET /loss-reports`, `PATCH /loss-reports/:id/reported`,
      `GET /loss-reports/export`

**Verify:** simulated app calls return only safe public data; controlled items
and exact stock never leak; admin status actions flow correctly.

## Phase 6 — Pharmacy web app (React)

- [ ] API client (`fetch` wrapper, auth header, envelope unwrap, typed errors)
- [ ] Auth store + route guards (login / admin / pharmacist) + bootstrap page
- [ ] Layout + sidebar + shell (mirroring the Flask dashboard look)
- [ ] Screens: Dashboard, Products, Product detail+batches, Add/Edit product,
      Record movement, Movements list/export, Loss reports/export, Settings,
      Manage users, Manage pharmacies (approve/suspend/reject/delete/add),
      Profile setup, Preferences
- [ ] TanStack Query wired; mutations invalidate the relevant lists

**Verify:** `npm run build` clean; manual pass against the backend.

## Phase 7 — Customer mobile app (Flutter)

- [ ] Update `lib/config.dart` `API_BASE_URL`
- [ ] Rewrite `pharmacy_service.dart` for the new endpoints/shapes
- [ ] Adapt `drug.dart`, `pharmacy.dart`, `popular_drug.dart` (camelCase, string
      numerics, groups)
- [ ] Keep cache/offline/retry behaviour; maps/routing untouched

**Verify:** `flutter analyze` clean; end-to-end: search → list → detail →
directions against the new backend.

## Phase 8 — Deployment & hardening

- [ ] `render.yaml` blueprint + env names (`DATABASE_URL` from Neon, JWT
      secrets, `ADMIN_SETUP_CODE`, `CORS_ORIGINS`)
- [ ] Neon PostgreSQL project wired to `DATABASE_URL` (SSL)
- [ ] Deploy migrations as part of the render start command
- [ ] CORS verification from the web app origin
- [ ] `GET /health` as the Render health check
- [ ] Rate-limit + helmet headers verified in production

**Verify:** full user journey on the deployed URL.

## Feature-parity checklist (old Flask → new)

| Old feature | New location |
|---|---|
| Admin bootstrap via setup code | `POST /auth/setup-admin` |
| Pharmacy self-registration → approval | `POST /auth/register/pharmacy` + admin status |
| Login lockout (web + api) | `LoginAttempt` + middleware |
| JWT access/refresh/logout | auth module (rotation + revocation) |
| Product CRUD + barcode uniqueness per pharmacy | products module |
| Batches + expiry | batches module |
| Movements (7 types, signed, no delete) | movements module |
| Loss auto-report + mark reported | movements + lossReports |
| Low-stock & expiry alerts | `GET /reports/dashboard` |
| Public safe list (no stock, no controlled) | products public projection |
| Public pharmacies + search + popular | pharmacy/products public |
| Pharmacy profile & forced setup | `complete-profile`, `PATCH /pharmacies/me` |
| Admin manage users/pharmacies | admin + users modules |
| CSV export (movements, losses) | export endpoints |
| Health check | `GET /health` |