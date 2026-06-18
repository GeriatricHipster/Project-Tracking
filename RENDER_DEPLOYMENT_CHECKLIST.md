# Render Deployment Checklist

Use this after uploading the project to GitHub.

## Render Blueprint

Choose:

```text
New + > Blueprint
```

Select your GitHub repository.

Render should read:

```text
render.yaml
```

## Environment variables created by render.yaml

```text
DATABASE_URL
JWT_SECRET
CLIENT_ORIGIN
NODE_ENV
APP_NAME
MAX_BLUEPRINT_BYTES
PGSSLMODE
```

You do not need to add email settings. The email invitation feature has been removed.

## After deploy

1. Open the Render URL.
2. Register your first real user.
3. Confirm the first user can see the **Site members** tab.
4. Create a project.
5. Add tasks.
6. Add project members.
7. Upload a blueprint.
8. Test the Project Milestones.
