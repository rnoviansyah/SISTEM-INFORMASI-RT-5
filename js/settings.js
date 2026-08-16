// ============================================================
// settings.js
// Pengaturan aplikasi & panel RT (tema, identitas, user, sesi, database)
// Dipisah dari app.js (refactor modul). Classic script — berbagi global
// scope dengan file JS lain. URUTAN LOAD di index.html WAJIB dijaga.
// ============================================================

// appSettings & loadAppSettings dipindah ke js/config/app_config.js
// (refactor modul) agar tersedia untuk semua modul sejak awal.

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
    if (typeof applyFavicon === 'function') applyFavicon(appSettings.app_logo);
  }
  applyTheme(appSettings.app_theme || 'blue', appSettings.app_theme_color);
  renderHeaderRekeningInfo();
  updateDynamicManifest();
}

// loadAppSettings dipindah ke js/config/app_config.js (refactor modul).

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

function handleLogoFileUpload(event) {
  let file = event.target.files[0];
  if (!file) return;
  // Validasi isi file via magic bytes (v3.38) — PDF/doc yang di-rename jadi .jpg TIDAK lolos
  if (typeof isValidImageFile === 'function') {
    isValidImageFile(file).then(function(ok) {
      if (!ok) {
        event.target.value = '';
        if (typeof showUIToast === 'function') showUIToast('File logo harus berupa gambar (JPG/PNG/WebP/GIF) — PDF/doc tidak diizinkan.', 'danger');
        return;
      }
      prosesFileLogoUpload(file);
    });
    return;
  }
  prosesFileLogoUpload(file);
}

