const CACHE_VERSION = 'kahfi-v58';
const CACHE_NAME = `kahfi-shell-${CACHE_VERSION}`;
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  // Library lokal (v3.37): offline-first, tidak bergantung CDN
  './vendor/bootstrap.min.css',
  './vendor/bootstrap-icons.css',
  './vendor/tailwind.min.js',
  './vendor/bootstrap.bundle.min.js',
  './vendor/supabase.min.js',
  './vendor/xlsx.full.min.js',
  './vendor/jszip.min.js',
  './vendor/fonts/bootstrap-icons.woff2',
  './vendor/fonts/bootstrap-icons.woff',
  './css/dark-mode.css',
  './js/config/constants.js',
  './js/config/app_config.js',
  './js/helpers/data.js',
  './js/helpers/ui.js',
  './js/helpers/pagination.js',
  './js/services/supabase.js',
  './js/services/api.js',
  './js/services/realtime.js',
  './js/app.js',
  './js/auth.js',
  './js/badges.js',
  './js/table.js',
  './js/table_renderer.js',
  './js/settings.js',
  './js/dashboard.js',
  './js/profil.js',
  './js/warga.js',
  './js/iuran.js',
  './js/bansos.js',
  './js/pengaduan.js',
  './js/tanda_tangan.js',
  './js/surat_templates.js',
  './js/surat.js',
  './js/keuangan.js',
  './js/sumbangan.js',
  './js/aset.js',
  './js/aspirasi.js',
  './js/kelahiran.js',
  './js/kematian.js',
  './js/pindah_masuk.js',
  './js/pindah_keluar.js',
  './js/notifikasi.js'
];
const NEVER_CACHE = [
  'supabase.co',
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
          .filter((name) => (name.startsWith('rt05-') || name.startsWith('kahfi-')) && name !== CACHE_NAME)
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
  // Navigasi halaman: network-first agar update terbaru langsung tampil (PWA tidak nyangkut di cache lama)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then((networkResponse) => {
        const copy = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return networkResponse;
      }).catch(() => caches.match(event.request).then((r) => r || caches.match('./index.html')))
    );
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

// ============================================================
// NOTIFICATION CLICK HANDLER
// ============================================================
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

// ============================================================
// PUSH NOTIFICATION HANDLER
// ============================================================
self.addEventListener('push', function(event) {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Notifikasi Baru', body: event.data.text() };
    }
  }

  const options = {
    body: data.body || 'Ada informasi baru di RT 5',
    icon: './img/logo.webp',
    badge: './img/logo.webp',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || './',
      id: data.id || null
    },
    actions: [
      { action: 'open', title: 'Lihat Detail' },
      { action: 'close', title: 'Tutup' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || '📢 SISTEM INFORMASI RT 5', options)
  );
});

// Perbaiki handler klik notifikasi (dengan URL handling)
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'close') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        for (let client of clientList) {
          if (client.url && client.url.includes('index.html')) {
            return client.focus();
          }
        }
        return clients.openWindow(event.notification.data.url || './');
      })
  );
});