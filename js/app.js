// ============================================================
// Developed by Rizky Noviansyah
// Updated Security Patch: JWT Validation, RLS Sync & Universal RPC CRUD
// Fixes: Storage Photo File Selector, Excel Export, & 8-Grid Edge Function Stats
// ============================================================

function setBtnLoading(btn, isLoading, customText = 'Menyimpan...') {
  if (!btn) return;
  if (typeof btn === 'string') btn = document.querySelector(btn);
  if (!btn || !(btn instanceof HTMLElement)) return;

  if (isLoading) {
    if (!btn.dataset.origHtml) {
      btn.dataset.origHtml = btn.innerHTML;
    }
    btn.disabled = true;
    btn.style.pointerEvents = 'none';
    btn.style.opacity = '0.75';
    if (btn.classList.contains('btn-door-login') || customText === 'Memproses...') {
      btn.innerHTML = btn.dataset.origHtml;
      btn.classList.add('is-loading');
    } else {
      btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>${customText}`;
    }
  } else {
    btn.disabled = false;
    btn.style.pointerEvents = '';
    btn.style.opacity = '';
    btn.classList.remove('is-loading');
    btn.classList.remove('is-animating');
    if (btn.dataset.origHtml) {
      btn.innerHTML = btn.dataset.origHtml;
      delete btn.dataset.origHtml;
    }
  }
}
window.setBtnLoading = setBtnLoading;

document.addEventListener('click', function(e) {
  let target = e.target.closest('button, input[type="submit"], .btn-primary, .btn-submit');
  if (!target) return;
  let txt = (target.innerText || target.value || '').toLowerCase().trim();
  
  let isActionBtn = txt.includes('simpan') || 
                    txt.includes('masuk') || 
                    txt.includes('kirim') || 
                    txt.includes('tambah') || 
                    txt.includes('ubah') || 
                    txt.includes('update') || 
                    target.type === 'submit';
                    
  if (isActionBtn && !target.disabled) {
    let loadingText = txt.includes('masuk') ? 'Memproses...' : 
                      (txt.includes('kirim') ? 'Mengirim...' : 'Menyimpan...');
    setTimeout(() => {
      if (target) setBtnLoading(target, true, loadingText);
    }, 10);
    
    setTimeout(() => {
      if (target && target.disabled) {
        setBtnLoading(target, false);
      }
    }, 4000);
  }
}, true);

function showUIToast(message, type = 'auto') {
  if (!message) return;
  document.querySelectorAll('button[data-orig-html]').forEach(btn => setBtnLoading(btn, false));
  let strMsg = String(message).trim();
  let toastContainer = document.getElementById('ui-toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'ui-toast-container';
    toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    toastContainer.style.zIndex = '1099';
    document.body.appendChild(toastContainer);
  }
  let isSuccess = (type === 'success') || strMsg.toLowerCase().includes('berhasil') || strMsg.toLowerCase().includes('lunas') || strMsg.toLowerCase().includes('sukses');
  let isError = (type === 'danger' || type === 'error') || strMsg.toLowerCase().includes('gagal') || strMsg.toLowerCase().includes('error') || strMsg.toLowerCase().includes('ditolak') || strMsg.toLowerCase().includes('wajib') || strMsg.toLowerCase().includes('salah');
  let bgClass = isSuccess ? 'bg-success text-white' : (isError ? 'bg-danger text-white' : 'bg-dark text-white');
  let icon = isSuccess 
    ? '<i class="bi bi-check-circle-fill fs-5 me-2"></i>' 
    : (isError ? '<i class="bi bi-exclamation-triangle-fill fs-5 me-2"></i>' : '<i class="bi bi-info-circle-fill fs-5 me-2"></i>');
  let toastId = 'toast-' + Date.now() + '-' + Math.floor(Math.random()*1000);
  let toastHtml = `
    <div id="${toastId}" class="toast align-items-center ${bgClass} border-0 shadow-lg mb-2 show rounded-3" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex align-items-center">
        <div class="toast-body d-flex align-items-center font-sans fw-bold text-xs py-2 px-3">
          ${icon}
          <div>${strMsg}</div>
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" onclick="document.getElementById('${toastId}').remove()"></button>
      </div>
    </div>`;
  toastContainer.insertAdjacentHTML('beforeend', toastHtml);
  setTimeout(() => {
    let el = document.getElementById(toastId);
    if (el) {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }
  }, 4500);
}
window.alert = function(msg) {
  showUIToast(msg);
};

function showUIConfirm(text, onConfirm, title = "Konfirmasi Tindakan") {
  let modalEl = document.getElementById('customConfirmModal');
  if (!modalEl) {
    let div = document.createElement('div');
    div.innerHTML = `
      <div class="modal fade" id="customConfirmModal" tabindex="-1" aria-hidden="true" style="z-index: 1095;">
        <div class="modal-dialog modal-dialog-centered modal-sm">
          <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
            <div class="modal-body text-center p-4">
              <div class="rounded-circle bg-warning-subtle text-warning mx-auto mb-3 d-flex align-items-center justify-content-center" style="width: 56px; height: 56px;">
                <i class="bi bi-exclamation-triangle-fill fs-2"></i>
              </div>
              <h6 class="fw-bold text-gray-800 mb-2" id="confirmModalTitle">Konfirmasi</h6>
              <p class="text-xs text-gray-600 mb-4" id="confirmModalText"></p>
              <div class="d-flex gap-2 justify-content-center">
                <button type="button" class="btn btn-sm btn-light font-bold px-3 py-2 w-50 rounded-2" data-bs-dismiss="modal">Batal</button>
                <button type="button" class="btn btn-sm btn-danger font-bold px-3 py-2 w-50 rounded-2" id="btnConfirmOk">Ya, Lanjutkan</button>
              </div>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(div.firstElementChild);
    modalEl = document.getElementById('customConfirmModal');
  }
  document.getElementById('confirmModalTitle').innerText = title;
  document.getElementById('confirmModalText').innerText = text;
  let bsModal = new bootstrap.Modal(modalEl);
  let btnOk = document.getElementById('btnConfirmOk');
  let newBtnOk = btnOk.cloneNode(true);
  btnOk.parentNode.replaceChild(newBtnOk, btnOk);
  newBtnOk.addEventListener('click', function() {
    bsModal.hide();
    if (typeof onConfirm === 'function') onConfirm();
  });
  bsModal.show();
}

const viewTemplateCache = {};
async function loadViewTemplate(viewName, fallbackHtml = '') {
  const container = document.getElementById('main-content');
  if (!container) return false;
  if (viewTemplateCache[viewName]) {
    container.innerHTML = viewTemplateCache[viewName];
    return true;
  }
  try {
    const res = await fetch(`./views/${viewName}.html?v=` + Date.now());
    if (res.ok) {
      const html = await res.text();
      viewTemplateCache[viewName] = html;
      container.innerHTML = html;
      return true;
    }
  } catch (err) {
    console.warn(`[ViewLoader] views/${viewName}.html fetch skipped:`, err);
  }
  if (fallbackHtml) {
    viewTemplateCache[viewName] = fallbackHtml;
    container.innerHTML = fallbackHtml;
    return true;
  }
  return false;
}
window.loadViewTemplate = loadViewTemplate;
window.showUIConfirm = showUIConfirm;
window.showUIToast = showUIToast;

// ============================================================
// SECURITY CORE: VALIDASI JWT & ROLE SECURE PROXY
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
let lastNotifCount = 0;
let menuDataCache = {};
const MENU_CACHE_TTL = 30000;

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

async function isVerifiedRT() {
  let verifiedRole = await getValidUserRole();
  return verifiedRole === 'RT';
}

// ============================================================
// UNIVERSAL RPC CRUD WRAPPERS
// ============================================================
async function safeSupabaseSelect(tableName) {
  try {
    let userToken = (session && session.token) ? String(session.token).trim() : '';
    let { data, error } = await db.rpc('generic_select_secured', {
      p_table: tableName,
      p_token: userToken
    });
    if (!error && data && data.status === 'success') {
      return { data: makeCaseInsensitive(data.data || []), error: null };
    }
    return { data: [], error: error || (data ? data.message : 'Gagal memuat data') };
  } catch(e) {
    return { data: [], error: e };
  }
}

async function safeSupabaseInsert(tableName, rows) {
  try {
    let userToken = (session && session.token) ? String(session.token).trim() : '';
    let rowData = (rows && rows.length > 0) ? rows[0] : {};
    let { data, error } = await db.rpc('generic_insert_secured', {
      p_table: tableName,
      p_token: userToken,
      p_row: rowData
    });
    if (!error && data && data.status === 'success') {
      sendRealtimePing();
      return { error: null };
    }
    return { error: { message: error ? error.message : (data ? data.message : 'Gagal insert') } };
  } catch(e) {
    return { error: e };
  }
}

async function safeSupabaseUpdate(tableName, payload, eqColumn, eqValue) {
  try {
    let userToken = (session && session.token) ? String(session.token).trim() : '';
    payload = sanitizeFormData(tableName, payload);
    let { data, error } = await db.rpc('generic_update_secured', {
      p_table: tableName,
      p_token: userToken,
      p_id_col: String(eqColumn),
      p_id_val: String(eqValue),
      p_row: payload
    });
    if (!error && data && data.status === 'success') {
      sendRealtimePing();
      return { error: null };
    }
    return { error: { message: error ? error.message : (data ? data.message : 'Gagal update') } };
  } catch(e) {
    return { error: e };
  }
}

async function safeSupabaseDelete(tableName, eqColumn, eqValue) {
  try {
    let userToken = (session && session.token) ? String(session.token).trim() : '';
    if (tableName.toLowerCase() === 'sessions') {
      let { error } = await db.rpc('delete_session_secured', { p_token: String(eqValue).trim() });
      return { error: error || null };
    }
    let { data, error } = await db.rpc('generic_delete_secured', {
      p_table: tableName,
      p_token: userToken,
      p_id_col: String(eqColumn),
      p_id_val: String(eqValue)
    });
    if (!error && data && data.status === 'success') {
      sendRealtimePing();
      return { error: null };
    }
    return { error: { message: error ? error.message : (data ? data.message : 'Gagal delete') } };
  } catch(e) {
    return { error: e };
  }
}

function isNumericColumn(kName) {
  if (!kName) return false;
  let kLower = String(kName).toLowerCase().replace(/_/g, '').trim();
  return ['nominal', 'tahun', 'rt', 'rw', 'jumlah', 'stok', 'qty', 'pemasukan', 'pengeluaran', 'saldo', 'acc', 'jumlahminta'].includes(kLower);
}

function sanitizeFormData(sheetName, formData) {
  if (!formData || typeof formData !== 'object') return formData;
  let cleanData = { ...formData };
  for (let k in cleanData) {
    if (typeof cleanData[k] === 'object' && cleanData[k] !== null && cleanData[k].base64) {
      cleanData[k] = cleanData[k].base64;
    }
    let kLower = String(k).toLowerCase().replace(/_/g, '').trim();
    let valStr = String(cleanData[k] !== null && cleanData[k] !== undefined ? cleanData[k] : '').trim();

    if (valStr === '') {
      if (['nohp', 'hp', 'telp', 'wa', 'acc'].includes(kLower)) {
        cleanData[k] = null;
      } else if (isNumericColumn(k)) {
        cleanData[k] = 0;
      }
    } else if (isNumericColumn(k)) {
      let numOnly = valStr.replace(/[^0-9.-]/g, '');
      cleanData[k] = (numOnly !== '' && !isNaN(Number(numOnly))) ? Number(numOnly) : 0;
    } else if (['nohp', 'acc'].includes(kLower)) {
      let numOnly = valStr.replace(/[^0-9]/g, '');
      cleanData[k] = numOnly || null;
    } else if (['nik', 'nokk'].includes(kLower)) {
      let numOnly = valStr.replace(/[^0-9]/g, '');
      if (numOnly) cleanData[k] = numOnly;
    }
  }
  return cleanData;
}

function caseInsensitiveObj(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  return new Proxy(obj, {
    get(target, prop) {
      if (typeof prop !== 'string' || prop in target || prop === 'then') return target[prop];
      const foundKey = Object.keys(target).find(k => k.toLowerCase() === prop.toLowerCase());
      return foundKey ? target[foundKey] : undefined;
    }
  });
}

function makeCaseInsensitive(data) {
  if (Array.isArray(data)) return data.map(item => caseInsensitiveObj(item));
  else if (data && typeof data === 'object') return caseInsensitiveObj(data);
  return data;
}

function cariNilaiKolom(row, keywords) {
  if (!row || typeof row !== 'object') return '';
  const keys = Object.keys(row);
  for (let kw of keywords) {
    let kwClean = kw.toLowerCase().replace(/_/g, ' ').trim();
    let exactKey = keys.find(k => k.toLowerCase().replace(/_/g, ' ').trim() === kwClean);
    if (exactKey && row[exactKey] !== null && row[exactKey] !== undefined && String(row[exactKey]).trim() !== '') {
      return String(row[exactKey]).trim();
    }
    let partialKey = keys.find(k => {
      let kClean = k.toLowerCase().replace(/_/g, ' ').trim();
      let matchesKw = kClean.includes(kwClean);
      if (kwClean.includes('nama') || kwClean.includes('barang')) {
        return matchesKw && !kClean.includes('foto') && !kClean.includes('gambar') && !kClean.includes('bukti') && !kClean.includes('keterangan');
      }
      return matchesKw;
    });
    if (partialKey && row[partialKey] !== null && row[partialKey] !== undefined && String(row[partialKey]).trim() !== '') {
      return String(row[partialKey]).trim();
    }
  }
  return '';
}

async function updateStokAset(namaAtauIdBarang, deltaStok) {
  if (!namaAtauIdBarang || deltaStok === 0) return;
  const { data: safeAset } = await safeSupabaseSelect('Aset');
  if (!safeAset || safeAset.length === 0) return;
  let targetAset = safeAset.find(a => {
    let bNama = cariNilaiKolom(a, ['nama_barang', 'nama_aset', 'nama', 'barang']);
    let bId = cariNilaiKolom(a, ['id', 'id_barang']);
    return (bNama && bNama.toLowerCase().trim() === String(namaAtauIdBarang).toLowerCase().trim()) ||
           (bId && bId.toLowerCase().trim() === String(namaAtauIdBarang).toLowerCase().trim());
  });
  if (!targetAset) return;
  let targetId = targetAset.id || targetAset.ID || cariNilaiKolom(targetAset, ['id']);
  let currentStok = parseInt(cariNilaiKolom(targetAset, ['stok_tersedia', 'jumlah', 'stok', 'stock', 'qty']) || 0);
  let stokBaru = Math.max(0, currentStok + deltaStok);
  let keys = Object.keys(targetAset);
  let stockKey = keys.find(k => {
    let kClean = k.toLowerCase().replace(/_/g, ' ').trim();
    return kClean.includes('stok') || kClean.includes('jumlah') || kClean.includes('qty');
  }) || 'stok_tersedia';
  let updatePayload = {};
  updatePayload[stockKey] = stokBaru;
  let statusKey = keys.find(k => k.toLowerCase() === 'status');
  if (statusKey) updatePayload[statusKey] = stokBaru > 0 ? 'Tersedia' : 'Habis';
  await safeSupabaseUpdate('Aset', updatePayload, 'id', targetId);
}

function convertToImageLink(url) {
  if (!url) return "";
  if (url.includes("drive.google.com") || url.includes("googleusercontent")) {
    var idMatch = url.match(/[-\w]{25,}/);
    if (idMatch) return "https://lh3.googleusercontent.com/d/" + idMatch[0];
  }
  return url;
}

// Extract path file dari public URL Supabase Storage (rt-media). Contoh:
// https://xxx.supabase.co/storage/v1/object/public/rt-media/warga/123.jpg?t=...
// -> "warga/123.jpg" (atau null kalau bukan file storage milik kita)
function extractStoragePathFromUrl(url) {
  const s = String(url || '').trim();
  const marker = '/object/public/rt-media/';
  const idx = s.indexOf(marker);
  if (idx === -1) return null;
  let path = s.slice(idx + marker.length).split('?')[0];
  if (!path) return null;
  try { path = decodeURIComponent(path); } catch (e) {}
  return path;
}

async function uploadToSupabaseStorage(base64Data, folderName = 'warga') {
  try {
    if (!base64Data || !base64Data.startsWith('data:image')) return base64Data;
    
    const arr = base64Data.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const blob = new Blob([u8arr], { type: mime });
    const fileName = `${folderName}/${Date.now()}_${Math.floor(Math.random()*1000)}.jpg`;
    
    const { data, error } = await db.storage.from('rt-media').upload(fileName, blob, {
      cacheControl: '3600',
      upsert: true
    });
    
    if (error) {
      console.warn('Storage upload error, fallback to Base64:', error);
      return base64Data;
    }
    
    const { data: urlData } = db.storage.from('rt-media').getPublicUrl(fileName);
    return urlData ? urlData.publicUrl : base64Data;
  } catch (err) {
    console.error('Failed upload to storage:', err);
    return base64Data;
  }
}

async function callGASPost(actionName, extraPayload = {}) {
  try {
    if (actionName === 'processLogin') {
      const uClean = extraPayload.username ? extraPayload.username.toString().trim().toLowerCase() : '';
      const pClean = extraPayload.password ? extraPayload.password.toString().trim() : '';
      if (!uClean || !pClean) {
        return { status: 'error', message: 'Username / NIK dan Password tidak boleh kosong!' };
      }
      let loginDiag = '';
      try {
        const { data, error } = await db.rpc('verify_user_login', {
          p_username: uClean,
          p_password: pClean
        });
        if (!error && data && data.status === 'success') {
          return data;
        }
        if (error) loginDiag = (error.message || error).toString();
      } catch (err) {
        console.warn('[Login] RPC Error, mencoba fallback...', err);
        loginDiag = (err && err.message) ? err.message.toString() : '';
      }
      try {
        const { data: usersData } = await safeSupabaseSelect('Users');
        if (usersData && usersData.length > 0) {
          let uCleanNum = uClean.replace(/[^0-9]/g, '');
          let matched = usersData.find(u => {
            let uUsername = String(cariNilaiKolom(u, ['username', 'user'])).toLowerCase().trim();
            let uNik = String(cariNilaiKolom(u, ['nik', 'ktp'])).toLowerCase().trim();
            let uPass = String(cariNilaiKolom(u, ['password', 'pass'])).trim();
            let uNikNum = uNik.replace(/[^0-9]/g, '');

            let matchIdentifier = (uUsername && uUsername === uClean) ||
                                  (uNik && uNik === uClean) ||
                                  (uCleanNum.length >= 10 && uNikNum && uNikNum === uCleanNum);

            return matchIdentifier && uPass === pClean;
          });
          if (matched) {
            let roleVal = cariNilaiKolom(matched, ['role']) || 'RT';
            let nikVal  = cariNilaiKolom(matched, ['nik', 'ktp']) || cariNilaiKolom(matched, ['username', 'user']) || uClean;
            let usernameVal = cariNilaiKolom(matched, ['username', 'user']) || uClean;
            let namaVal = cariNilaiKolom(matched, ['nama', 'nama_lengkap', 'name']);
            let alamatVal = cariNilaiKolom(matched, ['alamat']);
            let hpVal = cariNilaiKolom(matched, ['no_hp', 'hp', 'wa']);

            try {
              const { data: safeWarga } = await safeSupabaseSelect('Warga');
              if (safeWarga && safeWarga.length > 0) {
                let myW = safeWarga.find(w => {
                  let wNik = String(cariNilaiKolom(w, ['nik', 'ktp'])).trim();
                  let wUser = String(cariNilaiKolom(w, ['username', 'user'])).trim().toLowerCase();
                  let cleanNikVal = String(nikVal).replace(/[^0-9]/g, '');
                  let cleanWNik = wNik.replace(/[^0-9]/g, '');
                  return (wNik && (wNik === String(nikVal).trim() || (cleanNikVal.length >= 10 && cleanWNik === cleanNikVal))) ||
                         (wUser && (wUser === uClean || wUser === usernameVal.toLowerCase().trim()));
                });
                if (myW) {
                  let wFullName = cariNilaiKolom(myW, ['nama_lengkap', 'nama']);
                  let wAlamat = cariNilaiKolom(myW, ['alamat', 'alamat_rumah']);
                  let wHp = cariNilaiKolom(myW, ['no_hp', 'hp', 'wa', 'telp']);
                  let wNik = cariNilaiKolom(myW, ['nik', 'ktp']);
                  if (wFullName) namaVal = wFullName;
                  if (wAlamat) alamatVal = wAlamat;
                  if (wHp) hpVal = wHp;
                  if (wNik) nikVal = wNik;
                }
              }
            } catch(e) {}

            return {
              status: 'success',
              role: roleVal,
              nik: nikVal,
              nama: namaVal || usernameVal || uClean,
              alamat: alamatVal || '',
              noHp: hpVal || '',
              username: usernameVal || uClean,
              message: 'Login Berhasil!'
            };
          }
        }
      } catch (err) {
        console.warn('[Login] Fallback Users table error:', err);
      }
      const diagSuffix = (loginDiag && String(loginDiag).trim())
        ? ' | Detail: ' + String(loginDiag).slice(0, 220)
        : '';
      return { status: 'error', message: 'Username/NIK atau Password salah!' + diagSuffix };
    }
    if (actionName === 'simpanDataKeSheet') {
      const sheetName = extraPayload.sheetName;
      if (['Warga', 'Users', 'Pengaturan', 'Keuangan', 'Aset'].includes(sheetName)) {
        if (!(await isVerifiedRT())) {
          return { status: 'error', message: 'Akses ditolak! Sesi Anda bukan RT terverifikasi di database.' };
        }
      }
      let formData = sanitizeFormData(sheetName, extraPayload.formData || {});
      if (!formData.id) formData.id = sheetName.substring(0,3).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);
      if (session.role !== 'RT' && sheetName !== 'Iuran' && sheetName !== 'Aspirasi') formData['nik'] = session.nik;
      const { error } = await safeSupabaseInsert(sheetName, [formData]);
      if (error) return { status: 'error', message: error.message };
      return { status: 'success', message: 'Data berhasil disimpan!', id: formData.id };
    }
    if (actionName === 'simpanPengajuanPeminjaman') {
      const payload = extraPayload.payload || {};
      let newId = 'PIN-' + Math.floor(1000 + Math.random() * 9000);
      let insertObj = {
        id: newId,
        nik: payload.nik || session.nik,
        nama_peminjam: payload.namaPeminjam || session.nama,
        id_barang: payload.idBarang,
        nama_barang: payload.namaBarang,
        jumlah: payload.jumlah,
        keterangan: payload.keterangan || '',
        status: 'Menunggu Verifikasi'
      };
      const { error } = await safeSupabaseInsert('Peminjaman', [insertObj]);
      if (error) return { status: 'error', message: error.message };
      return { status: 'success', message: 'Pengajuan peminjaman berhasil dikirim!' };
    }
    if (actionName === 'verifikasiPeminjamanRT') {
      if (!(await isVerifiedRT())) return { status: 'error', message: 'Akses ditolak!' };
      const idPinjam = extraPayload.idPinjam;
      const status = extraPayload.status;
      const qtyAcc = parseInt(extraPayload.qtyAcc) || 0;
      const catatanRt = extraPayload.catatanRt || '';
      const { data: safePinjamList } = await safeSupabaseSelect('Peminjaman');
      const safePinjam = safePinjamList ? safePinjamList.find(p => String(p.id || cariNilaiKolom(p, ['id'])).trim() === String(idPinjam).trim()) : null;
      if (safePinjam && status === 'Disetujui' && qtyAcc > 0) {
        let barangTarget = cariNilaiKolom(safePinjam, ['nama_barang', 'nama_aset', 'barang', 'id_barang']);
        await updateStokAset(barangTarget, -qtyAcc);
      }
      const { error } = await safeSupabaseUpdate('Peminjaman', { status: status, acc: qtyAcc, catatan_rt: catatanRt }, 'id', idPinjam);
      if (error) return { status: 'error', message: error.message };
      return { status: 'success', message: `Peminjaman berhasil di-${status.toLowerCase()}!` };
    }
    if (actionName === 'prosesPengembalianAsetRT') {
      if (!(await isVerifiedRT())) return { status: 'error', message: 'Akses ditolak!' };
      const idPinjam = extraPayload.idPinjam;
      const qtyKembali = parseInt(extraPayload.qtyKembali) || 0;
      const catatanRt = extraPayload.catatanRt || '';
      const { data: safePinjamList } = await safeSupabaseSelect('Peminjaman');
      const safePinjam = safePinjamList ? safePinjamList.find(p => String(p.id || cariNilaiKolom(p, ['id'])).trim() === String(idPinjam).trim()) : null;
      if (safePinjam) {
        if (qtyKembali > 0) {
          let barangTarget = cariNilaiKolom(safePinjam, ['nama_barang', 'nama_aset', 'barang', 'id_barang']);
          await updateStokAset(barangTarget, qtyKembali);
        }
        let qtyAcc = parseInt(cariNilaiKolom(safePinjam, ['acc', 'jumlah_acc', 'qty_acc']) || safePinjam.acc || 0);
        let selisihHilang = qtyAcc - qtyKembali;
        let statusPengembalian = selisihHilang > 0 ? `Selesai (hilang ${selisihHilang})` : 'Selesai (Dikembalikan)';
        const { error } = await safeSupabaseUpdate('Peminjaman', { status: statusPengembalian, catatan_rt: catatanRt }, 'id', idPinjam);
        if (error) return { status: 'error', message: error.message };
        return { status: 'success', message: 'Pengembalian barang berhasil dicatat & stok telah diperbarui!' };
      }
      return { status: 'error', message: 'Data peminjaman tidak ditemukan!' };
    }
    if (actionName === 'updateDataDiSheet') {
      const sheetName = extraPayload.sheetName;
      let lowerSheet = sheetName ? sheetName.toLowerCase() : '';
      if (['users', 'pengaturan', 'keuangan'].includes(lowerSheet)) {
        if (!(await isVerifiedRT())) {
          return { status: 'error', message: 'Akses ditolak! Sesi Anda bukan RT terverifikasi di database.' };
        }
      }
      const id = extraPayload.id;
      let formData = sanitizeFormData(sheetName, extraPayload.formData);
      let resUpdate = await safeSupabaseUpdate(sheetName, formData, 'id', id);
      if (resUpdate.error && sheetName.toLowerCase() === 'warga') {
        let targetNik = editingNik || id;
        resUpdate = await safeSupabaseUpdate(sheetName, formData, 'nik', targetNik);
      }
      if (resUpdate.error) return { status: 'error', message: resUpdate.error.message };
      return { status: 'success', message: 'Data berhasil diperbarui!' };
    }
    if (actionName === 'hapusDataDariSheet') {
      if (!(await isVerifiedRT())) return { status: 'error', message: 'Hanya RT yang diizinkan menghapus data!' };
      const sheetName = extraPayload.sheetName;
      const targetId  = extraPayload.id;
      let { error } = await safeSupabaseDelete(sheetName, 'id', targetId);
      if (error && sheetName.toLowerCase() === 'warga' && editingNik) {
        let res2 = await safeSupabaseDelete(sheetName, 'nik', editingNik);
        if (!res2.error) error = null;
      }
      if (error) return { status: 'error', message: 'Gagal menghapus: ' + error.message };
      return { status: 'success', message: 'Data berhasil dihapus!' };
    }
    if (['hapusUserAkun', 'resetPasswordUser', 'editUserAkun', 'tambahUserWarga', 'simpanPengaturanApp', 'simpanInfoWarga'].includes(actionName)) {
      if (!(await isVerifiedRT())) {
        return { status: 'error', message: 'Akses ditolak! Sesi Anda bukan RT terverifikasi di database.' };
      }
    }
    if (actionName === 'simpanInfoWarga') {
      let textBaru = extraPayload.teksBaru || '';
      appSettings.info_warga = textBaru;
      try {
        localStorage.setItem('rt_app_settings_cache', JSON.stringify(appSettings));
      } catch(e) {}
      let resUpd = await safeSupabaseUpdate('Pengaturan', { nilai: textBaru }, 'kunci', 'info_warga');
      if (resUpd.error) {
        let resIns = await safeSupabaseInsert('Pengaturan', [{ kunci: 'info_warga', nilai: textBaru }]);
        if (resIns.error) return { status: 'error', message: resIns.error.message };
      }
      return { status: 'success', message: 'Informasi warga berhasil diperbarui!' };
    }
    if (actionName === 'simpanPengaturanApp') {
      let errArr = [];
      for (let s of (extraPayload.settingsArray || [])) {
        if (!s || !s.kunci) continue;
        let val = (s.nilai !== undefined && s.nilai !== null) ? String(s.nilai) : '';
        let resUpd = await safeSupabaseUpdate('Pengaturan', { nilai: val }, 'kunci', s.kunci);
        if (resUpd.error) {
          let resIns = await safeSupabaseInsert('Pengaturan', [{ kunci: s.kunci, nilai: val }]);
          if (resIns.error) errArr.push(`[${s.kunci}]: ` + resIns.error.message);
        }
      }
      if (errArr.length > 0) return { status: 'error', message: errArr.join(', ') };
      await loadAppSettings();
      return { status: 'success', message: 'Pengaturan aplikasi berhasil disimpan!' };
    }
    if (actionName === 'tambahUserWarga') {
      let uObj = { ...extraPayload.userObj };
      if (!uObj.id) uObj.id = Date.now();
      let { error } = await safeSupabaseInsert('Users', [uObj]);
      if (error) {
        delete uObj.id;
        let resFallback = await safeSupabaseInsert('Users', [uObj]);
        if (!resFallback.error) return { status: 'success', message: 'Akun user berhasil didaftarkan!' };
        return { status: 'error', message: error.message };
      }
      return { status: 'success', message: 'Akun user berhasil didaftarkan!' };
    }
    if (actionName === 'hapusUserAkun') {
      const { error } = await safeSupabaseDelete('Users', 'username', extraPayload.username);
      if (error) return { status: 'error', message: error.message };
      return { status: 'success', message: 'Akun user berhasil dihapus!' };
    }
    if (actionName === 'resetPasswordUser') {
      const { error } = await safeSupabaseUpdate('Users', { password: extraPayload.newPassword }, 'username', extraPayload.username);
      if (error) return { status: 'error', message: error.message };
      return { status: 'success', message: 'Password user berhasil direset!' };
    }
    if (actionName === 'editUserAkun') {
      let updatePayload = {
        username: extraPayload.username,
        nik: extraPayload.nik,
        role: extraPayload.role
      };
      if (extraPayload.password) {
        updatePayload.password = extraPayload.password;
      }
      const { error } = await safeSupabaseUpdate('Users', updatePayload, 'username', extraPayload.oldUsername);
      if (error) return { status: 'error', message: error.message };
      return { status: 'success', message: 'Data user berhasil diperbarui!' };
    }
    return { status: 'error', message: 'Aksi POST tidak dikenal' };
  } catch (err) {
    console.error('Fetch Error (POST):', err);
    return { status: 'error', message: 'Gagal terhubung ke Supabase: ' + err.message };
  }
}

