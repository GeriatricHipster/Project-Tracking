# Update an Existing GitHub Repo

Use these steps if you already uploaded an older PSG and SS Tracking version.

## What changed

This version adds or updates:

- Slack channel invite codes sent from the Project Members add/update workflow
- Separate Slack invite-code panel removed from the project screen
- Project notes section editable by assigned viewers, editors, managers, and owners
- Viewers can edit project notes only
- Vendor dropdown now defaults to blank
- Trade dropdown with CCure, Cameras, and CCure & Cameras
- Security Team Member dropdown with Derick, Eric, James, Justin, Kenna, Kyra, Ryan, and Suvam
- PM dropdown with Kurt and Austin
- Bigger Gantt chart with zoom, Start, Today, Prev/Next 30-day pan buttons, and larger rows
- Header/banner image on login, dashboard, project, and loading pages
- Gantt checklist
- Drag-and-drop blueprint uploads
- Site member management
- Projects tab showing who is assigned to each project

## Update steps without Terminal

1. Download and unzip the new PSG and SS Tracking ZIP.
2. Open your existing GitHub repository.
3. Click **Add file**.
4. Click **Upload files**.
5. Drag in the contents of the unzipped folder.
6. Allow GitHub to replace existing files.
7. Use this commit message:

```text
Add Slack channel invites notes task dropdowns and larger Gantt
```

8. Click **Commit changes**.
9. Render should redeploy automatically.

## After Render redeploys

Open the app and check:

- Active Projects tab
- Completed tab
- Projects tab
- Calendar overview tab
- Site Members tab, visible only to site managers and owners
- Editable Project Notes section inside a project
- Gantt checklist inside a project
- Blueprint drag-and-drop upload inside a project
- Trade, Vendor, Security Team Member, and PM dropdowns when adding or editing a task
- Bigger Gantt chart controls: Start, Today, Prev/Next 30 days, Zoom out, Reset zoom, Zoom in
- Project Members add/update flow posting a Slack channel invitation

## Slack setup

Open:

```text
SLACK_INVITE_SETUP.md
```

For Slack channel messages, add these environment variables in Render:

```text
SLACK_WEBHOOK_URL
APP_URL
```

You do not need `SLACK_BOT_TOKEN` or direct-message scopes for this version.
