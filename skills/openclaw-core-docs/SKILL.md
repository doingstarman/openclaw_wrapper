---
name: openclaw-core-docs
description: OpenClaw core documentation quick-reference for skills, skill loading precedence, creating SKILL.md, and Telegram channel policy details. Use when implementing or auditing OpenClaw skills, Telegram channel access rules, or workspace skill setup with official OpenClaw docs only.
---

# OpenClaw Core Docs Skill

Use this skill as the first reference layer for OpenClaw-specific implementation decisions.

## Sources

- Official skill authoring: `references/creating-skills.md`
- Official skill runtime behavior: `references/skills.md`
- Official Telegram channel integration: `references/telegram-channel.md`

## Working Rules

1. Prefer official OpenClaw docs from references before any community source.
2. When behavior is ambiguous, cite the exact section from referenced files and do not invent config keys.
3. For Telegram access decisions, enforce numeric Telegram user IDs and explicit allowlists/group policies.
4. Keep custom project skills short and deterministic to reduce prompt bloat.

