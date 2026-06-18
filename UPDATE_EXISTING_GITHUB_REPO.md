# Update an Existing GitHub Repo

Use this when you already deployed an earlier BuildTrack version and want to update it with the latest features.

## New features in this version

- Removed invitation email setup
- Added Gantt checklist
- Added drag-and-drop blueprint uploads
- Added Projects tab showing assignments
- Added Site members tab for managers and owners
- Added site roles and access status
- Added revoke access, delete user, and change site role controls
- Kept active/completed project filing and project delete controls

## No-terminal update steps

1. Download the latest ZIP.
2. Unzip it on your computer.
3. Open your existing GitHub repository.
4. Click `Add file`.
5. Click `Upload files`.
6. Drag in the contents of the unzipped folder.
7. Let GitHub replace existing files.
8. Use this commit message:

```text
Add checklist, blueprints, and site member management
```

9. Click `Commit changes`.
10. Render should redeploy automatically.

## After Render redeploys

Open the app and check:

- Active projects tab
- Completed tab
- Projects tab
- Calendar overview tab
- Site members tab, visible only for managers and owners
- Gantt checklist inside a project
- Blueprint drag-and-drop upload inside a project

The database migration is included. Render will add the new tables and user role fields during redeployment.
