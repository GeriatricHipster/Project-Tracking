# BuildTrack Cloud

BuildTrack Cloud is a construction project timeline tracking web app with multi-user project access, task tracking, dependencies, audit history, live update notifications, dashboard tabs, active/completed project filing, owner delete controls, all-project calendar/status overview, project assignment lists, manager/owner-only site member management, blueprint uploads, checklist tracking, and a Gantt-style schedule view.

## Main features

- Active Projects and Completed tabs
- Projects / assignments tab showing who is assigned to each project
- Calendar overview showing all visible projects and project status
- Gantt chart with task bars, dependencies, task progress, and today marker
- Gantt checklist with:
  - IPs requested
  - Panel ordered
  - Clearances programmed
  - Doors programmed
  - CCure Operator established
- Drag-and-drop blueprint upload inside each project
- Project members panel with project roles: owner, manager, editor, viewer
- Site Members tab for site owners/managers to revoke access, restore access, delete users, and change site role
- Viewers/editors only see assigned projects; managers/owners can see the portfolio

## Local demo login

```text
Email: admin@demo.com
Password: Construction123!
```

The demo admin is a site owner.

## Run locally with Docker

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
docker compose up --build
```

Open:

```text
http://localhost:5173
```

## Deploy through GitHub + Render

Use `START_HERE_GITHUB.md` for no-terminal deployment instructions.

## Notes

- The first registered user becomes a site owner.
- Site owners/managers can open the Site Members tab.
- Blueprint files are stored in PostgreSQL for this MVP so they stay attached to the project after redeploys.
- Default blueprint upload limit is 25 MB. Change `MAX_BLUEPRINT_BYTES` in Render if needed.

## Slack project invitation codes

This version can send project invitation codes to a Slack channel using a Slack Incoming Webhook.

Managers and owners can open a project and use the **Slack invite code** panel to create and send a code. Team members can click the Slack invite link or paste the code into **Join with invite code** on the dashboard.

Set these environment variables in Render:

```text
SLACK_WEBHOOK_URL=your Slack Incoming Webhook URL
APP_URL=your live BuildTrack URL
```

Detailed non-coder setup steps are in:

```text
SLACK_INVITE_SETUP.md
```
