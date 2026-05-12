#!/usr/bin/env node
/**
 * Store-first release version bump.
 * - Updates root `version` in src-tauri/tauri.conf.json (marketing / CFBundleShortVersionString / Android versionName).
 * - If `bundle.android.versionCode` is set explicitly, increments it (otherwise Tauri derives versionCode from semver).
 * - iOS build number stays on `npm run build:submit:ios` (--build-number).
 *
 * Usage:
 *   node scripts/bump-version.js [patch|minor|major]
 *   npm run version:bump -- minor
 *
 * Always syncs package.json + Cargo.toml [package] version + package-lock (`npm install --package-lock-only`).
 * Bump level is taken from `src-tauri/tauri.conf.json` `version` (source of truth).
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.join(__dirname, "..");
const tauriConfPath = path.join(root, "src-tauri", "tauri.conf.json");
const packageJsonPath = path.join(root, "package.json");
const cargoPath = path.join(root, "src-tauri", "Cargo.toml");

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

function parseArgs(argv) {
  const pos = [];
  for (const a of argv.slice(2)) {
    if (a === "--sync-npm") {
      console.error(
        "Note: --sync-npm is no longer needed; npm/package/Cargo sync always runs. Ignoring flag."
      );
      continue;
    }
    if (a.startsWith("-")) {
      console.error(`Unknown option: ${a}`);
      process.exit(1);
    } else pos.push(a);
  }
  const level = pos[0] || "patch";
  if (!["patch", "minor", "major"].includes(level)) {
    console.error("Usage: node scripts/bump-version.js [patch|minor|major]");
    process.exit(1);
  }
  return { level };
}

function parseSemver(s) {
  const m = String(s).trim().match(SEMVER);
  if (!m) {
    console.error(`Invalid semver (need x.y.z): ${JSON.stringify(s)}`);
    process.exit(1);
  }
  return { major: +m[1], minor: +m[2], patch: +m[3] };
}

function bumpSemver(v, level) {
  const { major, minor, patch } = parseSemver(v);
  if (level === "major") return `${major + 1}.0.0`;
  if (level === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function writeJson(p, obj) {
  fs.writeFileSync(p, `${JSON.stringify(obj, null, 2)}\n`, "utf8");
}

function readPackageVersion() {
  return readJson(packageJsonPath).version;
}

function readCargoPackageVersion() {
  const text = fs.readFileSync(cargoPath, "utf8");
  let inPackage = false;
  for (const line of text.split("\n")) {
    if (/^\s*\[package\]\s*$/.test(line)) inPackage = true;
    else if (/^\s*\[/.test(line)) inPackage = false;
    else if (inPackage) {
      const m = line.match(/^version\s*=\s*"([^"]*)"\s*$/);
      if (m) return m[1];
    }
  }
  throw new Error("Could not find [package] version in Cargo.toml");
}

function setCargoPackageVersion(newVersion) {
  const lines = fs.readFileSync(cargoPath, "utf8").split("\n");
  let inPackage = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*\[package\]\s*$/.test(line)) inPackage = true;
    else if (/^\s*\[/.test(line)) inPackage = false;
    else if (inPackage) {
      if (/^version\s*=\s*"[^"]*"\s*$/.test(line)) {
        lines[i] = `version = "${newVersion}"`;
        fs.writeFileSync(cargoPath, lines.join("\n"), "utf8");
        return;
      }
    }
  }
  throw new Error("Could not find [package] version line in Cargo.toml");
}

function main() {
  const { level } = parseArgs(process.argv);

  const cfg = readJson(tauriConfPath);
  if (typeof cfg.version !== "string" || !cfg.version.trim()) {
    console.error("tauri.conf.json: missing top-level string `version`");
    process.exit(1);
  }

  const current = cfg.version.trim();
  const next = bumpSemver(current, level);

  const pkgV = readPackageVersion();
  const cargoV = readCargoPackageVersion();
  if (pkgV !== current || cargoV !== current) {
    console.error(
      `Note: versions were out of sync with tauri.conf.json (${current}); aligning to ${next} after bump.`
    );
    console.error(`  package.json was ${pkgV}, Cargo.toml was ${cargoV}`);
  }

  cfg.version = next;
  const android = cfg.bundle && cfg.bundle.android;
  if (android && typeof android.versionCode === "number") {
    const n = android.versionCode + 1;
    if (n > 2100000000) {
      console.error("bundle.android.versionCode would exceed Play Store max");
      process.exit(1);
    }
    cfg.bundle.android.versionCode = n;
    console.error(`Also bumped bundle.android.versionCode -> ${n}`);
  } else {
    console.error(
      "Android: using Tauri default versionCode from semver (no explicit bundle.android.versionCode)."
    );
  }

  writeJson(tauriConfPath, cfg);
  console.error(`tauri.conf.json version: ${current} -> ${next}`);

  const pkg = readJson(packageJsonPath);
  pkg.version = next;
  writeJson(packageJsonPath, pkg);
  setCargoPackageVersion(next);
  console.error(`Synced package.json + Cargo.toml -> ${next}`);

  const r = spawnSync("npm", ["install", "--package-lock-only"], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

main();
