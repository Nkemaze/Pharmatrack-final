# PharmaTrack v2 — API Reference

> Base URL: `https://<host>/api/v1` (`API_BASE_URL` for the Flutter app is the
> origin without `/api/v1`).
>
> JSON is **camelCase**. Monetary and coordinate values are serialized as
> **strings** (to avoid float rounding); the client should parse with
> `num.parse`/`double.parse`. This API is a clean redesign of the old Flask
> contract — it is **not** wire-compatible.

## 1. Conventions

### Authentication

- Public routes need no token.
- Protected routes use `Authorization: Bearer <accessToken>`.
- Roles: `ADMIN`, `PHARMACY`, `USER`.

### Pagination

List routes accept `page` (default 1) and `pageSize` (default 20, max 100).
The envelope carries:

```json
{
  "data": [ ... ],
  "meta": { "page": 1, "pageSize": 20, "total": 42, "totalPages": 3 }
}
```

### Success envelope

```json
{ "data": <resource or list or null> }
```

### Error envelope

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "short human message",
    "details": [ { "field": "name", "message": "required" } ]
  }
}
```

### Error codes

| Code | HTTP | Meaning |
|---|---|---|
| `AUTH_REQUIRED` | 401 | no/invalid access token |
| `TOKEN_EXPIRED` | 401 | access token expired |
| `TOKEN_REVOKED` | 401 | access token on the blocklist |
| `INVALID_CREDENTIALS` | 401 | bad login identifier/password |
| `RATE_LIMITED` | 429 | login lockout / general throttle |
| `FORBIDDEN` | 403 | role not allowed for this route |
| `TENANT_SCOPE` | 403 | resource belongs to another pharmacy |
| `ACCOUNT_BLOCKED` | 403 | pending/suspended/rejected account |
| `NOT_FOUND` | 404 | unknown resource |
| `CONFLICT` | 409 | uniqueness/state conflict (e.g. admin already exists) |
| `VALIDATION_ERROR` | 400/422 | Zod validation failed |
| `NEGATIVE_STOCK` | 422 | movement would drive a batch below zero |
| `INTERNAL_ERROR` | 500 | unexpected failure |

### Common resource field references

**Pharmacy (public view)** — only `ACTIVE` pharmacies are ever returned here:

```json
{
  "id": "uuid",
  "name": "Pharmacie du Centre",
  "address": "12 Rue ...", "city": "Yaoundé", "state": null, "zipCode": null,
  "phone": "+237 ...", "emergencyPhone": null, "emergencyDesc": null,
  "latitude": "3.866667", "longitude": "11.516667",
  "openingHours": { "weekdayOpen": "08:00", "weekdayClose": "20:00", "weekendOpen": "09:00", "weekendClose": "15:00" },
  "updatedAt": "2026-10-10T00:00:00.000Z"
}
```

**Product (public/safe view)** — `inStock` boolean only; **controlled products
are excluded by the server**:

```json
{
  "id": "uuid", "pharmacyId": "uuid", "pharmacyName": "Pharmacie du Centre",
  "city": "Yaoundé",
  "name": "Paracétamol", "category": "Analgésique", "strength": "500 mg",
  "dosageForm": "Tablet",
  "requiresPrescription": false,
  "pricePerUnit": "500", "pricePerPacket": "1250", "packetSize": 10, "unitLabel": "unit",
  "imageUrl": null,
  "inStock": true
}
```

**Product (inventory view, PHARMACY/ADMIN)** — adds stock/expiry/low-stock
totals, includes controlled items:

```json
{
  "id": "uuid", "pharmacyId": "uuid", "name": "Paracétamol", "category": "Analgésique",
  "strength": "500 mg", "dosageForm": "Tablet", "barcode": "3400931234567",
  "requiresPrescription": false, "isControlled": false,
  "pricePerUnit": "500", "pricePerPacket": "1250", "packetSize": 10, "unitLabel": "unit",
  "imageUrl": null, "lowStockThreshold": 10,
  "totalStock": 342, "isLowStock": false,
  "expiry": { "status": "HEALTHY", "daysToExpiry": null, "minExpiryDate": null },
  "batchCount": 3, "createdAt": "...", "updatedAt": "..."
}
```

---

## 2. Auth

### `POST /auth/login`

Body: `{ "identifier": string, "password": string }` — `identifier` is the
account `name` or `email`.

```json
{ "data": {
    "accessToken": "...", "refreshToken": "...", "expiresIn": 1800,
    "user": { "id": "...", "name": "...", "email": "...", "role": "PHARMACY", "pharmacyId": "...", "mustUpdateProfile": false }
} }
```

Errors: `INVALID_CREDENTIALS`, `ACCOUNT_BLOCKED`, `RATE_LIMITED` (Retry-After header).

### `POST /auth/refresh`

Body: `{ "refreshToken": "..." }` → rotates and returns:

```json
{ "data": { "accessToken": "...", "refreshToken": "...", "expiresIn": 1800 } }
```

### `POST /auth/logout`

Auth required. Revokes the refresh token (body `{ "refreshToken": "..." }`) and
blacklists the current access token. → `{ "data": { "message": "logged out" } }`

### `GET /auth/me`

Auth required → the current `user` (as in login response) plus an optional
`pharmacy` (the public pharmacy view) when one is attached.

### `POST /auth/setup-admin`

Public, **one-time bootstrap** (creates the platform admin). Body:
`{ "name", "email", "password", "setupCode" }`.

- If an `ADMIN` already exists → `409 CONFLICT`.
- Constraint: `password.length >= 8`, `name`/`email` unique.

### `POST /auth/register/pharmacy`

Public **pharmacy application**. Body:
`{ "pharmacyName", "email", "password", "address"?, "city"?, "phone"? }`.

- Creates `Pharmacy(status=PENDING)` + `User(role=PHARMACY, status=PENDING)`.
- Applicant cannot sign in until approved. → `{ "data": { "applicationId": "..." } }`.

### `POST /auth/complete-profile`

Auth required, for `PHARMACY` users with `mustUpdateProfile = true`. Body:

```json
{
  "pharmacy": { "name", "address", "city"?, "state"?, "zipCode"?, "phone"?, "email"?,
                "emergencyPhone"?, "emergencyDesc"?, "latitude"?, "longitude"?,
                "openingHours"? },
  "newPassword": "...",
  "currentPassword": "..."
}
```

Saves the pharmacy profile, changes the password (verifying `currentPassword`),
and clears `mustUpdateProfile`. → `{ "data": { "user": {...}, "pharmacy": {...} } }`

---

## 3. Pharmacies (public)

### `GET /pharmacies`

Query: `?city=&nearLat=&nearLng=` (optional). Returns **active** pharmacies,
distance-sorted when `nearLat`/`nearLng` are given (`distanceKm` added to each).

```json
{ "data": [ /* Pharmacy (public view) + "distanceKm": 1.2 */ ] }
```

### `GET /pharmacies/:id`

One active pharmacy (public view). `404 NOT_FOUND` for unknown/suspended/deleted.

### `GET /pharmacies/:id/products`

Query: `?q=` (optional case-insensitive substring). Public safe product list for
one pharmacy (controlled excluded, `inStock` boolean).

---

## 4. Products

### Inventory (auth: `PHARMACY`/`ADMIN`, scoped to caller's pharmacy)

- `GET /products?q=&page=&pageSize=` — inventory view list. `ADMIN` passes
  `?pharmacyId=` to browse another tenant's inventory (otherwise scoped).
- `GET /products/:id`
- `POST /products` — body (Zod):

```json
{ "name": "Paracétamol", "category": "Analgésique", "strength": "500 mg", "dosageForm": "Tablet",
  "barcode"?: "3400931234567", "requiresPrescription": false, "isControlled": false,
  "pricePerUnit": "500", "pricePerPacket"?: "1250", "packetSize"?: 10, "unitLabel"?: "unit",
  "imageUrl"?: "...", "lowStockThreshold"?: 10,
  "batchNumber"?: "B-001", "expiryDate"?: "2027-08-17", "initialQuantity"?: 100 }
