# Slack `missing_scope` Note

This package no longer sends Slack direct messages and no longer uses Slack email lookup.

That means this version should not require these old direct-message permissions:

```text
users:read
users:read.email
im:write
SLACK_BOT_TOKEN
```

Use the channel webhook setup instead:

```text
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your/webhook/url
APP_URL=https://your-buildtrack-app.onrender.com
```

If you still see a `missing_scope` error after uploading this package, Render is probably still running an older deployment. Go to Render, open the PSG and SS Tracking service, and click **Manual Deploy** or **Clear build cache & deploy**.

For current setup instructions, open:

```text
SLACK_INVITE_SETUP.md
```
