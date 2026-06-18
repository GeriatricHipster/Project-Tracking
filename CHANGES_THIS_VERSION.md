# Changes in this version

This version updates BuildTrack so Slack invitation codes are part of the normal project member workflow instead of a separate Slack invite panel.

## Added

- Automatic Slack invitation code creation when a project manager or owner adds/updates a project member.
- Slack direct-message delivery using a Slack Bot User OAuth Token.
- One-use, targeted invite codes for the assigned BuildTrack user/email.
- Optional Slack channel fallback if you still want webhook posting as a backup.
- Vendor dropdown on tasks with: Everbase, IES, Ideacom, Utah Yamas, Convergint, Pavion, Beacon, Stone Security, and S101.
- Larger Gantt chart with zoom controls, Start/Today buttons, bigger rows, wider horizontal scrolling, and vendor/assignee task labels.
- Header/banner image across login, dashboard, project, and loading pages.

## Removed from the user interface

- The separate Slack invite-code panel inside projects.

## Still included

- Join with invite code box on the main dashboard.
- Invite links that can add a logged-in or newly registered user to the project.
- Active Projects, Completed, Projects, Calendar Overview, and Site Members tabs.
- Project checklist, blueprint uploads, site member management, project member management, and project visibility rules.

## Slack setup required

For direct messages, add these Render environment variables after deployment:

```text
SLACK_BOT_TOKEN=your Slack Bot User OAuth Token
APP_URL=your live BuildTrack app URL
```

Optional fallback:

```text
SLACK_WEBHOOK_URL=your Slack incoming webhook URL
SLACK_DM_FALLBACK_TO_WEBHOOK=true
```

Plain-English setup steps are in:

```text
SLACK_INVITE_SETUP.md
```
