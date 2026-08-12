# What is not built, and what comes next

Named honestly, with the reason.

## Not built

| Not built | Why / what it needs |
|---|---|
| **Password self-service** | Accounts are real and signed in with, but there is no reset flow, no password change, no lockout after repeated failures, and no refresh token — when the 8-hour token expires you sign in again. |
| **Pharmacy stock** | Dispensing works; inventory does not. "Unavailable" is a pharmacist's judgement, not a stock level. Needs a drug catalogue and quantity tracking. |
| **Structured lab results** | A technician records a result, but as free text. Values, units and reference ranges need a test catalogue — the same argument as pharmacy stock. |
| **Staff management** | `app_users` rows exist and are seeded, but nothing in the UI creates or edits them — an administrator cannot yet add a nurse. |
| **Platform admin console** | Tenant onboarding, per-tenant module toggles, billing. The module-toggle plumbing already exists in the frontend; the console to drive it does not. |
| **Database migrations** | Hibernate generates the schema (`ddl-auto=update`). Flyway before anything resembling production. |

## The scope decision behind that list

Rather than build five shallow modules, I built the clinical workflow all the way
through — UI, API, business rules, database, tests, and deployment — then added pharmacy
dispensing and lab results on top of it as proof the architecture is additive.

Those two modules are the evidence, and the second cost exactly what the first did: one
entity, one repository, two DTOs, one service and one controller, plus a **single line**
inside `finalizeEncounter`. Nothing in the patient, appointment or encounter code changed
to accommodate either.

## What I would do next, in order

1. **Flyway migrations** — before any real data exists, and now with an `app_users`
   table holding password hashes, before anything I would hate to lose.
2. **Staff management** — an administrator adding accounts, on top of the entity that
   now exists.
3. **Lab tiles off `lab_orders`** — a small commit, the one the pharmacy tiles already had.
4. **Platform admin console** — turns the multi-tenant design into a product.
5. **A test catalogue** — the shared answer to both pharmacy stock and structured lab
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
