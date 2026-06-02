# AGENTS.md

Project instructions for agents working in this repository.

## Project

This is the OpenClaw Telegram Mini App monorepo.

- `miniapp/server`: Node.js + Express backend.
- `miniapp/web`: React + Vite Telegram Mini App frontend.
- `skills/`: local OpenClaw and Telegram Mini App skill docs.
- The production backend can serve `miniapp/web/dist` as a single service.

Primary product shape:

- `Главная`: current OpenClaw status and shortcuts.
- `Агент`: control surface for the single main OpenClaw agent.
- `Субагенты`: separate control-plane space for external AI agents.
- `ИИ`: token/model analytics.
- `Настройки`: app/runtime/security settings, including subagent settings.

## Commands

Run from repository root unless noted.

- Install all packages: `npm run install:all`
- Server tests: `npm test --prefix miniapp/server`
- Frontend build: `npm run build --prefix miniapp/web`
- Full CI flow: `npm run ci`
- Backend dev server: `cd miniapp/server && npm run dev`
- Frontend dev server: `cd miniapp/web && npm run dev`

On Windows PowerShell, use `npm.cmd` if `npm` is blocked by execution policy:

- `npm.cmd test --prefix miniapp/server`
- `npm.cmd run build --prefix miniapp/web`

## Local Run

For browser-only testing without Telegram signed `initData`, start the backend with:

```powershell
$env:MINIAPP_ALLOW_INSECURE_DEV='true'
npm.cmd run dev --prefix miniapp/server
```

Then open `http://localhost:3722/`.

The backend uses `WEB_DIST_PATH=../web/dist` by default, so rebuild the frontend after UI changes before validating the backend-served app.

## Backend Rules

- Keep API routes under `/api/miniapp/*`.
- Reuse the existing `authGuard`, `dataSource`, serializer, and test patterns.
- Do not bypass Telegram access checks for production paths.
- In dev mode, use `x-dev-user-id` only through the existing insecure-dev flow.
- Keep responses shaped through serializers when adding public API fields.
- For OpenClaw local state, read from `OPENCLAW_STATE_DIR`; do not write to it.

## Subagent Control Plane

Subagents are external AI agents, not the main OpenClaw agent.

- Keep `Агент` focused on the single OpenClaw agent.
- Put external agent management in the separate `Субагенты` space.
- Put subagent policy/adapter settings in the `Настройки -> Субагенты` view.
- Each subagent should expose or be adapted to:
  - health
  - capabilities/actions
  - logs
  - tasks
  - control actions
  - audit log entries

Danger policy:

- `safe`: run immediately.
- `risky`: require confirmation.
- `destructive`: require confirmation and owner access.
- `external`: require confirmation and owner access.

The backend must enforce danger/owner rules. UI confirmation alone is not enough.

## Frontend Rules

- Follow the existing single-file React structure unless the task clearly needs extraction.
- Keep bottom navigation compact and stable for Telegram mobile.
- Do not turn operational app screens into landing pages.
- Prefer existing components and styles: `Panel`, `StatusPill`, list/card grids, and current dark theme tokens.
- Use lucide icons already imported in `App.jsx` when possible.
- Text must fit in the 480px app shell and avoid horizontal overflow.
- When changing UI served from `localhost:3722`, rebuild `miniapp/web` first.

## Testing Expectations

For backend/API changes:

- Add or update integration tests in `miniapp/server/test/integration`.
- Add serializer unit coverage when public response shapes change.
- Run `npm test --prefix miniapp/server`.

For frontend changes:

- Run `npm run build --prefix miniapp/web`.
- If validating through `localhost:3722`, confirm the built asset in `miniapp/web/dist` is current.

For full feature work, run both server tests and frontend build.

## Change Discipline

- Keep changes surgical and tied to the user request.
- Do not refactor unrelated code or rewrite the UI system opportunistically.
- Preserve existing Russian UI copy style unless the user asks otherwise.
- Do not commit generated runtime logs, local env files, or `node_modules`.
- Mention unrelated issues instead of fixing them silently.
