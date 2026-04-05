# Mapbox Route App

Single-page route finder: enter "Place A to Place B", get driving directions on the map.

## Setup

1. Get a Mapbox token: [mapbox.com](https://account.mapbox.com/access-tokens/) → Create token
2. Add `MAPBOX_TOKEN` to GitHub repo secrets (Settings → Secrets and variables → Actions)

## Run locally

- **Option A:** Temporarily replace `__MAPBOX_TOKEN__` in `index.html` with your token, open in browser
- **Option B:** `MAPBOX_TOKEN=pk.your.token node build.js` then open `dist/index.html`

### Local build with saved token

1. Create `.env` in project root with:

   ```
   MAPBOX_TOKEN=pk.your.actual.token
   ```

   (`.env` is in `.gitignore` — don’t commit it.)

2. Fresh build:
   - **Node 20.6+:** `node --env-file=.env build.js`

3. Serve `dist`: e.g. `npx serve dist` or `cd dist && python3 -m http.server 8000`, then open the URL in the browser.

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

## Tauri (desktop + mobile)

Native shells use the same web UI (`index.html` → `dist/` after `build.js`). Prerequisites: [Node.js](https://nodejs.org/) LTS, [Rust via rustup](https://rustup.rs/) (this repo pins the toolchain in [`rust-toolchain.toml`](rust-toolchain.toml) — use **stable**, not an outdated Homebrew-only `cargo`). The `tauri:*` npm scripts run [`scripts/tauri-with-rustup.js`](scripts/tauri-with-rustup.js), which prepends `~/.cargo/bin` to `PATH` so Tauri uses rustup’s toolchain. You can also run `export PATH="$HOME/.cargo/bin:$PATH"` in your shell (or `brew unlink rust` if you use rustup instead of Homebrew’s Rust).

### Desktop

```bash
npm install
# Ensure .env contains MAPBOX_TOKEN (see above)
npm run tauri:dev
```

Release build (macOS example produces `.app` / `.dmg` under `src-tauri/target/release/bundle/`):

```bash
npm run tauri:build
```

### iOS and Android

Follow [Tauri prerequisites for mobile](https://v2.tauri.app/start/prerequisites/) (Xcode + CocoaPods on macOS for iOS; Android Studio + NDK + `ANDROID_HOME` for Android). Then:

```bash
npm run tauri:ios       # or: npx tauri ios dev
npm run tauri:ios:sim   # prefer Simulator (no Apple dev account required)
npm run tauri:android   # or: npx tauri android dev
```

Set your Apple **development team** for device/TestFlight builds (`bundle.iOS.developmentTeam` in Tauri config or `APPLE_DEVELOPMENT_TEAM`).

#### iOS release (TestFlight / App Store)

Use the Tauri CLI so the Rust build phase gets CLI options (do not rely on **Product → Archive** alone without a prior `tauri ios dev` / `tauri ios build`):

```bash
npm run tauri:ios:release
```

One-step **build + upload** (reads `.env` for API keys; `.env` stays gitignored — copy from [`.env.example`](.env.example)):

```bash
npm run build:submit:ios
```

Put `APPLE_API_KEY_ID` and `APPLE_API_ISSUER` in `.env` and keep `AuthKey_<KEY_ID>.p8` under `~/private_keys/` per [Tauri authentication](https://v2.tauri.app/distribute/app-store/#authentication).

IPA: `src-tauri/gen/apple/build/arm64/TripRender.ipa`. Manual upload: `xcrun altool` per the [Tauri App Store guide](https://v2.tauri.app/distribute/app-store/). **Xcode Cloud:** custom scripts live in [`src-tauri/gen/apple/ci_scripts/`](src-tauri/gen/apple/ci_scripts/) (same folder as `app.xcodeproj`, per [Apple](https://developer.apple.com/documentation/xcode/writing-custom-build-scripts)). Tune the workflow as follows:

- **Environment:** add `APPLE_API_KEY_ID` and `APPLE_API_ISSUER` (and install the `.p8` key where `altool` expects it — see [Tauri App Store / Authentication](https://v2.tauri.app/distribute/app-store/)). Optional: `CI=true` if your tooling needs it; avoid numeric `CI=1` for the Tauri CLI (`ci_pre_xcodebuild.sh` clears `CI` for the `node … ios build` step).
- **Actions (Pattern 1):** `ci_pre_xcodebuild.sh` runs the full `tauri ios build` (Strategy A). If the workflow also runs a separate **Archive** action, you may compile twice — remove the redundant archive step or accept the duplicate work ([workflow actions](https://developer.apple.com/documentation/Xcode/Configuring-Your-Xcode-Cloud-Workflow-s-Actions)).
- **Variables:** `CI_PRIMARY_REPOSITORY_PATH` and `CI_XCODEBUILD_ACTION` are set by Xcode Cloud ([reference](https://developer.apple.com/documentation/xcode/environment-variable-reference)).

#### iOS troubleshooting (physical device)

If `tauri ios dev` fails against a **connected iPhone**, typical causes match the Xcode error text:

1. **Developer Disk Image / “device is not available”** — Unlock the phone, trust this Mac, enable **Developer Mode** (Settings → Privacy & Security on iOS 16+). Keep the device awake while Xcode attaches.
2. **“No Accounts” / no provisioning profile for `com.triprender.routefinder`** — In **Xcode → Settings → Accounts**, sign in with your Apple ID. Open `src-tauri/gen/apple/` in Xcode → target **Signing & Capabilities** → enable **Automatically manage signing** and pick your team (same as `bundle.iOS.developmentTeam`).
3. **“iOS xx.x is not installed” (Components)** — The phone’s iOS version needs a matching **device support** / platform in Xcode. Install it under **Xcode → Settings → Platforms** (or **Components** on older Xcode). Alternatively use **`npm run tauri:ios:sim`** and pick a simulator name that exists (`xcrun simctl list devices available`). Change the device name in `package.json` if you don’t have an “iPhone 16” simulator.

### CI: Windows installer

Workflow [`.github/workflows/tauri-windows.yml`](.github/workflows/tauri-windows.yml) builds on `windows-latest` and uploads `src-tauri/target/release/bundle/` as an artifact. Configure the **`MAPBOX_TOKEN`** secret (same as Pages deploy).

### Store signing (when you ship)

- [macOS / iOS code signing](https://v2.tauri.app/distribute/sign/macos/) · [iOS](https://v2.tauri.app/distribute/sign/ios/)
- [Windows](https://v2.tauri.app/distribute/sign/windows/)
- [Android](https://v2.tauri.app/distribute/sign/android/)

Tauri 2 supports desktop and mobile from one web frontend; see the [Tauri 2.0 announcement](https://v2.tauri.app/blog/tauri-20/) for context.
