#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

printf "This will delete the local Docker PostgreSQL data volume. Type RESET to continue: "
read -r CONFIRM
if [ "$CONFIRM" != "RESET" ]; then
  echo "Canceled."
  exit 0
fi

if docker compose version >/dev/null 2>&1; then
  docker compose down -v
elif command -v docker-compose >/dev/null 2>&1; then
  docker-compose down -v
else
  echo "Docker Compose is not available."
  exit 1
fi

echo "Local database volume removed. Run ./run-local.sh to recreate and seed it."
