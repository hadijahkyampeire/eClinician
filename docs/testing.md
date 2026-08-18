# Testing

```bash
make test        # or: cd backend && ./mvnw test
```

**25 tests, all green.** They run against in-memory H2, so no database is needed in CI,
and they point at the service layer — where every rule lives.

```
Tests run: 25, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

## What each test proves

| Test class | Tests | What it establishes |
|---|---|---|
| `AppointmentServiceTests` | 1 | Completing a visit clears the patient's active care status while the appointment history survives — the two status fields do different jobs |
| `EncounterServiceTests` | 2 | A draft finalizes and completes its visit; finalization is refused without a diagnosis and plan, and a finalized record is locked |
| `ClinicalEncounterFlowTests` | 1 | The whole loop through HTTP: log in → check in → start session → document → finalize → result the lab order |
| `AuthTests` | 4 | Login, credential rejection, a closed API, and tenant isolation |
| `StaffManagementTests` | 4 | An administrator adds an account that can then sign in, deactivating it stops the login, an email is unique, and an administrator cannot deactivate themselves |
| `PatientRuleTests` | 6 | The SRS rules: no shared phone or national ID inside one clinic, the same number is fine in another clinic, updating a patient does not collide with itself, a patient with visits cannot be deleted, and the national ID cannot be changed after registration |
| `AppointmentSchedulingTests` | 3 | The SRS scheduling rules: one doctor cannot hold two appointments at a time, cancelling frees the slot, and a visit that has already taken place cannot be cancelled |
| `RoleAuthorizationTests` | 7 | A role may do only its own work — a receptionist cannot dispense, a pharmacist cannot take a patient into session or register one, pharmacy and lab cannot read each other's queues, an administrator may act for every department |
| `BackendApplicationTests` | 1 | The Spring context loads — every bean wires |

## The two that matter most

**Isolation** (`AuthTests.oneHospitalCannotReadAnothersPatients`). One clinic saves a
patient; a *valid* token belonging to another clinic asks for the patient list and gets
an empty one. Not a 403 — an empty result, because to that caller the record does not
exist. There is no header left to lie in.

```java
patients.save(patient("theirs-hospital"));

mvc.perform(get("/api/patients")
                .header("Authorization", accounts.bearerFor("ours-hospital")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content").isEmpty());
```

**Role enforcement** (`RoleAuthorizationTests`). Hiding a button is not security, so
each rule is asserted against the API itself:

```java
mvc.perform(post("/api/pharmacy/prescriptions/{id}", UUID.randomUUID())
                .header("Authorization", accounts.bearerFor(TENANT, UserRole.RECEPTIONIST))
                .content("{\"status\":\"DISPENSED\"}"))
        .andExpect(status().isForbidden());
```

**The full loop** (`ClinicalEncounterFlowTests`). One test walks the entire clinical
workflow over real HTTP with a real token, asserting at each step: the appointment
reaches `CHECKED_IN`, then `IN_SESSION`; the encounter is created `DRAFT`; finalizing
returns `FINALIZED`; the appointment is `COMPLETED`; and the test the clinician
requested is waiting in the lab queue as its own row, ready to be resulted.

It sends no tenant anywhere — the token carries it — and it now uses **three** tokens,
one per role, because the server refuses to let a receptionist do the clinician's work.
The assertion on `resultedBy` proves the audit trail comes from the technician's token
rather than from the request body.

## Types of case covered

| Kind | Example |
|---|---|
| Normal | A draft with diagnosis and plan finalizes and completes the visit |
| Boundary | A lab order cannot be completed with an empty result |
| Error | Checking in a patient who already has an active visit → `409` |
| Security | No token → `401`; wrong password → `401`; wrong tenant → empty; wrong role → `403` |

## Why the tests do not run the migrations

Production runs Flyway against PostgreSQL; the tests run Hibernate's generated schema
against in-memory H2, with `spring.flyway.enabled=false`. The migrations are Postgres
SQL — partial unique indexes and `lower(national_id)` among them — and rewriting them to
H2's dialect would mean testing against a schema that is not the one deployed. The
schema the migrations produce is instead verified where it matters: `ddl-auto=validate`
fails the application's startup if the entities and the migrations have drifted.

## Frontend checks

```bash
cd frontend && npx tsc --noEmit   # types, including the API contract mirrors
npm run lint                      # ESLint
npm run build                     # production build
```

The TypeScript interfaces in `src/types/` mirror the API's response records, so a
backend field rename that the frontend has not followed fails the typecheck rather than
the demo.

## Manual verification of the security work

Run against a real Postgres, not H2:

```bash
curl -s -o /dev/null -w '%{http_code}\n' localhost:8080/api/patients        # 401
curl -s -X POST localhost:8080/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"sjenkins@stmarys.eclinician.com","password":"wrong"}'       # 401
curl -s -o /dev/null -w '%{http_code}\n' localhost:8080/api/patients \
  -H 'X-Tenant-Id: sample-hospital'                                          # 401
```

The last one is the old attack: naming a tenant in a header now gets you nothing.

## Not tested

- No frontend unit tests (React Testing Library). The typecheck and the end-to-end
  backend flow carry the weight instead.
- No load or performance testing.
- Mockito is a dependency but unused: the service tests run against a real (in-memory)
  database, which catches JPA mapping mistakes that mocks would hide.
