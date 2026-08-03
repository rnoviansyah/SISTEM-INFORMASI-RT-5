// ==========================================================
// ==== MODUL ASPIRASI & KOTAK SARAN ANONIM =================
// ==========================================================

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
          <h3 class="font-bold text-xs text-gray-700 uppercase tracking-wide">💬 Daftar Aspirasi Masuk (100% Rahasia & Anonim)</h3>
          <button onclick="loadMenu('Aspirasi')" class="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center gap-1"><i class="bi bi-arrow-clockwise"></i> Refresh</button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-gray-100/70 text-gray-600 uppercase font-semibold border-b">
              <tr>
                <th class="p-3 text-center">NO</th>
                <th class="p-3">TANGGAL</th>
                <th class="p-3">ISI ASPIRASI / MASUKAN</th>
                <th class="p-3 text-center">STATUS</th>
                ${isRt ? '<th class="p-3 text-center">AKSI</th>' : ''}
              </tr>
            </thead>
            <tbody id="aspirasi-table-body">
              <tr><td colspan="5" class="text-center p-4 text-gray-400">Memuat aspirasi...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- MODAL TULIS ASPIRASI ANONIM -->
    <div id="modal-aspirasi" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="bg-white p-5 rounded-2xl w-full max-w-md shadow-2xl relative">
        <button onclick="tutupModalAspirasi()" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-lg w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">&times;</button>
        
        <div class="mb-4 border-b pb-2">
          <h3 class="font-bold text-gray-800 text-sm">Tulis Aspirasi / Saran</h3>
          <p class="text-[11px] text-gray-500">Aman dan 100% anonim, identitas lu tidak akan dicatat di sistem.</p>
        </div>

        <form id="formAspirasi" onsubmit="submitAspirasi(event)" class="space-y-3">
          <div>
            <label class="block text-[11px] font-bold text-gray-600 uppercase mb-1">ISI ASPIRASI / MASUKAN</label>
            <textarea id="aspirasiIsi" rows="4" required class="w-full p-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Tulis kritik, saran, atau masukan untuk kemajuan RT 05..."></textarea>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <button type="button" onclick="tutupModalAspirasi()" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold transition">Batal</button>
            <button type="submit" id="btnSubmitAspirasi" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow transition">Kirim Secara Anonim</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('main-content').innerHTML = html;
  renderTabelAspirasiRows(rows, isRt);
}

function renderTabelAspirasiRows(rows, isRt) {
  let tbody = document.getElementById('aspirasi-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center p-4 text-gray-400">Belum ada aspirasi yang masuk.</td></tr>`;
    return;
  }

  rows.forEach((r, i) => {
    let idVal = r[0] || '';
    let tglVal = r[1] || '-';
    let isiVal = r[2] || '-';
    let statusVal = r[3] || 'Baru';

    let aksiHtml = isRt ? `
      <button onclick="hapusAspirasi('${idVal}')" class="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 px-2 py-1 rounded-lg text-[10px] font-bold transition">
        <i class="bi bi-trash"></i> Hapus
      </button>
    ` : '-';

    tbody.innerHTML += `
      <tr class="border-b hover:bg-gray-50/50 transition">
        <td class="p-3 text-center text-gray-400">${i + 1}</td>
        <td class="p-3 text-gray-600 font-mono text-[10px]">${tglVal}</td>
        <td class="p-3 font-medium text-gray-800" style="white-space: pre-wrap;">${isiVal}</td>
        <td class="p-3 text-center"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">${statusVal}</span></td>
        ${isRt ? `<td class="p-3 text-center">${aksiHtml}</td>` : ''}
      </tr>`;
  });
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

  let payload = {
    tanggal: new Date().toLocaleDateString('id-ID'),
    isi_aspirasi: isi,
    status: 'Baru'
  };

  const res = await callGASPost('simpanDataKeSheet', {
    sheetName: 'Aspirasi',
    formData: payload
  });

  btn.disabled = false;
  btn.innerText = 'Kirim Secara Anonim';
  alert(res ? res.message : 'Aspirasi berhasil dikirim secara anonim!');
  tutupModalAspirasi();
  loadMenu('Aspirasi');
}

async function hapusAspirasi(id) {
  showUIConfirm('Apakah Anda yakin ingin menghapus aspirasi ini dari database?', async function() {
    const res = await callGASPost('hapusDataDariSheet', {
      sheetName: 'Aspirasi',
      id: id
    });
    showUIToast(res ? res.message : 'Berhasil dihapus', 'success');
    loadMenu('Aspirasi');
  }, 'Hapus Aspirasi');
}

const originalLoadMenuAspirasi = window.loadMenu;
window.loadMenu = async function(menu) {
  if (menu === 'Aspirasi') {
    currentActiveMenu = menu;
    syncActiveNav(menu);
    document.getElementById('page-title').innerText = 'Aspirasi Warga';
    document.getElementById('main-content').innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><br><small class="text-muted mt-2 d-block">Memuat kotak aspirasi...</small></div>';
    document.getElementById('rek-info').style.display = 'none';

    const res = await callGASGet('getTableData', { sheetName: 'Aspirasi' });
    if (res) {
      currentHeaders = res.headers || [];
      currentRows = res.rows || [];
      renderAspirasiView(res);
    }
  } else {
    if (typeof originalLoadMenuAspirasi === 'function') originalLoadMenuAspirasi(menu);
  }
};
