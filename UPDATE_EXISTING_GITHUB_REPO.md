# Update an Existing GitHub Repo

Use these steps if you already uploaded an older BuildTrack Cloud version.

## What changed

This version adds or updates:

- Slack direct-message invite codes sent from the Project Members add/update workflow
- Separate Slack invite-code panel removed from the project screen
- Vendor dropdown on the Add/Edit Task form
- Bigger Gantt chart with zoom, Start, and Today controls
- Header/banner image on login, dashboard, project, and loading pages
- Gantt checklist
- Drag-and-drop blueprint uploads
- Site member management
- Revoke/restore site access
- Delete user account
- Change site role
- Projects tab showing who is assigned to each project

## Update steps without Terminal

1. Download and unzip the new BuildTrack ZIP.
2. Open your existing GitHub repository.
3. Click **Add file**.
4. Click **Upload files**.
5. Drag in the contents of the unzipped folder.
6. Allow GitHub to replace existing files.
7. Use this commit message:

```text
Add Slack DM invites vendor dropdown banner and larger Gantt
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
- Gantt checklist inside a project
- Blueprint drag-and-drop upload inside a project
- Vendor dropdown when adding or editing a task
- Bigger Gantt chart controls: Start, Today, Zoom out, Zoom in
- Project Members add/update flow

## Slack setup

Open:

```text
SLACK_INVITE_SETUP.md
```

For direct messages, add these environment variables in Render:

```text
SLACK_BOT_TOKEN
APP_URL
```

Optional channel fallback variables:

```text
SLACK_WEBHOOK_URL
SLACK_DM_FALLBACK_TO_WEBHOOK
```
