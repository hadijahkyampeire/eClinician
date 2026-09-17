# Deployment

| | |
|---|---|
| **App** | https://eclinician.hadijahk.com/login |
| **API health** | https://eclinician.api.hadijahk.com/api/health |
| Hosting | Contabo VPS — Postgres, API and web app in Docker Compose, from [`deploy/`](../deploy/) |
| Pipeline | [`deploy.yml`](../.github/workflows/deploy.yml) — every merge to `main` |
| Sign in | Any demo account, password `demo1234` |

## Running locally

```bash
docker compose up -d   # Postgres on port 5433
make install           # npm install + mvn install
make run               # backend on :8080, frontend on :5173
make test              # 60 backend tests
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
  The server's `.env` holds a real one.
- The summarizer takes whichever AI key is present (`auto` prefers OpenAI). With neither,
  the drafting endpoint answers `503` and everything else runs normally.
- `VITE_API_URL` is read at **build** time — changing it needs a rebuild, not a restart.
  It must be the *public* API address: the browser calls it, so a container name like
  `eclinician-api` gives `ERR_NAME_NOT_RESOLVED` on every call while the API is healthy.

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

## Deploying to Contabo

```
eclinician.hadijahk.com      ─┐                     ┌─ eclinician-web (Caddy, React build)
                              ├─ shared Caddy (TLS) ┤
eclinician.api.hadijahk.com  ─┘                     └─ eclinician-api ── eclinician-db
```

The server also hosts another app, whose Caddy owns ports 80/443 on the `hkls-edge`
Docker network. eClinician joins that network and adds its own vhost file,
[`deploy/eclinician.caddy`](../deploy/eclinician.caddy), rather than running a second proxy.

**On every merge to `main`**, [`deploy.yml`](../.github/workflows/deploy.yml):

1. Builds `eclinician-api` and `eclinician-web` in GitHub Actions and pushes them to GHCR,
   tagged with the commit SHA.
2. SSHes into the server, checks out that commit in `/srv/eclinician`, pulls the images and
   restarts — the server never builds, so a deploy takes no memory from the other app.
3. Validates the vhost in a throwaway container before copying it into the shared Caddy's
   `conf.d/` and reloading — a broken file would take the other app's sites down too.
4. Waits for `/api/health` to answer.

### First-time setup

1. DNS: `A` records for `eclinician` and `eclinician.api` → the server's IP.
2. Repo secrets `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` — a key used only by this workflow.
3. On the server: `git clone` this repo into `/srv/eclinician`, then create
   `deploy/.env` with `chmod 600`:
   ```
   DB_PASSWORD=<openssl rand -hex 24>
   JWT_SECRET=<openssl rand -base64 48>
   OPENAI_API_KEY=
   ANTHROPIC_API_KEY=
   ```
   Leave `DEMO_PASSWORD` out to keep `demo1234`, which the docs quote.
4. Merge. GHCR packages start private, so the first pull fails: make `eclinician-api` and
   `eclinician-web` **Public** under the account's Packages, then re-run the job.

| Secret | How it is handled |
|---|---|
| Database password, `JWT_SECRET`, AI keys | `deploy/.env` on the server only — git-ignored, never in an image |
| SSH deploy key | A GitHub Actions secret |
| Staff passwords | Stored only as BCrypt hashes |

### Operating it

| Task | Command (in `/srv/eclinician/deploy`) |
|---|---|
| Logs | `docker compose logs -f eclinician-api` |
| Restart | `docker compose restart eclinician-api` |
| Roll back | Re-run an older **Deploy to Contabo** run, or `IMAGE_TAG=<sha> docker compose up -d` |
| Database shell | `docker compose exec eclinician-db psql -U eclinician` |
| Backup | `docker compose exec eclinician-db pg_dump -U eclinician eclinician > backup.sql` |

- The database is a Docker volume on the server, with no automatic backups yet.
- The API is capped at 768 MB (`mem_limit`); the Dockerfile gives the JVM 75% of that as
  heap with the serial collector. Without the cap, 75% would mean 75% of the whole server.
- `TZ=Africa/Kampala` in the compose file decides what "today" means on the dashboards.
