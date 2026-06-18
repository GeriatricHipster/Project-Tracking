# Changes in this version

This version adds Slack invitation codes for projects.

## Added

- Slack invitation code panel inside each project
- Project invite codes that can be posted to a Slack channel using an Incoming Webhook
- Join with invite code box on the main dashboard
- Invite links that can add a logged-in or newly registered user to the project
- Project invite code database table and migration
- New setup guide: `SLACK_INVITE_SETUP.md`

## Access rules

- Project managers can create editor/viewer invite codes.
- Project owners can create manager/editor/viewer invite codes.
- Owner invite codes are intentionally not supported for safety.
- People still need a BuildTrack account before accepting a project code.

## Setup required

Add these Render environment variables after deployment:

```text
SLACK_WEBHOOK_URL=your Slack incoming webhook URL
APP_URL=your live BuildTrack app URL
```
