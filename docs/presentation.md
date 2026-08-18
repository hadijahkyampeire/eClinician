# Presentation guide

What to show, in what order, and what to say when the examiner pushes back. The demo
itself is the table in the [README](../README.md#demo-script) — this page is the frame
around it.

## Where each rubric criterion is evidenced

| # | Criterion | Point to |
|---|---|---|
| 1 | Vision document | [vision.md](vision.md) — problem, position, stakeholders, scope, features, assumptions, constraints |
| 2 | SRS and use-case model | [srs.md](srs.md) and the [SRS PDF](srs/eClinician-SRS.pdf); §4 compares specification against implementation line by line |
| 3 | Architecture and UML | [architecture.md](architecture.md) — system architecture, ERD, VOPC, two sequence diagrams, a state diagram, a collaboration diagram |
| 4 | Controller layer | `controllers/` — every method reads the tenant, delegates, returns a DTO. No rules, no queries |
| 5 | Service layer | `services/` — `EncounterService.finalizeEncounter` is the one to open: the whole visit closes in one transaction |
| 6 | Repository layer | `repositories/` — Spring Data JPA, every finder tenant-scoped, one JPA `Specification` for patient search |
| 7 | Entity and database design | `domains/entities/` plus `db/migration/` — Flyway owns the schema, the database holds the foreign keys and both SRS uniqueness rules |
| 8 | Functional demonstration | The demo script, run live |
| 9 | Testing | [testing.md](testing.md) — 29 JUnit tests; `AuthTests` and `AppointmentSchedulingTests` are the two worth showing |
| 10 | GitHub and code quality | Branch-per-feature, 15 reviewed PRs, package-by-layer |
| 11 | Presentation | This page |
| 12 | Security (extra) | JWT signed and verified server-side, BCrypt hashes, `@PreAuthorize` per endpoint, no key in the source |
| 13 | Cloud deployment (extra) | [deployment.md](deployment.md) — live on Render, secrets from the environment |

## Slide plan — 12 minutes, then the demo

| # | Slide | The one sentence that matters |
|---|---|---|
| 1 | Title | eClinician — a clinical management system for outpatient clinics |
| 2 | The problem | Paper records and fragmented systems: the patient's history is wherever the file is |
| 3 | Vision and scope | One centralized, role-based platform; five roles, five modules, one tenant per clinic |
| 4 | Use-case model | Six use cases, five actors — the diagram from the SRS |
| 5 | Architecture | React SPA → REST API → PostgreSQL, with the tenant carried in a signed token |
| 6 | Domain model | The ERD: six tables, and the foreign keys the database now enforces |
| 7 | The clinical workflow | Check in → waiting → in session → finalize, and what finalize raises |
| 8 | Design decision: one transaction | Finalization closes the visit and raises pharmacy and lab work, or does none of it |
| 9 | Design decision: multi-tenancy | The tenant is a token claim, not a header, so it cannot be edited by the caller — and a row, so a hospital can be onboarded and sold modules |
| 10 | Security | BCrypt, JWT, `@PreAuthorize`, no key in the source |
| 11 | Testing | What the tests prove, not how many there are |
| 12 | Specification vs implementation | Where the build differs from the SRS, and why — [srs.md §4](srs.md) |

Then the demo. Leave the last slide on screen while demoing, so the examiner has the
"what differs and why" table in front of them during questions.

## Defence sheet

**"Why `UUID` instead of an auto-increment `Long`?"**
Two reasons. Rows are created per tenant, so a sequential key leaks how many patients a
clinic has and lets one clinic guess another's identifiers. And an ID that is unique
without asking the database means an order can be created client-side or merged from
another deployment later without collision. The cost is a wider index and no natural
ordering, which is why every listing sorts on `created_at`.

**"Why are the relationships `UUID` columns rather than `@ManyToOne`?"**
So that every query names the tenant explicitly and nothing is loaded by accident across
the HTTP boundary — a lazy association serialized in a controller is the classic source
of both N+1 queries and leaked data. What it used to cost was database-level integrity,
and `V2__referential_integrity_and_indexes.sql` is where that debt was paid: the foreign
keys are there, the object model simply does not navigate them.

**"Is there an N+1 problem?"**
Yes, in one place, and it is bounded: listing appointments resolves each patient's and
each doctor's name individually. For a clinic-sized list that is tens of queries, not
thousands. The fix, if the list grew, is a projection query joining the three tables —
which is exactly what `AppointmentResponse` already looks like.

**"How do you know one clinic cannot read another's data?"**
`AuthTests` proves it rather than asserting it: a token from one tenant asking for
another tenant's patient gets `404`, not `403` — to a caller from the wrong clinic the
record does not exist. The tenant is a claim inside a signed token, so there is nothing
in the request for a caller to edit.

**"Why does hiding the button not count as security?"**
It does not, and the system does not rely on it. Every endpoint carries `@PreAuthorize`
against the role claim; a receptionist calling the pharmacy queue gets `403` with the UI
untouched. The navigation filter is convenience.

**"Why `ddl-auto=validate` and Flyway rather than letting Hibernate manage the schema?"**
Because `update` fails quietly. Adding the `active` column to `app_users` could not add a
NOT NULL column to a populated table, so it silently did nothing and every account was
locked out until the column got an explicit default. A migration would have failed loudly
at deploy time. Now Hibernate only checks that the mapping still matches.

**"What happens if the finalize step fails halfway?"**
Nothing is written. `finalizeEncounter` is one `@Transactional` method covering the
encounter, the appointment, the patient's care status and both sets of orders, so a visit
is never half-closed. `ClinicalEncounterFlowTests` walks it over real HTTP.

**"Why is the prescription free text rather than dosage and frequency fields?"**
Because the pharmacy queue needed one row per medicine and the clinician needed to write
the way they already write. Splitting on line breaks at finalization gets both. Structured
dosage needs a drug catalogue, which is named as not built in [roadmap.md](roadmap.md) —
the same argument as pharmacy stock.

**"How does one deployment serve many hospitals?"**
Every row carries a tenant, every finder takes it, and the tenant travels as a signed
token claim so the caller cannot edit it. The platform console onboards a hospital, sets
its branding and picks the modules it has bought; login hands those back and the browser
filters its navigation with them. The administrator who runs the console has no tenant at
all, which is why the same test file can assert that they reach every console route and
no patient.

**"What would you do next?"**
Billing — hospitals are onboarded and subscribed, but nothing is priced or metered — and
the forgotten-password path, which needs email delivery. Both are in the roadmap with
the reasons.

**"What is the weakest part?"**
Account recovery. Staff can change their own password and an administrator can set a
colleague's, but a forgotten password still needs the administrator, because a reset link
means email delivery this system does not have. There is also no lockout after repeated
failures and no refresh token — an expired token means signing in again. All named in the
roadmap rather than hidden.
