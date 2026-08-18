# Deployment

## Live deployment

| | |
|---|---|
| **App** | https://eclinician-web.onrender.com/login |
| **API health** | https://eclinician-api.onrender.com/api/health |
| Hosting | Render — managed Postgres + Dockerized API + static site, from [`render.yaml`](../render.yaml) |
| Sign in | The demo dropdown fills real credentials; password `demo1234` |

Verified against the live instance:

```
GET  /api/health                        → 200 {"status":"UP"}
POST /api/auth/login  (demo clinician)  → 200 + JWT carrying tenant "sample-hospital"
GET  /api/patients    with the token    → 200
GET  /api/patients    without a token   → 401
OPTIONS preflight from the web origin   → 200, allow-origin: https://eclinician-web.onrender.com,
                                          allow-headers: authorization
```

**Cold start: 96 seconds measured.** The free instance sleeps after 15 minutes idle and
a JVM on 0.1 CPU is slow to wake. Open the app well before a demo.

## Running locally

```bash
docker compose up -d   # Postgres on port 5433
make install           # npm install + mvn install
make run               # backend on :8080, frontend on :5173
make test              # backend test suite
```

Open http://localhost:5173, pick a role from the demo dropdown and sign in — the six
staff accounts are seeded on first start (password `demo1234`, or `DEMO_PASSWORD`).

## Configuration

| Env var | Where | Default |
|---|---|---|
| `DB_HOST` `DB_PORT` `DB_NAME` `DB_USER` `DB_PASSWORD` | backend | `localhost:5433`, `eclinician` |
| `PORT` | backend | `8080` |
| `CORS_ALLOWED_ORIGINS` | backend | `http://localhost:5173` |
| `JWT_SECRET` | backend | none — a random per-process key is generated if unset |
| `JWT_TTL_MINUTES` | backend | `480` |
| `DEMO_PASSWORD` | backend | `demo1234` |
| `VITE_API_URL` | frontend | `http://localhost:8080` |

- `CORS_ALLOWED_ORIGINS` is comma-separated and accepts bare hostnames (https assumed).
- `JWT_SECRET` must be at least 32 bytes — HS256 refuses a shorter key, and the app now
  refuses to start on a shorter one rather than failing at first login. Changing it signs
  out everyone holding an old token. **No key is committed:** unset, the app generates a
  random key for that process and logs a warning, so sign-ins stop working after a
  restart — the intended reminder. Render generates a real one per deployment.

## Database migrations

Flyway owns the schema (`backend/src/main/resources/db/migration`) and runs on startup,
before JPA. Hibernate is set to `validate`, so a mapping that has drifted from the
migrations fails the boot instead of altering a live table.

- **A fresh database** runs `V1` then `V2`.
- **The already-deployed database** is baselined: `spring.flyway.baseline-on-migrate=true`
  records `V1` as already present without re-running it, then applies `V2` onwards.
- **Adding a change** means a new `V3__…sql` — never editing a migration that has run,
  because Flyway checksums them and will refuse to start if one changed underneath it.

The upgrade of the existing deployment was rehearsed before merging: a database rebuilt
as `ddl-auto=update` had left it — without `doctor_id` or `active`, carrying a patient, a
visit and a dispensed order — then booted with this code. Flyway baselined it at `V1`,
applied `V2` alone, added the two missing columns and the foreign keys around the live
rows, and the application started, which is `validate` agreeing that the mapping matches.

If a migration ever does fail on deploy, the service will not start and the database is
left at the last good version — Flyway runs each migration in a transaction. Read the
failure in the Render logs, fix it in a **new** migration, and redeploy.

## Deploying to Render

[`render.yaml`](../render.yaml) is a blueprint that provisions all three pieces — managed
Postgres, the Dockerized API, and the static frontend — and wires them together: the API
gets its database credentials from the Postgres instance, and the frontend gets
`VITE_API_URL` from the API's hostname.

1. Push to GitHub → in Render, **New → Blueprint** → pick this repo → **Apply**.
2. Wait for `eclinician-api` to go live. The first build takes ~5 minutes, since Maven
   downloads its dependencies inside the image.
3. Copy the `eclinician-web` URL, then set `CORS_ALLOWED_ORIGINS` on `eclinician-api` to
   that hostname (**Environment** tab) and let it redeploy. This one variable is manual
   by design — the two services cannot reference each other, as Render rejects a
   dependency cycle.
4. Optionally set `DEMO_PASSWORD` on `eclinician-api`.
5. Open the `eclinician-web` URL and log in.

`VITE_API_URL` is read at **build** time, not runtime — Vite inlines it into the bundle.
Changing it requires a frontend rebuild, not a restart.

### Secrets

| Secret | How it is handled |
|---|---|
| Database password | Injected by Render from the managed Postgres instance; never in the repo |
| `JWT_SECRET` | `generateValue: true` — Render creates it and keeps it; never in the repo |
| `DEMO_PASSWORD` | `sync: false` — set by hand in the dashboard |
| Staff passwords | Stored only as BCrypt hashes |

## Free-tier limits worth knowing

| | Allowance | Catch |
|---|---|---|
| Postgres | 1 GB | Expires **30 days** after creation, 14-day grace, then deleted. One per workspace, no backups. |
| API | 750 instance-hours/month | 512 MB RAM, 0.1 CPU. Sleeps after 15 min idle. |
| Frontend | Free | Counts toward bandwidth and build minutes. |

**Before a demo:**

- A sleeping instance takes **1–3 minutes** to wake, because cold-starting a JVM on
  0.1 CPU is slow. Open the app ten minutes early and keep a tab on it.
- Re-provision the database if it is more than 30 days old.
- `TZ=Africa/Kampala` in the blueprint decides what "today" means on the dashboards.
- The Dockerfile raises the JVM heap ceiling to 75% of the container and uses the serial
  collector; the defaults leave ~128 MB of heap and thrash.
