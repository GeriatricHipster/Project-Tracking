#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "MISSING: $1"
    return 1
  fi
  echo "OK: $1"
}

status=0
need_cmd docker || status=1
need_cmd git || status=1
need_cmd node || true
need_cmd npm || true

if docker compose version >/dev/null 2>&1; then
  echo "OK: docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  echo "OK: docker-compose"
else
  echo "MISSING: Docker Compose"
  status=1
fi

if [ "$status" -ne 0 ]; then
  echo "Install the missing required tools, then run this again."
  exit "$status"
fi

echo "Terminal checks completed."
