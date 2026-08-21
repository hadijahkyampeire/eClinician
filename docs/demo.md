# Demo script — 15 minutes

All accounts use the password `demo1234` ([the list is in the README](../README.md#sign-in)).

**Three things to make sure they see:** the visit working end to end, a refusal that comes
from the server, and a second clinic onboarded live.

**Two patients are already in the clinic when you sign in**, so nothing starts from an
empty screen:

- **Grace Nabirye** — checked in this morning and sitting in the waiting room. She is the
  waiting-room count on the receptionist's dashboard.
- **Peter Ochieng** — been and gone, twice. Malaria six weeks ago, a follow-up three weeks
  ago: both visits finalized, three medicines dispensed, two tests resulted. He is the
  returning patient the demo follows.

## Act one — one visit, end to end

| # | As | Do | Say |
|---|---|---|---|
| 1 | **Receptionist** | Dashboard | The counts are live — Grace is already waiting, and the numbers move as we work |
| 2 | | Patients → Register patient | Country-neutral ID, phone validation, split address |
| 3 | | Appointments → Book appointment | Book the same doctor at the same time twice — the API refuses. Cancel the first and the slot frees |
| 4 | | Open **Peter Ochieng** | Two past visits on the record, with what was prescribed and what the lab found. This is a returning patient, not a blank form |
| 5 | | **Check in** | An appointment appears with no doctor: a walk-in never clashes. His history stays where it is |
| 6 | | Edit him | The government ID is greyed out — recorded once, at registration |
| 7 | | Type the URL `/pharmacy` | Bounced, and the API refuses it independently — not a hidden button |
| 8 | **Clinician** | Appointments → Start session | `WAITING → IN_SESSION`, and a `DRAFT` encounter is created — his third |
| 9 | | Records → the patient's history | Both earlier visits are in front of the clinician before they write a word — what was diagnosed, dispensed and resulted |
| 10 | | Document this visit | Vitals, symptoms, examination, diagnosis, plan. **Two medicines and two tests, one per line** |
| 11 | | Draft with AI | The model drafts the summary from the notes into a field I edit — the clinician signs the record |
| 12 | | Finalize | One transaction: visit completes, care status clears, four order rows are raised |
| 13 | **Lab Technician** | Laboratory | Both tests are waiting. Record a result on one, cancel the other with "no reagent" |
| 14 | **Clinician** | The patient's record | Three visits now, the newest with today's results on it — the review before the patient collects anything |
| 15 | **Pharmacist** | Pharmacy | One row per medicine. Dispense one, mark the other unavailable — "out of stock" |

If there is time, take **Grace** into session too — she has been waiting since this morning,
and the waiting-room count drops as she goes in.

## Act two — one deployment, many clinics

| # | As | Do | Say |
|---|---|---|---|
| 16 | **Hospital Administrator** | Staff → Add staff member | They sign in immediately; Deactivate locks them out just as fast |
| 17 | | Try to register a patient or dispense | `403` — an administrator runs the clinic, they do not do the clinical work |
| 18 | | Clinic → change the name and colour | Their own clinic's branding, theirs to set |
| 19 | **Platform Super Admin** | The console | Onboard **SWE Clinic** with its first administrator, and pick the modules they bought |
| 20 | | Sign in as that administrator | An empty clinic, their own name in the sidebar, only the modules they paid for |
| 21 | **Platform Super Admin** | Suspend that clinic | Its staff can no longer sign in, and no row of its data was touched |
| 22 | | Point at what this account cannot do | It holds no tenant: every clinical endpoint answers it `403` |

## Where each role stops

Every refusal comes from `@PreAuthorize` on the endpoint, not from a hidden button.

| Role | Does | Cannot |
|---|---|---|
| Receptionist | Registers patients, books, checks in, moves to waiting | No records, pharmacy, lab or staff. Clinical history reads "restricted for your role" |
| Clinician | Documents, prescribes, requests tests, finalizes, reads their patient's results | Cannot dispense or record a lab result — issuing and fulfilling are different jobs. Cannot manage accounts |
| Lab Technician | Works the lab queue: record a result, or cancel with a reason | Nothing else. `resultedBy` comes from the token |
| Pharmacist | Works the dispensing queue: dispensed, or unavailable with a reason | No records, no lab queue. `dispensedBy` comes from the token |
| Hospital Administrator | Manages staff accounts and clinic branding, reads every department | No clinical writes — all `403`. Another hospital's records `404`, the platform console `403` |
| Platform Super Admin | Onboards a clinic and its first administrator, sets modules, suspends and restores | Holds no tenant, so every clinical endpoint answers `403` |

## If they ask to see the API

Open [swagger-ui.html](https://eclinician-api.onrender.com/swagger-ui.html) — generated
from the controllers, so it cannot drift from what the code serves. Log in through
`POST /api/auth/login`, press **Authorize**, paste the token, call anything. Calling an
endpoint the role may not reach answers `403` in front of them.

## Proving isolation from the terminal

Swap `localhost:8080` for `https://eclinician-api.onrender.com` to run this live.

```bash
# No token
curl -s -o /dev/null -w '%{http_code}\n' localhost:8080/api/patients          # → 401

# Log in, then read with the token
TOKEN=$(curl -s -X POST localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"hkdoctor@hkclinics.com","password":"demo1234"}' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["token"])')
curl -s localhost:8080/api/patients -H "Authorization: Bearer $TOKEN" | head -c 300

# Claiming a tenant in a header
curl -s -o /dev/null -w '%{http_code}\n' localhost:8080/api/patients \
  -H 'X-Tenant-Id: hk-clinics'                                                # → 401

# A receptionist reaching for the pharmacy queue
curl -s -o /dev/null -w '%{http_code}\n' localhost:8080/api/pharmacy/prescriptions \
  -H "Authorization: Bearer $RECEPTION_TOKEN"                                 # → 403
```

Paste the token into [jwt.io](https://jwt.io) to show the `tenant` and `role` claims:
readable by anyone, changeable by nobody without the signing key.

## If the network fails

`docker compose up -d && make run` gives the same demo locally.
