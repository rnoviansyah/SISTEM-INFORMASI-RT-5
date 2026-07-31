// Variable Global Core App
let session = { token: '', role: '', nik: '', nama: '', alamat: '', noHp: '' };
const noWaAdmin = '628973366667';
let currentActiveMenu = '';
let currentHeaders = [];
let currentRows = [];
let editingId = null;
let bootstrapModalInstance = null;
let bootstrapImageModalInstance = null;
let bootstrapNotifModalInstance = null;
let rawNotifData = [];
let notifTimer = null;

// ==========================================================
// ==== GLOBAL CACHE STORAGE (PENGEMBALIAN DATA INSTAN) =====
// ==========================================================
window.appCache = {};

function clearAppCache() {
  window.appCache = {};
  console.log("🧹 Seluruh cache aplikasi telah dibersihkan.");
}

// ==========================================================
// ==== URL DEPLOY GOOGLE APPS SCRIPT (WEB APP API) =========
// ==========================================================
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbx_nxI_rIrqk6XUZtaSs6-vQkgCjuCTX42HGOFO2aGqZPjzyrCaR8Ah1xyYzTLOaCjQ/exec'; 

// Helper Konversi URL Google Drive ke Direct Image LH3
function convertToImageLink(url) {
  if (!url) return "";
  if (url.includes("drive.google.com") || url.includes("googleusercontent")) {
    var idMatch = url.match(/[-\w]{25,}/);
    if (idMatch) {
      return "https://lh3.googleusercontent.com/d/" + idMatch[0];
    }
  }
  return url;
}

// --- HELPER FETCH POST ---
async function callGASPost(actionName, extraPayload = {}) {
  try {
    const response = await fetch(GAS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: actionName,
        token: session.token,
        ...extraPayload
      })
    });
    return await response.json();
  } catch (err) {
    console.error('Fetch Error (POST):', err);
    return { status: 'error', message: 'Gagal terhubung ke server RT: ' + err.message };
  }
}

// --- HELPER FETCH GET (SISTEM CACHE OTOMATIS) ---
async function callGASGet(actionName, params = {}, forceRefresh = false) {
  let cacheKey = actionName;
  if (params.sheetName) cacheKey += '_' + params.sheetName;

  if (!forceRefresh && window.appCache && window.appCache[cacheKey]) {
    console.log(`⚡ [Cache Hit] Memuat ${cacheKey} secara instan dari memori!`);
    return window.appCache[cacheKey];
  }

  try {
    let query = `?action=${actionName}&token=${encodeURIComponent(session.token)}`;
    for (let key in params) {
      query += `&${key}=${encodeURIComponent(params[key])}`;
    }
    console.log(`📡 [Fetch Network] Mengambil ${cacheKey} dari Google Apps Script...`);
    const response = await fetch(GAS_API_URL + query, { method: 'GET' });
    const data = await response.json();

    if (data && (data.status === 'success' || data.headers || Array.isArray(data.rows))) {
      if (!window.appCache) window.appCache = {};
      window.appCache[cacheKey] = data;
    }

    return data;
  } catch (err) {
    console.error('Fetch Error (GET):', err);
    return { status: 'error', message: 'Gagal memuat data server: ' + err.message };
  }
}

// --- FUNGSI PRELOADER BACKGROUND (DIAM-DIAM TARIK DATA PAS LOGIN) ---
function preloadDataBackground() {
  if (!session.token) return;
  console.log("🚀 Memulai background preload data untuk semua menu...");

  callGASGet('getIuranData');
  callGASGet('getTableData', { sheetName: 'Warga' });
  callGASGet('getTableData', { sheetName: 'Pengaduan' });
  callGASGet('getTableData', { sheetName: 'Aset' });
  callGASGet('getTableData', { sheetName: 'Keuangan' });
  callGASGet('getTableData', { sheetName: 'SuratPengantar' });
  callGASGet('getTableData', { sheetName: 'Sumbangan' });
}

