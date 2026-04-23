# Agreement System

This project is now split into two parts:

- Frontend: the Vite + React app in the repo root
- Backend: the LibreOffice PDF converter in [backend](./backend)

## Local development

Frontend:

```bash
npm install
npm run dev
```

Backend:

```bash
cd backend
npm install
npm run dev
```

You can also start the backend from the repo root after installing backend dependencies:

```bash
npm run server
```

## Production hosting

- Frontend target: Netlify
- Backend target: Render web service using the Dockerfile in [backend/Dockerfile](./backend/Dockerfile)

Before deploying the frontend, set:

```env
VITE_API_BASE_URL=https://your-render-service.onrender.com
```

Detailed baby-step hosting instructions are in [DEPLOY_NETLIFY_RENDER.md](./DEPLOY_NETLIFY_RENDER.md).

## Important note

Templates and generated PDFs are still stored in the browser with Dexie/IndexedDB. That means data is local to each browser/device unless you later move storage to a cloud database.