function sortDataNewestFirst(dataList) {
  if (!Array.isArray(dataList) || dataList.length <= 1) return dataList || [];
  let list = [...dataList];
  let hasValidTimestamp = list.some(a => {
    if (!a) return false;
    let t = a.created_at || a.createdat || a.CREATED_AT || a.CREATEDAT;
    if (!t) return false;
    let d = new Date(t).getTime();
    return !isNaN(d) && d > 1000000;
  });
  if (hasValidTimestamp) {
    list.sort((a, b) => {
      let timeA = a ? (a.created_at || a.createdat || a.CREATED_AT || a.CREATEDAT || '') : '';
      let timeB = b ? (b.created_at || b.createdat || b.CREATED_AT || b.CREATEDAT || '') : '';
      let dateA = new Date(timeA).getTime();
      let dateB = new Date(timeB).getTime();
      if (!isNaN(dateA) && !isNaN(dateB) && dateA !== dateB) {
        return dateB - dateA;
      }
      return 0;
    });
    return list;
  }
  list.reverse();
  return list;
}

function sensorPhoneNumber(hp) {
  if (!hp || hp === '-' || hp === 'XXXXX') return '****';
  let str = String(hp).trim();
  if (str.length <= 4) return '****';
  let start = str.substring(0, 4);
  let end = str.substring(str.length - 3);
  let middleLen = str.length - 7;
  if (middleLen <= 0) middleLen = 3;
  return start + '*'.repeat(middleLen) + end;
}
window.sensorPhoneNumber = sensorPhoneNumber;

