# Teams project invitation setup

This app can post project invitation codes to a Microsoft Teams channel when a manager or owner adds or updates a project member.

## What you need

- A Microsoft Teams team and channel
- A Teams workflow webhook URL
- Your live BuildTrack app URL

## Step 1: Create the Teams workflow

1. Open Microsoft Teams.
2. Go to the team and channel where you want the invite messages to appear.
3. Click the channel's **...** menu.
4. Choose **Workflows**.
5. Pick a template that says **When a Teams webhook request is received** or **Post to a channel when a webhook request is received**.
6. Finish the setup and copy the webhook URL that Teams gives you.

## Step 2: Add the webhook to Render

Open Render and go to your BuildTrack web service.

Add these environment variables:

- `TEAMS_WEBHOOK_URL` = paste the Teams webhook URL
- `APP_URL` = your live BuildTrack website address

Example:

```text
TEAMS_WEBHOOK_URL=https://...your Teams webhook...
APP_URL=https://your-buildtrack-app.onrender.com
```

After saving, click **Save, rebuild, and deploy**.

## Step 3: Test it

1. Open BuildTrack.
2. Open a project.
3. Go to **Project members**.
4. Add or update a member.
5. Teams should receive the invitation code message in the channel you chose.

## Notes

- The person must already have a BuildTrack account with the same email address.
- The app only posts to the Teams channel you picked when creating the workflow.
- Member assignments still save even if the webhook is missing; only the Teams message will fail.
