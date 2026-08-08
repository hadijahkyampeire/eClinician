# eClinician

A multi-tenant hospital management system that digitizes the outpatient visit —
from the moment a patient walks in to the moment the clinician signs off the notes.

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
  Receptionist          Receptionist        Clinician            Clinician
       │                     │                  │                    │
   Register  ──────────►  Check in  ────────►  Start  ──────────►  Document  ──────► Finalize
   patient                              (WAITING)  session      (vitals, symptoms,      │
       │                     │                  │   exam, diagnosis, plan,              │
       │                     │                  │   prescriptions, labs)                │
       ▼                     ▼                  ▼                    ▼                  ▼
   patients            appointments        appointment          encounter          appointment
    table             row + CHECKED_IN     → IN_SESSION        row (DRAFT)         → COMPLETED
                                                                                 care status cleared
```

Two status fields track this, and the distinction matters:

- **`AppointmentStatus`** — the permanent audit trail of a single visit
  (`SCHEDULED → CHECKED_IN → WAITING → IN_SESSION → COMPLETED`, plus `CANCELLED` / `NO_SHOW`).
- **`PatientCareStatus`** — the patient's *current* operational state, or `null` when
  they have no active visit. This is what makes "who is in the waiting room right now?"
  a single indexed query instead of a scan over appointment history.

Finalizing an encounter is the one action that closes the loop: it stamps
`finalizedAt`, completes the appointment, and clears the patient's care status —
atomically, in one transaction.

---

## 3. Live demo script

> Log in from the demo user picker (no password). Seed patients are created on first
> backend start. **Warm the app a few minutes before presenting** — see §8.

| # | Log in as | Do this | Point out |
|---|---|---|---|
| 1 | **Receptionist** | Dashboard | Counts are live, not mocked — they move as we work |
| 2 | | Patients → **Register patient** | Country-neutral ID field, phone validation, address split into line/city/district/state/country |
| 3 | | Find the new patient → **Check in** | Patient now shows `CHECKED_IN`; an appointment row was created behind it |
| 4 | | Back to Dashboard | **Checked In** and **Registered Today** both incremented |
| 5 | **Clinician** | Dashboard | Same endpoint, different four tiles — role decides the view |
| 6 | | Appointments → **Start session** | Status moves `WAITING → IN_SESSION`; a `DRAFT` encounter is created |
| 7 | | Records → open the encounter | Fill vitals, symptoms, exam, diagnosis, plan, prescriptions, lab requests |
| 8 | | **Finalize** | Appointment completes, care status clears, patient leaves the waiting list |
| 9 | **Pharmacist** / **Lab Tech** | Dashboard | Prescriptions and lab requests raised in step 7 surface here — the handoff exists as data, the dispensing UI is the next module |
| 10 | **Administrator** | Dashboard | Facility-wide roll-up across every role's work |

**Prove multi-tenancy in ten seconds** — same endpoint, different tenant header:

```bash
curl -s localhost:8080/api/patients -H 'X-Tenant-Id: sample-hospital' | head -c 300
curl -s localhost:8080/api/patients -H 'X-Tenant-Id: other-hospital'   # → empty
```

---

## 4. Architecture

```
  React 19 SPA (Vite)                    Spring Boot 4 API                 PostgreSQL 16
  ┌──────────────────────┐               ┌─────────────────────┐          ┌────────────┐
  │  pages/  components/ │               │  Controller  (HTTP) │          │  patients  │
  │  React Query (cache) │  ── REST ──►  │  Service     (rules)│  ─JPA─►  │appointments│
  │  Zustand (UI state)  │  X-Tenant-Id  │  Repository  (data) │          │ encounters │
  │  AuthContext (session)│              │  ─────────────────  │          └────────────┘
  └──────────────────────┘               │  Global error handler│
                                         └─────────────────────┘
