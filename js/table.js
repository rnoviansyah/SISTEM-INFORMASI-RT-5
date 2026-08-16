// ============================================================
// table.js
// Dispatcher menu, render tabel & form CRUD dinamis
// Dipisah dari app.js (refactor modul). Classic script — berbagi global
// scope dengan file JS lain. URUTAN LOAD di index.html WAJIB dijaga.
// ============================================================

// Saat RT memverifikasi data yang diajukan warga, isi datanya TIDAK boleh diubah —
// hanya Status (dan kolom tindak lanjut RT seperti foto_penyelesaian /
// keterangan_admin) yang tetap aktif. Kolom di bawah dikunci (disabled) di
// modal Edit saat role RT membuka verifikasi.
const RT_VERIFY_LOCKED_FIELDS = {
  'Pengaduan':      ['nama', 'nik', 'no_hp', 'jenis_aduan', 'keterangan', 'tanggal', 'foto_url'],
  'SuratPengantar': ['nama', 'nik', 'alamat', 'rt', 'jenis_surat', 'keterangan', 'ttd_pemohon'],
  'Sumbangan':      ['nama', 'nik', 'tanggal', 'jenis_sumbangan', 'keterangan', 'nominal', 'bukti_transfer']
};

// Nama tampilan Indonesia per menu — dipakai di judul modal form/edit/verifikasi
// (sebelumnya nama menu mentah seperti "SuratPengantar" tampil apa adanya).
const MENU_DISPLAY_NAMES = {
  'Dashboard': 'Dashboard Utama',
  'Warga': 'Data Warga',
  'Iuran': 'Tagihan Iuran',
  'Keuangan': 'Transaksi Keuangan',
  'Sumbangan': 'Data Sumbangan',
  'Pengaduan': 'Pengaduan Warga',
  'Surat': 'Surat Pengantar',
  'SuratPengantar': 'Surat Pengantar',
  'Aset': 'Aset & Inventaris',
  'Inventaris': 'Aset & Inventaris',
  'Aspirasi': 'Aspirasi',
  'Kelahiran': 'Data Kelahiran',
  'Kematian': 'Data Kematian',
  'PindahMasuk': 'Pindah Masuk',
  'PindahKeluar': 'Pindah Keluar',
  'Bansos': 'Data Bansos',
  'Profil': 'Profil Saya',
  'Pengaturan': 'Pengaturan RT',
  'PengaturanRT': 'Pengaturan RT'
};
function menuDisplayName(menu) { return MENU_DISPLAY_NAMES[menu] || menu; }

