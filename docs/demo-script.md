# Demo script

The detailed runbook the [README](../README.md) points at: every use case, role by role, in
the order that tells one story — a patient registered, seen, tested, dispensed to. Take a
single role on its own to answer "show me what a pharmacist does".

Password for every account: **`demo1234`**.

## Receptionist — `hkreceptionist@hkclinics.com`

The front desk owns everyone who is not yet with a clinician.

1. **Register a patient** — Patients → *Add patient*. Country-neutral government ID, phone
   validated against the chosen country, address split into line, city, district, state,
   country.
2. **Find a patient** — search by name or phone, or open *Filters* for sex, country, date
   of birth range, enrolment range, care status and national ID.
3. **Open a patient** — demographics, contact, and the appointment history. Clinical
   history is not on this page for this role, and the API refuses it too.
4. **Check a patient in** — from the patient row, the patient page, or the dashboard. Ask
   whether they prefer the general practitioner, dentist, pediatrician, optometrist, or
   obstetrician/gynecologist; the page assigns that clinician as it records
   `SCHEDULED → CHECKED_IN`.
5. **Take them to the waiting room** — the hourglass action on the queue row, or the same
   action on the dashboard's *In the clinic now* panel. `CHECKED_IN → WAITING`.
6. **Book, edit and cancel appointments** — book the same doctor at the same time twice and
   the API refuses it; cancel the first and the slot frees.
7. **Look back** — the dashboard's appointment table opens on today, arrivals included.
   Switch it to *Last 30 days*, or type a date, and every past visit is there with the
   patient's name a link into their file.
8. **Be refused** — type `/records` or `/pharmacy` in the URL bar. The nav item is not
   merely hidden: the API returns 403 on its own.

*Available to every role:* change your own password from the sidebar.

## Clinician — `hkdoctor@hkclinics.com`

1. **See who is waiting** — patients assigned to this clinician, longest-wait-first, plus
   unassigned walk-ins any available clinician may claim.
2. **Start a session** — `WAITING → IN_SESSION`, and a `DRAFT` encounter is opened.
3. **Document the visit** — vitals (blood pressure, temperature, pulse, weight), symptoms
   and history, examination notes, diagnosis, treatment plan.
4. **Raise orders** — prescriptions and lab requests, one per line. These become the
   pharmacy and lab queues.
5. **Draft the summary with AI** — the model drafts from the notes into a field the
   clinician then edits. The clinician signs the record, not the model.
6. **Save a draft and come back** — unfinished notes are a panel on the dashboard with
   *Continue* on each row.
7. **Finalize** — one transaction: the encounter completes, the patient's care status
   clears, and every prescription and lab line becomes a queue row. The record is read-only
   afterwards.
8. **Review results** — reopen the patient after the lab has resulted, with every past
   visit in front of you.
9. **Look back** — the visits *you* documented, over any period; *Open* reads the whole
   record back.

## Lab Technician — `hklabtech@hkclinics.com`

1. **Work the queue** — Lab Results, filtered *Pending / Completed / Cancelled / All*.
2. **Record a result** — `PENDING → COMPLETED`, and it appears on the clinician's copy of
   the record.
3. **Cancel a test with a reason** — "no reagent". `PENDING → CANCELLED`; the reason is
   stored, not discarded.
4. **The dashboard** — pending, resulted today, cancelled, the pending list, and a
   look-back over every test asked of the laboratory.

This role sees no patient list and no records — only the tests asked of it. The look-back
names the patient but does not link to them, because the API would refuse the click.

## Pharmacist — `hkpharmacy@hkclinics.com`

1. **Work the queue** — Pharmacy, filtered *Pending / Dispensed / Unavailable / All*. A row
   appears the moment a clinician finalizes.
2. **Dispense** — `PENDING → DISPENSED`.
3. **Mark unavailable with a reason** — "out of stock". `PENDING → UNAVAILABLE`.
4. **The dashboard** — pending, dispensed today, unavailable, the queue itself, and a
   look-back over every prescription raised.

## Hospital Administrator — `hkadmin@hkclinics.com`

Runs one hospital. Sees the work, does not do the clinical work.

1. **Add a staff member** — Staff → *Add staff member*: name, email, role, first password.
   They can sign in immediately.
