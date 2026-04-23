# Deploy Netlify + Render

This guide is written in tiny steps.

## What goes where

- Netlify = frontend website
- Render = backend PDF converter
- LibreOffice runs inside the Render backend Docker container

## Before you begin

You need:

- A GitHub account
- A Netlify account
- A Render account

## Part 1: Put the code on GitHub

1. Create a new repository on GitHub.
2. Upload this whole project to that repository.
3. Make sure the repo contains:
   - `src/...`
   - `backend/...`
   - `package.json`
   - `netlify.toml`

## Part 2: Create the Render backend

1. Go to https://render.com/
2. Click `Get Started`.
3. Sign up with GitHub if possible. That is the easiest path.
4. After login, open the Render dashboard.
5. Click `New`.
6. Click `Web Service`.
7. Choose `Build and deploy from a Git repository`.
8. Connect your GitHub account if Render asks for permission.
9. Pick your repository.

Now fill the service form like this:

- Name: `agreement-system-backend`
- Branch: your main branch
- Region: choose the nearest one to you
- Runtime: `Docker`
- Root Directory: `backend`

If Render asks for more settings:

- Dockerfile Path: leave default if it already sees `backend/Dockerfile`
- Health Check Path: `/api/health`

Environment variables to add:

- Key: `ALLOWED_ORIGIN`
- Value: `*`

Optional:

- Key: `CONVERSION_TIMEOUT_MS`
- Value: `120000`

Then:

1. Click `Create Web Service`.
2. Wait for deploy to finish.
3. Open the backend URL Render gives you.
4. Test this URL in the browser:

```text
https://YOUR-RENDER-URL.onrender.com/api/health
```

You want to see JSON like:

```json
{"ok":true,"converterAvailable":true,"converterPath":"/usr/bin/soffice"}
```

If `converterAvailable` is `false`, the deploy is not ready and you should check Render logs.

## Part 3: Create the Netlify frontend

1. Go to https://app.netlify.com/
2. Sign up or log in.
3. Click `Add new site`.
4. Click `Import an existing project`.
5. Choose `GitHub`.
6. Authorize Netlify if it asks.
7. Pick the same GitHub repository.

Netlify build settings:

- Base directory: leave empty
- Build command: `npm run build`
- Publish directory: `dist`

Before clicking deploy, add an environment variable:

- Key: `VITE_API_BASE_URL`
- Value: your Render backend URL

Example:

```text
https://agreement-system-backend.onrender.com
```

Then:

1. Click `Deploy site`.
2. Wait for Netlify to finish.

## Part 4: Connect frontend to backend

After Netlify deploy finishes:

1. Open the Netlify site.
2. Go to the app.
3. Try generating a PDF.

The frontend will call:

```text
https://YOUR-RENDER-URL.onrender.com/api/convert/docx-to-pdf
```

## Part 5: If you change the Render URL later

1. Open Netlify.
2. Open your site.
3. Go to `Site configuration`.
4. Go to `Environment variables`.
5. Edit `VITE_API_BASE_URL`.
6. Save.
7. Trigger a new deploy.

## Part 6: Final test list

1. Open Netlify site.
2. Upload a DOCX template.
3. Confirm placeholders are detected.
4. Fill the form.
5. Click `Generate PDF`.
6. Confirm the PDF is created.
7. Open Library.
8. Test:
   - Download PDF
   - Edit PDF
   - Delete PDF

## Very important storage note

Right now this app stores templates and PDFs in the browser using Dexie/IndexedDB.

That means:

- Data stays only in that browser
- Another browser or another computer will not see the same templates
- Clearing browser storage can remove the saved data

If you later want shared cloud data, we should add a real database such as Supabase.
