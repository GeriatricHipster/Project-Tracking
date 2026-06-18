#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

if [ "$#" -lt 1 ]; then
  echo "Usage: ./push-to-github.sh https://github.com/YOUR-USER/YOUR-REPO.git"
  echo "Create an empty GitHub repo first, then run the command above."
  exit 1
fi

REMOTE_URL="$1"

if ! command -v git >/dev/null 2>&1; then
  echo "Git is not installed or is not available in this terminal."
  exit 1
fi

if [ ! -d .git ]; then
  git init
fi

git checkout -B main
git add .

if git diff --cached --quiet; then
  echo "No file changes to commit."
else
  git commit -m "Initial BuildTrack Cloud deployment"
fi

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REMOTE_URL"
else
  git remote add origin "$REMOTE_URL"
fi

git push -u origin main

echo ""
echo "Code pushed to GitHub."
echo "Next: in Render, choose New + > Blueprint, connect this repo, and Render will read render.yaml."
