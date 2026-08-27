# The SRS, as built

The requirements themselves are the analysis-phase SRS, written before any code:
**[eClinician-SRS.pdf](srs/eClinician-SRS.pdf)** (also as
[.docx](srs/eClinician-SRS.docx), with the
[requirements presentation](srs/eClinician-Requirements-Presentation.pptx) beside it).
That document is not repeated here.

This page is the part the PDF cannot contain, because it was written first: what the build
actually did with each use case, the non-functional requirements the code answers, and the
places the implementation ended up **stricter** than the specification.

---

## The use-case model

The diagram from the SRS, exported from
[eclinician-use-case.drawio](diagrams/use-case/eclinician-use-case.drawio). The actors'
responsibilities and the full step-by-step flows, preconditions and postconditions are in
the [SRS PDF](srs/eClinician-SRS.pdf).

![Use-case diagram](diagrams/use-case/eclinician-use-case.png)

---

## As-built: specification against implementation

Analysis came before any code; the implementation then made its own decisions. Both are
shown here rather than quietly reconciled.

| # | Use case | Built? | Where | Deviation from the SRS |
|---|---|---|---|---|
| 1 | Patient Management | ✅ Full CRUD | `PatientController` | Matches the specification, except that **a phone number is no longer unique on its own** — see below. A patient registered without a national ID may still have it filled in later — the field is unwritable, not permanently empty. |
| 2 | Appointment Management | ✅ Both models | `AppointmentController` | Scheduling as specified, plus the **arrival** model the clinic runs on: check in → waiting → in session → completed. "Cannot cancel an appointment that has taken place" is read as *has started or finished*. `NO_SHOW` stays unused — no SRS flow sets it. |
| 3 | Medical Record Management | ✅ Plus more | `EncounterController` | Called an **encounter**, and carries more than the SRS listed: vitals, chief complaint, examination notes, treatment plan. Adds **finalization** — the act that closes the visit and raises pharmacy and lab work. |
| 4 | Prescription Management | ✅ Reshaped | `PharmacyController` | Free text, one medicine per line, split into one order per line at finalization — not a form with dosage fields. Adds `UNAVAILABLE`, because a pharmacy that cannot supply a medicine still has to record that. |
| 5 | Laboratory Management | ✅ Reshaped | `LabController` | Same shape as prescriptions. "View results by patient" is built — the clinician reads them on the patient record, not through the technician's queue. Adds `CANCELLED` for a test that cannot be run. |
| 6 | User Management | ✅ Built, and narrowed | `StaffController` | **Deactivation rather than deletion**, so work an account recorded keeps its author. The administrator is narrower than the SRS implies: they read every department but change no clinical row. Authentication itself was added — the SRS assumed login without specifying it. |
| — | Role-permitted access | ✅ Built | `SecurityConfig` · `@PreAuthorize` | Enforced on the server: the role is a token claim and each endpoint names the roles it accepts. The one widened read is `/api/staff/clinicians` — a receptionist cannot book a doctor they cannot name. |
| — | `LLMService` (VOPC 1) | ✅ Built | `ClinicalSummaryService` | The external summarizer the consultation VOPC drew. It drafts into an editable field, so the record stays the clinician's, and the prompt forbids inventing a diagnosis, medicine or dose. No key committed; without one the endpoint answers `503`. |

### Requirement added during implementation

**Multi-tenancy.** The SRS describes one clinic. Every row and every query carries a
tenant, so one deployment serves many — the argument in the [vision document](vision/eClinician-Vision.pdf), proven by
`AuthTests`.

**A platform administrator above the six actors.** Selling to many hospitals needs somebody
who onboards them, sets what each bought, and can suspend one — without reading anyone's
clinical data. That account holds no tenant, which is what makes the second half true.

## Non-functional requirements

Not itemized in the SRS, but the implementation answers them explicitly.

| ID | Requirement | How it is met |
|---|---|---|
| NFR-1 | **Isolation** — one clinic's data unreachable by another | Tenant is a signed token claim; every repository finder takes `tenantId`; proven by `AuthTests` |
| NFR-2 | **Password security** | BCrypt hashes; the plain password is never stored or logged |
| NFR-3 | **Secret handling** | `JWT_SECRET` comes from the environment, generated per deployment |
| NFR-4 | **Consistency** — a visit must never be half-closed | Finalization is one `@Transactional` method |
| NFR-5 | **Referential integrity** (SRS business rule) | Orders carry `encounterId` and `patientId`; encounters carry `appointmentId` (unique) |
| NFR-6 | **Portability** | Docker Compose locally; a Render blueprint in the cloud |
| NFR-7 | **Testability** | Rules tested against in-memory H2, no database needed in CI |
| NFR-8 | **Maintainability** | Proven twice: pharmacy, then lab, each one line inside `finalizeEncounter` |
| NFR-9 | **Error clarity** | One `@RestControllerAdvice` maps 400/401/404/409 |

### Where the implementation is looser than the SRS, on purpose

**A phone number no longer identifies a patient; a name on a phone number does.** The SRS
made the number unique within a clinic. In practice a child is registered on their mother's
number and a husband on his wife's, so the rule refused the ordinary case and called it a
duplicate. What means "this person is already here" is the pair — this name, this number —
and that is what `ux_patients_tenant_name_phone` now enforces
(`V26__patient_identity_by_name_and_phone.sql`).

Anything looser than that is the receptionist's job. Asking whether the patient has been to
this clinic before is a better duplicate check than any column, and the national ID — which
really does identify one person — is still unique per clinic.

### Where the implementation is stricter than the SRS

- **A patient may hold only one open appointment at a time.** The SRS forbids only
  duplicates with the same doctor at the same time; the stricter rule is what makes
  check-in unambiguous, and cancellation is the way out of it.
- **The doctor conflict check keys on the exact instant**, not an overlapping window —
  appointments carry no duration, so an overlap has nothing to compute from.
