# Optional email invitation setup

BuildTrack can send an invitation email when a manager or owner assigns a registered user to a project.

This version supports two email options:

```text
Resend email API   recommended for most simple cloud setups
Standard SMTP      useful if your company already gives you SMTP settings
```

Project assignments still work even if email is not configured. The app will add the user to the project and show a warning that the email was not sent.

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

# Option A: Resend setup

Use this option if you want a simple email API provider instead of company SMTP.

Open this file for the step-by-step setup:

```text
RESEND_EMAIL_SETUP.md
```

The Render environment variables are:

```text
EMAIL_PROVIDER=resend
APP_URL=https://YOUR-BUILDTRACK-APP.onrender.com
RESEND_API_KEY=your-resend-api-key
RESEND_FROM=schedule@yourcompany.com
RESEND_FROM_NAME=BuildTrack Cloud
```

Optional:

```text
RESEND_REPLY_TO=office@yourcompany.com
```

Important: keep `RESEND_API_KEY` private. Add it only in Render. Do not upload it to GitHub.

---

# Option B: Standard SMTP setup

Use this option if your company email provider or IT team gives you SMTP settings.

Your email provider or IT person should give you these SMTP details:

```text
SMTP host
SMTP port
SMTP username
SMTP password, app password, or API key
Sender email address
```

## Render setup steps for SMTP

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

For many providers, port `587` with `SMTP_SECURE=false` and `SMTP_REQUIRE_TLS=true` is the normal setup. Some providers use port `465`; for that setup, use:

```text
SMTP_PORT=465
SMTP_SECURE=true
SMTP_REQUIRE_TLS=false
```

---

## What to ask your IT person if using SMTP

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
EMAIL_PROVIDER must be resend or smtp
APP_URL should be your live BuildTrack URL
The recipient must already have a registered BuildTrack account
For Resend: RESEND_API_KEY and RESEND_FROM must be filled in
For Resend: RESEND_FROM should be a verified sender/domain in Resend
For SMTP: SMTP_HOST, SMTP_USER, and SMTP_PASS must be correct
Your email provider may require app-specific credentials
```

Open the Render **Logs** tab for the `buildtrack-cloud` service to see the exact email error.
