# Optional general email invitation setup

BuildTrack can send an invitation email when a manager or owner assigns a registered user to a project.

This version does **not** require Outlook. It sends email through standard SMTP, which many email providers and company email systems support.

Important: the app still needs a sending email account or email service. A website cannot send real email from nowhere. Your email provider or IT person should give you these SMTP details:

```text
SMTP host
SMTP port
SMTP username
SMTP password, app password, or API key
Sender email address
```

## What the invitation email includes

When you add a project member and leave **Send invitation email** checked, the email includes:

```text
Project name
Project location
Project schedule dates
The user's project role
A link back to BuildTrack
```

The user must already have a BuildTrack account using the same email address you assign.

---

## Render setup steps

1. Open Render.
2. Open your `buildtrack-cloud` web service.
3. Click **Environment**.
4. Add the variables below.
5. Click **Save changes**.
6. Let Render redeploy the app.

Use these variable names exactly:

```text
EMAIL_PROVIDER=smtp
APP_URL=https://YOUR-BUILDTRACK-APP.onrender.com
EMAIL_FROM=schedule@yourcompany.com
EMAIL_FROM_NAME=BuildTrack Cloud
SMTP_HOST=your-email-provider-smtp-host
SMTP_PORT=587
SMTP_SECURE=false
SMTP_REQUIRE_TLS=true
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password-or-api-key
```

Replace the values with your real email provider details.

For many providers, port `587` with `SMTP_SECURE=false` and `SMTP_REQUIRE_TLS=true` is the normal setup. Some providers use port `465`; for that setup, use:

```text
SMTP_PORT=465
SMTP_SECURE=true
SMTP_REQUIRE_TLS=false
```

---

## What to ask your IT person

You can copy and send this message:

```text
I need SMTP settings for our BuildTrack Cloud app so it can send project invitation emails.

Please provide:
1. SMTP host
2. SMTP port
3. Whether the connection uses TLS on port 587 or SSL on port 465
4. SMTP username
5. SMTP password, app password, or SMTP API key
6. Sender email address we are allowed to send from
```

---

## Testing email invitations

After Render redeploys:

1. Open BuildTrack.
2. Register or confirm a second user account exists.
3. Open a project.
4. Go to the **Members** panel.
5. Enter the registered user's email address.
6. Leave **Send invitation email** checked.
7. Click **Add / update member**.

If email is configured correctly, you should see a message like:

```text
Member added. Invitation email sent to user@company.com.
```

---

## If the email does not send

First, the project assignment still works. The user can still log in and see the project if they are assigned.

Then check these common issues:

```text
EMAIL_PROVIDER must be smtp
SMTP_HOST must be filled in
EMAIL_FROM must be a real sender address
SMTP_USER and SMTP_PASS must both be correct
APP_URL should be your live BuildTrack URL
Your email provider may require an app password or API key instead of a normal password
Your email provider may block new apps until SMTP sending is enabled
```

Open the Render **Logs** tab for the `buildtrack-cloud` service to see the exact email error.
