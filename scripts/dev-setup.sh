#!/usr/bin/env bash
# Developer bootstrap for MUSLLY AI OS.
# Idempotent — safe to re-run.
set -euo pipefail

echo "→ Checking bun..."
if ! command -v bun >/dev/null 2>&1; then
  echo "  bun not found. Install from https://bun.sh" >&2
  exit 1
fi

echo "→ Installing dependencies..."
bun install --frozen-lockfile

echo "→ Verifying .env..."
if [ ! -f .env ]; then
  echo "  .env missing. Copy .env.example → .env and fill in secrets." >&2
fi

echo "→ Typecheck..."
bunx tsgo --noEmit

echo "→ Import-graph guard..."
bun run scripts/check-imports.ts || echo "  (guard reported issues — review before commit)"

echo "✓ Dev setup complete."
