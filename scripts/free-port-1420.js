#!/usr/bin/env node
/**
 * Ensures nothing is listening on 1420 before `serve`, so Tauri devUrl and devCsp stay aligned.
 */
const { execSync } = require("child_process");

if (process.platform === "darwin" || process.platform === "linux") {
  try {
    const out = execSync("lsof -ti:1420", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    if (out) {
      for (const pid of out.split(/\n/).filter(Boolean)) {
        try {
          execSync(`kill -9 ${pid}`, { stdio: "ignore" });
        } catch (_) {}
      }
    }
  } catch (_) {
    /* no listener on 1420 */
  }
}