// Favicon mengikuti logo aplikasi (default img/logo.webp; ikut berubah saat logo diganti di Pengaturan)
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
window.applyFavicon = applyFavicon;

async function callGASGet(actionName, params = {}) {
  try {
    if (actionName === 'getDaftarBarangAset') {
      const { data: safeAset } = await safeSupabaseSelect('Aset');
      if (!safeAset || safeAset.length === 0) return { status: 'success', data: [] };
      let listBarang = safeAset.map(item => {
        let bId = item.id || item.ID || cariNilaiKolom(item, ['id']);
        let bNama = cariNilaiKolom(item, ['nama_barang', 'nama_aset', 'nama', 'barang']);
        let bStok = parseInt(cariNilaiKolom(item, ['stok_tersedia', 'jumlah', 'stok', 'stock', 'qty']) || 0);
        return { id: bId || bNama, nama: bNama, stok: bStok };
      }).filter(b => b.nama);
      return { status: 'success', data: listBarang };
    }
    if (actionName === 'getRiwayatPeminjaman') {
      const { data: safeRiwayat } = await safeSupabaseSelect('Peminjaman');
      if (!safeRiwayat || safeRiwayat.length === 0) return { status: 'success', data: [] };
      let listRiwayat = safeRiwayat.map(item => ({
        idPinjam: item.id || cariNilaiKolom(item, ['id', 'id_pinjam']),
        namaPeminjam: cariNilaiKolom(item, ['nama_peminjam', 'nama', 'peminjam']),
        namaBarang: cariNilaiKolom(item, ['nama_barang', 'nama_aset', 'barang']),
        jumlahMinta: parseInt(cariNilaiKolom(item, ['jumlah', 'qty', 'minta']) || 0),
        jumlahAcc: parseInt(cariNilaiKolom(item, ['acc', 'jumlah_acc', 'qty_acc']) || 0),
        keterangan: cariNilaiKolom(item, ['keterangan', 'ket_warga', 'keterangan_warga']),
        catatanRt: cariNilaiKolom(item, ['catatan_rt', 'lokasi', 'catatan']),
        status: cariNilaiKolom(item, ['status']) || 'Menunggu Verifikasi',
        nik: cariNilaiKolom(item, ['nik'])
      }));
      let sortedRiwayat = sortDataNewestFirst(listRiwayat);
      return { status: 'success', data: sortedRiwayat };
    }

const FALLBACK_HEADERS = {
  'Warga': ['id', 'nama_lengkap', 'nama_panggilan', 'nik', 'no_kk', 'tempat_lahir', 'tanggal_lahir', 'jenis_kelamin', 'alamat', 'status_nikah', 'status_tinggal', 'pekerjaan', 'no_hp', 'foto_url'],
  'Iuran': ['id', 'nik', 'nama', 'no_kk', 'bulan', 'tahun', 'nominal', 'status', 'tanggal_bayar', 'diterima_oleh', 'bukti_transfer'],
  'Pengaduan': ['id', 'nama', 'nik', 'no_hp', 'jenis_aduan', 'keterangan', 'tanggal', 'foto_url', 'status', 'foto_penyelesaian'],
  'SuratPengantar': ['id', 'nama', 'nik', 'alamat', 'rt', 'jenis_surat', 'keterangan', 'status', 'keterangan_admin'],
  'Keuangan': ['id', 'tanggal', 'pemasukan', 'pengeluaran', 'keterangan', 'saldo', 'foto_url'],
  'Sumbangan': ['id', 'nama', 'tanggal', 'jenis_sumbangan', 'keterangan', 'nominal', 'bukti_transfer', 'status', 'nik'],
  'Aset': ['id', 'nama_barang', 'kondisi', 'jumlah', 'status_barang'],
  'Peminjaman': ['id', 'nama_peminjam', 'id_barang', 'nama_barang', 'jumlah_minta', 'acc', 'keterangan', 'catatan_rt', 'status', 'tanggal', 'nik', 'jumlah'],
  'Aspirasi': ['id', 'tanggal', 'isi_aspirasi', 'status', 'nama'],
  'Kelahiran': ['id', 'nama_bayi', 'tanggal_lahir', 'nama_ayah', 'nama_ibu', 'alamat', 'rt'],
  'Kematian': ['id', 'nama', 'nik', 'no_kk', 'tanggal_meninggal', 'rt', 'alamat', 'keterangan'],
  'PindahMasuk': ['id', 'nama', 'nik', 'no_kk', 'asal', 'alamat_baru', 'rt', 'tanggal_pindah', 'status_pindah'],
  'PindahKeluar': ['id', 'nama', 'nik', 'no_kk', 'alamat_tujuan', 'rt', 'rw', 'tanggal_pindah']
};

function canonicalTableHeaders(sheetName, sampleRow) {
  const rowKeys = (sampleRow && typeof sampleRow === 'object') ? Object.keys(sampleRow) : [];
  const base = FALLBACK_HEADERS[sheetName] || [];
  const known = base.filter(k => rowKeys.indexOf(k) > -1);
  // Kolom teknis (created_at dsb.) jangan ikut tampil di tabel data
  const hiddenCols = ['created_at', 'createdat', 'updated_at', 'timestamp'];
  const extra = rowKeys.filter(k => base.indexOf(k) === -1 && hiddenCols.indexOf(String(k).toLowerCase()) === -1);
  return known.concat(extra);
}

    if (actionName === 'getTableData') {
      const sheetName = params.sheetName;
      const { data: safeData } = await safeSupabaseSelect(sheetName);
      if (!safeData || safeData.length === 0) {
        let fallbackH = FALLBACK_HEADERS[sheetName] || FALLBACK_HEADERS['Warga'];
        return { status: 'success', headers: fallbackH, rows: [] };
      }
      let filteredData = safeData;
      let userRoleValidated = await getValidUserRole();
      if (userRoleValidated !== 'RT') {
        let userNik = (session.nik || '').toString().trim();
        let userNama = (session.nama || '').toString().trim().toLowerCase();
        if (['Pengaduan', 'SuratPengantar', 'Peminjaman', 'Sumbangan'].includes(sheetName)) {
          filteredData = filteredData.filter(row => {
            let rNik = cariNilaiKolom(row, ['nik', 'ktp', 'no_ktp']).trim();
            let rNama = cariNilaiKolom(row, ['nama', 'nama_lengkap', 'nama_peminjam', 'pelapor', 'pemohon']).toLowerCase().trim();
            let matchNik = userNik && rNik && rNik === userNik;
            let matchNama = userNama && rNama && (rNama === userNama || rNama.includes(userNama) || userNama.includes(rNama));
            return matchNik || matchNama;
          });
        }
      }
      if (filteredData.length === 0) {
        const headers = canonicalTableHeaders(sheetName, safeData[0]);
        return { status: 'success', headers: headers, rows: [] };
      }
      const headers = canonicalTableHeaders(sheetName, filteredData[0]);
      let sortedFiltered = sortDataNewestFirst(filteredData);
      const rows = sortedFiltered.map(row => headers.map(h => row[h] !== null && row[h] !== undefined ? row[h] : ''));
      return { status: 'success', headers: headers, rows: rows };
    }
    if (actionName === 'getIuranData') {
      const { data: safeData } = await safeSupabaseSelect('Iuran');
      if (!safeData || safeData.length === 0) return { status: 'success', headers: [], rows: [] };
      let filteredData = safeData;
      let isRT = await isVerifiedRT();
      if (!isRT && session.nik) {
        let userKk = '';
        const { data: safeWarga } = await safeSupabaseSelect('Warga');
        if (safeWarga) {
          const targetWarga = safeWarga.find(w => {
            let wNik = cariNilaiKolom(w, ['nik', 'ktp']);
            return wNik && wNik.toString().trim() === session.nik.toString().trim();
          });
          if (targetWarga) userKk = cariNilaiKolom(targetWarga, ['kk', 'no_kk']);
        }
        filteredData = filteredData.filter(row => {
          let rNik = cariNilaiKolom(row, ['nik', 'ktp']);
          let rKk = cariNilaiKolom(row, ['kk', 'no_kk']);
          return (rNik && rNik.toString().trim() === session.nik.toString().trim()) || (userKk && rKk && rKk === userKk);
        });
      }
      if (filteredData.length === 0) {
        const headers = safeData.length > 0 ? canonicalTableHeaders('Iuran', safeData[0]) : FALLBACK_HEADERS['Iuran'];
        return { status: 'success', headers: headers, rows: [] };
      }
      const headers = canonicalTableHeaders('Iuran', filteredData[0]);
      const rows = filteredData.map(row => headers.map(h => row[h] !== null && row[h] !== undefined ? row[h] : ''));
      return { status: 'success', headers: headers, rows: rows };
    }
    if (actionName === 'getNotifications') {
      const cleanRole = (await getValidUserRole()).toLowerCase();
      const userNik = (session.nik || '').toString().trim();
      const userNama = (session.nama || '').toString().toLowerCase().trim();
      let notifs = [];
      const [aRes, sRes, pRes, iRes, sumRes, aspRes, bRes, kRes, mRes, pmRes, pkRes] = await Promise.all([
        safeSupabaseSelect('Pengaduan'),
        safeSupabaseSelect('SuratPengantar'),
        safeSupabaseSelect('Peminjaman'),
        safeSupabaseSelect('Iuran'),
        safeSupabaseSelect('Sumbangan'),
        safeSupabaseSelect('Aspirasi'),
        safeSupabaseSelect('Bansos'),
        safeSupabaseSelect('Kelahiran'),
        safeSupabaseSelect('Kematian'),
        safeSupabaseSelect('PindahMasuk'),
        safeSupabaseSelect('PindahKeluar')
      ]);
      const extractDate = (item, preferKeys) => {
        if (!item || typeof item !== 'object') return null;
        const commonKeys = ['created_at', 'createdat', 'updated_at', 'timestamp', 'waktu', 'tanggal', 'tanggal_bayar', 'tanggal_pindah', 'tanggal_lahir', 'tanggal_meninggal', 'tgl', 'date', 'datetime'];
        const keys = [...(preferKeys || []), ...commonKeys];
        for (let k of keys) {
          let v = item[k] || item[k.toUpperCase()];
          if (v) { let d = new Date(v); if (!isNaN(d.getTime()) && d.getFullYear() > 2000) return v; }
        }
        for (let key of Object.keys(item)) {
          let v = item[key];
          if (!v || typeof v !== 'string' || v.length < 6) continue;
          let d = new Date(v);
          if (!isNaN(d.getTime()) && d.getFullYear() > 2000 && d.getFullYear() < 2100) return v;
        }
        return null;
      };
      // Pencocokan milik sendiri: NIK / No.KK keluarga / nama (konsisten untuk semua menu)
      const matchUser = (row, namaKeys) => {
        let itemNik  = cariNilaiKolom(row, ['nik', 'ktp']).trim();
        let itemKk   = cariNilaiKolom(row, ['kk', 'no_kk']).trim();
        let itemNama = cariNilaiKolom(row, namaKeys).toLowerCase().trim();
        if (userNik && itemNik && itemNik === userNik) return true;
        if (userKk && itemKk && itemKk === userKk) return true;
        return !!(userNama && itemNama && (itemNama === userNama || itemNama.includes(userNama) || userNama.includes(itemNama)));
      };
      // Status yang berarti "belum diproses RT" -> warga TIDAK dapat notifikasi (muncul setelah RT verifikasi)
      const statusBelum = (st) => {
        let s = String(st || '').toLowerCase().trim();
        return !s || s.includes('belum') || s.includes('menunggu') || s.includes('baru') || s.includes('pending');
      };
      // Waktu notifikasi Bansos: utamakan "diambil_pada" (saat RT verifikasi, format dd/mm/yyyy hh:mm WIB)
      // jika status sudah diambil; selain itu pakai created_at/verified_at.
      const extractBansosNotifDate = (item) => {
        let st = String(cariNilaiKolom(item, ['status']) || '').toLowerCase();
        let taken = String(cariNilaiKolom(item, ['diambil_pada']) || '').trim();
        if (st.includes('sudah') && taken && taken !== '-' && /^\d{1,2}\/\d{1,2}\/\d{4}/.test(taken)) {
          return taken; // "10/08/2026 01:05 WIB" -> diparse oleh parseTanggalKeDate
        }
        return extractDate(item, ['verified_at']);
      };
      // No.KK pengguna — agar keluarga (no_kk sama) ikut mendapat notifikasi
      let userKk = '';
      try {
        const { data: wargaAll } = await safeSupabaseSelect('Warga');
        if (wargaAll) {
          const targetWarga = wargaAll.find(w => {
            let wNik = cariNilaiKolom(w, ['nik', 'ktp']);
            return wNik && wNik.toString().trim() === userNik;
          });
          if (targetWarga) userKk = (cariNilaiKolom(targetWarga, ['kk', 'no_kk']) || '').toString().trim();
        }
      } catch(e) {}
      if (cleanRole === 'rt') {
        (aRes.data || []).forEach(item => {
          let st    = cariNilaiKolom(item, ['status']) || 'Baru';
          let jenis = cariNilaiKolom(item, ['jenis_aduan', 'jenis']) || 'Umum';
          let nama  = cariNilaiKolom(item, ['nama', 'nama_lengkap', 'pelapor']) || 'Warga';
          let id    = item.id || cariNilaiKolom(item, ['id']) || ('ADU-' + Math.random());
          let rawDate = extractDate(item);
          notifs.push({ id, menu: 'Pengaduan', pesan: `Aduan ${jenis} dari ${nama}: (${st})`, rawDate });
        });
        (sRes.data || []).forEach(item => {
          let st    = cariNilaiKolom(item, ['status']) || '';
          let stL   = st.toLowerCase();
          if (stL.includes('belum') || stL.includes('menunggu') || stL.includes('baru') || !st) {
            let nama      = cariNilaiKolom(item, ['nama', 'nama_lengkap', 'pemohon']) || 'Warga';
            let jenisSurat= cariNilaiKolom(item, ['jenis_surat', 'keperluan', 'jenis']) || 'Surat';
            let id        = item.id || cariNilaiKolom(item, ['id']) || ('SRT-' + Math.random());
            let rawDate   = extractDate(item);
            notifs.push({ id, menu: 'SuratPengantar', pesan: `Pengajuan ${jenisSurat} dari ${nama}`, rawDate });
          }
        });
        (pRes.data || []).forEach(item => {
          let st  = cariNilaiKolom(item, ['status']) || '';
          let stL = st.toLowerCase();
          if (stL.includes('menunggu') || stL.includes('belum') || stL.includes('baru') || !st) {
            let nama  = cariNilaiKolom(item, ['nama_peminjam', 'nama', 'peminjam']) || 'Warga';
            let barang= cariNilaiKolom(item, ['nama_barang', 'nama_aset', 'barang']) || 'Aset';
            let qty   = cariNilaiKolom(item, ['jumlah', 'qty']) || '1';
            let id    = item.id || cariNilaiKolom(item, ['id', 'id_pinjam']) || ('PIN-' + Math.random());
            let rawDate = extractDate(item);
            notifs.push({ id, menu: 'Aset', pesan: `Pengajuan Pinjam ${barang} (${qty} unit) dari ${nama}`, rawDate });
          }
        });
        (iRes.data || []).forEach(item => {
          let st  = cariNilaiKolom(item, ['status']) || '';
          let stL = st.toLowerCase();
          if (stL.includes('menunggu') || stL.includes('verifikasi')) {
            let nama  = cariNilaiKolom(item, ['nama', 'nama_lengkap']) || 'Warga';
            let bulan = cariNilaiKolom(item, ['bulan']) || '';
            let tahun = cariNilaiKolom(item, ['tahun']) || '';
            let id    = item.id || cariNilaiKolom(item, ['id']) || ('IUR-' + Math.random());
            let rawDate = extractDate(item);
            notifs.push({ id, menu: 'Iuran', pesan: `Iuran ${bulan} ${tahun} dari ${nama} perlu verifikasi`, rawDate });
          }
        });
        (sumRes.data || []).forEach(item => {
          let st  = cariNilaiKolom(item, ['status']) || '';
          let stL = st.toLowerCase();
          if (stL.includes('belum') || stL.includes('menunggu') || stL.includes('baru') || !st) {
            let nama  = cariNilaiKolom(item, ['nama', 'nama_lengkap']) || 'Warga';
            let id    = item.id || cariNilaiKolom(item, ['id']) || ('SUM-' + Math.random());
            let rawDate = extractDate(item);
            notifs.push({ id, menu: 'Sumbangan', pesan: `Sumbangan Baru dari ${nama} (${st || 'Belum diverifikasi'})`, rawDate });
          }
        });
        (aspRes.data || []).forEach(item => {
          let st  = cariNilaiKolom(item, ['status']) || '';
          let stL = st.toLowerCase();
          if (stL.includes('baru') || !st) {
            let isi = cariNilaiKolom(item, ['isi_aspirasi', 'isi', 'aspirasi', 'pesan', 'saran']) || 'Masukan baru';
            let id  = item.id || cariNilaiKolom(item, ['id']) || ('ASP-' + Math.random());
            let rawDate = extractDate(item);
            notifs.push({ id, menu: 'Aspirasi', pesan: `Aspirasi Anonim: "${isi.length > 35 ? isi.substring(0, 35) + '...' : isi}"`, rawDate });
          }
        });
        (bRes.data || []).forEach(item => {
          let st  = cariNilaiKolom(item, ['status']) || '';
          let stL = st.toLowerCase();
          if (stL.includes('belum') || stL.includes('kedaluwarsa') || stL.includes('menunggu') || !st) {
            let nama  = cariNilaiKolom(item, ['nama', 'nama_lengkap']) || 'Warga';
            let jenis = cariNilaiKolom(item, ['jenis_bansos', 'jenis']) || 'Bansos';
            let id    = item.id || cariNilaiKolom(item, ['id']) || ('BAN-' + Math.random());
            let rawDate = extractDate(item);
            notifs.push({ id, menu: 'Bansos', pesan: `Bansos ${jenis} untuk ${nama}: ${st || 'Belum Diambil'}`, rawDate });
          }
        });
        (kRes.data || []).forEach(item => {
          let namaBayi = cariNilaiKolom(item, ['nama_bayi', 'nama']) || 'anak baru';
          let id       = item.id || cariNilaiKolom(item, ['id']) || ('KLH-' + Math.random());
          let rawDate  = extractDate(item);
          notifs.push({ id, menu: 'Kelahiran', pesan: `Kelahiran baru: ${namaBayi}`, rawDate });
        });
        (mRes.data || []).forEach(item => {
          let nama   = cariNilaiKolom(item, ['nama', 'nama_lengkap']) || 'Warga';
          let id     = item.id || cariNilaiKolom(item, ['id']) || ('KMT-' + Math.random());
          let rawDate = extractDate(item);
          notifs.push({ id, menu: 'Kematian', pesan: `Kematian baru: ${nama}`, rawDate });
        });
        (pmRes.data || []).forEach(item => {
          let nama   = cariNilaiKolom(item, ['nama', 'nama_lengkap']) || 'Warga';
          let asal   = cariNilaiKolom(item, ['asal']) || '-';
          let id     = item.id || cariNilaiKolom(item, ['id']) || ('PMS-' + Math.random());
          let rawDate = extractDate(item);
          notifs.push({ id, menu: 'PindahMasuk', pesan: `Pindah masuk: ${nama} dari ${asal}`, rawDate });
        });
        (pkRes.data || []).forEach(item => {
          let nama   = cariNilaiKolom(item, ['nama', 'nama_lengkap']) || 'Warga';
          let tujuan = cariNilaiKolom(item, ['alamat_tujuan', 'tujuan']) || '-';
          let id     = item.id || cariNilaiKolom(item, ['id']) || ('PKL-' + Math.random());
          let rawDate = extractDate(item);
          notifs.push({ id, menu: 'PindahKeluar', pesan: `Pindah keluar: ${nama} ke ${tujuan}`, rawDate });
        });
      } else {
        (aRes.data || []).forEach(item => {
          if (matchUser(item, ['nama', 'nama_lengkap', 'pelapor'])) {
            let st    = cariNilaiKolom(item, ['status']) || '';
            if (statusBelum(st)) return; // belum diproses RT -> jangan notifikasi
            let jenis = cariNilaiKolom(item, ['jenis_aduan', 'jenis']) || 'Aduan';
            let id    = item.id || cariNilaiKolom(item, ['id']);
            let rawDate = extractDate(item, ['verified_at']);
            notifs.push({ id, menu: 'Pengaduan', pesan: `Status Aduan ${jenis}: ${st}`, rawDate });
          }
        });
        (sRes.data || []).forEach(item => {
          if (matchUser(item, ['nama', 'nama_lengkap', 'pemohon'])) {
            let st = cariNilaiKolom(item, ['status']) || '';
            if (statusBelum(st)) return; // belum diproses RT -> jangan notifikasi
            let id = item.id || cariNilaiKolom(item, ['id']);
            let rawDate = extractDate(item, ['verified_at']);
            notifs.push({ id, menu: 'SuratPengantar', pesan: `Surat Pengantar Anda: Status kini "${st}"`, rawDate });
          }
        });
        (pRes.data || []).forEach(item => {
          if (matchUser(item, ['nama_peminjam', 'nama', 'peminjam'])) {
            let st     = cariNilaiKolom(item, ['status']) || '';
            if (statusBelum(st)) return; // belum diproses RT -> jangan notifikasi
            let barang = cariNilaiKolom(item, ['nama_barang', 'nama_aset', 'barang']) || 'Barang';
            let id     = item.id || cariNilaiKolom(item, ['id']);
            let rawDate = extractDate(item, ['verified_at']);
            notifs.push({ id, menu: 'Aset', pesan: `Peminjaman ${barang}: ${st}`, rawDate });
          }
        });
        (iRes.data || []).forEach(item => {
          if (matchUser(item, ['nama', 'nama_lengkap'])) {
            let st    = cariNilaiKolom(item, ['status']) || '';
            let bulan = cariNilaiKolom(item, ['bulan']) || '';
            let id    = item.id || cariNilaiKolom(item, ['id']);
            let rawDate = extractDate(item, ['verified_at']);
            // FIX: Jangan sampai status "Belum Lunas" terdeteksi sebagai lunas
            // ("belum lunas" mengandung kata "lunas"). Notifikasi LUNAS hanya
            // muncul jika status benar-benar lunas.
            let stLower = st.toLowerCase();
            let isLunas = stLower === 'lunas' || (stLower.includes('lunas') && !stLower.includes('belum'));
            if (isLunas) {
              notifs.push({ id, menu: 'Iuran', pesan: `Iuran ${bulan} telah LUNAS diverifikasi RT!`, rawDate });
            }
          }
        });
        (sumRes.data || []).forEach(item => {
          if (matchUser(item, ['nama', 'nama_lengkap'])) {
            let st      = cariNilaiKolom(item, ['status']) || '';
            if (statusBelum(st)) return; // belum diverifikasi RT -> jangan notifikasi
            let id      = item.id || cariNilaiKolom(item, ['id']);
            let rawDate = extractDate(item, ['verified_at']);
            notifs.push({ id, menu: 'Sumbangan', pesan: `Sumbangan Anda: ${st}`, rawDate });
          }
        });
        (aspRes.data || []).forEach(item => {
          if (matchUser(item, ['nama'])) {
            let st      = cariNilaiKolom(item, ['status']) || '';
            if (statusBelum(st)) return; // belum direspon RT -> jangan notifikasi
            let isi     = cariNilaiKolom(item, ['isi_aspirasi', 'isi', 'aspirasi', 'pesan', 'saran']) || 'Masukan baru';
            let id      = item.id || cariNilaiKolom(item, ['id']);
            let rawDate = extractDate(item, ['verified_at']);
            notifs.push({ id, menu: 'Aspirasi', pesan: `Aspirasi Anda: ${st}`, rawDate });
          }
        });
        (bRes.data || []).forEach(item => {
          if (matchUser(item, ['nama', 'nama_lengkap'])) {
            let st      = cariNilaiKolom(item, ['status']) || '';
            let jenis   = cariNilaiKolom(item, ['jenis_bansos', 'jenis']) || 'Bansos';
            let id      = item.id || cariNilaiKolom(item, ['id']);
            let rawDate = extractBansosNotifDate(item);
            notifs.push({ id, menu: 'Bansos', pesan: `Bansos Anda (${jenis}): ${st || 'Belum Diambil'}`, rawDate });
          }
        });
        (kRes.data || []).forEach(item => {
          if (matchUser(item, ['nama_bayi', 'nama_ayah', 'nama_ibu', 'nama'])) {
            let namaBayi = cariNilaiKolom(item, ['nama_bayi', 'nama']) || 'anak baru';
            let id       = item.id || cariNilaiKolom(item, ['id']);
            let rawDate  = extractDate(item);
            notifs.push({ id, menu: 'Kelahiran', pesan: `Kelahiran: ${namaBayi}`, rawDate });
          }
        });
        (mRes.data || []).forEach(item => {
          if (matchUser(item, ['nama', 'nama_lengkap'])) {
            let nama    = cariNilaiKolom(item, ['nama', 'nama_lengkap']) || 'Warga';
            let id      = item.id || cariNilaiKolom(item, ['id']);
            let rawDate = extractDate(item);
            notifs.push({ id, menu: 'Kematian', pesan: `Kematian: ${nama}`, rawDate });
          }
        });
        (pmRes.data || []).forEach(item => {
          if (matchUser(item, ['nama', 'nama_lengkap'])) {
            let nama    = cariNilaiKolom(item, ['nama', 'nama_lengkap']) || 'Warga';
            let asal    = cariNilaiKolom(item, ['asal']) || '-';
            let id      = item.id || cariNilaiKolom(item, ['id']);
            let rawDate = extractDate(item);
            notifs.push({ id, menu: 'PindahMasuk', pesan: `Pindah masuk: ${nama} dari ${asal}`, rawDate });
          }
        });
        (pkRes.data || []).forEach(item => {
          if (matchUser(item, ['nama', 'nama_lengkap'])) {
            let nama    = cariNilaiKolom(item, ['nama', 'nama_lengkap']) || 'Warga';
            let tujuan  = cariNilaiKolom(item, ['alamat_tujuan', 'tujuan']) || '-';
            let id      = item.id || cariNilaiKolom(item, ['id']);
            let rawDate = extractDate(item);
            notifs.push({ id, menu: 'PindahKeluar', pesan: `Pindah keluar: ${nama} ke ${tujuan}`, rawDate });
          }
        });
      }
      return { status: 'success', data: notifs };
    }
    if (actionName === 'getInfoWarga') {
      const { data: safeData } = await safeSupabaseSelect('Pengaturan');
      let target = safeData ? safeData.find(x => {
        let k = x.kunci || cariNilaiKolom(x, ['kunci', 'key']);
        return k && k.toString().toLowerCase().trim() === 'info_warga';
      }) : null;
      let val = target ? (target.nilai !== null && target.nilai !== undefined ? target.nilai : cariNilaiKolom(target, ['nilai', 'value'])) : '';
      if (val) {
        appSettings.info_warga = val;
        try {
          localStorage.setItem('rt_app_settings_cache', JSON.stringify(appSettings));
        } catch(e) {}
      }
      return { status: 'success', data: val || appSettings.info_warga || '' };
    }
    if (actionName === 'getDashboardSummary') {
      const cleanRole = (await getValidUserRole()).toLowerCase();
      if (cleanRole === 'rt') {
        const [wRes, aRes, kRes, sRes, sumRes] = await Promise.all([
          safeSupabaseSelect('Warga'), safeSupabaseSelect('Pengaduan'),
          safeSupabaseSelect('Keuangan'), safeSupabaseSelect('SuratPengantar'),
          safeSupabaseSelect('Sumbangan')
        ]);
        return {
          status: 'success', role: 'RT',
          warga:    wRes.data   ? wRes.data.length   : 0,
          aduan:    aRes.data   ? aRes.data.length   : 0,
          keuangan: kRes.data   ? kRes.data.length   : 0,
          surat:    sRes.data   ? sRes.data.length   : 0,
          sumbangan:sumRes.data ? sumRes.data.length : 0
        };
      } else {
        const countByNik = (safeData) => {
          if (!safeData) return 0;
          return safeData.filter(row => {
            let rNik = cariNilaiKolom(row, ['nik', 'ktp']);
            return rNik && rNik.toString().trim() === session.nik.toString().trim();
          }).length;
        };
        const [aRes, sRes, sumRes] = await Promise.all([
          safeSupabaseSelect('Pengaduan'), safeSupabaseSelect('SuratPengantar'),
          safeSupabaseSelect('Sumbangan')
        ]);
        return { status: 'success', role: 'Warga', aduan: countByNik(aRes.data), surat: countByNik(sRes.data), sumbangan: countByNik(sumRes.data) };
      }
    }
    if (actionName === 'getDaftarWargaUntukIuran') {
      const { data: safeData } = await safeSupabaseSelect('Warga');
      return { status: 'success', data: safeData || [] };
    }
    if (actionName.toLowerCase().includes('profil') || actionName.toLowerCase().includes('profile')) {
      const nikCari = params.nik || session.nik || session.nama;
      const { data: safeWarga } = await safeSupabaseSelect('Warga');
      if (!safeWarga || safeWarga.length === 0) return { status: 'error', message: 'Data warga tidak ditemukan' };
      let myData = null, myKk = '';
      for (let w of safeWarga) {
        let wNik = cariNilaiKolom(w, ['nik', 'ktp']);
        if (wNik && wNik.toString().trim() === String(nikCari).trim()) { myData = w; myKk = cariNilaiKolom(w, ['kk', 'no_kk']); break; }
      }
      if (!myData && nikCari) {
        myData = safeWarga.find(w => { let wNama = cariNilaiKolom(w, ['nama', 'name']); return wNama && wNama.toLowerCase().includes(String(nikCari).toLowerCase()); });
        if (myData) myKk = cariNilaiKolom(myData, ['kk', 'no_kk']);
      }
      if (!myData) return { status: 'error', message: 'Profil Anda belum terdaftar!' };
      let keluarga = myKk ? safeWarga.filter(w => {
        let wKk  = cariNilaiKolom(w, ['kk', 'no_kk']);
        let wNik = cariNilaiKolom(w, ['nik', 'ktp']);
        return wKk && wKk === myKk && wNik !== cariNilaiKolom(myData, ['nik', 'ktp']);
      }) : [];
      const headers = canonicalTableHeaders('Warga', myData);
      headers.forEach(h => {
        if (h.toLowerCase().includes('foto') || h.toLowerCase().includes('bukti')) {
          myData[h] = convertToImageLink(myData[h]);
          keluarga.forEach(m => { m[h] = convertToImageLink(m[h]); });
        }
      });
      return { status: 'success', pribadi: myData, keluarga, headers, data: myData, row: myData, user: myData };
    }
    if (actionName.toLowerCase().startsWith('get') && actionName.toLowerCase().endsWith('data')) {
      let rawName = actionName.replace(/^get/i, '').replace(/data$/i, '');
      let tableName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
      const { data: safeData } = await safeSupabaseSelect(tableName);
      if (safeData && safeData.length > 0) {
        const headers = canonicalTableHeaders(tableName, safeData[0]);
        const rows = safeData.map(row => headers.map(h => row[h] !== null && row[h] !== undefined ? row[h] : ''));
        return { status: 'success', headers, rows, data: safeData };
      }
    }
    return { status: 'error', message: 'Aksi GET tidak dikenal: ' + actionName };
  } catch (err) {
    console.error('Fetch Error (GET):', err);
    return { status: 'error', message: 'Gagal memuat data Supabase: ' + err.message };
  }
}

function playNotifSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  } catch (e) {}
}

function requestNotifPermission() {
  if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
}

function triggerNativeBrowserNotif(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      let notifIcon = appSettings.app_logo || './img/logo.jpg';
      if (navigator.serviceWorker && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification(title, {
            body: body,
            icon: notifIcon,
            badge: notifIcon,
            vibrate: [200, 100, 200],
            tag: 'kahfi-notif-' + Date.now(),
            renotify: true
          });
        }).catch(() => {
          new Notification(title, { body, icon: notifIcon });
        });
      } else {
        new Notification(title, { body, icon: notifIcon });
      }
    } catch(e) {}
  }
}

function initRealtimeNotif() {
  if (!db || !session.token) return;
  if (supabaseRealtimeChannel) db.removeChannel(supabaseRealtimeChannel);
  supabaseRealtimeChannel = db
    .channel('rt-realtime-notif')
    .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
      console.log('⚡ Realtime Update Diterima:', payload.table);
      
      // 🔔 Kirim notifikasi native jika ada perubahan data (kecuali Sessions & Notifikasi)
      if (payload.table !== 'Sessions' && payload.table !== 'sessions' && payload.table !== 'Notifikasi') {
        // Trigger notifikasi suara
        playNotifSound();
        
        // Kirim notifikasi native browser
        triggerNativeBrowserNotif(
          '📢 Info Baru di RT 5',
          `Ada pembaruan data di ${payload.table}`
        );
        
        // Fetch notifikasi terbaru
        fetchNotifikasi(true);
      }
      
      // Verifikasi sesi jika ada perubahan di tabel Sessions
      if (payload.table === 'Sessions' || payload.table === 'sessions') {
        verifySessionToken();
      }
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') console.log('🟢 Supabase Realtime Listener Active!');
    });
}

