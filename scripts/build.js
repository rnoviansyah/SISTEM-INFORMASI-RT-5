#!/usr/bin/env node
// ============================================================
// Build script for SISTEM INFORMASI RT 5 (static PWA).
// Produces the deployable static output in ./dist so it can be
// served by any static host (Freebuff hosting, GitHub Pages, ...).
//
// Semua file JS di-minify otomatis (terser) saat build:
//   - lebih ringan -> loading lebih cepat, &
//   - sulit dibaca manusia lewat F12 / View Source.
// Nama fungsi global TIDAK diubah (mangle toplevel = false) karena
// banyak dipakai di atribut onclick="..." pada index.html.
// ============================================================
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

// The app shell referenced by index.html + sw.js.
const ENTRIES = ['index.html', 'manifest.json', 'sw.js', 'js', 'img'];

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
  if (src.endsWith('.js')) {
    const code = fs.readFileSync(src, 'utf8');
    fs.writeFileSync(dest, await minifyJs(code, src));
  } else {
    fs.copyFileSync(src, dest);
  }
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

  // Hitung file JS di dist/ yang sudah ter-minify (1-3 baris).
  let minifiedCount = 0;
  const distJsDir = path.join(DIST, 'js');
  if (fs.existsSync(distJsDir)) {
    for (const f of fs.readdirSync(distJsDir)) {
      if (f.endsWith('.js')) {
        const lines = fs.readFileSync(path.join(distJsDir, f), 'utf8').split('\n').length;
        if (lines <= 3) minifiedCount++;
      }
    }
  }

  console.log('Static build output written to dist/');
  console.log('Contents: ' + fs.readdirSync(DIST).join(', '));
  console.log(`[build] JS ter-minify: ${minifiedCount} file (sulit dibaca & lebih ringan).`);
})();
