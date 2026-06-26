# Project-Tracking update package

This update package applies two changes to the Project-Tracking repo:

1. Task and project date entry accepts and displays `MM-DD-YYYY`.
2. The Create Project pane gets an `Add` button next to the Building dropdown so a new building can be added and selected.

## Files changed by the update

- `client/src/lib/dates.js`
- `client/src/components/TaskForm.jsx`
- `client/src/components/Dashboard.jsx`
- `client/src/styles.css`
- `server/src/server.js`

## Commit message

```text
Use MM-DD-YYYY dates and add building button
```

## How to apply

Extract this ZIP into the root of your local `Project-Tracking` repository, so the folder layout looks like this:

```text
Project-Tracking/
  client/
  server/
  package.json
  github-ready-update/
    apply-update.js
    apply-and-commit.sh
    apply-and-commit.ps1
```

### Mac or Linux

From the repo root, run:

```bash
bash github-ready-update/apply-and-commit.sh
```

### Windows PowerShell

From the repo root, run:

```powershell
.\github-ready-update\apply-and-commit.ps1
```

Then push the commit:

```bash
git push origin main
```

Render should redeploy from the connected branch after the push.

## Manual fallback

If you only want to apply the date helper manually, replace:

```text
client/src/lib/dates.js
```

with:

```text
github-ready-update/dates.js.replacement
```

The apply script handles the rest of the edits automatically.
