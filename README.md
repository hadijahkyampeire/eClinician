# eClinician

A multi-tenant clinic management system: one deployment serving many clinics, covering the
outpatient visit from check-in to dispensing.

**[Open the app](https://eclinician-web.onrender.com/login)** ·
[API docs](https://eclinician-api.onrender.com/swagger-ui.html) ·
[health check](https://eclinician-api.onrender.com/api/health)

> **Before presenting:** the free instance sleeps and takes 1–2 minutes to wake. Open the
> app ten minutes early and leave the tab open. Cmd-click (or Ctrl-click) links here —
> GitHub will not open them in a new tab on its own.

## What is being graded, and where it is

| What is asked for | Pts | Where it lives | Time |
|---|---|---|---|
| **Functional demonstration** | **3** | **[docs/demo.md](docs/demo.md)** — act one is a visit end to end, act two is one deployment serving many clinics | 10–12 min |
| Presentation and technical understanding | 2 | [docs/presentation.md](docs/presentation.md) — 12 slides with the one sentence that matters on each, and the examiner questions with answers written out | 12 min |
| Architecture and UML | 2 | [docs/architecture.md](docs/architecture.md) — architecture, ERD, VOPC, sequence, state and collaboration diagrams. Slides 5, 6, 8, 9 | 3 min |
| Controller · service · repository · entity | 4 | Controller → service → repository, and the [API docs](https://eclinician-api.onrender.com/swagger-ui.html) generated from the controllers themselves. Open `EncounterService.finalizeEncounter` | 2 min |
| Vision document | 1 | [docs/vision.md](docs/vision.md) — problem, stakeholders, scope, features | 1 min |
| SRS and use-case model | 1 | [docs/srs.md](docs/srs.md) — the use-case model, and §4 comparing specification against implementation | 1 min |
| Testing | 1 | [docs/testing.md](docs/testing.md) — 51 JUnit tests, and what each one proves rather than how many there are | 1 min |
| GitHub and code quality | 1 | Branch per feature, reviewed pull requests, package by layer | — |
| Security *(extra credit)* | 2 | JWT signed server-side, BCrypt hashes, `@PreAuthorize` per endpoint, no key in the source, and rotating refresh tokens stored only as hashes | — |
| Cloud deployment *(extra credit)* | 2 | [docs/deployment.md](docs/deployment.md) — live on Render, secrets from the environment | — |
| Questions | — | The defence sheet at the end of [docs/presentation.md](docs/presentation.md) | 5–10 min |

### The three things to make sure they see

These carry the most marks and are the hardest to claim without showing:

1. **The visit working end to end** — check-in through to dispensing, with the counts moving.
2. **A refusal coming from the server** — sign in as a receptionist, type `/pharmacy`, and
   show it is the API saying no, not a hidden button.
3. **A second clinic onboarded live** — the moment this stops being one hospital's app.

## Sign in

Every account below uses the password **`demo1234`**. There is no role picker at login —
the role lives on the account and the API enforces it.

| Role | Email | Opens |
|---|---|---|
| Receptionist | `hkreceptionist@hkclinics.com` | Patients · Appointments |
| Clinician | `hkdoctor@hkclinics.com` | Patients · Appointments · Records |
| Lab Technician | `hklabtech@hkclinics.com` | Lab Results |
| Pharmacist | `hkpharmacy@hkclinics.com` | Pharmacy |
| Hospital Administrator | `hkadmin@hkclinics.com` | Staff · Clinic settings · read-only oversight |
| Platform Super Admin | `root@eclinician.com` | The hospital console — and no patient data |

## The clinical loop

```mermaid
flowchart LR
    REG["Receptionist<br/>registers the patient"] --> CI["Checks them in<br/>→ waiting room"]
    CI --> DOC["Clinician<br/>consults and documents"]
    DOC --> Q{"Tests<br/>needed?"}
    Q -- "yes" --> LAB["Lab Technician<br/>runs and records results"]
    LAB --> REV["Clinician<br/>reviews the results"]
    REV --> PH["Pharmacist<br/>dispenses the medicines"]
    Q -- "no" --> PH
    PH --> OUT(["Patient leaves"])
```

The pharmacy is the last stop. Finalizing the encounter is one transaction: the visit
closes and each line of the clinician's prescriptions and lab requests becomes a row in the
pharmacy and lab queues.

## How it is built

**Java 21 · Spring Boot 4 · PostgreSQL 16 · Flyway · React 19 · TypeScript · Vite**

A React SPA calls a REST API with a bearer token; the API is controller → service →
repository over JPA. Controllers hold no rules, services hold all of them. The tenant and
the role are claims inside the signed token, never client input, and every repository
finder takes a `tenantId` — so no query in the codebase *can* return another clinic's row.
Flyway owns the schema. 51 JUnit tests cover the rules.

## Run it

```bash
docker compose up -d   # Postgres on port 5433
make install           # npm install + mvn install
make run               # backend on :8080, frontend on :5173
make test              # 51 backend tests
```

If the network fails during the demo, this gives the same demo locally.

## Docs

| Document | What is in it |
|---|---|
| [Demo script](docs/demo.md) | The 15-minute demo, step by step |
| [Presentation guide](docs/presentation.md) | Slide plan, rubric map, examiner questions with answers |
| [Vision](docs/vision.md) | Problem, stakeholders, scope, features |
| [SRS & use cases](docs/srs.md) | Use-case model, and specification against implementation |
| [Architecture & UML](docs/architecture.md) | Architecture, ERD, VOPC, sequence, state, collaboration |
| [API](docs/api.md) | Endpoints, errors, who may call what |
| [Testing](docs/testing.md) | What each test proves |
| [Deployment](docs/deployment.md) | Local, Docker, Render, migrations |
| [Roadmap](docs/roadmap.md) | What is not built, and why |

Analysis-phase originals: [SRS PDF](docs/srs/eClinician-SRS.pdf) ·
[requirements presentation](docs/srs/eClinician-Requirements-Presentation.pptx) ·
[drawio diagrams](docs/diagrams/)
