#!/usr/bin/env bash
set -euo pipefail

if [ ! -d client ] || [ ! -d server ]; then
  echo "Run this script from the root of your Project-Tracking repo."
  exit 1
fi

node github-ready-hotfix/apply-hotfix.js

git add client/src/lib/dates.js client/src/components/TaskForm.jsx client/src/components/Dashboard.jsx client/src/styles.css server/src/server.js
git commit -m "Fix project view date parsing and building dropdown button"

echo "Hotfix committed. Push with: git push origin main"
