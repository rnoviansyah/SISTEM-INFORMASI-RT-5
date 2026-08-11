// ============================================================
// Developed by Rizky Noviansyah
// APP.JS - VERSION 4.0 (FULL FIX)
// ============================================================

import { getDbInstance, setConfig, safeSupabaseSelect, safeSupabaseInsert, safeSupabaseUpdate, safeSupabaseDelete } from './core/db.js';
import { getSession, setSession, clearSession, loadSessionFromStorage, verifySessionToken } from './core/session.js';
import { showUIToast, showUIConfirm, setBtnLoading } from './helpers/uiHelper.js';
import { sanitizeFormData, compressImageFile, convertToImageLink, extractStoragePathFromUrl, cariNilaiKolom } from './helpers/formHelper.js';
import { renderTable, filterTableData } from './helpers/tableHelper.js';

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
let appSettings = {};
let session = getSession();

async function initBackendConfig() {
  if (SUPABASE_URL && SUPABASE_KEY) {
    setConfig(SUPABASE_URL, SUPABASE_KEY);
    return true;
  }
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
  } catch (e) { console.warn('Could not fetch /api/config:', e); }
  return false;
}

function syncActiveNav(menu) {
  document.querySelectorAll('.sidebar a').forEach(el => el.classList.remove('active-menu'));
  var dEl = document.getElementById('dmenu-' + menu);
  if (dEl) dEl.classList.add('active-menu');
  document.querySelectorAll('.bottom-nav-item').forEach(el => el.classList.remove('active'));
  var mEl = document.getElementById('mmenu-' + menu);
  if (mEl) mEl.classList.add('active');
  else { var lainnyaEl = document.getElementById('mmenu-Lainnya'); if (lainnyaEl) lainnyaEl.classList.add('active'); }
  document.querySelectorAll('.sheet-menu-item').forEach(el => el.classList.remove('active'));
  var sEl = document.getElementById('smenu-' + menu);
  if (sEl) sEl.classList.add('active');
}

async function loadMenu(menu) {
  if (session.token) {
    let isSessionValid = await verifySessionToken();
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
    case 'Dashboard': if (typeof loadDashboardView === 'function') { loadDashboardView(); return; } break;
    case 'Profil': if (typeof loadProfilView === 'function') { loadProfilView(); return; } break;
    case 'Warga': if (typeof loadWargaView === 'function') { loadWargaView(); return; } break;
    case 'Keuangan': if (typeof loadKeuanganView === 'function') { loadKeuanganView(); return; } break;
    case 'Iuran': if (typeof loadIuranView === 'function') { loadIuranView(); return; } break;
    case 'Pengaduan': if (typeof loadPengaduanView === 'function') { loadPengaduanView(); return; } break;
    case 'SuratPengantar': if (typeof loadSuratView === 'function') { loadSuratView(); return; } break;
    case 'Sumbangan': if (typeof loadSumbanganView === 'function') { loadSumbanganView(); return; } break;
    case 'Aset': if (typeof loadAsetView === 'function') { loadAsetView(); return; } break;
    case 'Aspirasi': if (typeof loadAspirasiView === 'function') { loadAspirasiView(); return; } break;
    case 'Kelahiran': if (typeof loadKelahiranView === 'function') { loadKelahiranView(); return; } break;
    case 'Kematian': if (typeof loadKematianView === 'function') { loadKematianView(); return; } break;
    case 'PindahMasuk': if (typeof loadPindahMasukView === 'function') { loadPindahMasukView(); return; } break;
    case 'PindahKeluar': if (typeof loadPindahKeluarView === 'function') { loadPindahKeluarView(); return; } break;
    case 'Pengaturan':
      if (session.role === 'RT' && typeof renderPengaturanRTView === 'function') { renderPengaturanRTView(); return; }
      else { document.getElementById('main-content').innerHTML = `<div class="card p-4 text-center border-0 shadow-sm rounded-3 my-4"><i class="bi bi-shield-lock text-primary display-4 mb-2"></i><h5 class="fw-bold text-gray-800">Pengaturan RT & Sistem</h5><p class="text-muted text-xs">Menu ini khusus untuk RT / Admin.</p></div>`; return; }
  }
  
  try {
    const res = await window.callGASGet('getTableData', { sheetName: menu });
    if (res && res.status === 'success') {
      currentHeaders = res.headers || [];
      currentRows = res.rows || [];
      renderTable('main-content', res, { emptyMessage: `Tidak ada data ${menu}.` });
    } else {
      document.getElementById('main-content').innerHTML = `<div class="alert alert-danger">Gagal memuat data ${menu}.</div>`;
    }
  } catch(e) {
    document.getElementById('main-content').innerHTML = `<div class="alert alert-danger">Error: ${e.message}</div>`;
  }
}
window.loadMenu = loadMenu;

function bukaPopUpFoto(urlImg) {
  document.getElementById('modalPreviewImg').src = convertToImageLink(urlImg);
  if (!bootstrapImageModalInstance) bootstrapImageModalInstance = new bootstrap.Modal(document.getElementById('imageModal'));
  bootstrapImageModalInstance.show();
}
window.bukaPopUpFoto = bukaPopUpFoto;

document.addEventListener('DOMContentLoaded', async function() {
  const configOk = await initBackendConfig();
  if (!configOk && !SUPABASE_URL) {
    const loginMsg = document.getElementById('login-msg');
    if (loginMsg) loginMsg.innerHTML = '⚠️ Konfigurasi backend belum siap.';
  }
  loadSessionFromStorage();
  if (session.token) {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('app-container').style.display = 'block';
    document.getElementById('mob-header').classList.add('show-nav');
    document.getElementById('mob-nav').classList.add('show-nav');
    loadMenu('Dashboard');
    updateMenuBadges();
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(function(err) { console.warn('SW Error:', err); });
  }
});

console.log("%cMAU NGAPAIN LU? 🤨", "color:#ef4444;font-size:38px;font-weight:900;padding:10px;");
console.log("%cMending bayar iuran RT 5 daripada ngintipin console 🤣", "color:#2563eb;font-size:14px;font-weight:bold;");