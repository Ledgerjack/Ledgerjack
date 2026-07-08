# How to try the REAL LedgerJack app in a browser

The `.html` demo is only a look-and-feel mock-up. The real app is a React/Vite
project that has to be *built* before a browser can run it. Here are your options,
easiest first.

## Option A — StackBlitz (real app, in your browser, no install) ✅ recommended
StackBlitz builds and runs the real Vite app entirely inside a browser tab.
1. Put the project on GitHub (free):
   - Create a free account at github.com.
   - Make a new repository (e.g. "ledgerjack").
   - Upload the unzipped project files (GitHub's website has "Add file → Upload
     files"; you can drag the whole folder's contents in).
2. Open it in StackBlitz: go to `https://stackblitz.com/github/YOURNAME/ledgerjack`
   (replace with your username/repo).
3. StackBlitz runs `npm install` and starts the dev server automatically. The real
   app appears in the preview pane. This is the genuine app, not a mock-up.

CodeSandbox (codesandbox.io) works the same way — "Import from GitHub".

## Option B — Run locally (for a computer with developer tools)
1. Install Node.js (nodejs.org, the LTS version).
2. Unzip the project, open a terminal in the folder.
3. `npm install`  then  `npm run dev`
4. Open the printed address (usually http://localhost:5173).

## Option C — Deploy to a free host (a real public URL)
- Netlify or Cloudflare Pages can build from your GitHub repo and give you a live
  URL (build command `npm run build`, output folder `dist`).
- Or, on Thursday, deploy to your Hetzner server (see SERVER-ROADMAP.md).

## Honest heads-up
The app had never been built/run before this session, and running it for real is
the best way to surface remaining issues. Two serious bugs have already been found
and fixed by static analysis (a crypto vault bug and a backup build-breaker), but
expect a few more rough edges on first real run — that's normal and expected, and
exactly why seeing it live matters.
