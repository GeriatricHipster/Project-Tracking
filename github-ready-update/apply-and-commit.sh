#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMMIT_MESSAGE="$(cat "$SCRIPT_DIR/COMMIT_MESSAGE.txt")"

cd "$REPO_ROOT"
node "$SCRIPT_DIR/apply-update.js"

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git add client/src/lib/dates.js client/src/components/TaskForm.jsx client/src/components/Dashboard.jsx client/src/styles.css server/src/server.js
  if git diff --cached --quiet; then
    echo "No new changes to commit."
  else
    git commit -m "$COMMIT_MESSAGE"
    echo "Committed changes with message: $COMMIT_MESSAGE"
  fi
else
  echo "Changes applied. This folder is not a git working tree, so no commit was created."
  echo "Commit message: $COMMIT_MESSAGE"
fi