async function loadMenu(menu) {
  // Versi FREE: blokir menu premium (modul-nya memang tidak ada di bundle).
  if (typeof isMenuAllowed === 'function' && !isMenuAllowed(menu)) {
    if (typeof showUIToast === 'function') {
      showUIToast('Fitur "' + menu + '" tersedia di versi Premium.', 'error');
    }
    return;
  }
  if (session && session.token) {
    let isSessionValid = await verifySessionToken();
    if (!isSessionValid) return;
  }
  currentActiveMenu = menu;
  syncActiveNav(menu);
  updateMenuBadges();
  document.getElementById('page-title').innerText = menu === 'Dashboard' ? 'Dashboard Utama' : (menu === 'Profil' ? 'Profil Saya' : menu);
  document.getElementById('rek-info').style.display = (menu === 'Sumbangan') ? 'block' : 'none';
  // Kartu Informasi Warga hanya tampil di Dashboard, posisinya di ATAS judul
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
      if ((await getValidUserRole()) === 'RT') {
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
  // Menu generik TableRenderer: pakai pagination SERVER-SIDE (patch v8) — hanya
  // halaman aktif yang diunduh. Bila RPC v8 belum ada, fallback ke alur lama di bawah.
  if (typeof TableRenderer !== 'undefined' && GENERIC_RENDERER_MENUS.indexOf(menu) !== -1) {
    document.getElementById('main-content').innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><br><small class="text-muted mt-2 d-block">Memuat data dari server...</small></div>';
    const usedServer = await loadGenericMenuServer(menu, 1, '');
    if (usedServer) return;
  }

  let cacheKey = menu;
  let cached = menuDataCache[cacheKey];
  let now = Date.now();
  if (cached && (now - cached.timestamp) < MENU_CACHE_TTL) {
    currentHeaders = cached.data.headers || [];
    currentRows    = cached.data.rows    || [];
    renderTable(cached.data, menu);
    callRpcGet('getTableData', { sheetName: menu }).then(res => {
      if (res && res.status === 'success') menuDataCache[cacheKey] = { data: res, timestamp: Date.now() };
    });
    return;
  }
  document.getElementById('main-content').innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><br><small class="text-muted mt-2 d-block">Memuat data dari server...</small></div>';
  const res = await callRpcGet('getTableData', { sheetName: menu });
  if (res && res.status === 'success') {
    currentHeaders = res.headers || [];
    currentRows    = res.rows    || [];
    menuDataCache[cacheKey] = { data: res, timestamp: Date.now() };
    renderTable(res, menu);
  } else {
    document.getElementById('main-content').innerHTML = '<div class="alert alert-danger text-center my-3">Gagal memuat data dari server.</div>';
  }
}

// Menu yang dirender oleh TableRenderer (dipakai mode pagination server-side)
const GENERIC_RENDERER_MENUS = ['Kelahiran','Kematian','PindahMasuk','PindahKeluar','Pengaduan','Sumbangan','Surat','SuratPengantar'];

// PAGINATION SERVER-SIDE: ambil SATU halaman dari RPC get_table_page_secured (patch v8).
// Hanya 25 baris per halaman yang diunduh — hemat bandwidth/memory di HP.
// Bila RPC v8 belum terpasang, RPC mengembalikan 'fallback' -> false -> alur lama dipakai.
async function loadGenericMenuServer(menu, page, search) {
  try {
    const res = await callRpcGet('getTablePage', {
      sheetName: menu,
      page: page || 1,
      pageSize: (typeof Pagination !== 'undefined' && Pagination.PAGE_SIZE) ? Pagination.PAGE_SIZE : 25,
      search: search || ''
    });
    if (!res || res.status !== 'success') return false;
    currentHeaders = res.headers || [];
    currentRows = res.rows || [];
    if (typeof TableRenderer !== 'undefined' && TableRenderer.render) {
      TableRenderer.render(menu, { headers: res.headers, rows: res.rows, total: res.total || res.rows.length }, { server: true, search: search || '' });
    } else {
      renderTable({ headers: res.headers, rows: res.rows }, menu);
    }
    return true;
  } catch (e) {
    return false;
  }
}

async function renderTable(data, menu) {
  // Menu dengan render GENERIK (TableRenderer) — renderXXXCustom duplikat sudah dihapus
  if (GENERIC_RENDERER_MENUS.indexOf(menu) !== -1) {
    if (typeof TableRenderer !== 'undefined' && TableRenderer.render(menu, data)) return;
  }
  if (menu === 'Keuangan' && typeof renderKeuanganCustom === 'function') return renderKeuanganCustom(data);
  if (menu === 'Iuran' && typeof renderIuranCustom === 'function') return renderIuranCustom(data);
  if ((menu === 'Aset' || menu === 'Inventaris') && typeof renderAsetCustom === 'function') return renderAsetCustom(data);
  if (menu === 'Aspirasi' && typeof renderAspirasiView === 'function') return renderAspirasiView(data);
  if (menu === 'Warga' && typeof renderWargaCustom === 'function') return renderWargaCustom(data);

  let currentRole = await getValidUserRole();
  let html = '';
  let bolehTambah = currentRole === 'RT' || (currentRole === 'Warga' && ['Pengaduan','SuratPengantar','Sumbangan','Aset','Peminjaman','Aspirasi'].includes(menu));
  if (bolehTambah) {
    let labelTombol = currentRole === 'RT' ? '+ Tambah Data Baru' : (menu === 'Aspirasi' ? '+ Tulis Aspirasi Anonim' : '+ Buat Pengajuan / Form Baru');
    html += `<button class="btn btn-success fw-bold mb-3 shadow-sm px-3 py-2" onclick="bukaModalForm()"><i class="bi bi-plus-circle me-2"></i>${labelTombol}</button>`;
  }
  if (!data || !data.rows || data.rows.length === 0) {
    html += '<div class="alert alert-light border text-muted mt-2"><i class="bi bi-folder-x me-2"></i>Belum ada data.</div>';
    document.getElementById('main-content').innerHTML = html;
    return;
  }
  // Menu baru dimuat -> mulai dari halaman 1
  if (typeof Pagination !== 'undefined' && _genericPageMenu !== menu) {
    Pagination.reset(menu);
    _genericPageMenu = menu;
  }
  // Pagination: render hanya baris halaman aktif
  const pageRows = (typeof Pagination !== 'undefined' && Pagination.slice)
    ? Pagination.slice(menu, data.rows)
    : data.rows;
  const pageStart = (typeof Pagination !== 'undefined') ? (Pagination.page(menu) - 1) * Pagination.PAGE_SIZE : 0;
  html += '<div class="card card-custom"><div class="table-responsive"><table class="table table-hover align-middle mb-0" id="dataTable">';
  html += '<thead class="table-light"><tr>';
  data.headers.forEach(h => html += `<th class="py-3 text-secondary" style="font-size:0.85rem;">${escHtml(h).toUpperCase()}</th>`);
  html += '<th class="py-3 text-secondary text-center">AKSI</th></tr></thead><tbody>';
  for (const row of pageRows) {
    html += '<tr>';
    row.forEach((val, idx) => {
      let headName = data.headers[idx].toLowerCase();
      if (headName.includes('foto') || headName.includes('bukti')) {
        let directUrl = convertToImageLink(val);
        html += `<td>${val && val !== '***Rahasia***' ? `<img src="${escHtmlAttr(directUrl)}" class="img-table" onclick="bukaPopUpFoto('${escJsStr(val)}')">` : '-'}</td>`;
      } else {
        html += `<td>${escHtml(val)}</td>`;
      }
    });
    let btnAksi = await getTombolAksi(menu, row, data.headers);
    html += `<td class="text-center">${btnAksi}</td></tr>`;
  }
  html += '</tbody></table></div><div id="generic-table-pagination" class="px-2 py-1"></div></div>';
  document.getElementById('main-content').innerHTML = html;
  if (typeof Pagination !== 'undefined' && Pagination.render) {
    Pagination.render(document.getElementById('generic-table-pagination'), menu, data.rows.length, function() { renderTable(data, menu); });
  }
}
let _genericPageMenu = '';

function bukaPopUpFoto(urlImg) {
  document.getElementById('modalPreviewImg').src = convertToImageLink(urlImg);
  if (!bootstrapImageModalInstance) bootstrapImageModalInstance = new bootstrap.Modal(document.getElementById('imageModal'));
  bootstrapImageModalInstance.show();
}

// ============================================================
// PENJAGA: Kartu "Informasi Warga" HANYA tampil di Dashboard.
// Banyak modul menu (pengaduan, bansos, iuran, aset, dll) menimpa
// window.loadMenu dengan wrapper yang merender menu-nya langsung
// TANPA menyembunyikan panel ini. Jadi selain logika di loadMenu(),
// kita pantau perubahan #main-content dan selaraskan visibilitasnya
// agar panel tidak pernah bocor ke menu lain.
// ============================================================
function syncInfoWargaVisibility() {
  const iwAtas = document.getElementById('info-warga-atas');
  if (iwAtas) iwAtas.style.display = (currentActiveMenu === 'Dashboard') ? 'block' : 'none';
}
window.syncInfoWargaVisibility = syncInfoWargaVisibility;
(function initInfoWargaVisibilityGuard() {
  const target = document.getElementById('main-content');
  if (target && typeof MutationObserver !== 'undefined') {
    new MutationObserver(syncInfoWargaVisibility).observe(target, { childList: true, subtree: true });
  }
})();

async function bukaModalForm() {
  editingId = null;
  editingNik = null;
  document.getElementById('formModalTitle').innerText = "Form Input: " + menuDisplayName(currentActiveMenu);
  document.getElementById('btn-hapus-modal').style.display = 'none';
  await generateFormInputs(null);
  if (!bootstrapModalInstance) bootstrapModalInstance = new bootstrap.Modal(document.getElementById('formModal'));
  bootstrapModalInstance.show();
  if (currentActiveMenu === 'SuratPengantar' && typeof initInlineCanvas === 'function') {
    initInlineCanvas('');
  }
}

async function bukaModalEdit(id) {
  editingId = id;
  editingNik = null;
  let currentRole = await getValidUserRole();
  // Saat RT membuka verifikasi (menu dengan kolom terkunci), judul modal
  // menjelaskan bahwa ini proses VERIFIKASI — bukan edit bebas.
  let isVerifyMenu = !!(RT_VERIFY_LOCKED_FIELDS[currentActiveMenu]);
  document.getElementById('formModalTitle').innerText = (currentRole === 'RT' && isVerifyMenu)
    ? "Verifikasi: " + menuDisplayName(currentActiveMenu)
    : "Edit Data: " + menuDisplayName(currentActiveMenu);
  document.getElementById('btn-hapus-modal').style.display = currentRole === 'RT' ? 'inline-block' : 'none';
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
  if (currentActiveMenu === 'SuratPengantar' && typeof initInlineCanvas === 'function') {
    let existingTTD = '';
    if (rowData) {
      if (Array.isArray(rowData)) {
        let hh = (currentHeaders || []).map(h => (h || '').toLowerCase().trim());
        let ttdIdx = hh.findIndex(h => h.includes('ttd_pemohon') || h.includes('tanda_tangan'));
        if (ttdIdx > -1) existingTTD = rowData[ttdIdx] || '';
      } else if (typeof rowData === 'object') {
        existingTTD = rowData.ttd_pemohon || rowData.tanda_tangan || '';
      }
    }
    initInlineCanvas(existingTTD);
  }
}

// Dropdown nama warga untuk form Kematian (RT): pilih warga -> NIK/No. KK/alamat otomatis terisi
async function buildKematianNamaDropdown(currentVal) {
  let escAttr = (s) => String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  let escText = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let opts = '<option value="">-- Pilih Warga (Nama / NIK) --</option>';
  try {
    const [wargaRes, kematianRes] = await Promise.all([
      safeSupabaseSelect('Warga'),
      safeSupabaseSelect('Kematian')
    ]);
    let wargaList = (wargaRes && wargaRes.data) || [];
    let kematianList = (kematianRes && kematianRes.data) || [];
    let recordedNiks = new Set();
    let recordedNames = new Set();
    kematianList.forEach(r => {
      let n = String(cariNilaiKolom(r, ['nik', 'ktp']) || '').replace(/\D/g, '');
      if (n) recordedNiks.add(n);
      let nm = String(cariNilaiKolom(r, ['nama_lengkap', 'nama', 'nama_warga', 'name']) || '').trim().toLowerCase();
      if (nm) recordedNames.add(nm);
    });
    let sorted = [...wargaList].sort((a, b) => {
      let na = String(cariNilaiKolom(a, ['nama_lengkap', 'nama', 'name', 'nama_warga']) || '').toLowerCase();
      let nb = String(cariNilaiKolom(b, ['nama_lengkap', 'nama', 'name', 'nama_warga']) || '').toLowerCase();
      return na.localeCompare(nb, 'id');
    });
    let cur = String(currentVal || '').trim().toLowerCase();
    sorted.forEach(w => {
      let nama = String(cariNilaiKolom(w, ['nama_lengkap', 'nama', 'name', 'nama_warga']) || '').trim();
      if (!nama) return;
      let nik = String(cariNilaiKolom(w, ['nik', 'ktp']) || '').trim();
      let kk = String(cariNilaiKolom(w, ['no_kk', 'kk', 'nomor_kk']) || '').trim();
      let alamat = String(cariNilaiKolom(w, ['alamat', 'alamat_rumah', 'no_rumah']) || '').trim();
      let nikDigits = nik.replace(/\D/g, '');
      if ((nikDigits && recordedNiks.has(nikDigits)) || recordedNames.has(nama.toLowerCase())) return;
      let label = nama + (nik ? ' — NIK ' + nik : '');
      let sel = (cur && cur === nama.toLowerCase()) ? ' selected' : '';
      opts += `<option value="${escAttr(nama)}" data-nik="${escAttr(nik)}" data-kk="${escAttr(kk)}" data-alamat="${escAttr(alamat)}"${sel}>${escText(label)}</option>`;
    });
  } catch (e) {}
  return `<select class="form-select dynamic-input" data-key="nama" onchange="isiOtomatisKematianWarga(this)">
    ${opts}
  </select>
  <small class="text-muted text-[10px] d-block mt-1 font-medium">*Pilih warga dari data terdaftar — NIK, No. KK & alamat otomatis terisi. Warga yang sudah tercatat meninggal tidak muncul.</small>`;
}

async function generateFormInputs(rowData) {
  let formBody = document.getElementById('dynamicForm');
  formBody.innerHTML = '';
  let currentRole = await getValidUserRole();
  // Verifikasi RT: tampilkan catatan bahwa data warga terkunci
  if (rowData && currentRole === 'RT' && RT_VERIFY_LOCKED_FIELDS[currentActiveMenu]) {
    formBody.innerHTML = '<div class="alert alert-warning py-2 px-3 mb-3" style="font-size:11px;font-weight:600;"><i class="bi bi-lock-fill me-1"></i>Data yang diajukan warga terkunci saat verifikasi — hanya <u>Status</u> & tindak lanjut RT yang bisa diubah.</div>';
  }
  if (currentRole === 'Warga' && !rowData && session.nik) {
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

  // FORM WARGA RINGKAS (v3.37): field dikelompokkan dalam <details> collapsible
  // (Data Pribadi / Alamat & Keluarga / Kontak & Foto) agar modal tidak scroll panjang.
  // v3.39: field dikumpulkan DULU per grup, baru dirender. Kolom Warga selang-seling
  // (nama → pribadi, no_kk → keluarga, tempat_lahir → pribadi lagi, dst), jadi cara lama
  // membuat grup berulang ("Data Pribadi" 4x) dengan isi cuma sisa field yang kebetulan
  // berurutan. Kini tiap grup muncul SEKALI dengan semua field-nya, urut tetap:
  // Data Pribadi → Alamat & Keluarga → Kontak & Foto. Grup pertama otomatis terbuka.
  let isWargaForm = currentActiveMenu === 'Warga';
  const wargaGroupOf = (nameLower) => {
    if (nameLower.includes('foto') || nameLower.includes('bukti') || nameLower.includes('gambar')
      || nameLower.includes('hp') || nameLower.includes('wa') || nameLower.includes('telp')
      || nameLower.includes('email')) return 'Kontak & Foto';
    if (nameLower.includes('kk') || nameLower.includes('alamat') || nameLower.includes('rt')
      || nameLower.includes('rw') || nameLower.includes('status_tinggal') || nameLower.includes('status_huni')
      || nameLower.includes('status_keluarga') || nameLower.includes('keluarga')
      || nameLower.includes('kelurahan') || nameLower.includes('kecamatan') || nameLower.includes('kota')) return 'Alamat & Keluarga';
    return 'Data Pribadi';
  };
  const wargaGroupOrder = ['Data Pribadi', 'Alamat & Keluarga', 'Kontak & Foto'];
  let wargaGroupedFields = {}; // label grup -> array HTML field

  for (let idx = 0; idx < headersToUse.length; idx++) {
    let h = headersToUse[idx];
    let nameLower = h.toLowerCase().trim();
    // Kolom sistem (diisi otomatis server): jangan tampilkan sebagai input manual
    if (['id','no','ttd_pemohon','tanda_tangan','created_at','verified_at'].includes(nameLower)) continue;
    // Verifikasi RT: kolom data warga dikunci (disabled) — nilainya tetap terkirim saat submit
    let isVerifyLocked = !!(rowData
      && currentRole === 'RT'
      && RT_VERIFY_LOCKED_FIELDS[currentActiveMenu]
      && RT_VERIFY_LOCKED_FIELDS[currentActiveMenu].indexOf(nameLower) > -1);
    // Warna readonly/locked lewat CSS variable (--locked-bg) agar ikut tema gelap
    // (dulu inline #e2e8f0/#64748b — di dark mode tampil blok terang mencolok).
    let lockAttr = isVerifyLocked ? ' disabled style="background-color:var(--locked-bg,#e2e8f0);color:var(--locked-color,#64748b);cursor:not-allowed;"' : '';
    let labelText = escHtml(h.replace(/_/g, ' ').toUpperCase());
    let val = "";
    if (rowData) {
      if (Array.isArray(rowData)) {
        val = rowData[idx] !== undefined && rowData[idx] !== null ? rowData[idx] : "";
      } else if (typeof rowData === 'object') {
        val = rowData[h] !== undefined && rowData[h] !== null ? rowData[h] : (cariNilaiKolom(rowData, [h]) || "");
      }
    }
    if ((nameLower === 'status' || nameLower.includes('penyelesaian') || nameLower.includes('admin')) && (currentRole !== 'RT' || !rowData)) continue;
    if (currentRole === 'Warga' && !rowData) {
      if (nameLower === 'nik') val = session.nik;
      if (nameLower === 'nama' || nameLower === 'nama_lengkap' || nameLower.includes('nama')) val = session.nama;
      if (nameLower.includes('alamat')) val = session.alamat;
      if (['no_hp','hp','telp','wa'].includes(nameLower)) val = session.noHp;
    }
    if (!rowData && nameLower === 'rt') {
      let rtVal = '05';
      if (typeof appSettings !== 'undefined' && appSettings.rt_rw_text) {
        let match = appSettings.rt_rw_text.match(/RT\s*(\d+)/i);
        if (match && match[1]) {
          rtVal = match[1];
        }
      }
      val = rtVal;
    }
    if (val && nameLower.includes('tanggal') && currentActiveMenu === 'Keuangan') {
      // Keuangan: nilai tersimpan bisa "YYYY-MM-DD", "YYYY-MM-DD HH:mm",
      // "14/08/2026 15:36 WIB", atau "14/08/2026" → bentuk input datetime-local.
      val = keuanganTglToInput(val);
    } else if (val && nameLower.includes('tanggal') && val.includes('/')) {
      let parts = val.split('/');
      if (parts.length === 3) val = parts[2] + '-' + parts[1] + '-' + parts[0];
    }
    let safeVal = escHtmlAttr(val);
    let inputHtml = '';
    if (nameLower === 'status' && ['Pengaduan','SuratPengantar','Sumbangan'].includes(currentActiveMenu)) {
      // Nilai kanonik EYD: Selesai / Ditolak / Diterima / Sedang Ditindaklanjuti.
      // Ejaan lama ("selesai", "di tolak", "sedang ditindak lanjuti", "baru" dll.)
      // tetap dicocokkan saat edit agar data lama tidak terpilih salah.
      let sNorm = String(val || '').trim().toLowerCase().replace(/\s+/g, ' ');
      let sel = (v) => sNorm === v ? ' selected' : '';
      inputHtml = `<select class="form-select dynamic-input" data-key="${h}">
        <option value="Belum di verifikasi"${sel('belum di verifikasi') || (!sNorm || ['baru','belum diverifikasi','diajukan','pending'].includes(sNorm) ? ' selected' : '')}>Belum di verifikasi</option>
        <option value="Sedang Ditindaklanjuti"${sel('sedang ditindaklanjuti') || sel('sedang ditindak lanjuti')}>Sedang Ditindaklanjuti</option>
        <option value="Selesai"${sel('selesai')}>Selesai</option>
        <option value="Ditolak"${sel('ditolak') || sel('di tolak')}>Ditolak</option>
        <option value="Diterima"${sel('diterima')}>Diterima</option>
      </select>`;
    } else if (nameLower === 'jenis_aduan' || (currentActiveMenu === 'Pengaduan' && nameLower.includes('jenis'))) {
      inputHtml = `<select class="form-select dynamic-input" data-key="${h}"${lockAttr}>
        <option value="">-- Pilih Jenis Pengaduan --</option>
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
      inputHtml = `<select class="form-select dynamic-input" data-key="${h}"${lockAttr} onchange="if(typeof renderExtraSuratFields==='function') renderExtraSuratFields(this.value);">
        <option value="">-- Pilih Jenis Surat Pengantar --</option>
        ${opts}
      </select>
      <div id="extra-surat-fields-container" class="p-3 border rounded-3 bg-light mt-2 mb-2" style="display:none;"></div>`;
    } else if (currentActiveMenu === 'SuratPengantar' && nameLower === 'keterangan') {
      inputHtml = `<input type="hidden" class="dynamic-input" data-key="${h}" value="${safeVal}">`;
    } else if (!rowData && currentActiveMenu === 'Kematian' && nameLower === 'nama') {
      inputHtml = await buildKematianNamaDropdown(val);
    } else if (nameLower.includes('tanggal')) {
      if (currentActiveMenu === 'Keuangan') {
        // Keuangan: input tanggal + JAM (datetime-local) — entri manual ikut
        // tersimpan dengan jam, konsisten dengan entri Sumbangan/Iuran.
        let dtVal = val || keuanganNowLocalInput();
        inputHtml = `<input type="datetime-local" class="form-control dynamic-input" data-key="${h}" value="${escHtmlAttr(dtVal)}"${lockAttr}>`;
      } else if (currentActiveMenu === 'Sumbangan' && !rowData) {
        // Sumbangan (BARU): TANGGAL otomatis terisi tanggal + jam sekarang
        // (waktu server bila tersedia) — kalau dibiarkan manual/kosong, di menu
        // Keuangan barisnya jadi tanpa jam (tanggal saja).
        let dtVal = val || await sumbanganNowInputValue();
        inputHtml = `<input type="datetime-local" class="form-control dynamic-input" data-key="${h}" value="${escHtmlAttr(dtVal)}"${lockAttr}>`;
      } else {
        inputHtml = `<input type="date" class="form-control dynamic-input" data-key="${h}" value="${safeVal}"${lockAttr}>`;
      }
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
    } else if (nameLower === 'status_keluarga') {
      // Peran dalam keluarga: Kepala Keluarga / Anggota Keluarga (kolom baru patch v15)
      inputHtml = `<select class="form-select dynamic-input" data-key="${h}"${lockAttr}>
        <option value="">-- Pilih Status Keluarga --</option>
        <option value="Kepala Keluarga" ${String(val).toLowerCase().includes('kepala')?'selected':''}>Kepala Keluarga</option>
        <option value="Anggota Keluarga" ${!String(val).toLowerCase().includes('kepala') && val ? 'selected' : ''}>Anggota Keluarga</option>
      </select>`;
    } else if (nameLower.includes('foto') || nameLower.includes('bukti') || nameLower.includes('gambar')) {
      let imgDirect = convertToImageLink(val);
      let isValidVal = val && val !== 'EMPTY' && val !== 'NULL' && val !== '-' && !val.includes('***');
      if (isVerifyLocked) {
        // Verifikasi RT: foto warga tidak bisa diganti — cukup tampilkan + kirim nilai lama
        inputHtml = `
          ${isValidVal ? `<div class="mb-2"><img src="${imgDirect}" class="rounded border shadow-sm mb-2" style="max-height:110px;object-fit:cover;" onclick="bukaPopUpFoto('${val}')"><small class="d-block text-muted text-[10px]">Foto saat ini</small></div>` : '<small class="d-block text-muted text-[10px]">Tidak ada foto lampiran.</small>'}
          <input type="hidden" class="dynamic-input" data-key="${h}" value="${safeVal}">
          <small class="text-warning d-block text-[10px] fw-bold mt-1"><i class="bi bi-lock-fill me-1"></i>Foto tidak bisa diganti saat verifikasi.</small>`;
      } else {
        inputHtml = `
          ${isValidVal ? `<div class="mb-2"><img src="${imgDirect}" class="rounded border shadow-sm mb-2" style="max-height:110px;object-fit:cover;" onclick="bukaPopUpFoto('${val}')"><small class="d-block text-muted text-[10px]">Foto saat ini</small></div>` : ''}
          <div class="p-2 border rounded bg-white">
            <label class="form-label text-xs font-bold text-gray-700 mb-1 block"><i class="bi bi-camera-fill me-1 text-primary"></i>Upload Foto (Galeri / Kamera HP):</label>
            <input type="file" class="form-control form-control-sm dynamic-file-input" data-key="${h}" accept="image/*">
            <input type="hidden" class="dynamic-input" data-key="${h}" value="${safeVal}">
            <small class="text-muted text-[10px] d-block mt-1">*Pilih file foto dari HP/Kamera Anda.</small>
          </div>`;
      }
    } else {
      let isNameField = (nameLower === 'nama' || nameLower === 'nama_lengkap' || nameLower.includes('nama'));
      let isReadonly = (currentRole === 'Warga' && !rowData && (nameLower === 'nik' || nameLower.includes('alamat') || (isNameField && currentActiveMenu !== 'Sumbangan'))) ? 'readonly style="background-color:var(--readonly-bg,#f1f5f9);cursor:not-allowed;"' : '';
      // Verifikasi RT: kunci kolom data warga (nilai tetap terkirim via input disabled)
      if (isVerifyLocked) isReadonly = lockAttr;
      let helpText = (!isVerifyLocked && currentActiveMenu === 'Sumbangan' && isNameField) ? `<small class="text-muted text-[10px] d-block mt-1 font-medium">*Bisa diubah jika ingin menggunakan nama <b>"Hamba Allah"</b>.</small>` : '';
      inputHtml = `<input type="text" class="form-control dynamic-input" data-key="${h}" value="${safeVal}" placeholder="Masukkan ${labelText.toLowerCase()}..." ${isReadonly}>${helpText}`;
    }
    // Kolom lebar (foto/textarea/field tambahan) direntang penuh; sisanya 2 kolom di desktop
    const isWideField = nameLower.includes('foto') || nameLower.includes('bukti') || nameLower.includes('gambar')
      || inputHtml.indexOf('<textarea') !== -1
      || inputHtml.indexOf('extra-surat-fields-container') !== -1;
    const fieldClass = isWideField ? 'col-full' : 'col-half';
    let fieldHtml = `<div class="mb-3 ${fieldClass}"><label class="form-label small text-secondary fw-bold">${labelText}</label>${inputHtml}</div>`;
    if (currentActiveMenu === 'SuratPengantar' && nameLower === 'keterangan') {
      formBody.innerHTML += inputHtml;
    } else if (isWargaForm) {
      let g = wargaGroupOf(nameLower);
      if (!wargaGroupedFields[g]) wargaGroupedFields[g] = [];
      wargaGroupedFields[g].push(fieldHtml);
    } else {
      formBody.innerHTML += fieldHtml;
    }
  }
  if (isWargaForm) {
    let firstGroupRendered = false;
    for (let gi = 0; gi < wargaGroupOrder.length; gi++) {
      let g = wargaGroupOrder[gi];
      let groupFields = wargaGroupedFields[g];
      if (!groupFields || groupFields.length === 0) continue;
      formBody.innerHTML += `<details class="warga-form-group" ${firstGroupRendered ? '' : 'open'}><summary>${g}</summary><div class="warga-form-grid">${groupFields.join('')}</div></details>`;
      firstGroupRendered = true;
    }
  }

  if (currentActiveMenu === 'SuratPengantar' && !rowData) {
    if (typeof resetTTDSession === 'function') resetTTDSession();
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

  if (currentActiveMenu === 'SuratPengantar' && typeof renderFieldTTDPemohon === 'function') {
    let existingTTD = '';
    if (rowData) {
      if (Array.isArray(rowData)) {
        let hh = (currentHeaders || []).map(h => (h || '').toLowerCase().trim());
        let ttdIdx = hh.findIndex(h => h.includes('ttd_pemohon') || h.includes('tanda_tangan'));
        if (ttdIdx > -1) existingTTD = rowData[ttdIdx] || '';
      } else if (typeof rowData === 'object') {
        existingTTD = rowData.ttd_pemohon || rowData.tanda_tangan || '';
      }
    }
    formBody.innerHTML += renderFieldTTDPemohon(existingTTD);
  }
}

function compressImageFile(file, maxWidth = 800, maxHeight = 800, quality = 0.75) {
  return new Promise((resolve, reject) => {
    // Validasi isi file via magic bytes (v3.38): PDF/doc yang di-rename jadi
    // .jpg/.png TIDAK lolos — hanya file gambar asli yang diproses.
    if (typeof isValidImageFile === 'function') {
      isValidImageFile(file).then(function(ok) {
        if (!ok) {
          reject(new Error('File bukan gambar (PDF/doc tidak diizinkan). Pilih file JPG/PNG/WebP/GIF.'));
          return;
        }
        compressImageFileInner(file, maxWidth, maxHeight, quality, resolve, reject);
      });
      return;
    }
    compressImageFileInner(file, maxWidth, maxHeight, quality, resolve, reject);
  });
}

function compressImageFileInner(file, maxWidth, maxHeight, quality, resolve, reject) {
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
      img.onerror = () => resolve(e.target.result); // file lolos magic-byte tapi tak bisa dirender → simpan apa adanya (perilaku lama)
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
}

async function validateDynamicForm(menu, payload) {
  let currentRole = await getValidUserRole();
  document.querySelectorAll('.dynamic-input, .extra-surat-input').forEach(inp => {
    inp.classList.remove('is-invalid', 'border-danger');
  });

  const getVal = (keywords) => {
    let key = Object.keys(payload).find(k => {
      let kClean = k.toLowerCase().replace(/_/g, ' ').trim();
      return keywords.some(kw => kClean === kw || kClean.includes(kw));
    });
    return { key, val: key ? String(payload[key] || '').trim() : '' };
  };

  const markInvalid = (key, msg) => {
    if (key) {
      let inputEl = document.querySelector(`.dynamic-input[data-key="${key}"], .extra-surat-input[data-extra-key="${key}"]`);
      if (inputEl) {
        inputEl.classList.add('is-invalid', 'border-danger');
        inputEl.focus();
      }
    }
    showUIToast(msg, 'danger');
    return false;
  };

  if (menu === 'Warga') {
    let nikObj = getVal(['nik', 'ktp']);
    if (nikObj.key) {
      let numNik = nikObj.val.replace(/[^0-9]/g, '');
      if (!numNik || numNik.length !== 16) {
        return markInvalid(nikObj.key, 'NIK harus terdiri dari 16 digit angka!');
      }
    }
    let kkObj = getVal(['no kk', 'nokk', 'kk']);
    if (kkObj.key) {
      let numKk = kkObj.val.replace(/[^0-9]/g, '');
      if (!numKk || numKk.length !== 16) {
        return markInvalid(kkObj.key, 'Nomor KK harus terdiri dari 16 digit angka!');
      }
    }
    let namaObj = getVal(['nama lengkap', 'nama']);
    if (namaObj.key && (!namaObj.val || namaObj.val.length < 2)) {
      return markInvalid(namaObj.key, 'Nama Lengkap wajib diisi (minimal 2 karakter)!');
    }
    let hpObj = getVal(['no hp', 'hp', 'wa', 'telp']);
    if (hpObj.key) {
      let numHp = hpObj.val.replace(/[^0-9]/g, '');
      if (!numHp || numHp.length < 10 || numHp.length > 15) {
        return markInvalid(hpObj.key, 'Nomor HP/WA harus berupa 10 hingga 15 digit angka!');
      }
    }
    let tglObj = getVal(['tanggal lahir', 'tgl lahir']);
    if (tglObj.key && tglObj.val) {
      let selectedDate = new Date(tglObj.val);
      if (selectedDate > new Date()) {
        return markInvalid(tglObj.key, 'Tanggal lahir tidak boleh di masa depan!');
      }
    }
  }

  if (menu === 'Iuran') {
    let nomObj = getVal(['nominal']);
    if (nomObj.key) {
      let numNom = Number(nomObj.val.replace(/[^0-9]/g, ''));
      if (isNaN(numNom) || numNom <= 0) {
        return markInvalid(nomObj.key, 'Nominal iuran harus lebih besar dari 0!');
      }
    }
    let thnObj = getVal(['tahun']);
    if (thnObj.key) {
      let numThn = thnObj.val.replace(/[^0-9]/g, '');
      if (!numThn || numThn.length !== 4) {
        return markInvalid(thnObj.key, 'Tahun iuran harus 4 digit angka (contoh: 2026)!');
      }
    }
    let blnObj = getVal(['bulan']);
    if (blnObj.key && !blnObj.val) {
      return markInvalid(blnObj.key, 'Pilih bulan iuran terlebih dahulu!');
    }
  }

  if (menu === 'Keuangan') {
    let nomObj = getVal(['pemasukan', 'pengeluaran', 'nominal']);
    if (nomObj.key) {
      let numNom = Number(nomObj.val.replace(/[^0-9]/g, ''));
      if (isNaN(numNom) || numNom <= 0) {
        return markInvalid(nomObj.key, 'Nominal keuangan harus lebih besar dari 0!');
      }
    }
    let ketObj = getVal(['keterangan']);
    if (ketObj.key && (!ketObj.val || ketObj.val.length < 3)) {
      return markInvalid(ketObj.key, 'Keterangan transaksi minimal 3 karakter!');
    }
  }

  if (menu === 'Pengaduan') {
    let jnsObj = getVal(['jenis aduan', 'jenis']);
    if (jnsObj.key && !jnsObj.val) {
      return markInvalid(jnsObj.key, 'Pilih jenis aduan terlebih dahulu!');
    }
    let ketObj = getVal(['keterangan', 'isi', 'detail']);
    if (ketObj.key && (!ketObj.val || ketObj.val.length < 10)) {
      return markInvalid(ketObj.key, 'Detail keterangan aduan minimal 10 karakter agar laporan jelas!');
    }
  }

  if (menu === 'SuratPengantar' || menu === 'Surat') {
    let jnsObj = getVal(['jenis surat', 'jenis', 'perihal', 'keperluan']);
    if (jnsObj.key && !jnsObj.val) {
      return markInvalid(jnsObj.key, 'Pilih jenis surat pengantar terlebih dahulu!');
    }
    if (currentRole === 'Warga' && !editingId) {
      let ttdObj = getVal(['ttd pemohon', 'ttd']);
      if (ttdObj.key && (!ttdObj.val || ttdObj.val.length < 100)) {
        return markInvalid(ttdObj.key, 'Tanda tangan pemohon wajib digambar pada area tanda tangan!');
      }
    }
  }

  if (menu === 'Aset' || menu === 'Inventaris') {
    let nmObj = getVal(['nama barang', 'nama aset', 'nama']);
    if (nmObj.key && (!nmObj.val || nmObj.val.length < 2)) {
      return markInvalid(nmObj.key, 'Nama barang/aset minimal 2 karakter!');
    }
    let jmlObj = getVal(['jumlah', 'stok', 'qty']);
    if (jmlObj.key) {
      let numJml = Number(jmlObj.val.replace(/[^0-9]/g, ''));
      if (isNaN(numJml) || numJml < 1) {
        return markInvalid(jmlObj.key, 'Jumlah aset harus berupa angka minimal 1!');
      }
    }
  }

  if (menu === 'Sumbangan') {
    let nmObj = getVal(['nama']);
    if (nmObj.key && (!nmObj.val || nmObj.val.length < 2)) {
      return markInvalid(nmObj.key, 'Nama penyumbang wajib diisi (bisa menggunakan "Hamba Allah")!');
    }
    let jnsObj = getVal(['jenis sumbangan', 'jenis']);
    let nomObj = getVal(['nominal']);
    if (jnsObj.val && jnsObj.val.toLowerCase().includes('uang') && nomObj.key) {
      let numNom = Number(nomObj.val.replace(/[^0-9]/g, ''));
      if (isNaN(numNom) || numNom <= 0) {
        return markInvalid(nomObj.key, 'Nominal sumbangan uang harus lebih besar dari 0!');
      }
    }
  }

  if (menu === 'Aspirasi') {
    let isiObj = getVal(['isi aspirasi', 'isi', 'aspirasi', 'pesan']);
    if (isiObj.key && (!isiObj.val || isiObj.val.length < 10)) {
      return markInvalid(isiObj.key, 'Isi aspirasi minimal 10 karakter!');
    }
  }

  if (menu === 'Kelahiran') {
    let bayiObj = getVal(['nama bayi']);
    if (bayiObj.key && (!bayiObj.val || bayiObj.val.length < 2)) {
      return markInvalid(bayiObj.key, 'Nama bayi wajib diisi!');
    }
    let ayahObj = getVal(['nama ayah']);
    if (ayahObj.key && (!ayahObj.val || ayahObj.val.length < 2)) {
      return markInvalid(ayahObj.key, 'Nama ayah wajib diisi!');
    }
    let ibuObj = getVal(['nama ibu']);
    if (ibuObj.key && (!ibuObj.val || ibuObj.val.length < 2)) {
      return markInvalid(ibuObj.key, 'Nama ibu wajib diisi!');
    }
  }

  if (['Kematian', 'PindahMasuk', 'PindahKeluar'].includes(menu)) {
    let nmObj = getVal(['nama']);
    if (nmObj.key && (!nmObj.val || nmObj.val.length < 2)) {
      return markInvalid(nmObj.key, 'Nama warga wajib diisi!');
    }
    let nikObj = getVal(['nik']);
    if (nikObj.key && nikObj.val) {
      let numNik = nikObj.val.replace(/[^0-9]/g, '');
      if (numNik.length !== 16) {
        return markInvalid(nikObj.key, 'NIK harus terdiri dari 16 digit angka!');
      }
    }
  }

  return true;
}

// Keuangan: nilai tanggal tersimpan beragam format -> nilai input datetime-local
// ("YYYY-MM-DDTHH:mm"). Tanggal saja -> tengah malam (00:00) agar tetap konsisten.
function keuanganTglToInput(val) {
  let s = String(val || '').trim();
  if (!s || s === '-') return '';
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{1,2}):(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}T${String(m[4]).padStart(2, '0')}:${m[5]}`;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}T00:00`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}T${m[4] ? String(m[4]).padStart(2, '0') : '00'}:${m[5] || '00'}`;
  return s.includes('T') ? s : '';
}

// Keuangan: "sekarang" dalam bentuk input datetime-local (waktu lokal perangkat)
function keuanganNowLocalInput() {
  let d = new Date();
  let p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

// Sumbangan: nilai default TANGGAL form baru = "sekarang" dalam bentuk input
// datetime-local. Pakai WAKTU SERVER (get_server_time) bila tersedia — fallback
// jam perangkat — lalu diformat WIB (Asia/Jakarta) agar jam konsisten di semua
// perangkat dan di menu Keuangan muncul jam (standar entri Iuran/Keuangan).
async function sumbanganNowInputValue() {
  let ms = Date.now();
  if (typeof ambilWaktuServer === 'function') {
    try { ms = await ambilWaktuServer(true); } catch (e) {}
  }
  let d = new Date(ms);
  if (isNaN(d.getTime())) d = new Date();
  let parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(d);
  let get = (t) => { let x = parts.find(p => p.type === t); return x ? x.value : '00'; };
  let hh = get('hour');
  if (hh === '24') hh = '00'; // engine tertentu menulis tengah malam sebagai 24:xx
  return get('year') + '-' + get('month') + '-' + get('day') + 'T' + hh + ':' + get('minute');
}

async function submitFormBaru(e) {
  if (e) e.preventDefault();
  let payload = {};
  
  document.querySelectorAll('.dynamic-input').forEach(inp => { 
    let key = inp.getAttribute('data-key');
    if (key) payload[key] = inp.value; 
  });

  if (currentActiveMenu === 'Keuangan' || currentActiveMenu === 'Sumbangan') {
    // Normalisasi tanggal: "YYYY-MM-DDTHH:mm" (dari datetime-local) ->
    // "YYYY-MM-DD HH:mm" agar konsisten dgn Iuran & mudah di-sort server,
    // dan di Keuangan baris Sumbangan ikut menampilkan jam.
    Object.keys(payload).forEach(k => {
      let kl = k.toLowerCase();
      if ((kl.includes('tanggal') || kl.includes('tgl')) && payload[k] && payload[k].includes('T')) {
        payload[k] = payload[k].replace('T', ' ');
      }
    });
  }

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
    if (typeof getTTDPemohonInline === 'function') {
      let ttdData = getTTDPemohonInline();
      if (ttdData) payload['ttd_pemohon'] = ttdData;
    }
  }

  if (!(await validateDynamicForm(currentActiveMenu, payload))) {
    return;
  }

  let fileInputs = document.querySelectorAll('.dynamic-file-input');
  for (let fileInp of fileInputs) {
    let key = fileInp.getAttribute('data-key');
    let file = fileInp.files[0];
    if (file && key) {
      let compressedUrl;
      try {
        compressedUrl = await compressImageFile(file);
      } catch (err) {
        fileInp.value = '';
        showUIToast((err && err.message) ? err.message : 'File foto tidak valid — pilih file gambar (JPG/PNG/WebP).', 'danger');
        return;
      }
      showUIToast('Mengompres & mengunggah foto ke server...', 'info');
      let publicUrl = await uploadToSupabaseStorage(compressedUrl, currentActiveMenu.toLowerCase());
      payload[key] = publicUrl;
    }
  }

  let loadingContainer = document.getElementById('dynamicForm');
  if (loadingContainer) {
    loadingContainer.innerHTML = '<div class="text-center p-4"><div class="spinner-border text-primary mb-2"></div><br><b>Menyimpan data ke server...</b></div>';
  }

  try {
    let targetId = editingId || editingNik;
    let currentRole = await getValidUserRole();

    if (targetId) {
      for (let k in payload) {
        if ((k.toLowerCase().includes('foto') || k.toLowerCase().includes('bukti')) && !payload[k]) {
          delete payload[k];
        }
      }
      delete menuDataCache[currentActiveMenu];
      const res = await callRpcPost('updateDataDiSheet', { sheetName: currentActiveMenu, id: targetId, formData: payload });
      if (res && res.status === 'success') { 
        if (bootstrapModalInstance) bootstrapModalInstance.hide(); 
        showUIToast(res.message, 'success'); 
        loadMenu(currentActiveMenu); 
        fetchNotifikasi(); 
      } else { 
        showUIToast('Gagal memperbarui: ' + (res ? res.message : 'Error'), 'danger'); 
        loadMenu(currentActiveMenu); 
      }
    } else {
      delete menuDataCache[currentActiveMenu];
      const res = await callRpcPost('simpanDataKeSheet', { sheetName: currentActiveMenu, formData: payload });
      if (res && res.status === 'success') {
        if (bootstrapModalInstance) bootstrapModalInstance.hide(); 
        showUIToast('Data Berhasil Disimpan!', 'success');
        if (currentRole === 'Warga') {
          if (currentActiveMenu === 'Pengaduan'      && typeof waKirimLaporan         === 'function') waKirimLaporan('aduan', res.id);
          if (currentActiveMenu === 'SuratPengantar' && typeof waKirimLaporan         === 'function') waKirimLaporan('surat', res.id);
          if (currentActiveMenu === 'Sumbangan'      && typeof waVerifikasiSumbangan  === 'function') waVerifikasiSumbangan(res.id);
        }
        loadMenu(currentActiveMenu);
        fetchNotifikasi();
      } else { 
        showUIToast('Gagal menyimpan: ' + (res ? res.message : 'Error'), 'danger'); 
        loadMenu(currentActiveMenu); 
      }
    }
  } catch (err) {
    showUIToast('Gagal mengunggah foto / menyimpan data: ' + err.message, 'danger');
    loadMenu(currentActiveMenu);
  }
}

async function hapusDataAktif() {
  let targetId = editingId || editingNik;
  if (!targetId) {
    showUIToast('ID / NIK data tidak ditemukan untuk dihapus.', 'error');
    return;
  }
  // Kumpulkan file foto di storage yang ikut terhapus (biar storage tidak menumpuk sampah)
  let pathsToDelete = [];
  const rowTarget = (currentRows || []).find(r => {
    if (!r) return false;
    if (Array.isArray(r)) return r.some(val => val !== null && val !== undefined && String(val).trim() === String(targetId).trim());
    if (typeof r === 'object') return Object.values(r).some(val => val !== null && val !== undefined && String(val).trim() === String(targetId).trim());
    return false;
  });
  if (rowTarget && typeof rowTarget === 'object' && !Array.isArray(rowTarget)) {
    for (const k in rowTarget) {
      const v = rowTarget[k];
      if (!v) continue;
      const kl = String(k).toLowerCase();
      if (kl.indexOf('foto') === -1 && kl.indexOf('bukti') === -1 && kl.indexOf('gambar') === -1 && kl.indexOf('ttd') === -1) continue;
      const p = (typeof extractStoragePathFromUrl === 'function') ? extractStoragePathFromUrl(String(v)) : null;
      if (p && pathsToDelete.indexOf(p) === -1) pathsToDelete.push(p);
    }
  }
  showUIConfirm('Apakah Anda yakin ingin menghapus data ini secara permanen dari database?', async function() {
    document.getElementById('dynamicForm').innerHTML = '<div class="text-center p-4"><b class="text-danger">Menghapus data...</b></div>';
    delete menuDataCache[currentActiveMenu];
    const res = await callRpcPost('hapusDataDariSheet', { sheetName: currentActiveMenu, id: targetId });
    if (res && res.status === 'success') {
      // Hapus file foto terkait di storage (best-effort, tidak mengganggu alur utama)
      if (pathsToDelete.length > 0 && typeof db !== 'undefined' && db && session && session.token) {
        try {
          db.rpc('delete_storage_files_secured', { p_token: String(session.token).trim(), p_password: '', p_paths: pathsToDelete })
            .then(function(){}).catch(function(){});
        } catch(e) {}
      }
      bootstrapModalInstance.hide(); showUIToast('Data Berhasil Dihapus!', 'success'); loadMenu(currentActiveMenu); fetchNotifikasi();
    }
    else { showUIToast('Gagal menghapus: ' + (res ? res.message : 'Error'), 'error'); loadMenu(currentActiveMenu); }
  }, 'Hapus Data Permanen');
}

async function getTombolAksi(menu, row, headers) {
  let lowerHeaders = headers.map(h => (h || '').toLowerCase().trim());
  let idIdx = lowerHeaders.indexOf('id');
  if (idIdx === -1) idIdx = lowerHeaders.findIndex(h => h.includes('id'));
  if (idIdx === -1) idIdx = lowerHeaders.findIndex(h => h.includes('nik') || h.includes('ktp'));
  if (idIdx === -1) idIdx = 0;
  let realId = row[idIdx];
  let noHpIdx = lowerHeaders.findIndex(h => h.includes('hp') || h.includes('wa') || h.includes('telp') || h.includes('nomor'));
  let noHpWarga = noHpIdx > -1 ? row[noHpIdx] : '';
  
  let currentRole = await getValidUserRole();
  if (currentRole === 'RT') {
    let btn = `<button class="btn btn-sm btn-outline-primary m-1 fw-bold" onclick="bukaModalEdit('${escJsStr(realId)}')">Edit/Status</button>`;
    if (['Pengaduan','SuratPengantar'].includes(menu)) btn += `<button class="btn btn-sm btn-success m-1 fw-bold" onclick="waKirimLaporanKeWarga('${escJsStr(realId)}','${escJsStr(noHpWarga)}')"><i class="bi bi-whatsapp me-1"></i>Laporan</button>`;
    return btn;
  }
  if (currentRole === 'Warga') {
    if (menu === 'Pengaduan')      return `<button class="btn btn-sm btn-success fw-bold" onclick="waKirimLaporan('aduan','${escJsStr(realId)}')"><i class="bi bi-whatsapp me-1"></i>WA Lapor</button>`;
    if (menu === 'SuratPengantar') return `<button class="btn btn-sm btn-success fw-bold" onclick="waKirimLaporan('surat','${escJsStr(realId)}')"><i class="bi bi-whatsapp me-1"></i>WA Surat</button>`;
    if (menu === 'Keuangan')       return `<button class="btn btn-sm btn-danger fw-bold" onclick="waLaporMasalahKeuangan('${escJsStr(realId)}')">Laporkan</button>`;
    if (menu === 'Sumbangan')      return `<button class="btn btn-sm btn-success fw-bold" onclick="waVerifikasiSumbangan('${escJsStr(realId)}')"><i class="bi bi-whatsapp me-1"></i>Verifikasi</button>`;
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
  // Menu generik (TableRenderer) — filter dibantu renderer
  if (typeof TableRenderer !== 'undefined' && ['Kelahiran','Kematian','PindahMasuk','PindahKeluar','Pengaduan','Sumbangan','Surat','SuratPengantar'].includes(currentActiveMenu)) {
    TableRenderer.filter(currentActiveMenu);
    return;
  }
  // Menu dengan render custom — filter diproses di modulnya masing-masing (ikut pagination)
  if (typeof filterDataWarga === 'function' && currentActiveMenu === 'Warga') { filterDataWarga(); return; }
  if (typeof filterDataKeuangan === 'function' && currentActiveMenu === 'Keuangan') { filterDataKeuangan(); return; }
  if (typeof filterIuran === 'function' && currentActiveMenu === 'Iuran') { filterIuran(); return; }
  if (typeof filterBansosRT === 'function' && currentActiveMenu === 'Bansos') { filterBansosRT(); return; }
  if (typeof filterAspirasi === 'function' && currentActiveMenu === 'Aspirasi') { filterAspirasi(); return; }
  if (typeof filterDataAset === 'function' && (currentActiveMenu === 'Aset' || currentActiveMenu === 'Inventaris')) { filterDataAset(); return; }
  let rows = document.querySelectorAll("#main-content table tbody tr");
  rows.forEach(row => {
    let text = row.innerText.toLowerCase();
    row.style.display = text.includes(input) ? "" : "none";
  });
  document.querySelectorAll(".quick-action-item").forEach(item => {
    let text = item.innerText.toLowerCase();
    item.style.display = text.includes(input) ? "flex" : "none";
  });
}

const _originalLoadMenu = window.loadMenu;
window.loadMenu = async function(menu) {
  if (typeof _originalLoadMenu === 'function') {
    await _originalLoadMenu(menu);
  }
  await enforceAdminMenuVisibility();
};
