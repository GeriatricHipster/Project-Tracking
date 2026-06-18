# BuildTrack Cloud

BuildTrack Cloud is a construction project timeline tracking web app with multi-user project access, task tracking, dependencies, audit history, real-time project refreshes, active/completed project filing, owner delete controls, a calendar/status overview, a Gantt-style schedule view, project checklists, blueprint uploads, and site member management.

## What is included

- React frontend in `client/`
- Node/Express backend in `server/`
- PostgreSQL database schema and migration runner
- Socket.IO project refresh notifications
- Render Blueprint deployment file: `render.yaml`
- No-terminal GitHub setup guide: `START_HERE_GITHUB.md`
- Existing-repo update guide: `UPDATE_EXISTING_GITHUB_REPO.md`

## Main features

- Active projects tab
- Completed projects tab
- Projects tab that lists which users are assigned to which projects
- Calendar overview showing all visible projects and status
- Project Gantt chart
- Gantt checklist with these items:
  - IPs requested
  - Panel ordered
  - Clearances programmed
  - Doors programmed
  - CCure Operator established
- Drag-and-drop blueprint uploads inside each project
- Project members panel
- Site members panel for managers and owners
- Revoke access, delete users, and change site roles
- Visibility rules:
  - Viewers/editors only see projects they are assigned to
  - Managers/owners can view the full portfolio

## Local terminal startup

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
docker compose up --build
```

Open:

```text
http://localhost:5173
```

Demo login after running the seed script:

```text
Email: admin@demo.com
Password: Construction123!
```

## Deploy through GitHub and Render

Follow:

```text
START_HERE_GITHUB.md
```

The included `render.yaml` creates the web service and PostgreSQL database from your GitHub repository.

## Important production notes

Blueprint files are stored in PostgreSQL so the app works on simple cloud hosting. For very large plan sets or heavy long-term use, connect object storage later, such as S3-compatible storage.

The first registered account in a fresh database becomes a site owner. After that, managers and owners can manage site members from the Site members tab.
