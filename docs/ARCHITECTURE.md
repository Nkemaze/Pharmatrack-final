# PharmaTrack v2 — Architecture

> Status: **design (pre-implementation)**. This document describes the target
> system. Nothing here is built yet.

## 1. Overview

PharmaTrack is a medicine-discovery and pharmacy-inventory platform for
Cameroon. It has three parts that share one backend:

| Part | What it is | Talks to |
|---|---|---|
| **backend** | Node.js + Express REST API | PostgreSQL (via Prisma) |
| **pharmacy-web** | React single-page app for pharmacy staff & platform admin | backend API |
| **customer-app** | Flutter mobile app for the public (find medicines, pharmacies, directions) | backend API |

This is a **clean rewrite** of the existing Flask + SQLite + Jinja monolith
(`DrugFinderProjects/pharmatrack`) and the Firebase-era Flutter app. The old
project is kept untouched as a reference. Behavior and features are ported;
technology, code structure, API contract, and data model are redesigned.

## 2. Goals and non-goals

### Goals
- One API serving both the pharmacy dashboard and the public mobile app.
- A real production database (PostgreSQL) with a typed schema and migrations.
- Clean separation: API layer, service layer, data layer.
- Multi-tenant from the ground up (many pharmacies, one deployment).
- Preserve all current features (full parity — see `ROADMAP.md`).
- Keep the public discovery endpoints safe and legally conservative.
- Deploy to Render, database on Neon.

### Non-goals (for v1)
- No e-commerce: no cart, checkout, payment, reservation, prescription upload,
  or delivery. This is a **discovery directory** only.
- No offline-first sync engine for pharmacy inventory (the old SQLite app was
  desktop/offline; v2 is online-only for the dashboard).
- No native desktop shell (pywebview is dropped; the dashboard is a web app).
- No server-rendered HTML from the backend (the API is JSON-only, except CSV
  exports).

## 3. System context

```
                         ┌─────────────────────────────┐
                         │        PostgreSQL            │
                         │        (Neon, managed)       │
                         └──────────────┬──────────────┘
                                        │  Prisma
                                        │
        ┌───────────────────────────────┴───────────────────────────────┐
        │                      backend  (Node + Express)                 │
        │  /api/v1  ·  JWT auth  ·  multi-tenant  ·  validation  ·  CSV   │
        └───────┬───────────────────────────────────────────────┬────────┘
                │  HTTPS / JSON                                  │  HTTPS / JSON
                │                                                │
     ┌──────────┴───────────┐                        ┌───────────┴───────────┐
     │   pharmacy-web       │                        │    customer-app       │
     │   (React + Vite SPA) │                        │    (Flutter)          │
     │   staff / admin      │                        │    public / anonymous │
     └──────────────────────┘                        └───────────────────────┘
                                                            │
                                                OpenStreetMap tiles /
                                                OSRM routing / Nominatim
```

Client-side third parties (unchanged, called directly by the Flutter app):
OpenStreetMap tiles, the OSRM routing service, and Nominatim geocoding. The
backend does not proxy these.

## 4. Technology stack

| Layer | Choice |
|---|---|
| Backend runtime | Node.js 20 LTS |
| Backend framework | Express 4 |
| Language (backend) | **JavaScript, ESM** (`"type": "module"`) |
| Database | PostgreSQL 16 |
| ORM / migrations | **Prisma** |
| Validation | Zod schemas per endpoint |
| Auth | JWT access (30 min) + refresh (30 d) with rotation & revocation |
| Password hashing | bcrypt |
| HTTP hardening | helmet, cors, express-rate-limit (DB-backed lockout for login) |
| Logging | pino |
| Pharmacy web | Vite + React 18 + **TypeScript** + Tailwind CSS + TanStack Query + React Router |
| Customer app | Flutter (copied from the old project, adapted to the new API) |
| Hosting | Render Web Service (API + pharmacy-web) · Neon (PostgreSQL) |

## 5. Repository layout

