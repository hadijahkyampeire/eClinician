# What is not built, and what comes next

Named honestly, with the reason.

## Not built

| Not built | Why / what it needs |
|---|---|
| **Password reset** | Staff can change their own password, and an administrator can set a colleague's. What is missing is the forgotten-password path — it needs email delivery — plus lockout after repeated failures and a refresh token. |
| **Pharmacy stock** | Dispensing works; inventory does not. "Unavailable" is a pharmacist's judgement, not a stock level. Needs a drug catalogue and quantity tracking. |
| **Structured lab results** | A technician records a result, but as free text. Values, units and reference ranges need a test catalogue — the same argument as pharmacy stock. |
| **Per-doctor patient lists** | A clinician reads any patient in their own clinic. The SRS phrase "their patients" needs a doctor-patient assignment the system does not model. |
| **`NO_SHOW`** | The status exists in the enum; no SRS flow sets it, so nothing does. |
| **Billing** | Out of scope from the start ([vision.md §4](vision.md)): consultation fees, insurance claims and the hospital subscriptions themselves are their own product. The console already records which modules a hospital bought, which is where pricing would attach. |
| **Metering the drafted summaries** | Summaries are drafted on demand with no per-clinic quota or usage record. Billing would need both, and the console is where they would attach. |
| **Sequencing pharmacy behind the laboratory** | Finalizing raises the pharmacy and laboratory work in the same transaction, so nothing stops a medicine being dispensed before its tests come back. Clinically the pharmacy is the last stop; enforcing that means a prescription that waits on the orders raised beside it. |


## Closed in the SRS-conformance pass

The four places where the code did not yet match the SRS document are now closed:

| Use case | What landed |
|---|---|
| 1.2 | The national ID is written once, at registration; changing it is a `409` |
| 2 | Booking with a doctor, date and time, with both conflict rules, plus update and cancel |
| 4.1 | A clinician reads their patient's prescriptions on the patient record |
| 5.3 | A clinician reads their patient's lab results the same way |

## Closed in the demo pass

| Was | Now |
|---|---|
| The hospital administrator could register patients, dispense, result tests and document encounters | They read every department and change no clinical row; staff accounts and their clinic's branding are theirs |
| Onboarding created a hospital nobody could sign in to | The console creates the hospital's first administrator in the same transaction, and that person hires the rest |
| A clinic's name and colour could only be changed by editing the frontend | The administrator changes them from Clinic settings, and the sidebar reads "HK CLINIC · <clinic>" |
| The VOPC's `LLMService` was documented as never built | Built behind a `SummaryDrafter` interface — OpenAI or Claude, chosen by whichever key the deployment sets — drafting into a field the clinician edits and signs |

## Closed in the completion pass

| Was | Now |
|---|---|
| The platform admin landed on a placeholder with three zeros and a TODO | A console: live counts, hospital onboarding, per-hospital module subscriptions, suspend and restore |
| A tenant was a string on every row; branding and modules were hardcoded in `demoUsers.ts` | `Tenant` is an entity; login answers with the hospital's own name, colour and modules |
| The Lab Technician's tile counted encounter text while the queue beside it read `lab_orders` | Both read `lab_orders` |
| No password change | Staff change their own, current password required |

And against the presentation rubric:

| Rubric criterion | What landed |
|---|---|
| 7 — entity and database design | Flyway owns the schema; foreign keys, the two SRS uniqueness rules as tenant-scoped unique indexes, and indexes for the queue and conflict queries |
| 12 — security | No signing key in the source at all; `JWT_SECRET` or a random per-process key |
| 3 — architecture and UML | Booking sequence and appointment state diagrams; the ERD carries `doctor_id` and the foreign keys |

## The scope decision behind that list

Rather than build five shallow modules, I built the clinical workflow all the way
through — UI, API, business rules, database, tests, and deployment — then added pharmacy
dispensing and lab results on top of it as proof the architecture is additive.

Those two modules are the evidence, and the second cost exactly what the first did: one
entity, one repository, two DTOs, one service and one controller, plus a **single line**
inside `finalizeEncounter`. Nothing in the patient, appointment or encounter code changed
to accommodate either.

## What I would do next, in order

1. **Lab tiles off `lab_orders`** — a small commit, the one the pharmacy tiles already had.
2. **Platform admin console** — turns the multi-tenant design into a product. The
   blocker underneath it: a tenant is a string column, not a row, and the branding and
   module toggles the frontend reads still live in `demoUsers.ts`.
3. **A test catalogue** — the shared answer to both pharmacy stock and structured lab
   results.

## Development history

Each phase was a branch and a reviewed pull request, so the work is bisectable:

| PR | What landed |
|---|---|
| #1 | Backend foundation — Postgres, datasource, CORS |
| #2 | Patient management API |
| #3 | Patient intake, details, filters, active appointment workflow |
| #4 | Clinical encounter workflow |
| #5 | Live dashboard counts and the deployment blueprint |
| #6 | Backend reorganized by layer; pharmacy dispensing |
| #7 | Pharmacy dashboard counts from prescription orders |
| #8 | README brought up to date with the pharmacy |
| #9 | Lab results module |
| #10 | Real accounts and JWT authentication |
| #11 | Docs split out of the README; analysis documents brought into the repo |
| #12 | Live deployment linked |
| #13 | Per-role authorization enforced on the API |
| #14 | Staff management, plus the two patient business rules from the SRS |
| #15 | The remaining SRS gaps: booking, cancellation, the unwritable national ID, and reading orders back per patient |
