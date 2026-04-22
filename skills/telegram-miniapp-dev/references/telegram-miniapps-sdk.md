# Telegram Mini Apps SDK Ecosystem (Summary)

Sources:

- https://github.com/Telegram-Mini-Apps/telegram-apps
- https://www.npmjs.com/package/@telegram-apps/sdk

## Key Points

- `@telegram-apps/sdk` provides helper utilities around Telegram Mini App platform integration.
- Official platform behavior still follows Telegram WebApp API contract.
- SDK usage should degrade gracefully to native `window.Telegram.WebApp` when required.
- Keep runtime assumptions explicit because SDK API surface may evolve.

