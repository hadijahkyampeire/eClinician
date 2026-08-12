# Deployment

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
| `JWT_SECRET` | backend | a development key — override everywhere else |
| `JWT_TTL_MINUTES` | backend | `480` |
| `DEMO_PASSWORD` | backend | `demo1234` |
| `VITE_API_URL` | frontend | `http://localhost:8080` |

- `CORS_ALLOWED_ORIGINS` is comma-separated and accepts bare hostnames (https assumed).
- `JWT_SECRET` must be at least 32 bytes — HS256 refuses a shorter key — and changing it
  signs out everyone holding an old token. It is never committed: the default in
  `application.properties` is a development value, and Render generates a real one.

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
