#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v render >/dev/null 2>&1; then
  echo "Render CLI is not installed. You can still deploy by using Render Dashboard > New > Blueprint."
  echo "After installing Render CLI, run: render blueprints validate render.yaml"
  exit 0
fi

render blueprints validate render.yaml
