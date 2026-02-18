# Mapbox Route App

Single-page route finder: enter "Place A to Place B", get driving directions on the map.

## Setup

1. Get a Mapbox token: [mapbox.com](https://account.mapbox.com/access-tokens/) → Create token
2. Add `MAPBOX_TOKEN` to GitHub repo secrets (Settings → Secrets and variables → Actions)

## Run locally

- **Option A:** Temporarily replace `__MAPBOX_TOKEN__` in `index.html` with your token, open in browser
- **Option B:** `MAPBOX_TOKEN=pk.your.token node build.js` then open `dist/index.html`

## Deploy to GitHub Pages

```bash
git init
git add .
git commit -m "Add Mapbox route app"
git branch -M main
git remote add origin https://github.com/HaDuve/mapbox-route-app.git
git push -u origin main
```

1. Add `MAPBOX_TOKEN` secret: Settings → Secrets and variables → Actions → New repository secret
2. Enable Pages: Settings → Pages → Build and deployment → Source: **GitHub Actions**
3. Push triggers deploy; site live in ~1 min

**Live URL:** `https://HaDuve.github.io/mapbox-route-app/`

## Deploy to Netlify

Set `MAPBOX_TOKEN` in Site settings → Environment variables. Build command: `node build.js`, publish directory: `dist`.
