let rawIuranData = [];
let iuranHeaders = [];
let activeBayarId = null;
let lastIuranSearchKey = '';
// PAGINATION SERVER-SIDE (patch v9): hanya halaman aktif yang diunduh + agregasi banner
// dihitung di server. Bila RPC belum terpasang, fallback otomatis ke mode lama.
let iuranServerMode = false;
let iuranTotal = 0;
let iuranSummary = null;
let iuranSearch = '';
let iuranSearchTimer = null;

// Nilai BAWAAN aplikasi (contoh) untuk QRIS & rekening — dipakai untuk memberi
// tahu RT kalau metode pembayaran masih bawaan contoh, bukan milik RT sendiri.
// (Sebelumnya fallback diam-diam ke rekening/QRIS contoh sehingga uang warga
// bisa mengalir ke tempat yang salah saat Pengaturan RT belum diisi.)
const DEV_DEFAULT_QRIS = "00020101021126570011ID.DANA.WWW011893600915311093669202091109366920303UKE51440014ID.CO.QRIS.WWW0215ID10210624013640303UKE5204899953033605802ID5909SHN GROUP6010Kab. Bogor6105163206304BAFC";
const DEV_DEFAULT_REKENING = '[{"bank":"DANA","no":"08973366667","an":"RIZKY NOVIANSYAH"},{"bank":"BRI","no":"231313","an":"RIZKY NOVIANSYAH"}]';

async function loadIuranView(page, search) {
  document.getElementById('main-content').innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><br><small class="text-muted mt-2 d-block">Memuat data iuran...</small></div>';
  let pageNum = Math.max(1, parseInt(page, 10) || 1);
  // Sinkronkan kata kunci pencarian (berubah → halaman 1; sama → biarkan halaman aktif)
  if (typeof search === 'string') {
    if (search !== iuranSearch) {
      iuranSearch = search;
      if (typeof Pagination !== 'undefined' && Pagination.reset) Pagination.reset('Iuran');
    }
  } else {
    let inputVal = document.getElementById('searchInput') ? String(document.getElementById('searchInput').value || '') : '';
    if (inputVal !== iuranSearch) {
      iuranSearch = inputVal;
      if (typeof Pagination !== 'undefined' && Pagination.reset) Pagination.reset('Iuran');
    }
  }
  // Mode server-side (patch v9)
  const res = await callRpcGet('getIuranPage', { page: pageNum, search: iuranSearch });
  if (res && res.status === 'success') {
    iuranServerMode = true;
    iuranTotal = res.total || 0;
    iuranSummary = res.summary || null;
    rawIuranData = res.rows || [];
    iuranHeaders = (res.headers || []).map(h => h.toLowerCase().trim());
    renderIuranCustom({ headers: res.headers, rows: res.rows });
    return;
  }
  // Fallback otomatis: RPC v9 belum terpasang → alur lama (fetch semua + slice klien)
  iuranServerMode = false;
  iuranSummary = null;
  const res2 = await callRpcGet('getIuranData');
  if (res2 && res2.status === 'success') {
    rawIuranData = res2.rows || [];
    iuranHeaders = (res2.headers || []).map(h => h.toLowerCase().trim());
    if (typeof Pagination !== 'undefined' && Pagination.reset) Pagination.reset('Iuran');
    renderIuranCustom(res2);
  } else {
    document.getElementById('main-content').innerHTML = `<div class="alert alert-danger">${(res2 && res2.message) || 'Gagal memuat data'}</div>`;
  }
}
window.loadIuranView = loadIuranView;

function getVal(r, headers, colName, defaultVal = '') {
  let idx = headers.indexOf(colName.toLowerCase());
  return idx > -1 && r[idx] !== undefined && r[idx] !== "" ? r[idx] : defaultVal;
}

