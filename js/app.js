// ============================================================
// Developed by Rizky Noviansyah
// APP.JS - VERSION 4.0 (Refactored)
// ============================================================

import { getDbInstance, setConfig, safeSupabaseSelect, safeSupabaseInsert, safeSupabaseUpdate, safeSupabaseDelete } from './core/db.js';
import { getSession, setSession, clearSession, loadSessionFromStorage, verifySessionToken } from './core/session.js';
import { showUIToast, showUIConfirm, setBtnLoading } from './helpers/uiHelper.js';
import { sanitizeFormData, compressImageFile, convertToImageLink, extractStoragePathFromUrl, cariNilaiKolom } from './helpers/formHelper.js';
import { renderTable, filterTableData } from './helpers/tableHelper.js';

// ============================================================
// GLOBAL VARIABLES
// ============================================================
let SUPABASE_URL = window.SUPABASE_URL || '';
let SUPABASE_KEY = window.SUPABASE_KEY || '';
let currentActiveMenu = '';
let currentHeaders = [];
let currentRows = [];
let editingId = null;
let editingNik = null;
let bootstrapModalInstance = null;
let bootstrapImageModalInstance = null;
let bootstrapNotifModalInstance = null;
let rawNotifData = [];
let notifTimer = null;
let menuDataCache = {};
const MENU_CACHE_TTL = 30000;
let appSettings = {
  app_title: 'SISTEM INFORMASI RT 5',
  app_short_name: 'RT 5',
  app_subtitle: 'Layanan Digital RT 05 / RW 01 • Transparan & Efisien',
  rt_rw_text: 'RT 05 / RW 01',
  nama_kelurahan: 'Kelurahan Palmerah, Kota Jakarta Barat',
  alamat_rt: 'Jl. Lingkungan RT 05 / RW 01',
  app_logo: './img/logo.webp',
  app_theme: 'blue',
  app_theme_color: '#1e3a8a',
  nama_sekretaris: 'Sekretaris RT 05',
  nama_rt_ketua: 'Ketua RT 05',
  ttd_sekretaris: '',
  ttd_ketua_rt: '',
  payment_rekening: JSON.stringify([
    { bank: 'DANA', no: '08973366667', an: 'RIZKY NOVIANSYAH' },
    { bank: 'BRI', no: '231313', an: 'RIZKY NOVIANSYAH' }
  ]),
  payment_qris_string: '00020101021126570011ID.DANA.WWW011893600915311093669202091109366920303UKE51440014ID.CO.QRIS.WWW0215ID10210624013640303UKE5204899953033605802ID5909SHN GROUP6010Kab. Bogor6105163206304BAFC',
  payment_qris_name: 'RT 5 / RW 01',
  payment_qris: '',
  info_warga: '',
  gemini_api_key: ''
};

let session = getSession();

// ============================================================
// INITIALIZATION
// ============================================================
async function initBackendConfig() {
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const data = await res.json();
      if (data.supabaseUrl && data.supabaseKey) {
        SUPABASE_URL = data.supabaseUrl;
        SUPABASE_KEY = data.supabaseKey;
        setConfig(SUPABASE_URL, SUPABASE_KEY);
        return true;
      }
    }
  } catch (e) {
    console.warn("Could not fetch /api/config:", e);
  }
  return false;
}

async function loadAppSettings() {
  try {
    const { data } = await safeSupabaseSelect('Pengaturan', session.token);
    if (data && data.length > 0) {
      data.forEach(row => {
        let k = row.kunci || cariNilaiKolom(row, ['kunci', 'key']);
        let v = row.nilai !== null && row.nilai !== undefined ? row.nilai : cariNilaiKolom(row, ['nilai', 'value']);
        if (k) appSettings[k] = v;
      });
      try {
        localStorage.setItem('rt_app_settings_cache', JSON.stringify(appSettings));
      } catch(e) {}
    }
    applyAppSettingsUI();
  } catch(e) {
    console.error('Gagal memuat pengaturan:', e);
    applyAppSettingsUI();
  }
}

function applyAppSettingsUI() {
  if (appSettings.app_title) {
    document.title = appSettings.app_title;
    ['login-app-title', 'mob-app-title', 'sidebar-app-title'].forEach(id => {
      let el = document.getElementById(id);
      if (el) el.innerText = appSettings.app_title;
    });
  }
  if (appSettings.app_subtitle) {
    ['login-app-subtitle', 'mob-app-subtitle'].forEach(id => {
      let el = document.getElementById(id);
      if (el) el.innerHTML = `<small>${appSettings.app_subtitle}</small>`;
    });
  }
  if (appSettings.app_logo) {
    try { localStorage.setItem('cached_app_logo', appSettings.app_logo); } catch(e) {}
    document.querySelectorAll('.app-logo-img').forEach(img => {
      img.src = appSettings.app_logo;
    });
    applyFavicon(appSettings.app_logo);
  }
  applyTheme(appSettings.app_theme || 'blue', appSettings.app_theme_color);
  updateDynamicManifest();
}

