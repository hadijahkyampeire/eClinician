# eClinician

A multi-tenant hospital management system that digitizes the outpatient visit —
from the moment a patient walks in to the moment their medicines are dispensed.

**Stack:** Java 21 · Spring Boot 4 · PostgreSQL · React 19 · TypeScript · Vite

---

## 1. The problem

Small and mid-size clinics still run outpatient care on paper. The consequences are
familiar: charts get lost, nobody at the front desk knows who is still waiting, and a
clinician seeing a returning patient has no reliable history to read.

Off-the-shelf hospital systems exist, but they are priced and scoped for large
hospitals — one deployment, one institution. A clinic with fifteen staff cannot
justify that.

**eClinician's angle: one deployment, many clinics.** Every record carries a tenant
ID, so a single running instance serves many independent facilities, each seeing only
its own data. That turns a per-hospital installation into a subscription a small
clinic can actually afford.

---

## 2. What it does — the clinical loop

The system is built around one workflow, implemented end to end:

```
  Receptionist            Clinician                        Pharmacist · Lab Tech
       │                      │                                       │
   Register ──► Check in ──► Start ──► Document ──► Finalize ──► Dispense each medicine
   patient      (WAITING)    session   (vitals, dx,     │         Result each test
       │            │           │      plan, meds,      │                │
       ▼            ▼           ▼      tests)           ▼                ▼
   patients   appointments  appointment  encounter  appointment   prescription_orders
    table     + CHECKED_IN  → IN_SESSION  (DRAFT)   → COMPLETED    lab_orders
                                                   care cleared   one row per line
```

Two status fields track this, and the distinction matters:

- **`AppointmentStatus`** — the permanent audit trail of a single visit
  (`SCHEDULED → CHECKED_IN → WAITING → IN_SESSION → COMPLETED`, plus `CANCELLED` / `NO_SHOW`).
- **`PatientCareStatus`** — the patient's *current* operational state, or `null` when
  they have no active visit. This is what makes "who is in the waiting room right now?"
  a single indexed query instead of a scan over appointment history.

Finalizing an encounter is the one action that closes the loop: it stamps
`finalizedAt`, completes the appointment, clears the patient's care status, and splits
the prescription and lab request text into one order per line — atomically, in one
transaction.

That last step is what makes the pharmacy and the lab real handoffs rather than
screens. A clinician writes three medicines on one line each; the pharmacy receives
three independent orders, so it can dispense two and flag the third as out of stock.
Lab requests travel the same path: one order per test, resulted or cancelled
independently.

---

## 3. Live demo script

> Pick a role from the demo dropdown — it fills in that account's real credentials
> (password `demo1234`, or whatever `DEMO_PASSWORD` is set to). Seed patients are created on first
> backend start. **Warm the app a few minutes before presenting** — see §8.

| # | Log in as | Do this | Point out |
|---|---|---|---|
| 1 | **Receptionist** | Dashboard | Counts are live, not mocked — they move as we work |
| 2 | | Patients → **Register patient** | Country-neutral ID field, phone validation, address split into line/city/district/state/country |
| 3 | | Find the new patient → **Check in** | Patient now shows `CHECKED_IN`; an appointment row was created behind it |
| 4 | | Back to Dashboard | **Checked In** and **Registered Today** both incremented |
| 5 | **Clinician** | Dashboard | Same endpoint, different four tiles — role decides the view |
| 6 | | Appointments → **Start session** | Status moves `WAITING → IN_SESSION`; a `DRAFT` encounter is created |
| 7 | | Records → open the encounter | Fill vitals, symptoms, exam, diagnosis, plan. **Put three medicines in Prescriptions and two tests in Lab requests, one per line** |
| 8 | | **Finalize** | Appointment completes, care status clears, patient leaves the waiting list — and three prescription orders plus two lab orders are created |
| 9 | **Pharmacist** | Dashboard | Three tiles that were empty a moment ago: **Pending 3** |
| 10 | | Pharmacy | The three medicines are here as separate rows. **Dispense** one; **Unavailable** another, with "Out of stock" as the reason |
| 11 | | Back to Dashboard | Pending 1 · Dispensed Today 1 · Unavailable 1 — the tiles and the queue read the same table |
| 12 | **Lab Technician** | Laboratory | The two tests are waiting as separate rows. **Record result** on one; **Cancel** the other with "No reagent" |
| 13 | **Administrator** | Dashboard | Facility-wide roll-up across every role's work |

