# BuildTrack Cloud

BuildTrack Cloud is a construction project timeline tracking web app with multi-user project access, task tracking, dependencies, audit history, live update notifications, dashboard tabs, active/completed project filing, owner delete controls, all-project calendar/status overview, project assignment lists, manager/owner-only site member management, blueprint uploads, checklist tracking, Slack direct-message invitation codes, and a larger Gantt-style schedule view.

## Main features

- Active Projects and Completed tabs
- Projects tab showing who is assigned to each project
- Calendar overview showing all visible projects and project status
- Larger Gantt chart with zoom controls, Start/Today navigation, dependencies, task progress, vendor labels, and today marker
- Vendor dropdown on tasks with these options:
  - Everbase
  - IES
  - Ideacom
  - Utah Yamas
  - Convergint
  - Pavion
  - Beacon
  - Stone Security
  - S101
- Gantt checklist with:
  - IPs requested
  - Panel ordered
  - Clearances programmed
  - Doors programmed
  - CCure Operator established
- Drag-and-drop blueprint upload inside each project
- Project members panel with project roles: owner, manager, editor, viewer
- Slack direct-message invite codes are sent automatically when a project manager or owner adds/updates a non-owner project member
- Site Members tab for site owners/managers to revoke access, restore access, delete users, and change site role
- Viewers/editors only see assigned projects; managers/owners can see the portfolio
- Header/banner image on login, dashboard, project, and loading pages

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
- The Slack setup is optional. Member assignments still save even if Slack is not configured; the app will show a notice that the Slack DM was not sent.

## Slack project invitation codes

This version sends a Slack direct message automatically when a manager or owner adds/updates a project member from the **Project members** panel.

Set these environment variables in Render for Slack DMs:

```text
SLACK_BOT_TOKEN=your Slack Bot User OAuth Token
APP_URL=your live BuildTrack URL
```

Optional channel fallback:

```text
SLACK_WEBHOOK_URL=your Slack Incoming Webhook URL
SLACK_DM_FALLBACK_TO_WEBHOOK=true
```

Detailed non-coder setup steps are in:

```text
SLACK_INVITE_SETUP.md
```
