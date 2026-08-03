let rawKeuanganData = [];
let selectedKeuanganRow = null;

function renderKeuanganCustom(data) {
  rawKeuanganData = data.rows || [];

  let html = `
    <div class="p-1 text-gray-800 font-sans">
      <div class="grid grid-cols-3 gap-3 mb-4">
        <div class="bg-white border-l-4 border-emerald-500 p-3 rounded-xl shadow-sm">
          <p class="text-[10px] text-gray-500 uppercase font-bold">Masuk</p>
          <p id="card-masuk" class="font-bold text-emerald-600 text-sm md:text-base">Rp 0</p>
        </div>
        <div class="bg-white border-l-4 border-rose-500 p-3 rounded-xl shadow-sm">
          <p class="text-[10px] text-gray-500 uppercase font-bold">Keluar</p>
          <p id="card-keluar" class="font-bold text-rose-600 text-sm md:text-base">Rp 0</p>
        </div>
        <div class="bg-white border-l-4 border-blue-500 p-3 rounded-xl shadow-sm">
          <p class="text-[10px] text-gray-500 uppercase font-bold">Saldo</p>
          <p id="card-saldo" class="font-bold text-blue-600 text-sm md:text-base">Rp 0</p>
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        ${session.role === 'RT' ? `
          <button onclick="bukaModalForm()" class="col-span-2 md:col-span-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-lg text-xs shadow transition">
            + Transaksi Baru
          </button>
        ` : ''}
        <select id="filter-periode" onchange="filterDataKeuangan()" class="p-2 border rounded-lg text-xs bg-white shadow-sm">
          <option value="all">Semua Periode</option>
          <option value="hari">Hari Ini</option>
          <option value="bulan">Bulan Ini</option>
          <option value="tahun">Tahun Ini</option>
          <option value="custom">Pilih Tanggal</option>
        </select>
        <select id="sort-order" onchange="filterDataKeuangan()" class="p-2 border rounded-lg text-xs bg-white shadow-sm">
          <option value="newest">Terbaru</option>
          <option value="oldest">Terlama</option>
        </select>
        <button onclick="window.print()" class="bg-gray-800 text-white rounded-lg text-xs py-2 font-bold shadow hover:bg-gray-900 transition">
          <i class="bi bi-printer me-1"></i> Cetak Laporan
        </button>
      </div>

      <div id="custom-date-box" class="hidden grid grid-cols-2 gap-2 mb-4">
        <div>
          <label class="text-[10px] text-gray-500 font-bold ml-1">Dari Tanggal</label>
          <input type="date" id="date-start" onchange="filterDataKeuangan()" class="w-full p-2 border rounded-lg text-xs bg-white">
        </div>
        <div>
          <label class="text-[10px] text-gray-500 font-bold ml-1">Sampai Tanggal</label>
          <input type="date" id="date-end" onchange="filterDataKeuangan()" class="w-full p-2 border rounded-lg text-xs bg-white">
        </div>
      </div>

      <div class="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-gray-100/70 text-gray-600 uppercase font-semibold border-b">
              <tr>
                <th class="p-3 text-center">No</th>
                <th class="p-3">ID</th>
                <th class="p-3">Tgl</th>
                <th class="p-3">Keterangan</th>
                <th class="p-3 text-right">Masuk</th>
                <th class="p-3 text-right">Keluar</th>
                <th class="p-3 text-center">Bukti</th>
                <th class="p-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody id="keuangan-table-body"></tbody>
          </table>
        </div>
      </div>
    </div>

    <div id="modal-detail-keuangan" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="bg-white p-5 rounded-2xl w-full max-w-sm shadow-2xl animate-fade-in">
        <div class="flex justify-between items-center mb-3 border-b pb-2">
          <h3 class="font-bold text-gray-800 text-sm">Rincian Transaksi</h3>
          <button onclick="tutupDetailKeuangan()" class="text-gray-400 hover:text-gray-600 font-bold text-lg">&times;</button>
        </div>
        <div id="modal-detail-body" class="mb-4"></div>
        
        <a id="btn-wa-detail" href="#" target="_blank" class="block w-full text-center bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-xl font-bold text-xs shadow-sm transition mb-2">
          <i class="bi bi-whatsapp me-1"></i> Laporkan Masalah (WA)
        </a>
        
        ${session.role === 'RT' ? `
          <div class="grid grid-cols-2 gap-2 border-t pt-3 mt-2">
            <button onclick="editDariDetail()" class="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl text-xs font-bold shadow-sm">Edit Data</button>
            <button onclick="hapusDariDetail()" class="bg-rose-600 hover:bg-rose-700 text-white p-2 rounded-xl text-xs font-bold shadow-sm">Hapus Data</button>
          </div>
        ` : ''}
        
        <button onclick="tutupDetailKeuangan()" class="w-full mt-2 bg-gray-100 hover:bg-gray-200 text-gray-600 p-2 rounded-xl text-xs font-bold transition">Tutup</button>
      </div>
    </div>
  `;

  document.getElementById('main-content').innerHTML = html;
  filterDataKeuangan();

  let searchInp = document.getElementById('searchInput');
  if (searchInp) {
    searchInp.onkeyup = function() {
      filterDataKeuangan();
    };
  }
}

