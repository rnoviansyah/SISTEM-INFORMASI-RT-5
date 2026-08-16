// ============================================================
// app.js (CORE — versi refactor modul)
// Bootstrap aplikasi: navigasi sidebar/sheet, PWA, penjaga menu RT.
// Logika lain sudah dipecah ke:
//   - js/config/      (constants, app_config)
//   - js/helpers/     (data, ui)
//   - js/services/    (supabase, api, realtime)
// Classic script — berbagi global scope dengan file JS lain.
// URUTAN LOAD di index.html WAJIB dijaga.
// ============================================================

function syncActiveNav(menu) {
  document.querySelectorAll('.sidebar a').forEach(el => el.classList.remove('active-menu'));
  var dEl = document.getElementById('dmenu-' + menu);
  if (dEl) {
    dEl.classList.add('active-menu');
    // Buka otomatis grup sidebar yang berisi menu aktif
    var grp = dEl.closest('.sidebar-group');
    if (grp) grp.classList.add('open');
  }
  document.querySelectorAll('.bottom-nav-item').forEach(el => el.classList.remove('active'));
  var mEl = document.getElementById('mmenu-' + menu);
  if (mEl) {
    mEl.classList.add('active');
  } else {
    // Menu yang berada di sheet "Lainnya" -> tandai tombol Lainnya aktif
    var lainnyaEl = document.getElementById('mmenu-Lainnya');
    if (lainnyaEl) lainnyaEl.classList.add('active');
  }
  document.querySelectorAll('.sheet-menu-item').forEach(el => el.classList.remove('active'));
  var sEl = document.getElementById('smenu-' + menu);
  if (sEl) sEl.classList.add('active');
}


// ============================================================
// MENU BADGES (ANGKA JUMLAH PER MENU) + GRUP SIDEBAR + SHEET
// ============================================================
function toggleSidebarGroup(headerEl) {
  const grp = headerEl.closest('.sidebar-group');
  if (grp) grp.classList.toggle('open');
}
window.toggleSidebarGroup = toggleSidebarGroup;

function bukaMenuLainnya() {
  const sheet = document.getElementById('menu-lainnya-sheet');
  if (sheet) sheet.classList.remove('hidden');
  updateMenuBadges();
}
window.bukaMenuLainnya = bukaMenuLainnya;

function tutupMenuLainnya() {
  const sheet = document.getElementById('menu-lainnya-sheet');
  if (sheet) sheet.classList.add('hidden');
}
window.tutupMenuLainnya = tutupMenuLainnya;

function pilihMenuLainnya(menu) {
  tutupMenuLainnya();
  loadMenu(menu);
}
window.pilihMenuLainnya = pilihMenuLainnya;

document.addEventListener("DOMContentLoaded", function() {
  // DAFTARKAN SERVICE WORKER (PWA: install di HP + offline shell).
  // Kesegearan cache dijaga oleh CACHE_VERSION di sw.js + cache-buster ?v=
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(function(err) {
      console.warn('Gagal mendaftarkan Service Worker:', err);
    });
  }

  applyAppSettingsUI();
  try {
    let fastLogo = localStorage.getItem('cached_app_logo');
    if (fastLogo) {
      document.querySelectorAll('.app-logo-img').forEach(img => { img.src = fastLogo; });
      if (typeof applyFavicon === 'function') applyFavicon(fastLogo);
    }
  } catch(e) {}
  loadAppSettings();
  checkExistingSession();
  document.addEventListener('submit', e => e.preventDefault());
  window.copySingleRek = function(nomor) {
    navigator.clipboard.writeText(nomor)
      .then(() => alert("Nomor " + nomor + " berhasil disalin!"))
      .catch(err => alert("Gagal menyalin: " + err));
  };
});

document.addEventListener("visibilitychange", function() {
  if (document.visibilityState === "visible" && session.token) fetchNotifikasi();
});

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btnInstall = document.getElementById('btn-install-pwa');
  if (btnInstall) btnInstall.style.display = 'block';
});

function installPWA() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(c => {
      if (c.outcome === 'accepted') {
        if (typeof showUIToast === 'function') showUIToast('Aplikasi berhasil dipasang di Layar Utama HP/Komputer!', 'success');
      }
      deferredPrompt = null;
    });
  } else {
    tampilkanModalPanduanInstallPWA();
  }
}