function renderIuranCustom(data) {
  let headers = (data.headers || []).map(h => h.toLowerCase().trim());
  let rows = data.rows || [];
  let nominalIdx = headers.indexOf('nominal');
  let statusIdx = headers.indexOf('status');
  
  // Pengecekan role yang lebih aman & kebal spasi/huruf kecil
  let currentRole = (typeof session !== 'undefined' && session && session.role) ? String(session.role).trim().toUpperCase() : '';
  let isRT = currentRole === 'RT' || currentRole === 'ADMIN';

  let totalLunas = 0;
  let totalMenunggu = 0;
  let totalBelumLunas = 0;
  let countMenunggu = 0;

  rows.forEach(r => {
    let statusVal = statusIdx > -1 ? (r[statusIdx] || '') : 'Belum Lunas';
    let statusLower = statusVal.toLowerCase().trim();
    let nominalVal = nominalIdx > -1 ? (Number(r[nominalIdx].toString().replace(/[^0-9]/g, '')) || 0) : 0;
    
    if (statusLower.includes('lunas') && !statusLower.includes('belum')) {
      totalLunas += nominalVal;
    } else if (statusLower.includes('menunggu') || statusLower.includes('verifikasi')) {
      totalMenunggu += nominalVal;
      countMenunggu++;
    } else {
      totalBelumLunas += nominalVal;
    }
  });
  // Mode server-side: agregasi banner dikirim dari RPC (dihitung dari SEMUA baris),
  // jadi header tetap akurat walau hanya halaman aktif yang diunduh.
  if (iuranServerMode && iuranSummary) {
    totalLunas = Number(iuranSummary.total_lunas) || 0;
    totalMenunggu = Number(iuranSummary.total_menunggu) || 0;
    totalBelumLunas = Number(iuranSummary.total_belum_lunas) || 0;
    countMenunggu = Number(iuranSummary.count_menunggu) || 0;
  }

  let html = `
    <div class="p-1 text-gray-800 font-sans">
      <!-- Header Banner Status Iuran -->
      <div class="bg-gradient-to-r from-blue-900 to-blue-600 text-white p-5 rounded-2xl shadow-md mb-4 text-center">
        <h2 class="font-bold text-lg mb-1"><i class="bi bi-wallet2 me-2"></i>Status Iuran Warga ${new Date().getFullYear()}</h2>
        <p class="text-xs text-blue-100">Transparan, Cek Status & Pembayaran Bulanan RT 5</p>
      </div>
      <!-- Tombol Tambah Khusus RT -->
      ${isRT ? `
        <div class="mb-4 flex justify-end">
          <button onclick="bukaModalTambahIuranRT()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-bold shadow transition flex items-center gap-1">
            <i class="bi bi-plus-circle-fill"></i> Tambah Tagihan
          </button>
        </div>
      ` : ''}
      <!-- Card Ringkasan Tagihan -->
      ${isRT ? `
        <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-4">
          <div class="flex justify-between items-center mb-3">
            <div>
              <h4 class="font-bold text-gray-800 text-sm">Administrator RT (Pengelola Iuran)</h4>
              <p class="text-[10px] text-gray-400 font-mono">NIK: ${session?.nik || '-'} | Role: RT</p>
            </div>
            <span class="bg-purple-50 text-purple-600 px-2.5 py-1 rounded-full text-[11px] font-bold border border-purple-100"><i class="bi bi-shield-lock me-1"></i> Admin RT</span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div class="bg-emerald-50 border border-emerald-100 p-3 rounded-xl">
              <p class="text-[10px] text-emerald-600 uppercase font-bold">Total Iuran Terkumpul</p>
              <p class="font-bold text-emerald-700 text-sm md:text-base">Rp ${totalLunas.toLocaleString('id-ID')}</p>
            </div>
            <div class="bg-amber-50 border border-amber-100 p-3 rounded-xl">
              <p class="text-[10px] text-amber-600 uppercase font-bold">Menunggu Verifikasi (${countMenunggu})</p>
              <p class="font-bold text-amber-700 text-sm md:text-base">Rp ${totalMenunggu.toLocaleString('id-ID')}</p>
            </div>
            <div class="bg-rose-50 border border-rose-100 p-3 rounded-xl">
              <p class="text-[10px] text-rose-500 uppercase font-bold">Belum Lunas Warga</p>
              <p class="font-bold text-rose-700 text-sm md:text-base">Rp ${totalBelumLunas.toLocaleString('id-ID')}</p>
            </div>
          </div>
        </div>
      ` : `
        <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-4">
          <div class="flex justify-between items-center mb-3">
            <div>
              <h4 class="font-bold text-gray-800 text-sm" id="iuran-nama-warga">${session?.nama || session?.nik || '-'}</h4>
              <p class="text-[10px] text-gray-400 font-mono">NIK: ${session?.nik || '-'} | Role: ${session?.role || '-'}</p>
            </div>
            <span class="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full text-[11px] font-bold border border-blue-100">Aktif</span>
          </div>
          ${totalBelumLunas > 0 ? `
            <div class="bg-rose-50 border border-rose-100 p-3.5 rounded-xl flex items-center justify-between flex-wrap gap-2">
              <div>
                <p class="text-[10px] text-rose-500 uppercase font-bold">Total Belum Bayar</p>
                <p class="font-bold text-rose-700 text-base" id="total-belum-bayar">Rp ${totalBelumLunas.toLocaleString('id-ID')}</p>
              </div>
              <button onclick="bukaModalBayarSekaligusAll()" class="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow transition flex items-center gap-1.5 cursor-pointer">
                <i class="bi bi-wallet2"></i> Bayar Sekaligus
              </button>
            </div>
          ` : `
            <div class="bg-emerald-50 border border-emerald-100 p-3.5 rounded-xl flex items-center justify-between flex-wrap gap-2">
              <div>
                <p class="text-[10px] text-emerald-600 uppercase font-bold">Status Tagihan</p>
                <p class="font-bold text-emerald-700 text-sm md:text-base"><i class="bi bi-check-circle-fill me-1"></i> Tidak Ada Tagihan Menunggak</p>
              </div>
            </div>
          `}
        </div>
      `}
      <!-- Floating Bar Pilih Tagihan -->
      <div id="selected-iuran-bar" class="hidden bg-blue-50 border border-blue-200 p-3 rounded-2xl flex justify-between items-center text-xs mb-3 shadow-sm">
        <span id="selected-iuran-text" class="font-bold text-blue-800">0 Tagihan Terpilih</span>
        <button onclick="bukaModalBayarTerpilih()" class="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow transition flex items-center gap-1.5">
          <i class="bi bi-wallet2"></i> Bayar Terpilih (<span id="selected-iuran-nominal">Rp 0</span>)
        </button>
      </div>
      <!-- List Bulan Iuran -->
      <div class="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 p-3 space-y-2">
        <h3 class="font-bold text-xs text-gray-500 uppercase px-2 mb-2">${isRT ? 'Semua Riwayat & Tagihan Warga' : 'Daftar Tagihan Iuran Warga'}</h3>
        <div id="list-bulan-iuran" class="space-y-2">
          <!-- Render via JS -->
        </div>
        <div id="iuran-pagination" class="px-2 py-1"></div>
      </div>
    </div>
    <!-- MODAL PEMBAYARAN / UPLOAD BUKTI TRANSFER -->
    <div id="modal-bayar-iuran" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="bg-white p-5 rounded-2xl w-full max-w-sm shadow-2xl relative font-sans">
        <!-- Tombol Tutup -->
        <button onclick="tutupModalBayarIuran()" class="absolute top-3 right-3 text-gray-400 hover:text-gray-700 font-bold text-lg w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 z-50 transition">&times;</button>
        <div class="mb-3 border-b pb-2 pe-8">
          <h3 class="font-bold text-gray-800 text-sm"><i class="bi bi-shield-check text-blue-600 me-1"></i> Pembayaran Iuran</h3>
          <p id="info-bayar-target" class="text-xs text-blue-600 font-bold mt-1">-</p>
        </div>
        <div class="grid grid-cols-2 gap-1 bg-gray-100 p-1 rounded-xl mb-3 text-xs font-bold text-center">
          <button id="tab-qris-btn" onclick="switchTabBayar('qris')" class="py-2 rounded-lg bg-white text-blue-600 shadow-sm transition">Scan QRIS</button>
          <button id="tab-tf-btn" onclick="switchTabBayar('tf')" class="py-2 rounded-lg text-gray-500 transition">Transfer Bank</button>
        </div>
        <!-- TAMPILAN QRIS — KARTU BERMERK STANDAR NASIONAL (logo QRIS + GPN + aksen merah),
             agar pengguna langsung mengenali ini QRIS, bukan sekadar barcode polos. -->
        <div id="content-qris" class="text-center space-y-2">
          <p class="text-[10px] text-gray-500">Scan QRIS ini, nominal akan otomatis terisi sesuai tagihan:</p>
          <div class="relative inline-block w-[262px] h-[310px] bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden font-sans text-left">
            <!-- Poster QRIS: logo QRIS + teks standar + GPN + aksen merah. Tinggi kartu 310px = rasio
                 poster 1080:1276, sehingga poster tampil penuh tanpa terpotong/bergeser. -->
            <img src="img/qris.jpg" alt="Poster QRIS" class="absolute inset-0 w-full h-full object-cover" onload="qrisBgReady(true)" onerror="qrisBgReady(false);this.style.display='none'">
            <!-- Fallback aksen merah CSS — hanya tampil bila poster gagal dimuat -->
            <div id="qris-css-accent" style="display:none">
              <div class="absolute left-0 top-0 bottom-0 w-1.5 bg-red-600"></div>
              <div class="absolute right-0 bottom-0 w-16 h-9 bg-red-600" style="clip-path: polygon(100% 0, 100% 100%, 0 100%);"></div>
              <div class="absolute right-4 bottom-1 w-10 h-2.5 bg-red-600" style="clip-path: polygon(0 0, 100% 0, 50% 100%); opacity: 0.85;"></div>
            </div>
            <!-- Fallback header sintetis — hanya tampil bila poster gagal dimuat -->
            <div id="qris-synth-header" class="absolute inset-x-0 top-0 flex items-start justify-between px-5 pt-3" style="display:none">
              <div>
                <div class="relative inline-block">
                  <span class="font-black text-[21px] leading-none tracking-tighter text-black px-2 py-1 block select-none">QRIS</span>
                  <i class="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-black"></i>
                  <i class="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-black"></i>
                  <i class="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-black"></i>
                  <i class="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-black"></i>
                </div>
                <p class="text-[7px] font-semibold mt-1 leading-tight" style="color:#4b5563;">QR Code Standar<br>Pembayaran Nasional</p>
              </div>
              <div class="text-center">
                <svg width="38" height="24" viewBox="0 0 44 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 23 C12 15, 20 9, 32 5" stroke="#dc2626" stroke-width="3" stroke-linecap="round"/>
                  <path d="M26 3 L35 6 L27 12 Z" fill="#dc2626"/>
                </svg>
                <div class="text-[12px] font-black text-blue-800 leading-none -mt-0.5">GPN</div>
              </div>
            </div>
            <!-- Patch putih: menutupi baris "NMID : ..." bawaan poster yang letaknya TIDAK SEJAJAR
                 (miring ke kiri dari tengah) — tak terlihat karena latar poster putih. -->
            <div class="absolute bg-white" style="left:55px; top:74px; width:80px; height:22px;"></div>
            <!-- Konten simetris: info merchant (nama + NMID) di ATAS QR code, footer Dicetak oleh di bawah -->
            <div class="absolute inset-0 flex flex-col items-center px-5" style="padding-top:42px; padding-bottom:8px;">
              <p id="qris-merchant-name" class="font-bold text-black text-[13px] tracking-wide leading-none">SHN GROUP</p>
              <p id="qris-nmid-text" class="text-[9px] font-medium mt-1.5" style="color:#4b5563;">NMID : ID1021062401364</p>
              <div class="mt-3 bg-white rounded-md p-1">
                <img id="qris-dynamic-img" src="" class="w-[156px] h-[156px]" alt="QRIS">
                <img id="qris-static-fallback" class="hidden w-[156px] h-[156px] object-contain" alt="Foto QRIS cadangan">
                <canvas id="qris-canvas" class="hidden w-[156px] h-[156px]"></canvas>
                <p id="qris-fallback-note" class="hidden text-[8px] font-medium mt-1" style="color:#b91c1c;">-</p>
              </div>
              <div class="flex-1"></div>
              <p id="qris-printed-by" class="text-[8px] self-start" style="color:#6b7280;">Dicetak oleh: 93600915</p>
            </div>
          </div>
        </div>
        <!-- TAMPILAN TRANSFER BANK -->
        <div id="content-tf" class="hidden text-xs space-y-2">
          <div id="bank-accounts-list" class="space-y-2 max-h-48 overflow-y-auto pe-1">
            <!-- Dt Rekening dari Settings -->
          </div>
        </div>
        <!-- FORM UPLOAD BUKTI -->
        <form id="form-upload-iuran" onsubmit="submitBuktiIuran(event)" class="mt-4 border-t pt-3 space-y-3">
          <div>
            <label class="block text-[11px] font-bold text-gray-700 mb-1">Unggah Bukti Transfer / Pembayaran</label>
            <input type="file" id="file-bukti-iuran" accept="image/*" class="w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 transition" required>
          </div>
          <button type="submit" id="btn-submit-iuran" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs shadow transition">
            Kirim Bukti Pembayaran
          </button>
        </form>
      </div>
    </div>
  `;
  document.getElementById('main-content').innerHTML = html;
  renderListBulanDatabase(rows, headers);
  let searchInp = document.getElementById('searchInput');
  if (searchInp) {
    searchInp.onkeyup = function() {
      filterIuran();
    };
  }
}

