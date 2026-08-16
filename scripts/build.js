#!/usr/bin/env node
// ============================================================
// Build script for SISTEM INFORMASI RT 5 (static PWA).
// Produces the deployable static output in ./dist so it can be
// served by any static host (Freebuff hosting, GitHub Pages, ...).
//
// Optimasi (v3.33):
//   1. SEMUA file JS lokal (js/*.js) digabung menjadi SATU bundle
//      (js/app.bundle.min.js) sesuai urutan load di index.html,
//      lalu di-minify sekali dengan terser.
//      -> 32 request HTTP menjadi 1 request (lebih cepat di HP/4G).
//   2. Nama fungsi global TIDAK diubah (mangle toplevel = false)
//      karena banyak dipakai di atribut onclick="..." pada index.html.
//   3. dist/index.html & dist/sw.js ditulis ulang agar memakai bundle,
//      dan file JS individual dihapus dari dist/.
//
// Tier build (v3.42):
//   npm run build           -> premium (semua fitur) — yang dijual ke pembeli
//   npm run build:free      -> free (menu premium TIDAK disertakan) — demo
//   node scripts/build.js --tier free
// window.APP_TIER disuntikkan; UI menyesuaikan di constants.js -> applyTierUI.
// ============================================================
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

// ============================================================
// TIER BUILD: premium (default) | free | trial
// ============================================================
const TIER = (function() {
  const i = process.argv.indexOf('--tier');
  const v = (i !== -1 && process.argv[i + 1]) ? String(process.argv[i + 1]).toLowerCase() : 'premium';
  return v === 'free' ? 'free' : 'premium';
})();
const isFree = TIER === 'free';

// Modul yang HANYA ada di versi premium (menu: Bansos, Keuangan, Sumbangan,
// Aset, SuratPengantar). Daftar ini harus sinkron dengan PREMIUM_MENUS di
// js/config/constants.js.
const PREMIUM_MODULES = [
  'js/bansos.js',
  'js/keuangan.js',
  'js/sumbangan.js',
  'js/aset.js',
  'js/surat.js',
  'js/surat_templates.js',
  'js/tanda_tangan.js'
];

// The app shell referenced by index.html + sw.js.
// 'vendor' = library lokal (v3.37) — disalin apa adanya, TIDAK di-minify ulang.
const ENTRIES = ['index.html', 'manifest.json', 'sw.js', 'js', 'img', 'vendor', 'css'];

const BUNDLE_REL = 'js/app.bundle.min.js';

async function minifyJs(code, file) {
  let Terser;
  try {
    Terser = require('terser');
  } catch (e) {
    console.warn(`[build] terser belum terinstall — ${path.basename(file)} disalin apa adanya. Jalankan "npm install" dulu.`);
    return code;
  }
  try {
    const out = await Terser.minify(code, {
      compress: true,
      mangle: { toplevel: false },
      format: { comments: false }
    });
    return out && out.code ? out.code : code;
  } catch (e) {
    console.warn(`[build] Minify gagal untuk ${path.basename(file)} (${e.message}) — disalin apa adanya.`);
    return code;
  }
}

async function copyEntry(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      await copyEntry(path.join(src, entry), path.join(dest, entry));
    }
    return;
  }
  if (src.endsWith('.js') && !src.includes(path.sep + 'vendor' + path.sep)) {
    // JS proyek di-minify; library vendor disalin apa adanya (sudah minified).
    const code = fs.readFileSync(src, 'utf8');
    fs.writeFileSync(dest, await minifyJs(code, src));
  } else {
    fs.copyFileSync(src, dest);
  }
}

// Urutan load JS lokal sesuai tag <script src="js/..."> di index.html.
function getLocalScriptOrder(html) {
  const re = /<script[^>]*src="(js\/[^"]+)"/g;
  const list = [];
  let m;
  while ((m = re.exec(html)) !== null) list.push(m[1].split('?')[0]);
  return list;
}

