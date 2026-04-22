# OpenClaw Official: Telegram Channel Guide (Summary)

Source: https://github.com/openclaw/openclaw/blob/main/docs/channels/telegram.md

## Key Points

- Telegram channel support is production-ready for bot DM + groups.
- Core DM policy: `pairing`, `allowlist`, `open`, `disabled`.
- For durable security, use numeric Telegram user IDs in `allowFrom`.
- Group access is controlled by:
  - allowed group IDs in `channels.telegram.groups`
  - sender policies via `groupPolicy` / `groupAllowFrom`.
- Group/supergroup chat IDs are negative IDs and belong in group allowlist, not user allowlist.
- Pairing approval is DM-level authorization and does not automatically grant group access.
- Telegram `botToken` can come from config or env fallback.

