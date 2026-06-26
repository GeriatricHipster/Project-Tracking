# Apply the Project-Tracking hotfix

Recommended commit message:

```text
Fix project view date parsing and building dropdown button
```

## What this fixes

This repairs the blank project screen caused by date parsing after the MM-DD-YYYY update. The project/Gantt view may receive dates from Render/Postgres as full timestamps like:

```text
2026-06-26T00:00:00.000Z
```

The hotfix makes the shared date helper accept those timestamps while still displaying dates as:

```text
06-26-2026
```

It also preserves the Building dropdown Add button update.

## How to apply

Unzip this package into the root of your local `Project-Tracking` repo.

Your folder should look like this:

```text
Project-Tracking/
  client/
  server/
  package.json
  github-ready-hotfix/
```

Run one of these from the repo root.

Mac/Linux:

```bash
bash github-ready-hotfix/apply-and-commit.sh
```

Windows PowerShell:

```powershell
.\github-ready-hotfix\apply-and-commit.ps1
```

Then push:

```bash
git push origin main
```

Render should redeploy after the push if the service is connected to the `main` branch.

## Manual fallback

If the commit script says there is nothing to commit, run:

```bash
git status
git push origin main
```

If the app is already deployed and still blank after the hotfix, open the browser DevTools Console and copy the red JavaScript error. That will identify the exact component still crashing.
