function showUIToast(message, type = 'auto') {
  if (!message) return;
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
let _rawSession = { token: '', role: '', nik: '', nama: '', alamat: '', noHp: '' };
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
const DEFAULT_LOGO_BASE64 = "data:image/jpeg;base64,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";
const _k1 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
const _k2 = '.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlbXhzZ2lpc3FnbXZ0dW9ta2pxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4MTY3NjMsImV4cCI6MjEwMTM5Mjc2M30';
const _k3 = '.5oTxN3qZNdpks__10qIa7oWx2LsV7Vqr_E40V8OTqb8';
const SUPABASE_URL = 'https://pemxsgiisqgmvtuomkjq.supabase.co';
const SUPABASE_KEY = _k1 + _k2 + _k3;
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
async function safeSupabaseSelect(tableName) {
  try {
    if (tableName.toLowerCase() === 'warga') {
      let userToken = (session && session.token) ? String(session.token).trim() : '';
      let { data, error } = await db.rpc('get_warga_secured', { 
        p_token: userToken 
      });
      if (!error && data) return { data: makeCaseInsensitive(data), error: null };
    }
    let { data, error } = await db.from(tableName).select('*');
    if (!error && data) return { data: makeCaseInsensitive(data), error: null };
    let lowerName = tableName.toLowerCase();
    if (lowerName !== tableName) {
      let resLower = await db.from(lowerName).select('*');
      if (!resLower.error && resLower.data) return { data: makeCaseInsensitive(resLower.data), error: null };
    }
    let capName = tableName.charAt(0).toUpperCase() + tableName.slice(1).toLowerCase();
    if (capName !== tableName && capName !== lowerName) {
      let resCap = await db.from(capName).select('*');
      if (!resCap.error && resCap.data) return { data: makeCaseInsensitive(resCap.data), error: null };
    }
    return { data: makeCaseInsensitive(data || []), error: error };
  } catch(e) {
    return { data: [], error: e };
  }
}
async function safeSupabaseInsert(tableName, rows) {
  let lowerName = tableName.toLowerCase();
  if (['warga', 'users', 'pengaturan', 'keuangan'].includes(lowerName)) {
    if (!(await isVerifiedRT())) {
      return { error: { message: 'Akses ditolak! Sesi Anda bukan RT terverifikasi di database.' } };
    }
  }
  let { error } = await db.from(tableName).insert(rows);
  if (error) {
    if (lowerName !== tableName) {
      let resLower = await db.from(lowerName).insert(rows);
      if (!resLower.error) return { error: null };
    }
  }
  return { error };
}
function sanitizeFormData(sheetName, formData) {
  if (!formData || typeof formData !== 'object') return formData;
  let cleanData = { ...formData };
  for (let k in cleanData) {
    if (typeof cleanData[k] === 'object' && cleanData[k] !== null && cleanData[k].base64) {
      cleanData[k] = cleanData[k].base64;
    }
    let kLower = k.toLowerCase();
    let valStr = String(cleanData[k] !== null && cleanData[k] !== undefined ? cleanData[k] : '').trim();
    if (valStr === '') {
      if (['no_hp', 'hp', 'telp', 'wa', 'acc'].includes(kLower)) {
        cleanData[k] = null;
      } else if (['nominal', 'tahun', 'rt', 'jumlah', 'stok'].includes(kLower)) {
        cleanData[k] = 0;
      }
    } else if (['nik', 'no_hp', 'no_kk', 'nominal', 'tahun', 'rt', 'acc', 'jumlah', 'stok'].includes(kLower)) {
      let numOnly = valStr.replace(/[^0-9]/g, '');
      if (numOnly) {
        cleanData[k] = numOnly;
      } else if (['no_hp', 'acc'].includes(kLower)) {
        cleanData[k] = null;
      }
    }
  }
  return cleanData;
}
async function isVerifiedRT() {
  try {
    let savedRaw = localStorage.getItem('rt_user_session');
    if (!savedRaw) return false;
    let saved = JSON.parse(savedRaw);
    if (!saved || !saved.token) return false;
    let savedRole = (saved.role) ? String(saved.role).toUpperCase() : '';
    let currentRole = (session && session.role) ? String(session.role).toUpperCase() : '';
    if (savedRole !== 'RT' && currentRole !== 'RT') return false;
    let { data: sessData, error } = await db.from('Sessions').select('*').eq('token', saved.token);
    if (!error && sessData && sessData.length > 0) {
      let dbRole = (sessData[0].role || sessData[0].ROLE || '').toString().toUpperCase();
      return dbRole === 'RT';
    }
    return savedRole === 'RT' || currentRole === 'RT';
  } catch (e) {
    return (session && String(session.role).toUpperCase() === 'RT');
  }
}
async function safeSupabaseUpdate(tableName, payload, eqColumn, eqValue) {
  let lowerName = tableName.toLowerCase();
  if (['users', 'pengaturan', 'keuangan'].includes(lowerName)) {
    if (!(await isVerifiedRT())) {
      return { error: { message: 'Akses ditolak! Sesi Anda bukan RT terverifikasi di database.' } };
    }
  }
  payload = sanitizeFormData(tableName, payload);
  let cleanTable = tableName.charAt(0).toUpperCase() + tableName.slice(1);
  delete menuDataCache[cleanTable];
  delete menuDataCache[tableName];
  let { data, error } = await db.from(tableName).update(payload).eq(eqColumn, eqValue).select();
  if (!error && data && data.length > 0) return { error: null };
  if (lowerName !== tableName) {
    let resLower = await db.from(lowerName).update(payload).eq(eqColumn, eqValue).select();
    if (!resLower.error && resLower.data && resLower.data.length > 0) return { error: null };
  }
  let upperCol = eqColumn.toUpperCase();
  let resUpper = await db.from(tableName).update(payload).eq(upperCol, eqValue).select();
  if (!resUpper.error && resUpper.data && resUpper.data.length > 0) return { error: null };
  if (tableName.toLowerCase() === 'warga') {
    let targetNik = editingNik || (eqColumn.toLowerCase() === 'nik' ? eqValue : null);
    if (targetNik) {
      let numNik = String(targetNik).replace(/[^0-9]/g, '');
      if (numNik) {
        let resByNik = await db.from('Warga').update(payload).eq('nik', numNik).select();
        if (!resByNik.error && resByNik.data && resByNik.data.length > 0) return { error: null };
      }
    }
  }
  return { error: error || { message: 'Gagal memperbarui: Data tidak ditemukan di database!' } };
}
async function safeSupabaseDelete(tableName, eqColumn, eqValue) {
  if (!(await isVerifiedRT())) {
    return { error: { message: 'Akses ditolak! Sesi Anda bukan RT terverifikasi di database.' } };
  }
  let cleanTable = tableName.charAt(0).toUpperCase() + tableName.slice(1);
  delete menuDataCache[cleanTable];
  delete menuDataCache[tableName];
  let { data, error } = await db.from(tableName).delete().eq(eqColumn, eqValue).select();
  if (!error && data && data.length > 0) return { error: null };
  let lowerName = tableName.toLowerCase();
  if (lowerName !== tableName) {
    let resLower = await db.from(lowerName).delete().eq(eqColumn, eqValue).select();
    if (!resLower.error && resLower.data && resLower.data.length > 0) return { error: null };
  }
  let upperCol = eqColumn.toUpperCase();
  let resUpper = await db.from(tableName).delete().eq(upperCol, eqValue).select();
  if (!resUpper.error && resUpper.data && resUpper.data.length > 0) return { error: null };
  if (tableName.toLowerCase() === 'warga') {
    let targetNik = editingNik || (eqColumn.toLowerCase() === 'nik' ? eqValue : null);
    if (targetNik) {
      let numNik = String(targetNik).replace(/[^0-9]/g, '');
      if (numNik) {
        let resByNik = await db.from('Warga').delete().eq('nik', numNik).select();
        if (!resByNik.error && resByNik.data && resByNik.data.length > 0) return { error: null };
      }
    }
  }
  return { error: error || { message: 'Gagal menghapus: Data tidak ditemukan di database!' } };
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
async function callGASPost(actionName, extraPayload = {}) {
  try {
    if (actionName === 'processLogin') {
      const uClean = extraPayload.username ? extraPayload.username.toString().trim().toLowerCase() : '';
      const pClean = extraPayload.password ? extraPayload.password.toString().trim() : '';
      if (!uClean || !pClean) {
        return { status: 'error', message: 'Username dan Password tidak boleh kosong!' };
      }
      try {
        const { data, error } = await db.rpc('verify_user_login', {
          p_username: uClean,
          p_password: pClean
        });
        if (!error && data && data.status === 'success') {
          return data;
        }
      } catch (err) {
        console.warn('[Login] RPC Error, mencoba fallback...', err);
      }
      try {
        const { data: usersData } = await safeSupabaseSelect('Users');
        if (usersData && usersData.length > 0) {
          let matched = usersData.find(u => {
            let uName = cariNilaiKolom(u, ['username', 'user', 'nik']);
            let uPass = cariNilaiKolom(u, ['password', 'pass']);
            return uName.toLowerCase().trim() === uClean && uPass.trim() === pClean;
          });
          if (matched) {
            let roleVal = cariNilaiKolom(matched, ['role']) || 'RT';
            let nikVal  = cariNilaiKolom(matched, ['nik']) || uClean;
            let namaVal = cariNilaiKolom(matched, ['nama', 'nama_lengkap', 'name']);
            let alamatVal = cariNilaiKolom(matched, ['alamat']);
            let hpVal = cariNilaiKolom(matched, ['no_hp', 'hp', 'wa']);

            try {
              const { data: safeWarga } = await safeSupabaseSelect('Warga');
              if (safeWarga && safeWarga.length > 0) {
                let myW = safeWarga.find(w => {
                  let wNik = String(cariNilaiKolom(w, ['nik', 'ktp'])).trim();
                  let wUser = String(cariNilaiKolom(w, ['username', 'user'])).trim().toLowerCase();
                  return (wNik && wNik === String(nikVal).trim()) || (wUser && wUser === uClean);
                });
                if (myW) {
                  let wFullName = cariNilaiKolom(myW, ['nama_lengkap', 'nama']);
                  let wAlamat = cariNilaiKolom(myW, ['alamat', 'alamat_rumah']);
                  let wHp = cariNilaiKolom(myW, ['no_hp', 'hp', 'wa', 'telp']);
                  if (wFullName) namaVal = wFullName;
                  if (wAlamat) alamatVal = wAlamat;
                  if (wHp) hpVal = wHp;
                }
              }
            } catch(e) {}

            return {
              status: 'success',
              role: roleVal,
              nik: nikVal,
              nama: namaVal || uClean,
              alamat: alamatVal || '',
              noHp: hpVal || '',
              username: uClean,
              message: 'Login Berhasil!'
            };
          }
        }
      } catch (err) {
        console.warn('[Login] Fallback Users table error:', err);
      }
      return { status: 'error', message: 'Username atau Password salah!' };
    }
    if (actionName === 'simpanDataKeSheet') {
      const sheetName = extraPayload.sheetName;
      if (['Warga', 'Users', 'Pengaturan', 'Keuangan', 'Aset'].includes(sheetName)) {
        if (!(await isVerifiedRT())) {
          return { status: 'error', message: 'Akses ditolak! Sesi Anda bukan RT terverifikasi di database.' };
        }
      }
      let formData = { ...extraPayload.formData };
      if (!formData.id) formData.id = sheetName.substring(0,3).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);
      if (session.role !== 'RT' && sheetName !== 'Iuran' && sheetName !== 'Aspirasi') formData['nik'] = session.nik;
      for (let k in formData) {
        if (typeof formData[k] === 'object' && formData[k] !== null && formData[k].base64) formData[k] = formData[k].base64;
        let kLower = k.toLowerCase();
        let valStr = String(formData[k] || '').trim();
        if (valStr === '') {
          if (['no_hp', 'hp', 'telp', 'wa', 'acc'].includes(kLower)) formData[k] = null;
          else if (['nik', 'no_kk'].includes(kLower)) formData[k] = Math.floor(1000000000000000 + Math.random() * 9000000000000000);
          else if (['nominal', 'tahun', 'rt', 'jumlah', 'stok'].includes(kLower)) formData[k] = 0;
        } else if (['nik', 'no_hp', 'no_kk', 'nominal', 'tahun', 'rt', 'acc', 'jumlah', 'stok'].includes(kLower)) {
          let numOnly = valStr.replace(/[^0-9]/g, '');
          if (numOnly) formData[k] = numOnly;
          else if (['no_hp', 'acc'].includes(kLower)) formData[k] = null;
        }
      }
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
      if (session.role !== 'RT') return { status: 'error', message: 'Hanya RT yang diizinkan menghapus data!' };
      const sheetName = extraPayload.sheetName;
      const targetId  = extraPayload.id;
      console.log(`[DELETE] Mencoba hapus ${sheetName} id="${targetId}" nik="${editingNik}"`);
      let { error } = await db.from(sheetName).delete().eq('id', targetId);
      console.log('[DELETE] by id result:', error ? error.message : 'OK');
      if (error && sheetName.toLowerCase() === 'warga' && editingNik) {
        let res2 = await db.from(sheetName).delete().eq('nik', editingNik);
        console.log('[DELETE] by nik result:', res2.error ? res2.error.message : 'OK');
        if (!res2.error) error = null;
      }
      if (error) {
        const res3 = await safeSupabaseDelete(sheetName, 'id', targetId);
        if (!res3.error) error = null;
        else console.error('[DELETE] Semua fallback gagal:', res3.error.message);
      }
      if (error) return { status: 'error', message: 'Gagal menghapus: ' + error.message };
      return { status: 'success', message: 'Data berhasil dihapus!' };
    }
    if (['hapusUserAkun', 'resetPasswordUser', 'editUserAkun', 'tambahUserWarga', 'simpanPengaturanApp', 'hapusDataDariSheet', 'simpanInfoWarga'].includes(actionName)) {
      if (!(await isVerifiedRT())) {
        return { status: 'error', message: 'Akses ditolak! Sesi Anda bukan RT terverifikasi di database.' };
      }
    }
    if (actionName === 'simpanInfoWarga') {
      const { error } = await db.from('Pengaturan').upsert([{ kunci: 'info_warga', nilai: extraPayload.teksBaru }], { onConflict: 'kunci' });
      if (error) return { status: 'error', message: error.message };
      return { status: 'success', message: 'Informasi warga berhasil diperbarui!' };
    }
    if (actionName === 'simpanPengaturanApp') {
      if (session.role !== 'RT') return { status: 'error', message: 'Hanya RT yang diizinkan memperbarui pengaturan!' };
      let errArr = [];
      for (let s of (extraPayload.settingsArray || [])) {
        let { data, error: errUpd } = await db.from('Pengaturan').update({ nilai: s.nilai }).eq('kunci', s.kunci).select();
        if (errUpd || !data || data.length === 0) {
          let { error: errIns } = await db.from('Pengaturan').insert([s]);
          if (errIns && errUpd) errArr.push(errIns.message);
        }
      }
      if (errArr.length > 0) return { status: 'error', message: errArr.join(', ') };
      return { status: 'success', message: 'Pengaturan aplikasi berhasil disimpan!' };
    }
    if (actionName === 'tambahUserWarga') {
      if (session.role !== 'RT') return { status: 'error', message: 'Hanya RT yang diizinkan mengelola user!' };
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
      if (session.role !== 'RT') return { status: 'error', message: 'Hanya RT yang diizinkan menghapus user!' };
      const { error } = await safeSupabaseDelete('Users', 'username', extraPayload.username);
      if (error) return { status: 'error', message: error.message };
      return { status: 'success', message: 'Akun user berhasil dihapus!' };
    }
    if (actionName === 'resetPasswordUser') {
      if (session.role !== 'RT') return { status: 'error', message: 'Hanya RT yang diizinkan mereset password!' };
      const { error } = await safeSupabaseUpdate('Users', { password: extraPayload.newPassword }, 'username', extraPayload.username);
      if (error) return { status: 'error', message: error.message };
      return { status: 'success', message: 'Password user berhasil direset!' };
    }
    if (actionName === 'editUserAkun') {
      if (session.role !== 'RT') return { status: 'error', message: 'Hanya RT yang diizinkan mengedit user!' };
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
    if (actionName === 'getTableData') {
      const sheetName = params.sheetName;
      const { data: safeData } = await safeSupabaseSelect(sheetName);
      if (!safeData || safeData.length === 0) {
        let fallbackH = FALLBACK_HEADERS[sheetName] || FALLBACK_HEADERS['Warga'];
        return { status: 'success', headers: fallbackH, rows: [] };
      }
      let filteredData = safeData;
      let cleanRole = String(session.role || 'warga').toUpperCase();
      if (cleanRole !== 'RT') {
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
        const headers = Object.keys(safeData[0]);
        return { status: 'success', headers: headers, rows: [] };
      }
      const headers = Object.keys(filteredData[0]);
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
        const headers = safeData.length > 0 ? Object.keys(safeData[0]) : ['ID','NIK','Nama','No_KK','Bulan','Tahun','Nominal','Status','Tanggal_Bayar','Diterima_Oleh','Bukti_Transfer'];
        return { status: 'success', headers: headers, rows: [] };
      }
      const headers = Object.keys(filteredData[0]);
      const rows = filteredData.map(row => headers.map(h => row[h] !== null && row[h] !== undefined ? row[h] : ''));
      return { status: 'success', headers: headers, rows: rows };
    }
    if (actionName === 'getNotifications') {
      const cleanRole = (session.role || 'warga').toLowerCase();
      const userNik = (session.nik || '').toString().trim();
      let notifs = [];
      const [aRes, sRes, pRes, iRes, sumRes, aspRes] = await Promise.all([
        safeSupabaseSelect('Pengaduan'),
        safeSupabaseSelect('SuratPengantar'),
        safeSupabaseSelect('Peminjaman'),
        safeSupabaseSelect('Iuran'),
        safeSupabaseSelect('Sumbangan'),
        safeSupabaseSelect('Aspirasi')
      ]);
      const extractDate = (item) => {
        if (!item || typeof item !== 'object') return null;
        const commonKeys = ['created_at', 'createdat', 'updated_at', 'timestamp', 'waktu', 'tanggal', 'tanggal_bayar', 'tanggal_pindah', 'tanggal_lahir', 'tanggal_meninggal', 'tgl', 'date', 'datetime'];
        for (let k of commonKeys) {
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
      } else {
        let userNama = (session.nama || '').toString().toLowerCase().trim();
        (aRes.data || []).forEach(item => {
          let itemNik = cariNilaiKolom(item, ['nik','ktp']).trim();
          let itemNama = cariNilaiKolom(item, ['nama','nama_lengkap','pelapor']).toLowerCase().trim();
          let matchUser = (userNik && itemNik && itemNik === userNik) || (userNama && itemNama && (itemNama === userNama || itemNama.includes(userNama) || userNama.includes(itemNama)));
          if (matchUser) {
            let st    = cariNilaiKolom(item, ['status']) || 'Belum di verifikasi';
            let jenis = cariNilaiKolom(item, ['jenis_aduan', 'jenis']) || 'Aduan';
            let id    = item.id || cariNilaiKolom(item, ['id']);
            let rawDate = extractDate(item);
            notifs.push({ id, menu: 'Pengaduan', pesan: `Status Aduan ${jenis}: ${st}`, rawDate });
          }
        });
        (sRes.data || []).forEach(item => {
          let itemNik = cariNilaiKolom(item, ['nik','ktp']).trim();
          let itemNama = cariNilaiKolom(item, ['nama','nama_lengkap','pemohon']).toLowerCase().trim();
          let matchUser = (userNik && itemNik && itemNik === userNik) || (userNama && itemNama && (itemNama === userNama || itemNama.includes(userNama) || userNama.includes(itemNama)));
          if (matchUser) {
            let st = cariNilaiKolom(item, ['status']) || 'Belum di verifikasi';
            let id = item.id || cariNilaiKolom(item, ['id']);
            let rawDate = extractDate(item);
            notifs.push({ id, menu: 'SuratPengantar', pesan: `Surat Pengantar Anda: Status kini "${st}"`, rawDate });
          }
        });
        (pRes.data || []).forEach(item => {
          let itemNik = cariNilaiKolom(item, ['nik','ktp']).trim();
          let itemNama = cariNilaiKolom(item, ['nama_peminjam','nama','peminjam']).toLowerCase().trim();
          let matchUser = (userNik && itemNik && itemNik === userNik) || (userNama && itemNama && (itemNama === userNama || itemNama.includes(userNama) || userNama.includes(itemNama)));
          if (matchUser) {
            let st     = cariNilaiKolom(item, ['status']) || 'Belum di verifikasi';
            let barang = cariNilaiKolom(item, ['nama_barang','nama_aset','barang']) || 'Barang';
            let id     = item.id || cariNilaiKolom(item, ['id']);
            let rawDate = extractDate(item);
            notifs.push({ id, menu: 'Aset', pesan: `Peminjaman ${barang}: ${st}`, rawDate });
          }
        });
        (iRes.data || []).forEach(item => {
          let itemNik = cariNilaiKolom(item, ['nik','ktp']).trim();
          let itemNama = cariNilaiKolom(item, ['nama','nama_lengkap']).toLowerCase().trim();
          let matchUser = (userNik && itemNik && itemNik === userNik) || (userNama && itemNama && (itemNama === userNama || itemNama.includes(userNama) || userNama.includes(itemNama)));
          if (matchUser) {
            let st    = cariNilaiKolom(item, ['status']) || '';
            let bulan = cariNilaiKolom(item, ['bulan']) || '';
            let id    = item.id || cariNilaiKolom(item, ['id']);
            let rawDate = extractDate(item);
            if (st.toLowerCase().includes('lunas')) {
              notifs.push({ id, menu: 'Iuran', pesan: `Iuran ${bulan} telah LUNAS diverifikasi RT!`, rawDate });
            }
          }
        });
      }
      return { status: 'success', data: notifs };
    }
    if (actionName === 'getInfoWarga') {
      const { data: safeData } = await safeSupabaseSelect('Pengaturan');
      let target = safeData ? safeData.find(x => x.kunci === 'info_warga') : null;
      return { status: 'success', data: target ? target.nilai : '' };
    }
    if (actionName === 'getDashboardSummary') {
      const cleanRole = (session.role || 'warga').toLowerCase();
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
      const headers = Object.keys(myData);
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
        const headers = Object.keys(safeData[0]);
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
      if (payload.table === 'Sessions' || payload.table === 'sessions') {
        verifySessionToken();
      } else {
        fetchNotifikasi(true);
      }
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') console.log('🟢 Supabase Realtime Listener Active!');
    });
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
      let isHariIni = notifDate.toDateString() === now.toDateString();
      let jamStr = notifDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':') + ' WIB';
      item.waktuTampil = isHariIni ? jamStr : (notifDate.toLocaleDateString('id-ID', { day:'2-digit', month:'2-digit', year:'numeric' }) + ' ' + jamStr);
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
}
function bukaNotifTarget(menuName) {
  if (bootstrapNotifModalInstance) bootstrapNotifModalInstance.hide();
  loadMenu(menuName);
}
async function saveSessionToDatabase(token, nik, role) {
  if (!token || !nik) return;
  let timeStr = new Date().toLocaleString('id-ID');
  let res = await safeSupabaseInsert('Sessions', [{
    token: token,
    nik: nik,
    role: role || 'Warga',
    createdat: timeStr
  }]);
  if (res && res.error) {
    await safeSupabaseInsert('Sessions', [{
      token: token,
      nik: nik,
      role: role || 'Warga'
    }]);
  }
}
async function doLogin(e) {
  if (e) e.preventDefault();
  try {
    var uInput = document.getElementById('username');
    var pInput = document.getElementById('password');
    var msgEl = document.getElementById('login-msg');
    var u = uInput ? uInput.value.trim() : '';
    var p = pInput ? pInput.value.trim() : '';
    if (!u || !p) {
      if (msgEl) msgEl.innerHTML = "Isi username dan password dulu!";
      else alert("Isi username dan password dulu!");
      return;
    }
    if (msgEl) msgEl.innerHTML = "Memeriksa ke database...";
    const res = await callGASPost('processLogin', { username: u, password: p });
    if (res && res.status === 'success') {
      var roleClean = res.role.toString().trim().toLowerCase();
      let sessionToken = 'SESS-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
      session.token     = sessionToken;
      session.loginTime = Date.now();
      session.role      = (roleClean === 'rt') ? 'RT' : 'Warga';
      session.nik       = res.nik    ? res.nik.toString().trim()    : (res.username || u);
      session.nama      = res.nama   ? res.nama.toString().trim()   : '';
      session.alamat    = res.alamat ? res.alamat.toString().trim() : '';
      session.noHp      = res.noHp   ? res.noHp.toString().trim()   : '';
      localStorage.setItem('rt_user_session', JSON.stringify(session));
      await saveSessionToDatabase(sessionToken, session.nik, session.role);
      applySessionUI();
    } else {
      if (msgEl) msgEl.innerHTML = res ? res.message : 'Login gagal!';
      else alert(res ? res.message : 'Login gagal!');
    }
  } catch (error) {
    alert("Browser JS Error: " + error.message);
  }
}
window.doLogin = doLogin;
window.processLogin = doLogin;
async function verifySessionToken() {
  if (!session || !session.token) return true;
  if (session.loginTime && (Date.now() - session.loginTime < 15000)) {
    return true;
  }
  try {
    delete menuDataCache['Sessions'];
    const { data: sessData, error } = await safeSupabaseSelect('Sessions');
    if (error) return true;
    let match = (sessData || []).find(s => {
      let sTok = s.token || s.TOKEN || '';
      return String(sTok).trim() === String(session.token).trim();
    });
    if (!match && Array.isArray(sessData)) {
      if (notifTimer) clearInterval(notifTimer);
      localStorage.removeItem('rt_user_session');
      showUIToast('Sesi login Anda telah dihentikan oleh RT. Mengalihkan...', 'error');
      setTimeout(() => location.reload(), 1000);
      return false;
    }
    return true;
  } catch(e) {
    return true;
  }
}
function applySessionUI() {
  document.getElementById('login-container').style.display = 'none';
  document.getElementById('app-container').style.display = 'block';
  document.getElementById('mob-header').classList.add('show-nav');
  document.getElementById('mob-nav').classList.add('show-nav');
  if (session.role === 'Warga') {
    document.querySelectorAll('.rt-only').forEach(el => el.style.display = 'none');
  } else {
    document.querySelectorAll('.rt-only').forEach(el => {
      if (el.classList.contains('bottom-nav-item')) {
        el.style.display = 'flex';
      } else {
        el.style.display = 'block';
      }
    });
  }
  loadMenu('Dashboard');
  requestNotifPermission();
  initRealtimeNotif();
  fetchNotifikasi();
  verifySessionToken();
  if (typeof updateAiWidgetVisibility === 'function') updateAiWidgetVisibility();
  if (notifTimer) clearInterval(notifTimer);
  notifTimer = setInterval(async function() {
    if (session.token && document.visibilityState === "visible") {
      fetchNotifikasi();
      verifySessionToken();
      if (currentActiveMenu === 'Dashboard' && typeof muatInfoWargaRealtime === 'function') {
        let isModalOpen = document.body.classList.contains('modal-open') || document.querySelector('.modal.show') || document.querySelector('#modal-kelola-aset:not(.hidden)');
        if (!isModalOpen) muatInfoWargaRealtime();
      }
    }
  }, 60000);
}
async function doLogout() {
  showUIConfirm('Apakah Anda yakin ingin keluar dari sistem aplikasi SISTEM INFORMASI RT 5?', async function() {
    if (session.token) {
      try { await safeSupabaseDelete('Sessions', 'token', session.token); } catch(e) {}
    }
    if (notifTimer) clearInterval(notifTimer);
    if (supabaseRealtimeChannel && db) db.removeChannel(supabaseRealtimeChannel);
    document.getElementById('mob-header').classList.remove('show-nav');
    document.getElementById('mob-nav').classList.remove('show-nav');
    localStorage.removeItem('rt_user_session');
    location.reload();
  }, 'Konfirmasi Logout');
}
async function checkExistingSession() {
  let savedSession = localStorage.getItem('rt_user_session');
  if (savedSession) {
    try {
      let parsed = JSON.parse(savedSession);
      if (parsed && parsed.token && parsed.role) {
        session.token     = parsed.token;
        session.role      = (parsed.role.toString().toUpperCase() === 'RT') ? 'RT' : 'Warga';
        session.nik       = parsed.nik || '';
        session.nama      = parsed.nama || '';
        session.alamat    = parsed.alamat || '';
        session.noHp      = parsed.noHp || '';
        session.loginTime = parsed.loginTime || Date.now();
        applySessionUI();
        verifySessionToken();
      }
    } catch(e) {
      console.warn('Gagal membaca sesi lokal:', e);
    }
  }
}
function syncActiveNav(menu) {
  document.querySelectorAll('.sidebar a').forEach(el => el.classList.remove('active-menu'));
  var dEl = document.getElementById('dmenu-' + menu);
  if (dEl) dEl.classList.add('active-menu');
  document.querySelectorAll('.bottom-nav-item').forEach(el => el.classList.remove('active'));
  var mEl = document.getElementById('mmenu-' + menu);
  if (mEl) mEl.classList.add('active');
}
async function loadMenu(menu) {
  if (session && session.token) {
    let isSessionValid = await verifySessionToken();
    if (!isSessionValid) return;
  }
  currentActiveMenu = menu;
  syncActiveNav(menu);
  document.getElementById('page-title').innerText = menu === 'Dashboard' ? 'Dashboard Utama' : (menu === 'Profil' ? 'Profil Saya' : menu);
  document.getElementById('rek-info').style.display = (menu === 'Sumbangan') ? 'block' : 'none';
  if (document.getElementById('searchInput')) document.getElementById('searchInput').value = "";
  switch(menu) {
    case 'Dashboard':      if (typeof loadDashboardView   === 'function') { loadDashboardView();   return; } break;
    case 'Profil':         if (typeof loadProfilView       === 'function') { loadProfilView();       return; } break;
    case 'Warga':          if (typeof loadWargaView        === 'function') { loadWargaView();        return; } break;
    case 'Keuangan':       if (typeof loadKeuanganView     === 'function') { loadKeuanganView();     return; } break;
    case 'Iuran':          if (typeof loadIuranView        === 'function') { loadIuranView();        return; } break;
    case 'Pengaduan':      if (typeof loadPengaduanView    === 'function') { loadPengaduanView();    return; } break;
    case 'Surat':
    case 'SuratPengantar': if (typeof loadSuratView        === 'function') { loadSuratView();        return; } break;
    case 'Sumbangan':      if (typeof loadSumbanganView    === 'function') { loadSumbanganView();    return; } break;
    case 'Aset':
    case 'Inventaris':     if (typeof loadAsetView         === 'function') { loadAsetView();         return; } break;
    case 'Aspirasi':       if (typeof loadAspirasiView     === 'function') { loadAspirasiView();     return; } break;
    case 'Kelahiran':      if (typeof loadKelahiranView    === 'function') { loadKelahiranView();    return; } break;
    case 'Kematian':       if (typeof loadKematianView     === 'function') { loadKematianView();     return; } break;
    case 'PindahMasuk':    if (typeof loadPindahMasukView  === 'function') { loadPindahMasukView();  return; } break;
    case 'PindahKeluar':   if (typeof loadPindahKeluarView === 'function') { loadPindahKeluarView(); return; } break;
    case 'Pengaturan':
    case 'PengaturanRT':
      if (String(session.role || '').toUpperCase() === 'RT') {
        renderPengaturanRTView();
      } else {
        document.getElementById('main-content').innerHTML = `
          <div class="card p-4 text-center border-0 shadow-sm rounded-3 my-4">
            <i class="bi bi-shield-lock text-primary display-4 mb-2"></i>
            <h5 class="fw-bold text-gray-800">Pengaturan RT & Sistem</h5>
            <p class="text-muted text-xs">Menu ini khusus untuk RT / Admin untuk mengelola identitas aplikasi, QRIS dinamis, dan akun warga.</p>
          </div>`;
      }
      return;
  }
  let cacheKey = menu;
  let cached = menuDataCache[cacheKey];
  let now = Date.now();
  if (cached && (now - cached.timestamp) < MENU_CACHE_TTL) {
    currentHeaders = cached.data.headers || [];
    currentRows    = cached.data.rows    || [];
    renderTable(cached.data, menu);
    callGASGet('getTableData', { sheetName: menu }).then(res => {
      if (res && res.status === 'success') menuDataCache[cacheKey] = { data: res, timestamp: Date.now() };
    });
    return;
  }
  document.getElementById('main-content').innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><br><small class="text-muted mt-2 d-block">Memuat data dari server...</small></div>';
  const res = await callGASGet('getTableData', { sheetName: menu });
  if (res && res.status === 'success') {
    currentHeaders = res.headers || [];
    currentRows    = res.rows    || [];
    menuDataCache[cacheKey] = { data: res, timestamp: Date.now() };
    renderTable(res, menu);
  } else {
    document.getElementById('main-content').innerHTML = '<div class="alert alert-danger text-center my-3">Gagal memuat data dari server.</div>';
  }
}
function renderTable(data, menu) {
  if (menu === 'Keuangan' && typeof renderKeuanganCustom === 'function') return renderKeuanganCustom(data);
  if (menu === 'Iuran' && typeof renderIuranCustom === 'function') return renderIuranCustom(data);
  if ((menu === 'Aset' || menu === 'Inventaris') && typeof renderAsetCustom === 'function') return renderAsetCustom(data);
  if (menu === 'Aspirasi' && typeof renderAspirasiView === 'function') return renderAspirasiView(data);
  if (menu === 'Pengaduan' && typeof renderPengaduanCustom === 'function') return renderPengaduanCustom(data);
  if ((menu === 'Surat' || menu === 'SuratPengantar') && typeof renderSuratPengantarCustom === 'function') return renderSuratPengantarCustom(data);
  if (menu === 'Sumbangan' && typeof renderSumbanganCustom === 'function') return renderSumbanganCustom(data);
  if (menu === 'Warga' && typeof renderWargaCustom === 'function') return renderWargaCustom(data);
  if (menu === 'Kelahiran' && typeof renderKelahiranCustom === 'function') return renderKelahiranCustom(data);

  let html = '';
  let bolehTambah = session.role === 'RT' || (session.role === 'Warga' && ['Pengaduan','SuratPengantar','Sumbangan','Aset','Peminjaman','Aspirasi'].includes(menu));
  if (bolehTambah) {
    let labelTombol = session.role === 'RT' ? '+ Tambah Data Baru' : (menu === 'Aspirasi' ? '+ Tulis Aspirasi Anonim' : '+ Buat Pengajuan / Form Baru');
    html += `<button class="btn btn-success fw-bold mb-3 shadow-sm px-3 py-2" onclick="bukaModalForm()"><i class="bi bi-plus-circle me-2"></i>${labelTombol}</button>`;
  }
  if (!data || !data.rows || data.rows.length === 0) {
    html += '<div class="alert alert-light border text-muted mt-2"><i class="bi bi-folder-x me-2"></i>Belum ada data.</div>';
    document.getElementById('main-content').innerHTML = html;
    return;
  }
  html += '<div class="card card-custom"><div class="table-responsive"><table class="table table-hover align-middle mb-0" id="dataTable">';
  html += '<thead class="table-light"><tr>';
  data.headers.forEach(h => html += `<th class="py-3 text-secondary" style="font-size:0.85rem;">${h.toUpperCase()}</th>`);
  html += '<th class="py-3 text-secondary text-center">AKSI</th></tr></thead><tbody>';
  data.rows.forEach(row => {
    html += '<tr>';
    row.forEach((val, idx) => {
      let headName = data.headers[idx].toLowerCase();
      if (headName.includes('foto') || headName.includes('bukti')) {
        let directUrl = convertToImageLink(val);
        html += `<td>${val && val !== '***Rahasia***' ? `<img src="${directUrl}" class="img-table" onclick="bukaPopUpFoto('${val}')">` : '-'}</td>`;
      } else {
        html += `<td>${val}</td>`;
      }
    });
    html += `<td class="text-center">${getTombolAksi(menu, row, data.headers)}</td></tr>`;
  });
  html += '</tbody></table></div></div>';
  document.getElementById('main-content').innerHTML = html;
}
function bukaPopUpFoto(urlImg) {
  document.getElementById('modalPreviewImg').src = convertToImageLink(urlImg);
  if (!bootstrapImageModalInstance) bootstrapImageModalInstance = new bootstrap.Modal(document.getElementById('imageModal'));
  bootstrapImageModalInstance.show();
}
async function bukaModalForm() {
  editingId = null;
  editingNik = null;
  document.getElementById('formModalTitle').innerText = "Form Input: " + currentActiveMenu;
  document.getElementById('btn-hapus-modal').style.display = 'none';
  await generateFormInputs(null);
  if (!bootstrapModalInstance) bootstrapModalInstance = new bootstrap.Modal(document.getElementById('formModal'));
  bootstrapModalInstance.show();
}
async function bukaModalEdit(id) {
  editingId = id;
  editingNik = null;
  document.getElementById('formModalTitle').innerText = "Edit Data: " + currentActiveMenu;
  document.getElementById('btn-hapus-modal').style.display = session.role === 'RT' ? 'inline-block' : 'none';
  let rowData = (currentRows || []).find(r => {
    if (!r) return false;
    if (Array.isArray(r)) {
      return r.some(val => val !== null && val !== undefined && String(val).trim() === String(id).trim());
    } else if (typeof r === 'object') {
      return Object.values(r).some(val => val !== null && val !== undefined && String(val).trim() === String(id).trim());
    }
    return false;
  });
  if (rowData && currentActiveMenu === 'Warga') {
    let headers = (currentHeaders || []).map(h => (h || '').toLowerCase());
    let nikIdx = headers.indexOf('nik');
    if (nikIdx === -1) nikIdx = headers.findIndex(h => h.includes('nik'));
    if (nikIdx > -1 && Array.isArray(rowData)) {
      editingNik = rowData[nikIdx];
    } else if (rowData && typeof rowData === 'object') {
      editingNik = rowData['nik'] || rowData['NIK'] || null;
    }
  }
  await generateFormInputs(rowData);
  if (!bootstrapModalInstance) bootstrapModalInstance = new bootstrap.Modal(document.getElementById('formModal'));
  bootstrapModalInstance.show();
}
async function generateFormInputs(rowData) {
  let formBody = document.getElementById('dynamicForm');
  formBody.innerHTML = '';
  if (session.role === 'Warga' && !rowData && session.nik) {
    try {
      const { data: safeWarga } = await safeSupabaseSelect('Warga');
      if (safeWarga && safeWarga.length > 0) {
        let myW = safeWarga.find(w => {
          let wNik = String(cariNilaiKolom(w, ['nik', 'ktp'])).trim();
          let wUser = String(cariNilaiKolom(w, ['username', 'user'])).trim().toLowerCase();
          let sNik = String(session.nik || '').trim();
          let sUser = String(session.username || session.nik || '').trim().toLowerCase();
          return (wNik && wNik === sNik) || (wUser && (wUser === sUser || wUser === sNik));
        });
        if (myW) {
          let realNama = cariNilaiKolom(myW, ['nama_lengkap', 'nama', 'nama_warga']);
          let realAlamat = cariNilaiKolom(myW, ['alamat', 'alamat_rumah', 'no_rumah']);
          let realHp = cariNilaiKolom(myW, ['no_hp', 'hp', 'wa', 'telp']);
          if (realNama) session.nama = realNama;
          if (realAlamat) session.alamat = realAlamat;
          if (realHp) session.noHp = realHp;
          localStorage.setItem('rt_user_session', JSON.stringify(session));
        }
      }
    } catch(e) {}
  }
  let headersToUse = (currentHeaders && currentHeaders.length > 0) 
    ? currentHeaders 
    : (FALLBACK_HEADERS[currentActiveMenu] || FALLBACK_HEADERS['Warga']);
  for (let idx = 0; idx < headersToUse.length; idx++) {
    let h = headersToUse[idx];
    if (['id','no','saldo'].includes(h.toLowerCase())) continue;
    let nameLower = h.toLowerCase().trim();
    let labelText = h.replace(/_/g, ' ').toUpperCase();
    let val = "";
    if (rowData) {
      if (Array.isArray(rowData)) {
        val = rowData[idx] !== undefined && rowData[idx] !== null ? rowData[idx] : "";
      } else if (typeof rowData === 'object') {
        val = rowData[h] !== undefined && rowData[h] !== null ? rowData[h] : (cariNilaiKolom(rowData, [h]) || "");
      }
    }
    if ((nameLower === 'status' || nameLower.includes('penyelesaian') || nameLower.includes('admin')) && (session.role !== 'RT' || !rowData)) continue;
    if (session.role === 'Warga' && !rowData) {
      if (nameLower === 'nik') val = session.nik;
      if (nameLower === 'nama' || nameLower === 'nama_lengkap' || nameLower.includes('nama')) val = session.nama;
      if (nameLower.includes('alamat')) val = session.alamat;
      if (['no_hp','hp','telp','wa'].includes(nameLower)) val = session.noHp;
    }
    if (val && nameLower.includes('tanggal') && val.includes('/')) {
      let parts = val.split('/');
      if (parts.length === 3) val = parts[2] + '-' + parts[1] + '-' + parts[0];
    }
    let safeVal = String(val || '').replace(/"/g, '&quot;');
    let inputHtml = '';
    if (nameLower === 'status' && ['Pengaduan','SuratPengantar','Sumbangan'].includes(currentActiveMenu)) {
      inputHtml = `<select class="form-select dynamic-input" data-key="${h}">
        <option value="Belum di verifikasi" ${val==='Belum di verifikasi'?'selected':''}>Belum di verifikasi</option>
        <option value="Sedang ditindak lanjuti" ${val==='Sedang ditindak lanjuti'?'selected':''}>Sedang ditindak lanjuti</option>
        <option value="selesai" ${val==='selesai'?'selected':''}>selesai</option>
        <option value="di tolak" ${val==='di tolak'?'selected':''}>di tolak</option>
        <option value="diterima" ${val==='diterima'?'selected':''}>diterima</option>
      </select>`;
    } else if (nameLower === 'jenis_aduan' || (currentActiveMenu === 'Pengaduan' && nameLower.includes('jenis'))) {
      inputHtml = `<select class="form-select dynamic-input" data-key="${h}">
        <option value="">-- Pilih Jenis Aduan --</option>
        <option value="KEAMANAN" ${val.toUpperCase()==='KEAMANAN'?'selected':''}>KEAMANAN</option>
        <option value="KEBERSIHAN" ${val.toUpperCase()==='KEBERSIHAN'?'selected':''}>KEBERSIHAN</option>
        <option value="LAMPU JALAN" ${val.toUpperCase()==='LAMPU JALAN'?'selected':''}>LAMPU JALAN</option>
        <option value="JALANAN" ${val.toUpperCase()==='JALANAN'?'selected':''}>JALANAN</option>
        <option value="LAINNYA" ${val.toUpperCase()==='LAINNYA'?'selected':''}>LAINNYA</option>
      </select>`;
    } else if (currentActiveMenu === 'SuratPengantar' && (nameLower.includes('jenis') || nameLower.includes('perihal') || nameLower.includes('keperluan'))) {
      let rawJenisVal = String(val || '').split('|')[0].trim();
      let optList = (typeof JENIS_SURAT_LIST !== 'undefined') ? JENIS_SURAT_LIST : [
        { value: 'Surat Pengantar Umum', label: 'Surat Pengantar Umum' },
        { value: 'Pengantar SKCK', label: 'Pengantar SKCK' },
        { value: 'Surat Keterangan Tidak Mampu', label: 'Surat Keterangan Tidak Mampu (SKTM)' },
        { value: 'Surat Keterangan Domisili Usaha', label: 'Surat Keterangan Domisili Usaha (SKDU)' },
        { value: 'Surat Keterangan Pindah', label: 'Surat Keterangan Pindah Domisili' },
        { value: 'Pengantar Nikah', label: 'Surat Pengantar Nikah' },
        { value: 'Surat Keterangan Ahli Waris', label: 'Surat Keterangan Ahli Waris' },
        { value: 'Surat Izin Keramaian', label: 'Surat Izin Keramaian/Acara' }
      ];
      let opts = optList.map(o => `<option value="${o.value}" ${rawJenisVal.toLowerCase()===o.value.toLowerCase().trim()?'selected':''}>${o.label}</option>`).join('');
      inputHtml = `<select class="form-select dynamic-input" data-key="${h}" onchange="if(typeof renderExtraSuratFields==='function') renderExtraSuratFields(this.value);">
        <option value="">-- Pilih Jenis Surat Pengantar --</option>
        ${opts}
      </select>
      <div id="extra-surat-fields-container" class="p-3 border rounded-3 bg-light mt-2 mb-2" style="display:none;"></div>`;
    } else if (currentActiveMenu === 'SuratPengantar' && nameLower === 'keterangan') {
      inputHtml = `<input type="hidden" class="dynamic-input" data-key="${h}" value="${safeVal}">`;
    } else if (nameLower.includes('tanggal')) {
      inputHtml = `<input type="date" class="form-control dynamic-input" data-key="${h}" value="${safeVal}">`;
    } else if (nameLower === 'jenis_kelamin') {
      inputHtml = `<select class="form-select dynamic-input" data-key="${h}">
        <option value="">-- Pilih Jenis Kelamin --</option>
        <option value="LAKI-LAKI" ${['LAKI-LAKI','LAKI LAKI'].includes(val.toUpperCase())?'selected':''}>LAKI-LAKI</option>
        <option value="PEREMPUAN" ${val.toUpperCase()==='PEREMPUAN'?'selected':''}>PEREMPUAN</option>
      </select>`;
    } else if (nameLower === 'status_nikah') {
      inputHtml = `<select class="form-select dynamic-input" data-key="${h}">
        <option value="">-- Pilih Status Nikah --</option>
        <option value="MENIKAH" ${val.toUpperCase()==='MENIKAH'?'selected':''}>MENIKAH</option>
        <option value="BELUM MENIKAH" ${['BELUM MENIKAH','BELUM'].includes(val.toUpperCase())?'selected':''}>BELUM MENIKAH</option>
      </select>`;
    } else if (nameLower === 'status_tinggal' || nameLower === 'status_huni' || nameLower === 'status_pindah' || (nameLower === 'status' && currentActiveMenu === 'Warga')) {
      inputHtml = `<select class="form-select dynamic-input" data-key="${h}">
        <option value="">-- Pilih Status Tinggal --</option>
        <option value="TETAP" ${val.toUpperCase()==='TETAP'?'selected':''}>TETAP</option>
        <option value="DOMISILI" ${['DOMISILI','KONTRAK'].includes(val.toUpperCase())?'selected':''}>DOMISILI</option>
      </select>`;
    } else if (nameLower.includes('foto') || nameLower.includes('bukti')) {
      let imgDirect = convertToImageLink(val);
      let isValidVal = val && val !== 'EMPTY' && val !== 'NULL' && val !== '-' && !val.includes('***');
      inputHtml = `
        ${isValidVal ? `<div class="mb-2"><img src="${imgDirect}" class="rounded border shadow-sm mb-2" style="max-height:110px;object-fit:cover;" onclick="bukaPopUpFoto('${val}')"><small class="d-block text-muted text-[10px]">Foto saat ini</small></div>` : ''}
        <div class="p-2 border rounded bg-white">
          <label class="form-label text-xs font-bold text-gray-700 mb-1 block"><i class="bi bi-camera-fill me-1 text-primary"></i>Upload Foto (Galeri / Kamera HP):</label>
          <input type="file" class="form-control form-control-sm dynamic-file-input" data-key="${h}" accept="image/*">
          <small class="text-muted text-[10px] d-block mt-1">*Pilih file foto dari HP/Kamera Anda.</small>
        </div>`;
    } else {
      let isNameField = (nameLower === 'nama' || nameLower === 'nama_lengkap' || nameLower.includes('nama'));
      let isReadonly = (session.role === 'Warga' && !rowData && (nameLower === 'nik' || nameLower.includes('alamat') || (isNameField && currentActiveMenu !== 'Sumbangan'))) ? 'readonly style="background-color:#f1f5f9;cursor:not-allowed;"' : '';
      let helpText = (currentActiveMenu === 'Sumbangan' && isNameField) ? `<small class="text-muted text-[10px] d-block mt-1 font-medium">*Bisa diubah jika ingin menggunakan nama <b>"Hamba Allah"</b>.</small>` : '';
      inputHtml = `<input type="text" class="form-control dynamic-input" data-key="${h}" value="${safeVal}" placeholder="Masukkan ${labelText.toLowerCase()}..." ${isReadonly}>${helpText}`;
    }
    if (currentActiveMenu === 'SuratPengantar' && nameLower === 'keterangan') {
      formBody.innerHTML += inputHtml;
    } else {
      formBody.innerHTML += `<div class="mb-3"><label class="form-label small text-secondary fw-bold">${labelText}</label>${inputHtml}</div>`;
    }
  }
  if (currentActiveMenu === 'SuratPengantar' && typeof renderExtraSuratFields === 'function') {
    let jenisSelect = document.querySelector('.dynamic-input[data-key*="jenis"], .dynamic-input[data-key*="perihal"], .dynamic-input[data-key*="keperluan"], .dynamic-input[data-key*="JENIS"]');
    let selVal = jenisSelect ? jenisSelect.value : '';
    let existingObj = {};
    if (rowData) {
      let rawJenisStr = '';
      if (Array.isArray(rowData)) {
        let headers = (currentHeaders || []).map(h => (h || '').toLowerCase().trim());
        let jIdx = headers.findIndex(h => h.includes('jenis') || h.includes('perihal') || h.includes('keperluan'));
        if (jIdx > -1) rawJenisStr = rowData[jIdx];
      } else if (typeof rowData === 'object') {
        rawJenisStr = rowData.jenis_surat || rowData.jenis || rowData.JENIS_SURAT || '';
      }
      if (rawJenisStr && rawJenisStr.includes('|')) {
        try { existingObj = JSON.parse(rawJenisStr.split('|').slice(1).join('|')); } catch(e) {}
      }
      if (Object.keys(existingObj).length === 0) {
        let ketVal = '';
        if (Array.isArray(rowData)) {
          let headers = (currentHeaders || []).map(h => (h || '').toLowerCase().trim());
          let kIdx = headers.indexOf('keterangan');
          if (kIdx === -1) kIdx = headers.findIndex(h => h.includes('keterangan') && !h.includes('admin'));
          if (kIdx > -1) ketVal = rowData[kIdx];
        } else if (typeof rowData === 'object') {
          ketVal = rowData.keterangan || rowData.Keterangan || rowData.KETERANGAN || '';
        }
        if (ketVal && ketVal !== '{' && ketVal !== 'null') {
          let trimmed = String(ketVal).trim();
          if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            try { existingObj = JSON.parse(trimmed); } catch(e) {}
          } else if (trimmed && trimmed !== '-') {
            existingObj = { catatan: trimmed, nama_acara: trimmed, nama_usaha: trimmed, keperluan: trimmed, alamat_baru: trimmed };
          }
        }
      }
    }
    if (selVal) {
      renderExtraSuratFields(selVal, existingObj);
    }
  }
}
function compressImageFile(file, maxWidth = 800, maxHeight = 800, quality = 0.75) {
  return new Promise((resolve, reject) => {
    let reader = new FileReader();
    reader.onload = function(e) {
      let img = new Image();
      img.onload = function() {
        let canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        let ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(e.target.result);
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
function submitFormBaru(e) {
  if (e) e.preventDefault();
  let payload = {};
  document.querySelectorAll('.dynamic-input').forEach(inp => { payload[inp.getAttribute('data-key')] = inp.value; });
  if (currentActiveMenu === 'SuratPengantar') {
    let extraObj = {};
    document.querySelectorAll('.extra-surat-input').forEach(inp => {
      let k = inp.getAttribute('data-extra-key');
      if (k && inp.value) extraObj[k] = inp.value;
    });
    let jenisKey = Object.keys(payload).find(k => k.toLowerCase().includes('jenis') || k.toLowerCase().includes('perihal') || k.toLowerCase().includes('keperluan'));
    if (jenisKey && payload[jenisKey]) {
      payload[jenisKey] = payload[jenisKey].split('|')[0].trim();
    }
    if (Object.keys(extraObj).length > 0) {
      let ketKey = Object.keys(payload).find(k => k.toLowerCase() === 'keterangan' || (k.toLowerCase().includes('keterangan') && !k.toLowerCase().includes('admin')));
      if (!ketKey) ketKey = 'keterangan';
      payload[ketKey] = JSON.stringify(extraObj);
    }
  }
  let filePromises = [];
  document.querySelectorAll('.dynamic-file-input').forEach(fileInp => {
    let key = fileInp.getAttribute('data-key');
    let file = fileInp.files[0];
    if (file) {
      filePromises.push(compressImageFile(file).then(compressedUrl => {
        payload[key] = compressedUrl;
      }));
    }
  });
  document.getElementById('dynamicForm').innerHTML = '<div class="text-center p-4"><div class="spinner-border text-primary mb-2"></div><br><b>Memproses & mengompres foto...</b></div>';
  Promise.all(filePromises).then(async () => {
    let targetId = editingId || editingNik;
    if (targetId) {
      for (let k in payload) {
        if ((k.toLowerCase().includes('foto') || k.toLowerCase().includes('bukti')) && !payload[k]) {
          delete payload[k];
        }
      }
      delete menuDataCache[currentActiveMenu];
      const res = await callGASPost('updateDataDiSheet', { sheetName: currentActiveMenu, id: targetId, formData: payload });
      if (res && res.status === 'success') { bootstrapModalInstance.hide(); alert(res.message); loadMenu(currentActiveMenu); fetchNotifikasi(); }
      else { alert('Gagal memperbarui: ' + (res ? res.message : 'Error')); loadMenu(currentActiveMenu); }
    } else {
      delete menuDataCache[currentActiveMenu];
      const res = await callGASPost('simpanDataKeSheet', { sheetName: currentActiveMenu, formData: payload });
      if (res && res.status === 'success') {
        bootstrapModalInstance.hide(); alert('Data Berhasil Disimpan!');
        if (session.role === 'Warga') {
          if (currentActiveMenu === 'Pengaduan'      && typeof waKirimLaporan         === 'function') waKirimLaporan('aduan', res.id);
          if (currentActiveMenu === 'SuratPengantar' && typeof waKirimLaporan         === 'function') waKirimLaporan('surat', res.id);
          if (currentActiveMenu === 'Sumbangan'      && typeof waVerifikasiSumbangan  === 'function') waVerifikasiSumbangan(res.id);
        }
        loadMenu(currentActiveMenu);
        fetchNotifikasi();
      } else { alert('Gagal menyimpan: ' + (res ? res.message : 'Error')); loadMenu(currentActiveMenu); }
    }
  }).catch(err => { alert('Gagal membaca file foto: ' + err.message); loadMenu(currentActiveMenu); });
}
async function hapusDataAktif() {
  let targetId = editingId || editingNik;
  if (!targetId) {
    showUIToast('ID / NIK data tidak ditemukan untuk dihapus.', 'error');
    return;
  }
  showUIConfirm('Apakah Anda yakin ingin menghapus data ini secara permanen dari database?', async function() {
    document.getElementById('dynamicForm').innerHTML = '<div class="text-center p-4"><b class="text-danger">Menghapus data...</b></div>';
    delete menuDataCache[currentActiveMenu];
    const res = await callGASPost('hapusDataDariSheet', { sheetName: currentActiveMenu, id: targetId });
    if (res && res.status === 'success') { bootstrapModalInstance.hide(); showUIToast('Data Berhasil Dihapus!', 'success'); loadMenu(currentActiveMenu); fetchNotifikasi(); }
    else { showUIToast('Gagal menghapus: ' + (res ? res.message : 'Error'), 'error'); loadMenu(currentActiveMenu); }
  }, 'Hapus Data Permanen');
}
function getTombolAksi(menu, row, headers) {
  let lowerHeaders = headers.map(h => (h || '').toLowerCase().trim());
  let idIdx = lowerHeaders.indexOf('id');
  if (idIdx === -1) idIdx = lowerHeaders.findIndex(h => h.includes('id'));
  if (idIdx === -1) idIdx = lowerHeaders.findIndex(h => h.includes('nik') || h.includes('ktp'));
  if (idIdx === -1) idIdx = 0;
  let realId = row[idIdx];
  let noHpIdx = lowerHeaders.findIndex(h => h.includes('hp') || h.includes('wa') || h.includes('telp') || h.includes('nomor'));
  let noHpWarga = noHpIdx > -1 ? row[noHpIdx] : '';
  if (session.role === 'RT') {
    let btn = `<button class="btn btn-sm btn-outline-primary m-1 fw-bold" onclick="bukaModalEdit('${realId}')">Edit/Status</button>`;
    if (['Pengaduan','SuratPengantar'].includes(menu)) btn += `<button class="btn btn-sm btn-success m-1 fw-bold" onclick="waKirimLaporanKeWarga('${realId}','${noHpWarga}')"><i class="bi bi-whatsapp me-1"></i>Laporan</button>`;
    return btn;
  }
  if (session.role === 'Warga') {
    if (menu === 'Pengaduan')      return `<button class="btn btn-sm btn-success fw-bold" onclick="waKirimLaporan('aduan','${realId}')"><i class="bi bi-whatsapp me-1"></i>WA Lapor</button>`;
    if (menu === 'SuratPengantar') return `<button class="btn btn-sm btn-success fw-bold" onclick="waKirimLaporan('surat','${realId}')"><i class="bi bi-whatsapp me-1"></i>WA Surat</button>`;
    if (menu === 'Keuangan')       return `<button class="btn btn-sm btn-danger fw-bold" onclick="waLaporMasalahKeuangan('${realId}')">Laporkan</button>`;
    if (menu === 'Sumbangan')      return `<button class="btn btn-sm btn-success fw-bold" onclick="waVerifikasiSumbangan('${realId}')"><i class="bi bi-whatsapp me-1"></i>Verifikasi</button>`;
  }
  return '-';
}
function bukaWa(nomor, text) {
  window.open(`https://wa.me/${nomor}?text=${encodeURIComponent(text)}`, '_blank');
}
function filterTable() {
  let searchInput = document.getElementById("searchInput");
  if (!searchInput) return;
  let input = searchInput.value.toLowerCase().trim();
  if (typeof filterDataWarga === 'function' && currentActiveMenu === 'Warga') { filterDataWarga(); return; }
  if (typeof filterDataSumbangan === 'function' && currentActiveMenu === 'Sumbangan') { filterDataSumbangan(); return; }
  if (typeof filterDataPengaduan === 'function' && currentActiveMenu === 'Pengaduan') { filterDataPengaduan(); return; }
  if (typeof filterDataSurat === 'function' && currentActiveMenu === 'SuratPengantar') { filterDataSurat(); return; }
  if (typeof filterTabelKas === 'function' && currentActiveMenu === 'Keuangan') { filterTabelKas(); return; }
  if (typeof filterDataPindahMasuk === 'function' && currentActiveMenu === 'PindahMasuk') { filterDataPindahMasuk(); return; }
  if (typeof filterDataPindahKeluar === 'function' && currentActiveMenu === 'PindahKeluar') { filterDataPindahKeluar(); return; }
  if (typeof filterDataKelahiran === 'function' && currentActiveMenu === 'Kelahiran') { filterDataKelahiran(); return; }
  if (typeof filterDataKematian === 'function' && currentActiveMenu === 'Kematian') { filterDataKematian(); return; }
  let rows = document.querySelectorAll("#main-content table tbody tr");
  rows.forEach(row => {
    let text = row.innerText.toLowerCase();
    row.style.display = text.includes(input) ? "" : "none";
  });
  let iuranItems = document.querySelectorAll("#list-bulan-iuran > div");
  iuranItems.forEach(card => {
    let text = card.innerText.toLowerCase();
    card.style.display = text.includes(input) ? "" : "none";
  });
  document.querySelectorAll(".quick-action-item").forEach(item => {
    let text = item.innerText.toLowerCase();
    item.style.display = text.includes(input) ? "flex" : "none";
  });
}
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
function updateDynamicManifest() {
  try {
    let baseUrl = window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
    let absStartUrl = baseUrl + 'index.html';
    let absScope = baseUrl;
    let logoUrl = appSettings.app_logo || './img/logo.jpg';
    let mimeType = 'image/jpeg';
    if (logoUrl.startsWith('data:image/png')) mimeType = 'image/png';
    else if (logoUrl.startsWith('data:image/jpeg') || logoUrl.startsWith('data:image/jpg')) mimeType = 'image/jpeg';
    else if (logoUrl.startsWith('data:image/svg')) mimeType = 'image/svg+xml';
    else if (logoUrl.endsWith('.png')) mimeType = 'image/png';
    else if (logoUrl.endsWith('.jpg') || logoUrl.endsWith('.jpeg')) mimeType = 'image/jpeg';
    else if (logoUrl.endsWith('.webp')) mimeType = 'image/webp';
    let manifestData = {
      name: appSettings.app_title || 'SISTEM INFORMASI RT 5',
      short_name: appSettings.app_short_name || 'RT 5',
      description: (appSettings.app_subtitle || 'Layanan Digital RT 05 / RW 01 • Transparan & Efisien'),
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
async function loadAppSettings() {
  try {
    const { data: settingsData } = await safeSupabaseSelect('Pengaturan');
    if (settingsData && settingsData.length > 0) {
      settingsData.forEach(row => {
        let k = row.kunci || cariNilaiKolom(row, ['kunci', 'key']);
        let v = row.nilai !== null && row.nilai !== undefined ? row.nilai : cariNilaiKolom(row, ['nilai', 'value']);
        if (k) appSettings[k] = v;
      });
    }
    if (appSettings.app_title) {
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
    }
    applyTheme(appSettings.app_theme || 'blue');
    renderHeaderRekeningInfo();
    updateDynamicManifest();
  } catch(e) {
    console.error('Gagal memuat pengaturan:', e);
  }
}
function selectThemeOption(themeName) {
  let inputTheme = document.getElementById('set-app-theme');
  if (inputTheme) inputTheme.value = themeName;
  applyTheme(themeName);
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
  } else if (customHex) {
    primaryColor = customHex;
  }

  document.body.classList.remove('theme-blue', 'theme-emerald', 'theme-indigo', 'theme-purple', 'theme-dark');
  document.body.classList.add('theme-' + (themeName || 'blue'));

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
    .btn-outline-primary {
      color: ${primaryColor} !important;
      border-color: ${primaryColor} !important;
    }
    .btn-outline-primary:hover {
      background-color: ${primaryColor} !important;
      color: #ffffff !important;
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
    .bg-gradient-to-r.from-blue-900, .bg-gradient-to-r.from-blue-800, .bg-gradient-to-r.from-blue-700, .bg-gradient-to-r.from-blue-600 {
      background-image: linear-gradient(to right, ${primaryColor}, ${gradientEnd}) !important;
    }
    ${themeName === 'dark' ? `
      body { background-color: #0f172a !important; color: #f8fafc !important; }
      .bg-white, .card, .card-custom, .login-box { background-color: #1e293b !important; color: #f8fafc !important; border-color: #334155 !important; }
      .text-gray-800, .text-gray-700, .text-gray-600, .text-dark { color: #f1f5f9 !important; }
      .bg-gray-50, .bg-gray-100 { background-color: #334155 !important; color: #f8fafc !important; }
    ` : `
      body { background-color: #f8fafc !important; color: #1e293b !important; }
    `}
  `;

  let meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = primaryColor;
  appSettings.app_theme_color = primaryColor;
  appSettings.app_theme = themeName || 'blue';
}
function renderHeaderRekeningInfo() {
  let rekEl = document.getElementById('rek-info');
  if (!rekEl) return;
  let list = [];
  try { list = JSON.parse(appSettings.payment_rekening || '[]'); } catch(e) {}
  if (!Array.isArray(list) || list.length === 0) {
    rekEl.style.display = 'none';
    return;
  }
  let html = `<h5 class="fw-bold text-primary mb-2"><i class="bi bi-info-circle-fill me-2"></i>Info Rekening & Pembayaran</h5><p class="mb-1 text-secondary">`;
  list.forEach((r, idx) => {
    let b = r.bank || 'Bank';
    let n = r.no || '-';
    html += `<strong>${b}:</strong> ${n} <button class="btn-salin-inline" onclick="copySingleRek('${n}')">(salin)</button> ${idx < list.length - 1 ? '| ' : ''}`;
  });
  if (list.length > 0 && list[0].an) {
    html += `<span class="ms-2 badge bg-light text-dark">a.n ${list[0].an}</span>`;
  }
  if (appSettings.payment_qris) {
    html += `<button onclick="bukaPopUpFoto('${appSettings.payment_qris}')" class="btn btn-sm btn-outline-primary ms-3 font-bold py-0"><i class="bi bi-qr-code me-1"></i>Lihat QRIS</button>`;
  }
  html += `</p>`;
  rekEl.innerHTML = html;
}
function switchSettingTab(tabName) {
  document.querySelectorAll('.setting-tab-panel').forEach(p => p.classList.add('d-none'));
  document.querySelectorAll('#settingTabs .nav-link').forEach(b => b.classList.remove('active'));
  let panel = document.getElementById('tab-content-' + tabName);
  let btn = document.getElementById('tab-' + tabName + '-btn');
  if (panel) panel.classList.remove('d-none');
  if (btn) btn.classList.add('active');
}
function selectThemeOption(themeName) {
  document.getElementById('set-app-theme').value = themeName;
  applyTheme(themeName);
}
function handleLogoFileUpload(event) {
  let file = event.target.files[0];
  if (!file) return;
  let reader = new FileReader();
  reader.onload = function(e) {
    let img = new Image();
    img.onload = function() {
      let canvas = document.createElement('canvas');
      let maxDim = 250;
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      canvas.width = width;
      canvas.height = height;
      let ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      let compressedBase64 = canvas.toDataURL('image/png', 0.9);
      let inputUrl = document.getElementById('set-app-logo');
      let previewImg = document.getElementById('preview-logo-upload');
      if (inputUrl) inputUrl.value = compressedBase64;
      if (previewImg) previewImg.src = compressedBase64;
      document.querySelectorAll('.app-logo-img').forEach(el => {
        el.src = compressedBase64;
      });
      try { localStorage.setItem('cached_app_logo', compressedBase64); } catch(err) {}
      if (typeof showUIToast === 'function') {
        showUIToast('Logo baru terpilih! Klik "Simpan Identitas & Tema" di bawah.', 'info');
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}
function tambahBarisRekening() {
  let container = document.getElementById('container-rekening-list');
  if (!container) return;
  let div = document.createElement('div');
  div.className = 'row g-2 align-items-center border p-2 rounded bg-light row-rek-item';
  div.innerHTML = `
    <div class="col-md-3">
      <input type="text" class="form-control form-control-sm inp-rek-bank" placeholder="Nama Bank/Wallet" required>
    </div>
    <div class="col-md-4">
      <input type="text" class="form-control form-control-sm inp-rek-no" placeholder="Nomor Rekening/HP" required>
    </div>
    <div class="col-md-4">
      <input type="text" class="form-control form-control-sm inp-rek-an" placeholder="a.n. Nama Pemilik" required>
    </div>
    <div class="col-md-1 text-center">
      <button type="button" class="btn btn-sm btn-danger px-2" onclick="this.closest('.row-rek-item').remove()"><i class="bi bi-trash"></i></button>
    </div>`;
  container.appendChild(div);
}
async function simpanIdentitasDanTema(e) {
  e.preventDefault();
  let title = document.getElementById('set-app-title').value;
  let shortName = document.getElementById('set-app-short-name') ? document.getElementById('set-app-short-name').value : title.substring(0, 12);
  let subtitle = document.getElementById('set-app-subtitle').value;
  let logo = document.getElementById('set-app-logo').value;
  let theme = document.getElementById('set-app-theme').value;
  let themeColor = document.getElementById('set-app-theme-color') ? document.getElementById('set-app-theme-color').value : '#1e3a8a';
  let waNumber = document.getElementById('set-rt-wa-number') ? document.getElementById('set-rt-wa-number').value.trim() : '';
  if (waNumber.startsWith('0')) {
    waNumber = '62' + waNumber.substring(1);
  } else if (waNumber.startsWith('+62')) {
    waNumber = waNumber.substring(1);
  }
  let rtRwText = document.getElementById('set-rt-rw-text') ? document.getElementById('set-rt-rw-text').value.trim() : 'RT 05 / RW 01';
  let namaKelurahan = document.getElementById('set-nama-kelurahan') ? document.getElementById('set-nama-kelurahan').value.trim() : '';
  let alamatRt = document.getElementById('set-alamat-rt') ? document.getElementById('set-alamat-rt').value.trim() : '';
  let namaSekretaris = document.getElementById('set-nama-sekretaris') ? document.getElementById('set-nama-sekretaris').value.trim() : '';
  let namaRtKetua = document.getElementById('set-nama-rt-ketua') ? document.getElementById('set-nama-rt-ketua').value.trim() : '';
  let ttdSekretaris = document.getElementById('set-ttd-sekretaris') ? document.getElementById('set-ttd-sekretaris').value.trim() : '';
  let ttdKetuaRt = document.getElementById('set-ttd-ketua-rt') ? document.getElementById('set-ttd-ketua-rt').value.trim() : '';
  let geminiApiKey = document.getElementById('set-gemini-api-key') ? document.getElementById('set-gemini-api-key').value.trim() : '';
  let settingsArray = [
    { kunci: 'app_title', nilai: title },
    { kunci: 'app_short_name', nilai: shortName },
    { kunci: 'app_subtitle', nilai: subtitle },
    { kunci: 'rt_rw_text', nilai: rtRwText },
    { kunci: 'nama_kelurahan', nilai: namaKelurahan },
    { kunci: 'alamat_rt', nilai: alamatRt },
    { kunci: 'app_logo', nilai: logo },
    { kunci: 'app_theme', nilai: theme },
    { kunci: 'app_theme_color', nilai: themeColor },
    { kunci: 'rt_wa_number', nilai: waNumber },
    { kunci: 'nama_sekretaris', nilai: namaSekretaris },
    { kunci: 'nama_rt_ketua', nilai: namaRtKetua },
    { kunci: 'ttd_sekretaris', nilai: ttdSekretaris },
    { kunci: 'ttd_ketua_rt', nilai: ttdKetuaRt },
    { kunci: 'gemini_api_key', nilai: geminiApiKey }
  ];
  appSettings.gemini_api_key = geminiApiKey;
  try { localStorage.setItem('rt_gemini_api_key', geminiApiKey); } catch(e) {}

  const res = await callGASPost('simpanPengaturanApp', { settingsArray });
  if (res && res.status === 'success') {
    alert('Identitas, Tema & Pengaturan PWA berhasil diperbarui!');
    await loadAppSettings();
  } else {
    alert('Gagal menyimpan: ' + (res ? res.message : 'Error'));
  }
}
function handleTtdFileUpload(e, targetType) {
  let file = e.target.files[0];
  if (!file) return;
  let reader = new FileReader();
  reader.onload = function(evt) {
    let img = new Image();
    img.onload = function() {
      let canvas = document.createElement('canvas');
      let maxDim = 400;
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      canvas.width = width;
      canvas.height = height;
      let ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      let compressedBase64 = canvas.toDataURL('image/png');
      if (targetType === 'sekretaris') {
        let inputUrl = document.getElementById('set-ttd-sekretaris');
        let previewImg = document.getElementById('preview-ttd-sekretaris');
        if (inputUrl) inputUrl.value = compressedBase64;
        if (previewImg) { previewImg.src = compressedBase64; previewImg.style.display = 'block'; }
      } else if (targetType === 'ketua') {
        let inputUrl = document.getElementById('set-ttd-ketua-rt');
        let previewImg = document.getElementById('preview-ttd-ketua-rt');
        if (inputUrl) inputUrl.value = compressedBase64;
        if (previewImg) { previewImg.src = compressedBase64; previewImg.style.display = 'block'; }
      }
      alert('File tanda tangan berhasil dipilih! Klik "Simpan Identitas & Tema" untuk menyimpan.');
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
}
async function simpanRekeningDanQRIS(e) {
  e.preventDefault();
  let qrisString = document.getElementById('set-payment-qris-string').value.trim();
  let qrisName   = document.getElementById('set-payment-qris-name').value.trim();
  let qrisUrl    = document.getElementById('set-payment-qris').value.trim();
  let rekList = [];
  document.querySelectorAll('.row-rek-item').forEach(row => {
    let b = row.querySelector('.inp-rek-bank').value.trim();
    let n = row.querySelector('.inp-rek-no').value.trim();
    let a = row.querySelector('.inp-rek-an').value.trim();
    if (b && n) rekList.push({ bank: b, no: n, an: a });
  });
  let settingsArray = [
    { kunci: 'payment_qris_string', nilai: qrisString },
    { kunci: 'payment_qris_name', nilai: qrisName },
    { kunci: 'payment_qris', nilai: qrisUrl },
    { kunci: 'payment_rekening', nilai: JSON.stringify(rekList) }
  ];
  const res = await callGASPost('simpanPengaturanApp', { settingsArray });
  if (res && res.status === 'success') {
    alert('Rekening & Pengaturan QRIS Dinamis berhasil disimpan!');
    await loadAppSettings();
  } else {
    alert('Gagal menyimpan: ' + (res ? res.message : 'Error'));
  }
}
async function simpanUserBaru(e) {
  e.preventDefault();
  let username = document.getElementById('reg-username').value.trim();
  let nik = document.getElementById('reg-nik').value.trim();
  let password = document.getElementById('reg-password').value.trim();
  let role = document.getElementById('reg-role').value;
  if (!username || !password) {
    alert('Username dan Password wajib diisi!');
    return;
  }
  let userObj = {
    id: Date.now(),
    username: username,
    nik: nik || username,
    password: password,
    role: role
  };
  const res = await callGASPost('tambahUserWarga', { userObj });
  if (res && res.status === 'success') {
    alert(`Akun ${username} (${role}) berhasil didaftarkan!`);
    renderPengaturanRTView();
  } else {
    alert('Gagal mendaftarkan user: ' + (res ? res.message : 'Error'));
  }
}
async function resetPasswordUser(username) {
  let newPass = prompt(`Masukkan password baru untuk akun '${username}':`);
  if (!newPass) return;
  const res = await callGASPost('resetPasswordUser', { username: username, newPassword: newPass.trim() });
  if (res && res.status === 'success') {
    alert(`Password untuk '${username}' berhasil diubah!`);
  } else {
    alert('Gagal reset password: ' + (res ? res.message : 'Error'));
  }
}
async function hapusUserAkun(username) {
  if (!username) return;
  showUIConfirm(`Apakah Anda yakin ingin menghapus akun user '${username}' secara permanen dari database?`, async function() {
    const res = await callGASPost('hapusUserAkun', { username: username });
    if (res && res.status === 'success') {
      try { await safeSupabaseDelete('Sessions', 'nik', username); } catch(e) {}
      showUIToast(`Akun '${username}' dan seluruh sesi login aktifnya berhasil dihapus permanen!`, 'success');
      renderPengaturanRTView();
    } else {
      showUIToast('Gagal menghapus user: ' + (res ? res.message : 'Error'), 'error');
    }
  }, 'Hapus Akun User');
}
function bukaModalEditUser(uName, uNik, uRole) {
  let modalTitle = document.getElementById('formModalTitle');
  let dynamicForm = document.getElementById('dynamicForm');
  let btnHapus = document.getElementById('btn-hapus-modal');
  if (modalTitle) modalTitle.innerText = `Edit Akun User: ${uName}`;
  if (btnHapus) btnHapus.style.display = 'none';
  let styleId = 'hide-modal-footer-override';
  if (!document.getElementById(styleId)) {
    let style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `#formModal .modal-footer { display: none !important; }`;
    document.head.appendChild(style);
  }
  let cleanNik = (uNik === '-' || uNik === 'undefined') ? '' : uNik;
  let html = `
    <div class="space-y-3 text-xs p-1">
      <div>
        <label class="font-bold text-gray-700 mb-1 block">Username</label>
        <input type="text" id="edit-user-username" value="${uName}" class="w-full p-2 border rounded-xl bg-white" required>
      </div>
      <div>
        <label class="font-bold text-gray-700 mb-1 block">NIK Warga (Opsional)</label>
        <input type="text" id="edit-user-nik" value="${cleanNik}" class="w-full p-2 border rounded-xl bg-white" placeholder="Sesuai KTP Warga">
      </div>
      <div>
        <label class="font-bold text-gray-700 mb-1 block">Role User</label>
        <select id="edit-user-role" class="w-full p-2 border rounded-xl bg-white">
          <option value="Warga" ${uRole === 'Warga' ? 'selected' : ''}>Warga</option>
          <option value="RT" ${uRole === 'RT' ? 'selected' : ''}>RT / Admin</option>
        </select>
      </div>
      <div>
        <label class="font-bold text-gray-700 mb-1 block">Password Baru (Opsional)</label>
        <input type="password" id="edit-user-password" class="w-full p-2 border rounded-xl bg-white" placeholder="Kosongkan jika tidak ingin ganti password">
      </div>
      <div class="pt-2 flex gap-2">
        <button type="button" onclick="simpanEditUserAkun(event, '${uName}')" class="w-full bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl font-bold shadow transition">Simpan Perubahan</button>
      </div>
    </div>
  `;
  if (dynamicForm) dynamicForm.innerHTML = html;
  let formModal = document.getElementById('formModal');
  let modalInstance = bootstrap.Modal.getInstance(formModal) || new bootstrap.Modal(formModal);
  modalInstance.show();
}
async function simpanEditUserAkun(e, oldUsername) {
  if (e) e.preventDefault();
  let usernameEl = document.getElementById('edit-user-username');
  let nikEl = document.getElementById('edit-user-nik');
  let roleEl = document.getElementById('edit-user-role');
  let passwordEl = document.getElementById('edit-user-password');
  if (!usernameEl || !roleEl) return;
  let username = usernameEl.value.trim();
  let nik = nikEl ? nikEl.value.trim() : '';
  let role = roleEl.value;
  let password = passwordEl ? passwordEl.value.trim() : '';
  if (!username) {
    showUIToast('Username tidak boleh kosong!', 'error');
    return;
  }
  let payload = {
    oldUsername: oldUsername,
    username: username,
    nik: nik,
    role: role,
    password: password
  };
  const res = await callGASPost('editUserAkun', payload);
  if (res && res.status === 'success') {
    showUIToast(`Akun '${username}' berhasil diperbarui!`, 'success');
    let formModal = document.getElementById('formModal');
    if (formModal) {
      let modalInstance = bootstrap.Modal.getInstance(formModal);
      if (modalInstance) modalInstance.hide();
    }
    renderPengaturanRTView();
  } else {
    showUIToast('Gagal mengedit user: ' + (res ? res.message : 'Error'), 'error');
  }
}
async function simpanPengumumanWarga(e) {
  e.preventDefault();
  let teks = document.getElementById('set-info-warga').value;
  const res = await callGASPost('simpanInfoWarga', { teksBaru: teks });
  if (res && res.status === 'success') {
    showUIToast('Pengumuman warga berhasil disimpan!', 'success');
    await loadAppSettings();
  } else {
    showUIToast('Gagal menyimpan pengumuman: ' + (res ? res.message : 'Error'), 'error');
  }
}
async function hapusSesiLogin(token) {
  if (!token) return;
  showUIConfirm('Putuskan sesi login ini? Warga yang menggunakan akun ini akan langsung di-logout otomatis dari aplikasinya.', async function() {
    const { error } = await safeSupabaseDelete('Sessions', 'token', token);
    if (!error) {
      showUIToast('Sesi login berhasil dihentikan/dibatalkan!', 'success');
      renderPengaturanRTView();
    } else {
      showUIToast('Gagal menghapus sesi: ' + (error ? error.message : 'Error'), 'error');
    }
  }, 'Putuskan Sesi Login');
}
function initTtdSignaturePad(canvasId, type) {
  let canvas = document.getElementById(canvasId);
  if (!canvas) return;
  let ctx = canvas.getContext('2d');
  let drawing = false;
  let lastX = 0, lastY = 0;
  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  function getPos(e) {
    let rect = canvas.getBoundingClientRect();
    let scaleX = canvas.width / rect.width;
    let scaleY = canvas.height / rect.height;
    if (e.touches) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }
  function startDraw(e) { e.preventDefault(); drawing = true; let p = getPos(e); lastX = p.x; lastY = p.y; ctx.beginPath(); ctx.arc(lastX, lastY, 1, 0, Math.PI * 2); ctx.fillStyle = '#1a1a2e'; ctx.fill(); }
  function draw(e) { e.preventDefault(); if (!drawing) return; let p = getPos(e); ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(p.x, p.y); ctx.stroke(); lastX = p.x; lastY = p.y; }
  function endDraw() { drawing = false; }
  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', endDraw);
  canvas.addEventListener('mouseleave', endDraw);
  canvas.addEventListener('touchstart', startDraw, { passive: false });
  canvas.addEventListener('touchmove', draw, { passive: false });
  canvas.addEventListener('touchend', endDraw);
}
function hapusTtdCanvas(type) {
  let canvasId = type === 'sekretaris' ? 'canvas-ttd-sekretaris' : 'canvas-ttd-ketua';
  let canvas = document.getElementById(canvasId);
  if (canvas) {
    let ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}
function simpanTtdCanvas(type) {
  let canvasId = type === 'sekretaris' ? 'canvas-ttd-sekretaris' : 'canvas-ttd-ketua';
  let inputId = type === 'sekretaris' ? 'set-ttd-sekretaris' : 'set-ttd-ketua-rt';
  let previewWrpId = type === 'sekretaris' ? 'preview-ttd-sekretaris-wrapper' : 'preview-ttd-ketua-wrapper';
  let previewImgId = type === 'sekretaris' ? 'preview-ttd-sekretaris' : 'preview-ttd-ketua-rt';
  let canvas = document.getElementById(canvasId);
  if (!canvas) return;
  let imgData = canvas.toDataURL('image/png');
  let inp = document.getElementById(inputId);
  if (inp) inp.value = imgData;
  let previewImg = document.getElementById(previewImgId);
  if (previewImg) previewImg.src = imgData;
  let wrapper = document.getElementById(previewWrpId);
  if (wrapper) wrapper.style.display = 'block';
  showUIToast('✅ Tanda tangan berhasil! Klik "Simpan Identitas & Tema" untuk menyimpan.', 'success');
}
async function renderPengaturanRTView() {
  if (session.role !== 'RT') return;
  document.getElementById('page-title').innerText = 'Pengaturan RT & Sistem';
  document.getElementById('main-content').innerHTML = `
    <div class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
      <br><small class="text-muted mt-2 d-block">Memuat pengaturan sistem...</small>
    </div>`;
  await loadAppSettings();
  let usersList = [];
  try {
    const { data: usersData } = await safeSupabaseSelect('Users');
    if (usersData && usersData.length > 0) {
      usersList = usersData;
    } else {
      const { data: rpcUsers } = await db.rpc('get_users_secured', { p_token: session.token || '' });
      if (rpcUsers) usersList = rpcUsers;
    }
  } catch(e) {}
  let sessionsList = [];
  try {
    const { data: sessData } = await safeSupabaseSelect('Sessions');
    sessionsList = sessData || [];
  } catch(e) {}
  let currentRek = [];
  try { currentRek = JSON.parse(appSettings.payment_rekening || '[]'); } catch(e) {}
  let html = `
    <div class="p-1 font-sans">
      <div class="card shadow-sm border-0 rounded-3 mb-4">
        <div class="card-header bg-white border-bottom py-3">
          <ul class="nav nav-pills card-header-pills gap-2" id="settingTabs" role="tablist">
            <li class="nav-item">
              <button class="nav-link active fw-bold text-xs" id="tab-tema-btn" onclick="switchSettingTab('tema')">
                <i class="bi bi-palette-fill me-1"></i> Identitas & Tema
              </button>
            </li>
            <li class="nav-item">
              <button class="nav-link fw-bold text-xs" id="tab-rekening-btn" onclick="switchSettingTab('rekening')">
                <i class="bi bi-qr-code-scan me-1"></i> QRIS & Rekening
              </button>
            </li>
            <li class="nav-item">
              <button class="nav-link fw-bold text-xs" id="tab-users-btn" onclick="switchSettingTab('users')">
                <i class="bi bi-person-lines-fill me-1"></i> Manajemen Akun Warga
              </button>
            </li>
            <li class="nav-item">
              <button class="nav-link fw-bold text-xs" id="tab-sesi-btn" onclick="switchSettingTab('sesi')">
                <i class="bi bi-shield-lock-fill me-1"></i> Sesi Login Aktif (${sessionsList.length})
              </button>
            </li>
            <li class="nav-item">
              <button class="nav-link fw-bold text-xs" id="tab-info-btn" onclick="switchSettingTab('info')">
                <i class="bi bi-megaphone-fill me-1"></i> Pengumuman Warga
              </button>
            </li>
          </ul>
        </div>
        <div class="card-body p-4">
          <div id="tab-content-tema" class="setting-tab-panel">
            <h5 class="fw-bold text-primary mb-3"><i class="bi bi-sliders me-2"></i>Pengaturan Identitas, Tema & PWA</h5>
            <form onsubmit="simpanIdentitasDanTema(event)">
              <div class="row g-3 mb-3">
                <div class="col-md-8">
                  <label class="form-label font-semibold text-xs text-gray-700">NAMA / JUDUL APLIKASI</label>
                  <input type="text" id="set-app-title" class="form-control" value="${appSettings.app_title || ''}" placeholder="Contoh: SISTEM INFORMASI RT 5" required oninput="document.getElementById('pwa-name-preview').innerText=this.value">
                </div>
                <div class="col-md-4">
                  <label class="form-label font-semibold text-xs text-gray-700">NAMA SINGKAT PWA <small class="text-danger">(maks 12 karakter)</small></label>
                  <input type="text" id="set-app-short-name" class="form-control" maxlength="12" value="${appSettings.app_short_name || 'RT 5'}" placeholder="Contoh: RT 5" oninput="document.getElementById('pwa-shortname-preview').innerText=this.value">
                  <small class="text-muted">Nama yang muncul di home screen HP saat install PWA.</small>
                </div>
              </div>
              <div class="mb-4 p-3 bg-gray-50 border rounded-xl">
                <p class="text-xs font-bold text-gray-600 mb-2"><i class="bi bi-phone me-1"></i> Preview Tampilan di Home Screen HP (PWA)</p>
                <div class="d-flex align-items-center gap-3">
                  <div class="text-center">
                    <div class="rounded-2xl bg-blue-600 d-flex align-items-center justify-content-center shadow" style="width:56px;height:56px;">
                      <i class="bi bi-house-fill text-white fs-4"></i>
                    </div>
                    <small id="pwa-shortname-preview" class="d-block mt-1 fw-bold text-gray-700" style="font-size:10px;max-width:64px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">${appSettings.app_short_name || 'RT 5'}</small>
                  </div>
                  <div class="text-xs text-gray-500">
                    <p class="mb-1">📱 Nama di manifest: <b id="pwa-name-preview">${appSettings.app_title || 'SISTEM INFORMASI RT 5'}</b></p>
                    <p class="mb-0">🏠 Nama di home screen: <b id="pwa-shortname-preview2">${appSettings.app_short_name || 'RT 5'}</b></p>
                  </div>
                </div>
              </div>
              <div class="mb-3">
                <label class="form-label font-semibold text-xs text-gray-700">SLOGAN / SUBTITLE</label>
                <input type="text" id="set-app-subtitle" class="form-control" value="${appSettings.app_subtitle || ''}" placeholder="Contoh: Layanan Digital RT 05 / RW 01 • Transparan & Efisien">
              </div>
              <div class="row g-3 mb-3">
                <div class="col-md-4">
                  <label class="form-label font-semibold text-xs text-gray-700">WILAYAH RT / RW <small class="text-primary font-bold">(Kop Surat & Cetak PDF)</small></label>
                  <input type="text" id="set-rt-rw-text" class="form-control" value="${appSettings.rt_rw_text || 'RT 05 / RW 01'}" placeholder="Contoh: RT 05 / RW 01">
                </div>
                <div class="col-md-4">
                  <label class="form-label font-semibold text-xs text-gray-700">KELURAHAN / KECAMATAN / KOTA</label>
                  <input type="text" id="set-nama-kelurahan" class="form-control" value="${appSettings.nama_kelurahan || 'Kelurahan Palmerah, Kota Jakarta Barat'}" placeholder="Contoh: Kelurahan Palmerah, Kota Jakarta Barat">
                </div>
                <div class="col-md-4">
                  <label class="form-label font-semibold text-xs text-gray-700">ALAMAT SEKRETARIAT RT</label>
                  <input type="text" id="set-alamat-rt" class="form-control" value="${appSettings.alamat_rt || 'Jl. Lingkungan RT 05 / RW 01'}" placeholder="Contoh: Jl. Anggrek No. 12">
                </div>
              </div>
              <div class="row g-3 mb-3">
                <div class="col-md-6">
                  <label class="form-label font-semibold text-xs text-gray-700">NAMA SEKRETARIS RT <small class="text-primary font-bold">(Teks Tanda Tangan Surat PDF)</small></label>
                  <input type="text" id="set-nama-sekretaris" class="form-control" value="${appSettings.nama_sekretaris || 'Sekretaris RT 05'}" placeholder="Contoh: Nama Sekretaris RT">
                </div>
                <div class="col-md-6">
                  <label class="form-label font-semibold text-xs text-gray-700">NAMA KETUA RT <small class="text-primary font-bold">(Teks Tanda Tangan Surat PDF)</small></label>
                  <input type="text" id="set-nama-rt-ketua" class="form-control" value="${appSettings.nama_rt_ketua || 'Ketua RT 05'}" placeholder="Contoh: Nama Ketua RT">
                </div>
              </div>
              <div class="row g-3 mb-4 p-3 bg-light border rounded-3">
                <div class="col-12 mb-1">
                  <h6 class="fw-bold text-dark text-xs mb-0"><i class="bi bi-pen-fill me-1 text-primary"></i> TANDA TANGAN DIGITAL (CETAK SURAT PDF)</h6>
                  <small class="text-muted text-[11px]">Tanda tangan langsung di kotak di bawah menggunakan jari/stylus/mouse. Tanda tangan akan otomatis dicetak pada PDF Surat Pengantar.</small>
                </div>
                <div class="col-md-6">
                  <label class="form-label font-semibold text-xs text-gray-700">TANDA TANGAN SEKRETARIS RT</label>
                  <div class="p-2 border rounded bg-white text-center">
                    <canvas id="canvas-ttd-sekretaris" width="280" height="110" style="border:2px dashed #6c757d; border-radius:8px; cursor:crosshair; touch-action:none; background:#fff; display:block; margin:0 auto;" title="Tanda tangan di sini"></canvas>
                    <div class="d-flex gap-2 mt-2 justify-content-center">
                      <button type="button" class="btn btn-sm btn-outline-danger" onclick="hapusTtdCanvas('sekretaris')"><i class="bi bi-eraser-fill me-1"></i>Hapus</button>
                      <button type="button" class="btn btn-sm btn-outline-success" onclick="simpanTtdCanvas('sekretaris')"><i class="bi bi-check-circle-fill me-1"></i>Gunakan Tanda Tangan Ini</button>
                    </div>
                    <input type="hidden" id="set-ttd-sekretaris" value="${appSettings.ttd_sekretaris || ''}">
                    <div id="preview-ttd-sekretaris-wrapper" class="mt-2" style="${appSettings.ttd_sekretaris ? '' : 'display:none;'}">
                      <small class="text-success font-bold text-[10px] d-block mb-1"><i class="bi bi-check-circle me-1"></i>Tanda tangan tersimpan:</small>
                      <img id="preview-ttd-sekretaris" src="${appSettings.ttd_sekretaris || ''}" class="border rounded" style="max-height:55px;object-fit:contain;">
                      <button type="button" class="btn btn-xs btn-link text-danger text-[10px] d-block mx-auto mt-1" onclick="document.getElementById('set-ttd-sekretaris').value=''; document.getElementById('preview-ttd-sekretaris-wrapper').style.display='none'; hapusTtdCanvas('sekretaris');">✕ Reset</button>
                    </div>
                  </div>
                </div>
                <div class="col-md-6">
                  <label class="form-label font-semibold text-xs text-gray-700">TANDA TANGAN KETUA RT</label>
                  <div class="p-2 border rounded bg-white text-center">
                    <canvas id="canvas-ttd-ketua" width="280" height="110" style="border:2px dashed #6c757d; border-radius:8px; cursor:crosshair; touch-action:none; background:#fff; display:block; margin:0 auto;" title="Tanda tangan di sini"></canvas>
                    <div class="d-flex gap-2 mt-2 justify-content-center">
                      <button type="button" class="btn btn-sm btn-outline-danger" onclick="hapusTtdCanvas('ketua')"><i class="bi bi-eraser-fill me-1"></i>Hapus</button>
                      <button type="button" class="btn btn-sm btn-outline-success" onclick="simpanTtdCanvas('ketua')"><i class="bi bi-check-circle-fill me-1"></i>Gunakan Tanda Tangan Ini</button>
                    </div>
                    <input type="hidden" id="set-ttd-ketua-rt" value="${appSettings.ttd_ketua_rt || ''}">
                    <div id="preview-ttd-ketua-wrapper" class="mt-2" style="${appSettings.ttd_ketua_rt ? '' : 'display:none;'}">
                      <small class="text-success font-bold text-[10px] d-block mb-1"><i class="bi bi-check-circle me-1"></i>Tanda tangan tersimpan:</small>
                      <img id="preview-ttd-ketua-rt" src="${appSettings.ttd_ketua_rt || ''}" class="border rounded" style="max-height:55px;object-fit:contain;">
                      <button type="button" class="btn btn-xs btn-link text-danger text-[10px] d-block mx-auto mt-1" onclick="document.getElementById('set-ttd-ketua-rt').value=''; document.getElementById('preview-ttd-ketua-wrapper').style.display='none'; hapusTtdCanvas('ketua');">✕ Reset</button>
                    </div>
                  </div>
                </div>
              </div>
              <div class="mb-3">
                <label class="form-label font-semibold text-xs text-gray-700">NOMOR WHATSAPP DEFAULT LAPORAN RT <small class="text-primary font-bold">(Untuk Laporan Aduan, Surat & Sumbangan)</small></label>
                <div class="input-group">
                  <span class="input-group-text bg-success text-white fw-bold"><i class="bi bi-whatsapp me-1"></i>+</span>
                  <input type="text" id="set-rt-wa-number" class="form-control" value="${appSettings.rt_wa_number || '628973366667'}" placeholder="Contoh: 628973366667 atau 08973366667">
                </div>
                <small class="text-muted">Nomor WhatsApp RT ini yang akan otomatis dihubungi warga saat mengirim Laporan Pengaduan, Surat Pengantar, atau Sumbangan.</small>
              </div>
              <div class="row g-3 mb-3">
                <div class="col-md-8">
                  <label class="form-label font-semibold text-xs text-gray-700">LOGO RT / IKON APLIKASI</label>
                  <div class="p-3 bg-light border rounded-3 mb-2">
                    <div class="d-flex align-items-center gap-3">
                      <div class="text-center">
                        <img id="preview-logo-upload" src="${appSettings.app_logo || './img/logo.jpg'}" alt="Preview Logo" class="rounded-circle border shadow-sm app-logo-img" style="width: 55px; height: 55px; object-fit: cover;">
                        <small class="d-block text-[9px] text-gray-500 mt-1 font-bold">Pratinjau</small>
                      </div>
                      <div class="flex-grow-1 space-y-2">
                        <div>
                          <label class="btn btn-sm btn-outline-primary font-bold cursor-pointer text-xs mb-1">
                            <i class="bi bi-upload me-1"></i>Pilih / Upload File Logo Baru
                            <input type="file" id="file-app-logo" accept="image/*" class="d-none" onchange="handleLogoFileUpload(event)">
                          </label>
                          <small class="d-block text-[10px] text-gray-500">Upload foto logo dari HP / Komputer Anda (PNG/JPG/WebP).</small>
                        </div>
                        <input type="text" id="set-app-logo" class="form-control form-control-sm text-xs" value="${appSettings.app_logo || ''}" placeholder="Atau paste URL Foto Logo di sini..." oninput="document.getElementById('preview-logo-upload').src=this.value">
                      </div>
                    </div>
                  </div>
                </div>
                <div class="col-md-4">
                  <label class="form-label font-semibold text-xs text-gray-700">WARNA TEMA (Hex)</label>
                  <div class="d-flex gap-2 align-items-center">
                    <input type="color" id="set-app-theme-color" class="form-control form-control-color" value="${appSettings.app_theme_color || '#1e3a8a'}" title="Pilih warna tema" style="width:50px;" oninput="applyTheme('custom', this.value)">
                    <input type="text" class="form-control form-control-sm" value="${appSettings.app_theme_color || '#1e3a8a'}" oninput="document.getElementById('set-app-theme-color').value=this.value; applyTheme('custom', this.value);" placeholder="#1e3a8a">
                  </div>
                  <small class="text-muted">Warna tema PWA & header.</small>
                </div>
              </div>
              <div class="mb-4">
                <label class="form-label font-semibold text-xs text-gray-700">TEMA WARNA APLIKASI</label>
                <div class="row g-2">
                  <div class="col-6 col-md-2">
                    <div class="p-3 border rounded text-center cursor-pointer ${appSettings.app_theme==='blue'?'border-primary bg-primary-subtle':''}" onclick="selectThemeOption('blue')">
                      <div class="rounded-circle mx-auto mb-2" style="width:30px;height:30px;background:#2563eb;"></div>
                      <small class="fw-bold d-block">Biru Klasik</small>
                    </div>
                  </div>
                  <div class="col-6 col-md-2">
                    <div class="p-3 border rounded text-center cursor-pointer ${appSettings.app_theme==='emerald'?'border-success bg-success-subtle':''}" onclick="selectThemeOption('emerald')">
                      <div class="rounded-circle mx-auto mb-2" style="width:30px;height:30px;background:#059669;"></div>
                      <small class="fw-bold d-block">Hijau Emerald</small>
                    </div>
                  </div>
                  <div class="col-6 col-md-2">
                    <div class="p-3 border rounded text-center cursor-pointer ${appSettings.app_theme==='indigo'?'border-info bg-info-subtle':''}" onclick="selectThemeOption('indigo')">
                      <div class="rounded-circle mx-auto mb-2" style="width:30px;height:30px;background:#4f46e5;"></div>
                      <small class="fw-bold d-block">Indigo Modern</small>
                    </div>
                  </div>
                  <div class="col-6 col-md-2">
                    <div class="p-3 border rounded text-center cursor-pointer ${appSettings.app_theme==='purple'?'border-warning bg-warning-subtle':''}" onclick="selectThemeOption('purple')">
                      <div class="rounded-circle mx-auto mb-2" style="width:30px;height:30px;background:#9333ea;"></div>
                      <small class="fw-bold d-block">Purple Royal</small>
                    </div>
                  </div>
                  <div class="col-6 col-md-2">
                    <div class="p-3 border rounded text-center cursor-pointer ${appSettings.app_theme==='dark'?'border-dark bg-dark text-white':''}" onclick="selectThemeOption('dark')">
                      <div class="rounded-circle mx-auto mb-2" style="width:30px;height:30px;background:#1e293b;"></div>
                      <small class="fw-bold d-block">Dark Mode</small>
                    </div>
                  </div>
                </div>
                <input type="hidden" id="set-app-theme" value="${appSettings.app_theme || 'blue'}">
              </div>
              <div class="mb-4 p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
                <label class="form-label font-semibold text-xs text-blue-900 flex items-center gap-1.5 mb-1">
                  <i class="bi bi-robot text-blue-600"></i> AI API KEY (OpenRouter / Google Gemini)
                </label>
                <input type="text" id="set-gemini-api-key" class="form-control form-control-sm font-mono text-xs" value="${appSettings.gemini_api_key || ''}" placeholder="Paste API Key OpenRouter (sk-or-v1-...) atau Gemini (AIzaSy...)">
                <small class="text-gray-500 text-[10px] d-block mt-1">Key ini digunakan untuk menjalankan Asisten AI RT 5. Dapatkan gratis di <a href="https://openrouter.ai" target="_blank" class="text-blue-600 font-bold underline">OpenRouter</a> atau <a href="https://aistudio.google.com/app/apikey" target="_blank" class="text-blue-600 font-bold underline">Google AI Studio</a>.</small>
              </div>
              <button type="submit" class="btn btn-primary fw-bold px-4 py-2"><i class="bi bi-check-circle me-1"></i>Simpan Identitas & Tema</button>
            </form>
          </div>
          <div id="tab-content-rekening" class="setting-tab-panel d-none">
            <h5 class="fw-bold text-primary mb-3"><i class="bi bi-wallet2 me-2"></i>Pengaturan QRIS Dinamis & Rekening Pembayaran</h5>
            <form onsubmit="simpanRekeningDanQRIS(event)">
              <div class="mb-3">
                <label class="form-label font-semibold text-xs text-gray-700">BASE PAYLOAD QRIS STATIS RT (Payload Kode QRIS DANA/BRI/NMID)</label>
                <textarea id="set-payment-qris-string" rows="3" class="form-control font-mono text-xs mb-1" placeholder="Contoh: 00020101021126570011ID.DANA.WWW...">${appSettings.payment_qris_string || ''}</textarea>
                <small class="text-muted d-block mb-3">*Sistem akan secara otomatis menyisipkan nominal tagihan (seperti Rp 50.000) secara **DINAMIS** dan mengalkulasi ulang checksum CRC16 QRIS saat warga melakukan pembayaran.</small>
              </div>
              <div class="mb-3">
                <label class="form-label font-semibold text-xs text-gray-700">NAMA MERCHANT / SHIFT KODE QRIS</label>
                <input type="text" id="set-payment-qris-name" class="form-control form-control-sm" value="${appSettings.payment_qris_name || ''}" placeholder="Contoh: RT 5 / RW 01">
              </div>
              <div class="mb-4">
                <label class="form-label font-semibold text-xs text-gray-700">URL FOTO QRIS STATIS (OPSIONAL / Gambar Cadangan)</label>
                <input type="text" id="set-payment-qris" class="form-control mb-2" value="${appSettings.payment_qris || ''}" placeholder="https://... (URL foto QRIS cadangan jika ada)">
                ${appSettings.payment_qris ? `<div class="mb-2"><img src="${appSettings.payment_qris}" class="rounded border p-1" style="max-height:100px;" onclick="bukaPopUpFoto('${appSettings.payment_qris}')"><small class="d-block text-muted">Klik untuk pratinjau</small></div>` : ''}
              </div>
              <div class="mb-3 border-t pt-3">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <label class="form-label font-semibold text-xs text-gray-700 mb-0">DAFTAR REKENING BANK / E-WALLET</label>
                  <button type="button" class="btn btn-sm btn-outline-success font-bold" onclick="tambahBarisRekening()"><i class="bi bi-plus-lg me-1"></i>Tambah Rekening</button>
                </div>
                <div id="container-rekening-list" class="space-y-2">`;
  if (currentRek.length === 0) {
    currentRek = [
      { bank: 'DANA', no: '08973366667', an: 'RIZKY NOVIANSYAH' },
      { bank: 'BRI', no: '231313', an: 'RIZKY NOVIANSYAH' }
    ];
  }
  currentRek.forEach((r) => {
    html += `
      <div class="row g-2 align-items-center border p-2 rounded bg-light row-rek-item">
        <div class="col-md-3">
          <input type="text" class="form-control form-control-sm inp-rek-bank" value="${r.bank || ''}" placeholder="Nama Bank/Wallet" required>
        </div>
        <div class="col-md-4">
          <input type="text" class="form-control form-control-sm inp-rek-no" value="${r.no || ''}" placeholder="Nomor Rekening/HP" required>
        </div>
        <div class="col-md-4">
          <input type="text" class="form-control form-control-sm inp-rek-an" value="${r.an || ''}" placeholder="a.n. Nama Pemilik" required>
        </div>
        <div class="col-md-1 text-center">
          <button type="button" class="btn btn-sm btn-danger px-2" onclick="this.closest('.row-rek-item').remove()"><i class="bi bi-trash"></i></button>
        </div>
      </div>`;
  });
  html += `
                </div>
              </div>
              <button type="submit" class="btn btn-primary fw-bold px-4 py-2 mt-3"><i class="bi bi-check-circle me-1"></i>Simpan Rekening & QRIS</button>
            </form>
          </div>
          <div id="tab-content-users" class="setting-tab-panel d-none">
            <h5 class="fw-bold text-primary mb-3"><i class="bi bi-person-plus-fill me-2"></i>Registrasi & Manajemen Akun Login Warga</h5>
            <div class="card border p-3 bg-light rounded-3 mb-4">
              <h6 class="fw-bold text-dark mb-2"><i class="bi bi-person-plus me-1 text-success"></i>Tambah / Daftarkan Akun Warga Baru</h6>
              <form onsubmit="simpanUserBaru(event)" class="row g-2">
                <div class="col-md-3">
                  <label class="form-label text-[10px] font-bold text-muted uppercase">Username / NIK</label>
                  <input type="text" id="reg-username" class="form-control form-control-sm" placeholder="Username / NIK Warga" required>
                </div>
                <div class="col-md-3">
                  <label class="form-label text-[10px] font-bold text-muted uppercase">NIK Warga (Opsional)</label>
                  <input type="text" id="reg-nik" class="form-control form-control-sm" placeholder="Sesuai KTP Warga">
                </div>
                <div class="col-md-3">
                  <label class="form-label text-[10px] font-bold text-muted uppercase">Password</label>
                  <input type="password" id="reg-password" class="form-control form-control-sm" placeholder="Password Login" required>
                </div>
                <div class="col-md-2">
                  <label class="form-label text-[10px] font-bold text-muted uppercase">Role User</label>
                  <select id="reg-role" class="form-select form-select-sm">
                    <option value="Warga">Warga</option>
                    <option value="RT">RT / Admin</option>
                  </select>
                </div>
                <div class="col-md-1 d-flex align-items-end">
                  <button type="submit" class="btn btn-sm btn-success w-100 fw-bold">Daftar</button>
                </div>
              </form>
            </div>
            <h6 class="fw-bold text-gray-700 mb-2">Daftar Akun User Terdaftar (${usersList.length})</h6>
            <div class="table-responsive border rounded-3 bg-white">
              <table class="table table-hover text-xs mb-0 align-middle">
                <thead class="table-light text-uppercase">
                  <tr>
                    <th class="p-2">No</th>
                    <th class="p-2">Username</th>
                    <th class="p-2">NIK</th>
                    <th class="p-2">Role</th>
                    <th class="p-2 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>`;
  if (usersList.length === 0) {
    html += `<tr><td colspan="5" class="text-center p-3 text-muted">Belum ada akun di tabel Users.</td></tr>`;
  } else {
    usersList.forEach((u, idx) => {
      let uName = u.username || u.name || '-';
      let uNik  = u.nik || '-';
      let uRole = u.role || 'Warga';
      html += `
        <tr>
          <td class="p-2 text-center text-muted">${idx + 1}</td>
          <td class="p-2 font-bold">${uName}</td>
          <td class="p-2 font-mono">${uNik}</td>
          <td class="p-2"><span class="badge ${uRole.toUpperCase()==='RT'?'bg-primary':'bg-secondary'}">${uRole}</span></td>
          <td class="p-2 text-center">
            <button onclick="bukaModalEditUser('${uName}', '${uNik}', '${uRole}')" class="btn btn-sm btn-outline-primary text-[10px] py-0 px-2 fw-bold me-1" title="Edit Akun"><i class="bi bi-pencil-square me-1"></i>Edit</button>
            <button onclick="resetPasswordUser('${uName}')" class="btn btn-sm btn-outline-warning text-[10px] py-0 px-2 fw-bold me-1" title="Reset Password"><i class="bi bi-key me-1"></i>Reset Pass</button>
            <button onclick="hapusUserAkun('${uName}')" class="btn btn-sm btn-outline-danger text-[10px] py-0 px-2 fw-bold" title="Hapus Akun"><i class="bi bi-trash"></i></button>
          </td>
        </tr>`;
    });
  }
  html += `
                </tbody>
              </table>
            </div>
          </div>
          <div id="tab-content-sesi" class="setting-tab-panel d-none">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h5 class="fw-bold text-primary mb-1"><i class="bi bi-shield-lock-fill me-2"></i>Daftar Sesi Login Aktif Warga</h5>
                <p class="text-xs text-muted mb-0">Manajemen sesi terpusat di database. Jika warga pindah atau dicabut aksesnya, klik <b>Putuskan Sesi</b> untuk membekukan akunnya secara seketika.</p>
              </div>
              <button onclick="renderPengaturanRTView()" class="btn btn-sm btn-outline-primary fw-bold text-xs"><i class="bi bi-arrow-clockwise me-1"></i>Refresh Sesi</button>
            </div>
            <div class="table-responsive border rounded-3 bg-white">
              <table class="table table-hover text-xs mb-0 align-middle">
                <thead class="table-light text-uppercase">
                  <tr>
                    <th class="p-2 text-center">No</th>
                    <th class="p-2 text-center">Status</th>
                    <th class="p-2">NIK / Username</th>
                    <th class="p-2">Role</th>
                    <th class="p-2">Waktu Login</th>
                    <th class="p-2">Token Sesi</th>
                    <th class="p-2 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>`;
  if (sessionsList.length === 0) {
    html += `<tr><td colspan="7" class="text-center p-4 text-muted">Belum ada sesi login aktif terverifikasi di database.</td></tr>`;
  } else {
    sessionsList.forEach((s, idx) => {
      let sNik = s.nik || s.NIK || '-';
      let sRole = s.role || s.ROLE || 'Warga';
      let sTime = s.createdat || s.CREATEDAT || s.created_at || '-';
      let sToken = s.token || s.TOKEN || '';
      let sTokenShort = sToken ? (sToken.substring(0, 16) + '...') : '-';
      html += `
        <tr>
          <td class="p-2 text-center text-muted">${idx + 1}</td>
          <td class="p-2 text-center"><span class="badge bg-success-subtle text-success border border-success fw-bold">AKTIF</span></td>
          <td class="p-2 font-bold font-mono">${sNik}</td>
          <td class="p-2"><span class="badge ${sRole.toUpperCase()==='RT'?'bg-primary':'bg-secondary'}">${sRole}</span></td>
          <td class="p-2 text-muted">${sTime}</td>
          <td class="p-2 font-mono text-[10px] text-gray-500">${sTokenShort}</td>
          <td class="p-2 text-center">
            <button onclick="hapusSesiLogin('${sToken}')" class="btn btn-sm btn-outline-danger text-[10px] py-1 px-2.5 fw-bold" title="Putuskan Sesi">
              <i class="bi bi-person-x-fill me-1"></i>Putuskan Sesi
            </button>
          </td>
        </tr>`;
    });
  }
  html += `
                </tbody>
              </table>
            </div>
          </div>
          <div id="tab-content-info" class="setting-tab-panel d-none">
            <h5 class="fw-bold text-primary mb-3"><i class="bi bi-megaphone me-2"></i>Pengumuman & Running Text Dashboard</h5>
            <form onsubmit="simpanPengumumanWarga(event)">
              <div class="mb-3">
                <label class="form-label font-semibold text-xs text-gray-700">TEKS PENGUMUMAN UNTUK WARGA</label>
                <textarea id="set-info-warga" rows="5" class="form-control" placeholder="Tuliskan pengumuman penting yang akan tampil di dashboard warga...">${appSettings.info_warga || ''}</textarea>
              </div>
              <button type="submit" class="btn btn-primary fw-bold px-4 py-2"><i class="bi bi-check-circle me-1"></i>Simpan Pengumuman</button>
            </form>
          </div>
        </div>
      </div>
    </div>`;
  document.getElementById('main-content').innerHTML = html;
  setTimeout(function() {
    initTtdSignaturePad('canvas-ttd-sekretaris', 'sekretaris');
    initTtdSignaturePad('canvas-ttd-ketua', 'ketua');
  }, 100);
}
document.addEventListener("DOMContentLoaded", function() {
  try {
    let fastLogo = localStorage.getItem('cached_app_logo');
    if (fastLogo) {
      document.querySelectorAll('.app-logo-img').forEach(img => { img.src = fastLogo; });
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
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('PWA SW terdaftar!', reg))
      .catch(err => console.log('PWA SW gagal:', err));
  });
}
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
console.log("%cMAU NGAPAIN LU? 🤨", "color:#ef4444;font-size:38px;font-weight:900;padding:10px;");
console.log("%cMending bayar iuran RT 5 daripada ngintipin console 🤣", "color:#2563eb;font-size:14px;font-weight:bold;");