// Pencarian iuran (ikut pagination) — dipanggil dari kotak pencarian global
function filterIuran() {
  let searchVal = document.getElementById('searchInput') ? document.getElementById('searchInput').value.toLowerCase().trim() : '';
  if (iuranServerMode) {
    // Server-side: kata kunci dikirim ke RPC (dicari di SEMUA data), debounce.
    clearTimeout(iuranSearchTimer);
    iuranSearchTimer = setTimeout(function() { loadIuranView(1, searchVal); }, 350);
    return;
  }
  let rows = rawIuranData || [];
  let filtered = searchVal
    ? rows.filter(r => r && r.some(val => String(val || '').toLowerCase().includes(searchVal)))
    : rows;
  if (typeof Pagination !== 'undefined' && lastIuranSearchKey !== searchVal) {
    lastIuranSearchKey = searchVal;
    Pagination.reset('Iuran');
  }
  renderListBulanDatabase(filtered, iuranHeaders);
}
window.filterIuran = filterIuran;

function renderListBulanDatabase(rows, headers) {
  let container = document.getElementById('list-bulan-iuran');
  if(!container) return;
  container.innerHTML = '';
  if (rows.length === 0) {
    container.innerHTML = `<div class="text-center p-4 text-gray-400 text-xs">Belum ada data iuran atau tagihan tercatat.</div>`;
    if (typeof Pagination !== 'undefined' && Pagination.render) {
      Pagination.render(document.getElementById('iuran-pagination'), 'Iuran', rows.length, function() { filterIuran(); });
    }
    return;
  }
  let currentRole = (typeof session !== 'undefined' && session && session.role) ? String(session.role).trim().toUpperCase() : '';
  let isRT = currentRole === 'RT' || currentRole === 'ADMIN';

  let idIdx = headers.indexOf('id') > -1 ? headers.indexOf('id') : 0;
  // Server-side: baris sudah = halaman aktif dari RPC; fallback: slice di klien.
  let pageRows = (!iuranServerMode && typeof Pagination !== 'undefined' && Pagination.slice) ? Pagination.slice('Iuran', rows) : rows;
  pageRows.forEach((r) => {
    let rowId = r[idIdx] || '';
    let bulanVal = getVal(r, headers, 'bulan', '-');
    let tahunVal = getVal(r, headers, 'tahun', new Date().getFullYear().toString());
    let namaVal = getVal(r, headers, 'nama', '-');
    let nominalRaw = getVal(r, headers, 'nominal', '0');
    let nominalVal = Number(nominalRaw.toString().replace(/[^0-9]/g, '')) || 0;
    let statusVal = getVal(r, headers, 'status', 'Belum Lunas');
    let statusLower = statusVal.toLowerCase().trim();
    let tglBayar = getVal(r, headers, 'tanggal_bayar', '-');
    let buktiUrl = getVal(r, headers, 'bukti_transfer', '');
    let isLunas = statusLower === 'lunas' || (statusLower.includes('lunas') && !statusLower.includes('belum'));
    let isMenunggu = statusLower.includes('menunggu') || statusLower.includes('verifikasi');
    let badgeHtml = '';
    
    if (isLunas) {
      badgeHtml = `
        <div class="text-right">
          <span class="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-bold">LUNAS</span>
          <span class="block text-[9px] text-gray-400 mt-0.5"><i class="bi bi-clock me-1"></i>${escHtml(tglBayar)}</span>
        </div>`;
    } else if (isMenunggu) {
      if (isRT) {
        badgeHtml = `
          <div class="text-right flex flex-col items-end gap-1">
            <span class="bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold">Menunggu Verifikasi</span>
            ${buktiUrl && buktiUrl !== '-' ? `<button onclick="bukaPopUpFoto('${escJsStr(buktiUrl)}')" class="text-[10px] text-blue-600 underline font-semibold">Cek Bukti Foto</button>` : ''}
            <div class="flex items-center gap-1 mt-0.5">
              <button onclick="verifikasiPembayaranRT('${escJsStr(rowId)}')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold shadow transition">Verifikasi Lunas</button>
              <button onclick="bukaModalEditIuranRT('${escJsStr(rowId)}')" title="Edit Tagihan" class="bg-amber-500 hover:bg-amber-600 text-white p-1 px-2 rounded-lg text-[10px] font-bold shadow transition flex items-center gap-1"><i class="bi bi-pencil-square"></i> Edit</button>
              <button onclick="hapusIuranRT('${escJsStr(rowId)}')" title="Hapus Tagihan" class="bg-rose-600 hover:bg-rose-700 text-white p-1 px-2 rounded-lg text-[10px] font-bold shadow transition flex items-center gap-1"><i class="bi bi-trash-fill"></i> Hapus</button>
            </div>
          </div>`;
      } else {
        badgeHtml = `
          <div class="text-right">
            <span class="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-bold">Menunggu Verifikasi</span>
            ${buktiUrl && buktiUrl !== '-' ? `<span class="block text-[9px] text-blue-600 cursor-pointer mt-0.5 underline font-semibold" onclick="bukaPopUpFoto('${escJsStr(buktiUrl)}')">Lihat Bukti Foto</span>` : ''}
          </div>`;
      }
    } else {
      if (isRT) {
        badgeHtml = `
          <div class="text-right flex flex-col items-end gap-1">
            <span class="bg-rose-100 text-rose-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold">Belum Lunas</span>
            <div class="flex items-center gap-1 mt-0.5">
              <button onclick="verifikasiPembayaranRT('${escJsStr(rowId)}')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold shadow transition">+ Tandai Lunas</button>
              <button onclick="bukaModalEditIuranRT('${escJsStr(rowId)}')" title="Edit Tagihan" class="bg-amber-500 hover:bg-amber-600 text-white p-1 px-2 rounded-lg text-[10px] font-bold shadow transition flex items-center gap-1"><i class="bi bi-pencil-square"></i> Edit</button>
              <button onclick="hapusIuranRT('${escJsStr(rowId)}')" title="Hapus Tagihan" class="bg-rose-600 hover:bg-rose-700 text-white p-1 px-2 rounded-lg text-[10px] font-bold shadow transition flex items-center gap-1"><i class="bi bi-trash-fill"></i> Hapus</button>
            </div>
          </div>`;
      } else {
        badgeHtml = `<button onclick="bukaModalBayarIuran('${escJsStr(rowId)}', '${escJsStr(bulanVal)}', '${escJsStr(tahunVal)}', '${escJsStr(nominalVal)}')" class="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl text-[11px] font-bold shadow transition">Bayar</button>`;
      }
    }

    let checkboxHtml = (!isLunas && !isMenunggu && !isRT)
      ? `<input type="checkbox" class="iuran-checkbox w-4 h-4 text-blue-600 rounded cursor-pointer me-2.5" data-id="${escHtmlAttr(rowId)}" data-nominal="${escHtmlAttr(nominalVal)}" data-label="${escHtmlAttr(bulanVal + ' ' + tahunVal)}" onchange="updateSelectedIuranTotal()">`
      : '';

    container.innerHTML += `
      <div class="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 border border-gray-100 transition">
        <div class="flex items-center">
          ${checkboxHtml}
          <div>
            <p class="font-bold text-gray-800 text-xs">${escHtml(bulanVal)} ${escHtml(tahunVal)} <span class="text-[10px] font-normal text-gray-500">(${escHtml(namaVal)})</span></p>
            <p class="text-[10px] text-blue-600 font-semibold">Nominal: Rp ${nominalVal.toLocaleString('id-ID')}</p>
          </div>
        </div>
        <div>${badgeHtml}</div>
      </div>
    `;
  });
  if (typeof Pagination !== 'undefined' && Pagination.render) {
    let totalCount = iuranServerMode ? iuranTotal : rows.length;
    Pagination.render(document.getElementById('iuran-pagination'), 'Iuran', totalCount, function() {
      if (iuranServerMode) {
        loadIuranView(Pagination.page('Iuran'), iuranSearch);
      } else {
        filterIuran();
      }
    });
  }
}