```
PharmaTrack/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.js
│   ├── src/
│   │   ├── server.js              # bootstrap: app.listen
│   │   ├── app.js                 # express app, middleware, route mounting
│   │   ├── config/                # env parsing & constants
│   │   ├── lib/                   # prisma client, jwt, password, errors, asyncHandler
│   │   ├── middleware/            # auth, tenant scope, validate, error, rateLimit
│   │   ├── modules/               # feature modules (see §6)
│   │   │   ├── auth/
│   │   │   ├── pharmacies/
│   │   │   ├── products/
│   │   │   ├── batches/
│   │   │   ├── movements/
│   │   │   ├── lossReports/
│   │   │   ├── reports/
│   │   │   ├── users/            # admin user management
│   │   │   └── admin/            # platform-admin pharmacy management
│   │   └── routes.js              # mounts /api/v1 router
│   ├── tests/
│   ├── .env.example
│   └── package.json
├── pharmacy-web/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── app/                   # router, providers, layout
│   │   ├── lib/                   # api client, query client, auth store
│   │   ├── components/            # UI primitives + shared widgets
│   │   ├── features/              # auth, dashboard, inventory, movements,
│   │   │                          #   loss-reports, settings, admin
│   │   └── types/                 # API types shared across features
│   ├── index.html
│   ├── tailwind.config.* 
│   └── package.json
├── customer-app/                  # copied Flutter project (see §9)
├── docs/
│   ├── ARCHITECTURE.md            # this file
│   ├── DATA_MODEL.md
│   ├── API.md
│   └── ROADMAP.md
├── render.yaml                    # Render blueprint (web service + env)
├── package.json                   # npm workspaces root
├── .gitignore
└── README.md
```

`backend` and `pharmacy-web` are npm workspaces under the root `package.json`.
`customer-app` is an independent Flutter project (not part of the Node
workspace).

## 6. Backend architecture

A **layered, feature-module** design. Each module under `src/modules/<name>/`
contains up to four files:

```
<name>.routes.js       Express router: paths, HTTP methods, middleware chain
<name>.controller.js   Parses/validates request, calls the service, sends response
<name>.service.js      Business rules; the only place that calls Prisma
<name>.schema.js       Zod request schemas (body/query/params)
```

