# What is not built, and why

## Not built

| Not built | Why / what it needs |
|---|---|
| **Password reset** | Staff change their own password and an administrator can set a colleague's. The forgotten-password path needs email delivery, which this system has no way to send; lockout after repeated failures is missing for the same reason. Session renewal *is* built — a rotating refresh token, stored only as a hash. |
| **Pharmacy stock** | Dispensing works; inventory does not. "Unavailable" is a pharmacist's judgement, not a stock level. Needs a drug catalogue and quantity tracking. |
| **Structured lab results** | Results are free text. Values, units and reference ranges need a test catalogue — the same argument as pharmacy stock. |
| **Sequencing pharmacy behind the laboratory** | Finalizing raises both queues in one transaction, so nothing stops a medicine being dispensed before its tests come back. Enforcing it means a prescription that waits on the orders raised beside it. |
| **Billing** | Out of scope from the start (see the [vision document](vision/eClinician-Vision.pdf)): fees, insurance claims and the hospital subscriptions themselves are their own product. The console already records which modules a hospital bought, which is where pricing would attach. It would also need an accounts role of its own. |
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