function filterDataKeuangan() {
  let p = document.getElementById('filter-periode') ? document.getElementById('filter-periode').value : 'all';
  let o = document.getElementById('sort-order') ? document.getElementById('sort-order').value : 'newest';
  let searchVal = document.getElementById('searchInput') ? document.getElementById('searchInput').value.toLowerCase().trim() : '';
  let now = new Date();

  let customBox = document.getElementById('custom-date-box');
  if (customBox) {
    if (p === 'custom') customBox.classList.remove('hidden'); 
    else customBox.classList.add('hidden');
  }

  let start = document.getElementById('date-start') ? document.getElementById('date-start').value : '';
  let end = document.getElementById('date-end') ? document.getElementById('date-end').value : '';

  let headers = currentHeaders.map(h => h.toLowerCase().trim());
  let idIdx = headers.indexOf('id') > -1 ? headers.indexOf('id') : 0;
  let tglIdx = headers.findIndex(h => h.includes('tanggal') || h.includes('tgl'));
  let pemIdx = headers.indexOf('pemasukan');
  let pengIdx = headers.indexOf('pengeluaran');
  let ketIdx = headers.indexOf('keterangan');
  let fotoIdx = headers.findIndex(h => h.includes('foto') || h.includes('bukti'));

  let filtered = [...rawKeuanganData].filter(row => {
    let dateStr = row[tglIdx] || '';
    let dateParts = dateStr.split(' ')[0].split('/');
    let d = dateParts.length === 3 ? new Date(dateParts[2], dateParts[1] - 1, dateParts[0]) : new Date();

    let dateMatch = true;
    if (p === 'hari') dateMatch = d.toDateString() === now.toDateString();
    else if (p === 'bulan') dateMatch = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    else if (p === 'tahun') dateMatch = d.getFullYear() === now.getFullYear();
    else if (p === 'custom') {
      let rowTime = d.getTime();
      let sTime = start ? new Date(start).setHours(0,0,0,0) : -Infinity;
      let eTime = end ? new Date(end).setHours(23,59,59,999) : Infinity;
      dateMatch = rowTime >= sTime && rowTime <= eTime;
    }

    let rowId = (row[idIdx] || '').toLowerCase();
    let ketText = (row[ketIdx] || '').toLowerCase();
    let searchMatch = rowId.includes(searchVal) || ketText.includes(searchVal);

    return dateMatch && searchMatch;
  });

  if (o === 'oldest') {
    filtered.reverse();
  }

  let tbody = document.getElementById('keuangan-table-body');
  if (!tbody) return;

  let t = { m: 0, k: 0 };
  tbody.innerHTML = '';

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center p-4 text-gray-400">Tidak ada data transaksi yang cocok.</td></tr>`;
  } else {
    filtered.forEach((r, i) => {
      let pem = Number((r[pemIdx] || '0').toString().replace(/[^0-9]/g, '')) || 0;
      let peng = Number((r[pengIdx] || '0').toString().replace(/[^0-9]/g, '')) || 0;
      
      t.m += pem;
      t.k += peng;

      let fotoUrl = r[fotoIdx] || '';
      let fotoBtn = (fotoUrl && fotoUrl !== '-') 
        ? `<button onclick="event.stopPropagation(); bukaPopUpFoto('${fotoUrl}')" class="text-blue-600 font-bold hover:underline"><i class="bi bi-image me-1"></i>Foto</button>` 
        : '-';

      let btnAksi = session.role === 'RT' 
        ? `<button onclick="event.stopPropagation(); bukaModalEdit('${r[idIdx]}')" class="bg-blue-50 text-blue-600 px-2 py-1 rounded-md text-[11px] font-bold border border-blue-200 hover:bg-blue-100">Edit</button>`
        : `<button onclick="event.stopPropagation(); waLaporMasalahKeuangan('${r[idIdx]}')" class="bg-rose-50 text-rose-600 px-2 py-1 rounded-md text-[11px] font-bold border border-rose-200 hover:bg-rose-100">Laporkan</button>`;

      tbody.innerHTML += `
        <tr class="border-b hover:bg-blue-50/50 cursor-pointer transition" onclick="showDetailKeuangan('${r[idIdx]}')">
          <td class="p-3 text-center text-gray-400">${i + 1}</td>
          <td class="p-3 text-[10px] font-mono text-gray-600">${r[idIdx]}</td>
          <td class="p-3 font-medium whitespace-nowrap">${r[tglIdx] || '-'}</td>
          <td class="p-3 text-gray-800 font-medium">${r[ketIdx] || '-'}</td>
          <td class="p-3 text-right text-emerald-600 font-bold whitespace-nowrap">Rp ${pem.toLocaleString('id-ID')}</td>
          <td class="p-3 text-right text-rose-600 font-bold whitespace-nowrap">Rp ${peng.toLocaleString('id-ID')}</td>
          <td class="p-3 text-center">${fotoBtn}</td>
          <td class="p-3 text-center">${btnAksi}</td>
        </tr>`;
    });
  }

  if (document.getElementById('card-masuk')) document.getElementById('card-masuk').innerText = 'Rp ' + t.m.toLocaleString('id-ID');
  if (document.getElementById('card-keluar')) document.getElementById('card-keluar').innerText = 'Rp ' + t.k.toLocaleString('id-ID');
  if (document.getElementById('card-saldo')) document.getElementById('card-saldo').innerText = 'Rp ' + (t.m - t.k).toLocaleString('id-ID');
}

