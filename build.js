const fs = require('fs');
const path = require('path');

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
