#!/usr/bin/env node
/**
 * Uploads the arm64 IPA to App Store Connect via altool (API key auth).
 * Expects APPLE_API_KEY_ID and APPLE_API_ISSUER in the environment.
 * Load from .env:  node --env-file=.env scripts/ios-submit.js
 *
 * https://v2.tauri.app/distribute/app-store/
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const tauriConfPath = path.join(root, "src-tauri", "tauri.conf.json");

function readProductName() {
  const raw = fs.readFileSync(tauriConfPath, "utf8");
  const j = JSON.parse(raw);
  const name = j.productName;
  if (!name || typeof name !== "string") {
    throw new Error("Missing productName in src-tauri/tauri.conf.json");
  }
  return name;
}

const keyId = process.env.APPLE_API_KEY_ID;
const issuer = process.env.APPLE_API_ISSUER;

if (!keyId || !issuer) {
  console.error(
    "Missing APPLE_API_KEY_ID or APPLE_API_ISSUER. Add them to .env (gitignored) — see .env.example"
  );
  process.exit(1);
}

const productName = readProductName();
const ipa = path.join(
  root,
  "src-tauri",
  "gen",
  "apple",
  "build",
  "arm64",
  `${productName}.ipa`
);

if (!fs.existsSync(ipa)) {
  console.error(`IPA not found: ${ipa}\nRun: npm run tauri:ios:release`);
  process.exit(1);
}

const r = spawnSync(
  "xcrun",
  [
    "altool",
    "--upload-app",
    "--type",
    "ios",
    "--file",
    ipa,
    "--apiKey",
    keyId,
    "--apiIssuer",
    issuer,
  ],
  { stdio: "inherit", env: process.env }
);

process.exit(
  r.status !== null && r.status !== undefined ? r.status : 1
);
