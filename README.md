# Project Control System

A standalone version of the Project Control & Follow-up Management System,
set up to run outside Claude with plain React + Vite.

## Run it locally

You need [Node.js](https://nodejs.org) 18 or newer installed.

```bash
npm install
npm run dev
```

Then open the URL it prints (usually `http://localhost:5173`).

## How data is saved

Inside Claude, this app used Claude's built-in `window.storage` API. That API
doesn't exist outside claude.ai, so `src/storage-shim.js` provides a drop-in
replacement backed by your browser's `localStorage` instead — same
get/set interface, so `App.jsx` didn't need to change.

This means:
- Data is saved **per browser, on one device**. It will not sync between
  your laptop and phone, or between Chrome and Firefox on the same machine.
- Clearing your browser's site data for this app will erase it.
- Use **Reports → Backup & restore** inside the app to download a JSON
  backup regularly, and to move data to another device or browser.

If you outgrow this later and want real multi-device sync, replace the shim
with calls to a small backend (even a free one like Supabase or Firebase)
that implements the same `get`/`set` interface — `App.jsx` itself wouldn't
need to change.

## Deploy it to GitHub Pages (free, just for you)

This project already includes a GitHub Actions workflow
(`.github/workflows/deploy.yml`) that builds and deploys automatically every
time you push to `main`.

1. Create a new repo on GitHub — call it whatever you like, e.g. `project-control-system`.
2. Open `vite.config.js` and change `"/project-control-system/"` to match
   your repo's actual name (must match exactly, including case).
3. Push this project to that repo:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```
4. On GitHub, go to **Settings → Pages**, and under "Source" pick
   **GitHub Actions**.
5. Push already triggered a build — check the **Actions** tab for progress.
   Once it's green, your site is live at:
   `https://<your-username>.github.io/<your-repo>/`
6. Any future `git push` to `main` re-deploys automatically.

Since it's just for you, this is genuinely a "set it up once and forget it"
setup — no separate hosting account needed, it's the same GitHub account
your code already lives in.

## Deploy it somewhere else (Vercel / Netlify)

```bash
npm run build
```

This produces a `dist/` folder of static files. Any static host works:

- **Vercel / Netlify**: drag-and-drop the `dist/` folder in their dashboard,
  or connect the repo and set the build command to `npm run build` and the
  output directory to `dist`.
- **Any static file server / S3 bucket / your own web server**: just serve
  the contents of `dist/`.

Once deployed, remember it's still one browser's `localStorage` per visitor —
there's no shared backend, so each person who opens the URL gets their own
independent copy of the data, not a shared team view. If you want a shared
team view, that's the point where you'd need a real backend and the storage
shim swap mentioned above.

## Project structure

```
index.html          entry HTML
src/main.jsx         mounts the app, loads the storage shim first
src/storage-shim.js   localStorage-backed replacement for window.storage
src/App.jsx           the whole application (unchanged from the Claude artifact)
```
