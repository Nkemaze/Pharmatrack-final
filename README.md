# PharmaTrack (v2)

A medicine-discovery and pharmacy-inventory platform for Cameroon, rebuilt as
three parts sharing one API:

- **`backend/`** — Node.js + Express (ESM JavaScript) REST API, Prisma +
  PostgreSQL
- **`pharmacy-web/`** — React + TypeScript SPA for pharmacy staff and platform
  admins
- **`customer-app/`** — Flutter mobile app for the public (find medicines,
  pharmacies, directions)

> This is a clean rewrite. The earlier Flask/SQLite/Jinja + Firebase project
> lives in `../DrugFinderProjects/` and is kept untouched as a reference.

## Status

**Design stage** — the documents in `docs/` describe the target system; no
application code exists yet.

## Documentation

| Doc | Contents |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Goals, system context, stack, repo layout, backend layers, auth/tenancy, hosting, security, testing, migration map |
| [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) | Enums, Prisma models, fields, relations, indexes, seed |
| [`docs/API.md`](docs/API.md) | Base URL, envelope, error codes, every endpoint with examples |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Phased build plan + feature-parity checklist |

## Quick orientation

- API base: `/api/v1` · JSON camelCase · `{ "data": ... }` envelope
- Auth: JWT access (30 min) + refresh (30 d, rotating) · roles `ADMIN`,
  `PHARMACY`, `USER`
- Multi-tenant: inventory is scoped to the caller's pharmacy
- Public data is safe by design: no exact stock, no controlled medicines
- Deploy: Render (web services) + Neon (PostgreSQL)

## Getting started

Once the scaffold lands (Phase 0 in the roadmap):

```bash
npm install            # installs backend + pharmacy-web workspaces
npm run dev --workspace backend
npm run dev --workspace pharmacy-web
```
