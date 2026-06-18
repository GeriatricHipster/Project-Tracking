# Changes in this version

This version keeps the Slack invitation-code features and fixes the Render migration error:

```text
Migration failed: error: column "sort_order" of relation "project_checklist_items" does not exist
```

## Fixed

- Added an upgrade-safe migration for older `project_checklist_items` tables that were created before `sort_order` existed.
- Added compatibility migration for older checklist columns such as `checked_by`.
- Added compatibility migration for older blueprint columns such as `file_name` and `file_size`.
- Added a safer user-role migration for older versions that used `viewer`/`editor` as site roles.

## Still included

- Slack invitation code panel inside each project
- Project invite codes that can be posted to a Slack channel using an Incoming Webhook
- Join with invite code box on the main dashboard
- Invite links that can add a logged-in or newly registered user to the project
- Project invite code database table and migration
- Slack setup guide: `SLACK_INVITE_SETUP.md`

## Slack setup required

Add these Render environment variables after deployment:

```text
SLACK_WEBHOOK_URL=your Slack incoming webhook URL
APP_URL=your live BuildTrack app URL
```
