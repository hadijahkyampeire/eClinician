# Testing

```bash
make test        # or: cd backend && ./mvnw test
```

**9 tests, all green.** They run against in-memory H2, so no database is needed in CI,
and they point at the service layer — where every rule lives.

```
Tests run: 9, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

## What each test proves

| Test class | Tests | What it establishes |
|---|---|---|
| `AppointmentServiceTests` | 1 | Completing a visit clears the patient's active care status while the appointment history survives — the two status fields do different jobs |
| `EncounterServiceTests` | 2 | A draft finalizes and completes its visit; finalization is refused without a diagnosis and plan, and a finalized record is locked |
| `ClinicalEncounterFlowTests` | 1 | The whole loop through HTTP: log in → check in → start session → document → finalize → result the lab order |
| `AuthTests` | 4 | Login, credential rejection, a closed API, and tenant isolation |
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

**The full loop** (`ClinicalEncounterFlowTests`). One test walks the entire clinical
workflow over real HTTP with a real token, asserting at each step: the appointment
reaches `CHECKED_IN`, then `IN_SESSION`; the encounter is created `DRAFT`; finalizing
returns `FINALIZED`; the appointment is `COMPLETED`; and the test the clinician
requested is waiting in the lab queue as its own row, ready to be resulted.

It sends no tenant anywhere. The token carries it.

## Types of case covered

| Kind | Example |
|---|---|
| Normal | A draft with diagnosis and plan finalizes and completes the visit |
| Boundary | A lab order cannot be completed with an empty result |
| Error | Checking in a patient who already has an active visit → `409` |
| Security | No token → `401`; wrong password → `401`; wrong tenant → empty |

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
