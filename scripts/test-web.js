#!/usr/bin/env node
/**
 * Build dist/, serve on 1420, open the default browser when ready.
 * Ctrl+C stops the server.
 */
const http = require("http");
const { spawn, execSync } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");
const port = 1420;
const url = `http://127.0.0.1:${port}`;

function run(cmd, args, opts = {}) {
  const r = spawn(cmd, args, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
    ...opts,
  });
  return new Promise((resolve, reject) => {
    r.on("error", reject);
    r.on("exit", (code, signal) => {
      if (signal || code !== 0) {
        reject(
          Object.assign(new Error(`${cmd} exited`), { code, signal }),
        );
      } else resolve();
    });
  });
}

function waitForServer(timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    function ping() {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() > deadline) {
          reject(new Error(`Server did not respond at ${url}`));
        } else {
          setTimeout(ping, 150);
        }
      });
    }
    ping();
  });
}

function openDefaultBrowser() {
  if (process.platform === "darwin") {
    execSync(`open "${url}"`, { stdio: "ignore" });
  } else if (process.platform === "win32") {
    execSync(`start "" "${url}"`, { stdio: "ignore", shell: true });
  } else {
    execSync(`xdg-open "${url}"`, { stdio: "ignore" });
  }
}

async function main() {
  execSync("node scripts/free-port-1420.js", {
    cwd: root,
    stdio: "inherit",
  });
  await run(process.platform === "win32" ? "npm.cmd" : "npm", [
    "run",
    "build:web",
  ]);

  const serve = spawn(
    "npx",
    ["--yes", "serve", "dist", "-l", String(port)],
    {
      cwd: root,
      stdio: "inherit",
      env: process.env,
      shell: process.platform === "win32",
    },
  );

  serve.on("error", (err) => {
    console.error(err);
    process.exit(1);
  });

  const shutdown = () => {
    if (serve.pid && !serve.killed) {
      serve.kill("SIGTERM");
    }
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  try {
    await waitForServer();
    openDefaultBrowser();
  } catch (e) {
    console.error(e.message || e);
    shutdown();
    process.exit(1);
  }

  await new Promise((resolve) => {
    serve.on("exit", (code, signal) => {
      resolve(code ?? (signal ? 1 : 0));
    });
  }).then((code) => process.exit(code));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
