#!/usr/bin/env node
// ============================================================
// Preview / dev server for SISTEM INFORMASI RT 5 (static PWA).
// Zero dependencies — Node built-ins only. Binds to 0.0.0.0.
//
// The server binds to EVERY candidate port so the host's readiness
// probe always finds it, no matter which port the host injects via
// PORT env or passes on the CLI:
//   1. PORT env var (injected by the host)
//   2. CLI flags: -p 3000 / --port 3000 / --port=3000 / p 3000
//   3. 3000 (final fallback)
// Host resolution: -H x / --host x / HOST env / 0.0.0.0
// ============================================================
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const argv = process.argv.slice(2);

// Mode --dist: sajikan folder dist/ (hasil build) alih-alih source.
// Dipakai untuk preview versi FREE: `npm run build:free` lalu
// `npm run preview:free` (= node server.js --dist).
const DIST_MODE = argv.indexOf('--dist') !== -1;
const WEBROOT = DIST_MODE ? path.join(ROOT, 'dist') : ROOT;

function parseCliPort() {
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if ((a === '-p' || a === '--port') && i + 1 < argv.length) return argv[i + 1];
    if (a.startsWith('--port=')) return a.slice('--port='.length);
    // Tolerate a bare "p 3000" (some hosts pass the port this way).
    if (a === 'p' && i + 1 < argv.length && /^\d+$/.test(argv[i + 1])) return argv[i + 1];
  }
  return null;
}

function parseCliHost() {
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if ((a === '-H' || a === '--host' || a === '--hostname') && i + 1 < argv.length) return argv[i + 1];
    if (a.startsWith('--host=')) return a.slice('--host='.length);
  }
  return null;
}

const HOST = parseCliHost() || process.env.HOST || '0.0.0.0';

// ---- Load local env config so the preview works even when the host does
// not inject env vars. Tolerant of both KEY=VALUE and window.KEY='v' ;
// formats. Never overrides existing process.env.
function loadDotEnv(filePath) {
  const out = {};
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    return out;
  }
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) continue;
    const m = trimmed.match(/^(?:window\.)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let val = m[2].trim().replace(/;+\s*$/, '').trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (val !== '' && !(m[1] in process.env)) out[m[1]] = val;
  }
  return out;
}

const envFile =
  process.env.FB_ENV_FILE ||
  (fs.existsSync(path.join(ROOT, '.env')) ? path.join(ROOT, '.env') : path.join(ROOT, '.env.local'));
const dotenv = loadDotEnv(envFile);
for (const k of Object.keys(dotenv)) {
  if (!(k in process.env)) process.env[k] = dotenv[k];
}

// Keep the server alive even if a stray request throws (readiness probes etc).
process.on('uncaughtException', (err) => {
  console.error('[preview] uncaughtException (server tetap berjalan):', err && err.message ? err.message : err);
});
process.on('unhandledRejection', (err) => {
  console.error('[preview] unhandledRejection:', err && err.message ? err.message : err);
});

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.sql': 'text/plain; charset=utf-8',
};

function send(res, status, body, type) {
  res.writeHead(status, { 'Content-Type': type || 'text/plain; charset=utf-8' });
  res.end(body);
}

function serveIndex(res) {
  fs.readFile(path.join(WEBROOT, 'index.html'), (err, html) => {
    if (err) return send(res, 500, 'index.html not found (jalankan build dulu: npm run build / npm run build:free)');
    send(res, 200, html, MIME['.html']);
  });
}

function createAppServer() {
  const server = http.createServer((req, res) => {
    let urlPath;
    try {
      urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    } catch (e) {
      urlPath = '/';
    }

    // Config endpoint: env-driven (mirrors api/config.js on Vercel).
    // 404 when SUPABASE_URL/SUPABASE_KEY are not set; the app then shows a
    // clear notice on the login screen that the backend is not configured.
    if (urlPath === '/api/config') {
      const supabaseUrl = process.env.SUPABASE_URL || '';
      const supabaseKey = process.env.SUPABASE_KEY || '';
      if (!supabaseUrl || !supabaseKey) return send(res, 404, 'Not Found');
      return send(res, 200, JSON.stringify({ supabaseUrl, supabaseKey }), 'application/json; charset=utf-8');
    }

    // Static files.
    let filePath = path.normalize(path.join(WEBROOT, urlPath));
    if (urlPath.endsWith('/')) filePath = path.join(filePath, 'index.html');
    if (!filePath.startsWith(WEBROOT)) return send(res, 403, 'Forbidden');

    fs.stat(filePath, (err, stats) => {
      if (!err && stats.isDirectory()) filePath = path.join(filePath, 'index.html');
      fs.readFile(filePath, (readErr, data) => {
        if (readErr) {
          // SPA fallback: any unknown GET route (including health/readiness
          // probes) gets index.html so the preview is always reachable.
          if (req.method === 'GET' || req.method === 'HEAD') return serveIndex(res);
          return send(res, 404, 'Not Found');
        }
        const type = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
        return send(res, 200, data, type);
      });
    });
  });
  server.on('clientError', (err, socket) => {
    if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  });
  return server;
}

// ---- Bind every candidate port so the host probe always succeeds ----
const candidates = [];
function pushPort(p) {
  const n = Number(p);
  if (Number.isInteger(n) && n > 0 && n < 65536 && candidates.indexOf(n) === -1) candidates.push(n);
}
pushPort(process.env.PORT);
pushPort(parseCliPort());
pushPort(3000); // final fallback

let boundCount = 0;
function bindAll() {
  let idx = 0;
  function bindNext() {
    if (idx >= candidates.length) {
      if (boundCount === 0) {
        console.error('[preview] Tidak ada port yang bisa dipakai: ' + candidates.join(', '));
        process.exit(1);
      }
      return;
    }
    const port = candidates[idx++];
    // Bind on BOTH address families so the host's readiness probe succeeds
    // whether it connects via IPv4 (127.0.0.1) or IPv6 (::1). The IPv6 bind
    // is explicitly ipv6Only so it never conflicts with the IPv4 one.
    const hosts = HOST === '0.0.0.0' ? ['0.0.0.0', '::'] : [HOST];
    let hostIdx = 0;
    function attemptHost() {
      if (hostIdx >= hosts.length) {
        bindNext();
        return;
      }
      const host = hosts[hostIdx++];
      const server = createAppServer();
      server.on('error', () => {}); // swallow non-fatal errors after bind
      server.once('error', (err) => {
        console.warn(`[preview] ${host}:${port} tidak tersedia (${err.code})`);
        attemptHost();
      });
      const listenOpts =
        host === '::' ? [{ port: port, host: '::', ipv6Only: true }] : [port, host];
      server.listen(...listenOpts, () => {
        boundCount++;
        console.log(`SISTEM INFORMASI RT 5 preview server${DIST_MODE ? ' (dist/ — versi build)' : ' (source/dev)'} running at http://${host}:${port}`);
        attemptHost();
      });
    }
    attemptHost();
  }
  bindNext();
}
bindAll();
