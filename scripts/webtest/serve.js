/**
 * Static server for the exported web build, with the two headers PeggyBank's
 * database cannot start without.
 *
 * expo-sqlite runs SQLite on the web as WebAssembly, and its worker channel
 * allocates a SharedArrayBuffer. Browsers only hand out SharedArrayBuffer to a
 * CROSS-ORIGIN ISOLATED page, which requires both headers below. Served without
 * them the page still loads and still looks fine -- and every database call
 * fails. That is precisely the failure a "the build succeeded" report misses.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', 'dist-web');
const PORT = Number(process.env.PORT || 8099);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/') rel = '/index.html';
  let file = path.join(ROOT, rel);

  // Single-page app: unknown paths fall back to index.html.
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(ROOT, 'index.html');
  }

  const headers = {
    'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
    // Without BOTH of these, crossOriginIsolated is false and WASM SQLite dies.
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Cache-Control': 'no-store',
  };
  res.writeHead(200, headers);
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, () => console.log('serving ' + ROOT + ' on http://localhost:' + PORT));
