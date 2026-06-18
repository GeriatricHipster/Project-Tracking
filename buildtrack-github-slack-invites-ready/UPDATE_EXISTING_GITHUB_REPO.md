# Update an Existing GitHub Repo

Use these steps if you already uploaded an older BuildTrack Cloud version.

## What changed

This version removes email invitations and adds:

- Gantt checklist
- Drag-and-drop blueprint uploads
- Site member management
- Revoke/restore site access
- Delete user account
- Change site role
- Projects / assignments tab showing who is assigned to each project

## Update steps without Terminal

1. Download and unzip the new BuildTrack ZIP.
2. Open your existing GitHub repository.
3. Click **Add file**.
4. Click **Upload files**.
5. Drag in the contents of the unzipped folder.
6. Allow GitHub to replace existing files.
7. Use this commit message:

```text
Add checklist blueprints and site member management
```

8. Click **Commit changes**.
9. Render should redeploy automatically.

## After Render redeploys

Open the app and check:

- Active Projects tab
- Completed tab
- Projects / assignments tab
- Calendar overview tab
- Site members tab, visible only to site managers and owners
- Gantt checklist inside a project
- Blueprint drag-and-drop upload inside a project

The database migration is included. Render will add the new tables and user role fields during deployment.

## This update adds Slack invitation codes

After uploading these updated files to GitHub and letting Render redeploy, open:

```text
SLACK_INVITE_SETUP.md
```

Then add these environment variables in Render:

```text
SLACK_WEBHOOK_URL
APP_URL
```
