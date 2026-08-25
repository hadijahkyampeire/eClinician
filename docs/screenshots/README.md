# Screenshots

The README links to these by exact filename. Replace any of them by overwriting the file —
no README edit needed.

## app/ — captured

Taken at 1440×900 against a locally seeded clinic. Retake them the same width if you
replace them, so the differences between the dashboards read as design rather than as a
resized browser.

| File | What it shows |
|---|---|
| `login.png` | The sign-in page — no role picker |
| `receptionist-dashboard.png` | Front Desk (navy) — who is in the building |
| `clinician-dashboard.png` | Consulting Room (teal) — this clinician's queue |
| `lab-dashboard.png` | Laboratory (sea) — the bench, tests only |
| `pharmacy-dashboard.png` | Pharmacy (forest) — the dispensing queue |

## deployment/ — captured

| File | What it shows |
|---|---|
| `render-services.png` | The Render dashboard: `eclinician-api` and `eclinician-web` deployed, `eclinician-db` available |

## tests/ — still to add

Run **`make test-report`** and screenshot the terminal. That target runs the real suite and
prints Maven's own summary with Spring's start-up logging filtered out, so the whole result
— fifteen classes, the total, `BUILD SUCCESS` — fits on one screen. It fails if the suite
fails, and names the test that broke.

| File | What to capture |
|---|---|
| `passing-tests.png` | The output of `make test-report` |

The README does not need it: B.9 already prints that output as text. An HTML comment at
that spot says the one line to paste in once the file is here.