2. **Deactivate an account** — the row toggles. Their data stays; their sign-in stops. You
   cannot deactivate yourself.
3. **Rename the clinic and change its colour** — Clinic settings. The colour takes effect
   the next time staff sign in.
4. **See the subscription** — the modules this hospital bought, read-only. Only the
   platform team changes them.
5. **Oversight** — totals across the facility, who is in the clinic, and unfinished notes
   across every clinician, read-only.

## Platform Super Admin — `root@eclinician.com`

A separate console at `/platform`, with no patient data on it at all — the person who runs
the platform cannot read anyone's medical record.

1. **Onboard a hospital** — *Onboard hospital*, then sign in as the administrator it made.
   See [Onboarding a new clinic](#onboarding-a-new-clinic) below.
2. **Turn a module off** — uncheck Pharmacy, and that hospital's pharmacist loses the nav
   item *and* the endpoint.
3. **Suspend a hospital** — its staff can no longer sign in; every row it owns is kept.
4. **Edit a hospital** — name, colour and modules. The identifier stays greyed out.

## Onboarding a new clinic

One deployment serves many hospitals, and adding one is a form — no deploy, no migration,
no configuration file.

| The console asks for | What it decides |
|---|---|
| **Name** | Sits beside the HK CLINIC mark for that hospital's staff |
| **Identifier** | Written into every row the hospital will ever own, so it is permanent and cannot be edited afterwards |
| **Brand colour** | Mixed into the accent every screen is drawn with |
| **Subscription** | Which of Patients, Appointments, Records, Pharmacy and Laboratory they bought — a module they did not buy has no nav item *and* no endpoint |
| **First administrator** | Name, email, password |

The hospital and its first administrator are created in **one transaction**
([`TenantService.create`](../backend/src/main/java/com/eclinician/services/TenantService.java)):
a hospital nobody can sign in to would be worse than no hospital.

Then log out and sign back in as that administrator — an empty clinic wearing their colour,
their name beside the mark, and only the modules they paid for in the sidebar. The colour is
read from the session, so one changed later in Clinic settings shows on the *next* sign-in.

What does **not** change is the product: the mark, the layout, the type, the icons and the
five department colours are ours. A tenant is a customer wearing your product's clothes, so
their name sits beside your mark rather than replacing it.

## Proving security without a browser

Swap `localhost:8080` for `https://eclinician-api.onrender.com` to run these against the
live API.

```bash
# No token at all
curl -s -o /dev/null -w '%{http_code}\n' localhost:8080/api/patients            # 401

# Claiming a tenant in a header gets you nowhere — the tenant is not read from one
curl -s -o /dev/null -w '%{http_code}\n' localhost:8080/api/patients \
  -H 'X-Tenant-Id: hk-clinics'                                                  # 401

# Log in, then read with the token
TOKEN=$(curl -s -X POST localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"hkdoctor@hkclinics.com","password":"demo1234"}' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["token"])')
curl -s localhost:8080/api/patients -H "Authorization: Bearer $TOKEN" | head -c 300

# A receptionist reaching for the pharmacy queue
curl -s -o /dev/null -w '%{http_code}\n' localhost:8080/api/pharmacy/prescriptions \
  -H "Authorization: Bearer $RECEPTION_TOKEN"                                   # 403
```

Paste the token into [jwt.io](https://jwt.io) to show the `tenant` and `role` claims:
readable by anyone, changeable by nobody without the signing key.

## How the screens are designed

- Each role lands in a different part of the clinic — its own crest, colour and layout, so
  the screen says whose workspace it is before anyone reads a word.
- The front desk and the consulting room read as counters over lists; the lab and the
  pharmacy are a *bench* — one queue worked all day, counters in a rail beside it.
- Every dashboard carries the same **look-back**: today, yesterday, last 3/7/30 days, all
  time, or any date or span typed in — so "what did we do with that patient last Tuesday"
  is one click from wherever you are standing.
- One colour family — navy, sea, teal, forest, ink — defined once in
  [`index.css`](../frontend/src/index.css) and set on the root at sign-in, so sidebar, nav,
  calendar, avatar and mark all wear the department's colour. Mixed with the hospital's own
  colour, so the tenant's brand reaches every screen.
