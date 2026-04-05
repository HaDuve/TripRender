#!/usr/bin/env node
/**
 * Bump iOS build number, build IPA, upload to App Store Connect.
 * Invoke with `npm run build:submit:ios` (runs `build:web` first). Tauri `beforeBuildCommand`
 * runs `build:web` again during `ios build`.
 *
 * Build number: Tauri CLI `--build-number` appends to the app version for CFBundleVersion
 * (see `tauri ios build --help`). Counter file `.ios-build-number` (gitignored) is updated
 * only after a successful upload so failed builds keep the same number on retry.
 *
 * https://v2.tauri.app/distribute/app-store/ (version / bundle.iOS.bundleVersion)
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = path.join(__dirname, "..");
const counterPath = path.join(root, ".ios-build-number");
const tauriWrapper = path.join(__dirname, "tauri-with-rustup.js");

require("dotenv").config({ path: path.join(root, ".env") });

/** Tauri `ios build --ci` expects APPLE_API_KEY + APPLE_API_KEY_PATH (not APPLE_API_KEY_ID). altool uses Key ID. Bridge + default p8 path. https://v2.tauri.app/distribute/sign/ios/ */
function bridgeAppleApiEnv() {
  const id = process.env.APPLE_API_KEY_ID || process.env.APPLE_API_KEY;
  if (id && !process.env.APPLE_API_KEY) process.env.APPLE_API_KEY = id;
  if (id && !process.env.APPLE_API_KEY_PATH) {
    const p = path.join(os.homedir(), "private_keys", `AuthKey_${id}.p8`);
    if (fs.existsSync(p)) process.env.APPLE_API_KEY_PATH = p;
  }
}

bridgeAppleApiEnv();

function readCounter() {
  if (!fs.existsSync(counterPath)) return 0;
  const n = parseInt(fs.readFileSync(counterPath, "utf8").trim(), 10);
  return Number.isNaN(n) ? 0 : n;
}

/** Next build number (last successful upload + 1), without writing yet. */
function peekNextBuildNumber() {
  return readCounter() + 1;
}

function writeCounter(n) {
  fs.writeFileSync(counterPath, String(n), "utf8");
}

function runIosBuild(buildNumber) {
  const env = { ...process.env };
  delete env.CI;
  const r = spawnSync(
    process.execPath,
    [
      tauriWrapper,
      "ios",
      "build",
      "--export-method",
      "app-store-connect",
      "--build-number",
      String(buildNumber),
    ],
    { cwd: root, stdio: "inherit", env }
  );
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function uploadWithoutExit() {
  const { uploadIpaToAsc } = require("./ios-submit.js");
  return uploadIpaToAsc({ exitProcess: false });
}

const buildNumber = peekNextBuildNumber();
console.error(
  `iOS build number for CFBundleVersion (Tauri --build-number): ${buildNumber}`
);

runIosBuild(buildNumber);

const uploadStatus = uploadWithoutExit();
if (uploadStatus !== 0) process.exit(uploadStatus);

writeCounter(buildNumber);
console.error(`Saved build number ${buildNumber} to .ios-build-number`);
