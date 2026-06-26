# Hotfix summary

Recommended commit message:

```text
Fix project view date parsing and building dropdown button
```

## Why this hotfix exists

The prior MM-DD-YYYY update made the frontend date parser stricter than the original app. Existing project/task records can come back from Render/Postgres as full timestamps such as `2026-06-26T00:00:00.000Z`. The project page and Gantt chart use those dates to calculate ranges. When the parser could not read a timestamp, the project view could crash and the whole React app could go blank, which also made the Light/Dark mode controls disappear.

## Files updated

```text
client/src/lib/dates.js
client/src/components/TaskForm.jsx
client/src/components/Dashboard.jsx
client/src/styles.css
server/src/server.js
```

## What changed

- Keeps user-facing dates as `MM-DD-YYYY`.
- Accepts existing backend dates in `YYYY-MM-DD` and `YYYY-MM-DDT...` formats.
- Prevents invalid dates from crashing the Gantt/project screen.
- Keeps the Create Project Building dropdown Add button update.
- Makes server-side date validation accept `MM-DD-YYYY`, `MM/DD/YYYY`, `YYYY-MM-DD`, and ISO timestamp-style values while storing dates as `YYYY-MM-DD`.
