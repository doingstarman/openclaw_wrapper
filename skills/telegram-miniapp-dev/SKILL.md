---
name: telegram-miniapp-dev
description: Build Telegram Mini Apps with official Telegram WebApp/Bot API behavior and @telegram-apps/sdk ecosystem references. Use when designing launch flow, initData validation, Mini App UI lifecycle, start parameters, and bot menu integration.
---

# Telegram Mini App Dev Skill

Use this skill when implementing Telegram Mini App frontend/backend behavior.

## Sources

- Mini Apps spec: `references/telegram-miniapps-official.md`
- SDK and template ecosystem: `references/telegram-miniapps-sdk.md`

## Working Rules

1. Treat `initData` validation as mandatory on backend for authenticated routes.
2. Keep Mini App web client responsive for mobile and desktop Telegram apps.
3. Use launch methods compatible with bot menu button and direct links (`startapp`).
4. Keep user actions explicit; do not add shell-like controls in v1 product.