function applyTheme(themeName, customHex = null) {
  let primaryColor = customHex || appSettings.app_theme_color || '#1e3a8a';
  let secondaryColor = '#3b82f6';
  let lightColor = '#eff6ff';
  let gradientEnd = '#2563eb';

  const themePresets = {
    blue: { primary: '#1e3a8a', secondary: '#3b82f6', light: '#eff6ff', end: '#2563eb' },
    emerald: { primary: '#065f46', secondary: '#10b981', light: '#ecfdf5', end: '#059669' },
    indigo: { primary: '#3730a3', secondary: '#6366f1', light: '#eef2ff', end: '#4f46e5' },
    purple: { primary: '#581c87', secondary: '#a855f7', light: '#faf5ff', end: '#9333ea' },
    dark: { primary: '#0f172a', secondary: '#64748b', light: '#1e293b', end: '#334155' }
  };

  if (themePresets[themeName]) {
    primaryColor = themePresets[themeName].primary;
    secondaryColor = themePresets[themeName].secondary;
    lightColor = themePresets[themeName].light;
    gradientEnd = themePresets[themeName].end;
  }

  document.documentElement.style.setProperty('--primary-blue', primaryColor);
  document.documentElement.style.setProperty('--secondary-blue', secondaryColor);
  document.documentElement.style.setProperty('--light-blue', lightColor);

  let styleId = 'dynamic-app-theme-style';
  let styleEl = document.getElementById(styleId);
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  styleEl.innerHTML = `
    :root {
      --primary-blue: ${primaryColor} !important;
      --secondary-blue: ${secondaryColor} !important;
      --light-blue: ${lightColor} !important;
    }
    .mobile-header, .sidebar, .bg-blue-900, .bg-blue-800, .bg-blue-700 {
      background-color: ${primaryColor} !important;
    }
    .bg-blue-600 {
      background-color: ${gradientEnd} !important;
    }
    .btn-primary, .bg-primary {
      background-color: ${primaryColor} !important;
      border-color: ${primaryColor} !important;
    }
    .text-primary, .text-blue-600, .text-blue-700, .text-blue-800, .text-blue-900 {
      color: ${primaryColor} !important;
    }
    .border-primary, .border-blue-600 {
      border-color: ${primaryColor} !important;
    }
    .bg-blue-50, .bg-blue-100 {
      background-color: ${lightColor} !important;
    }
    .bg-gradient-to-r.from-blue-900, .bg-gradient-to-r.from-blue-800 {
      background-image: linear-gradient(to right, ${primaryColor}, ${gradientEnd}) !important;
    }
  `;

  let meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = primaryColor;
}

function applyFavicon(url) {
  try {
    if (!url) return;
    let link = document.querySelector('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = url;
    let apple = document.querySelector('link[rel="apple-touch-icon"]');
    if (apple) apple.href = url;
  } catch(e) {}
}

function updateDynamicManifest() {
  try {
    let baseUrl = window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
    let absStartUrl = baseUrl + 'index.html';
    let absScope = baseUrl;
    let logoUrl = appSettings.app_logo || './img/logo.jpg';
    let mimeType = 'image/jpeg';
    if (logoUrl.startsWith('data:image/png')) mimeType = 'image/png';
    else if (logoUrl.startsWith('data:image/jpeg') || logoUrl.startsWith('data:image/jpg')) mimeType = 'image/jpeg';
    else if (logoUrl.endsWith('.png')) mimeType = 'image/png';
    else if (logoUrl.endsWith('.jpg') || logoUrl.endsWith('.jpeg')) mimeType = 'image/jpeg';
    else if (logoUrl.endsWith('.webp')) mimeType = 'image/webp';
    
    let manifestData = {
      name: appSettings.app_title || 'SISTEM INFORMASI RT 5',
      short_name: appSettings.app_short_name || 'RT 5',
      description: appSettings.app_subtitle || 'Layanan Digital RT 05 / RW 01 • Transparan & Efisien',
      start_url: absStartUrl,
      scope: absScope,
      display: 'standalone',
      orientation: 'portrait-primary',
      background_color: '#ffffff',
      theme_color: appSettings.app_theme_color || '#1e3a8a',
      lang: 'id',
      icons: [
        {
          src: logoUrl,
          sizes: '192x192',
          type: mimeType,
          purpose: 'any maskable'
        },
        {
          src: logoUrl,
          sizes: '512x512',
          type: mimeType,
          purpose: 'any maskable'
        }
      ]
    };
    let manifestStr = JSON.stringify(manifestData);
    let blob = new Blob([manifestStr], { type: 'application/manifest+json' });
    let manifestUrl = URL.createObjectURL(blob);
    let existingLink = document.querySelector('link[rel="manifest"]');
    if (existingLink) {
      existingLink.href = manifestUrl;
    } else {
      let link = document.createElement('link');
      link.rel = 'manifest';
      link.href = manifestUrl;
      document.head.appendChild(link);
    }
    let themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) themeColorMeta.content = appSettings.app_theme_color || '#1e3a8a';
  } catch(e) {
    console.warn('[PWA] Gagal update manifest dinamis:', e);
  }
}

