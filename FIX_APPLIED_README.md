# Fix applied

Commit message:

```text
Fix project screen date handling and restore theme controls
```

## What was fixed

- Replaced the frontend date helper so project/task dates display as `MM-DD-YYYY` while keeping ISO `YYYY-MM-DD` internally for sorting, Gantt chart math, and database storage.
- Updated task creation/editing and project creation validation messages to use `MM-DD-YYYY`.
- Updated backend `normalizeDate()` to accept `MM-DD-YYYY`, `M-D-YYYY`, `MM/DD/YYYY`, ISO `YYYY-MM-DD`, and ISO timestamp strings, then store dates as `YYYY-MM-DD`.
- Added the `Add` button next to the Building dropdown in the Create Project panel.
- Fixed the theme/background controls so the Light/Dark button remains visible instead of overlapping with the Background button.
- Added error boundaries around the dashboard, project screen, and Gantt chart so a display error cannot blank the whole app.

## Files changed

```text
client/src/App.jsx
client/src/components/Dashboard.jsx
client/src/components/ErrorBoundary.jsx
client/src/components/ProjectView.jsx
client/src/components/TaskForm.jsx
client/src/lib/dates.js
client/src/styles.css
server/src/server.js
```

## Checks run

```text
tsc JSX/client parse check: passed
node --check server/src/server.js: passed
node --check server/src/db.js: passed
node --check server/src/migrate.js: passed
node --check server/src/seed.js: passed
frontend date helper tests: passed
```

I could not run a full `npm install` / Vite production build in this sandbox because dependency installation did not complete here. The source was still syntax-checked with TypeScript's JSX parser and the server files were checked with Node.

## How to upload through GitHub website

1. Unzip this folder.
2. Open your GitHub repository.
3. Click **Add file**.
4. Click **Upload files**.
5. Drag the contents of this unzipped folder into GitHub.
6. Allow GitHub to replace existing files.
7. Use this commit message:

```text
Fix project screen date handling and restore theme controls
```

8. Click **Commit changes**.
9. Render should redeploy automatically.

## After Render redeploys

Test these items:

1. Open a project. The project screen should load instead of going blank.
2. Confirm the Light/Dark button is visible in the top-right corner.
3. Add a task using dates like `06-26-2026`.
4. Create a project and click **Add** next to the Building dropdown.
