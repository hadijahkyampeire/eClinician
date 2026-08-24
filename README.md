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
| General Practitioner | `hkdoctor@hkclinics.com` | Assigned queue · Records |
| Dentist | `hkdentist@hkclinics.com` | Assigned queue · Records |
| Pediatrician | `hkpediatrician@hkclinics.com` | Assigned queue · Records |
| Optometrist | `hkoptometrist@hkclinics.com` | Assigned queue · Records |
| Lab Technician | `hklabtech@hkclinics.com` | Lab Results |
| Pharmacist | `hkpharmacy@hkclinics.com` | Pharmacy |
| Hospital Administrator | `hkadmin@hkclinics.com` | Staff · Clinic settings · read-only oversight |
| Platform Super Admin | `root@eclinician.com` | The hospital console — and no patient data |

## What to demo as each actor

Every use case below is wired end to end. [docs/demo.md](docs/demo.md) runs these as one
15-minute story; this list is the same ground cut by actor, for rehearsing a single role or
answering "show me what a pharmacist does".

### Receptionist — `hkreceptionist@hkclinics.com`

The front desk owns everyone who is not yet with a clinician.

1. **Register a patient** — Patients → *Add patient*. Country-neutral government ID, phone
   validated against the chosen country, address split into line, city, district, state,
   country.
2. **Find a patient** — search by name or phone, or open *Filters* for sex, country, date
   of birth range, enrolment range, care status and national ID.
3. **Open a patient** — demographics, contact, and the appointment history. Clinical
   history is not on this page for this role, and the API refuses it too.
4. **Check a patient in** — from the patient row, the patient page, or the dashboard.
   Ask whether they prefer the general practitioner, dentist, pediatrician, or optometrist;
   the page assigns that clinician as it records `SCHEDULED → CHECKED_IN`.
5. **Take them to the waiting room** — the hourglass action on the queue row, or the same
   action on the dashboard's *In the clinic now* panel. `CHECKED_IN → WAITING`.
6. **Book, edit and cancel appointments** — book the same doctor at the same time twice and
   the API refuses it; cancel the first and the slot frees.
7. **Be refused** — type `/records` or `/pharmacy` in the URL bar. The nav item is not
   merely hidden: the API returns 403 on its own.

*Also available to every role:* change your own password from the sidebar.

### Clinician — `hkdoctor@hkclinics.com`

1. **See who is waiting** — the dashboard lists patients assigned to this clinician,
   longest-wait-first, plus unassigned walk-ins any available clinician may claim.
2. **Start a session** — `WAITING → IN_SESSION`, and a `DRAFT` encounter is opened.
3. **Document the visit** — vitals (blood pressure, temperature, pulse, weight), symptoms
   and history, examination notes, diagnosis, treatment plan.
4. **Raise orders** — prescriptions and lab requests, one per line. These become the
   pharmacy and lab queues.
5. **Draft the summary with AI** — the model drafts from the notes into a field the
   clinician then edits. The clinician signs the record, not the model.
6. **Save a draft and come back** — unfinished notes are a panel on the dashboard with
   *Continue* on each row.
7. **Finalize** — one transaction: the encounter completes, the patient's care status
   clears, and every prescription and lab line becomes a queue row. The record is read-only
   afterwards.
8. **Review results** — reopen the patient after the lab has resulted, with every past
   visit in front of you.

### Lab Technician — `hklabtech@hkclinics.com`

1. **Work the queue** — Lab Results, filtered *Pending / Completed / Cancelled / All*.
2. **Record a result** — on a pending test. `PENDING → COMPLETED`, and it appears on the
   clinician's copy of the record.
3. **Cancel a test with a reason** — "no reagent". `PENDING → CANCELLED`; the reason is
   stored, not discarded.
4. **The dashboard** — pending, resulted today, cancelled, and the pending list itself.

This role sees no patient list and no records — only the tests asked of it.

### Pharmacist — `hkpharmacy@hkclinics.com`

1. **Work the queue** — Pharmacy, filtered *Pending / Dispensed / Unavailable / All*. A row
   appears the moment a clinician finalizes.
2. **Dispense** — `PENDING → DISPENSED`.
3. **Mark unavailable with a reason** — "out of stock". `PENDING → UNAVAILABLE`.
4. **The dashboard** — pending, dispensed today, unavailable, and the queue itself.

### Hospital Administrator — `hkadmin@hkclinics.com`

Runs one hospital. Sees the work, does not do the clinical work.

1. **Add a staff member** — Staff → *Add staff member*: name, email, role, first password.
   They can sign in immediately.
2. **Deactivate an account** — the row toggles. Their data stays; their sign-in stops.
   You cannot deactivate yourself.
3. **Rename the clinic and change its colour** — Clinic settings. The name rides beside the
   HK CLINIC mark; the colour takes effect the next time staff sign in.
4. **See the subscription** — the modules this hospital bought, read-only. Only the
   platform team changes them.
5. **Oversight** — totals across the facility, who is in the clinic, and unfinished notes
   across every clinician, read-only.

### Platform Super Admin — `root@eclinician.com`

A separate console at `/platform`, with no patient data on it at all — the point being that
the person who runs the platform cannot read anyone's medical record.

1. **Onboard a hospital** — *Onboard hospital* asks for:
   - **Name** — shown beside the HK CLINIC mark to that hospital's staff.
   - **Identifier** — lowercase and hyphenated, and permanent: it is written into every row
     the hospital will ever own, so it cannot be edited afterwards.
   - **Brand colour** — a colour picker.
   - **Subscription** — which of Patients, Appointments, Records, Pharmacy and Laboratory
     they have bought.
   - **First administrator** — name, email, password.

   The hospital and its administrator are created in **one transaction**
   ([`TenantService.create`](backend/src/main/java/com/eclinician/services/TenantService.java)) —
   a hospital nobody can sign in to would be worse than no hospital.

2. **Sign in as the clinic you just made** — log out, log in as that new administrator, and
   the app is wearing their colour with their name beside the mark. This is the moment the
   demo stops being one hospital's app.
3. **Turn a module off** — uncheck Pharmacy, and that hospital's pharmacist loses the nav
   item *and* the endpoint.
4. **Suspend a hospital** — its staff can no longer sign in; every row it owns is kept.
5. **Edit a hospital** — name, colour and modules. The identifier stays greyed out.

## What is themed, and what is not

A hospital picks **a name and one colour**. On sign-in the API returns both inside the
session, and the whole brand ramp is derived from that one colour — the buttons, the hover
states, the tinted chips and the panel accents all follow it.

What deliberately does **not** change is the product itself: the HK CLINIC mark, the
layout, the type, the spacing, the icons. A tenant is a customer wearing your product's
clothes, not a rebrand of it — so their name sits *beside* your mark rather than replacing
it, and everything structural stays yours.

**On tenant logos:** there is no logo anywhere in the system today — no upload, no column,
no storage. It is worth being deliberate about rather than adding by reflex. A logo is a
file, which means an upload endpoint, size and type validation, somewhere to put the bytes,
and a broken-image state on every page that shows it — and the payoff would be a second
mark competing with yours in a 248px sidebar. The clinic's *name* beside your mark already
answers "whose clinic am I in?", which is the question a logo would be answering. If it is
ever wanted, the honest place for it is the patient-facing artefacts a clinic hands over —
a printed visit summary or a discharge note — not the chrome of the app.

**One caveat to know before you demo it:** the colour is read from the session, so a change
made in Clinic settings shows up on the *next* sign-in, not immediately. The form says so.

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
