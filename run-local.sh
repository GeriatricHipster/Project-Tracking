#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

find_compose() {
  if docker compose version >/dev/null 2>&1; then
    echo "docker compose"
  elif command -v docker-compose >/dev/null 2>&1; then
    echo "docker-compose"
  else
    echo ""
  fi
}

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed or is not available in this terminal."
  echo "Install Docker Desktop, open it, and run this script again."
  exit 1
fi

COMPOSE_CMD="$(find_compose)"
if [ -z "$COMPOSE_CMD" ]; then
  echo "Docker Compose is not available."
  echo "Install Docker Desktop or docker compose, then run this script again."
  exit 1
fi

if [ ! -f server/.env ]; then
  cp server/.env.example server/.env
  echo "Created server/.env from server/.env.example"
fi

if [ ! -f client/.env ]; then
  cp client/.env.example client/.env
  echo "Created client/.env from client/.env.example"
fi

echo "Starting BuildTrack Cloud locally..."
echo "Open http://localhost:5173 after the containers finish starting."
echo "Demo login: admin@demo.com / Construction123!"

$COMPOSE_CMD up --build