let rtPingChannel = null;
// Broadcast ping: data berubah di satu perangkat -> semua perangkat langsung refresh notifikasi/badge
function initRealtimePing() {
  if (!db) return;
  try {
    if (rtPingChannel) db.removeChannel(rtPingChannel);
    rtPingChannel = db
      .channel('rt-ping')
      .on('broadcast', { event: 'data-changed' }, function() {
        if (session && session.token) {
          fetchNotifikasi(true);
          if (typeof updateMenuBadges === 'function') updateMenuBadges();
        }
      })
      .subscribe();
  } catch(e) {}
}
function sendRealtimePing() {
  if (!db || !rtPingChannel) return;
  try {
    rtPingChannel.send({ type: 'broadcast', event: 'data-changed' });
  } catch(e) {}
}

function parseTanggalKeDate(dateVal) {
  if (!dateVal) return null;
  if (dateVal instanceof Date) return dateVal;
  let str = String(dateVal).trim();
  if (!str || str === '-') return null;
  let d = new Date(str);
  if (!isNaN(d.getTime())) return d;
  let parts = str.split(/[\/\-\s:]/);
  if (parts.length >= 3) {
    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10) - 1;
    let year = parseInt(parts[2], 10);
    let hour = parts.length >= 4 ? parseInt(parts[3], 10) : 0;
    let min = parts.length >= 5 ? parseInt(parts[4], 10) : 0;
    if (year < 100) year += 2000;
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      let d2 = new Date(year, month, day, hour, min);
      if (!isNaN(d2.getTime())) return d2;
    }
  }
  return null;
}

