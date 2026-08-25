# eClinician

A multi-tenant clinic management system: one deployment serving many clinics, covering the
outpatient visit from check-in to dispensing.

**[Open the app](https://eclinician-web.onrender.com/login)** ·
[API docs](https://eclinician-api.onrender.com/swagger-ui.html) ·
[health check](https://eclinician-api.onrender.com/api/health)

> The free instance sleeps and takes 1–2 minutes to wake, so open the app a few minutes
> before you need it. Cmd-click (or Ctrl-click) links here — GitHub will not open them in
> a new tab on its own.

## Project walkthrough

Everything below is in the order it will be presented. Each part says where the artefact
lives and the one or two things worth pointing at when it is on screen.

---

### A. Project documentation and design

#### A.1 · Vision document

**[eClinician-Vision.pdf](docs/vision/eClinician-Vision.pdf)** — the vision document as
submitted: the problem paper records cause, the product position, the stakeholders and
users, the product scope, the major features, and the assumptions and constraints it was
written under. Also kept as a [Word file](docs/vision/eClinician-Vision.docx).

#### A.2 · SRS and use-case model

**[eClinician-SRS.pdf](docs/srs/eClinician-SRS.pdf)** — the SRS itself: actors, the
use-case model, and a full description of every use case with its flows, preconditions and
postconditions. Written during analysis, before any code. Also kept as a
[Word file](docs/srs/eClinician-SRS.docx) and as the
[slides presented with it](docs/srs/eClinician-Requirements-Presentation.pptx).

**[docs/as-built.md](docs/as-built.md)** — a short companion, not a second SRS. It holds
the three things the PDF could not, having been written first: a table comparing each use
case as specified against what was built, the non-functional requirements the code answers,
and the two rules the implementation enforces more strictly than the spec asked.

#### A.3 · Architecture and UML diagrams

**[eClinician-System-Architecture.pdf](docs/architecture/eClinician-System-Architecture.pdf)** —
the architectural analysis as submitted: the architectural drivers, the chosen style, the
high-level architecture, its components, how the tiers communicate, the decisions behind it
and the quality attributes they serve.

![High-level system architecture](docs/architecture/system-architecture.png)

The UML diagrams are in [docs/diagrams/](docs/diagrams/), grouped by kind, each with the
editable `.drawio` source beside its export:

| Diagram | Where |
|---|---|
| System architecture | [architecture/](docs/architecture/) — the PDF above, and the diagram as `.drawio` and `.png` |
| Use case | [diagrams/use-case/](docs/diagrams/use-case/) |
| VOPC — view of participating classes | [diagrams/vopc/](docs/diagrams/vopc/) |
| Sequence | [diagrams/sequence/](docs/diagrams/sequence/) |
| Collaboration | [diagrams/collaboration/](docs/diagrams/collaboration/) |

[**docs/diagrams/README.md**](docs/diagrams/) shows every one of them inline on a single
page — open that rather than the folders if you would rather scroll than click.

> The architecture is three tiers — a React SPA in the browser, a Spring Boot application
> tier of controller → security → service → repository, and PostgreSQL underneath — with
> the AI summarizer drawn deliberately *outside* the system boundary. The one sentence that
> makes it a design rather than a picture: **the tenant and the role are claims inside the
> signed token, never client input**, so the boundary between hospitals is drawn once, at
> the bottom, and no layer above it can forget to apply it.

---

### B. Application implementation

The package layout is the architecture — one folder per layer, so a request can be traced
by walking down the tree.

```
backend/src/main/java/com/eclinician/
├── controllers/          B.4 — HTTP in, DTO out. 12 controllers, no rules.
├── services/             B.5 — every business rule lives here.
├── repositories/         B.6 — Spring Data JPA. Every finder takes a tenantId.
├── domains/
│   ├── entities/         B.7 — 9 JPA entities.
│   ├── dtos/             Request/response records — entities never leave the service.
│   └── enums/            The state machines: AppointmentStatus, EncounterStatus, …
├── security/             SecurityConfig, and the tenant resolved from the token
├── config/               CORS, OpenAPI
└── resources/db/migration/   Flyway — the schema, versioned

frontend/src/
├── pages/                One screen per role's work
├── components/dashboard/ The five role dashboards
├── api/                  Typed fetch wrappers, one per resource
└── auth/                 Token handling, session, ProtectedRoute
```

#### B.4 · Controller layer

**[backend/.../controllers/](backend/src/main/java/com/eclinician/controllers/)** — 12
controllers. Open **[PharmacyController.java](backend/src/main/java/com/eclinician/controllers/PharmacyController.java)**;
it is under 50 lines and shows the whole pattern.

> Two things to say: **a controller method is three lines** — take the request, call the
> service, return the DTO; there is no `if` in the file. And the **`@PreAuthorize` above
> each method** is where the role is enforced — on the server, per endpoint, not by hiding
> a button.

#### B.5 · Service layer

**[backend/.../services/](backend/src/main/java/com/eclinician/services/)** — every rule.
Open **[`EncounterService.finalizeEncounter`](backend/src/main/java/com/eclinician/services/EncounterService.java#L100)**.

> One `@Transactional` method that is the whole point of the app: it refuses without a
> diagnosis and plan, closes the encounter, completes the appointment, clears the
> patient's care status, and turns each prescription and lab line into a queue row for
> pharmacy and the lab. **All of it commits or none of it does** — a half-finalized visit
> would leave a patient with medicines nobody was asked to dispense.

#### B.6 · Repository layer

**[backend/.../repositories/](backend/src/main/java/com/eclinician/repositories/)** — 9
Spring Data JPA interfaces. Open
**[AppointmentRepository.java](backend/src/main/java/com/eclinician/repositories/AppointmentRepository.java)**.

> **Every single finder takes a `tenantId` as its first argument** — `findByIdAndTenantId`,
> not `findById`. That is deliberate: there is no method in the codebase that *can* return
> another hospital's row, so isolation is a property of the type signature rather than
> something each caller has to remember. The derived query names mean most of these have
> no SQL at all; the one `@Query` is there because it answers two questions at once.

#### B.7 · Entity and database design

**[backend/.../domains/entities/](backend/src/main/java/com/eclinician/domains/entities/)** — 9 entities ·
schema in **[resources/db/migration/](backend/src/main/resources/db/migration/)**, where
the tables, foreign keys and indexes are written out as numbered Flyway migrations.

> **Flyway owns the schema, not Hibernate** — `ddl-auto` is `validate`, so the app refuses
> to start if the mapping and the tables have drifted, and every change is a numbered
> migration that is reviewable and replayable. Then show one constraint doing real work:
> `ux_patients_tenant_phone` is unique on **(tenant_id, phone)** — the same phone number is
> a duplicate inside one clinic and perfectly fine across two.

#### B.8 · Functional application demonstration

**[Open the live app](https://eclinician-web.onrender.com/login)** — the demo runs
role by role through [what to demo as each actor](#what-to-demo-as-each-actor) below.

The three things to make sure are seen — they are the hardest to claim without showing:

1. **The visit working end to end** — check-in through to dispensing, with the counts moving.
2. **A refusal coming from the server** — sign in as a receptionist, type `/pharmacy`, and
   show it is the API saying no, not a hidden button.
3. **A second clinic onboarded live** — the moment this stops being one hospital's app.

Each role lands in a different part of the clinic — its own crest, colour and layout, so
the screen says whose workspace it is before anyone reads a word. The front desk and the
consulting room read as counters over lists; the lab and the pharmacy are a *bench*, one
queue worked all day with its counters in a rail beside it.

Under the live panels, every dashboard carries the **same look-back**: today by default,
then yesterday, the last 3, 7 or 30 days, all time, or any date or span typed into the two
date fields. Each role sees its own history through it — appointments at the desk, the
clinician's own documented visits, the tests asked of the bench, the medicines raised at
the counter — so "what did we do with that patient last Tuesday" is one click from
wherever you are standing.

The colours are all one family — **navy, sea, teal, forest and ink**, defined once as the
product's palette in [`index.css`](frontend/src/index.css). The department's colour is set
on the root at sign-in, so the sidebar, the active nav item, the calendar, the avatar and
the mark wear it too — a page whose own chrome disagrees with it reads as two designs
sharing a window. And because that accent is mixed with the hospital's own colour, the
tenant's brand still reaches every screen — see [Onboarding a new clinic](#onboarding-a-new-clinic).

| | |
|---|---|
| ![Login](docs/screenshots/app/login.png) | ![Front desk dashboard](docs/screenshots/app/receptionist-dashboard.png) |
| **Login** — no role picker. The role lives on the account, and the API enforces it. | **Front desk** (navy) — who is in the building but not yet with a clinician. |
| ![Consulting room dashboard](docs/screenshots/app/clinician-dashboard.png) | ![Laboratory dashboard](docs/screenshots/app/lab-dashboard.png) |
| **Consulting room** (teal, the house colour) — this clinician's queue, and the notes still open from it. | **Laboratory** (sea) — the bench. Tests only: no patient list, no records. |
| ![Pharmacy dashboard](docs/screenshots/app/pharmacy-dashboard.png) | |
| **Pharmacy** (forest) — the dispensing queue. A row lands here the moment a clinician finalizes. | |

#### B.9 · Testing

**[docs/testing.md](docs/testing.md)** — what each of the 60 tests proves, class by class.

```bash
make test           # the full run, Spring's start-up logging and all
make test-report    # the same run, filtered to the result — one screenful
```

```
[INFO] Tests run:  9, Failures: 0, Errors: 0, Skipped: 0 -- in RoleAuthorizationTests
[INFO] Tests run:  8, Failures: 0, Errors: 0, Skipped: 0 -- in RefreshTokenTests
[INFO] Tests run:  7, Failures: 0, Errors: 0, Skipped: 0 -- in AuthTests
[INFO] Tests run:  6, Failures: 0, Errors: 0, Skipped: 0 -- in PatientRuleTests
[INFO] Tests run:  6, Failures: 0, Errors: 0, Skipped: 0 -- in PlatformConsoleTests
[INFO] Tests run:  4, Failures: 0, Errors: 0, Skipped: 0 -- in StaffManagementTests
[INFO] Tests run:  3, Failures: 0, Errors: 0, Skipped: 0 -- in AppointmentSchedulingTests
[INFO] Tests run:  3, Failures: 0, Errors: 0, Skipped: 0 -- in PasswordChangeTests
[INFO] Tests run:  3, Failures: 0, Errors: 0, Skipped: 0 -- in StaleCheckInTests
[INFO] Tests run:  3, Failures: 0, Errors: 0, Skipped: 0 -- in SummaryDraftingTests
[INFO] Tests run:  2, Failures: 0, Errors: 0, Skipped: 0 -- in AppointmentServiceTests
[INFO] Tests run:  2, Failures: 0, Errors: 0, Skipped: 0 -- in ClinicianAvailabilityTests
[INFO] Tests run:  2, Failures: 0, Errors: 0, Skipped: 0 -- in EncounterServiceTests
[INFO] Tests run:  1, Failures: 0, Errors: 0, Skipped: 0 -- in BackendApplicationTests
[INFO] Tests run:  1, Failures: 0, Errors: 0, Skipped: 0 -- in ClinicalEncounterFlowTests
[INFO]
[INFO] Results:
[INFO]
[INFO] Tests run: 60, Failures: 0, Errors: 0, Skipped: 0
[INFO]
[INFO] BUILD SUCCESS
[INFO] Total time:  12.119 s
```

<!-- Screenshot of the above: run `make test-report`, save the terminal as
     docs/screenshots/tests/passing-tests.png, and add this line below this comment:
     ![Passing tests](docs/screenshots/tests/passing-tests.png) -->

**What is used:** **JUnit 5** for the tests, **Spring Boot Test** with **MockMvc** to send
real requests through the whole stack — security filters, controller, service, repository —
**AssertJ** for the assertions, and **H2 in memory** as the database, so the suite needs no
Docker and no Postgres and CI runs it on a clean machine.

> **The one to walk through: `ClinicalEncounterFlowTests`.** A single test walks the whole
> workflow — log in → check in → start session → document → finalize → result the lab
> order — asserting the status at each step: `CHECKED_IN`, `IN_SESSION`, encounter `DRAFT`,
> then `FINALIZED`, appointment `COMPLETED`, and the requested test waiting in the lab
> queue as its own row. Two things make it worth the minute: it uses **three different
> tokens**, one per role, because the server refuses to let a receptionist do the
> clinician's work; and it **sends no tenant anywhere** — the token carries it.

The suite covers normal, boundary and error cases: `AppointmentSchedulingTests` proves a
doctor cannot be double-booked, `PatientRuleTests` proves the same phone number is a
duplicate in one clinic and legal in another, and `RoleAuthorizationTests` asserts nine
refusals against the API rather than the UI.

---

### C. Code and presentation

#### C.10 · GitHub and code quality

**[github.com/hadijahkyampeire/eClinician](https://github.com/hadijahkyampeire/eClinician)**

> A branch per feature, every one merged through a reviewed pull request — the history
> shows the work rather than one commit at the end. Packages are named for the layer they
> hold, and classes for what they do, so `EncounterService.finalizeEncounter` needs no
> comment to be found. The [API reference](docs/api.md) is generated from the controllers
> themselves ([Swagger UI](https://eclinician-api.onrender.com/swagger-ui.html)), so it
> cannot drift from the code.

#### C.11 · Presentation

**[docs/presentation.md](docs/presentation.md)** — the slide plan, the one sentence that
matters on each, and the likely questions with answers written out.

---

### D. Beyond the requirements

#### D.12 · Security

**[SecurityConfig.java](backend/src/main/java/com/eclinician/security/SecurityConfig.java)** ·
the per-endpoint rules in [docs/api.md](docs/api.md#who-may-call-what)

| | |
|---|---|
| **Authentication** | Spring Security, stateless. Passwords are stored as **BCrypt** hashes and never anywhere else. |
| **Tokens** | **JWT signed HS256** by this service and validated on every request — signature *and* expiry (`JWT_TTL_MINUTES`, 8 hours by default). Alongside it a **rotating** refresh token, stored **only as a hash**: spending one issues a fresh pair, and replaying a spent one ends every session the account holds. |
| **Signing key** | Never in the source. `JWT_SECRET` comes from the environment (Render generates it); with none set, a random per-process key is generated so a developer can run the app and no default key can ship. |
| **Authorization** | `@EnableMethodSecurity` plus **`@PreAuthorize` wherever a role matters** — per method, or on the class where a whole controller belongs to one role (`PlatformController`, `StaffController`). Everything else still needs a valid token: only `/api/health` and login are open. Roles are enforced server-side; the UI hiding a nav item is a convenience, not the control. |
| **The one deliberate exception** | `/api/stats/dashboard` carries no role rule, because every role reads its own dashboard from it. It is still authenticated and still tenant-scoped, and it decides what to count from the *token's* role — not from anything the caller sends. |
| **Tenant isolation** | The hospital is a **claim inside the signed token**, never a header or a body field, and every repository finder takes it — so a valid token from another clinic gets an empty list, not a `403`. |
| **Input validation** | Bean Validation (`@Valid` on 20 controller methods, with `@NotNull` / `@Size` / `@Positive` on the request records), plus the service-layer rules; the database carries the same constraints, so nothing gets in behind the API. |
| **Secrets** | Nothing committed. Database credentials, `JWT_SECRET` and the AI key all come from environment variables — see [render.yaml](render.yaml). |

Prove it rather than assert it: sign in as the receptionist and type `/pharmacy` in the URL
bar. The nav item is missing *and* the endpoint answers `403` on its own. The same thing
without a browser — swap `localhost:8080` for `https://eclinician-api.onrender.com` to run
it against the live API:

```bash
# No token at all
curl -s -o /dev/null -w '%{http_code}\n' localhost:8080/api/patients            # 401

# Claiming a tenant in a header gets you nowhere — the tenant is not read from one
curl -s -o /dev/null -w '%{http_code}\n' localhost:8080/api/patients \
  -H 'X-Tenant-Id: hk-clinics'                                                  # 401

# Log in, then read with the token
TOKEN=$(curl -s -X POST localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"hkdoctor@hkclinics.com","password":"demo1234"}' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["token"])')
curl -s localhost:8080/api/patients -H "Authorization: Bearer $TOKEN" | head -c 300

# A receptionist reaching for the pharmacy queue
curl -s -o /dev/null -w '%{http_code}\n' localhost:8080/api/pharmacy/prescriptions \
  -H "Authorization: Bearer $RECEPTION_TOKEN"                                   # 403
```

Paste the token into [jwt.io](https://jwt.io) to show the `tenant` and `role` claims:
readable by anyone, changeable by nobody without the signing key.

#### D.13 · Cloud deployment

**[eclinician-web.onrender.com](https://eclinician-web.onrender.com/login)** ·
[API health](https://eclinician-api.onrender.com/api/health) ·
[docs/deployment.md](docs/deployment.md) · blueprint in [render.yaml](render.yaml)

![The three Render services, all live](docs/screenshots/deployment/render-services.png)

| Service on Render | What it is | Live |
|---|---|---|
| `eclinician-web` | The React build, served as a static site | [open the app](https://eclinician-web.onrender.com/login) |
| `eclinician-api` | The Spring Boot API, as a Docker image | [health check](https://eclinician-api.onrender.com/api/health) |
| `eclinician-db` | Managed PostgreSQL 18 | reachable only from the API |

> Three services from one committed blueprint: a managed **PostgreSQL**, the API as a
> **Docker** image, and the React build as a **static site**. Every credential is injected
> at runtime — the database ones by Render from the database itself, `JWT_SECRET` generated
> by Render and never shown, the AI key pasted into the dashboard. **Nothing secret is in
> the repository**, which is why `render.yaml` is safe to commit and read out loud.
>
> Flyway runs the migrations on boot, so a deploy and a fresh database need no manual step.

> **Before presenting:** the free instance sleeps after 15 minutes and takes about 90
> seconds to wake. Open the app ten minutes early and leave the tab open.

---

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
| Obstetrician/Gynecologist | `hkobgyn@hkclinics.com` | Assigned queue · Records |
| Lab Technician | `hklabtech@hkclinics.com` | Lab Results |
| Pharmacist | `hkpharmacy@hkclinics.com` | Pharmacy |
| Hospital Administrator | `hkadmin@hkclinics.com` | Staff · Clinic settings · read-only oversight |
| Platform Super Admin | `root@eclinician.com` | The hospital console — and no patient data |

## What to demo as each actor

Every use case below is wired end to end. Run them in this order and they tell one story —
a patient registered, seen, tested, dispensed to — or take a single role on its own to
answer "show me what a pharmacist does".

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
   Ask whether they prefer the general practitioner, dentist, pediatrician, optometrist,
   or obstetrician/gynecologist; the page assigns that clinician as it records
   `SCHEDULED → CHECKED_IN`.
5. **Take them to the waiting room** — the hourglass action on the queue row, or the same
   action on the dashboard's *In the clinic now* panel. `CHECKED_IN → WAITING`.
6. **Book, edit and cancel appointments** — book the same doctor at the same time twice and
   the API refuses it; cancel the first and the slot frees.
7. **Look back** — the dashboard's appointment table opens on today, arrivals included.
   Switch it to *Last 30 days*, or type a date, and every past visit is there with the
   patient's name a link into their file. The same filter sits on the Appointments page's
   history.
8. **Be refused** — type `/records` or `/pharmacy` in the URL bar. The nav item is not
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
9. **Look back** — the dashboard lists the visits *you* documented, over any period you
   pick; *Open* on a row reads the whole record back.

### Lab Technician — `hklabtech@hkclinics.com`

1. **Work the queue** — Lab Results, filtered *Pending / Completed / Cancelled / All*.
2. **Record a result** — on a pending test. `PENDING → COMPLETED`, and it appears on the
   clinician's copy of the record.
3. **Cancel a test with a reason** — "no reagent". `PENDING → CANCELLED`; the reason is
   stored, not discarded.
4. **The dashboard** — pending, resulted today, cancelled, the pending list itself, and a
   look-back over every test asked of the laboratory in any period you pick.

This role sees no patient list and no records — only the tests asked of it. The look-back
names the patient but does not link to them, because the API would refuse the click.

### Pharmacist — `hkpharmacy@hkclinics.com`

1. **Work the queue** — Pharmacy, filtered *Pending / Dispensed / Unavailable / All*. A row
   appears the moment a clinician finalizes.
2. **Dispense** — `PENDING → DISPENSED`.
3. **Mark unavailable with a reason** — "out of stock". `PENDING → UNAVAILABLE`.
4. **The dashboard** — pending, dispensed today, unavailable, the queue itself, and a
   look-back over every prescription raised in any period you pick.

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

## Onboarding a new clinic

One deployment serves many hospitals, and adding one is a form on the platform console — no
deploy, no migration, no configuration file.

| The console asks for | What it decides |
|---|---|
| **Name** | Sits beside the HK CLINIC mark for that hospital's staff |
| **Identifier** | Written into every row the hospital will ever own, so it is permanent and cannot be edited afterwards |
| **Brand colour** | Mixed into the accent every screen is drawn with |
| **Subscription** | Which of Patients, Appointments, Records, Pharmacy and Laboratory they bought — a module they did not buy has no nav item *and* no endpoint |
| **First administrator** | Name, email, password |

The hospital and its first administrator are created in **one transaction**
([`TenantService.create`](backend/src/main/java/com/eclinician/services/TenantService.java)):
a hospital nobody can sign in to would be worse than no hospital.

Then log out and sign back in as that administrator — an empty clinic wearing their colour,
their name beside the mark, and only the modules they paid for in the sidebar. The colour is
read from the session, so one changed later in Clinic settings shows on the *next* sign-in.

What does **not** change is the product: the mark, the layout, the type, the icons, and the
five department colours are ours. A tenant is a customer wearing your product's clothes, so
their name sits beside your mark rather than replacing it.

## The clinical loop

```
  Receptionist  ─▶  registers the patient and checks them in
       │
       ▼
  Clinician     ─▶  consults, documents, prescribes, requests tests, finalizes
       │
       ├─ tests requested ─▶  Lab Technician  ─▶  runs them, records the results
       │                            │
       │                            ▼
       │                       Clinician      ─▶  reviews the results
       │                            │
       ▼                            ▼
  Pharmacist    ─▶  dispenses the medicines, and the patient leaves
```

Finalizing is the hinge: one transaction closes the visit and turns each line of the
clinician's prescriptions and lab requests into a row in the pharmacy and lab queues.

## How it is built

**Java 21 · Spring Boot 4 · PostgreSQL · Flyway · React 19 · TypeScript · Vite**

A React SPA calls a REST API with a bearer token; the API is controller → service →
repository over JPA. Controllers hold no rules, services hold all of them. The tenant and
the role are claims inside the signed token, never client input, and every repository
finder takes a `tenantId` — so no query in the codebase *can* return another clinic's row.
Flyway owns the schema. 60 JUnit tests cover the rules.

## Run it

```bash
docker compose up -d   # Postgres on port 5433
make install           # npm install + mvn install
make run               # backend on :8080, frontend on :5173
make test              # 60 backend tests (make test-report for just the result)
```

If the network fails during the demo, this gives the same demo locally.

## Docs

| Document | What is in it |
|---|---|
| [Presentation guide](docs/presentation.md) | Slide plan, and the likely questions with answers |
| [Vision PDF](docs/vision/eClinician-Vision.pdf) | Problem, stakeholders, scope, features |
| [SRS PDF](docs/srs/eClinician-SRS.pdf) | The requirements, as written during analysis |
| [As built](docs/as-built.md) | Specification against implementation, and the non-functional requirements |
| [Architecture PDF](docs/architecture/eClinician-System-Architecture.pdf) | Architectural drivers, style, components, decisions |
| [Diagram gallery](docs/diagrams/) | Every UML diagram on one page, grouped by kind |
| [API](docs/api.md) | Endpoints, errors, who may call what |
| [Testing](docs/testing.md) | What each test proves |
| [Deployment](docs/deployment.md) | Local, Docker, Render, migrations |
| [Roadmap](docs/roadmap.md) | What is not built, and why |

Analysis-phase originals: [SRS PDF](docs/srs/eClinician-SRS.pdf) ·
[requirements presentation](docs/srs/eClinician-Requirements-Presentation.pptx) ·
[drawio sources](docs/diagrams/)