function prosesFileLogoUpload(file) {
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
      if (typeof applyFavicon === 'function') applyFavicon(compressedBase64);
      try { localStorage.setItem('cached_app_logo', compressedBase64); } catch(err) {}
      if (typeof showUIToast === 'function') {
        showUIToast('Logo baru terpilih! Klik "Simpan Identitas & Tema" di bawah.', 'info');
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function handleQrisPhotoUpload(event) {
  let file = event.target.files[0];
  if (!file) return;
  // Validasi isi file via magic bytes (v3.38) — PDF/doc yang di-rename jadi .jpg TIDAK lolos
  if (typeof isValidImageFile === 'function') {
    isValidImageFile(file).then(function(ok) {
      if (!ok) {
        event.target.value = '';
        if (typeof showUIToast === 'function') showUIToast('File foto QRIS harus berupa gambar (JPG/PNG/WebP/GIF) — PDF/doc tidak diizinkan.', 'danger');
        return;
      }
      prosesFileQrisPhotoUpload(file);
    });
    return;
  }
  prosesFileQrisPhotoUpload(file);
}

function prosesFileQrisPhotoUpload(file) {
  let reader = new FileReader();
  reader.onload = function(e) {
    let img = new Image();
    img.onload = function() {
      let canvas = document.createElement('canvas');
      let maxDim = 600;
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
      // JPEG 85% agar ukuran base64 di DB tetap ringan
      let compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
      let inputUrl = document.getElementById('set-payment-qris');
      let previewImg = document.getElementById('preview-qris-photo');
      let hapusBtn = document.getElementById('btn-hapus-qris-photo');
      let hintEl = document.getElementById('qris-photo-hint');
      if (inputUrl) inputUrl.value = compressedBase64;
      if (previewImg) {
        previewImg.src = compressedBase64;
        previewImg.classList.remove('d-none');
      }
      if (hapusBtn) hapusBtn.classList.remove('d-none');
      if (hintEl) hintEl.classList.remove('d-none');
      if (typeof showUIToast === 'function') {
        showUIToast('Foto QRIS cadangan terpilih! Klik "Simpan Rekening & QRIS" di bawah.', 'info');
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function hapusFotoQris() {
  let inputUrl = document.getElementById('set-payment-qris');
  let previewImg = document.getElementById('preview-qris-photo');
  let hapusBtn = document.getElementById('btn-hapus-qris-photo');
  let hintEl = document.getElementById('qris-photo-hint');
  let fileInp = document.getElementById('file-qris-photo');
  if (inputUrl) inputUrl.value = '';
  if (previewImg) {
    previewImg.removeAttribute('src');
    previewImg.classList.add('d-none');
  }
  if (hapusBtn) hapusBtn.classList.add('d-none');
  if (hintEl) hintEl.classList.add('d-none');
  if (fileInp) fileInp.value = '';
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
  if (e) e.preventDefault();
  try {
    let titleEl = document.getElementById('set-app-title');
    let title = titleEl ? titleEl.value.trim() : (appSettings.app_title || 'SISTEM INFORMASI RT 5');
    
    let shortNameEl = document.getElementById('set-app-short-name');
    let shortName = shortNameEl ? shortNameEl.value.trim() : (appSettings.app_short_name || title.substring(0, 12));
    
    let subtitleEl = document.getElementById('set-app-subtitle');
    let subtitle = subtitleEl ? subtitleEl.value.trim() : (appSettings.app_subtitle || '');
    
    let logoEl = document.getElementById('set-app-logo');
    let logo = logoEl ? logoEl.value.trim() : (appSettings.app_logo || './img/logo.webp');
    
    let themeEl = document.getElementById('set-app-theme');
    let theme = themeEl ? themeEl.value.trim() : (appSettings.app_theme || 'blue');
    
    let themeColorEl = document.getElementById('set-app-theme-color');
    let themeColor = themeColorEl ? themeColorEl.value.trim() : (appSettings.app_theme_color || '#1e3a8a');
    
    let waNumberEl = document.getElementById('set-rt-wa-number');
    let waNumber = waNumberEl ? waNumberEl.value.trim() : '';
    if (waNumber.startsWith('0')) {
      waNumber = '62' + waNumber.substring(1);
    } else if (waNumber.startsWith('+62')) {
      waNumber = waNumber.substring(1);
    }

    let rtRwText = document.getElementById('set-rt-rw-text') ? document.getElementById('set-rt-rw-text').value.trim() : (appSettings.rt_rw_text || 'RT 05 / RW 01');
    let namaKelurahan = document.getElementById('set-nama-kelurahan') ? document.getElementById('set-nama-kelurahan').value.trim() : (appSettings.nama_kelurahan || '');
    let alamatRt = document.getElementById('set-alamat-rt') ? document.getElementById('set-alamat-rt').value.trim() : (appSettings.alamat_rt || '');
    let namaSekretaris = document.getElementById('set-nama-sekretaris') ? document.getElementById('set-nama-sekretaris').value.trim() : (appSettings.nama_sekretaris || '');
    let namaRtKetua = document.getElementById('set-nama-rt-ketua') ? document.getElementById('set-nama-rt-ketua').value.trim() : (appSettings.nama_rt_ketua || '');
    let ttdSekretaris = document.getElementById('set-ttd-sekretaris') ? document.getElementById('set-ttd-sekretaris').value.trim() : (appSettings.ttd_sekretaris || '');
    let ttdKetuaRt = document.getElementById('set-ttd-ketua-rt') ? document.getElementById('set-ttd-ketua-rt').value.trim() : (appSettings.ttd_ketua_rt || '');

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
      { kunci: 'ttd_ketua_rt', nilai: ttdKetuaRt }
    ];

    appSettings.app_title = title;
    appSettings.app_short_name = shortName;
    appSettings.app_subtitle = subtitle;
    appSettings.rt_rw_text = rtRwText;
    appSettings.nama_kelurahan = namaKelurahan;
    appSettings.alamat_rt = alamatRt;
    appSettings.app_logo = logo;
    appSettings.app_theme = theme;
    appSettings.app_theme_color = themeColor;
    appSettings.rt_wa_number = waNumber;
    appSettings.nama_sekretaris = namaSekretaris;
    appSettings.nama_rt_ketua = namaRtKetua;
    appSettings.ttd_sekretaris = ttdSekretaris;
    appSettings.ttd_ketua_rt = ttdKetuaRt;

    try {
      localStorage.setItem('rt_app_settings_cache', JSON.stringify(appSettings));
    } catch(e) {}

    const res = await callRpcPost('simpanPengaturanApp', { settingsArray });
    if (res && res.status === 'success') {
      showUIToast('Identitas, Tema & Pengaturan PWA berhasil diperbarui!', 'success');
      await loadAppSettings();
    } else {
      showUIToast('Gagal menyimpan: ' + (res ? res.message : 'Error'), 'danger');
    }
  } catch (err) {
    console.error('Error in simpanIdentitasDanTema:', err);
    showUIToast('Terjadi kesalahan saat menyimpan pengaturan: ' + err.message, 'danger');
  }
}

function handleTtdFileUpload(e, targetType) {
  let file = e.target.files[0];
  if (!file) return;
  // Validasi isi file via magic bytes (v3.38) — PDF/doc yang di-rename jadi .jpg TIDAK lolos
  if (typeof isValidImageFile === 'function') {
    isValidImageFile(file).then(function(ok) {
      if (!ok) {
        e.target.value = '';
        if (typeof showUIToast === 'function') showUIToast('File tanda tangan harus berupa gambar (JPG/PNG/WebP/GIF) — PDF/doc tidak diizinkan.', 'danger');
        return;
      }
      prosesFileTtdUpload(file, targetType);
    });
    return;
  }
  prosesFileTtdUpload(file, targetType);
}

function prosesFileTtdUpload(file, targetType) {
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
          height = maxHeight;
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
  if (e) e.preventDefault();
  try {
    let qrisString = document.getElementById('set-payment-qris-string') ? document.getElementById('set-payment-qris-string').value.trim() : '';
    let qrisUrl    = document.getElementById('set-payment-qris') ? document.getElementById('set-payment-qris').value.trim() : '';
    let rekList = [];
    document.querySelectorAll('.row-rek-item').forEach(row => {
      let bEl = row.querySelector('.inp-rek-bank');
      let nEl = row.querySelector('.inp-rek-no');
      let aEl = row.querySelector('.inp-rek-an');
      let b = bEl ? bEl.value.trim() : '';
      let n = nEl ? nEl.value.trim() : '';
      let a = aEl ? aEl.value.trim() : '';
      if (b && n) rekList.push({ bank: b, no: n, an: a });
    });
    let settingsArray = [
      { kunci: 'payment_qris_string', nilai: qrisString },
      { kunci: 'payment_qris', nilai: qrisUrl },
      { kunci: 'payment_rekening', nilai: JSON.stringify(rekList) }
    ];
    const res = await callRpcPost('simpanPengaturanApp', { settingsArray });
    if (res && res.status === 'success') {
      showUIToast('Rekening & Pengaturan QRIS Dinamis berhasil disimpan!', 'success');
      await loadAppSettings();
    } else {
      showUIToast('Gagal menyimpan: ' + (res ? res.message : 'Error'), 'danger');
    }
  } catch (err) {
    console.error('Error in simpanRekeningDanQRIS:', err);
    showUIToast('Terjadi kesalahan saat menyimpan rekening: ' + err.message, 'danger');
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
  const res = await callRpcPost('tambahUserWarga', { userObj });
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
  const res = await callRpcPost('resetPasswordUser', { username: username, newPassword: newPass.trim() });
  if (res && res.status === 'success') {
    alert(`Password untuk '${username}' berhasil diubah!`);
  } else {
    alert('Gagal reset password: ' + (res ? res.message : 'Error'));
  }
}

async function hapusUserAkun(username) {
  if (!username) return;
  showUIConfirm(`Apakah Anda yakin ingin menghapus akun user '${username}' secara permanen dari database?`, async function() {
    const res = await callRpcPost('hapusUserAkun', { username: username });
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
  const res = await callRpcPost('editUserAkun', payload);
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
  const res = await callRpcPost('simpanInfoWarga', { teksBaru: teks });
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

// ============================================================
// DATABASE SETTINGS: EXCEL EXPORT & SECURE CLEANUP
// ============================================================

function formatRowsForExcelExport(dataList, opts) {
  return dataList.map((row, idx) => {
    let item = { 'NO': idx + 1 };
    for (let k in row) {
      let val = row[k] !== null && row[k] !== undefined ? row[k] : '';
      let kUpper = k.toUpperCase();
      let kLower = k.toLowerCase();

      if (kLower.includes('foto') || kLower.includes('bukti') || kLower.includes('gambar')) {
        if (opts && opts.fotoValue) {
          item[kUpper] = opts.fotoValue(k, String(val));
        } else if (String(val).startsWith('data:image')) {
          item[kUpper] = '[FOTO BASE64 LOCAL]';
        } else {
          item[kUpper] = val;
        }
      } else {
        item[kUpper] = val;
      }
    }
    return item;
  });
}

async function buildMasterWorkbook(opts) {
  try {
    const tables = [
      'Warga', 'Iuran', 'Keuangan', 'Pengaduan', 
      'SuratPengantar', 'Sumbangan', 'Aset', 'Peminjaman', 'Aspirasi'
    ];

    let workbook = XLSX.utils.book_new();
    let hasData = false;

    showUIToast('Sedang menyiapkan rekap seluruh database...', 'info');

    for (let tableName of tables) {
      let rowsToExport = [];

      if (tableName === 'Keuangan') {
        const [kasRes, iuranRes, sumbRes] = await Promise.all([
          safeSupabaseSelect('Keuangan'),
          safeSupabaseSelect('Iuran'),
          safeSupabaseSelect('Sumbangan')
        ]);

        let mergedKas = [];

        const cleanPhotoVal = (url) => {
          let str = String(url || '').trim();
          if (opts && opts.fotoValue) return opts.fotoValue('BUKTI_FOTO', str);
          if (str.startsWith('data:image')) return '[FOTO BASE64 LAMA]';
          return str || '-';
        };

        (kasRes.data || []).forEach(r => {
          mergedKas.push({
            TANGGAL: r.tanggal || r.created_at || '-',
            JENIS: (r.pemasukan || 0) > 0 ? 'Pemasukan (Kas Manual)' : 'Pengeluaran (Kas Manual)',
            KETERANGAN: r.keterangan || '-',
            PEMASUKAN: r.pemasukan || 0,
            PENGELUARAN: r.pengeluaran || 0,
            BUKTI_FOTO: cleanPhotoVal(r.foto_url)
          });
        });

        (iuranRes.data || []).forEach(r => {
          let st = (r.status || '').toLowerCase();
          if (st.includes('lunas') || st.includes('verified') || st.includes('acc')) {
            mergedKas.push({
              TANGGAL: r.tanggal_bayar || r.created_at || '-',
              JENIS: 'Pemasukan (Iuran Warga)',
              KETERANGAN: `Iuran ${r.bulan || ''} ${r.tahun || ''} - ${r.nama || 'Warga'}`,
              PEMASUKAN: r.nominal || 0,
              PENGELUARAN: 0,
              BUKTI_FOTO: cleanPhotoVal(r.bukti_transfer || r.foto_url)
            });
          }
        });

        (sumbRes.data || []).forEach(r => {
          let st = (r.status || '').toLowerCase();
          if (st.includes('diterima') || st.includes('lunas') || st.includes('verified') || st.includes('selesai')) {
            mergedKas.push({
              TANGGAL: r.tanggal || r.created_at || '-',
              JENIS: 'Pemasukan (Sumbangan Warga)',
              KETERANGAN: `Sumbangan ${r.jenis_sumbangan || ''} - ${r.nama || 'Warga'} (${r.keterangan || ''})`,
              PEMASUKAN: r.nominal || 0,
              PENGELUARAN: 0,
              BUKTI_FOTO: cleanPhotoVal(r.bukti_transfer || r.foto_url)
            });
          }
        });

        rowsToExport = mergedKas.map((item, idx) => ({ 'NO': idx + 1, ...item }));
      } else {
        let { data } = await safeSupabaseSelect(tableName);
        if (data && data.length > 0) {
          rowsToExport = formatRowsForExcelExport(data, opts);
        }
      }

      if (rowsToExport.length > 0) {
        hasData = true;
        let worksheet = XLSX.utils.json_to_sheet(rowsToExport);
        let sheetName = tableName.substring(0, 30);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      }
    }

    if (!hasData) return null;
    return workbook;
  } catch (err) {
    console.error(err);
    return null;
  }
}

async function exportAllTablesToExcel(btnElement) {
  if (btnElement) setBtnLoading(btnElement, true, 'Mengambil Semua Data...');
  try {
    showUIToast('Sedang menyiapkan rekap seluruh database...', 'info');
    const workbook = await buildMasterWorkbook();
    if (!workbook) { showUIToast('Gagal Export: Semua tabel masih kosong!', 'danger'); return; }
    let todayStr = new Date().toISOString().split('T')[0];
    let fileName = `MASTER_REKAP_DATABASE_RT5_${todayStr}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    showUIToast('Berhasil mendownload Master Rekap Database!', 'success');
  } catch (err) {
    console.error(err);
    showUIToast('Gagal Export Master: ' + err.message, 'danger');
  } finally {
    if (btnElement) setBtnLoading(btnElement, false);
  }
}
window.exportAllTablesToExcel = exportAllTablesToExcel;

// Backup lengkap: 1 file ZIP berisi Excel (semua tabel) + semua file foto asli.
// Menjawab masalah: backup xlsx lama hanya berisi LINK foto -> kalau storage penuh &
// foto dihapus, link mati. ZIP ini menyimpan file fotonya sendiri (fetch URL publik / base64).
async function backupLengkapZip(btnElement) {
  if (btnElement) setBtnLoading(btnElement, true, 'Menyiapkan Backup...');
  try {
    if (typeof JSZip === 'undefined') { showUIToast('Library ZIP belum termuat. Muat ulang halaman.', 'danger'); return; }
    showUIToast('Mengumpulkan data & foto dari server...', 'info');
    const todayStr = new Date().toISOString().split('T')[0];
    const zip = new JSZip();
    const root = zip.folder('BACKUP_RT5_' + todayStr);
    const fotoDir = root.folder('foto');
    const urlToZipPath = {};
    const tables = ['Warga','Iuran','Keuangan','Pengaduan','SuratPengantar','Sumbangan','Aset','Peminjaman','Aspirasi'];
    const isFotoKolom = function(k) {
      const c = String(k).toLowerCase();
      return c.indexOf('foto') > -1 || c.indexOf('bukti') > -1 || c.indexOf('gambar') > -1 || c.indexOf('ttd') > -1;
    };
    let totalFoto = 0, gagal = 0, antrian = [];
    for (const tableName of tables) {
      const { data } = await safeSupabaseSelect(tableName);
      if (!data || data.length === 0) continue;
      const tableDir = fotoDir.folder(tableName);
      data.forEach(function(row, rIdx) {
        const idRaw = String(row.id || row.no || (tableName + '_' + (rIdx + 1)));
        const safeId = idRaw.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 40);
        for (const col in row) {
          const val = row[col];
          if (!val || !isFotoKolom(col)) continue;
          const sv = String(val);
          const m = sv.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
          if (m) {
            const ext = (m[1].split('/')[1] || 'jpg').replace('jpeg', 'jpg');
            const zipName = safeId + '_' + col + '.' + ext;
            tableDir.file(zipName, m[2], { base64: true });
            urlToZipPath[sv.trim()] = 'foto/' + tableName + '/' + zipName;
            totalFoto++;
          } else if (sv.indexOf('http') === 0 || sv.indexOf('://') > -1) {
            const zipName = safeId + '_' + col + '.jpg';
            antrian.push({ url: sv, dir: tableDir, name: zipName });
            urlToZipPath[sv.trim()] = 'foto/' + tableName + '/' + zipName;
          }
        }
      });
    }
    for (let i = 0; i < antrian.length; i++) {
      const it = antrian[i];
      if (btnElement && i % 10 === 0) setBtnLoading(btnElement, true, 'Mengunduh foto ' + i + '/' + antrian.length + '...');
      try {
        const res = await fetch(it.url, { mode: 'cors' });
        if (res.ok) {
          const blob = await res.blob();
          it.dir.file(it.name, blob);
          totalFoto++;
        } else { gagal++; }
      } catch (e) { gagal++; }
    }
    // Bangun Excel: kolom foto diisi PATH relatif ke folder foto/ di dalam ZIP (bukan URL online)
    const workbook = await buildMasterWorkbook({
      fotoValue: function(colName, val) {
        const key = String(val == null ? '' : val).trim();
        return urlToZipPath[key] || String(val == null ? '' : val);
      }
    });
    if (!workbook) { showUIToast('Gagal Backup: Semua tabel masih kosong!', 'danger'); return; }
    const xlsxArray = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    root.file('MASTER_REKAP_DATABASE_RT5_' + todayStr + '.xlsx', xlsxArray);
    root.file('README.txt', 'BACKUP LENGKAP SISTEM INFORMASI RT 5\n' +
      '====================================\n' +
      '- MASTER_REKAP_DATABASE_RT5_' + todayStr + '.xlsx : rekap semua tabel (Excel)\n' +
      '- foto/ : folder berisi file foto asli per tabel\n\n' +
      'Kolom FOTO/BUKTI di Excel berisi PATH relatif ke folder foto/ di dalam ZIP\n' +
      'ini (mis. foto/Pengaduan/PEN-123_foto.jpg). Setelah ZIP di-extract, buka\n' +
      'folder foto/ untuk melihat gambarnya. Backup ini mandiri dan tidak\n' +
      'bergantung pada link storage online.\n');
    if (btnElement) setBtnLoading(btnElement, true, 'Mengompres ZIP...');
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'BACKUP_LENGKAP_RT5_' + todayStr + '.zip';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function() { URL.revokeObjectURL(link.href); }, 5000);
    let msg = 'Backup selesai! ' + totalFoto + ' foto tersimpan dalam ZIP.';
    if (gagal > 0) msg += ' (' + gagal + ' foto gagal diunduh — path tetap tercatat di Excel, file tidak ada di ZIP).';
    showUIToast(msg, 'success');
  } catch (err) {
    console.error(err);
    showUIToast('Gagal Backup: ' + err.message, 'danger');
  } finally {
    if (btnElement) setBtnLoading(btnElement, false);
  }
}
window.backupLengkapZip = backupLengkapZip;

async function processCustomExport(btn) {
  let selectedOption = document.getElementById('exportMenuSelect')?.value;
  if (!selectedOption) return showUIToast('Pilih menu yang mau direkap!', 'danger');

  if (selectedOption === 'ALL') {
    return exportAllTablesToExcel(btn);
  } else if (selectedOption === 'Keuangan') {
    if (btn) setBtnLoading(btn, true, 'Mengunduh Kas Lengkap...');
    try {
      const [kasRes, iuranRes, sumbRes] = await Promise.all([
        safeSupabaseSelect('Keuangan'),
        safeSupabaseSelect('Iuran'),
        safeSupabaseSelect('Sumbangan')
      ]);

      let mergedKas = [];

      const cleanPhotoVal = (url) => {
        let str = String(url || '').trim();
        if (str.startsWith('data:image')) return '[FOTO BASE64 LAMA]';
        return str || '-';
      };

      (kasRes.data || []).forEach(r => {
        mergedKas.push({
          TANGGAL: r.tanggal || r.created_at || '-',
          JENIS: (r.pemasukan || 0) > 0 ? 'Pemasukan (Kas Manual)' : 'Pengeluaran (Kas Manual)',
          KETERANGAN: r.keterangan || '-',
          PEMASUKAN: r.pemasukan || 0,
          PENGELUARAN: r.pengeluaran || 0,
          BUKTI_FOTO: cleanPhotoVal(r.foto_url)
        });
      });

      (iuranRes.data || []).forEach(r => {
        let st = (r.status || '').toLowerCase();
        if (st.includes('lunas') || st.includes('verified') || st.includes('acc')) {
          mergedKas.push({
            TANGGAL: r.tanggal_bayar || r.created_at || '-',
            JENIS: 'Pemasukan (Iuran Warga)',
            KETERANGAN: `Iuran ${r.bulan || ''} ${r.tahun || ''} - ${r.nama || 'Warga'}`,
            PEMASUKAN: r.nominal || 0,
            PENGELUARAN: 0,
            BUKTI_FOTO: cleanPhotoVal(r.bukti_transfer || r.foto_url)
          });
        }
      });

      (sumbRes.data || []).forEach(r => {
        let st = (r.status || '').toLowerCase();
        if (st.includes('diterima') || st.includes('lunas') || st.includes('verified') || st.includes('selesai')) {
          mergedKas.push({
            TANGGAL: r.tanggal || r.created_at || '-',
            JENIS: 'Pemasukan (Sumbangan Warga)',
            KETERANGAN: `Sumbangan ${r.jenis_sumbangan || ''} - ${r.nama || 'Warga'} (${r.keterangan || ''})`,
            PEMASUKAN: r.nominal || 0,
            PENGELUARAN: 0,
            BUKTI_FOTO: cleanPhotoVal(r.bukti_transfer || r.foto_url)
          });
        }
      });

      if (mergedKas.length === 0) {
        if (btn) setBtnLoading(btn, false);
        return showUIToast('Laporan Keuangan Kas masih kosong!', 'danger');
      }

      let cleanRows = mergedKas.map((item, idx) => ({ 'NO': idx + 1, ...item }));
      let worksheet = XLSX.utils.json_to_sheet(cleanRows);
      let workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'KeuanganKasLengkap');
      XLSX.writeFile(workbook, `REKAP_KEUANGAN_KAS_LENGKAP_RT5.xlsx`);

      showUIToast('Berhasil mendownload Laporan Keuangan Kas Lengkap!', 'success');
    } catch (err) {
      showUIToast('Gagal Export Kas: ' + err.message, 'danger');
    } finally {
      if (btn) setBtnLoading(btn, false);
    }
  } else {
    if (btn) setBtnLoading(btn, true, 'Mengunduh...');
    try {
      let { data } = await safeSupabaseSelect(selectedOption);
      if (!data || data.length === 0) {
        if (btn) setBtnLoading(btn, false);
        return showUIToast(`Tabel ${selectedOption} masih kosong!`, 'danger');
      }

      let cleanRows = formatRowsForExcelExport(data);
      let worksheet = XLSX.utils.json_to_sheet(cleanRows);
      let workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, selectedOption);
      XLSX.writeFile(workbook, `REKAP_${selectedOption.toUpperCase()}_RT5.xlsx`);
      
      showUIToast(`Berhasil mendownload Rekap ${selectedOption}!`, 'success');
    } catch (err) {
      showUIToast('Gagal Export: ' + err.message, 'danger');
    } finally {
      if (btn) setBtnLoading(btn, false);
    }
  }
}
window.processCustomExport = processCustomExport;

function showPasswordConfirmModal(targetLabel, onConfirmed) {
  let modalEl = document.getElementById('passwordConfirmModal');
  
  if (!modalEl) {
    let div = document.createElement('div');
    div.innerHTML = `
      <div class="modal fade" id="passwordConfirmModal" tabindex="-1" aria-hidden="true" style="z-index: 1096;">
        <div class="modal-dialog modal-dialog-centered modal-sm">
          <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
            <div class="modal-body text-center p-4">
              <div class="rounded-circle bg-danger-subtle text-danger mx-auto mb-3 d-flex align-items-center justify-content-center" style="width: 56px; height: 56px;">
                <i class="bi bi-shield-lock-fill fs-2"></i>
              </div>
              <h6 class="fw-bold text-gray-800 mb-1">Verifikasi Keamanan RT</h6>
              <p class="text-xs text-muted mb-3">Anda akan menghapus permanen isi <b id="pwdModalTargetText" class="text-danger"></b>. Masukkan password akun RT Anda untuk melanjutkan:</p>
              
              <div class="mb-3 text-start">
                <input type="password" id="inputPassConfirm" class="form-control form-control-sm rounded-3 text-center" placeholder="Masukkan Password Akun Anda..." autocomplete="off">
              </div>

              <div class="d-flex gap-2 justify-content-center">
                <button type="button" class="btn btn-sm btn-light font-bold px-3 py-2 w-50 rounded-2" data-bs-dismiss="modal">Batal</button>
                <button type="button" class="btn btn-sm btn-danger font-bold px-3 py-2 w-50 rounded-2" id="btnSubmitPassConfirm">Konfirmasi & Hapus</button>
              </div>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(div.firstElementChild);
    modalEl = document.getElementById('passwordConfirmModal');
  }

  document.getElementById('pwdModalTargetText').innerText = targetLabel;
  let passInput = document.getElementById('inputPassConfirm');
  passInput.value = '';

  let bsModal = new bootstrap.Modal(modalEl);
  let btnSubmit = document.getElementById('btnSubmitPassConfirm');

  let newBtnSubmit = btnSubmit.cloneNode(true);
  btnSubmit.parentNode.replaceChild(newBtnSubmit, btnSubmit);

  newBtnSubmit.addEventListener('click', function() {
    let pwdVal = passInput.value;
    if (!pwdVal || pwdVal.trim() === '') {
      return showUIToast('Masukkan password Anda terlebih dahulu!', 'danger');
    }
    bsModal.hide();
    if (typeof onConfirmed === 'function') onConfirmed(pwdVal);
  });

  bsModal.show();
  setTimeout(() => passInput.focus(), 400);
}
window.showPasswordConfirmModal = showPasswordConfirmModal;

async function bersihkanFileStorageYatim(btn) {
  showPasswordConfirmModal('File Storage Tidak Terpakai', async (inputPassword) => {
    if (btn) setBtnLoading(btn, true, 'Memindai Storage...');
    try {
      let userToken = (session && session.token) ? String(session.token).trim() : String(session.nik || '').trim();
      const { data, error } = await db.rpc('cleanup_orphan_storage_secured', {
        p_token: userToken,
        p_password: String(inputPassword).trim()
      });
      if (error) {
        showUIToast('Gagal: ' + error.message, 'danger');
      } else if (data && data.status === 'success') {
        // Fase 2: request hapus sudah diantrekan — polling hasilnya sampai tuntas
        const reqId = data.request_id;
        const orphanCount = data.orphans || 0;
        if (reqId) {
          if (btn) setBtnLoading(btn, true, 'Memverifikasi Hasil Hapus...');
          let hasil = null;
          for (let i = 0; i < 12; i++) {
            await new Promise(r => setTimeout(r, 1200));
            try {
              const r2 = await db.rpc('storage_get_delete_result', { p_request_id: reqId });
              if (r2.error) { hasil = { status: 'error', message: r2.error.message }; break; }
              if (r2.data && r2.data.status === 'success') { hasil = r2.data; break; }
              if (r2.data && r2.data.status === 'error') { hasil = r2.data; break; }
            } catch (e) { hasil = { status: 'error', message: e.message }; break; }
          }
          if (hasil && hasil.status === 'success') {
            showUIToast('Storage: ' + orphanCount + ' file yatim berhasil dihapus.', 'success');
          } else if (hasil && hasil.status === 'error') {
            showUIToast('Storage: gagal hapus — ' + (hasil.message || 'error tidak diketahui'), 'warning');
          } else {
            showUIToast('Storage: perintah hapus dikirim, hasil belum terkonfirmasi. Cek bucket di Supabase.', 'warning');
          }
        } else {
          showUIToast(data.message, 'success');
        }
      } else {
        showUIToast(data ? data.message : 'Password salah atau gagal memproses.', 'danger');
      }
    } catch (err) {
      showUIToast('Terjadi kesalahan: ' + err.message, 'danger');
    } finally {
      if (btn) setBtnLoading(btn, false);
    }
  });
}
window.bersihkanFileStorageYatim = bersihkanFileStorageYatim;

async function processDatabaseCleanup(btn) {
  let targetTable = document.getElementById('cleanupMenuSelect')?.value;
  if (!targetTable) return showUIToast('Pilih tabel yang ingin dibersihkan!', 'danger');

  let lockedTables = ['Warga', 'Users', 'Sessions', 'Pengaturan'];
  if (lockedTables.includes(targetTable)) {
    return showUIConfirm(`PROTEKSI SECURITY: Tabel ${targetTable} adalah data vital dan KETAT DILINDUNGI!`, null, 'Akses Ditolak');
  }

  let labelText = targetTable === 'ALL_OPTIONAL' ? 'SEMUA TABEL TRANSAKSI' : `Tabel ${targetTable}`;

  showPasswordConfirmModal(labelText, async (inputPassword) => {
    if (btn) setBtnLoading(btn, true, 'Memproses Pembersihan...');

    try {
      let userToken = (session && session.token) ? String(session.token).trim() : String(session.nik || '').trim();

      // Kumpulkan path foto di storage dari tabel yang akan dibersihkan (biar file ikut terhapus)
      const tabelTarget = targetTable === 'ALL_OPTIONAL'
        ? ['Iuran','Bansos','Pengaduan','SuratPengantar','Sumbangan','Aset','Aspirasi','Keuangan','Kelahiran','Kematian','PindahMasuk','PindahKeluar','Peminjaman']
        : [targetTable];
      let pathsToDelete = [];
      for (const tb of tabelTarget) {
        const { data: rowsTb } = await safeSupabaseSelect(tb);
        if (!rowsTb || rowsTb.length === 0) continue;
        for (const row of rowsTb) {
          if (!row || typeof row !== 'object') continue;
          for (const k in row) {
            const v = row[k];
            if (!v) continue;
            const kl = String(k).toLowerCase();
            if (kl.indexOf('foto') === -1 && kl.indexOf('bukti') === -1 && kl.indexOf('gambar') === -1 && kl.indexOf('ttd') === -1) continue;
            const p = (typeof extractStoragePathFromUrl === 'function') ? extractStoragePathFromUrl(String(v)) : null;
            if (p && pathsToDelete.indexOf(p) === -1) pathsToDelete.push(p);
          }
        }
      }

      const { data, error } = await db.rpc('cleanup_database_secured', {
        p_token: userToken,
        p_password: String(inputPassword).trim(),
        p_table_name: targetTable
      });

      if (error) {
        showUIToast('Gagal: ' + error.message, 'danger');
      } else if (data && data.status === 'success') {
        showUIToast(data.message, 'success');
        if (pathsToDelete.length > 0) {
          try {
            const resFile = await db.rpc('delete_storage_files_secured', {
              p_token: userToken,
              p_password: String(inputPassword).trim(),
              p_paths: pathsToDelete
            });
            if (resFile && resFile.data && resFile.data.status === 'success') {
              showUIToast(resFile.data.message, 'success');
            } else if (resFile && resFile.data && resFile.data.status === 'error') {
              showUIToast('Storage: ' + resFile.data.message, 'warning');
            }
          } catch (errFile) {
            showUIToast('Gagal hapus file storage: ' + errFile.message, 'warning');
          }
        } else {
          showUIToast('Storage: 0 file foto terkait data yang dibersihkan.', 'warning');
        }
        if (typeof loadMenu === 'function' && currentActiveMenu) loadMenu(currentActiveMenu);
      } else {
        showUIToast(data ? data.message : 'Password salah atau gagal memproses.', 'danger');
      }
    } catch (err) {
      showUIToast('Terjadi kesalahan: ' + err.message, 'danger');
    } finally {
      if (btn) setBtnLoading(btn, false);
    }
  });
}
window.processDatabaseCleanup = processDatabaseCleanup;

async function renderPengaturanRTView() {
  if ((await getValidUserRole()) !== 'RT') return;
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
            <li class="nav-item">
              <button class="nav-link fw-bold text-xs" id="tab-database-btn" onclick="switchSettingTab('database')">
                <i class="bi bi-database-fill-gear me-1"></i> Database & Server
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
                <label class="form-label font-semibold text-xs text-gray-700">NOMOR WHATSAPP DEFAULT LAPORAN RT <small class="text-primary font-bold">(Untuk Laporan Pengaduan, Surat & Sumbangan)</small></label>
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
              <button type="button" onclick="simpanIdentitasDanTema(event)" class="btn btn-primary fw-bold px-4 py-2"><i class="bi bi-check-circle me-1"></i>Simpan Identitas & Tema</button>
            </form>
          </div>
          <div id="tab-content-rekening" class="setting-tab-panel d-none">
            <h5 class="fw-bold text-primary mb-3"><i class="bi bi-wallet2 me-2"></i>Pengaturan QRIS Dinamis & Rekening Pembayaran</h5>
            <form onsubmit="simpanRekeningDanQRIS(event)">
              <div class="mb-3">
                <label class="form-label font-semibold text-xs text-gray-700">BASE PAYLOAD QRIS STATIS RT (Payload Kode QRIS DANA/BRI/NMID)</label>
                <textarea id="set-payment-qris-string" rows="3" class="form-control font-mono text-xs mb-1" placeholder="Contoh: 00020101021126570011ID.DANA.WWW...">${appSettings.payment_qris_string || ''}</textarea>
                <small class="text-muted d-block mb-3">*Sistem akan secara otomatis menyisipkan nominal tagihan (seperti Rp 50.000) secara **DINAMIS** dan mengalkulasi ulang checksum CRC16 QRIS saat warga melakukan pembayaran.<br>Nama merchant, NMID, dan "Dicetak oleh" pada kartu QRIS otomatis mengikuti payload ini — tidak perlu disetel terpisah.</small>
              </div>
              <div class="mb-4">
                <label class="form-label font-semibold text-xs text-gray-700">FOTO QRIS STATIS CADANGAN (OPSIONAL)</label>
                <input type="hidden" id="set-payment-qris" value="${appSettings.payment_qris || ''}">
                <div class="d-flex align-items-center gap-2 flex-wrap">
                  <label class="btn btn-outline-primary btn-sm font-bold mb-0 cursor-pointer">
                    <i class="bi bi-upload me-1"></i> Upload Foto QRIS
                    <input type="file" id="file-qris-photo" accept="image/*" class="d-none" onchange="handleQrisPhotoUpload(event)">
                  </label>
                  <button type="button" id="btn-hapus-qris-photo" class="btn btn-outline-danger btn-sm font-bold mb-0 ${appSettings.payment_qris ? '' : 'd-none'}" onclick="hapusFotoQris()"><i class="bi bi-trash me-1"></i> Hapus Foto</button>
                </div>
                <div class="mb-2 mt-2">
                  <img id="preview-qris-photo" src="${appSettings.payment_qris || ''}" class="rounded border p-1 ${appSettings.payment_qris ? '' : 'd-none'}" style="max-height:120px;" onclick="bukaPopUpFoto(this.src)">
                  <small id="qris-photo-hint" class="d-block text-muted ${appSettings.payment_qris ? '' : 'd-none'}">Klik foto untuk pratinjau</small>
                </div>
                <small class="text-muted d-block">Foto ini hanya dipakai sebagai <b>cadangan</b> bila QRIS dinamis gagal dimuat (mis. layanan QR mati / offline). Tidak wajib diisi.</small>
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
          <div id="tab-content-database" class="setting-tab-panel d-none">
            <div class="d-flex align-items-center justify-content-between mb-3">
              <div>
                <h5 class="fw-bold text-primary mb-1"><i class="bi bi-hdd-network-fill me-2"></i>Backup & Pemeliharaan Database</h5>
                <p class="text-xs text-muted mb-0">Rekap data ke Excel, backup lengkap (data + foto), dan pemeliharaan database.</p>
              </div>
            </div>

            <div class="row g-3">
              <div class="col-md-6">
                <div class="p-3 border rounded-3 bg-light-subtle h-100">
                  <h6 class="fw-bold text-xs text-uppercase text-success mb-2"><i class="bi bi-file-earmark-spreadsheet me-1"></i> Rekap Data ke Excel</h6>
                  <p class="text-xs text-muted mb-3">Pilih data spesifik yang ingin di-download dalam format Microsoft Excel (.xlsx).</p>
                  
                  <div class="mb-3">
                    <label class="form-label text-xs font-bold text-gray-700">Pilih Rekap Menu:</label>
                    <select id="exportMenuSelect" class="form-select form-select-sm rounded-2 text-xs">
                      <option value="ALL">📦 SEMUA TABEL (Master Multi-Sheet Excel)</option>
                      <option value="Keuangan">💰 Laporan Keuangan Kas (Lengkap + Iuran + Sumbangan)</option>
                      <option value="Iuran">💳 Data Iuran Warga</option>
                      <option value="Warga">👥 Data Profil Warga</option>
                      <option value="Pengaduan">📢 Pengaduan & Keluhan</option>
                      <option value="SuratPengantar">📄 Pengajuan Surat Pengantar</option>
                      <option value="Sumbangan">🎁 Data Sumbangan</option>
                      <option value="Aset">📦 Data Inventaris Aset</option>
                      <option value="Aspirasi">💡 Aspirasi Warga</option>
                    </select>
                  </div>

                  <button class="btn btn-sm btn-success w-100 rounded-2 font-bold text-xs py-2 shadow-sm" onclick="processCustomExport(this)">
                    <i class="bi bi-download me-1"></i> Download Rekap Excel
                  </button>

                  <hr class="my-3 text-muted" style="opacity: 0.15;">

                  <button class="btn btn-sm btn-warning w-100 rounded-2 font-bold text-xs py-2 shadow-sm" onclick="backupLengkapZip(this)">
                    <i class="bi bi-file-earmark-zip-fill me-1"></i> Backup Lengkap (Data + Foto) .zip
                  </button>
                  <p class="text-xxs text-muted mt-2 mb-0"><i class="bi bi-info-circle me-1"></i> Unduh satu file ZIP berisi Excel + semua foto asli — backup mandiri walau foto di storage dihapus.</p>
                </div>
              </div>

              <div class="col-md-6">
                <div class="p-3 border rounded-3 bg-danger-subtle border-danger-subtle h-100">
                  <h6 class="fw-bold text-xs text-uppercase text-danger mb-2"><i class="bi bi-trash3-fill me-1"></i> Pembersihan / Reset Database</h6>
                  <p class="text-xs text-muted mb-3">Fungsi pemeliharaan untuk mengosongkan riwayat transaksi lama di server.</p>

                  <div class="mb-3">
                    <label class="form-label text-xs font-bold text-gray-700">Pilih Tabel Yang Ingin Dibersihkan:</label>
                    <select id="cleanupMenuSelect" class="form-select form-select-sm rounded-2 text-xs border-danger">
                      <option value="">-- Pilih Tabel --</option>
                      <option value="ALL_OPTIONAL">⚠️ SEMUA TABEL TRANSAKSI (Kosongkan Riwayat Transaksi)</option>
                      <option value="Keuangan">Keuangan Kas</option>
                      <option value="Iuran">Data Iuran</option>
                      <option value="Pengaduan">Pengaduan Warga</option>
                      <option value="SuratPengantar">Surat Pengantar</option>
                      <option value="Sumbangan">Data Sumbangan</option>
                      <option value="Aset">Data Inventaris Aset</option>
                      <option value="Aspirasi">Aspirasi Warga</option>
                    </select>
                  </div>

                  <button class="btn btn-sm btn-danger w-100 rounded-2 font-bold text-xs py-2 shadow-sm" onclick="processDatabaseCleanup(this)">
                    <i class="bi bi-exclamation-triangle-fill me-1"></i> Bersihkan Tabel Terpilih
                  </button>
                  <button class="btn btn-sm btn-outline-danger w-100 rounded-2 font-bold text-xs py-2 shadow-sm mt-2" onclick="bersihkanFileStorageYatim(this)">
                    <i class="bi bi-brush-fill me-1"></i> Bersihkan File Storage Tidak Terpakai
                  </button>
                  <div class="text-center mt-2">
                    <span class="text-xxs text-muted"><i class="bi bi-shield-lock-fill text-primary"></i> Tabel <b>Warga</b>, <b>Users</b>, & <b>Sessions</b> dikunci otomatis dari UI.</span>
                  </div>
                  <div class="text-center mt-1">
                    <span class="text-xxs text-muted"><i class="bi bi-info-circle me-1"></i>Versi Aplikasi <b>v3.28</b> — jika angka di sini bukan v3.28, tutup dan buka ulang aplikasi.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  document.getElementById('main-content').innerHTML = html;
  setTimeout(function() {
    if (typeof initTtdSignaturePad === 'function') initTtdSignaturePad('canvas-ttd-sekretaris', 'sekretaris');
    if (typeof initTtdSignaturePad === 'function') initTtdSignaturePad('canvas-ttd-ketua', 'ketua');
  }, 100);
}
