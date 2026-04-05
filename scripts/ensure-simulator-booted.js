#!/usr/bin/env node
/**
 * Boots the named iOS Simulator (if needed) and waits until it is ready.
 * Prevents `simctl install` failing with SimError 405 (device Shutdown).
 */
const { execSync, execFileSync } = require("child_process");

const deviceName = (process.argv[2] || "iPhone 16").trim();
if (!deviceName) {
  console.error("Usage: node scripts/ensure-simulator-booted.js [Simulator Name]");
  process.exit(1);
}

function listDevicesJson() {
  const out = execFileSync("xcrun", ["simctl", "list", "devices", "available", "-j"], {
    encoding: "utf8",
  });
  return JSON.parse(out);
}

function runtimeScore(runtimeKey) {
  const m = String(runtimeKey).match(/iOS-(\d+)-(\d+)/);
  if (!m) return 0;
  return parseInt(m[1], 10) * 100 + parseInt(m[2], 10);
}

function pickDeviceUdid(data, name) {
  const buckets = data.devices || {};
  const matches = [];
  for (const runtime of Object.keys(buckets)) {
    for (const d of buckets[runtime]) {
      if (d.name === name && d.isAvailable !== false) {
        matches.push({ ...d, runtime });
      }
    }
  }
  if (matches.length === 0) {
    throw new Error(
      `No available simulator named "${name}". Run: xcrun simctl list devices available`
    );
  }
  const booted = matches.find((m) => m.state === "Booted");
  if (booted) return booted.udid;
  // Prefer lowest OS runtime first — aligns with Tauri/xcodebuild often picking the 18.x simulator
  // when multiple devices share the same name (e.g. iPhone 16 @ 18.6 vs 26.x).
  matches.sort((a, b) => runtimeScore(a.runtime) - runtimeScore(b.runtime));
  return matches[0].udid;
}

try {
  const data = listDevicesJson();
  const udid = pickDeviceUdid(data, deviceName);
  console.log(`Ensuring simulator is booted: ${deviceName} (${udid})…`);
  execFileSync("xcrun", ["simctl", "bootstatus", udid, "-b"], { stdio: "inherit" });
  try {
    execSync("open -a Simulator", { stdio: "ignore" });
  } catch (_) {}
} catch (e) {
  console.error(e.message || e);
  process.exit(1);
}
