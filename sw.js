const CACHE_VERSION = 'kahfi-v1';
const CACHE_NAME = `kahfi-shell-${CACHE_VERSION}`;
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
const NEVER_CACHE = [
  'supabase.co',
  'cdn.jsdelivr.net',
  'cdn.tailwindcss.com',
  'lh3.googleusercontent.com',
  'drive.google.com',
  'wa.me'
];
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
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  const shouldSkip = NEVER_CACHE.some(domain => url.includes(domain))
    || event.request.method !== 'GET'
    || url.startsWith('chrome-extension://')
    || url.includes('data:');
  if (shouldSkip) {
    event.respondWith(fetch(event.request));
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
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
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
    })
  );
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow('./');
    })
  );
});
