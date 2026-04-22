# Telegram Mini Apps Official References (Summary)

Primary source: https://core.telegram.org/bots/webapps  
Portal: https://docs.telegram-mini-apps.com/

## Key Points

- Mini Apps can be launched from bot menu, inline buttons, keyboard buttons, direct links, and other entry points.
- Web app context is passed to the page via `Telegram.WebApp`.
- Backend should validate signed `initData` for user authenticity.
- Direct links may include `startapp` payload for contextual startup.
- Mini Apps should account for multiple Telegram clients (mobile, desktop, web).

