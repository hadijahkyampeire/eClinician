# eClinician

A multi-tenant hospital management system that digitizes the outpatient visit — from the
moment a patient walks in to the moment their medicines are dispensed.

**▶ Live: [eclinician-web.onrender.com](https://eclinician-web.onrender.com/login)** —
sign in with the demo dropdown (password `demo1234`). The API sleeps when idle, so the
**first request takes 1–2 minutes**; open it before you need it.

**Stack:** Java 21 · Spring Boot 4 · PostgreSQL 16 · React 19 · TypeScript · Vite

**Documentation:** [Vision](docs/vision.md) · [SRS & use cases](docs/srs.md) ·
[Architecture & UML](docs/architecture.md) · [API](docs/api.md) ·
[Testing](docs/testing.md) · [Deployment](docs/deployment.md) ·
[Roadmap](docs/roadmap.md)
Analysis-phase originals: [SRS PDF](docs/srs/eClinician-SRS.pdf) ·
[requirements presentation](docs/srs/eClinician-Requirements-Presentation.pptx) ·
[drawio diagrams](docs/diagrams/)

---

## The idea in three sentences

Small clinics still run outpatient care on paper: charts get lost, nobody knows who is
waiting, and a prescription only reaches the pharmacy if the patient carries the slip
there. Hospital systems that fix this are priced for large hospitals — one installation,
one institution. **eClinician serves many clinics from one deployment**, each seeing only
its own data, which turns an installation into a subscription a fifteen-person clinic can
afford.

## The clinical loop

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

**Finalizing is the hinge.** In one transaction it stamps the encounter finalized,
completes the appointment, clears the patient's care status, and splits the prescription
and lab-request text into one order per line. That last part is what makes the pharmacy
and the lab real handoffs rather than screens: three medicines on three lines become
three orders, so two can be dispensed and the third flagged out of stock.

## Run it

```bash
docker compose up -d   # Postgres on port 5433
make install           # npm install + mvn install
make run               # backend on :8080, frontend on :5173
make test              # 9 backend tests
```

Open http://localhost:5173 and pick a role from the demo dropdown — it fills in that
account's real credentials (password `demo1234`). Six staff accounts are seeded on first
start. Full setup and cloud deployment: [docs/deployment.md](docs/deployment.md).

## Demo script

| # | Log in as | Do this | Point out |
|---|---|---|---|
| 1 | **Receptionist** | Dashboard | Counts are live, not mocked — they move as we work |
| 2 | | Patients → **Register patient** | Country-neutral ID field, phone validation, address split into line/city/district/state/country |
| 3 | | Find the new patient → **Check in** | Patient now shows `CHECKED_IN`; an appointment row was created behind it |
| 4 | | Back to Dashboard | **Checked In** and **Registered Today** both incremented |
| 5 | **Clinician** | Dashboard | Same endpoint, different four tiles — role decides the view |
| 6 | | Appointments → **Start session** | `WAITING → IN_SESSION`; a `DRAFT` encounter is created |
| 7 | | Records → open the encounter | Fill vitals, symptoms, exam, diagnosis, plan. **Three medicines in Prescriptions and two tests in Lab requests, one per line** |
| 8 | | **Finalize** | Visit completes, care status clears, patient leaves the waiting list — and three prescription orders plus two lab orders are created |
| 9 | **Pharmacist** | Dashboard → Pharmacy | The three medicines are separate rows. **Dispense** one; **Unavailable** another, reason "Out of stock" |
| 10 | | Back to Dashboard | Pending 1 · Dispensed Today 1 · Unavailable 1 — tiles and queue read the same table |
| 11 | **Lab Technician** | Laboratory | The two tests are waiting. **Record result** on one; **Cancel** the other with "No reagent" |
| 12 | **Administrator** | Dashboard | Facility-wide roll-up across every role's work |
| 13 | | Staff → **Add staff member** | A new account signs in immediately; **Deactivate** locks it out just as fast |

> **Presenting from the live URL?** The free instance sleeps after 15 minutes idle and a
> cold start measured **96 seconds**. Open
> [the app](https://eclinician-web.onrender.com/login) ten minutes early and leave the
> tab open.

### Prove the isolation in ten seconds

The tenant lives inside a signed token, so there is nothing left for a caller to edit.
Swap `localhost:8080` for `https://eclinician-api.onrender.com` to run this against the
live deployment:

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

## How it is built

```
  React 19 SPA  ──  REST + Bearer <jwt>  ──►  Spring Boot 4 API  ──JPA──►  PostgreSQL
  React Query (server state)                 Controller → Service → Repository
  Zustand (UI state)                         JWT filter chain · one error advice
```

Controllers hold no rules, services hold all of them, and every repository finder takes a
`tenantId` — so no query in the codebase *can* return another clinic's row. The tenant
comes from the token via `@CurrentTenant`, never from client input, and the role in that
same token decides which endpoints the caller may reach: a receptionist asking for the
pharmacy queue gets a `403` from the server, not a hidden button.

Diagrams (architecture, VOPC, sequence, collaboration, ERD) and the design trade-offs are
in [docs/architecture.md](docs/architecture.md).

## Where things live

| | |
|---|---|
| `backend/` | Spring Boot API — `controllers/ services/ repositories/ security/ domains/ web/` |
| `frontend/` | React SPA — `pages/ components/ api/ auth/ hooks/ types/` |
| `docs/` | Vision, SRS, architecture, API, testing, deployment, roadmap |
| `render.yaml` | Cloud blueprint: Postgres + API + static site |

## Rubric map

| Rubric item | Where |
|---|---|
| 1. Vision document | [docs/vision.md](docs/vision.md) |
| 2. SRS and use-case model | [docs/srs/eClinician-SRS.pdf](docs/srs/eClinician-SRS.pdf) — the analysis-phase document: 6 use cases, actors, step-by-step flows, business rules. Summary plus **as-built deviations** in [docs/srs.md](docs/srs.md) |
| 3. Architecture and UML | [docs/architecture.md](docs/architecture.md) — system architecture, ERD, the three VOPC diagrams, two sequence diagrams, a collaboration diagram |
| 4. Controller layer | `backend/.../controllers/` — HTTP only, delegate, return DTOs |
| 5. Service layer | `backend/.../services/` — every rule, including the transactional finalize |
| 6. Repository layer | `backend/.../repositories/` — Spring Data JPA, tenant-scoped finders |
| 7. Entity and database design | `backend/.../domains/entities/` + the ERD in the architecture doc |
| 8. Functional demonstration | The demo script above |
| 9. Testing | [docs/testing.md](docs/testing.md) — 25 JUnit tests, normal / boundary / error / security |
| 10. GitHub and code quality | This repo — ten reviewed PRs, one per phase ([history](docs/roadmap.md#development-history)) |
| 11. Presentation | The demo script, then the architecture doc for questions |
| 12. Security *(extra credit)* | Spring Security + BCrypt + HS256 JWT, signature and expiry verified server-side, secret from the environment; **plus per-role `@PreAuthorize` on the API**, guarded routes, validated input — [architecture §8](docs/architecture.md#8-multi-tenancy-end-to-end) and §8b |
| 13. Cloud deployment *(extra credit)* | Live at [eclinician-web.onrender.com](https://eclinician-web.onrender.com/login), API at [/api/health](https://eclinician-api.onrender.com/api/health) — Render blueprint, managed Postgres, all credentials from environment variables ([docs/deployment.md](docs/deployment.md)) |

## What is not built

Password self-service, per-role authorization (`@PreAuthorize`), pharmacy stock,
structured lab values, staff management, and Flyway migrations — each with its reason and
its place in the queue, in [docs/roadmap.md](docs/roadmap.md).
