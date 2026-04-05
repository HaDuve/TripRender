#!/usr/bin/env node
/**
 * Prepends rustup's bin dir to PATH so `cargo`/`rustc` come from rustup
 * (avoids older Homebrew Rust breaking Tauri builds).
 * Invokes the local CLI via `node …/tauri.js` (no shell) so device names like "iPhone 16" stay one argument.
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const rustupBin = path.join(os.homedir(), ".cargo", "bin");
const newPath = `${rustupBin}${path.delimiter}${process.env.PATH || ""}`;
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
