// ============================================================
// SERVICE WORKER - SI RT 05 | Cache First Strategy
// ============================================================
const CACHE_VERSION = 'rt05-v3';
const CACHE_NAME = `rt05-shell-${CACHE_VERSION}`;

// File app shell yang di-cache saat install
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './js/app.js',
  './js/dashboard.js',
  './js/profil.js',
  './js/warga.js',
  './js/iuran.js',
  './js/pengaduan.js',
  './js/surat.js',
  './js/keuangan.js',
  './js/sumbangan.js',
  './js/aset.js',
  './js/aspirasi.js',
  './js/kelahiran.js',
  './js/kematian.js',
  './js/pindah_masuk.js',
  './js/pindah_keluar.js'
];

// URL yang TIDAK di-cache (Supabase API & CDN dinamis)
const NEVER_CACHE = [
  'supabase.co',
  'cdn.jsdelivr.net',
  'cdn.tailwindcss.com',
  'aiquickdraw.com',
  'lh3.googleusercontent.com',
  'drive.google.com',
  'wa.me'
];

// ============================================================
// INSTALL: Cache app shell
// ============================================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(APP_SHELL).catch((err) => {
          console.warn('[SW] Gagal cache beberapa file:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// ============================================================
// ACTIVATE: Hapus cache lama
// ============================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('rt05-') && name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Hapus cache lama:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// ============================================================
// FETCH: Strategi berdasarkan jenis request
// ============================================================
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Jangan cache request ke Supabase API, CDN eksternal, atau non-GET
  const shouldSkip = NEVER_CACHE.some(domain => url.includes(domain))
    || event.request.method !== 'GET'
    || url.startsWith('chrome-extension://')
    || url.includes('data:');

  if (shouldSkip) {
    event.respondWith(fetch(event.request));
    return;
  }

  // CACHE FIRST: Untuk app shell (JS, HTML lokal)
  // Coba cache dulu, jika tidak ada baru fetch network
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Perbarui cache di background (stale-while-revalidate)
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse;
      }

      // Tidak ada di cache, fetch dari network dan simpan
      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'opaque') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback: kembalikan index.html untuk navigasi
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
    })
  );
});
