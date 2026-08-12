# API Reference

Every endpoint except `/api/health` and `/api/auth/login` requires an
`Authorization: Bearer <jwt>` header. The tenant is read from the token, so no request
ever names one.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | Liveness probe (used by Render) — open |
| `POST` | `/api/auth/login` | Email + password → a signed token carrying the tenant — open |
| `GET` | `/api/patients` | Paged list — search, filter, sort |
| `POST` `PUT` `DELETE` | `/api/patients` `/{id}` | Register, update, remove |
| `GET` | `/api/appointments` | List, optionally by patient |
| `POST` | `/api/appointments/check-in` | Register arrival → `CHECKED_IN` |
| `POST` | `/api/appointments/{id}/waiting` | Move to the waiting room |
| `POST` | `/api/appointments/patients/{id}/start-session` | Clinician takes the patient |
| `POST` | `/api/appointments/{id}/complete` | Close the visit |
| `GET` `POST` `PUT` | `/api/encounters` `/{id}` | Read and document the encounter |
| `POST` | `/api/encounters/{id}/finalize` | Sign off — completes the visit and raises the prescription and lab orders |
| `GET` | `/api/pharmacy/prescriptions` | The dispensing queue, filterable by `?status=` |
| `POST` | `/api/pharmacy/prescriptions/{id}` | Dispense a medicine, or mark it unavailable with a reason |
| `GET` | `/api/lab/orders` | The lab queue, filterable by `?status=` |
| `POST` | `/api/lab/orders/{id}` | Record a result, or cancel a test with a reason |
| `GET` | `/api/stats/dashboard` | 13 live counts behind the role dashboards |

## Errors

One `@RestControllerAdvice` normalizes every failure:

| Status | When | Body |
|---|---|---|
| `400` | Validation failed on a request body | `{ "<field>": "<message>" }` per invalid field |
| `401` | Bad login, or a missing, expired or tampered token | `{ "message": "Invalid email or password" }` |
| `403` | The caller's role may not perform this action, or the token carries no tenant (platform admin) | Spring's default |
| `404` | No such record *for this tenant* | `{ "message": "..." }` |
| `409` | A workflow rule was violated | `{ "message": "This medicine has already been dispensed" }` |

A `404` rather than a `403` for another tenant's record is deliberate: to a caller from
the wrong clinic, the record does not exist.

## Examples

```bash
# Log in
TOKEN=$(curl -s -X POST localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"sjenkins@stmarys.eclinician.com","password":"demo1234"}' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["token"])')

# Read patients
curl -s localhost:8080/api/patients -H "Authorization: Bearer $TOKEN"

# Check a patient in
curl -s -X POST localhost:8080/api/appointments/check-in \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"patientId":"<uuid>","reason":"Fever"}'

# Work the pharmacy queue
curl -s "localhost:8080/api/pharmacy/prescriptions?status=PENDING" \
  -H "Authorization: Bearer $TOKEN"

curl -s -X POST localhost:8080/api/pharmacy/prescriptions/<uuid> \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"status":"DISPENSED","pharmacistName":"John Etyang","notes":""}'

# Record a lab result
curl -s -X POST localhost:8080/api/lab/orders/<uuid> \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"status":"COMPLETED","technicianName":"Peter Ssali","result":"Positive"}'
```

## Who may call what

Enforced on the server with `@PreAuthorize` against the `role` claim — not merely hidden
in the UI. Anything not listed is open to any authenticated member of the tenant.

| Endpoint | Allowed roles |
|---|---|
| `POST` `PUT` `DELETE /api/patients` | Receptionist · Administrator |
| `POST /api/appointments`, `/check-in`, `/{id}/waiting` | Receptionist · Administrator |
| `POST /api/appointments/.../start-session`, `/{id}/complete` | Clinician · Administrator |
| `POST` `PUT /api/encounters`, `/{id}/finalize` | Clinician · Administrator |
| `GET` `POST /api/pharmacy/prescriptions` | Pharmacist · Administrator |
| `GET` `POST /api/lab/orders` | Lab Technician · Administrator |
| `GET /api/patients`, `/api/appointments`, `/api/encounters`, `/api/stats/dashboard` | Any signed-in staff member of the tenant |

Audit fields are never accepted from the client: `dispensedBy`, `resultedBy` and
`clinicianName` are stamped from the caller's token, so no request can record work under
someone else's name.

## Roles and dashboards

One dashboard route renders a different view per role, driven by a lookup table rather
than branching. Navigation is filtered twice — by role, and by the modules the tenant
subscribes to.

| Role | Sees | Dashboard tiles |
|---|---|---|
| Administrator | Everything | Total patients · Appointments today · Open encounters · Clinicians documenting |
| Clinician | Patients, appointments, records | Waiting now · In session · Open encounters · Finalized today |
| Receptionist | Patients, appointments | Checked in · Waiting · Appointments today · Registered today |
| Pharmacist | Pharmacy | Pending · Dispensed today · Unavailable · Finalized today |
| Lab Technician | Laboratory | Lab requests raised · Finalized today · In session · Waiting |

The lab tiles still count encounters carrying lab request text rather than the
`lab_orders` rows behind the queue — the same follow-up the pharmacy tiles already had.