function calculateCRC16(str) {
  let crc = 0xFFFF;
  for (let c = 0; c < str.length; c++) {
    crc ^= str.charCodeAt(c) << 8;
    for (let i = 0; i < 8; i++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
    }
  }
  let hex = (crc & 0xFFFF).toString(16).toUpperCase();
  while (hex.length < 4) hex = '0' + hex;
  return hex;
}

function generateDynamicQRIS(staticQris, nominal) {
  let qris = staticQris.trim();
  if (qris.includes('010211')) {
    qris = qris.replace('010211', '010212');
  }
  if (qris.includes('6304')) {
    qris = qris.split('6304')[0];
  }
  let amountStr = Math.round(nominal).toString();
  let lenStr = amountStr.length < 10 ? '0' + amountStr.length : amountStr.length.toString();
  let tag54 = '54' + lenStr + amountStr;
  if (qris.includes('5802ID')) {
    qris = qris.replace('5802ID', tag54 + '5802ID');
  } else {
    qris += tag54;
  }
  qris += '6304';
  let crc = calculateCRC16(qris);
  return qris + crc;
}

// Ekstrak nama merchant (tag 59) dari payload QRIS statis — dipakai sebagai
// nama di kartu QRIS (mengikuti data payload yang disetel RT).
function parseQrisMerchantName(qrisStr) {
  var s = String(qrisStr || '');
  var m = /59(\d{2})/.exec(s);
  if (m) {
    var start = m.index + 4;
    var len = parseInt(m[1], 10);
    if (!isNaN(len) && start + len <= s.length) {
      var name = s.substr(start, len).trim();
      if (name) return name;
    }
  }
  return null;
}

// Ekstrak NMID (tag 02 dengan nilai "ID...") dari payload QRIS statis — dipakai
// sebagai baris "NMID : ..." di kartu QRIS (sesuai poster standar).
function parseQrisNmid(qrisStr) {
  var s = String(qrisStr || '');
  var m = /02(\d{2})(ID\d+)/.exec(s);
  if (m) {
    var start = m.index + 4;
    var len = parseInt(m[1], 10);
    if (!isNaN(len) && start + len <= s.length) {
      return s.substr(start, len);
    }
  }
  return 'ID1021062401364';
}

// Ekstrak MID PSP (tag 01 pada grup info akun merchant 26/27) dari payload QRIS —
// ditampilkan sebagai "Dicetak oleh: ..." di pojok kiri bawah kartu.
function parseQrisPrintedBy(qrisStr) {
  var s = String(qrisStr || '');
  var m = /(?:26|27)(\d{2})/.exec(s);
  if (m) {
    var start = m.index + 4;
    var len = parseInt(m[1], 10);
    if (!isNaN(len) && start + len <= s.length) {
      var mid = /^01(\d{2})(\d+)/.exec(s.substr(start, len));
      if (mid) return mid[2].slice(0, 8);
    }
  }
  return '93600915';
}

async function bukaModalBayarSekaligusAll() {
  let headers = (typeof iuranHeaders !== 'undefined' && iuranHeaders.length > 0) ? iuranHeaders : [];
  let rows = (typeof rawIuranData !== 'undefined') ? rawIuranData : [];
  // Mode server-side (patch v9): rawIuranData hanya berisi HALAMAN AKTIF — ambil
  // SEMUA tagihan milik warga dari server (pageSize maksimal) agar "Bayar Sekaligus"
  // tidak melewatkan tagihan di halaman lain.
  if (iuranServerMode) {
    try {
      const resAll = await callRpcGet('getIuranPage', { page: 1, pageSize: 10000, search: '' });
      if (resAll && resAll.status === 'success' && resAll.rows) {
        rows = resAll.rows;
        if (resAll.headers && resAll.headers.length > 0) {
          headers = resAll.headers.map(h => String(h).toLowerCase().trim());
        }
      }
    } catch(e) {}
  }
  let idIdx = headers.indexOf('id') > -1 ? headers.indexOf('id') : 0;
  let nominalIdx = headers.indexOf('nominal');
  let statusIdx = headers.indexOf('status');
  let bulanIdx = headers.indexOf('bulan');
  let tahunIdx = headers.indexOf('tahun');

  let unpaidItems = [];
  let totalNominal = 0;
  let bulanList = [];

  rows.forEach(r => {
    let statusVal = statusIdx > -1 ? (r[statusIdx] || '') : 'Belum Lunas';
    let statusLower = statusVal.toLowerCase().trim();
    let isBelumBayar = statusLower.includes('belum') || (!statusLower.includes('lunas') && !statusLower.includes('menunggu') && !statusLower.includes('verifikasi'));
    if (isBelumBayar) {
      let rowId = r[idIdx] || '';
      let nominalVal = nominalIdx > -1 ? (Number((r[nominalIdx] || 0).toString().replace(/[^0-9]/g, '')) || 0) : 0;
      let bulan = bulanIdx > -1 ? r[bulanIdx] : '';
      let tahun = tahunIdx > -1 ? r[tahunIdx] : '';
      if (rowId) {
        unpaidItems.push(rowId);
        totalNominal += nominalVal;
        if (bulan) bulanList.push(`${bulan} ${tahun}`);
      }
    }
  });

  if (unpaidItems.length === 0) {
    alert('Seluruh tagihan iuran Anda sudah lunas!');
    return;
  }

  let labelTarget = `Bayar Sekaligus (${unpaidItems.length} Bulan: ${bulanList.slice(0, 3).join(', ')}${bulanList.length > 3 ? '...' : ''})`;
  bukaModalBayarIuran(unpaidItems.join(','), labelTarget, '', totalNominal);
}

