// PAGINATION SERVER-SIDE (patch v8): hanya halaman aktif yang diunduh + pencarian
// dikirim ke server. Bila RPC v8 belum terpasang, otomatis fallback ke alur lama
// (fetch semua + slice di klien) — aplikasi tidak pernah rusak.
let aspirasiServerMode = false;
let aspirasiSearch = '';
let aspirasiTotal = 0;
let aspirasiSearchTimer = null;

function renderAspirasiView(data) {
  let rows = data.rows || [];
  let isRt = session && session.role === 'RT';
  let html = `
    <div class="p-1 text-gray-800 font-sans space-y-4">
      <div class="flex justify-between items-center flex-wrap gap-2">
        <h2 class="font-bold text-base text-gray-800"><i class="bi bi-chat-heart me-2 text-blue-600"></i>Aspirasi & Kotak Saran Warga</h2>
        <button onclick="bukaModalAspirasi()" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-xl text-xs shadow transition flex items-center gap-1">
          <i class="bi bi-plus-lg"></i> Tulis Aspirasi Anonim
        </button>
      </div>
      <div class="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 p-4">
        <div class="flex justify-between items-center mb-3">
          <h3 class="font-bold text-xs text-gray-700 uppercase tracking-wide">💬 Daftar Aspirasi Masuk ${isRt ? '(Khusus RT: Nama Pengirim Terlihat)' : '(100% Rahasia & Anonim Untuk Warga)'}</h3>
          <button onclick="loadMenu('Aspirasi')" class="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center gap-1"><i class="bi bi-arrow-clockwise"></i> Refresh</button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-gray-100/70 text-gray-600 uppercase font-semibold border-b">
              <tr>
                <th class="p-3 text-center">NO</th>
                <th class="p-3">TANGGAL</th>
                ${isRt ? '<th class="p-3 text-blue-600 font-bold">PENGIRIM (KHUSUS RT)</th>' : ''}
                <th class="p-3">ISI ASPIRASI / MASUKAN</th>
                ${isRt ? '<th class="p-3 text-center">AKSI</th>' : ''}
              </tr>
            </thead>
            <tbody id="aspirasi-table-body">
              <tr><td colspan="${isRt ? '5' : '4'}" class="text-center p-4 text-gray-400">Memuat aspirasi...</td></tr>
            </tbody>
          </table>
          <div id="aspirasi-pagination" class="px-2 py-1"></div>
        </div>
      </div>
    </div>
    <!-- MODAL TULIS ASPIRASI -->
    <div id="modal-aspirasi" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="bg-white p-5 rounded-2xl w-full max-w-md shadow-2xl relative">
        <button onclick="tutupModalAspirasi()" class="absolute top-4 right-4 z-50 text-gray-400 hover:text-gray-600 font-bold text-lg w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">&times;</button>
        <div class="mb-4 border-b pb-2">
          <h3 class="font-bold text-gray-800 text-sm">Tulis Aspirasi / Saran</h3>
          <p class="text-[11px] text-gray-500">Kirim kritik, saran, atau masukan untuk kemajuan RT 5.</p>
        </div>
        <form id="formAspirasi" onsubmit="submitAspirasi(event)" class="space-y-3">
          <div>
            <label class="block text-[11px] font-bold text-gray-600 uppercase mb-1">ISI ASPIRASI / MASUKAN</label>
            <textarea id="aspirasiIsi" rows="4" required class="w-full p-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Tulis kritik, saran, atau masukan untuk kemajuan RT 5..."></textarea>
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" onclick="tutupModalAspirasi()" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold transition">Batal</button>
            <button type="submit" id="btnSubmitAspirasi" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow transition">Kirim Aspirasi</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.getElementById('main-content').innerHTML = html;
  renderTabelAspirasiRows(rows, isRt, data.headers || []);
  let searchInp = document.getElementById('searchInput');
  if (searchInp) {
    searchInp.onkeyup = function() {
      clearTimeout(aspirasiSearchTimer);
      aspirasiSearchTimer = setTimeout(function() {
        let val = String(searchInp.value || '');
        if (aspirasiServerMode) {
          // Server-side: kata kunci dikirim ke RPC (dicari di SEMUA data, bukan cuma halaman aktif).
          loadAspirasiView(1, val);
        } else {
          // Fallback: filter di klien lalu render ulang dari halaman 1.
          let kw = val.toLowerCase().trim();
          let filtered = kw
            ? (currentRows || []).filter(r => r && r.some(v => String(v === null || v === undefined ? '' : v).toLowerCase().includes(kw)))
            : (currentRows || []);
          if (typeof Pagination !== 'undefined' && Pagination.reset) Pagination.reset('Aspirasi');
          renderAspirasiView({ headers: currentHeaders, rows: filtered });
        }
      }, 350);
    };
  }
}
function renderTabelAspirasiRows(rows, isRt, headers = []) {
  let tbody = document.getElementById('aspirasi-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  let colCount = isRt ? 5 : 4;
  if (!rows || rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${colCount}" class="text-center p-4 text-gray-400">Belum ada aspirasi yang masuk.</td></tr>`;
    if (typeof Pagination !== 'undefined' && Pagination.render) {
      Pagination.render(document.getElementById('aspirasi-pagination'), 'Aspirasi', 0);
    }
    return;
  }
  let idIdx = headers.indexOf('id');
  let tglIdx = headers.indexOf('tanggal');
  let isiIdx = headers.indexOf('isi_aspirasi');
  let namaIdx = headers.indexOf('nama');
  // Pagination: mode server-side = baris sudah halaman aktif dari RPC (patch v8);
  // mode lama (fallback) = slice di klien seperti sebelumnya.
  let pageRows = (!aspirasiServerMode && typeof Pagination !== 'undefined' && Pagination.slice) ? Pagination.slice('Aspirasi', rows) : rows;
  let pageStart = (typeof Pagination !== 'undefined') ? (Pagination.page('Aspirasi') - 1) * Pagination.PAGE_SIZE : 0;
  pageRows.forEach((r, i) => {
    let idVal = (idIdx > -1 && r[idIdx]) ? r[idIdx] : (r[0] || '');
    let tglVal = (tglIdx > -1 && r[tglIdx]) ? r[tglIdx] : (r[1] || '-');
    let isiVal = (isiIdx > -1 && r[isiIdx]) ? r[isiIdx] : (r[2] || '-');
    let namaVal = (namaIdx > -1 && r[namaIdx]) ? r[namaIdx] : (r[4] || '-');
    let pengirimHtml = '-';
    if (namaVal && namaVal !== '-' && namaVal !== 'null') {
      pengirimHtml = namaVal;
    } else {
      pengirimHtml = `<span class="text-gray-400 italic font-normal">Anonim (Data Lama)</span>`;
    }
    let aksiHtml = isRt ? `
      <button onclick="hapusAspirasi('${idVal}')" class="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 px-2 py-1 rounded-lg text-[10px] font-bold transition">
        <i class="bi bi-trash"></i> Hapus
      </button>
    ` : '-';
    tbody.innerHTML += `
      <tr class="border-b hover:bg-gray-50/50 transition">
        <td class="p-3 text-center text-gray-400">${pageStart + i + 1}</td>
        <td class="p-3 text-gray-600 font-mono text-[10px]">${tglVal}</td>
        ${isRt ? `<td class="p-3 font-semibold text-blue-700 text-xs">${pengirimHtml}</td>` : ''}
        <td class="p-3 font-medium text-gray-800" style="white-space: pre-wrap;">${isiVal}</td>
        ${isRt ? `<td class="p-3 text-center">${aksiHtml}</td>` : ''}
      </tr>`;
  });
  if (typeof Pagination !== 'undefined' && Pagination.render) {
    let totalCount = aspirasiServerMode ? aspirasiTotal : rows.length;
    Pagination.render(document.getElementById('aspirasi-pagination'), 'Aspirasi', totalCount, function() {
      if (aspirasiServerMode) {
        // Klik halaman → ambil halaman itu dari server (hanya 25 baris diunduh).
        loadAspirasiView(Pagination.page('Aspirasi'), aspirasiSearch);
      } else {
        renderTabelAspirasiRows(currentRows && currentRows.length ? currentRows : rows, isRt, headers);
      }
    });
  }
}
function bukaModalAspirasi() {
  document.getElementById('modal-aspirasi').classList.remove('hidden');
}
function tutupModalAspirasi() {
  document.getElementById('modal-aspirasi').classList.add('hidden');
  document.getElementById('formAspirasi').reset();
}
async function submitAspirasi(e) {
  e.preventDefault();
  let isi = document.getElementById('aspirasiIsi').value;
  let btn = document.getElementById('btnSubmitAspirasi');
  btn.disabled = true;
  btn.innerText = 'Mengirim...';
  let namaPengirim = session.nama || session.nik || 'Warga';
  let payload = {
    tanggal: formatWIBDateTime(new Date()),
    isi_aspirasi: isi,
    status: 'Baru',
    nama: namaPengirim
  };
  const res = await callRpcPost('simpanDataKeSheet', {
    sheetName: 'Aspirasi',
    formData: payload
  });
  btn.disabled = false;
  btn.innerText = 'Kirim Aspirasi';
  alert(res ? res.message : 'Aspirasi berhasil dikirim!');
  tutupModalAspirasi();
  loadMenu('Aspirasi');
}
async function hapusAspirasi(id) {
  showUIConfirm('Apakah Anda yakin ingin menghapus aspirasi ini dari database?', async function() {
    const res = await callRpcPost('hapusDataDariSheet', {
      sheetName: 'Aspirasi',
      id: id
    });
    showUIToast(res ? res.message : 'Berhasil dihapus', 'success');
    loadMenu('Aspirasi');
  }, 'Hapus Aspirasi');
}
async function loadAspirasiView(page, search) {
  currentActiveMenu = 'Aspirasi';
  syncActiveNav('Aspirasi');
  document.getElementById('page-title').innerText = 'Aspirasi Warga';
  document.getElementById('main-content').innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><br><small class="text-muted mt-2 d-block">Memuat kotak aspirasi...</small></div>';
  document.getElementById('rek-info').style.display = 'none';
  let pageNum = Math.max(1, parseInt(page, 10) || 1);
  // Pencarian berubah → kembali ke halaman 1 (kata kunci sama saat klik halaman → tidak reset).
  if (typeof search === 'string') {
    if (search !== aspirasiSearch) {
      aspirasiSearch = search;
      if (typeof Pagination !== 'undefined' && Pagination.reset) Pagination.reset('Aspirasi');
    }
  } else {
    // Muat ulang menu (awal/refresh): ikuti isi kotak pencarian saat ini (umumnya kosong
    // karena loadMenu mengosongkannya) supaya filter lama tidak tersisa diam-diam.
    let inputVal = document.getElementById('searchInput') ? String(document.getElementById('searchInput').value || '') : '';
    if (inputVal !== aspirasiSearch) {
      aspirasiSearch = inputVal;
      if (typeof Pagination !== 'undefined' && Pagination.reset) Pagination.reset('Aspirasi');
    }
  }
  // Mode server-side (patch v8): hanya halaman aktif yang diunduh, pencarian di server.
  const res = await callRpcGet('getTablePage', { sheetName: 'Aspirasi', page: pageNum, search: aspirasiSearch });
  if (res && res.status === 'success') {
    aspirasiServerMode = true;
    aspirasiTotal = (res.total !== undefined && res.total !== null) ? res.total : (res.rows || []).length;
    currentHeaders = res.headers || [];
    currentRows = res.rows || [];
    renderAspirasiView(res);
    return;
  }
  // Fallback otomatis: RPC v8 belum terpasang → alur lama (fetch semua + slice di klien).
  aspirasiServerMode = false;
  const res2 = await callRpcGet('getTableData', { sheetName: 'Aspirasi' });
  if (res2) {
    aspirasiTotal = (res2.rows || []).length;
    currentHeaders = res2.headers || [];
    currentRows = res2.rows || [];
    if (typeof Pagination !== 'undefined' && Pagination.reset) Pagination.reset('Aspirasi');
    renderAspirasiView(res2);
  }
}
window.loadAspirasiView = loadAspirasiView;
const originalLoadMenuAspirasi = window.loadMenu;
window.loadMenu = async function(menu) {
  if (menu === 'Aspirasi') {
    loadAspirasiView();
  } else {
    if (typeof originalLoadMenuAspirasi === 'function') originalLoadMenuAspirasi(menu);
  }
};
