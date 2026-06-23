#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v git >/dev/null 2>&1; then
  echo "ERROR: Git is required. Install Git, then run this script again."
  exit 1
fi

if [ -z "${GITHUB_REPO_URL:-}" ]; then
  echo "Paste your empty GitHub repository URL."
  echo "Example: https://github.com/your-user/buildtrack-cloud.git"
  read -r -p "GitHub repo URL: " GITHUB_REPO_URL
fi

if [ -z "$GITHUB_REPO_URL" ]; then
  echo "ERROR: GitHub repo URL is required."
  exit 1
fi

if [ ! -d .git ]; then
  git init
fi

git add .

if git diff --cached --quiet; then
  echo "No new file changes to commit."
else
  git commit -m "Prepare PSG and SS Tracking deployment"
fi

current_branch="$(git branch --show-current || true)"
if [ -z "$current_branch" ]; then
  git checkout -b main
else
  git branch -M main
fi

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$GITHUB_REPO_URL"
else
  git remote add origin "$GITHUB_REPO_URL"
fi

git push -u origin main

echo "Code pushed to GitHub."
echo "Next: open Render, choose New > Blueprint, and select this repo."
