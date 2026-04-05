#!/usr/bin/env node
/**
 * `tauri ios build --export-method app-store-connect` with env safe for local signing.
 * @see scripts/ios-xcode-sign-env.js
 */
const { spawnSync } = require("child_process");
const path = require("path");
const { envForLocalXcodeSigning } = require("./ios-xcode-sign-env");

const root = path.join(__dirname, "..");
const wrapper = path.join(__dirname, "tauri-with-rustup.js");

const extra = process.argv.slice(2);
const args = [
  wrapper,
  "ios",
  "build",
  "--export-method",
  "app-store-connect",
  ...extra,
];

const r = spawnSync(process.execPath, args, {
  cwd: root,
  stdio: "inherit",
  env: envForLocalXcodeSigning(),
});

process.exit(r.status !== null && r.status !== undefined ? r.status : 1);