async function fetchNotifikasi(isRealtimeTrigger = false) {
  if (!session.token) return;
  const res = await callGASGet('getNotifications');
  if (res && res.status === 'success') {
    rawNotifData = res.data || [];
    let savedTimestamps = JSON.parse(localStorage.getItem('rt_notif_times_' + session.nik) || '{}');
    let now = new Date();
    rawNotifData.forEach(item => {
      let notifDate = null;
      if (item.rawDate) {
        notifDate = parseTanggalKeDate(item.rawDate);
      }
      if ((!notifDate || isNaN(notifDate.getTime())) && savedTimestamps[item.id]) {
        let savedDate = new Date(savedTimestamps[item.id]);
        if (!isNaN(savedDate.getTime())) notifDate = savedDate;
      }
      if (!notifDate || isNaN(notifDate.getTime())) {
        notifDate = new Date();
        savedTimestamps[item.id] = notifDate.toISOString();
      } else {
        savedTimestamps[item.id] = notifDate.toISOString();
      }
      item.timestampMs = notifDate.getTime();
      let nowJakarta = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
      let isHariIni = notifDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }) === nowJakarta;
      let jamStr = notifDate.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }).replace('.', ':') + ' WIB';
      item.waktuTampil = isHariIni ? jamStr : (notifDate.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day:'2-digit', month:'2-digit', year:'numeric' }) + ' ' + jamStr);
    });
    localStorage.setItem('rt_notif_times_' + session.nik, JSON.stringify(savedTimestamps));
    rawNotifData.sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0));
    let unreadCount = rawNotifData.length;
    if (isRealtimeTrigger && unreadCount > lastNotifCount && lastNotifCount !== 0) {
      playNotifSound();
      let notifTerbaru = rawNotifData[0];
      if (notifTerbaru) triggerNativeBrowserNotif(`RT 5 - ${notifTerbaru.menu}`, notifTerbaru.pesan);
    }
    lastNotifCount = unreadCount;
    let readCount = parseInt(localStorage.getItem('rt_notif_read_count_' + session.nik) || '0');
    if (rawNotifData.length < readCount) { readCount = 0; localStorage.setItem('rt_notif_read_count_' + session.nik, '0'); }
    let actualUnread = rawNotifData.length - readCount;
    document.querySelectorAll('.notif-badge').forEach(badge => {
      if (actualUnread > 0) {
        badge.innerText = actualUnread;
        badge.style.display = 'inline-block';
        badge.classList.add('animate-pulse');
      } else {
        badge.style.display = 'none';
        badge.classList.remove('animate-pulse');
      }
    });
    
    // 🔔 UPDATE BADGE NOTIFIKASI (TAMBAHKAN INI!)
    updateBadgeNotifikasi();
    updateMenuBadges();
  }
}

