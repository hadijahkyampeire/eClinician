# eClinician

A multi-tenant clinical management system that digitizes the outpatient visit — from the
moment a patient walks in to the moment their medicines are dispensed.

**▶ Live: [eclinician-web.onrender.com](https://eclinician-web.onrender.com/login)**
· API: [eclinician-api.onrender.com/api/health](https://eclinician-api.onrender.com/api/health)

> **Presenting?** The free instance sleeps after 15 minutes idle and the cold start takes
> **1–2 minutes**. Open the app ten minutes early and leave the tab open.
>
> **Keeping this page open:** GitHub strips `target="_blank"` from READMEs, so no link
> here can open a new tab on its own. **Cmd-click** (macOS) or **Ctrl-click** / middle-click
> any link below and this page stays where it is.

**Stack:** Java 21 · Spring Boot 4 · PostgreSQL 16 · Flyway · React 19 · TypeScript · Vite

---

## Accounts to test with

These accounts exist in the deployed database. Sign in at
[eclinician-web.onrender.com](https://eclinician-web.onrender.com/login) with any of them
— every one uses the password **`demo1234`**.

| Role | Email | Password | What they open |
|---|---|---|---|
| Receptionist | `hkreceptionist@hkclinics.com` | `demo1234` | Patients · Appointments |
| Clinician (doctor) | `hkdoctor@hkclinics.com` | `demo1234` | Patients · Appointments · Records |
| Lab Technician | `hklabtech@hkclinics.com` | `demo1234` | Lab Results |
| Pharmacist | `hkpharmacy@hkclinics.com` | `demo1234` | Pharmacy |
| Hospital Administrator | `hkadmin@hkclinics.com` | `demo1234` | Staff · Clinic settings, and read-only oversight of every department |
| Platform Super Admin | `root@eclinician.com` | `demo1234` | The hospital console — and no patient data at all |

**Nobody chooses a role at sign-in.** The login screen asks for an email and a password
and nothing else. The account's role lives on its `app_users` row; the API reads it, signs
it into the token, and returns it, and the browser renders whatever that answer allows —
while the API enforces it independently. Letting a person pick their own role at the door
would be no security at all, which is why there is no role selector.

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

The pharmacy is the **last** stop: a patient collects medicine once the clinician has
seen whatever the laboratory found. Where no test is needed, the consultation goes
straight to the pharmacy.

**What each arrow writes:**

| Step | The system does this |
|---|---|
| Register | A row in `patients` |
| Check in | An `appointment` — `CHECKED_IN`, then `WAITING`; the patient's care status is what the waiting-room count reads |
| Consult | An `encounter` in `DRAFT`: vitals, symptoms, examination, diagnosis, plan, plus prescriptions and lab requests as free text, one per line |
| **Finalize** | One transaction: the encounter is signed off, the appointment completes, the care status clears, and each line of text becomes a row in `lab_orders` and `prescription_orders` |
| Result a test | The technician records the result against that lab order |
| Draft the summary | The summarizer reads the notes already written and drafts the visit summary into an editable field. The clinician corrects it; their name is what the record is signed with |
| Review | The clinician reads their patient's results on the patient record — no queue, no paper |
| Dispense | The pharmacist marks each medicine dispensed, or unavailable with a reason |

**Where the build is looser than the diagram, said plainly.** Finalizing raises the
pharmacy and laboratory work at the same moment, so nothing stops a pharmacist dispensing
before results come back. Sequencing the two — holding a prescription until its tests are
resulted — is listed under [future work](#future-work). The review step is a second
encounter for the same patient, which the system already supports.

## Who does what, and where each role stops

The interesting half of a role is what it **cannot** do. Every refusal below comes from
the server (`@PreAuthorize` on the endpoint), not from a hidden button — typing the URL
directly gets the same `403`.

### Receptionist — `hkreceptionist@hkclinics.com`

Registers patients, books appointments, checks people in, moves them to the waiting room.

**Stops at the consulting-room door.** No Records, no Pharmacy, no Lab, no Staff. They may
read the clinician list — you cannot book a doctor you cannot name — but nothing else of
the staff module. Opening a patient shows the profile and visit history; the clinical
history and doctor's notes are replaced with *"restricted for your role"*.

### Clinician — `hkdoctor@hkclinics.com`

Starts the session, documents the encounter, prescribes, requests tests, finalizes, and
reads that patient's lab results and prescriptions on their record.

**Stops at the queues and the staff list.** They cannot dispense a medicine or record a
lab result — issuing and fulfilling are different jobs, and the system keeps them apart.
They cannot add or deactivate an account.

### Lab Technician — `hklabtech@hkclinics.com`

Sees the laboratory queue, records a result, or cancels a test with a reason.

**Stops at everything else.** No patients list, no records, no pharmacy. The result they
record is stamped with their name from the token — a request cannot claim to be someone
else's work.

### Pharmacist — `hkpharmacy@hkclinics.com`

Works the dispensing queue: one row per medicine, dispensed or marked unavailable.

**Stops at the same fence.** No clinical records, no lab queue. `dispensedBy` comes from
the token, never the request body.

### Hospital Administrator — `hkadmin@hkclinics.com`

Runs the clinic rather than working in it. Reads every department for oversight, manages
staff accounts — add a colleague, change a role, deactivate an account, which blocks that
sign-in immediately — and owns Clinic settings: the name and colour their staff see.

**Stops at the clinical record itself.** Oversight is not authority: registering a patient,
documenting an encounter, dispensing a medicine and recording a lab result all answer
`403`. They can watch the pharmacy queue; they cannot dispense from it. Another hospital's
records answer `404`, and the platform console `403`.

### Platform Super Admin — `root@eclinician.com`

Onboards a clinic **and its first administrator** in one step — a clinic nobody can sign in
to is not onboarded — sets its branding and the modules it has bought, and suspends or
restores it. That administrator then hires their own staff and rebrands their own clinic
without the platform touching anything again.

**Holds no tenant, and that is the point.** Every clinical endpoint answers this account
`403`: the person who sells the system cannot read a patient in it.

## Demo script — 15 minutes

**Act one — a visit, end to end.**

| # | Signed in as | Do this | Say this |
|---|---|---|---|
| 1 | **Receptionist** | Dashboard | The counts are live, not mocked — they move as we work |
| 2 | | Patients → **Register patient** | Country-neutral ID, phone validation, address split into line/city/district/state/country |
| 3 | | Appointments → **Book appointment** | Book a second patient with the *same doctor at the same time* — the API refuses it. Cancel the first and the slot frees up |
| 4 | | Find the patient → **Check in** | An appointment row appears behind it, with no doctor: a walk-in never clashes |
| 5 | | Open the patient → **Edit** | The government ID is greyed out — recorded once, at registration |
| 6 | | Try the URL `/pharmacy` | Bounced. And the API refuses it independently — this is not a hidden button |
| 7 | **Clinician** | Appointments → **Start session** | `WAITING → IN_SESSION`, and a `DRAFT` encounter is created |
| 8 | | Records → document the visit | Vitals, symptoms, examination, diagnosis, plan. **Two medicines and two tests, one per line** |
| 9 | | **Draft with AI** | The model reads the notes and writes the visit summary. It lands in a field I can edit — the draft is a starting point, the clinician signs the record |
| 10 | | **Finalize** | One transaction: visit completes, care status clears, and four order rows are raised |
| 11 | **Lab Technician** | Laboratory | The two tests are waiting. **Record result** on one, **Cancel** the other with "no reagent" |
| 12 | **Clinician** | The patient's record | The results are on the record: the review step before the patient collects anything |
| 13 | **Pharmacist** | Pharmacy | The medicines are separate rows. **Dispense** one, mark the other **Unavailable** — "out of stock" |

**Act two — one deployment, many clinics.** This is the part that makes it a product.

| # | Signed in as | Do this | Say this |
|---|---|---|---|
| 14 | **Hospital Administrator** | Staff → **Add staff member** | Signs in immediately; **Deactivate** locks them out just as fast |
| 15 | | Try to register a patient or dispense | `403`. An administrator runs the clinic; they do not do the clinical work, and the server is what says so |
| 16 | | Clinic → change the name and colour | Their own clinic's branding, theirs to set |
| 17 | **Platform Super Admin** | The console | Onboard **SWE Clinic** with a first administrator, and pick the modules they have bought |
| 18 | | Sign in as that new administrator | An empty clinic, their own name in the sidebar beside HK CLINIC, and only the modules they paid for in the navigation. They hire their own staff from here |
| 19 | **Platform Super Admin** | **Suspend** that clinic | Its staff can no longer sign in, and not one row of its data was touched |
| 20 | | Point at what this account cannot do | It holds no tenant: every clinical endpoint answers it `403`. The person who sells the system cannot read a patient in it |

## Prove the isolation in ten seconds

The tenant lives inside a signed token, so there is nothing left for a caller to edit.
Swap `localhost:8080` for `https://eclinician-api.onrender.com` to run this live:

```bash
# No token at all
curl -s -o /dev/null -w '%{http_code}\n' localhost:8080/api/patients          # → 401

# Log in, then read with the token you were given
TOKEN=$(curl -s -X POST localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"hkdoctor@hkclinics.com","password":"demo1234"}' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["token"])')
curl -s localhost:8080/api/patients -H "Authorization: Bearer $TOKEN" | head -c 300

# The old trick — claiming a tenant in a header
curl -s -o /dev/null -w '%{http_code}\n' localhost:8080/api/patients \
  -H 'X-Tenant-Id: hk-clinics'                                            # → 401

# A receptionist reaching for the pharmacy queue
curl -s -o /dev/null -w '%{http_code}\n' localhost:8080/api/pharmacy/prescriptions \
  -H "Authorization: Bearer $RECEPTION_TOKEN"                                  # → 403
```

Paste the token into [jwt.io](https://jwt.io) to show the `tenant` and `role` claims:
readable by anyone, changeable by nobody without the signing key.

## How it is built

```
  React 19 SPA  ──  REST + Bearer <jwt>  ──►  Spring Boot 4 API  ──JPA──►  PostgreSQL
  React Query (server state)                 Controller → Service → Repository
  Zustand (UI state)                         JWT filter chain · one error advice
```

Controllers hold no rules, services hold all of them, and every repository finder takes a
`tenantId` — so no query in the codebase *can* return another clinic's row. The tenant
comes from the token via `@CurrentTenant`, never from client input, and the role in that
same token decides which endpoints the caller may reach. Flyway owns the schema; the
database enforces the foreign keys and both patient-uniqueness rules itself.

**The visit summary is drafted by an external model** from the notes the clinician already
wrote, into a field they edit and sign. Which model is a deployment decision, not a
clinical one, so `SummaryDrafter` is an interface with two implementations — OpenAI
(`gpt-4o-mini` by default) and Claude — and the one with a key configured is the one that
runs. Neither key is committed; with neither, the endpoint answers `503` saying the
feature is off and the rest of the system is unaffected.

**Tested:** 42 JUnit tests over the business rules — tenant isolation, the scheduling
conflict rules, the patient rules, role authorization, the platform console, and the
whole clinical flow over real HTTP. See [docs/testing.md](docs/testing.md).

## Run it

```bash
docker compose up -d   # Postgres on port 5433
make install           # npm install + mvn install
make run               # backend on :8080, frontend on :5173
make test              # 42 backend tests
```

Open http://localhost:5173 and pick a demo account. Full setup and cloud deployment:
[docs/deployment.md](docs/deployment.md).

## Future work

Named here rather than hidden, and argued in [docs/roadmap.md](docs/roadmap.md).

| | Why it is not built |
|---|---|
| **Billing, invoicing and payments** | Out of scope from the start ([vision.md §4](docs/vision.md)) — consultation fees, insurance claims and hospital subscriptions are their own product. The console already records which modules each clinic bought and when it was onboarded, which is exactly where pricing would attach, and the accounts role that would run it (`hkaccounts@`) is deliberately unused for now |
| **Sequencing pharmacy behind the laboratory** | Finalizing raises both queues at once; holding a prescription until its tests are resulted is a rule the system does not yet enforce |
| **Pharmacy stock** | Dispensing works; inventory does not. "Unavailable" is a pharmacist's judgement, not a stock level |
| **Structured lab results** | Results are free text. Values, units and reference ranges need a test catalogue |
| **Account recovery** | Staff change their own password and an administrator can set a colleague's; a forgotten-password link needs email delivery |
| **Metering the AI** | Summaries are drafted on demand with no per-clinic quota or usage record — which is what billing would need to price them |

## Documentation

| Document | What is in it |
|---|---|
| [Vision](docs/vision.md) | Problem, stakeholders, scope, features, constraints |
| [SRS & use cases](docs/srs.md) | The use-case model, and specification against implementation |
| [Architecture & UML](docs/architecture.md) | Architecture, ERD, VOPC, sequence, state and collaboration diagrams |
| [API](docs/api.md) | Every endpoint, the error contract, and who may call what |
| [Testing](docs/testing.md) | What each test proves |
| [Deployment](docs/deployment.md) | Local, Docker, Render, migrations |
| [Roadmap](docs/roadmap.md) | What is not built, and why |
| [Presentation guide](docs/presentation.md) | Slide plan and the examiner questions with answers |

Analysis-phase originals: [SRS PDF](docs/srs/eClinician-SRS.pdf) ·
[requirements presentation](docs/srs/eClinician-Requirements-Presentation.pptx) ·
[drawio diagrams](docs/diagrams/)