(async function main() {
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  for (const entry of ENTRIES) {
    const src = path.join(ROOT, entry);
    if (!fs.existsSync(src)) {
      console.warn(`[build] Skipping missing entry: ${entry}`);
      continue;
    }
    await copyEntry(src, path.join(DIST, entry));
  }

  // ---- BUNDLING: gabungkan semua JS lokal jadi 1 file ----
  const srcHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const scriptPaths = getLocalScriptOrder(srcHtml);

  // Versi free: buang modul premium dari bundle — kode fitur premium
  // benar-benar TIDAK ada di aplikasi gratis (tidak bisa diakali lewat konsol).
  const bundleScripts = isFree
    ? scriptPaths.filter(p => PREMIUM_MODULES.indexOf(p) === -1)
    : scriptPaths;

  let bundleCode = bundleScripts
    .map(p => {
      const src = path.join(ROOT, p);
      return fs.existsSync(src) ? fs.readFileSync(src, 'utf8') : '';
    })
    .join('\n;\n');

  if (isFree) {
    bundleCode = "window.APP_TIER='free';\n" + bundleCode;
  }

  const bundleDest = path.join(DIST, BUNDLE_REL);
  fs.mkdirSync(path.dirname(bundleDest), { recursive: true });
  fs.writeFileSync(bundleDest, await minifyJs(bundleCode, BUNDLE_REL));

  // Hapus file JS individual dari dist/js (sisakan bundle saja).
  const jsDir = path.join(DIST, 'js');
  if (fs.existsSync(jsDir)) {
    (function walkJs(dir) {
      for (const f of fs.readdirSync(dir)) {
        const full = path.join(dir, f);
        const st = fs.statSync(full);
        if (st.isDirectory()) walkJs(full);
        else if (full.endsWith('.js') && path.relative(DIST, full) !== BUNDLE_REL) fs.unlinkSync(full);
      }
    })(jsDir);
  }

  // ---- Tulis ulang dist/index.html: tag script lokal -> 1 tag bundle ----
  const distHtmlPath = path.join(DIST, 'index.html');
  let distHtml = fs.readFileSync(distHtmlPath, 'utf8');
  const version = (srcHtml.match(/[?&]v=([0-9.]+)/) || [])[1] || '3.33';
  const bundleTag = `<script src="${BUNDLE_REL}?v=${version}"></script>`;
  let inserted = false;
  distHtml = distHtml.replace(/<script[^>]*src="js\/[^"]*"[^>]*><\/script>/g, function(tag) {
    if (!inserted) { inserted = true; return bundleTag; }
    return '';
  });
  fs.writeFileSync(distHtmlPath, distHtml);

  // ---- Tulis ulang dist/sw.js: APP_SHELL hanya precache bundle ----
  // (pakai indexOf, bukan regex — versi minified boleh jadi deklarasi const digabung terser)
  const distSwPath = path.join(DIST, 'sw.js');
  let distSw = fs.readFileSync(distSwPath, 'utf8');
  const shellStart = distSw.indexOf('APP_SHELL=');
  const shellEnd = shellStart !== -1 ? distSw.indexOf('];', shellStart) : -1;
  if (shellStart !== -1 && shellEnd !== -1) {
    const newShell = `APP_SHELL=[\"./\",\"./index.html\",\"./manifest.json\",\"./vendor/bootstrap.min.css\",\"./vendor/bootstrap-icons.css\",\"./vendor/tailwind.min.js\",\"./vendor/bootstrap.bundle.min.js\",\"./vendor/supabase.min.js\",\"./vendor/xlsx.full.min.js\",\"./vendor/jszip.min.js\",\"./vendor/fonts/bootstrap-icons.woff2\",\"./vendor/fonts/bootstrap-icons.woff\",\"./css/dark-mode.css\",\"./${BUNDLE_REL}\"]`;
    distSw = distSw.slice(0, shellStart) + newShell + distSw.slice(shellEnd + 2);
    fs.writeFileSync(distSwPath, distSw);
  } else {
    console.warn('[build] GAGAL menulis ulang APP_SHELL di dist/sw.js — cek format service worker.');
  }

  // ---- Ringkasan ----
  const bundleBytes = fs.statSync(bundleDest).size;
  console.log(`[build] TIER: ${TIER.toUpperCase()}${isFree ? ` (modul premium di-exclude: ${PREMIUM_MODULES.length} file)` : ' (semua fitur, tanpa gate)'}`);
  console.log('Static build output written to dist/');
  console.log('Contents: ' + fs.readdirSync(DIST).join(', '));
  console.log(`[build] JS lokal digabung: ${bundleScripts.length} file -> 1 bundle (${BUNDLE_REL}, ${(bundleBytes / 1024).toFixed(1)} KB).`);
  console.log('[build] dist/index.html & dist/sw.js sudah memakai bundle (bukan file per-modul).');
})();
