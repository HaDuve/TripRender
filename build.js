require('dotenv').config();

const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const token = process.env.MAPBOX_TOKEN;
if (!token) {
  console.error('MAPBOX_TOKEN env var required');
  process.exit(1);
}

const src = path.join(__dirname, 'index.html');
const out = path.join(__dirname, 'dist', 'index.html');
const html = fs.readFileSync(src, 'utf8').replace('__MAPBOX_TOKEN__', token);

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log('Built dist/index.html');

// Ensure static assets referenced by index.html are shipped.
const assetsSrcDir = path.join(__dirname, 'assets');
const assetsOutDir = path.join(__dirname, 'dist', 'assets');
if (fs.existsSync(assetsSrcDir)) {
  fs.mkdirSync(path.dirname(assetsOutDir), { recursive: true });
  fs.cpSync(assetsSrcDir, assetsOutDir, { recursive: true });
  console.log('Copied assets/ -> dist/assets/');
}

try {
  esbuild.buildSync({
    entryPoints: [path.join(__dirname, 'src', 'tauri-export.js')],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    outfile: path.join(__dirname, 'dist', 'tauri-bridge.js'),
    logLevel: 'info',
  });
  console.log('Built dist/tauri-bridge.js');
} catch (err) {
  console.error(err);
  process.exit(1);
}
