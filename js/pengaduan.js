let rawPengaduanData = [];
let selectedAduanRow = null;

function renderPengaduanCustom(data) {
  rawPengaduanData = data.rows || [];
  let headers = data.headers.map(h => h.toLowerCase().trim());

  let html = `
    <div class="p-1 text-gray-800 font-sans">
      <div class="flex justify-between items-center mb-4">
        <h2 class="font-bold text-base text-gray-800"><i class="bi bi-chat-square-text-fill me-2 text-primary"></i>Daftar Pengaduan Warga</h2>
        ${session.role === 'Warga' ? `
          <button onclick="bukaModalForm()" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-xl text-xs shadow transition">
            + Buat Aduan Baru
          </button>
        ` : ''}
      </div>

      <div class="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-gray-100/70 text-gray-600 uppercase font-semibold border-b">
              <tr>
                <th class="p-3 text-center">No</th>
                <th class="p-3">ID</th>
                <th class="p-3">Tanggal</th>
                <th class="p-3">Pelapor</th>
                <th class="p-3">Jenis Aduan</th>
                <th class="p-3">Status</th>
                <th class="p-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody id="pengaduan-table-body"></tbody>
          </table>
        </div>
      </div>
    </div>

    <div id="modal-detail-pengaduan" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="bg-white p-5 rounded-2xl w-full max-w-sm shadow-2xl relative">
        <button onclick="tutupDetailPengaduan()" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-lg w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">&times;</button>
        
        <div class="mb-3 border-b pb-2 pe-6">
          <h3 class="font-bold text-gray-800 text-sm">Rincian Pengaduan</h3>
        </div>
        <div id="modal-detail-pengaduan-body" class="mb-4 space-y-2 text-xs max-h-[60vh] overflow-y-auto pe-1"></div>
        <div id="pengaduan-action-buttons" class="space-y-2"></div>
        <button onclick="tutupDetailPengaduan()" class="w-full mt-2 bg-gray-100 hover:bg-gray-200 text-gray-600 p-2 rounded-xl text-xs font-bold transition">Tutup</button>
      </div>
    </div>
  `;

  document.getElementById('main-content').innerHTML = html;
  filterDataPengaduan();

  let searchInp = document.getElementById('searchInput');
  if (searchInp) {
    searchInp.onkeyup = function() {
      filterDataPengaduan();
    };
  }
}

function filterDataPengaduan() {
  let searchVal = document.getElementById('searchInput') ? document.getElementById('searchInput').value.toLowerCase().trim() : '';
  
  let headers = currentHeaders.map(h => h.toLowerCase().trim());
  let idIdx = headers.indexOf('id') > -1 ? headers.indexOf('id') : 0;
  let namaIdx = headers.findIndex(h => h.includes('nama'));
  let jenisIdx = headers.findIndex(h => h.includes('jenis'));

  let filtered = [...rawPengaduanData].filter(row => {
    let rowId = (row[idIdx] || '').toLowerCase();
    let namaText = (row[namaIdx] || '').toLowerCase();
    let jenisText = (row[jenisIdx] || '').toLowerCase();
    return rowId.includes(searchVal) || namaText.includes(searchVal) || jenisText.includes(searchVal);
  });

  let tbody = document.getElementById('pengaduan-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center p-4 text-gray-400">Tidak ada data aduan.</td></tr>`;
  } else {
    filtered.reverse().forEach((r, i) => {
      let tglIdx = headers.findIndex(h => h.includes('tanggal') || h.includes('tgl') || h.includes('waktu'));
      let statusIdx = headers.indexOf('status');
      let statusVal = r[statusIdx] || 'Belum di verifikasi';
      let badgeColor = statusVal.toLowerCase().includes('selesai') ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700';

      let btnAksi = session.role === 'RT' 
        ? `<button onclick="event.stopPropagation(); bukaModalEdit('${r[idIdx]}')" class="bg-blue-50 text-blue-600 px-2 py-1 rounded-md text-[11px] font-bold border border-blue-200">Edit</button>`
        : `<button onclick="event.stopPropagation(); waKirimLaporan('aduan', '${r[idIdx]}')" class="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md text-[11px] font-bold border border-emerald-200">WA</button>`;

      tbody.innerHTML += `
        <tr class="border-b hover:bg-blue-50/50 cursor-pointer transition" onclick="showDetailPengaduan('${r[idIdx]}')">
          <td class="p-3 text-center text-gray-400">${i + 1}</td>
          <td class="p-3 text-[10px] font-mono text-gray-600">${r[idIdx]}</td>
          <td class="p-3 font-medium">${r[tglIdx] || '-'}</td>
          <td class="p-3 font-medium text-gray-800">${r[namaIdx] || '-'}</td>
          <td class="p-3 text-gray-600">${r[jenisIdx] || '-'}</td>
          <td class="p-3"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeColor}">${statusVal}</span></td>
          <td class="p-3 text-center">${btnAksi}</td>
        </tr>`;
    });
  }
}