// ============================================================
// LOAD MENU
// ============================================================
function syncActiveNav(menu) {
  document.querySelectorAll('.sidebar a').forEach(el => el.classList.remove('active-menu'));
  var dEl = document.getElementById('dmenu-' + menu);
  if (dEl) dEl.classList.add('active-menu');
  document.querySelectorAll('.bottom-nav-item').forEach(el => el.classList.remove('active'));
  var mEl = document.getElementById('mmenu-' + menu);
  if (mEl) mEl.classList.add('active');
  else {
    var lainnyaEl = document.getElementById('mmenu-Lainnya');
    if (lainnyaEl) lainnyaEl.classList.add('active');
  }
  document.querySelectorAll('.sheet-menu-item').forEach(el => el.classList.remove('active'));
  var sEl = document.getElementById('smenu-' + menu);
  if (sEl) sEl.classList.add('active');
}

async function loadMenu(menu) {
  if (session.token) {
    let isSessionValid = await verifySessionToken(getDbInstance());
    if (!isSessionValid) return;
  }
  currentActiveMenu = menu;
  syncActiveNav(menu);
  document.getElementById('page-title').innerText = menu === 'Dashboard' ? 'Dashboard Utama' : menu;
  document.getElementById('rek-info').style.display = (menu === 'Sumbangan') ? 'block' : 'none';
  const iwAtas = document.getElementById('info-warga-atas');
  if (iwAtas) iwAtas.style.display = (menu === 'Dashboard') ? 'block' : 'none';
  if (document.getElementById('searchInput')) document.getElementById('searchInput').value = "";
  
  switch(menu) {
    case 'Dashboard':      if (typeof loadDashboardView   === 'function') { loadDashboardView();   return; } break;
    case 'Profil':         if (typeof loadProfilView       === 'function') { loadProfilView();       return; } break;
    case 'Warga':          if (typeof loadWargaView        === 'function') { loadWargaView();        return; } break;
    case 'Keuangan':       if (typeof loadKeuanganView     === 'function') { loadKeuanganView();     return; } break;
    case 'Iuran':          if (typeof loadIuranView        === 'function') { loadIuranView();        return; } break;
    case 'Pengaduan':      if (typeof loadPengaduanView    === 'function') { loadPengaduanView();    return; } break;
    case 'SuratPengantar': if (typeof loadSuratView        === 'function') { loadSuratView();        return; } break;
    case 'Sumbangan':      if (typeof loadSumbanganView    === 'function') { loadSumbanganView();    return; } break;
    case 'Aset':           if (typeof loadAsetView         === 'function') { loadAsetView();         return; } break;
    case 'Aspirasi':       if (typeof loadAspirasiView     === 'function') { loadAspirasiView();     return; } break;
    case 'Kelahiran':      if (typeof loadKelahiranView    === 'function') { loadKelahiranView();    return; } break;
    case 'Kematian':       if (typeof loadKematianView     === 'function') { loadKematianView();     return; } break;
    case 'PindahMasuk':    if (typeof loadPindahMasukView  === 'function') { loadPindahMasukView();  return; } break;
    case 'PindahKeluar':   if (typeof loadPindahKeluarView === 'function') { loadPindahKeluarView(); return; } break;
    case 'Pengaturan':
      if (session.role === 'RT') {
        if (typeof renderPengaturanRTView === 'function') renderPengaturanRTView();
        return;
      } else {
        document.getElementById('main-content').innerHTML = `
          <div class="card p-4 text-center border-0 shadow-sm rounded-3 my-4">
            <i class="bi bi-shield-lock text-primary display-4 mb-2"></i>
            <h5 class="fw-bold text-gray-800">Pengaturan RT & Sistem</h5>
            <p class="text-muted text-xs">Menu ini khusus untuk RT / Admin.</p>
          </div>`;
        return;
      }
  }
  // Default: load via table renderer
  let cacheKey = menu;
  let cached = menuDataCache[cacheKey];
  let now = Date.now();
  if (cached && (now - cached.timestamp) < MENU_CACHE_TTL) {
    currentHeaders = cached.data.headers || [];
    currentRows    = cached.data.rows    || [];
    renderTable('main-content', cached.data, getTableConfig(menu));
    return;
  }
  document.getElementById('main-content').innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><br><small class="text-muted mt-2 d-block">Memuat data...</small></div>';
  const res = await safeSupabaseSelect(menu, session.token, 50, 0);
  if (res && !res.error) {
    currentHeaders = res.data.headers || [];
    currentRows = res.data.rows || [];
    menuDataCache[cacheKey] = { data: res.data, timestamp: Date.now() };
    renderTable('main-content', res.data, getTableConfig(menu));
  } else {
    document.getElementById('main-content').innerHTML = '<div class="alert alert-danger text-center my-3">Gagal memuat data.</div>';
  }
}