function updateSelectedIuranTotal() {
  let checkboxes = document.querySelectorAll('.iuran-checkbox:checked');
  let totalNominal = 0;
  let count = 0;
  checkboxes.forEach(cb => {
    count++;
    totalNominal += Number(cb.getAttribute('data-nominal') || 0);
  });
  let bar = document.getElementById('selected-iuran-bar');
  let text = document.getElementById('selected-iuran-text');
  let nomEl = document.getElementById('selected-iuran-nominal');
  if (bar) {
    if (count > 0) {
      bar.classList.remove('hidden');
      if (text) text.innerText = `${count} Tagihan Terpilih`;
      if (nomEl) nomEl.innerText = `Rp ${totalNominal.toLocaleString('id-ID')}`;
    } else {
      bar.classList.add('hidden');
    }
  }
}

function bukaModalBayarTerpilih() {
  let checkboxes = document.querySelectorAll('.iuran-checkbox:checked');
  if (checkboxes.length === 0) {
    alert('Pilih minimal 1 tagihan iuran yang ingin dibayar!');
    return;
  }
  let selectedIds = [];
  let totalNominal = 0;
  let labels = [];
  checkboxes.forEach(cb => {
    selectedIds.push(cb.getAttribute('data-id'));
    totalNominal += Number(cb.getAttribute('data-nominal') || 0);
    labels.push(cb.getAttribute('data-label'));
  });
  let labelTarget = `Bayar Terpilih (${selectedIds.length} Tagihan: ${labels.join(', ')})`;
  bukaModalBayarIuran(selectedIds.join(','), labelTarget, '', totalNominal);
}

function bukaModalBayarIuran(id, bulan, tahun, nominal) {
  activeBayarId = id;
  switchTabBayar('qris');
  let infoEl = document.getElementById('info-bayar-target');
  if (infoEl) {
    let labelText = tahun ? `Iuran ${bulan} ${tahun} - Rp ${Number(nominal).toLocaleString('id-ID')}` : `${bulan} - Rp ${Number(nominal).toLocaleString('id-ID')}`;
    infoEl.innerText = labelText;
  }
  let fileInp = document.getElementById('file-bukti-iuran');
  if (fileInp) fileInp.value = '';
  // QRIS: pakai setting RT bila ada; kalau belum diatur, pakai bawaan sistem
  // (keputusan pengguna — jangan tampilkan peringatan).
  let baseStaticQris = (typeof appSettings !== 'undefined' && appSettings.payment_qris_string)
    ? String(appSettings.payment_qris_string).trim()
    : '';
  if (!baseStaticQris) baseStaticQris = DEV_DEFAULT_QRIS;
  let qrisDinamisString = generateDynamicQRIS(baseStaticQris, nominal);
  let qrImgEl = document.getElementById('qris-dynamic-img');
  let qrFallbackEl = document.getElementById('qris-static-fallback');
  let qrNoteEl = document.getElementById('qris-fallback-note');
  // Foto QRIS cadangan milik RT (upload di Pengaturan → QRIS & Rekening) —
  // dipakai bila QRIS dinamis gagal dimuat (mis. layanan QR mati / offline).
  let staticQrisPhoto = (typeof appSettings !== 'undefined' && appSettings.payment_qris)
    ? String(appSettings.payment_qris).trim()
    : '';
  if (qrFallbackEl) qrFallbackEl.classList.add('hidden');
  if (qrNoteEl) qrNoteEl.classList.add('hidden');
  if (qrImgEl) {
    qrImgEl.classList.remove('hidden');
    qrImgEl.onerror = function() {
      qrImgEl.classList.add('hidden');
      if (qrFallbackEl) {
        if (staticQrisPhoto) {
          qrFallbackEl.src = staticQrisPhoto;
          qrFallbackEl.classList.remove('hidden');
        } else {
          qrFallbackEl.classList.add('hidden');
        }
      }
      if (qrNoteEl) {
        qrNoteEl.textContent = staticQrisPhoto
          ? 'QRIS dinamis gagal dimuat — menampilkan foto QRIS cadangan.'
          : 'QRIS dinamis gagal dimuat. Silakan gunakan Transfer Bank.';
        qrNoteEl.classList.remove('hidden');
      }
    };
    qrImgEl.src = 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=' + encodeURIComponent(qrisDinamisString);
  }
  // Nama merchant diambil langsung dari payload QRIS (tag 59) — tidak perlu disetel terpisah.
  let merchantEl = document.getElementById('qris-merchant-name');
  if (merchantEl) {
    merchantEl.innerText = parseQrisMerchantName(baseStaticQris) || 'SHN GROUP';
  }
  // NMID & "Dicetak oleh" diambil dari payload QRIS yang sedang dipakai.
  let nmidEl = document.getElementById('qris-nmid-text');
  if (nmidEl) nmidEl.innerText = 'NMID : ' + parseQrisNmid(baseStaticQris);
  let printedEl = document.getElementById('qris-printed-by');
  if (printedEl) printedEl.innerText = 'Dicetak oleh: ' + parseQrisPrintedBy(baseStaticQris);
  let tfBox = document.getElementById('content-tf');
  if (tfBox) {
    // Rekening: pakai setting RT bila ada; kalau belum diatur, pakai bawaan sistem.
    let rekList = [];
    try { rekList = JSON.parse((typeof appSettings !== 'undefined' && appSettings.payment_rekening) || '[]'); } catch(e) {}
    if (!Array.isArray(rekList) || rekList.length === 0) {
      try { rekList = JSON.parse(DEV_DEFAULT_REKENING); } catch(e) { rekList = []; }
    }
    let tfHtml = `<div class="bg-blue-50 p-3 rounded-xl border border-blue-100 space-y-1">`;
    rekList.forEach(r => {
      tfHtml += `<p class="text-gray-700 font-bold">${r.bank}: <span class="text-blue-700 font-mono">${r.no}</span> ${r.an ? `<small class="text-gray-500 font-normal">(a.n ${r.an})</small>` : ''}</p>`;
    });
    tfHtml += `</div>`;
    tfBox.innerHTML = tfHtml;
  }
  let modal = document.getElementById('modal-bayar-iuran');
  if (modal) modal.classList.remove('hidden');
}

function tutupModalBayarIuran() {
  let modal = document.getElementById('modal-bayar-iuran');
  if (modal) modal.classList.add('hidden');
}

async function submitBuktiIuran(e) {
  if (e && e.preventDefault) e.preventDefault();
  return prosesKirimBuktiBayar();
}

