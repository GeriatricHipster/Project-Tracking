#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

compose_cmd=""
if docker compose version >/dev/null 2>&1; then
  compose_cmd="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  compose_cmd="docker-compose"
else
  echo "ERROR: Docker Compose is required. Install Docker Desktop, then run this script again."
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "ERROR: Docker is not running. Start Docker Desktop, then run this script again."
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

echo "Starting PSG and SS Tracking locally..."
echo "Open http://localhost:5173 after the containers finish starting."
echo "Demo login: admin@demo.com / Construction123!"
$compose_cmd up --build
