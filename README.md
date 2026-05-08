# OpenClaw Telegram Mini App v1

MVP implementation with:

- `miniapp/web`: React + Vite Telegram Mini App frontend
- `miniapp/server`: Node/Express backend adapter with Telegram `initData` validation
- `skills/`: official-only custom skills for OpenClaw and Telegram Mini Apps

The repository is structured as a monorepo with two packages. For production on a VPS,
the backend can also serve the built frontend from `miniapp/web/dist`, so it can run as
one service behind a reverse proxy.

## Structure

- `miniapp/web` - 5 tabs UI: `overview`, `sessions`, `ai`, `approvals`, `logs`
- `miniapp/server` - API contract:
  - `GET /api/miniapp/bootstrap`
  - `GET /api/miniapp/overview`
  - `GET /api/miniapp/sessions`
  - `GET /api/miniapp/ai`
  - `GET /api/miniapp/approvals`
  - `POST /api/miniapp/approvals/:id/approve`
  - `POST /api/miniapp/approvals/:id/reject`
  - `GET /api/miniapp/logs?cursor=...`

## Backend Environment

Required:

- `TELEGRAM_BOT_TOKEN` for Telegram `initData` verification

Recommended:

- `TELEGRAM_ALLOWED_USER_IDS` as comma-separated list (numeric IDs)
- `TELEGRAM_ADMIN_USER_IDS` as comma-separated list for approval actions

Optional:

- `OPENCLAW_STATE_DIR` to read live local OpenClaw state (`/host/openclaw` in Docker)
- `OPENCLAW_GATEWAY_URL` and `OPENCLAW_GATEWAY_TOKEN` for a future dedicated HTTP bridge
- `MINIAPP_ALLOW_INSECURE_DEV=true|false` for local testing without Telegram initData

Behavior:

- In non-production mode, insecure dev access is enabled by default unless explicitly disabled with `MINIAPP_ALLOW_INSECURE_DEV=false`.
- If `x-telegram-init-data` is present, backend always validates Telegram signature first.

## Run

From the repository root:

1. Install all dependencies:
   - `npm run install:all`
2. Run backend tests:
   - `npm test`
3. Build frontend:
   - `npm run build`

GitHub Actions uses the same commands through `npm run ci`.

Local development:

1. Install server dependencies:
   - `cd miniapp/server && npm install`
2. Run server:
   - `npm run dev`
3. Install web dependencies:
   - `cd ../web && npm install`
4. Run web:
   - `npm run dev`

Production single-service mode:

1. Build frontend:
   - `npm run build --prefix miniapp/web`
2. Start backend from `miniapp/server`:
   - `WEB_DIST_PATH=../web/dist npm start`
3. Backend serves:
   - frontend routes from `/`
   - API routes from `/api/miniapp/*`

## Tests

Run server tests:

- `cd miniapp/server && npm test`

Included:

- Unit tests for Telegram `initData` validation
- Unit tests for serializer shape
- Integration tests for bootstrap, approvals, logs cursor flow

## Logging and Error Handling

- Backend emits structured JSON logs with `requestId` for each request lifecycle (`request.start`, `request.finish`, `request.error`).
- API error responses include `requestId` to correlate frontend errors with backend logs.
- Frontend logs API request/response diagnostics and browser `error` / `unhandledrejection` events in dev console.

## E2E Manual Checklist

1. Open mini app from Telegram bot menu button.
2. Verify all 5 tabs render in Telegram mobile and desktop clients.
3. Verify unauthorized Telegram user receives explicit error.
4. Verify approval buttons work only for admin-role users.
5. Verify logs pagination (`Load more`) behaves correctly.

## Docker/VPS deploy

This repo can run as one production container: Express serves `/api/miniapp/*` and the built Vite frontend.

```bash
cp .env.example .env
# edit .env: TELEGRAM_BOT_TOKEN and allowed/admin user IDs
docker compose up -d --build
```

Default internal app port is `3001`; the compose file binds it to `127.0.0.1:8091` for reverse proxy use.
The compose file mounts `/root/.openclaw` read-only as `/host/openclaw`, so the mini app shows real OpenClaw sessions, token usage, cron metadata, logs, skills snapshot, Telegram channel status, and local security posture instead of mock data.

For a browser-only smoke test before Telegram bot wiring, set:

```env
MINIAPP_ALLOW_INSECURE_DEV=true
TELEGRAM_ALLOWED_USER_IDS=
TELEGRAM_ADMIN_USER_IDS=1037751541
```

For real Telegram Mini App usage, set `TELEGRAM_BOT_TOKEN` and keep `MINIAPP_ALLOW_INSECURE_DEV=false`.