function showDetailKeuangan(id) {
  let headers = currentHeaders.map(h => h.toLowerCase().trim());
  let idIdx = headers.indexOf('id') > -1 ? headers.indexOf('id') : 0;
  let tglIdx = headers.findIndex(h => h.includes('tanggal') || h.includes('tgl'));
  let pemIdx = headers.indexOf('pemasukan');
  let pengIdx = headers.indexOf('pengeluaran');
  let ketIdx = headers.indexOf('keterangan');
  let fotoIdx = headers.findIndex(h => h.includes('foto') || h.includes('bukti'));

  let row = rawKeuanganData.find(r => r[idIdx] === id);
  if (!row) return;

  selectedKeuanganRow = row;

  let pem = Number((row[pemIdx] || '0').toString().replace(/[^0-9]/g, '')) || 0;
  let peng = Number((row[pengIdx] || '0').toString().replace(/[^0-9]/g, '')) || 0;
  let fotoUrl = row[fotoIdx] || '';

  let imgHtml = (fotoUrl && fotoUrl !== '-') 
    ? `<div class="mt-3"><p class="text-[10px] text-gray-400 font-bold uppercase mb-1">Bukti Lampiran:</p><img src="${fotoUrl}" onclick="bukaPopUpFoto('${fotoUrl}')" class="w-full max-h-48 object-contain rounded-xl border border-gray-200 cursor-pointer shadow-sm hover:opacity-90 transition"></div>` 
    : '';

  let detailHtml = `
    <div class="space-y-2 text-xs">
      <div class="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
        <span class="text-gray-400 font-mono text-[10px]">ID: ${row[idIdx]}</span>
        <span class="text-gray-500 font-bold">${row[tglIdx] || '-'}</span>
      </div>
      <div>
        <p class="text-[10px] text-gray-400 uppercase font-bold">Keterangan:</p>
        <p class="font-semibold text-gray-800 text-sm">${row[ketIdx] || '-'}</p>
      </div>
      <div class="grid grid-cols-2 gap-2 pt-1">
        <div class="bg-emerald-50 p-2 rounded-lg">
          <p class="text-[10px] text-emerald-600 font-bold uppercase">Pemasukan</p>
          <p class="font-bold text-emerald-700 text-sm">Rp ${pem.toLocaleString('id-ID')}</p>
        </div>
        <div class="bg-rose-50 p-2 rounded-lg">
          <p class="text-[10px] text-rose-600 font-bold uppercase">Pengeluaran</p>
          <p class="font-bold text-rose-700 text-sm">Rp ${peng.toLocaleString('id-ID')}</p>
        </div>
      </div>
      ${imgHtml}
    </div>
  `;

  document.getElementById('modal-detail-body').innerHTML = detailHtml;
  
  let msg = `Halo RT 05, saya mau bertanya/melaporkan kendala mengenai Transaksi Keuangan ID: ${row[idIdx]}`;
  document.getElementById('btn-wa-detail').href = `https://wa.me/${noWaAdmin}?text=${encodeURIComponent(msg)}`;

  document.getElementById('modal-detail-keuangan').classList.remove('hidden');
}

