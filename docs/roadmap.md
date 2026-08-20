# What is not built, and why

## Not built

| Not built | Why / what it needs |
|---|---|
| **Password reset** | Staff change their own password and an administrator can set a colleague's. The forgotten-password path needs email delivery — as do lockout after repeated failures and a refresh token. |
| **Pharmacy stock** | Dispensing works; inventory does not. "Unavailable" is a pharmacist's judgement, not a stock level. Needs a drug catalogue and quantity tracking. |
| **Structured lab results** | Results are free text. Values, units and reference ranges need a test catalogue — the same argument as pharmacy stock. |
| **Sequencing pharmacy behind the laboratory** | Finalizing raises both queues in one transaction, so nothing stops a medicine being dispensed before its tests come back. Enforcing it means a prescription that waits on the orders raised beside it. |
| **Billing** | Out of scope from the start ([vision.md §4](vision.md)): fees, insurance claims and the hospital subscriptions themselves are their own product. The console already records which modules a hospital bought, which is where pricing would attach. It would also need an accounts role of its own. |
| **Metering the drafted summaries** | Drafted on demand, with no per-clinic quota or usage record. Billing would need both. |
| **Per-doctor patient lists** | A clinician reads any patient in their own clinic. "Their patients" needs a doctor–patient assignment the system does not model. |
| **`NO_SHOW`** | The status exists in the enum; no SRS flow sets it, so nothing does. |

## Next, in order

1. **A test catalogue** — the shared answer to both pharmacy stock and structured lab results.
2. **Sequencing the pharmacy behind the laboratory.**
3. **Billing**, attached to the module subscriptions the console already records.

## The scope decision behind that list

Rather than five shallow modules, the clinical workflow was built all the way through — UI,
API, rules, database, tests, deployment — then pharmacy and lab were added on top as proof
the architecture is additive. The second module cost exactly what the first did: one
entity, one repository, two DTOs, one service, one controller, and a single line inside
`finalizeEncounter`. Nothing in the patient, appointment or encounter code changed.

## Already closed

| Was | Now |
|---|---|
| The code did not match four SRS use cases | Booking with conflict rules, cancellation, the write-once national ID, and reading orders back per patient |
| The hospital administrator could do clinical work | They read every department and change no clinical row |
| Onboarding created a hospital nobody could sign in to | The console creates the first administrator in the same transaction |
| Branding and modules were hardcoded in the frontend | `Tenant` is an entity; login answers with the hospital's own name, colour and modules |
| The platform admin landed on a placeholder | A console: live counts, onboarding, subscriptions, suspend and restore |
| The VOPC's `LLMService` was never built | Built behind a `SummaryDrafter` interface — OpenAI or Claude, chosen by whichever key is set |
| Hibernate managed the schema | Flyway owns it: foreign keys, the two SRS uniqueness rules as tenant-scoped indexes, and query indexes |
| The signing key was in the source | `JWT_SECRET` from the environment, or a random per-process key |
| Lab tiles counted encounter text while the queue read `lab_orders` | Both read `lab_orders` |

## Development history

Each phase was a branch and a reviewed pull request, so the work is bisectable.

| PR | What landed |
|---|---|
| #1–#3 | Backend foundation, patient management API, patient intake and the active-visit workflow |
| #4–#5 | Clinical encounter workflow; live dashboard counts and the deployment blueprint |
| #6–#8 | Backend reorganized by layer; pharmacy dispensing and its dashboard counts |
| #9–#10 | Lab results module; real accounts and JWT authentication |
| #11–#12 | Docs split out of the README; live deployment |
| #13–#15 | Per-role authorization; staff management and the SRS patient rules; the remaining SRS gaps |
| #16–#18 | Flyway migrations, the platform console, AI-drafted summaries, and the presentation docs |
