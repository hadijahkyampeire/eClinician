# Presentation guide

**Time budget:** 12 minutes of slides, 10–12 minutes of demo, 5–10 minutes of questions.
The demo itself, and where each artefact lives, are both in the
[README](../README.md#project-walkthrough); this page is the frame around them.

## Slide plan — 12 slides

| # | Slide | The one sentence that matters |
|---|---|---|
| 1 | Title | eClinician — a clinical management system for outpatient clinics |
| 2 | The problem | Paper records: the patient's history is wherever the file is |
| 3 | Vision and scope | One role-based platform; five roles, five modules, one tenant per clinic |
| 4 | Use-case model | Six use cases, five actors — the diagram from the SRS |
| 5 | Architecture | React SPA → REST API → PostgreSQL, tenant carried in a signed token |
| 6 | The data tier | The tables the architecture's data tier names, and the foreign keys the database enforces — written out in the Flyway migrations |
| 7 | The clinical workflow | Check in → waiting → in session → finalize, and what finalize raises |
| 8 | Design decision: one transaction | Finalization closes the visit and raises both queues, or does none of it |
| 9 | Design decision: multi-tenancy | The tenant is a token claim, not a header — the caller cannot edit it |
| 10 | Security | BCrypt, JWT, `@PreAuthorize`, no key in the source |
| 11 | Testing | What the tests prove, not how many there are |
| 12 | Specification vs implementation | Where the build differs from the SRS, and why — [as-built.md](as-built.md#as-built-specification-against-implementation) |

Leave slide 12 on screen during questions, so the "what differs and why" table is in front
of the examiner.

## Defence sheet

**"Why is there no role selector at login?"**
Letting a person pick their own role at the door is no security at all. The role is on the
account's `app_users` row; the API signs it into the token and enforces it per endpoint.

**"Why `UUID` instead of an auto-increment `Long`?"**
A sequential key would leak how many patients a clinic has and let one clinic guess
another's identifiers. The cost is a wider index and no natural ordering, so every listing
sorts on `created_at`.

**"Why are the relationships `UUID` columns rather than `@ManyToOne`?"**
So every query names the tenant explicitly and nothing loads by accident across the HTTP
boundary — a lazy association serialized in a controller is the classic source of N+1
queries and leaked data. The foreign keys are still there, in
`V2__referential_integrity_and_indexes.sql`; the object model just does not navigate them.

**"Is there an N+1 problem?"**
Yes, in one bounded place: listing appointments resolves each patient's and doctor's name
individually. Tens of queries for a clinic-sized list. The fix, if it grew, is a projection
query — which is what `AppointmentResponse` already looks like.

**"How do you know one clinic cannot read another's data?"**
`AuthTests` proves it: a token from one tenant asking for another's patient gets an empty
result — to that caller the record does not exist. The tenant is a claim in a signed token,
so there is nothing in the request to edit.

**"Why does hiding the button not count as security?"**
It does not, and nothing relies on it. Every endpoint carries `@PreAuthorize`; a
receptionist calling the pharmacy queue gets `403` with the UI untouched.

**"Why Flyway rather than `ddl-auto=update`?"**
Because `update` fails quietly. Adding a NOT NULL `active` column to a populated
`app_users` silently did nothing and locked everyone out. A migration fails loudly at
deploy time instead. Hibernate now only validates that the mapping still matches.

**"What if finalize fails halfway?"**
Nothing is written. `finalizeEncounter` is one `@Transactional` method covering the
encounter, the appointment, the care status and both sets of orders.
`ClinicalEncounterFlowTests` walks it over real HTTP.

**"Why is the prescription free text?"**
The pharmacy queue needs one row per medicine and the clinician needs to write the way they
already write; splitting on line breaks at finalization gets both. Structured dosage needs a
drug catalogue — named as not built in [roadmap.md](roadmap.md).

**"How does one deployment serve many hospitals?"**
Every row carries a tenant, every finder takes it, and it travels as a signed token claim.
The console onboards a hospital, sets its branding and the modules it bought; login hands
those back. The administrator who runs the console holds no tenant at all.

**"Why is the summarizer an interface rather than just an API call?"**
The vendor is the volatile part; the clinical rules are not. `SummaryDrafter` has one
method, and the two implementations — OpenAI and Claude — hold nothing but a wire format
each. Switching is an environment variable; with no key the feature reports itself off.

**"Isn't the AI writing the medical record?"**
No. It reads only what the clinician typed on that encounter and drafts into an editable
field; the clinician's name signs the record. The system prompt forbids adding any
diagnosis, medicine or finding the notes do not contain, and without a key the endpoint
answers `503` while the visit is documented exactly as before.

**"Why can the administrator see the pharmacy queue but not dispense from it?"**
Managing a clinic and practising in it are different jobs, and the audit trail says who
dispensed. `RoleAuthorizationTests` asserts both halves.

**"What is the weakest part?"**
Account recovery. A forgotten password still needs the administrator, because a reset link
means email delivery this system does not have, and there is no lockout after repeated
failures. Both named in [roadmap.md](roadmap.md) rather than hidden. Session *renewal* is
built — a rotating refresh token, stored only as a hash — but recovery is not.

**"What would you do next?"**
Billing — hospitals are onboarded and subscribed, but nothing is priced or metered — then
the forgotten-password path.