function showDetailPengaduan(id) {
  let headers = currentHeaders.map(h => h.toLowerCase().trim());
  let idIdx = headers.indexOf('id') > -1 ? headers.indexOf('id') : 0;
  let row = rawPengaduanData.find(r => r[idIdx] === id);
  if (!row) return;

  selectedAduanRow = row;
  let fotoIdx = headers.findIndex(h => h.includes('foto') || h.includes('bukti'));
  let fotoUrl = row[fotoIdx] || '';
  let noHpIdx = headers.findIndex(h => h.includes('hp') || h.includes('wa') || h.includes('telp') || h.includes('nomor'));
  let noHpWarga = noHpIdx > -1 ? row[noHpIdx] : '';

  let imgHtml = (fotoUrl && fotoUrl !== '-') 
    ? `<div class="mt-2"><p class="text-[10px] text-gray-400 font-bold uppercase mb-1">Bukti Foto:</p><img src="${fotoUrl}" onclick="bukaPopUpFoto('${fotoUrl}')" class="w-full max-h-40 object-contain rounded-xl border cursor-pointer shadow-sm"></div>` 
    : '';

  let detailHtml = '';
  currentHeaders.forEach((h, idx) => {
    let hLower = h.toLowerCase().trim();
    if (hLower.includes('foto') || hLower.includes('bukti') || hLower === 'id' || hLower === 'no') return;
    detailHtml += `
      <div class="border-b pb-1">
        <p class="text-[10px] text-gray-400 font-bold uppercase">${h.replace(/_/g, ' ')}</p>
        <p class="font-semibold text-gray-800">${row[idx] || '-'}</p>
      </div>`;
  });
  detailHtml += imgHtml;

  document.getElementById('modal-detail-pengaduan-body').innerHTML = detailHtml;

  let actionHtml = '';
  if (session.role === 'RT') {
    actionHtml = `
      <button onclick="bukaModalEdit('${id}'); tutupDetailPengaduan();" class="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl text-xs font-bold shadow-sm mb-2">Edit / Ubah Status</button>
      <button onclick="waKirimLaporanKeWarga('${id}', '${noHpWarga}'); tutupDetailPengaduan();" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-xl text-xs font-bold shadow-sm">Kirim Laporan (WA)</button>`;
  } else {
    actionHtml = `
      <button onclick="waKirimLaporan('aduan', '${id}')" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-xl text-xs font-bold shadow-sm">Kirim via WhatsApp</button>`;
  }
  document.getElementById('pengaduan-action-buttons').innerHTML = actionHtml;

  document.getElementById('modal-detail-pengaduan').classList.remove('hidden');
}

function tutupDetailPengaduan() {
  document.getElementById('modal-detail-pengaduan').classList.add('hidden');
}

function waKirimLaporanKeWarga(id, noHp) {
  let cleanNo = noHp ? noHp.toString().replace(/[^0-9]/g, '') : '';
  if (cleanNo.startsWith('0')) {
    cleanNo = '62' + cleanNo.slice(1);
  }
  if (!cleanNo) {
    cleanNo = prompt("Nomor WA warga tidak terdeteksi otomatis di kolom. Silakan ketik manual (ex: 628xxx):");
    if (cleanNo) cleanNo = cleanNo.toString().replace(/[^0-9]/g, '');
  }
  if (cleanNo) {
    bukaWa(cleanNo, `id aduan/surat ${id} sudah selesai.`);
  }
}

function waKirimLaporan(jenis, id) {
  let pesan = jenis === 'aduan' 
    ? `ini adalah id aduan saya : ${id} mohon segera di tindak lanjuti.`
    : `ini adalah id surat pengantar saya : ${id} mohon segera di tindak lanjuti.`;
  bukaWa(noWaAdmin, pesan);
}

const originalLoadMenuPengaduan = window.loadMenu;
window.loadMenu = async function(menu) {
  if (menu === 'Pengaduan') {
    currentActiveMenu = menu;
    syncActiveNav(menu);
    document.getElementById('page-title').innerText = 'Pengaduan Warga';
    document.getElementById('main-content').innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><br><small class="text-muted mt-2 d-block">Memuat pengaduan...</small></div>';
    document.getElementById('rek-info').style.display = 'none';

    const res = await callGASGet('getTableData', { sheetName: 'Pengaduan' });
    if (res) {
      currentHeaders = res.headers || [];
      currentRows = res.rows || [];
      renderPengaduanCustom(res);
    }
  } else {
    if (typeof originalLoadMenuPengaduan === 'function') originalLoadMenuPengaduan(menu);
  }
};
