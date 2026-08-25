# Diagram gallery

Every UML artefact on one page, grouped by kind. Editable `.drawio` sources sit beside
their exports.

| Kind | Where |
|---|---|
| System architecture | [../architecture/](../architecture/) — the PDF, plus the diagram as `.drawio` and `.png` |
| Use case | [use-case/](use-case/) |
| VOPC | [vopc/](vopc/) |
| Sequence | [sequence/](sequence/) |
| Collaboration | [collaboration/](collaboration/) |

---

## System architecture

Three tiers — a React SPA, a Spring Boot application tier of controller → security →
service → repository, and PostgreSQL — with the AI summarizer outside the system boundary.
The written analysis is in
[eClinician-System-Architecture.pdf](../architecture/eClinician-System-Architecture.pdf).

![System architecture](../architecture/system-architecture.png)

## Use case

The system boundary with the six use-case packages and the actor that owns each. The full
use-case descriptions are in the [SRS PDF](../srs/eClinician-SRS.pdf).

![Use-case diagram](use-case/eclinician-use-case.png)

## VOPC — view of participating classes

One per major use case: the boundary, control and entity classes that take part.

### 1 · Consultation
![VOPC — Consultation](vopc/1-consultation.png)

### 2 · Laboratory
![VOPC — Laboratory](vopc/2-laboratory.png)

### 3 · Prescription
![VOPC — Prescription](vopc/3-prescription.png)

## Sequence

Message order over time, one diagram per use case.

### Patient consultation
![Sequence — Patient consultation](sequence/patient-consultation.png)

### Lab test request and results
![Sequence — Lab test request and results](sequence/lab-test-request-and-results.png)

### Prescription management
![Sequence — Prescription management](sequence/prescription-management.png)

## Collaboration

The same interactions drawn as links between objects rather than along a timeline.

### Patient consultation
![Collaboration — Patient consultation](collaboration/patient-consultation.png)

### Lab test and result
![Collaboration — Lab test and result](collaboration/lab-test-and-result.png)

### Prescription management
![Collaboration — Prescription management](collaboration/prescription-management.png)