function bukaModalNotifikasi() {
  let listEl = document.getElementById('notifList');
  if (!rawNotifData || rawNotifData.length === 0) {
    listEl.innerHTML = '<div class="alert alert-light text-center my-3 text-muted"><i class="bi bi-bell-slash fs-4 d-block mb-2"></i>Tidak ada notifikasi baru saat ini.</div>';
  } else {
    let html = '<div class="list-group list-group-flush">';
    rawNotifData.forEach(item => {
      let waktu = item.waktuTampil || 'Baru saja';
      html += `
        <div class="list-group-item list-group-item-action py-3 px-2 border-bottom" style="cursor:pointer;" onclick="bukaNotifTarget('${item.menu}')">
          <div class="d-flex w-100 justify-content-between align-items-center mb-1">
            <span class="badge bg-primary">${item.menu}</span>
            <small class="text-muted"><i class="bi bi-clock me-1"></i>${waktu}</small>
          </div>
          <p class="mb-0 text-dark small">${item.pesan}</p>
        </div>`;
    });
    html += '</div>';
    listEl.innerHTML = html;
  }
  document.querySelectorAll('.notif-badge').forEach(badge => {
    badge.style.display = 'none';
    badge.innerText = '0';
    badge.classList.remove('animate-pulse');
  });
  localStorage.setItem('rt_notif_read_count_' + session.nik, rawNotifData.length);
  if (!bootstrapNotifModalInstance) bootstrapNotifModalInstance = new bootstrap.Modal(document.getElementById('notifModal'));
  bootstrapNotifModalInstance.show();
  
  // Tambahkan tombol "Tandai Semua Dibaca"
  setTimeout(() => {
    const notifList = document.getElementById('notifList');
    if (notifList) {
      const header = notifList.querySelector('.notif-header');
      if (!header) {
        const newHeader = document.createElement('div');
        newHeader.className = 'notif-header d-flex justify-content-between align-items-center mb-2 p-2 border-bottom';
        newHeader.innerHTML = `
          <span class="text-xs text-muted"><i class="bi bi-bell me-1"></i>Notifikasi</span>
          <button onclick="tandaiSemuaDibaca()" class="btn btn-sm btn-outline-primary py-0 px-2 rounded text-xs fw-bold">
            <i class="bi bi-check-all me-1"></i>Tandai Semua Dibaca
          </button>
        `;
        notifList.prepend(newHeader);
      }
    }
  }, 100);
}

function bukaNotifTarget(menuName) {
  if (bootstrapNotifModalInstance) bootstrapNotifModalInstance.hide();
  loadMenu(menuName);
}

// ============================================================
// FITUR NOTIFIKASI PUSH (TAMBAHKAN DI BAGIAN INI!)
// ============================================================

// 1. Minta Izin Notifikasi

// ============================================================
// AKHIR FITUR NOTIFIKASI PUSH
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
        console.log('PWA Installed!');
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
// WATCHER / PENJAGA PERMANEN MENU RT & PENGATURAN
// ============================================================
async function enforceAdminMenuVisibility() {
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
}

window.addEventListener('load', enforceAdminMenuVisibility);
setInterval(enforceAdminMenuVisibility, 3000);

console.log("%cMAU NGAPAIN LU? 🤨", "color:#ef4444;font-size:38px;font-weight:900;padding:10px;");
console.log("%cMending bayar iuran RT 5 daripada ngintipin console 🤣", "color:#2563eb;font-size:14px;font-weight:bold;");