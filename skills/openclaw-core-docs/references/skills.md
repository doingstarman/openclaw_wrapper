# OpenClaw Official: Skills Runtime (Summary)

Source: https://raw.githubusercontent.com/openclaw/openclaw/main/docs/tools/skills.md

## Key Points

- OpenClaw uses AgentSkills-compatible `SKILL.md` format.
- Skills load from bundled + local paths with precedence.
- Workspace-local skill copies override shared/bundled copies on same name.
- `skills.entries` config can enable/disable and inject per-skill env/api keys.
- Third-party skills should be treated as untrusted and reviewed before enabling.
- Skill visibility and agent allowlists are separate concerns.

