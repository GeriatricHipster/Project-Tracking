# BuildTrack Cloud

BuildTrack Cloud is a construction project timeline tracking web app with multi-user project access, task tracking, dependencies, audit history, real-time project refreshes, Resend or SMTP invitation emails, dashboard tabs, active/completed project filing, delete controls, an all-project calendar/status overview, visibility controls, and a Gantt-style schedule view.

## Start here if you do not code

Open this file first:

```text
START_HERE_GITHUB.md
```

That guide explains how to upload the app to GitHub through the GitHub website and deploy it from GitHub using Render. You do not need to use your local terminal.

Optional email invitation setup is documented here:

```text
EMAIL_INVITATION_SETUP.md
RESEND_EMAIL_SETUP.md
```

## Important hosting note

GitHub stores the project files and tracks updates. The live application also needs a backend server and PostgreSQL database, so it cannot be hosted by GitHub Pages alone. This project includes `render.yaml`, which lets Render create the live app and database directly from your GitHub repository.

## What is included

- Multi-user registration and login
- Projects with name, location, description, planned start, and planned finish
- Project member roles: owner, manager, editor, viewer
- Optional invitation email through Resend or SMTP when assigning a registered user to a project
- Visibility rule: viewers and editors see assigned projects; owners and managers can view the full project portfolio
- Task tracking with trade, assignee, dates, status, priority, percent complete, and color
- Task dependencies with cycle prevention
- Gantt-style project schedule chart
- Dashboard tabs for Active Projects, Completed, Assignments, and Calendar
- Assignment overview showing project members and roles by project
- Calendar overview showing all visible active and completed projects by date and status
- Manual project filing: move finished jobs to Completed or restore them to Active
- Owner-only project delete button with confirmation
- Project status badges: Not started, In progress, Blocked, Complete, Completed
- Real-time update notifications through Socket.IO
- Resend email API plugin plus standard SMTP fallback
- Audit log showing project changes
- PostgreSQL database schema and migrations
- One-service production deployment using Render Blueprint

## GitHub upload checklist

When uploaded correctly, the top level of your GitHub repository should show:

```text
client
server
package.json
render.yaml
README.md
START_HERE_GITHUB.md
```

The `render.yaml` file must be at the top level of the repository. Render uses this file to create the web service and database.

## Project visibility rule

Viewer and editor users see only projects they are assigned to. A user with a manager or owner role on at least one project can view the full project portfolio. If that manager/owner opens a project they are not directly assigned to, the project opens in read-only portfolio view unless they are also a member of that project with a higher role.

## Production deployment

Use Render **New + > Blueprint** and select this GitHub repository.

The included Blueprint creates:

```text
buildtrack-cloud   Node web service
buildtrack-db      PostgreSQL database
```

The backend serves both the API and the built React frontend, so the first production deployment only needs one public web service.

## Demo/local account note

The seed script can create this demo account for local testing:

```text
Email: admin@demo.com
Password: Construction123!
```

For the live cloud app, create your own real account using the Register screen.

## Tech stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Realtime: Socket.IO
- Database: PostgreSQL
- Authentication: JWT + bcrypt password hashing

## Suggested future upgrades

- File attachments for schedules, photos, RFIs, and submittals
- Microsoft Project or Primavera P6 import/export
- Baseline schedule tracking
- Drag-and-drop Gantt editing
- Custom company logo and branding

## Production note about free plans

The included `render.yaml` uses free Render plans for easy first deployment. Free cloud plans are best for testing and demos. Upgrade the web service and PostgreSQL database before using the app as a business-critical production system.
