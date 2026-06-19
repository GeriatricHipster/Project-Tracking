# PSG and SS Tracking

PSG and SS Tracking is a construction project timeline tracking web app with multi-user project access, task tracking, dependencies, audit history, live update notifications, dashboard tabs, active/completed project filing, owner delete controls, all-project calendar/status overview, project assignment lists, manager/owner-only site member management, blueprint uploads, checklist tracking, Teams channel invitation codes, project notes, and a larger Gantt-style schedule view.

## Main features

- Active Projects and Completed tabs
- Projects tab showing who is assigned to each project
- Calendar overview showing all visible projects and project status
- Larger Gantt chart with zoom controls, Start/Today navigation, Prev/Next 30-day pan buttons, dependencies, task progress, team/vendor labels, and today marker
- Editable project notes section for assigned viewers, editors, managers, and owners
- Viewer users can edit project notes only; other schedule/project controls stay read-only for viewers
- Task dropdowns for Trade, Vendor, Security Team Member, and PM
- Vendor dropdown options: Everbase, IES, Ideacom, Utah Yamas, Convergint, Pavion, Beacon, Stone Security, S101
- Trade dropdown options: CCure, Cameras, CCure & Cameras
- Security Team Member dropdown options: Derick, Eric, James, Justin, Kenna, Kyra, Ryan, Suvam
- PM dropdown options: Kurt, Austin
- Gantt checklist with IPs requested, Panel ordered, Clearances programmed, Doors programmed, and CCure Operator established
- Drag-and-drop blueprint upload inside each project
- Project members panel with project roles: owner, manager, editor, viewer
- Teams channel invite codes are sent automatically when a project manager or owner adds/updates a non-owner project member
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
- The Teams setup is optional. Member assignments still save even if Teams is not configured; the app will show a notice that the Teams channel invite was not sent.

## Teams project invitation codes

This version posts a Teams channel message automatically when a manager or owner adds/updates a project member from the **Project members** panel.

Set these environment variables in Render:

```text
TEAMS_WEBHOOK_URL=your Teams workflow webhook URL
APP_URL=your live PSG and SS Tracking URL
```

Detailed non-coder setup steps are in:

```text
TEAMS_INVITE_SETUP.md
```

You do not need `TEAMS_BOT_TOKEN` for this version.


## Latest update
- Login screen includes a Remember me option and a transparent banner background.
