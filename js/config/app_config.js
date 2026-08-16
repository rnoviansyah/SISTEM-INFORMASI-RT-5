// ============================================================
// config/app_config.js
// Konfigurasi aplikasi: klien Supabase, sesi user, pengaturan aplikasi
// (appSettings), dan state global. Dipisah dari app.js (refactor modul).
// Classic script — berbagi global scope. URUTAN LOAD di index.html
// WAJIB dijaga (file ini harus dimuat PALING AWAL, sebelum modul lain).
// ============================================================

let SUPABASE_URL = window.SUPABASE_URL || '';
let SUPABASE_KEY = window.SUPABASE_KEY || '';
let _supabaseDb = null;

function getDbInstance() {
  if (!_supabaseDb && SUPABASE_URL && SUPABASE_KEY) {
    _supabaseDb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return _supabaseDb;
}

Object.defineProperty(window, 'db', {
  get: function() { return getDbInstance(); },
  set: function(val) { _supabaseDb = val; },
  configurable: true
});

// ============================================================
// SESI USER (global — dipakai auth.js, table.js, seluruh modul)
// ============================================================
let _rawSession = { token: '', role: 'Warga', nik: '', nama: '', alamat: '', noHp: '' };
let session = new Proxy(_rawSession, {
  set(target, prop, value) {
    if (prop === 'role') {
      try {
        let savedRaw = localStorage.getItem('rt_user_session');
        if (savedRaw) {
          let saved = JSON.parse(savedRaw);
          let realRole = (saved.role || 'Warga').toString().toUpperCase() === 'RT' ? 'RT' : 'Warga';
          target[prop] = realRole;
          return true;
        }
      } catch(e){}
    }
    target[prop] = value;
    return true;
  }
});

// ============================================================
// PENGATURAN APLIKASI (appSettings) — dipindah dari settings.js
// agar tersedia untuk semua modul sejak awal.
// ============================================================
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
  payment_qris: '',
  info_warga: ''
};

try {
  let cachedAppSettings = localStorage.getItem('rt_app_settings_cache');
  if (cachedAppSettings) {
    let parsedCache = JSON.parse(cachedAppSettings);
    if (parsedCache && typeof parsedCache === 'object') {
      Object.assign(appSettings, parsedCache);
    }
  }
} catch(e) {}

async function loadAppSettings() {
  try {
    if (!db) {
      try { await initBackendConfig(); } catch(e) {}
    }
    const { data: settingsData } = await safeSupabaseSelect('Pengaturan');
    if (settingsData && settingsData.length > 0) {
      settingsData.forEach(row => {
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

// ============================================================
// STATE GLOBAL (menu aktif, data tabel, cache, dll.)
// ============================================================
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
let lastInfoWargaText = '';
let supabaseRealtimeChannel = null;
// Status channel Supabase Realtime (diisi services/realtime.js): true saat
// WebSocket SUBSCRIBED. Dipakai auth.js — polling berkala hanya jadi
// fallback saat socket putus (temuan audit).
let realtimeActive = false;
let lastNotifCount = 0;
let menuDataCache = {};

// ============================================================
// INISIALISASI BACKEND (baca /api/config -> SUPABASE_URL/KEY)
// ============================================================
let appConfigReady = Promise.resolve(false);
async function initBackendConfig() {
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const data = await res.json();
      if (data.supabaseUrl && data.supabaseKey) {
        SUPABASE_URL = data.supabaseUrl;
        SUPABASE_KEY = data.supabaseKey;
        _supabaseDb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        if (document.readyState !== 'loading') {
          try {
            if (typeof checkExistingSession === 'function') checkExistingSession();
          } catch (e) {}
          try {
            if (typeof loadAppSettings === 'function') loadAppSettings();
          } catch (e) {}
        }
        return true;
      }
    }
  } catch (e) {
    console.warn("Could not fetch /api/config:", e);
  }
  return false;
}
appConfigReady = initBackendConfig();

document.addEventListener('DOMContentLoaded', function() {
  appConfigReady.then(function(configOk) {
    if (!configOk) {
      const loginMsg = document.getElementById('login-msg');
      if (loginMsg) {
        loginMsg.innerHTML = '⚠️ Konfigurasi backend belum tersedia. Set SUPABASE_URL & SUPABASE_KEY di tab API Keys / .env lalu restart preview.';
      }
    }
  });
});

// ============================================================
// PERAN USER & NOMOR WA ADMIN
// ============================================================
async function getValidUserRole() {
  try {
    if (!db) return 'Warga';
    const { data: { session: currentSess } } = await db.auth.getSession();
    if (!currentSess) {
      let savedRaw = localStorage.getItem('rt_user_session');
      if (savedRaw) {
        let saved = JSON.parse(savedRaw);
        return (saved && saved.role && saved.role.toUpperCase() === 'RT') ? 'RT' : 'Warga';
      }
      return 'Warga';
    }
    const roleFromJwt = currentSess.user?.app_metadata?.user_role || currentSess.user?.user_metadata?.role;
    return (roleFromJwt && roleFromJwt.toUpperCase() === 'RT') ? 'RT' : 'Warga';
  } catch (e) {
    return 'Warga';
  }
}
window.getValidUserRole = getValidUserRole;

async function isVerifiedRT() {
  let verifiedRole = await getValidUserRole();
  return verifiedRole === 'RT';
}

function getNoWaAdmin() {
  let customNo = (typeof appSettings !== 'undefined' && appSettings && appSettings.rt_wa_number) ? appSettings.rt_wa_number : '';
  if (customNo && String(customNo).trim() !== '') {
    let clean = String(customNo).replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) clean = '62' + clean.slice(1);
    return clean;
  }
  return '628973366667';
}
Object.defineProperty(window, 'noWaAdmin', {
  get: function() { return getNoWaAdmin(); },
  configurable: true
});