**Prove the isolation in ten seconds** — the tenant is inside the token, so there is
nothing left to edit:

```bash
# No token at all
curl -s -o /dev/null -w '%{http_code}\n' localhost:8080/api/patients          # → 401

# Log in, then read with the token you were given
TOKEN=$(curl -s -X POST localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"sjenkins@stmarys.eclinician.com","password":"demo1234"}' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["token"])')
curl -s localhost:8080/api/patients -H "Authorization: Bearer $TOKEN" | head -c 300

# The old trick — claiming a tenant in a header
curl -s -o /dev/null -w '%{http_code}\n' localhost:8080/api/patients \
  -H 'X-Tenant-Id: sample-hospital'                                            # → 401
```

Paste the token into [jwt.io](https://jwt.io) to show the `tenant` claim: readable by
anyone, changeable by nobody without the signing key.

---

## 4. Architecture

```
  React 19 SPA (Vite)                    Spring Boot 4 API                 PostgreSQL 16
  ┌──────────────────────┐               ┌─────────────────────┐          ┌────────────┐
  │  pages/  components/ │               │  Controller  (HTTP) │          │  patients  │
  │  React Query (cache) │  ── REST ──►  │  Service     (rules)│  ─JPA─►  │appointments│
  │  Zustand (UI state)  │  Bearer <jwt> │  Repository  (data) │          │ encounters │
  │  AuthContext (session)│              │  ─────────────────  │          │ app_users  │
  └──────────────────────┘               │  JWT filter + advice│          └────────────┘
                                         └─────────────────────┘
```

**Backend — package by layer.**

```
com.eclinician
├── controllers/      HTTP only — take the tenant from the token, delegate, return a DTO
├── services/         every business rule lives here; this is what the tests point at
├── repositories/     data access, every finder tenant-scoped
├── security/         the filter chain, the signing key, and @CurrentTenant
├── domains/
│   ├── entities/     JPA classes — mutable, because Hibernate constructs then populates
│   ├── enums/        AppointmentStatus, PatientCareStatus, EncounterStatus, PrescriptionStatus, LabStatus, UserRole
│   └── dtos/         records — immutable, what crosses the HTTP boundary
└── web/              one @RestControllerAdvice normalizing every error
```

Entities never cross the HTTP boundary — request/response records do — so the database
schema and the API contract can move independently. `PrescriptionResponse` carries a
`patientName` that exists in no table; `DispenseRequest` accepts only the three fields
a pharmacist may set, so no caller can post its own `tenantId`.

The trade-off is honest: package-by-feature would let a service stay package-private,
unreachable outside its own feature. Splitting by layer means a controller and its
service sit in different packages, so **41 declarations had to become `public`**.
Navigability was worth more here than compiler-enforced module boundaries.

**Frontend — server state and UI state are kept apart.** React Query owns everything
that came from the API (caching, refetching, loading and error states); Zustand owns
purely local UI state such as filters and modal visibility. Conflating the two is the
usual source of stale-data bugs, so the split is deliberate.

Files are kept small and single-purpose — the patient feature is four components
(table, controls, modal, fields) rather than one large page.

**Multi-tenancy is enforced at the repository layer.** Every finder takes `tenantId`
as its first argument — `findByIdAndTenantId`, `countByTenantIdAndStatus`. There is no
query in the codebase that can return another tenant's row, because none of them can
be called without a tenant.

**And that tenant is no longer the caller's to choose.** Login is the one place a
tenant is decided; from then on it rides inside a signed token as the `tenant` claim.
`@CurrentTenant` — a one-line argument resolver — reads it off the verified token and
hands controllers the same `String tenantId` they always took, so the swap from
`@RequestHeader` touched one annotation per method and no service at all.

`UserRepository` is the single deliberately un-scoped repository: at login there is no
tenant yet, and the email is what decides which one the caller gets.

---

## 5. API

Every endpoint except health and login requires an `Authorization: Bearer <jwt>` header.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | Liveness probe (used by Render) — open |
| `POST` | `/api/auth/login` | Email + password → a signed token carrying the tenant — open |
| `GET` | `/api/patients` | Paged list — search, filter, sort |
| `POST` `PUT` `DELETE` | `/api/patients` `/{id}` | Register, update, remove |
| `GET` | `/api/appointments` | List, optionally by patient |
| `POST` | `/api/appointments/check-in` | Register arrival → `CHECKED_IN` |
| `POST` | `/api/appointments/{id}/waiting` | Move to the waiting room |
| `POST` | `/api/appointments/patients/{id}/start-session` | Clinician takes the patient |
| `POST` | `/api/appointments/{id}/complete` | Close the visit |
| `GET` `POST` `PUT` | `/api/encounters` `/{id}` | Read and document the encounter |
| `POST` | `/api/encounters/{id}/finalize` | Sign off — completes the visit and raises the prescription and lab orders |
| `GET` | `/api/pharmacy/prescriptions` | The dispensing queue, filterable by `?status=` |
| `POST` | `/api/pharmacy/prescriptions/{id}` | Dispense a medicine, or mark it unavailable with a reason |
| `GET` | `/api/lab/orders` | The lab queue, filterable by `?status=` |
| `POST` | `/api/lab/orders/{id}` | Record a result, or cancel a test with a reason |
| `GET` | `/api/stats/dashboard` | 13 live counts behind the role dashboards |

Errors are normalized by a single `@RestControllerAdvice`: `404` for a missing record,
`409` for a workflow violation (checking in a patient who is already checked in), `400`
with field-level messages for validation failures, and `401` for a bad login or a
missing, expired or tampered token. A wrong email and a wrong password return the same
message on purpose, so the response cannot be used to discover which accounts exist.

---

## 6. Roles

One dashboard route renders a different view per role, driven by a lookup table rather
than branching. Navigation is filtered twice — by role, and by the modules the tenant
subscribes to.

| Role | Sees | Dashboard tiles |
|---|---|---|
| Administrator | Everything | Total patients · Appointments today · Open encounters · Clinicians documenting |
| Clinician | Patients, appointments, records | Waiting now · In session · Open encounters · Finalized today |
| Receptionist | Patients, appointments | Checked in · Waiting · Appointments today · Registered today |
| Pharmacist | Pharmacy | Pending · Dispensed today · Unavailable · Finalized today |
| Lab Technician | Laboratory | Lab requests raised · Finalized today · In session · Waiting |

The lab tiles still count encounters carrying lab request text rather than the
`lab_orders` rows behind the queue — the same follow-up the pharmacy tiles already had.

---

## 7. Running locally

```bash
docker compose up -d   # Postgres on port 5433
make install           # npm install + mvn install
make run               # backend on :8080, frontend on :5173
make test              # backend test suite
```

Open http://localhost:5173, pick a role from the demo dropdown and sign in — the six
staff accounts are seeded on first start.

### Configuration

| Env var | Where | Default |
|---|---|---|
| `DB_HOST` `DB_PORT` `DB_NAME` `DB_USER` `DB_PASSWORD` | backend | `localhost:5433`, `eclinician` |
| `PORT` | backend | `8080` |
| `CORS_ALLOWED_ORIGINS` | backend | `http://localhost:5173` |
| `JWT_SECRET` | backend | a development key — override everywhere else |
| `JWT_TTL_MINUTES` | backend | `480` |
| `DEMO_PASSWORD` | backend | `demo1234` |
| `VITE_API_URL` | frontend | `http://localhost:8080` |

`CORS_ALLOWED_ORIGINS` is comma-separated and accepts bare hostnames (https assumed).
`JWT_SECRET` must be at least 32 bytes — HS256 refuses a shorter key — and changing it
signs out everyone holding an old token.

---

## 8. Deploying

[render.yaml](render.yaml) is a blueprint that provisions all three pieces — managed
Postgres, the Dockerized API, and the static frontend — and wires them together: the
API gets its database credentials from the Postgres instance, and the frontend gets
`VITE_API_URL` from the API's hostname.

1. Push to GitHub → in Render, **New → Blueprint** → pick this repo → **Apply**.
2. Wait for `eclinician-api` to go live. The first build takes ~5 minutes, since Maven
   downloads its dependencies inside the image.
3. Copy the `eclinician-web` URL, then set `CORS_ALLOWED_ORIGINS` on `eclinician-api`
   to that hostname (**Environment** tab) and let it redeploy. This one variable is
   manual by design — the two services cannot reference each other, as Render rejects
   a dependency cycle.
4. Open the `eclinician-web` URL and log in.

`VITE_API_URL` is read at **build** time, not runtime — Vite inlines it into the
bundle. Changing it requires a frontend rebuild, not a restart.

### Free-tier limits worth knowing

| | Allowance | Catch |
|---|---|---|
| Postgres | 1 GB | Expires **30 days** after creation, 14-day grace, then deleted. One per workspace, no backups. |
| API | 750 instance-hours/month | 512 MB RAM, 0.1 CPU. Sleeps after 15 min idle. |
| Frontend | Free | Counts toward bandwidth and build minutes. |

**Before the demo:**

- A sleeping instance takes **1–3 minutes** to wake, because cold-starting a JVM on
  0.1 CPU is slow. Open the app ten minutes early and keep a tab on it.
- Re-provision the database if it is more than 30 days old.
- `TZ=Africa/Kampala` in the blueprint decides what "today" means on the dashboards.
- The Dockerfile raises the JVM heap ceiling to 75% of the container and uses the
  serial collector; the defaults leave ~128 MB of heap and thrash.

---

## 9. Testing

`make test` — 9 backend tests, all green, aimed at the service layer where the rules live:

- `AppointmentServiceTests` — check-in transitions and the conflict rules that reject them
- `EncounterServiceTests` — encounter creation and update
- `ClinicalEncounterFlowTests` — the full loop end to end: log in → check in → start
  session → document → finalize → result the lab order, asserting the appointment
  completes, care status clears, and the requested test reaches the lab queue as its
  own row. It sends no tenant anywhere; the token carries it.
- `AuthTests` — login succeeds and answers with the role the frontend renders, a wrong
  password is refused, the API is closed without a token, and **a valid token for one
  hospital reads an empty list while another hospital's patients exist**
- `BackendApplicationTests` — context loads

Tests run against in-memory H2, so no database is needed in CI.

---

## 10. What is not built

Named honestly, with the reason:

| Not built | Why / what it needs |
|---|---|
| **Password self-service** | Accounts are real and signed in with, but there is no reset flow, no password change, no lockout after repeated failures, and no refresh token — when the 8-hour token expires you sign in again. |
| **Authorization per role** | Authentication is done; authorization is coarse. Any signed-in user of a hospital can call any of its endpoints — a receptionist could POST to the pharmacy queue. The role is already a claim in the token, so this is `@PreAuthorize` on the handful of methods that need it. |
| **Pharmacy stock** | Dispensing works; inventory does not. "Unavailable" is a pharmacist's judgement, not a stock level. Needs a drug catalogue and quantity tracking. |
| **Structured lab results** | A technician records a result, but as free text. Values, units and reference ranges need a test catalogue — the same argument as pharmacy stock. |
| **Staff management** | `app_users` rows exist and are seeded, but nothing in the UI creates or edits them — an administrator cannot yet add a nurse. |
| **Platform admin console** | Tenant onboarding, per-tenant module toggles, billing. The module-toggle plumbing already exists in the frontend; the console to drive it does not. |
| **Database migrations** | Hibernate generates the schema (`ddl-auto=update`). Flyway before anything resembling production. |

**Deliberate scope decision:** rather than build five shallow modules, I built the
clinical workflow all the way through — UI, API, business rules, database, tests, and
deployment — then added pharmacy dispensing and lab results on top of it as proof the
architecture is additive.

Those two modules are the evidence, and the second one cost exactly what the first did:
one entity, one repository, two DTOs, one service and one controller, plus a **single
line** inside `finalizeEncounter`. Nothing in the patient, appointment or encounter code
changed to accommodate either.

---

## 11. What I would do next, in order

1. **Flyway migrations** — before any real data exists, and now with an `app_users`
   table holding password hashes, before anything I would hate to lose.
2. **`@PreAuthorize` per role** — authentication landed; authorization is still coarse.
3. **Staff management** — an administrator adding accounts, on top of the entity that
   now exists.
4. **Lab tiles off `lab_orders`** — a small commit, the one the pharmacy tiles already had.
5. **Platform admin console** — turns the multi-tenant design into a product.
6. **A test catalogue** — the shared answer to both pharmacy stock and structured lab results.
