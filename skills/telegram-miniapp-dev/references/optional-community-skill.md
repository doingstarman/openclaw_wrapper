# Optional Community Accelerator (Disabled by Default)

Candidate: https://github.com/clvv/openclaw-tg-canvas

Status in this project: **not enabled by default**.

Reason:

- Includes terminal/PTY and optional gateway proxy capabilities.
- Requires explicit security review and scoped allowlists before usage.

Enable only after:

1. Security review of deployment topology and exposed endpoints.
2. Separate environment with strict `ALLOWED_USER_IDS`.
3. Explicit decision to allow high-privilege terminal access.

