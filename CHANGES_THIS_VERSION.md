# Changes in this version

This version updates BuildTrack so Slack invitation codes are posted to a specific Slack channel during the normal project member add/update workflow.

## Added or changed

- Slack channel invitation code posting when a project manager or owner adds/updates a project member.
- The Slack message calls out the assigned BuildTrack email.
- Direct Slack DM logic removed from the active workflow.
- Project notes section inside each project.
- Assigned viewers, editors, managers, and owners can edit project notes.
- Viewers can edit project notes only; other schedule controls remain read-only.
- Vendor dropdown now defaults to blank.
- Trade is now a dropdown with: CCure, Cameras, CCure & Cameras.
- Security Team Member dropdown with: Derick, Eric, James, Justin, Kenna, Kyra, Ryan, Suvam.
- PM dropdown with: Kurt, Austin.
- Larger Gantt chart with bigger rows, wider labels, Prev/Next 30-day pan buttons, reset zoom, and more task details.
- The uploaded banner image is now used as the app header/banner image.

## Removed from the user interface

- The separate Slack invite-code panel inside projects.

## Still included

- Join with invite code box on the main dashboard.
- Invite links that can add a logged-in or newly registered user to the project.
- Active Projects, Completed, Projects, Calendar Overview, and Site Members tabs.
- Project checklist, blueprint uploads, site member management, project member management, and project visibility rules.

## Slack setup required

For Slack channel invitations, add these Render environment variables after deployment:

```text
SLACK_WEBHOOK_URL=your Slack Incoming Webhook URL
APP_URL=your live BuildTrack app URL
```

Plain-English setup steps are in:

```text
SLACK_INVITE_SETUP.md
```