```

  Creates the product and optionally its first batch. → `201 { "data": { "id": "..." } }`.
- `PATCH /products/:id` — same fields, all optional. Updates medicine info only
  (never stock). → `{ "data": /* inventory view */ }`.

### Public discovery

- `GET /products/search?q=` — cross-pharmacy, case-insensitive, substring
  match on product name. Returns the **public safe view**, flat list (client
  groups by `pharmacyId`). → `{ "data": [ /* Product (public view) */ ] }`
- `GET /products/popular` — aggregated across active pharmacies:

```json
{ "data": [ { "name": "Paracétamol", "strength": "500 mg", "dosageForm": "Tablet",
              "cheapestPrice": "500", "pharmacyCount": 4, "anyInStock": true } ] }
```

  Sorted: in-stock first, then by availability.

---

## 5. Batches

Auth: `PHARMACY`/`ADMIN`, tenant-scoped.

- `GET /products/:id/batches` — batches of the product:

```json
{ "data": [ { "id": "...", "batchNumber": "B-001", "expiryDate": "2027-08-17",
              "receivedAt": "...", "remaining": 120 } ] }
```

- `POST /products/:id/batches` — body
  `{ "batchNumber": string, "expiryDate": "YYYY-MM-DD", "initialQuantity"?: number }`
  → `201 { "data": { "id": "..." } }`.
- `PATCH /batches/:id` — body `{ "batchNumber"?, "expiryDate"? }` (edits metadata
  only; stock stays movement-driven).

---

## 6. Movements

Auth: `PHARMACY`/`ADMIN`, tenant-scoped.

### `POST /movements`

Body (Zod, unknown fields rejected):

```json
{ "batchId": "uuid", "type": "SALE", "quantity": 2,
  "direction"?: "DECREASE",                       // REQUIRED when type=ADJUSTMENT
  "counterpartyName"?: "...", "counterpartyAddress"?: "...",
  "referenceNumber"?: "...", "prescriptionNumber"?: "...",
  "reason"?: "...", "occurredAt"?: "2026-10-10T08:00:00.000Z" }
