#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
git pull --ff-only
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example. Review it before production Telegram use." >&2
fi
docker compose up -d --build
docker compose ps