async function prosesKirimBuktiBayar() {
  if (!activeBayarId) {
    alert('ID Tagihan iuran tidak ditemukan!');
    return;
  }
  let fileInp = document.getElementById('file-bukti-iuran') || document.getElementById('iuran-bukti-file');
  let file = fileInp && fileInp.files ? fileInp.files[0] : null;
  if (!file) {
    alert('Silakan pilih dan upload foto bukti transfer terlebih dahulu!');
    return;
  }
  let btnSubmit = document.getElementById('btn-submit-iuran') || document.getElementById('btn-kirim-bukti');
  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.innerText = 'Mengunggah & Mengirim...';
  }
  try {
    let compressedUrl = (typeof compressImageFile === 'function') ? await compressImageFile(file) : await new Promise(r => { let rd = new FileReader(); rd.onload = e => r(e.target.result); rd.readAsDataURL(file); });
    let formData = {
      status: 'Menunggu Verifikasi',
      bukti_transfer: compressedUrl
    };
    let ids = String(activeBayarId).split(',');
    let updatePromises = ids.map(idStr => {
      return callRpcPost('updateDataDiSheet', {
        sheetName: 'Iuran',
        id: idStr.trim(),
        formData: formData
      });
    });
    await Promise.all(updatePromises);
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerText = 'Kirim Bukti Pembayaran';
    }
    alert(`Bukti transfer berhasil dikirim untuk ${ids.length} tagihan! Status pembayaran kini Menunggu Verifikasi RT.`);
    tutupModalBayarIuran();
    if (typeof menuDataCache !== 'undefined') delete menuDataCache['Iuran'];
    loadIuranView();
  } catch (err) {
    alert('Gagal membaca file foto: ' + err.message);
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerText = 'Kirim Bukti Pembayaran';
    }
  }
}
window.submitBuktiIuran = submitBuktiIuran;

async function verifikasiPembayaranRT(id) {
  showUIConfirm('Apakah Anda yakin ingin memverifikasi pembayaran iuran ini menjadi LUNAS?', async function() {
    let nowFormatted = formatWIBDateTime(new Date());
    let formData = {
      status: 'LUNAS',
      tanggal_bayar: nowFormatted,
      diterima_oleh: 'RT 5 (' + (session?.nama || 'Pengurus') + ')'
    };
    let res = await safeSupabaseUpdate('Iuran', formData, 'id', id);
    if (res && (!res.error || res.status === 'success')) {
      delete menuDataCache['Iuran'];
      let idIdx = iuranHeaders.indexOf('id');
      let iuranItem = rawIuranData.find(r => idIdx > -1 && String(r[idIdx]) === String(id));
      let namaWarga = getVal(iuranItem || [], iuranHeaders, 'nama', 'Warga');
      let bulan = getVal(iuranItem || [], iuranHeaders, 'bulan', 'Iuran');
      let tahun = getVal(iuranItem || [], iuranHeaders, 'tahun', new Date().getFullYear());
      let nominal = getVal(iuranItem || [], iuranHeaders, 'nominal', '25000');
      let bukti = getVal(iuranItem || [], iuranHeaders, 'bukti_transfer', '-');
      let nominalNum = Number(nominal.toString().replace(/[^0-9]/g, '')) || 0;
      let kasItem = {
        id: generateSecureId('KAS'),
        tanggal: nowFormatted,
        pemasukan: nominalNum,
        pengeluaran: 0,
        keterangan: `Pembayaran Iuran ${bulan} ${tahun} (${namaWarga})`,
        foto_url: bukti || '-'
      };
      try {
        await safeSupabaseInsert('Keuangan', [kasItem]);
        delete menuDataCache['Keuangan'];
      } catch (e) {
        console.error('Gagal otomatis mencatat ke Keuangan:', e);
      }
      let modalEl = document.getElementById('formModal');
      if (modalEl) {
        let mInst = bootstrap.Modal.getInstance(modalEl);
        if (mInst) mInst.hide();
      }
      showUIToast('Pembayaran iuran LUNAS & otomatis masuk Laporan Keuangan!', 'success');
      loadMenu('Iuran');
      fetchNotifikasi();
    }
  }, 'Verifikasi Iuran');
}

function bukaModalEditIuranRT(id) {
  let idIdx = iuranHeaders.indexOf('id');
  let iuranItem = rawIuranData.find(r => idIdx > -1 && String(r[idIdx]) === String(id));
  if (!iuranItem) {
    showUIToast('Data iuran tidak ditemukan!', 'error');
    return;
  }
  let styleId = 'hide-modal-footer-override';
  if (!document.getElementById(styleId)) {
    let style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `#formModal .modal-footer { display: none !important; }`;
    document.head.appendChild(style);
  }
  let nikVal = getVal(iuranItem, iuranHeaders, 'nik', '');
  let namaVal = getVal(iuranItem, iuranHeaders, 'nama', '');
  let bulanVal = getVal(iuranItem, iuranHeaders, 'bulan', 'Januari');
  let tahunVal = getVal(iuranItem, iuranHeaders, 'tahun', new Date().getFullYear().toString());
  let nominalVal = getVal(iuranItem, iuranHeaders, 'nominal', '25000');
  let statusVal = getVal(iuranItem, iuranHeaders, 'status', 'Belum Lunas');
  let months = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  let bulanOpts = months.map(m => `<option value="${m}" ${m === bulanVal ? 'selected' : ''}>${m}</option>`).join('');
  let currentYear = new Date().getFullYear();
  let yearOptions = '';
  for (let y = currentYear - 2; y <= currentYear + 3; y++) {
    yearOptions += `<option value="${y}" ${String(y) === String(tahunVal) ? 'selected' : ''}>${y}</option>`;
  }
  let htmlForm = `
    <div class="p-2 space-y-3 text-xs">
      <div>
        <label class="font-bold text-gray-600 mb-1 block">Nama Warga</label>
        <input type="text" id="edit-iuran-nama" value="${namaVal}" class="w-full p-2 border rounded-xl bg-gray-50" readonly>
      </div>
      <div>
        <label class="font-bold text-gray-600 mb-1 block">NIK Warga</label>
        <input type="text" id="edit-iuran-nik" value="${nikVal}" class="w-full p-2 border rounded-xl bg-gray-50" readonly>
      </div>
      <div>
        <label class="font-bold text-gray-600 mb-1 block">Bulan Iuran</label>
        <select id="edit-iuran-bulan" class="w-full p-2 border rounded-xl bg-white">
          ${bulanOpts}
        </select>
      </div>
      <div>
        <label class="font-bold text-gray-600 mb-1 block">Tahun</label>
        <select id="edit-iuran-tahun" class="w-full p-2 border rounded-xl bg-white">
          ${yearOptions}
        </select>
      </div>
      <div>
        <label class="font-bold text-gray-600 mb-1 block">Nominal Tagihan (Rp)</label>
        <input type="number" id="edit-iuran-nominal" value="${nominalVal}" class="w-full p-2 border rounded-xl bg-white">
      </div>
      <div>
        <label class="font-bold text-gray-600 mb-1 block">Status Pembayaran</label>
        <select id="edit-iuran-status" class="w-full p-2 border rounded-xl bg-white">
          <option value="Belum Lunas" ${statusVal.toLowerCase().includes('belum') ? 'selected' : ''}>Belum Lunas</option>
          <option value="Menunggu Verifikasi" ${statusVal.toLowerCase().includes('menunggu') ? 'selected' : ''}>Menunggu Verifikasi</option>
          <option value="Lunas" ${statusVal.toLowerCase() === 'lunas' ? 'selected' : ''}>Lunas</option>
        </select>
      </div>
      <div class="pt-2">
        <button type="button" onclick="simpanEditIuranRT(event, '${id}')" class="w-full bg-amber-600 hover:bg-amber-700 text-white p-2.5 rounded-xl font-bold shadow transition">Simpan Perubahan</button>
      </div>
    </div>
  `;
  document.getElementById('formModalTitle').innerText = 'Edit Tagihan Iuran Warga';
  document.getElementById('dynamicForm').innerHTML = htmlForm;
  document.getElementById('btn-hapus-modal').style.display = 'none';
  let modal = new bootstrap.Modal(document.getElementById('formModal'));
  modal.show();
}