```

**Backend — package by feature, not by layer.** `patient/`, `appointment/`,
`encounter/`, `stats/` each hold their own controller, service, repository, entity and
DTOs. Adding the pharmacy module means adding one package, not touching four.

Controllers stay thin: read the tenant header, delegate, return a DTO. All business
rules live in the service layer, which is where the tests point. Entities never cross
the HTTP boundary — request/response records do, so the database schema and the API
contract can move independently.

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

---

## 5. API

Every endpoint requires an `X-Tenant-Id` header.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | Liveness probe (used by Render) |
| `GET` | `/api/patients` | Paged list — search, filter, sort |
| `POST` `PUT` `DELETE` | `/api/patients` `/{id}` | Register, update, remove |
| `GET` | `/api/appointments` | List, optionally by patient |
| `POST` | `/api/appointments/check-in` | Register arrival → `CHECKED_IN` |
| `POST` | `/api/appointments/{id}/waiting` | Move to the waiting room |
| `POST` | `/api/appointments/patients/{id}/start-session` | Clinician takes the patient |
| `POST` | `/api/appointments/{id}/complete` | Close the visit |
| `GET` `POST` `PUT` | `/api/encounters` `/{id}` | Read and document the encounter |
| `POST` | `/api/encounters/{id}/finalize` | Sign off — completes the whole loop |
| `GET` | `/api/stats/dashboard` | 11 live counts behind the role dashboards |

Errors are normalized by a single `@RestControllerAdvice`: `404` for a missing record,
`409` for a workflow violation (checking in a patient who is already checked in), `400`
with field-level messages for validation failures.

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
| Pharmacist | Pharmacy | Prescriptions raised · Finalized today · In session · Total patients |
| Lab Technician | Lab results | Lab requests raised · Finalized today · In session · Waiting |

---

## 7. Running locally

```bash
docker compose up -d   # Postgres on port 5433
make install           # npm install + mvn install
make run               # backend on :8080, frontend on :5173
make test              # backend test suite
```

Open http://localhost:5173 and pick a demo user.

### Configuration

| Env var | Where | Default |
|---|---|---|
| `DB_HOST` `DB_PORT` `DB_NAME` `DB_USER` `DB_PASSWORD` | backend | `localhost:5433`, `eclinician` |
| `PORT` | backend | `8080` |
| `CORS_ALLOWED_ORIGINS` | backend | `http://localhost:5173` |
| `VITE_API_URL` | frontend | `http://localhost:8080` |

`CORS_ALLOWED_ORIGINS` is comma-separated and accepts bare hostnames (https assumed).

---

## 8. Deploying

[render.yaml](render.yaml) is a blueprint that provisions all three pieces — managed
Postgres, the Dockerized API, and the static frontend — and cross-wires them: the API
gets its database credentials from the Postgres instance and its allowed origin from
the frontend's hostname; the frontend gets `VITE_API_URL` from the API's hostname.

1. Push to GitHub → in Render, **New → Blueprint** → pick this repo → **Apply**.
2. Wait for `eclinician-api` to go live (~5 min first build — Maven downloads
   dependencies inside the image).
3. Open the `eclinician-web` URL.

If your Render account rejects the `fromService` references, set `CORS_ALLOWED_ORIGINS`
and `VITE_API_URL` by hand after the first deploy — each is the other service's URL.

**Before the demo:**

- Free web services **sleep after 15 minutes idle**; the next request takes ~50s.
  Open the app several minutes early so it is warm.
- Free Postgres instances **expire after 30 days** — re-provision if the demo is later.
- `TZ=Africa/Kampala` in the blueprint decides what "today" means on the dashboards.

---

## 9. Testing

`make test` — 5 backend tests, all green, aimed at the service layer where the rules live:

- `AppointmentServiceTests` — check-in transitions and the conflict rules that reject them
- `EncounterServiceTests` — encounter creation and update
- `ClinicalEncounterFlowTests` — the full loop end to end: check in → start session →
  document → finalize, asserting the appointment completes and care status clears
- `BackendApplicationTests` — context loads

Tests run against in-memory H2, so no database is needed in CI.

---

## 10. What is not built

Named honestly, with the reason:

| Not built | Why / what it needs |
|---|---|
| **Real authentication** | The single biggest gap. Login is a client-side picker and the tenant travels as a plain header, so any caller can read any tenant's data. Needs Spring Security + JWT, with the tenant claim inside the signed token instead of the header. |
| **Pharmacy dispensing** | Prescriptions are recorded as encounter text. Needs its own entity, a stock/inventory model, and a dispense action. |
| **Lab result entry** | Same shape — requests exist on the encounter; results need an entity and a technician workflow. |
| **Staff management** | Blocked behind real auth: staff records are only meaningful once accounts exist. |
| **Platform admin console** | Tenant onboarding, per-tenant module toggles, billing. The module-toggle plumbing already exists in the frontend; the console to drive it does not. |
| **Database migrations** | Hibernate generates the schema (`ddl-auto=update`). Flyway before anything resembling production. |

**Deliberate scope decision:** rather than build five shallow modules, I built one
clinical workflow all the way through — UI, API, business rules, database, tests, and
deployment. The architecture is what makes the remaining modules additive: each is a
new feature package alongside the existing ones, not a rewrite.

---

## 11. What I would do next, in order

1. **Spring Security + JWT** — close the tenant-isolation hole; everything else depends on it.
2. **Flyway migrations** — before any real data exists.
3. **Pharmacy module** — first vertical slice on top of the now-proven pattern.
4. **Lab results** — mirrors pharmacy closely.
5. **Platform admin console** — turns the multi-tenant design into a product.
