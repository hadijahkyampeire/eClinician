# Vision Document

**Project:** eClinician — a multi-tenant outpatient clinic management system
**Author:** Hadijah Kyampeire · Reg. #618990

Companion to the use-case-based SRS ([srs/eClinician-SRS.pdf](srs/eClinician-SRS.pdf),
summarized in [srs.md](srs.md)). The SRS says what the system does; this says why it
exists and for whom.

---

## 1. The problem

Small and mid-size clinics still run outpatient care on paper. The consequences are
familiar:

- Paper charts get lost or are unreadable, so a clinician seeing a returning patient
  has no reliable history.
- Nobody at the front desk can answer "who is still waiting?" without walking the
  corridor and counting.
- A prescription written on a slip reaches the pharmacy only if the patient carries it
  there, and nothing records whether it was actually dispensed.
- The clinic owner has no numbers: how many patients today, how many visits closed, how
  much is going undispensed.

Hospital information systems that solve this exist, but they are priced and scoped for
large hospitals — one installation, one institution, a licence and a server per site. A
clinic with fifteen staff cannot justify either the cost or the administration.

## 2. Product position

> **For** small and mid-size outpatient clinics
> **who** need to run the visit — arrival, consultation, pharmacy, lab — without paper,
> **eClinician is** a web-based clinic management system
> **that** serves many independent clinics from one deployment, so each pays for a
> subscription rather than an installation.
> **Unlike** conventional hospital information systems, which are installed per site,
> **our product** isolates each clinic's data by tenant inside one running instance.

The multi-tenant design is the commercial idea, not a technical flourish: it is what
makes the price per clinic small enough to be affordable.

## 3. Stakeholders and users

| Stakeholder | Cares about | Uses the system to |
|---|---|---|
| **Receptionist** | A queue they can see | Register patients, check them in, watch the waiting list |
| **Clinician** | History and speed | Take the next patient, document vitals/diagnosis/plan, prescribe, request tests |
| **Pharmacist** | Knowing what was actually prescribed | Work a queue of medicines, dispense or flag unavailable |
| **Lab Technician** | A list of tests to run | Work a queue of requested tests, record results or cancel |
| **Clinic Administrator** | The facility as a whole | See daily activity across every role |
| **Platform operator** (owner of the deployment) | Many clinics on one instance | Onboard clinics, control which modules each subscribes to |
| **Patient** | Being seen, correctly | Indirect user — is registered, checked in, treated, dispensed to |

## 4. Product scope

**In scope — the outpatient visit, end to end**

- Patient registration and record keeping
- Arrival, waiting room, and consultation state for each visit
- Clinical documentation: vitals, symptoms, examination, diagnosis, treatment plan
- Prescriptions raised to a pharmacy queue and dispensed
- Lab tests raised to a laboratory queue and resulted
- Role-specific dashboards with live counts
- Staff authentication, with each account belonging to one clinic

**Out of scope for this release**

- Inpatient care, wards, admissions, theatre
- Billing, insurance claims, and payments
- Drug inventory and stock levels
- Structured lab result values with reference ranges
- A patient-facing portal

**Shaped during implementation.** The SRS specifies appointment *scheduling* — a doctor, a
date, a time, conflict checks — and that is built. What was added beside it is **arrival**:
check in → waiting → in session → completed, because for a walk-in outpatient clinic who is
waiting now matters as much as who is booked for Thursday. A walk-in carries no doctor, so
it never collides with a booking. The remaining differences from the SRS are listed in
[srs.md §4](srs.md#4-as-built-specification-against-implementation).

## 5. Major features

| # | Feature | Rationale |
|---|---|---|
| F1 | Multi-tenant data isolation | One deployment serves many clinics; a clinic must never see another's data |
| F2 | Patient registry | The record everything else refers to |
| F3 | Visit lifecycle (check-in → waiting → in session → completed) | Makes the waiting room a query rather than a walk |
| F4 | Clinical encounter documentation with finalization | The clinical record, locked once signed off |
| F5 | Pharmacy dispensing queue | Turns prescription text into work the pharmacy can act on |
| F6 | Laboratory queue with result entry | Same handoff for requested tests |
| F7 | Role-based dashboards | Every role opens the same route and sees its own four numbers |
| F8 | Authenticated staff accounts | The tenant is decided at login and signed into a token |
| F9 | Hospital onboarding and per-clinic subscriptions | What makes one deployment a product rather than an installation |
| F10 | AI-drafted visit summaries | The clinician writes the notes once; the summary is drafted from them and edited, not typed twice |

## 6. Assumptions

- Staff have a device with a modern browser and network access to the deployment.
- One clinic per staff account; a person working at two clinics has two accounts.
- Clinical text — prescriptions, lab requests, results — is free text written by trained
  staff, not codified against a formulary.
- A visit begins when the patient arrives; scheduling in advance is not required.
- The clinic's own timezone decides what "today" means on the dashboards.

## 7. Constraints

| Constraint | Consequence |
|---|---|
| Coursework scope and one developer | Depth over breadth: one workflow built completely rather than five built shallowly |
| Java 21 / Spring Boot 4 / PostgreSQL / React 19 | Set by the course stack |
| Free-tier cloud hosting | 512 MB RAM, shared CPU, an instance that sleeps, a database that expires after 30 days |
| Schema managed by Hibernate `ddl-auto=update` | Acceptable while there is no production data; Flyway is the first item on the roadmap |
| No clinical certification | Not a medical device; it records what staff type, and makes no clinical decisions |

## 8. Success criteria

1. A patient can be registered, seen, prescribed for and dispensed to without paper.
2. A receptionist can answer "who is waiting?" from the screen in one glance.
3. Two clinics on one deployment cannot read each other's records — provable, not
   asserted.
4. Adding a new clinical module (pharmacy, lab) does not require changing the modules
   that already exist.

Criteria 3 and 4 are demonstrated in [testing.md](testing.md) and
[architecture.md](architecture.md) respectively.