async function simpanEditIuranRT(event, id) {
  if (event) event.preventDefault();
  // Nilai LAMA (sebelum update) — dipakai untuk sinkronisasi kas Keuangan.
  let idIdx = iuranHeaders.indexOf('id');
  let iuranItem = rawIuranData.find(r => idIdx > -1 && String(r[idIdx]) === String(id));
  let oldStatus = iuranItem ? getVal(iuranItem, iuranHeaders, 'status', '') : '';
  let oldBulan = iuranItem ? getVal(iuranItem, iuranHeaders, 'bulan', '') : '';
  let oldTahun = iuranItem ? getVal(iuranItem, iuranHeaders, 'tahun', '') : '';
  let oldNama = iuranItem ? getVal(iuranItem, iuranHeaders, 'nama', 'Warga') : 'Warga';
  let oldNominal = iuranItem ? getVal(iuranItem, iuranHeaders, 'nominal', '0') : '0';
  let oldIsLunas = oldStatus.toUpperCase() === 'LUNAS' || (oldStatus.toLowerCase().includes('lunas') && !oldStatus.toLowerCase().includes('belum'));

  let updatePayload = {
    bulan: document.getElementById('edit-iuran-bulan').value,
    tahun: document.getElementById('edit-iuran-tahun').value,
    nominal: document.getElementById('edit-iuran-nominal').value || '25000',
    status: document.getElementById('edit-iuran-status').value
  };
  let newIsLunas = updatePayload.status.toUpperCase() === 'LUNAS';
  if (newIsLunas) {
    let nowFormatted = formatWIBDateTime(new Date());
    updatePayload.tanggal_bayar = nowFormatted;
    updatePayload.diterima_oleh = 'RT 5 (' + (session?.nama || 'Pengurus') + ')';
  }
  let res = await safeSupabaseUpdate('Iuran', updatePayload, 'id', id);
  if (res && (!res.error || res.status === 'success')) {
    // Sinkron kas Keuangan (konsisten dengan "Verifikasi Lunas" & buat tagihan Lunas):
    // transisi ke LUNAS → catat pemasukan; transisi keluar dari LUNAS → hapus catatannya.
    try {
      if (newIsLunas && !oldIsLunas) {
        let kasItem = {
          id: generateSecureId('KAS'),
          tanggal: formatWIBDateTime(new Date()),
          pemasukan: Number(String(updatePayload.nominal).replace(/[^0-9]/g, '')) || 0,
          pengeluaran: 0,
          keterangan: `Pembayaran Iuran ${updatePayload.bulan} ${updatePayload.tahun} (${oldNama})`,
          foto_url: '-'
        };
        await safeSupabaseInsert('Keuangan', [kasItem]);
        delete menuDataCache['Keuangan'];
      } else if (!newIsLunas && oldIsLunas) {
        let oldKet = `Pembayaran Iuran ${oldBulan} ${oldTahun} (${oldNama})`;
        let oldNom = Number(String(oldNominal).replace(/[^0-9]/g, '')) || 0;
        if (db) {
          await db.from('Keuangan').delete().eq('keterangan', oldKet).eq('pemasukan', oldNom);
        }
        delete menuDataCache['Keuangan'];
      }
    } catch(e) {
      console.error('Gagal sinkron kas saat edit iuran:', e);
    }
    delete menuDataCache['Iuran'];
    showUIToast('Tagihan iuran berhasil diperbarui!', 'success');
    let modalEl = document.getElementById('formModal');
    let modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (modalInstance) modalInstance.hide();
    loadIuranView();
  } else {
    showUIToast('Gagal menyimpan: ' + ((res && res.error) ? res.error.message : 'Terjadi kesalahan'), 'error');
  }
}

async function hapusIuranRT(id) {
  showUIConfirm('Apakah Anda yakin ingin menghapus data tagihan iuran ini?', async function() {
    let res = await safeSupabaseDelete('Iuran', 'id', id);
    if (res && (!res.error || res.status === 'success')) {
      delete menuDataCache['Iuran'];
      showUIToast('Data tagihan iuran berhasil dihapus!', 'success');
      loadIuranView();
    } else {
      showUIToast('Gagal menghapus: ' + ((res && res.error) ? res.error.message : 'Terjadi kesalahan'), 'error');
    }
  }, 'Hapus Tagihan Iuran');
}

async function bukaModalTambahIuranRT() {
  let styleId = 'hide-modal-footer-override';
  if (!document.getElementById(styleId)) {
    let style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `#formModal .modal-footer { display: none !important; }`;
    document.head.appendChild(style);
  }
  // Pemilihan tagihan per KELUARGA (Nomor KK): kepala keluarga = anggota pertama tiap KK,
  // semua anggota tetap melihat tagihan lewat pencocokan no_kk (patch v14).
  let kkOptions = '<option value="">Pilih Keluarga (Nomor KK)...</option>';
  try {
    let rawW = [];
    const res = await callRpcGet('getDaftarWargaUntukIuran');
    if (res && res.status === 'success' && res.data) rawW = res.data;
    if (!rawW.length) {
      const fb = await safeSupabaseSelect('Warga');
      if (fb && !fb.error && fb.data) rawW = fb.data;
    }
    const mapKk = {};
    rawW.forEach(w => {
      let wNik = (typeof cariNilaiKolom === 'function' ? cariNilaiKolom(w, ['nik', 'ktp']) : '') || w.nik || w.NIK || '';
      let wNama = (typeof cariNilaiKolom === 'function' ? cariNilaiKolom(w, ['nama_lengkap', 'nama', 'name', 'nama_panggilan']) : '') || w.nama || w.Nama || '';
      let wKk = (typeof cariNilaiKolom === 'function' ? cariNilaiKolom(w, ['no_kk', 'kk', 'nomor_kk']) : '') || w.no_kk || w.KK || '';
      let wStatus = String((typeof cariNilaiKolom === 'function' ? cariNilaiKolom(w, ['status_keluarga']) : '') || '').toLowerCase();
      if (!wNik && !wNama && !wKk) return;
      let key = wKk || ('tanpa-kk-' + wNik);
      if (!mapKk[key]) mapKk[key] = { no_kk: wKk, nama: '', nik: '', anggota: [] };
      let g = mapKk[key];
      // Nama/NIK wakil keluarga = anggota berstatus Kepala Keluarga (kolom v15); fallback: anggota pertama.
      if (wStatus.includes('kepala')) { g.nama = wNama || g.nama; g.nik = wNik || g.nik; }
      if (!g.nama) g.nama = wNama || '-';
      if (!g.nik) g.nik = wNik || '';
      g.anggota.push(wNama || '-');
    });
    Object.keys(mapKk).sort().forEach(k => {
      let g = mapKk[k];
      let anggotaLabel = g.anggota.length > 1 ? ` (${g.anggota.length} anggota)` : '';
      let labelKk = g.no_kk ? `KK ${escHtml(g.no_kk)} — ` : '';
      kkOptions += `<option value="${escHtmlAttr(g.no_kk)}" data-nama="${escHtmlAttr(g.nama)}" data-nik="${escHtmlAttr(g.nik)}" data-anggota="${escHtmlAttr(g.anggota.join(', '))}">${labelKk}${escHtml(g.nama)}${anggotaLabel}</option>`;
    });
  } catch(e) {}
  let currentYear = new Date().getFullYear();
  let yearOptions = '';
  for (let y = currentYear - 2; y <= currentYear + 3; y++) {
    yearOptions += `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`;
  }
  let htmlForm = `
    <div class="p-2 space-y-3 text-xs">
      <div>
        <label class="font-bold text-gray-600 mb-1 block">Pilih Keluarga (Nomor KK)</label>
        <select id="iuran-pilih-kk" class="w-full p-2 border rounded-xl bg-white" onchange="isiOtomatisKKIuran(this)">
          ${kkOptions}
        </select>
      </div>
      <div id="iuran-anggota-kk" class="hidden bg-sky-50 border border-sky-100 p-2.5 rounded-xl text-[11px] text-sky-800"></div>
      <div>
        <label class="font-bold text-gray-600 mb-1 block">Nomor KK</label>
        <input type="text" id="iuran-input-kk" class="w-full p-2 border rounded-xl bg-gray-50" readonly>
      </div>
      <div>
        <label class="font-bold text-gray-600 mb-1 block">Kepala Keluarga</label>
        <input type="text" id="iuran-input-nama" class="w-full p-2 border rounded-xl bg-gray-50" readonly>
      </div>
      <div>
        <label class="font-bold text-gray-600 mb-1 block">NIK Kepala Keluarga</label>
        <input type="text" id="iuran-input-nik" class="w-full p-2 border rounded-xl bg-gray-50" readonly>
      </div>
      <div>
        <label class="font-bold text-gray-600 mb-1 block">Bulan Iuran</label>
        <select id="iuran-input-bulan" class="w-full p-2 border rounded-xl bg-white">
          <option value="Januari">Januari</option><option value="Februari">Februari</option><option value="Maret">Maret</option>
          <option value="April">April</option><option value="Mei">Mei</option><option value="Juni">Juni</option>
          <option value="Juli">Juli</option><option value="Agustus">Agustus</option><option value="September">September</option>
          <option value="Oktober">Oktober</option><option value="November">November</option><option value="Desember">Desember</option>
        </select>
      </div>
      <div>
        <label class="font-bold text-gray-600 mb-1 block">Tahun</label>
        <select id="iuran-input-tahun" class="w-full p-2 border rounded-xl bg-white">
          ${yearOptions}
        </select>
      </div>
      <div>
        <label class="font-bold text-gray-600 mb-1 block">Nominal Tagihan (Rp)</label>
        <input type="number" id="iuran-input-nominal" value="25000" class="w-full p-2 border rounded-xl bg-white">
      </div>
      <div>
        <label class="font-bold text-gray-600 mb-1 block">Status Pembayaran</label>
        <select id="iuran-input-status" class="w-full p-2 border rounded-xl bg-white">
          <option value="Belum Lunas">Belum Lunas</option>
          <option value="Menunggu Verifikasi">Menunggu Verifikasi</option>
          <option value="Lunas">Lunas</option>
        </select>
      </div>
      <button type="button" onclick="simpanIuranBaruRT(event)" class="w-full bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl font-bold shadow transition mt-2">Simpan Tagihan Iuran</button>
    </div>
  `;
  document.getElementById('formModalTitle').innerText = 'Tambah Tagihan Iuran';
  document.getElementById('dynamicForm').innerHTML = htmlForm;
  document.getElementById('btn-hapus-modal').style.display = 'none';
  let modal = new bootstrap.Modal(document.getElementById('formModal'));
  modal.show();
}