// --- FUNGSI AUTHENTICATION & SESSION ---
async function doLogin() {
  try {
    var u = document.getElementById('username').value;
    var p = document.getElementById('password').value;
    
    if(!u || !p) {
      document.getElementById('login-msg').innerHTML = "Isi username dan password dulu bro!";
      return;
    }
    
    document.getElementById('login-msg').innerHTML = "Memeriksa ke database...";
    
    const res = await callGASPost('processLogin', { username: u, password: p });

    if(res && res.status === 'success') {
      var roleClean = res.role.toString().trim().toLowerCase();
      session.token = res.token || '';
      session.role = (roleClean === 'rt') ? 'RT' : 'Warga';
      session.nik = res.nik ? res.nik.toString().trim() : '';
      session.nama = res.nama ? res.nama.toString().trim() : '';
      session.alamat = res.alamat ? res.alamat.toString().trim() : '';
      session.noHp = res.noHp ? res.noHp.toString().trim() : '';

      localStorage.setItem('rt_user_session', JSON.stringify(session));
      applySessionUI();
    } else {
      document.getElementById('login-msg').innerHTML = res ? res.message : 'Login gagal!';
    }
  } catch (error) {
    alert("Browser JS Error: " + error.message);
  }
}

function applySessionUI() {
  document.getElementById('login-container').style.display = 'none';
  document.getElementById('app-container').style.display = 'block';
  
  document.getElementById('mob-header').classList.add('show-nav');
  document.getElementById('mob-nav').classList.add('show-nav');

  if(session.role === 'Warga') {
    document.querySelectorAll('.rt-only').forEach(el => el.style.display = 'none');
  } else {
    document.querySelectorAll('.rt-only').forEach(el => el.style.display = 'block');
  }
  
  loadMenu('Dashboard');
  fetchNotifikasi();
  preloadDataBackground();

  if (notifTimer) clearInterval(notifTimer);
  notifTimer = setInterval(function() {
    fetchNotifikasi();
  }, 10000);
}

function doLogout() {
  if (confirm('Apakah lu yakin ingin logout?')) {
    if (notifTimer) clearInterval(notifTimer);
    
    document.getElementById('mob-header').classList.remove('show-nav');
    document.getElementById('mob-nav').classList.remove('show-nav');

    clearAppCache();
    localStorage.removeItem('rt_user_session');
    location.reload();
  }
}

function checkExistingSession() {
  let savedSession = localStorage.getItem('rt_user_session');
  if (savedSession) {
    try {
      session = JSON.parse(savedSession);
      if (session && session.role) {
        applySessionUI();
      }
    } catch(e) {
      localStorage.removeItem('rt_user_session');
    }
  }
}