function tampilkanModalPanduanInstallPWA() {
  let modalEl = document.getElementById('modalPanduanPWA');
  if (!modalEl) {
    let div = document.createElement('div');
    div.innerHTML = `
      <div class="modal fade" id="modalPanduanPWA" tabindex="-1" aria-hidden="true" style="z-index: 1095;">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
            <div class="modal-header bg-primary text-white p-3">
              <h6 class="modal-title font-bold text-sm" id="modalPwaTitle"><i class="bi bi-download me-2"></i>Panduan Install / Install Ulang PWA</h6>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-4 text-start font-sans" id="modalPwaBody"></div>
            <div class="modal-footer bg-light p-2 text-center">
              <button type="button" class="btn btn-sm btn-primary font-bold px-4 rounded-2 w-100" data-bs-dismiss="modal">Mengerti</button>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(div.firstElementChild);
    modalEl = document.getElementById('modalPanduanPWA');
  }
  let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  let isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  let bodyHtml = '';
  if (isIOS) {
    bodyHtml = `
      <div class="text-xs space-y-2">
        <p class="fw-bold text-dark mb-2"><i class="bi bi-apple me-1 text-secondary"></i> Cara Install di iPhone / iPad (Safari):</p>
        <ol class="ps-3 text-muted space-y-1">
          <li>Buka website ini di browser <b>Safari</b>.</li>
          <li>Klik tombol <b>Bagikan / Share</b> (<i class="bi bi-box-arrow-up text-primary"></i> di navigasi Safari).</li>
          <li>Pilih menu <b>"Tambah ke Layar Utama" (Add to Home Screen)</b>.</li>
          <li>Klik <b>Tambah</b> di kanan atas.</li>
        </ol>
      </div>`;
  } else if (isMobile) {
    bodyHtml = `
      <div class="text-xs space-y-2">
        <p class="fw-bold text-dark mb-2"><i class="bi bi-android2 me-1 text-success"></i> Cara Install / Install Ulang di HP Android (Chrome):</p>
        <ol class="ps-3 text-muted space-y-1">
          <li>Klik menu <b>Titik Tiga (⋮)</b> di pojok kanan atas browser Chrome.</li>
          <li>Pilih opsi <b>"Tambahkan ke Layar Utama"</b> atau <b>"Install Aplikasi"</b>.</li>
          <li>Klik <b>Install / Tambah</b> untuk memasang kembali ikon aplikasi di HP Anda.</li>
        </ol>
      </div>`;
  } else {
    bodyHtml = `
      <div class="text-xs space-y-2">
        <p class="fw-bold text-dark mb-2"><i class="bi bi-display me-1 text-primary"></i> Cara Install / Install Ulang di Laptop / Komputer (Chrome/Edge):</p>
        <ol class="ps-3 text-muted space-y-1">
          <li>Lihat bagian kanan <b>Address Bar (URL)</b> di bagian atas browser.</li>
          <li>Klik ikon <b>Install ⊕</b> (atau ikon komputer kecil).</li>
          <li>Atau klik <b>Titik Tiga (⋮)</b> di kanan atas ➔ <b>"Simpan & Bagikan"</b> ➔ <b>"Install Aplikasi..."</b>.</li>
        </ol>
      </div>`;
  }
  document.getElementById('modalPwaBody').innerHTML = bodyHtml;
  let bsModal = new bootstrap.Modal(modalEl);
  bsModal.show();
}

// ============================================================
// SINKRON LABEL VERSI APLIKASI
// Teks versi di settings.js (render dinamis) diselaraskan otomatis agar
// selalu sesuai dengan cache-buster saat ini — satu sumber kebenaran di sini.
// ============================================================
const APP_VERSION_LABEL = 'v3.42';
function syncVersionLabel() {
  try {
    document.querySelectorAll('span.text-xxs').forEach(el => {
      let txt = el.textContent || '';
      if (txt.indexOf('Versi Aplikasi') > -1 && txt.indexOf(APP_VERSION_LABEL) === -1) {
        el.innerHTML = el.innerHTML.replace(/v3\.\d+/g, APP_VERSION_LABEL);
      }
    });
  } catch(e) {}
}

// ============================================================
// WATCHER / PENJAGA PERMANEN MENU RT & PENGATURAN
// ============================================================
async function enforceAdminMenuVisibility() {
  syncVersionLabel();
  let currentRole = await getValidUserRole();
  document.querySelectorAll('.rt-only').forEach(el => {
    if (currentRole === 'RT') {
      if (el.classList.contains('bottom-nav-item')) {
        el.style.setProperty('display', 'flex', 'important');
      } else if (el.matches('.sidebar a, .sheet-menu-item')) {
        el.style.setProperty('display', 'flex', 'important');
      } else {
        el.style.setProperty('display', 'block', 'important');
      }
    } else {
      el.style.setProperty('display', 'none', 'important');
    }
  });
  // Versi FREE: hapus pintu masuk menu premium + grup sidebar yang kosong.
  if (typeof applyTierUI === 'function') applyTierUI();
}

window.addEventListener('load', enforceAdminMenuVisibility);
setInterval(enforceAdminMenuVisibility, 3000);

console.log("%cMAU NGAPAIN LU? 🤨", "color:#ef4444;font-size:38px;font-weight:900;padding:10px;");
console.log("%cMending bayar iuran RT 5 daripada ngintipin console 🤣", "color:#2563eb;font-size:14px;font-weight:bold;");
