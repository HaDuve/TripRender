#!/usr/bin/env node
/**
 * Prepends rustup's bin dir to PATH so `cargo`/`rustc` come from rustup
 * (avoids older Homebrew Rust breaking Tauri builds).
 * Invokes the local CLI via `node …/tauri.js` (no shell) so device names like "iPhone 16" stay one argument.
 *
 * iOS / Xcode: `tauri ios xcode-script` reconnects to the WebSocket opened by `tauri ios dev` and
 * reapplies CLI options from that session (`read_options` → set_var), including PATH. If you change
 * this script or Rust toolchains, restart `npm run tauri:ios` so the cached options pick up the new PATH
 * (otherwise Xcode can keep using an old `cargo` and fail on Cargo.lock v4).
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const rustupBin = path.join(os.homedir(), ".cargo", "bin");
// Must run before ~/.cargo/bin: Tauri's iOS pipeline spawns `cargo` with a filtered env
// where RUSTUP_TOOLCHAIN is dropped; this shim forces `rustup run 1.88 cargo` (see scripts/ios-cargo/cargo).
const iosCargoShim = path.join(__dirname, "ios-cargo");
const newPath = `${iosCargoShim}${path.delimiter}${rustupBin}${path.delimiter}${process.env.PATH || ""}`;
const env = { ...process.env, PATH: newPath };

let args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node scripts/tauri-with-rustup.js <tauri CLI args>");
  process.exit(1);
}

// npm/sh often splits "iPhone 16" into two argv tokens; Tauri expects one DEVICE string.
if (args[0] === "ios" && args[1] === "dev" && args.length > 2) {
  const rest = args.slice(2);
  const flags = [];
  let i = 0;
  while (i < rest.length) {
    const a = rest[i];
    if (!a.startsWith("-")) break;
    flags.push(a);
    i += 1;
    const prev = flags[flags.length - 1];
    if (
      ["-c", "--config", "--host", "--port", "--root-certificate-path", "-f"].includes(
        prev
      ) &&
      rest[i] &&
      !rest[i].startsWith("-")
    ) {
      flags.push(rest[i]);
      i += 1;
    }
  }
  const positional = rest.slice(i);
  if (positional.length > 1) {
    args = ["ios", "dev", ...flags, positional.join(" ")];
  }
}

const tauriJs = path.join(
  __dirname,
  "..",
  "node_modules",
  "@tauri-apps",
  "cli",
  "tauri.js"
);
if (!fs.existsSync(tauriJs)) {
  console.error("Missing @tauri-apps/cli. Run: npm install");
  process.exit(1);
}

const r = spawnSync(process.execPath, [tauriJs, ...args], {
  env,
  stdio: "inherit",
});
process.exit(r.status !== null && r.status !== undefined ? r.status : 1);
