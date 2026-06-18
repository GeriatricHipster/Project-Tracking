# Changes in this version

This version updates the app name to **PSG and SS Tracking** and improves the project workspace layout.

## Added or changed

- App display name changed from BuildTrack Cloud to PSG and SS Tracking.
- Project notes moved below the Add/Edit Task pane.
- Dependencies, Blueprints, Project Members, and Activity side panes are slimmer and use a smaller form factor to avoid overlapping the task area.
- Gantt chart now has an **Export PDF** button.
- Gantt PDF export creates a landscape schedule file with task bars, progress, dates, project name, and dependency summary.
- Slack channel invitation code posting remains tied to adding/updating project members.
- The Slack message calls out the assigned PSG and SS Tracking email.
- Vendor dropdown defaults to blank.
- Trade dropdown includes: CCure, Cameras, CCure & Cameras.
- Security Team Member dropdown includes: Derick, Eric, James, Justin, Kenna, Kyra, Ryan, Suvam.
- PM dropdown includes: Kurt, Austin.
- The uploaded banner image remains the app header/banner image.

## Still included

- Join with invite code box on the main dashboard.
- Invite links that can add a logged-in or newly registered user to the project.
- Active Projects, Completed, Projects, Calendar Overview, and Site Members tabs.
- Project checklist, blueprint uploads, site member management, project member management, and project visibility rules.

## Slack setup required

For Slack channel invitations, add these Render environment variables after deployment:

```text
SLACK_WEBHOOK_URL=your Slack Incoming Webhook URL
APP_URL=your live PSG and SS Tracking app URL
```

Plain-English setup steps are in:

```text
SLACK_INVITE_SETUP.md
```