Rules:
- **Routers** contain no business logic.
- **Controllers** never touch Prisma directly.
- **Services** own all database access and business invariants (e.g. "a sale may
  not drive a batch negative", "a loss movement creates a loss report").
- Every response goes through the shared envelope/error helpers (§ below).

Cross-cutting middleware (`src/middleware/`):
- `auth` — verifies the access token, loads the caller onto `req.user`.
- `tenantScope` — resolves `req.pharmacyId` from the token; admin endpoints
  opt out explicitly.
- `validate(schema)` — validates `body`/`query`/`params` with Zod, rejects
  unknown fields.
- `errorHandler` — converts thrown `AppError`s into the standard JSON error body.
- `rateLimit` — general API limiter; the login limiter is DB-backed (see §13).

### Response envelope (see `API.md` for the full contract)

```
success:  { "data": <payload>, "meta": { ...optional } }
error:    { "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }
```

## 7. Authentication and multi-tenancy

- Every account has a **role**: `ADMIN`, `PHARMACY`, or `USER`.
- Pharmacy staff (`PHARMACY`) and their data belong to a **pharmacy** tenant
  (`User.pharmacyId`). Every inventory query is scoped by that id.
- The JWT payload carries `sub` (user id), `role`, and `pharmacyId`.
- `tenantScope` middleware is the single enforcement point: a `PHARMACY` caller
  can only read/write rows whose `pharmacyId` matches the token. Attempting to
  touch another tenant returns `403 TENANT_SCOPE`.
- `ADMIN` operates at platform level (manage pharmacy accounts, users, and
  statuses). By default an admin is **not** given another pharmacy's inventory
  unless explicitly browsing it; the admin console focuses on accounts.
- Public discovery routes require **no token**.

Token lifecycle:
- `POST /auth/login` → issues an access token (short-lived) and a refresh token
  (long-lived, persisted so it can be rotated and revoked).
- `POST /auth/refresh` → rotates the refresh token and issues a new access token.
- `POST /auth/logout` → revokes the presented refresh token and blacklists the
  current access token's `jti` until it expires.
- Access-token revocation is checked via a `RevokedAccessToken` table (pruned by
  expiry). Refresh tokens live in `RefreshToken`.

Account lifecycle (ported from the Flask flow):
- **Bootstrap**: the first `ADMIN` is created via `POST /auth/setup-admin`, which
  requires the `ADMIN_SETUP_CODE`. Once an admin exists it returns `409`.
- **Pharmacy application**: `POST /auth/register/pharmacy` creates a pharmacy in
  `PENDING` with a linked `PENDING` user; it cannot sign in until approved.
- **Admin provisioning**: an admin can also create an `ACTIVE` pharmacy account
  directly with a temporary password and `mustUpdateProfile = true`.
- **First login**: a user with `mustUpdateProfile` is forced through
  `POST /auth/complete-profile` (pharmacy details + new password) before any
  other dashboard route is usable.
- **Status changes** drive `login_status_block`: pending / suspended / rejected
  tenants are refused at login.

## 8. Pharmacy web app (React)

- **Vite + React + TypeScript** SPA, routed with **React Router**.
- **TanStack Query** for all server state (caching, invalidation, retries).
- **Tailwind CSS** for styling, matching the current dashboard's look.
- A single **API client** (`src/lib/api.ts`) wraps `fetch`, attaches the bearer
  token, unwraps the `{ data }` envelope, and throws typed `ApiError`s.
- Auth is held in a small store (memory + `localStorage` for the refresh token);
  a route guard mirrors the old `login_required` / `admin_required` /
  `pharmacist_required` gates.

Screens (parity with the Flask templates):
- Login, register (application form for hosted mode), admin console bootstrap.
- Dashboard (pharmacy stats, or admin overview).
- Inventory: product list, add product, product details + batches, edit product.
- Movements: record movement; movements export.
- Loss reports: list, mark reported, export.
- Settings: pharmacy profile, platform settings (admin), manage users (admin).
- Manage pharmacies (admin): approve / suspend / reject / delete / add.

## 9. Customer mobile app (Flutter)

- The existing Flutter project is **copied** into `customer-app/` and kept as a
  real Flutter app. The original stays in `DrugFinderProjects/`.
- `lib/config.dart` points `API_BASE_URL` at the new backend.
- Because the API is redesigned (camelCase, enveloped, new field names), these
  change: `lib/services/pharmacy_service.dart` and the models
  (`drug.dart`, `pharmacy.dart`, `popular_drug.dart`).
- Unchanged: maps, offline tile caching, OSRM routing, location/Nominatim,
  settings, theme, `app_state.dart`, and the screens themselves.
- Public endpoints it consumes: `GET /pharmacies`, `/pharmacies/:id`,
  `/pharmacies/:id/products`, `/products/search`, `/products/popular`.

## 10. Public API safety and legal constraints

The public (anonymous) endpoints must obey these rules, which are enforced in
the product service's public projections:

- Never expose **exact stock quantities** — only a boolean `inStock`.
- **Controlled medicines are excluded** from public listings.
- Never expose patient data, prescription records, dispensing history, internal
  notes, or account data.
- Public responses may include: medicine name, strength, form, category,
  prescription requirement flag, the pharmacy's identity, its supplied price,
  and `inStock`.
- Prices are informational, attributed to the supplying pharmacy, and never
  presented as a guaranteed offer or a completed sale.
- The dashboard labels controlled/prescription items; the pharmacy — not the
  system — determines legal classification and lawful dispensing.

Context: Cameroon Law No. 90/035 of 10 Aug 1990 (pharmacy practice/advertising)
and Law No. 97/019 of 7 Aug 1997 (narcotic/psychotropic substances). This is a
product-design constraint, not legal advice; confirm with MINSANTE/DPML and the
National Order of Pharmacists before public launch.

## 11. Configuration and environment variables

`backend/.env` (see `.env.example`):

| Variable | Required | Purpose |
|---|---|---|
| `NODE_ENV` | yes | `development` / `production` |
| `PORT` | no | default 5000 |
| `DATABASE_URL` | yes | Neon PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | yes | access-token signing secret |
| `JWT_REFRESH_SECRET` | yes | refresh-token signing secret |
| `JWT_ACCESS_TTL` | no | default `30m` |
| `JWT_REFRESH_TTL` | no | default `30d` |
| `ADMIN_SETUP_CODE` | yes | bootstrap code for the first admin |
| `CORS_ORIGINS` | no | comma-separated allowed origins |
| `BCRYPT_ROUNDS` | no | default 12 |

The backend **refuses to start in production** without the required secrets.

## 12. Hosting and deployment

```
Render
├── Web Service  (backend, gunicorn→node equivalent): `node src/server.js`
│     env: DATABASE_URL (Neon), JWT_* secrets, ADMIN_SETUP_CODE, CORS_ORIGINS
├── Static Site / Web Service (pharmacy-web, `vite build` → dist/)
└── (database lives on Neon, not Render)

Neon
└── PostgreSQL 16 project + branch
```

- `render.yaml` declares the services and env var names.
- Migrations run on deploy (`prisma migrate deploy`) before the service starts.
- `GET /api/v1/health` is the health check (checks DB connectivity).
- The Flutter APK (optional) can still be served by a small static route.

## 13. Security

- Passwords hashed with bcrypt; never logged.
- **DB-backed login lockout** (5 attempts / 60 s) keyed by account (web) and by
  IP (API) — survives restarts and works across multiple workers.
- JWT secrets separate for access and refresh; refresh tokens rotate on use.
- `helmet` for security headers; CORS restricted to configured origins.
- Zod validation rejects unknown fields on every write.
- Tenant scoping enforced centrally (`tenantScope`), not per-endpoint.
- No secrets committed; `.env` gitignored; the stale Firebase service-account
  file from the old project is **not** carried over.

## 14. Observability and error handling

- `pino` structured JSON logs with a request id per request.
- Central `errorHandler` maps `AppError(code, status)` to the error envelope;
  unexpected errors log a stack and return `500 INTERNAL_ERROR`.
- Health endpoint reports DB connectivity (`ok` / `degraded`).
- (Future) request timing and slow-query logging via Prisma middleware.

## 15. Testing strategy

| Layer | Tool |
|---|---|
| Backend unit/service | Vitest (or Jest) + a test database |
| Backend API | supertest against the Express app |
| Web | Vitest + React Testing Library; Playwright for critical flows (later) |
| Flutter | `flutter test`, `flutter analyze` |

Backend tests run against a disposable PostgreSQL schema (docker or a Neon
branch). Key cases to cover: auth/login lockout, tenant isolation, public
projection hides stock & controlled items, movement sign rules, loss-report
creation on `loss`.

## 16. Migration from the Flask app

Mapping of the old surface to the new one. Full endpoint reference in `API.md`.

| Old (Flask) | New (Express) |
|---|---|
| `POST /api/v1/auth/login` | `POST /api/v1/auth/login` |
| `POST /api/v1/auth/refresh` | `POST /api/v1/auth/refresh` |
| `POST /api/v1/auth/logout` | `POST /api/v1/auth/logout` |
| `GET /api/v1/products` (public or scoped) | split: `GET /products` (scoped) + public `/products/search` & `/pharmacies/:id/products` |
| `GET /api/v1/products/<id>` | `GET /api/v1/products/:id` |
| `POST /api/v1/products` | `POST /api/v1/products` |
| `PUT /api/v1/products/<id>` | `PATCH /api/v1/products/:id` |
| `GET /api/v1/products/<id>/batches` | `GET /api/v1/products/:id/batches` |
| `POST /api/v1/products/<id>/batches` | `POST /api/v1/products/:id/batches` |
| `POST /api/v1/movements` | `POST /api/v1/movements` |
| `GET /api/v1/reports/dashboard` | `GET /api/v1/reports/dashboard` |
| `GET /api/v1/reports/losses` | `GET /api/v1/loss-reports` |
| `PATCH /api/v1/reports/losses/<id>/reported` | `PATCH /api/v1/loss-reports/:id/reported` |
| `GET /api/v1/pharmacies` …, `/products/search`, `/products/popular` | same paths, new shapes |
| `POST /api/v1/users` | `POST /api/v1/users` |
| Flask session pages (`/login`, `/dashboard`, …) | replaced by the React SPA |
| CSV export routes | `GET /movements/export`, `GET /loss-reports/export` (CSV) |

Data migration (if old data must be carried over) is a separate, explicit step:
export SQLite → transform → load into PostgreSQL. It is **not** part of this
rewrite by default; the new project starts from an empty schema + seed.

## 17. Roadmap

See `ROADMAP.md` for the phased build plan and the feature-parity checklist.
