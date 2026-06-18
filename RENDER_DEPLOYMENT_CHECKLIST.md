# Render Deployment Checklist

Use this checklist after uploading the project to GitHub.

## Required Render services

The included `render.yaml` creates:

```text
buildtrack-cloud   web service
buildtrack-db      PostgreSQL database
```

## Required environment variables

The Blueprint sets these automatically:

```text
DATABASE_URL
JWT_SECRET
CLIENT_ORIGIN
NODE_ENV
APP_NAME
PGSSLMODE
```

## Optional environment variable

You can add this in Render if you want a different maximum blueprint upload size:

```text
BLUEPRINT_MAX_FILE_SIZE=26214400
```

The default is 25 MB.

## After deploy

1. Open the Render app URL.
2. Register your first account.
3. Create a project.
4. Add tasks.
5. Check the Gantt chart.
6. Test the checklist.
7. Drag and drop a blueprint file into the project.
8. Add users in Site members.
9. Assign users in Project members.

## Production notes

For real company use, upgrade Render's web service and database from free plans. Blueprint files are stored in PostgreSQL in this version. For very large blueprint sets, add cloud object storage later.