function isiOtomatisKKIuran(selectEl) {
  let opt = selectEl.options[selectEl.selectedIndex];
  let kk = opt ? (opt.value || '') : '';
  let nama = opt ? (opt.getAttribute('data-nama') || '') : '';
  let nik = opt ? (opt.getAttribute('data-nik') || '') : '';
  let anggota = opt ? (opt.getAttribute('data-anggota') || '') : '';
  if (kk === 'undefined') kk = '';
  if (nama === 'undefined') nama = '';
  if (nik === 'undefined') nik = '';
  if (anggota === 'undefined') anggota = '';
  document.getElementById('iuran-input-kk').value = kk;
  document.getElementById('iuran-input-nama').value = nama;
  document.getElementById('iuran-input-nik').value = nik;
  let box = document.getElementById('iuran-anggota-kk');
  if (box) {
    if (anggota) {
      box.innerHTML = '<i class="bi bi-people-fill me-1"></i><b>Anggota keluarga:</b> ' + anggota;
      box.classList.remove('hidden');
    } else {
      box.classList.add('hidden');
    }
  }
}

async function simpanIuranBaruRT(event) {
  if (event) event.preventDefault();
  let formData = {
    nik: document.getElementById('iuran-input-nik').value,
    nama: document.getElementById('iuran-input-nama').value,
    no_kk: document.getElementById('iuran-input-kk').value,
    bulan: document.getElementById('iuran-input-bulan').value,
    tahun: document.getElementById('iuran-input-tahun').value,
    nominal: document.getElementById('iuran-input-nominal').value || '25000',
    status: document.getElementById('iuran-input-status').value,
    tanggal_bayar: '-',
    diterima_oleh: '-'
  };
  if(!formData.no_kk && !formData.nik) {
    alert('Silakan pilih keluarga terlebih dahulu!');
    return;
  }
  if (formData.status.toUpperCase() === 'LUNAS') {
    let nowFormatted = formatWIBDateTime(new Date());
    formData.tanggal_bayar = nowFormatted;
    formData.diterima_oleh = 'RT 5 (' + (session?.nama || 'Pengurus') + ')';
    let kasItem = {
      id: generateSecureId('KAS'),
      tanggal: nowFormatted,
      pemasukan: Number(formData.nominal) || 0,
      pengeluaran: 0,
      keterangan: `Pembayaran Iuran ${formData.bulan} ${formData.tahun} (${formData.nama})`,
      foto_url: '-'
    };
    try {
      await safeSupabaseInsert('Keuangan', [kasItem]);
      delete menuDataCache['Keuangan'];
    } catch (e) {}
  }
  const res = await callRpcPost('simpanDataKeSheet', { sheetName: 'Iuran', formData: formData });
  if (res && res.status === 'success') {
    showUIToast('Tagihan iuran berhasil ditambahkan!', 'success');
    let modalEl = document.getElementById('formModal');
    let modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (modalInstance) modalInstance.hide();
    if (typeof clearAppCache === 'function') clearAppCache();
    loadIuranView();
  } else {
    showUIToast('Gagal menyimpan: ' + (res.message || 'Terjadi kesalahan'), 'error');
  }
}

// Poster QRIS: bila img/qris.jpg berhasil dimuat, header sintetis & aksen CSS
// disembunyikan (poster sudah memuat logo/GPN & aksen merahnya sendiri); bila
// gagal, fallback tampil.
function qrisBgReady(ok) {
  var h = document.getElementById('qris-synth-header');
  if (h) h.style.display = ok ? 'none' : 'flex';
  var a = document.getElementById('qris-css-accent');
  if (a) a.style.display = ok ? 'none' : 'block';
}

function switchTabBayar(type) {
  let btnQris = document.getElementById('tab-qris-btn');
  let btnTf = document.getElementById('tab-tf-btn');
  let boxQris = document.getElementById('content-qris');
  let boxTf = document.getElementById('content-tf');
  if(type === 'qris') {
    btnQris.className = "py-2 rounded-lg bg-white text-blue-600 shadow-sm transition font-bold";
    btnTf.className = "py-2 rounded-lg text-gray-500 transition";
    boxQris.classList.remove('hidden');
    boxTf.classList.add('hidden');
  } else {
    btnTf.className = "py-2 rounded-lg bg-white text-blue-600 shadow-sm transition font-bold";
    btnQris.className = "py-2 rounded-lg text-gray-500 transition";
    boxTf.classList.remove('hidden');
    boxQris.classList.add('hidden');
  }
}

const originalLoadMenuIuran = window.loadMenu;
window.loadMenu = async function(menu) {
  if (menu === 'Iuran') {
    currentActiveMenu = menu;
    syncActiveNav(menu);
    document.getElementById('page-title').innerText = 'Iuran Warga';
    document.getElementById('rek-info').style.display = 'none';
    await loadIuranView();
  } else {
    if (typeof originalLoadMenuIuran === 'function') originalLoadMenuIuran(menu);
  }
};