$ErrorActionPreference = "Stop"

if (!(Test-Path "client") -or !(Test-Path "server")) {
  Write-Error "Run this script from the root of your Project-Tracking repo."
}

node github-ready-hotfix/apply-hotfix.js

git add client/src/lib/dates.js client/src/components/TaskForm.jsx client/src/components/Dashboard.jsx client/src/styles.css server/src/server.js
git commit -m "Fix project view date parsing and building dropdown button"

Write-Host "Hotfix committed. Push with: git push origin main"