// --- FUNGSI NOTIFIKASI ---
async function fetchNotifikasi() {
  if (!session.token) return;
  const res = await callGASGet('getNotifications');
  
  if(res && res.status === 'success') {
    rawNotifData = res.data || [];
    
    let savedTimestamps = JSON.parse(localStorage.getItem('rt_notif_times_' + session.nik) || '{}');
    let now = new Date();

    rawNotifData.forEach(item => {
      let rawTime = savedTimestamps[item.id];
      let notifDate = rawTime ? new Date(rawTime) : null;

      if (!notifDate || isNaN(notifDate.getTime())) {
        notifDate = new Date();
        savedTimestamps[item.id] = notifDate.toISOString();
      }

      let isHariIni = notifDate.toDateString() === now.toDateString();
      let jamStr = notifDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':') + ' WIB';

      if (isHariIni) {
        item.waktuTampil = jamStr;
      } else {
        let tglStr = notifDate.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
        item.waktuTampil = tglStr + ' ' + jamStr;
      }
    });

    localStorage.setItem('rt_notif_times_' + session.nik, JSON.stringify(savedTimestamps));

    let badges = document.querySelectorAll('.notif-badge');
    let readCount = parseInt(localStorage.getItem('rt_notif_read_count_' + session.nik) || '0');
    
    if (rawNotifData.length < readCount) {
      readCount = 0;
      localStorage.setItem('rt_notif_read_count_' + session.nik, '0');
    }

    let unreadCount = rawNotifData.length - readCount;

    badges.forEach(badge => {
      if (unreadCount > 0) {
        badge.innerText = unreadCount;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
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
    let notifTerbaru = rawNotifData;

    notifTerbaru.forEach(item => {
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

  let badges = document.querySelectorAll('.notif-badge');
  badges.forEach(badge => {
    badge.style.display = 'none';
    badge.innerText = '0';
  });
  
  localStorage.setItem('rt_notif_read_count_' + session.nik, rawNotifData.length);

  if(!bootstrapNotifModalInstance) {
    bootstrapNotifModalInstance = new bootstrap.Modal(document.getElementById('notifModal'));
  }
  bootstrapNotifModalInstance.show();
}

function bukaNotifTarget(menuName) {
  if(bootstrapNotifModalInstance) bootstrapNotifModalInstance.hide();
  loadMenu(menuName);
}

function syncActiveNav(menu) {
  document.querySelectorAll('.sidebar a').forEach(el => el.classList.remove('active-menu'));
  var dEl = document.getElementById('dmenu-' + menu);
  if(dEl) dEl.classList.add('active-menu');
  
  document.querySelectorAll('.bottom-nav-item').forEach(el => el.classList.remove('active'));
  var mEl = document.getElementById('mmenu-' + menu);
  if(mEl) mEl.classList.add('active');
}

// --- FUNGSI NAVIGASI MENU ---
async function loadMenu(menu) {
  currentActiveMenu = menu;
  syncActiveNav(menu);
  document.getElementById('page-title').innerText = menu === 'Dashboard' ? 'Dashboard Utama' : (menu === 'Profil' ? 'Profil Saya' : menu);
  document.getElementById('rek-info').style.display = (menu === 'Sumbangan') ? 'block' : 'none';
  if (document.getElementById('searchInput')) document.getElementById('searchInput').value = "";

  switch(menu) {
    case 'Dashboard': if(typeof loadDashboardView === 'function') loadDashboardView(); return;
    case 'Profil': if(typeof loadProfilView === 'function') loadProfilView(); return;
    case 'Warga': if(typeof loadWargaView === 'function') { loadWargaView(); return; } break;
    case 'Kelahiran': if(typeof loadKelahiranView === 'function') { loadKelahiranView(); return; } break;
    case 'Kematian': if(typeof loadKematianView === 'function') { loadKematianView(); return; } break;
    case 'PindahMasuk': if(typeof loadPindahMasukView === 'function') { loadPindahMasukView(); return; } break;
    case 'PindahKeluar': if(typeof loadPindahKeluarView === 'function') { loadPindahKeluarView(); return; } break;
  }

  let isCached = window.appCache && window.appCache['getTableData_' + menu];
  if (!isCached) {
    document.getElementById('main-content').innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><br><small class="text-muted mt-2 d-block">Memuat data...</small></div>';
  }

  const res = await callGASGet('getTableData', { sheetName: menu });
  if (res) {
    currentHeaders = res.headers || [];
    currentRows = res.rows || [];
    renderTable(res, menu);
  }
}

function renderTable(data, menu) {
  let html = '';
  
  let bolehTambah = false;
  if (session.role === 'RT') bolehTambah = true; 
  if (session.role === 'Warga' && ['Pengaduan', 'SuratPengantar', 'Sumbangan', 'Aset'].includes(menu)) bolehTambah = true;
  
  if (bolehTambah) {
    let labelTombol = session.role === 'RT' ? '+ Tambah Data Baru' : '+ Buat Pengajuan / Form Baru';
    if (menu === 'Aset') {
      labelTombol = session.role === 'RT' ? '+ Tambah Data Barang Baru' : '+ Buat Form Peminjaman Aset Baru';
    }
    html += `<button class="btn btn-success fw-bold mb-3 shadow-sm px-3 py-2" onclick="bukaModalForm()"><i class="bi bi-plus-circle me-2"></i>${labelTombol}</button>`;
  }

  if(!data || !data.rows || data.rows.length === 0) {
    html += '<div class="alert alert-light border text-muted mt-2"><i class="bi bi-folder-x me-2"></i>Belum ada baris data di dalam sheet ini.</div>';
    document.getElementById('main-content').innerHTML = html;
    return;
  }

  html += '<div class="card card-custom"><div class="table-responsive"><table class="table table-hover align-middle mb-0" id="dataTable">';
  html += '<thead class="table-light"><tr>';
  data.headers.forEach(h => html += `<th class="py-3 text-secondary" style="font-size: 0.85rem; letter-spacing: 0.5px;">${h.toUpperCase()}</th>`);
  html += '<th class="py-3 text-secondary text-center" style="font-size: 0.85rem;">AKSI</th></tr></thead><tbody>';

  let reversedRows = [...data.rows].reverse();
  reversedRows.forEach(row => {
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
  var directUrl = convertToImageLink(urlImg);
  document.getElementById('modalPreviewImg').src = directUrl;
  if(!bootstrapImageModalInstance) {
    bootstrapImageModalInstance = new bootstrap.Modal(document.getElementById('imageModal'));
  }
  bootstrapImageModalInstance.show();
}

function bukaModalForm() {
  editingId = null;
  document.getElementById('formModalTitle').innerText = "Form Input Menu: " + currentActiveMenu;
  document.getElementById('btn-hapus-modal').style.display = 'none';
  generateFormInputs(null);
  
  if(!bootstrapModalInstance) {
    bootstrapModalInstance = new bootstrap.Modal(document.getElementById('formModal'));
  }
  bootstrapModalInstance.show();
}

function bukaModalEdit(id) {
  editingId = id;
  document.getElementById('formModalTitle').innerText = "Edit / Ubah Status Data: " + currentActiveMenu;
  
  if (session.role === 'RT') {
    document.getElementById('btn-hapus-modal').style.display = 'inline-block';
  } else {
    document.getElementById('btn-hapus-modal').style.display = 'none';
  }
  
  let rowData = currentRows.find(r => r[0] === id);
  generateFormInputs(rowData);
  
  if(!bootstrapModalInstance) {
    bootstrapModalInstance = new bootstrap.Modal(document.getElementById('formModal'));
  }
  bootstrapModalInstance.show();
}

function generateFormInputs(rowData) {
  let formBody = document.getElementById('dynamicForm');
  formBody.innerHTML = '';
  
  currentHeaders.forEach((h, idx) => {
    if(['id', 'no', 'saldo'].includes(h.toLowerCase())) return;
    
    let nameLower = h.toLowerCase().trim();
    
    if (currentActiveMenu === 'Aset') {
      if (session.role === 'Warga') {
        if (!['nama_barang', 'id_barang', 'jumlah', 'nama_peminjam', 'nama'].includes(nameLower)) return;
      }
    }
    
    let labelText = h.replace('_', ' ').toUpperCase();
    if (currentActiveMenu === 'Aset' && (nameLower === 'nama_barang' || nameLower === 'id_barang')) {
      labelText = 'ID BARANG';
    }
    if (currentActiveMenu === 'Aset' && (nameLower === 'nama_peminjam' || nameLower === 'nama')) {
      labelText = 'NAMA PEMINJAM';
    }
    
    let val = rowData ? rowData[idx] : "";
    let inputHtml = '';
    
    if (nameLower === 'status' || nameLower.includes('penyelesaian') || nameLower.includes('penyelsaian') || nameLower.includes('admin')) {
      if (session.role !== 'RT' || !rowData) return;
    }
    
    if (session.role === 'Warga' && !rowData) {
      if (nameLower === 'nik') val = session.nik;
      if (nameLower === 'nama' || nameLower === 'nama_lengkap' || nameLower === 'nama_peminjam') val = session.nama;
      if (nameLower.includes('alamat')) val = session.alamat;
      if (nameLower === 'no_hp' || nameLower === 'hp' || nameLower === 'telp' || nameLower === 'wa') val = session.noHp;
    }
    
    if (val && (nameLower === 'tanggal' || nameLower === 'tanggal_lahir' || nameLower.includes('tanggal')) && val.includes('/')) {
      var parts = val.split('/');
      if (parts.length === 3) {
        val = parts[2] + '-' + parts[1] + '-' + parts[0];
      }
    }
    
    if (nameLower === 'status' && currentActiveMenu === 'Aset') {
      inputHtml = `
        <select class="form-select dynamic-input" data-key="${h}">
          <option value="Belum diverifikasi" ${val === 'Belum diverifikasi' || val === 'Belum di verifikasi' || !val ? 'selected' : ''}>Belum diverifikasi</option>
          <option value="Diterima" ${val === 'Diterima' ? 'selected' : ''}>Diterima</option>
          <option value="Ditolak" ${val === 'Ditolak' ? 'selected' : ''}>Ditolak</option>
          <option value="Diterima sebagian" ${val === 'Diterima sebagian' ? 'selected' : ''}>Diterima sebagian</option>
        </select>`;
    } else if (nameLower === 'status' && (currentActiveMenu === 'Pengaduan' || currentActiveMenu === 'SuratPengantar' || currentActiveMenu === 'Sumbangan')) {
      inputHtml = `
        <select class="form-select dynamic-input" data-key="${h}">
          <option value="Belum di verifikasi" ${val === 'Belum di verifikasi' ? 'selected' : ''}>Belum di verifikasi</option>
          <option value="Sedang ditindak lanjuti" ${val === 'Sedang ditindak lanjuti' ? 'selected' : ''}>Sedang ditindak lanjuti</option>
          <option value="selesai" ${val === 'selesai' ? 'selected' : ''}>selesai</option>
          <option value="di tolak" ${val === 'di tolak' ? 'selected' : ''}>di tolak</option>
          <option value="diterima" ${val === 'diterima' ? 'selected' : ''}>diterima</option>
        </select>`;
    } else if (nameLower === 'jenis_aduan' || (currentActiveMenu === 'Pengaduan' && nameLower.includes('jenis'))) {
      inputHtml = `
        <select class="form-select dynamic-input" data-key="${h}">
          <option value="">-- Pilih Jenis Aduan --</option>
          <option value="KEAMANAN" ${val.toUpperCase() === 'KEAMANAN' ? 'selected' : ''}>KEAMANAN</option>
          <option value="KEBERSIHAN" ${val.toUpperCase() === 'KEBERSIHAN' ? 'selected' : ''}>KEBERSIHAN</option>
          <option value="LAMPU JALAN" ${val.toUpperCase() === 'LAMPU JALAN' ? 'selected' : ''}>LAMPU JALAN</option>
          <option value="JALANAN" ${val.toUpperCase() === 'JALANAN' ? 'selected' : ''}>JALANAN</option>
          <option value="LAINNYA" ${val.toUpperCase() === 'LAINNYA' ? 'selected' : ''}>LAINNYA</option>
        </select>`;
    } else if (nameLower === 'tanggal' || nameLower === 'tanggal_lahir' || nameLower.includes('tanggal')) {
      inputHtml = `<input type="date" class="form-control dynamic-input" data-key="${h}" value="${val}">`;
    } else if (nameLower === 'jenis_kelamin') {
      inputHtml = `
        <select class="form-select dynamic-input" data-key="${h}">
          <option value="">-- Pilih Jenis Kelamin --</option>
          <option value="LAKI-LAKI" ${val.toUpperCase() === 'LAKI-LAKI' || val.toUpperCase() === 'LAKI LAKI' ? 'selected' : ''}>LAKI-LAKI</option>
          <option value="PEREMPUAN" ${val.toUpperCase() === 'PEREMPUAN' ? 'selected' : ''}>PEREMPUAN</option>
        </select>`;
    } else if (nameLower === 'status_nikah' || (nameLower === 'status' && currentActiveMenu === 'Warga')) {
      inputHtml = `
        <select class="form-select dynamic-input" data-key="${h}">
          <option value="">-- Pilih Status Nikah --</option>
          <option value="MENIKAH" ${val.toUpperCase() === 'MENIKAH' ? 'selected' : ''}>MENIKAH</option>
          <option value="BELUM MENIKAH" ${val.toUpperCase() === 'BELUM MENIKAH' || val.toUpperCase() === 'BELUM' ? 'selected' : ''}>BELUM MENIKAH</option>
        </select>`;
    } else if (nameLower === 'status_tinggal' || nameLower === 'status_pindah') {
      inputHtml = `
        <select class="form-select dynamic-input" data-key="${h}">
          <option value="">-- Pilih Status Tinggal --</option>
          <option value="TETAP" ${val.toUpperCase() === 'TETAP' ? 'selected' : ''}>TETAP</option>
          <option value="KONTRAK" ${val.toUpperCase() === 'KONTRAK' ? 'selected' : ''}>KONTRAK</option>
        </select>`;
    } else if (nameLower.includes('foto') || nameLower.includes('bukti')) {
      let imgDirect = convertToImageLink(val);
      inputHtml = `
        ${val && !val.includes('***') ? `<div class="mb-1"><small class="text-muted">File saat ini:</small><br><img src="${imgDirect}" class="img-table mb-2" onclick="bukaPopUpFoto('${val}')"></div>` : ''}
        <input type="file" class="form-control dynamic-file-input" data-key="${h}" accept="image/*">`;
    } else {
      let isReadonly = '';
      if (session.role === 'Warga') {
        if (nameLower === 'nik' || nameLower.includes('alamat')) {
          isReadonly = 'readonly style="background-color: #f1f5f9; cursor: not-allowed;"';
        } else if (nameLower.includes('nama') || nameLower === 'nama_peminjam') {
          if (currentActiveMenu !== 'Sumbangan') {
            isReadonly = 'readonly style="background-color: #f1f5f9; cursor: not-allowed;"';
          }
        }
      }
      
      inputHtml = `<input type="text" class="form-control dynamic-input" data-key="${h}" value="${val}" placeholder="Masukkan ${labelText.toLowerCase()}..." ${isReadonly}>`;
    }

    formBody.innerHTML += `
      <div class="mb-3">
        <label class="form-label font-weight-bold small text-secondary">${labelText}</label>
        ${inputHtml}
      </div>`;
  });
}

// --- FUNGSI SUBMIT FORM & HAPUS DATA ---
function submitFormBaru() {
  let inputs = document.querySelectorAll('.dynamic-input');
  let fileInputs = document.querySelectorAll('.dynamic-file-input');
  let payload = {};
  
  inputs.forEach(inp => {
    payload[inp.getAttribute('data-key')] = inp.value;
  });
  
  document.getElementById('dynamicForm').innerHTML = '<div class="text-center p-4"><div class="spinner-border text-primary mb-2"></div><br><b>Sedang memproses data ke database...</b></div>';
  
  let filePromises = [];
  fileInputs.forEach(fileInp => {
    let key = fileInp.getAttribute('data-key');
    let file = fileInp.files[0];
    if (file) {
      let p = new Promise((resolve, reject) => {
        let reader = new FileReader();
        reader.onload = function(e) {
          payload[key] = {
            base64: e.target.result,
            name: file.name,
            type: file.type
          };
          resolve();
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      filePromises.push(p);
    }
  });
  
  Promise.all(filePromises).then(async () => {
    if (editingId) {
      const res = await callGASPost('updateDataDiSheet', {
        sheetName: currentActiveMenu,
        id: editingId,
        formData: payload
      });
      
      if(res && res.status === 'success') {
        bootstrapModalInstance.hide();
        alert(res.message);
        clearAppCache();
        loadMenu(currentActiveMenu);
        fetchNotifikasi();
      } else {
        alert('Gagal memperbarui: ' + (res ? res.message : 'Error'));
        loadMenu(currentActiveMenu);
      }
    } else {
      const res = await callGASPost('simpanDataKeSheet', {
        sheetName: currentActiveMenu,
        formData: payload
      });

      if(res && res.status === 'success') {
        bootstrapModalInstance.hide();
        alert('Data Berhasil Disimpan!');
        
        if(session.role === 'Warga') {
          if(currentActiveMenu === 'Pengaduan' && typeof waKirimLaporan === 'function') waKirimLaporan('aduan', res.id);
          if(currentActiveMenu === 'SuratPengantar' && typeof waKirimLaporan === 'function') waKirimLaporan('surat', res.id);
          if(currentActiveMenu === 'Sumbangan' && typeof waVerifikasiSumbangan === 'function') waVerifikasiSumbangan(res.id);
          if(currentActiveMenu === 'Aset' && typeof waPinjamAset === 'function') waPinjamAset(res.id);
        }
        clearAppCache();
        loadMenu(currentActiveMenu);
        fetchNotifikasi();
      } else {
        alert('Gagal menyimpan: ' + (res ? res.message : 'Error'));
        loadMenu(currentActiveMenu);
      }
    }
  }).catch(err => {
    alert('Gagal membaca file foto: ' + err.message);
    loadMenu(currentActiveMenu);
  });
}

async function hapusDataAktif() {
  if(!editingId) return;
  if(confirm('Apakah lu yakin ingin menghapus data ini secara permanen dari database Google Sheets?')) {
    document.getElementById('dynamicForm').innerHTML = '<div class="text-center p-4"><b class="text-danger">Sedang menghapus data dari server...</b></div>';
    
    const res = await callGASPost('hapusDataDariSheet', {
      sheetName: currentActiveMenu,
      id: editingId
    });

    if(res && res.status === 'success') {
      bootstrapModalInstance.hide();
      alert('Data Berhasil Dihapus!');
      clearAppCache();
      loadMenu(currentActiveMenu);
      fetchNotifikasi();
    } else {
      alert('Gagal menghapus: ' + (res ? res.message : 'Error'));
      loadMenu(currentActiveMenu);
    }
  }
}

function getTombolAksi(menu, row, headers) {
  let id = row[0];
  
  let lowerHeaders = headers.map(h => h.toLowerCase().trim());
  let noHpIdx = lowerHeaders.findIndex(h => h.includes('hp') || h.includes('wa') || h.includes('telp') || h.includes('nomor'));
  let noHpWarga = noHpIdx > -1 ? row[noHpIdx] : '';

  if (session.role === 'RT') {
    let btn = `<button class="btn btn-sm btn-outline-primary m-1 fw-bold" onclick="bukaModalEdit('${id}')">Edit/Status</button>`;
    if (menu === 'Pengaduan' || menu === 'SuratPengantar') {
       btn += `<button class="btn btn-sm btn-success m-1 fw-bold" onclick="waKirimLaporanKeWarga('${id}', '${noHpWarga}')"><i class="bi bi-whatsapp me-1"></i>Kirim Laporan</button>`;
    }
    return btn;
  }
  if (session.role === 'Warga') {
    if (menu === 'Pengaduan') return `<button class="btn btn-sm btn-success fw-bold" onclick="waKirimLaporan('aduan', '${id}')"><i class="bi bi-whatsapp me-1"></i>WA Lapor</button>`;
    if (menu === 'SuratPengantar') return `<button class="btn btn-sm btn-success fw-bold" onclick="waKirimLaporan('surat', '${id}')"><i class="bi bi-whatsapp me-1"></i>WA Pengantar</button>`;
    if (menu === 'Keuangan') return `<button class="btn btn-sm btn-danger fw-bold" onclick="waLaporMasalahKeuangan('${id}')">Laporkan Masalah</button>`;
    if (menu === 'Sumbangan') return `<button class="btn btn-sm btn-success fw-bold" onclick="waVerifikasiSumbangan('${id}')"><i class="bi bi-whatsapp me-1"></i>WA Verifikasi</button>`;
    if (menu === 'Aset') return `<button class="btn btn-sm btn-info text-white fw-bold" onclick="waPinjamAset('${id}')">Pinjam (WA)</button>`;
  }
  return '-';
}

function bukaWa(nomor, text) {
  window.open(`https://wa.me/${nomor}?text=${encodeURIComponent(text)}`, '_blank');
}

function filterTable() {
  let input = document.getElementById("searchInput").value.toUpperCase().trim();
  
  let tr = document.querySelectorAll("#dataTable tbody tr");
  tr.forEach(row => {
    let text = row.innerText.toUpperCase();
    row.style.display = text.includes(input) ? "" : "none";
  });

  let quickItems = document.querySelectorAll(".quick-action-item");
  quickItems.forEach(item => {
    let menuText = item.innerText.toUpperCase();
    item.style.display = menuText.includes(input) ? "flex" : "none";
  });
}

document.addEventListener("DOMContentLoaded", function() {
  checkExistingSession();

  window.copySingleRek = function(nomor) {
    navigator.clipboard.writeText(nomor).then(() => {
      alert("Nomor rekening " + nomor + " berhasil disalin ke clipboard!");
    }).catch(err => {
      alert("Gagal menyalin otomatis: " + err);
    });
  }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const baseUrl = window.location.href.split('?')[0];
    const swUrl = baseUrl + '?pwa=sw';

    navigator.serviceWorker.register(swUrl)
      .then(reg => console.log('PWA Service Worker terdaftar!', reg))
      .catch(err => console.log('PWA SW gagal:', err));
  });
}

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btnInstall = document.getElementById('btn-install-pwa');
  if (btnInstall) {
    btnInstall.style.display = 'block';
  }
});

function installPWA() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User menginstall PWA RT');
      }
      deferredPrompt = null;
    });
  }
}
