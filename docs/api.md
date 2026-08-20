# API Reference

Every endpoint except `/api/health` and `/api/auth/login` requires an
`Authorization: Bearer <jwt>` header. The tenant is read from the token, so no request
ever names one.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | Liveness probe (used by Render) — open |
| `POST` | `/api/auth/login` | Email + password → a signed token carrying the tenant, plus that hospital's branding and modules — open |
| `POST` | `/api/auth/password` | Change your own password; the current one is required |
| `GET` | `/api/patients` | Paged list — search, filter, sort |
| `POST` `PUT` `DELETE` | `/api/patients` `/{id}` | Register, update, remove |
| `GET` | `/api/appointments` | List, optionally by patient |
| `POST` | `/api/appointments` | Book a patient with a doctor at a date and time |
| `PUT` | `/api/appointments/{id}` | Reschedule — the conflict rules are re-checked |
| `POST` | `/api/appointments/{id}/cancel` | Cancel a visit that has not started |
| `POST` | `/api/appointments/check-in` | Register arrival → `CHECKED_IN` |
| `POST` | `/api/appointments/{id}/waiting` | Move to the waiting room |
| `POST` | `/api/appointments/patients/{id}/start-session` | Clinician takes the patient |
| `POST` | `/api/appointments/{id}/complete` | Close the visit |
| `GET` `POST` `PUT` | `/api/encounters` `/{id}` | Read and document the encounter |
| `POST` | `/api/encounters/{id}/summary` | Draft this visit's summary from its notes — `503` when no summarizer key is configured |
| `GET` `PUT` | `/api/clinic` | The signed-in user's own clinic; the administrator changes its name and colour |
| `POST` | `/api/encounters/{id}/finalize` | Sign off — completes the visit and raises the prescription and lab orders |
| `GET` | `/api/pharmacy/prescriptions` | The dispensing queue, filterable by `?status=` |
| `GET` | `/api/pharmacy/prescriptions/patients/{id}` | One patient's prescriptions, for the clinician who issued them |
| `POST` | `/api/pharmacy/prescriptions/{id}` | Dispense a medicine, or mark it unavailable with a reason |
| `GET` | `/api/lab/orders` | The lab queue, filterable by `?status=` |
| `GET` | `/api/lab/orders/patients/{id}` | One patient's lab results, for their clinician |
| `POST` | `/api/lab/orders/{id}` | Record a result, or cancel a test with a reason |
| `GET` | `/api/staff` | Staff accounts for this clinic |
| `GET` | `/api/staff/clinicians` | Active clinicians, for the booking form |
| `POST` `PUT` | `/api/staff` `/{id}` | Add a colleague, or change their name, role or password |
| `POST` | `/api/staff/{id}/active` | Deactivate or restore an account |
| `GET` | `/api/stats/dashboard` | 15 live counts behind the role dashboards |
| `GET` | `/api/platform/stats` | Hospitals, active hospitals, platform users |
| `GET` `POST` `PUT` | `/api/platform/hospitals` `/{id}` | Onboard a hospital, rename it, change its subscription |
| `POST` | `/api/platform/hospitals/{id}/active` | Suspend or restore a hospital |

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
  -d '{"email":"hkdoctor@hkclinics.com","password":"demo1234"}' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["token"])')

# Read patients
curl -s localhost:8080/api/patients -H "Authorization: Bearer $TOKEN"

# Book an appointment (409 if that doctor's slot is taken)
curl -s -X POST localhost:8080/api/appointments \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"patientId":"<uuid>","doctorId":"<uuid>","scheduledAt":"2026-09-01T09:00:00Z","reason":"Review"}'

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
| `POST` `PUT` `DELETE /api/patients` | Receptionist |
| `POST` `PUT /api/appointments`, `/{id}/cancel`, `/check-in`, `/{id}/waiting` | Receptionist |
| `POST /api/appointments/.../start-session`, `/{id}/complete` | Clinician |
| `POST` `PUT /api/encounters`, `/{id}/finalize`, `/{id}/summary` | Clinician |
| `GET /api/pharmacy/prescriptions` | Pharmacist · Administrator (oversight: reads the queue, cannot dispense) |
| `POST /api/pharmacy/prescriptions/{id}` | Pharmacist |
| `GET /api/lab/orders` | Lab Technician · Administrator |
| `POST /api/lab/orders/{id}` | Lab Technician |
| `PUT /api/clinic` | Administrator, for their own clinic only |
| `GET /api/pharmacy/prescriptions/patients/{id}` | Clinician · Pharmacist · Administrator |
| `GET /api/lab/orders/patients/{id}` | Clinician · Lab Technician · Administrator |
| `GET /api/staff/clinicians` | Receptionist · Clinician · Administrator |
| Everything else under `/api/staff` | Administrator |
| Everything under `/api/platform` | Platform administrator only — and they hold no tenant, so every clinical endpoint answers them `403` |
| `POST /api/auth/password` | Any signed-in staff member, for their own account only |
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
| Lab Technician | Laboratory | Pending tests · Resulted today · Cancelled · Finalized today |

Every tile now counts the same table its screen reads: the pharmacy tiles from
`prescription_orders`, the laboratory tiles from `lab_orders`. A tile and the queue below
it can no longer disagree.
