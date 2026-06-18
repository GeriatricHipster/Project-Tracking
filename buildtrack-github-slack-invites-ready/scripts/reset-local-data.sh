#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

read -r -p "This will delete the local PostgreSQL Docker volume. Type RESET to continue: " answer
if [ "$answer" != "RESET" ]; then
  echo "Canceled."
  exit 0
fi

if docker compose version >/dev/null 2>&1; then
  docker compose down -v
elif command -v docker-compose >/dev/null 2>&1; then
  docker-compose down -v
else
  echo "ERROR: Docker Compose is required."
  exit 1
fi

echo "Local database volume deleted. Run ./scripts/start-local.sh to start fresh."