function tutupDetailKeuangan() {
  document.getElementById('modal-detail-keuangan').classList.add('hidden');
}

function editDariDetail() {
  if (!selectedKeuanganRow) return;
  let headers = currentHeaders.map(h => h.toLowerCase().trim());
  let idIdx = headers.indexOf('id') > -1 ? headers.indexOf('id') : 0;
  
  tutupDetailKeuangan();
  bukaModalEdit(selectedKeuanganRow[idIdx]);
}

function hapusDariDetail() {
  if (!selectedKeuanganRow) return;
  let headers = currentHeaders.map(h => h.toLowerCase().trim());
  let idIdx = headers.indexOf('id') > -1 ? headers.indexOf('id') : 0;
  let id = selectedKeuanganRow[idIdx];

  showUIConfirm(`Apakah Anda yakin ingin menghapus data transaksi ${id}?`, function() {
    tutupDetailKeuangan();
    editingId = id;
    hapusDataAktif();
  }, 'Hapus Transaksi');
}

function waLaporMasalahKeuangan(id) {
  let msg = `Halo RT 05, saya mau melaporkan kendala/pertanyaan terkait Transaksi Keuangan dengan ID: ${id}`;
  window.open(`https://wa.me/${noWaAdmin}?text=${encodeURIComponent(msg)}`, '_blank');
}

const originalLoadMenuKeuangan = window.loadMenu;
window.loadMenu = async function(menu) {
  if (menu === 'Keuangan') {
    currentActiveMenu = menu;
    syncActiveNav(menu);
    document.getElementById('page-title').innerText = 'Laporan Keuangan';
    document.getElementById('main-content').innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><br><small class="text-muted mt-2 d-block">Memuat data keuangan...</small></div>';
    document.getElementById('rek-info').style.display = 'none';

    const res = await callGASGet('getTableData', { sheetName: 'Keuangan' });
    if (res) {
      currentHeaders = res.headers || [];
      currentRows = res.rows || [];
      renderKeuanganCustom(res);
    }
  } else {
    if (typeof originalLoadMenuKeuangan === 'function') originalLoadMenuKeuangan(menu);
  }
};
