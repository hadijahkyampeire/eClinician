# Testing

```bash
make test        # or: cd backend && ./mvnw test
```

**60 tests, all green.** They run against in-memory H2, so CI needs no database, and they
point at the service layer where every rule lives.

## What each test proves

| Test class | Tests | What it establishes |
|---|---|---|
| `RoleAuthorizationTests` | 9 | A role may do only its own work — a receptionist cannot dispense, a pharmacist cannot register a patient or take one into session, pharmacy and lab cannot read each other's queues, an administrator reads every department and writes to none |
| `PatientRuleTests` | 6 | The SRS patient rules: no shared phone or national ID inside one clinic, the same number is fine in another clinic, an update does not collide with itself, a patient with visits cannot be deleted, and the national ID cannot be changed after registration |
| `PlatformConsoleTests` | 6 | The console is closed to a hospital administrator, the platform administrator cannot read a patient, onboarding decides what a hospital's staff see, an identifier cannot be reused, and suspending a hospital stops its staff signing in |
| `RefreshTokenTests` | 8 | A session can be continued without the password: signing in hands back both tokens, a refresh token buys a fresh pair and is spent doing so, a replayed token ends every session the account holds, signing out stops renewal, and a deactivated account cannot renew its way past being closed |
| `AuthTests` | 7 | Login, credential rejection, a closed API, tenant isolation, a clinician having no patient directory, and a user editing only their own profile — with a non-image rejected |
| `StaffManagementTests` | 4 | An administrator adds an account that can then sign in, deactivating it stops the login, an email is unique, and an administrator cannot deactivate themselves |
| `AppointmentSchedulingTests` | 3 | The SRS scheduling rules: one doctor cannot hold two appointments at a time, cancelling frees the slot, and a visit that has taken place cannot be cancelled |
| `PasswordChangeTests` | 3 | The owner changes their own password and signs in with it, the current password is required, and the new one must differ |
| `SummaryDraftingTests` | 3 | Without a key the summarizer reports itself off rather than failing, and an empty encounter is refused before anything would be sent — no test calls a model API |
| `EncounterServiceTests` | 2 | A draft finalizes and completes its visit; finalization is refused without a diagnosis and plan, and a finalized record is locked |
| `ClinicalEncounterFlowTests` | 1 | The whole loop over HTTP: log in → check in → start session → document → finalize → result the lab order |
| `AppointmentServiceTests` | 2 | Completing a visit clears the patient's care status while the appointment history survives |
| `StaleCheckInTests` | 3 | A check-in left open overnight is settled as a no-show rather than blocking the patient forever: it frees them, it stops blocking today's booking, and arriving again today starts a fresh visit |
| `ClinicianAvailabilityTests` | 2 | Published weekly hours drive the receptionist's dropdown for that hospital only, and a shift cannot end before it starts |
| `BackendApplicationTests` | 1 | The Spring context loads — every bean wires |

## The three worth showing

**Isolation** — `AuthTests`. One clinic saves a patient; a *valid* token from another
clinic asks for the patient list and gets an empty one. Not a `403`: to that caller the
record does not exist, and there is no header left to lie in.

```java
patients.save(patient("theirs-hospital"));

mvc.perform(get("/api/patients")
                .header("Authorization", accounts.bearerFor("ours-hospital")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content").isEmpty());
```

**Role enforcement** — `RoleAuthorizationTests`. Every rule asserted against the API, not
the UI:

```java
mvc.perform(post("/api/pharmacy/prescriptions/{id}", UUID.randomUUID())
                .header("Authorization", accounts.bearerFor(TENANT, UserRole.RECEPTIONIST))
                .content("{\"status\":\"DISPENSED\"}"))
        .andExpect(status().isForbidden());
```

**The full loop** — `ClinicalEncounterFlowTests`. One test walks the whole workflow over
real HTTP, asserting at each step: `CHECKED_IN`, then `IN_SESSION`; the encounter created
`DRAFT`; finalizing returns `FINALIZED`; the appointment `COMPLETED`; the requested test
waiting in the lab queue as its own row. It sends no tenant anywhere — the token carries
it — and uses three tokens, one per role, because the server refuses to let a receptionist
do the clinician's work. The assertion on `resultedBy` proves the audit trail comes from
the technician's token, not the request body.

## Kinds of case covered

| Kind | Example |
|---|---|
| Normal | A draft with diagnosis and plan finalizes and completes the visit |
| Boundary | A lab order cannot be completed with an empty result |
| Error | Checking in a patient who already has an active visit → `409` |
| Security | No token → `401`; wrong password → `401`; wrong tenant → empty; wrong role → `403` |

## Why the tests do not run the migrations

Production runs Flyway against PostgreSQL; the tests run Hibernate's generated schema
against H2, with `spring.flyway.enabled=false`. The migrations are Postgres SQL — partial
unique indexes, `lower(national_id)` — and rewriting them for H2 would mean testing a
schema that is not the one deployed. Instead `ddl-auto=validate` fails startup if the
entities and the migrations have drifted.

## Frontend checks

```bash
cd frontend && npx tsc --noEmit   # types, including the API contract mirrors
npm run lint
npm run build
```

The interfaces in `src/types/` mirror the API's response records, so a backend field rename
the frontend has not followed fails the typecheck rather than the demo.

## Not tested

- No frontend unit tests. The typecheck and the end-to-end backend flow carry the weight.
- No load or performance testing.
- Mockito is a dependency but unused: the service tests run against a real in-memory
  database, which catches JPA mapping mistakes that mocks would hide.