function getTableConfig(menu) {
  // Override untuk menu tertentu
  const configs = {
    'Warga': { emptyMessage: 'Belum ada data warga.' },
    'Iuran': { emptyMessage: 'Belum ada data iuran.' },
  };
  return configs[menu] || { emptyMessage: 'Tidak ada data.' };
}

// ============================================================
// GLOBAL FUNCTIONS (dipanggil dari HTML)
// ============================================================
window.loadMenu = loadMenu;
window.showUIToast = showUIToast;
window.showUIConfirm = showUIConfirm;
window.setBtnLoading = setBtnLoading;
window.convertToImageLink = convertToImageLink;
window.extractStoragePathFromUrl = extractStoragePathFromUrl;
window.cariNilaiKolom = cariNilaiKolom;

function bukaPopUpFoto(urlImg) {
  document.getElementById('modalPreviewImg').src = convertToImageLink(urlImg);
  if (!bootstrapImageModalInstance) bootstrapImageModalInstance = new bootstrap.Modal(document.getElementById('imageModal'));
  bootstrapImageModalInstance.show();
}
window.bukaPopUpFoto = bukaPopUpFoto;

// ============================================================
// DOM READY
// ============================================================
document.addEventListener('DOMContentLoaded', async function() {
  const configOk = await initBackendConfig();
  if (!configOk) {
    const loginMsg = document.getElementById('login-msg');
    if (loginMsg) {
      loginMsg.innerHTML = '⚠️ Konfigurasi backend belum tersedia. Set SUPABASE_URL & SUPABASE_KEY di tab API Keys / .env lalu restart preview.';
    }
  }
  
  loadSessionFromStorage();
  if (session.token) {
    // Apply session UI
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('app-container').style.display = 'block';
    document.getElementById('mob-header').classList.add('show-nav');
    document.getElementById('mob-nav').classList.add('show-nav');
    await loadAppSettings();
    loadMenu('Dashboard');
    updateMenuBadges();
  }
  
  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(function(err) {
      console.warn('Gagal mendaftarkan Service Worker:', err);
    });
  }
});

// ============================================================
// PLACEHOLDER FUNCTIONS (akan di-override oleh modul lain)
// ============================================================
function loadDashboardView() { console.warn('loadDashboardView not implemented'); }
function loadProfilView() { console.warn('loadProfilView not implemented'); }
function loadWargaView() { console.warn('loadWargaView not implemented'); }
function loadKeuanganView() { console.warn('loadKeuanganView not implemented'); }
function loadIuranView() { console.warn('loadIuranView not implemented'); }
function loadPengaduanView() { console.warn('loadPengaduanView not implemented'); }
function loadSuratView() { console.warn('loadSuratView not implemented'); }
function loadSumbanganView() { console.warn('loadSumbanganView not implemented'); }
function loadAsetView() { console.warn('loadAsetView not implemented'); }
function loadAspirasiView() { console.warn('loadAspirasiView not implemented'); }
function loadKelahiranView() { console.warn('loadKelahiranView not implemented'); }
function loadKematianView() { console.warn('loadKematianView not implemented'); }
function loadPindahMasukView() { console.warn('loadPindahMasukView not implemented'); }
function loadPindahKeluarView() { console.warn('loadPindahKeluarView not implemented'); }
function renderPengaturanRTView() { console.warn('renderPengaturanRTView not implemented'); }
function updateMenuBadges() { console.warn('updateMenuBadges not implemented'); }

console.log("%cMAU NGAPAIN LU? 🤨", "color:#ef4444;font-size:38px;font-weight:900;padding:10px;");
console.log("%cMending bayar iuran RT 5 daripada ngintipin console 🤣", "color:#2563eb;font-size:14px;font-weight:bold;");