```

Rules:
- `quantity` must be a positive integer.
- A stock-out must not drive the batch negative → `422 NEGATIVE_STOCK`.
- `LOSS` auto-creates a linked `LossReport` (circumstances = `reason`).

→ `201 { "data": { "id": "...", "newBatchStock": 118 } }`

### `GET /movements`

Query: `?batchId=&productId=&type=&from=&to=&page=&pageSize=`. Chronological
list, newest first.

```json
{ "data": [ { "id": "...", "batchId": "...", "product": { "id": "...", "name": "Paracétamol" },
              "type": "SALE", "quantity": 2, "direction": null,
              "counterpartyName": null, "referenceNumber": "SALE-1001",
              "performedBy": { "id": "...", "name": "Marie" },
              "occurredAt": "...", "recordedAt": "..." } ], "meta": { ... } }
```

### `GET /movements/export`

Returns `text/csv` (`Content-Disposition: attachment`) —
`date, product, batch, type, quantity, reference, counterparty, reason`.

---

## 7. Loss reports

Auth: `PHARMACY`/`ADMIN`, tenant-scoped.

- `GET /loss-reports?unreportedOnly=&page=&pageSize=` — list:

```json
{ "data": [ { "id": "...", "date": "...", "productName": "Paracétamol", "batchNumber": "B-001",
              "quantity": 5, "reason": "damaged stock", "reported": false,
              "reportedToAuthorityAt": null, "authorityReference": null } ], "meta": {...} }
```

- `PATCH /loss-reports/:id/reported` — body
  `{ "authorityReference"?: string }` → marks reported, sets the timestamp.
- `GET /loss-reports/export?unreportedOnly=1` — CSV.

---

## 8. Reports

### `GET /reports/dashboard`

Auth: `PHARMACY`/`ADMIN`, tenant-scoped.

```json
{ "data": {
    "totals": { "products": 120, "batches": 200 },
    "lowStock":   [ /* product inventory views */ ],
    "expired":    [ /* ... */ ],
    "expiringSoon": [ /* ... */ ],
    "recentMovements": [ /* movement views */ ]
} }
```

`expiry.status` is `HEALTHY` | `EXPIRING` | `EXPIRED` (threshold: 90 days).

---

## 9. Admin — pharmacy & user management

Auth: `ADMIN`.

### `GET /admin/pharmacies?status=`

All tenants (default all; filter `PENDING`/`ACTIVE`/`SUSPENDED`/`REJECTED` /
`DELETED`). Each row includes the linked applicant user:

```json
{ "data": [ { "id": "...", "name": "...", "email": "...", "city": "...", "phone": "...",
              "status": "PENDING", "createdAt": "...",
              "applicant": { "id": "...", "email": "...", "status": "PENDING" } } ], "meta": {...} }
```

### `POST /admin/pharmacies`

Provision an account directly (active immediately). Body:
`{ "name", "email", "password", "address"?, "city"?, "phone"? }`.

### `PATCH /admin/pharmacies/:id/status`

Body: `{ "status": "ACTIVE" | "SUSPENDED" | "REJECTED" }`.
- Approving a **pending application** sets pharmacy + user `ACTIVE` and
  `mustUpdateProfile = true` (forced first-login setup).
- `REJECTED` links to a `PENDING` user.
- `SUSPENDED` blocks login.

### `DELETE /admin/pharmacies/:id`

Soft delete: pharmacy → `DELETED`, linked user → `SUSPENDED`. (No hard delete.)

### Users

- `GET /users` — list platform accounts (admin only).
- `POST /users` — admin creates a `PHARMACY` (optionally `pharmacyId`) or
  read-only `USER` account. Body `{ "name", "email"?, "password", "role", "pharmacyId"? }`.
- `DELETE /users/:id` — refuse self-deletion (`409 CONFLICT`).

---

## 10. System

### `GET /health`

```json
{ "data": { "status": "ok" | "degraded", "db": true } }
```

---

## 11. CSV endpoints

`GET /movements/export` and `GET /loss-reports/export` deliberately return
`text/csv`, not the JSON envelope.

---

## 12. Zod validation rules (summary)

- All timestamps: ISO 8601 / `YYYY-MM-DD` for `expiryDate`.
- All quantities: integers ≥ 0 (movement `quantity` ≥ 1).
- Prices/coordinates: numeric strings, accepted as decimal.
- **Unknown JSON fields are rejected** on every write endpoint
  (`rejectUnknownFields` behaviour, now enforced by Zod `.strict()`).
- Enums reject unknown values (`SALE` not `sale`).