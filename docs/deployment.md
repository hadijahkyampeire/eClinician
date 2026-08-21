# Deployment

| | |
|---|---|
| **App** | https://eclinician-web.onrender.com/login |
| **API health** | https://eclinician-api.onrender.com/api/health |
| Hosting | Render — managed Postgres + Dockerized API + static site, from [`render.yaml`](../render.yaml) |
| Sign in | Any demo account, password `demo1234` |

> **Cold start: ~96 seconds measured.** The free instance sleeps after 15 minutes idle and
> a JVM on 0.1 CPU is slow to wake. `.github/workflows/keep-warm.yml` pings `/api/health`
> every ten minutes, but GitHub's schedulers fire late, so before anything that matters
> open the app yourself ten minutes early and leave the tab open.

## Running locally

```bash
docker compose up -d   # Postgres on port 5433
make install           # npm install + mvn install
make run               # backend on :8080, frontend on :5173
make test              # backend test suite
```

Open http://localhost:5173 and sign in — the six staff accounts are seeded on first start
(password `demo1234`, or `DEMO_PASSWORD`).

## Configuration

| Env var | Where | Default |
|---|---|---|
| `DB_HOST` `DB_PORT` `DB_NAME` `DB_USER` `DB_PASSWORD` | backend | `localhost:5433`, `eclinician` |
| `PORT` | backend | `8080` |
| `CORS_ALLOWED_ORIGINS` | backend | `http://localhost:5173` |
| `JWT_SECRET` | backend | none — a random per-process key is generated if unset |
| `JWT_TTL_MINUTES` | backend | `480` |
| `DEMO_PASSWORD` | backend | `demo1234` |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | backend | none / `gpt-4o-mini` |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | backend | none / `claude-opus-5` |
| `AI_PROVIDER` | backend | `auto` — or `openai` / `claude` to insist on one |
| `VITE_API_URL` | frontend | `http://localhost:8080` |

- `CORS_ALLOWED_ORIGINS` is comma-separated and accepts bare hostnames (https assumed).
- `JWT_SECRET` must be at least 32 bytes; the app refuses to start on a shorter one.
  Changing it signs out everyone holding an old token. **No key is committed** — unset, a
  random per-process key is generated with a warning, so sign-ins break after a restart.
  Render generates a real one per deployment.
- The summarizer takes whichever AI key is present (`auto` prefers OpenAI). With neither,
  the drafting endpoint answers `503` and everything else runs normally.
- `VITE_API_URL` is read at **build** time — changing it needs a rebuild, not a restart.
  It is written out in full in the blueprint: Render's `fromService … property: host`
  resolves to the *private* hostname (`eclinician-api`), which a browser cannot resolve,
  and the symptom is `ERR_NAME_NOT_RESOLVED` on every API call while the API itself is
  healthy.

## Database migrations

Flyway owns the schema (`backend/src/main/resources/db/migration`) and runs on startup,
before JPA. Hibernate is set to `validate`, so a mapping that has drifted from the
migrations fails the boot instead of altering a live table.

- A fresh database runs `V1` then `V2`.
- The already-deployed database is baselined (`baseline-on-migrate=true`): `V1` is recorded
  as present without re-running, then `V2` onwards apply. This upgrade was rehearsed
  against a copy of the live data before merging.
- A change means a **new** `V3__….sql` — never editing a migration that has run, because
  Flyway checksums them and refuses to start if one changed underneath it.
- If a migration fails on deploy the service does not start and the database stays at the
  last good version; each migration runs in a transaction. Fix it in a new migration.

## Deploying to Render

1. Push to GitHub → in Render, **New → Blueprint** → pick this repo → **Apply**.
2. Wait for `eclinician-api` to go live (~5 minutes; Maven downloads inside the image).
3. Set `CORS_ALLOWED_ORIGINS` on `eclinician-api` to the `eclinician-web` hostname and let
   it redeploy. This one variable is manual because Render rejects a dependency cycle.
4. Optionally set `DEMO_PASSWORD`.
5. Open the `eclinician-web` URL and log in.

| Secret | How it is handled |
|---|---|
| Database password | Injected by Render from the managed Postgres; never in the repo |
| `JWT_SECRET` | `generateValue: true` — Render creates and keeps it |
| `DEMO_PASSWORD` | `sync: false` — set by hand in the dashboard |
| Staff passwords | Stored only as BCrypt hashes |

## Free-tier limits

| | Allowance | Catch |
|---|---|---|
| Postgres | 1 GB | Expires **30 days** after creation, 14-day grace, then deleted. No backups — re-provision if it is older than that. |
| API | 750 instance-hours/month | 512 MB RAM, 0.1 CPU, sleeps after 15 min idle |
| Frontend | Free | Counts toward bandwidth and build minutes |

`TZ=Africa/Kampala` in the blueprint decides what "today" means on the dashboards, and the
Dockerfile raises the JVM heap ceiling to 75% of the container with the serial collector —
the defaults leave ~128 MB of heap and thrash.
