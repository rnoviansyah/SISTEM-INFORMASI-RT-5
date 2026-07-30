let rawWargaData = [];
let selectedWargaRow = null;

function renderWargaCustom(data) {
  rawWargaData = data.rows || [];
  let headers = data.headers.map(h => h.toLowerCase().trim());
  
  let idIdx = headers.indexOf('id') > -1 ? headers.indexOf('id') : 0;
  let nikIdx = headers.indexOf('nik');
  let namaIdx = headers.findIndex(h => h.includes('nama'));
  let alamatIdx = headers.findIndex(h => h.includes('alamat'));

  let html = `
    <div class="p-1 text-gray-800 font-sans">
      <div class="flex justify-between items-center mb-4">
        <h2 class="font-bold text-base text-gray-800"><i class="bi bi-people-fill me-2 text-primary"></i>Data Warga RT 05</h2>
        ${session.role === 'RT' ? `
          <button onclick="bukaModalForm()" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-xl text-xs shadow transition">
            + Tambah Warga Baru
          </button>
        ` : ''}
      </div>

      <div class="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-gray-100/70 text-gray-600 uppercase font-semibold border-b">
              <tr>
                <th class="p-3 text-center">No</th>
                <th class="p-3">NIK</th>
                <th class="p-3">Nama Lengkap</th>
                <th class="p-3">Alamat</th>
                <th class="p-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody id="warga-table-body"></tbody>
          </table>
        </div>
      </div>
    </div>

    <div id="modal-detail-warga" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="bg-white p-5 rounded-2xl w-full max-w-sm shadow-2xl relative">
        <button onclick="tutupDetailWarga()" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-lg w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">&times;</button>
        
        <div class="mb-3 border-b pb-2 pe-6">
          <h3 class="font-bold text-gray-800 text-sm">Rincian Data Warga</h3>
        </div>
        <div id="modal-detail-warga-body" class="mb-4 space-y-2 text-xs max-h-[60vh] overflow-y-auto pe-1"></div>
        
        <div id="warga-action-buttons" class="space-y-2 mb-2"></div>
        
        <button onclick="tutupDetailWarga()" class="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 p-2 rounded-xl text-xs font-bold transition">Tutup</button>
      </div>
    </div>
  `;

  document.getElementById('main-content').innerHTML = html;
  filterDataWarga();

  let searchInp = document.getElementById('searchInput');
  if (searchInp) {
    searchInp.onkeyup = function() {
      filterDataWarga();
    };
  }
}

function filterDataWarga() {
  let searchVal = document.getElementById('searchInput') ? document.getElementById('searchInput').value.toLowerCase().trim() : '';
  
  let headers = currentHeaders.map(h => h.toLowerCase().trim());
  let nikIdx = headers.indexOf('nik');
  let namaIdx = headers.findIndex(h => h.includes('nama'));

  let filtered = [...rawWargaData].filter(row => {
    let nikText = (row[nikIdx] || '').toLowerCase();
    let namaText = (row[namaIdx] || '').toLowerCase();
    return nikText.includes(searchVal) || namaText.includes(searchVal);
  });

  let tbody = document.getElementById('warga-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center p-4 text-gray-400">Tidak ada data warga yang cocok.</td></tr>`;
  } else {
    filtered.forEach((r, i) => {
      let nikVal = r[nikIdx] || '-';
      let namaVal = r[namaIdx] || '-';
      let alamatIdx = headers.findIndex(h => h.includes('alamat'));
      let alamatVal = alamatIdx > -1 ? r[alamatIdx] : '-';
      let idIdx = headers.indexOf('id') > -1 ? headers.indexOf('id') : 0;
      let rowId = r[idIdx] || nikVal;

      let btnAksi = session.role === 'RT' 
        ? `<button onclick="event.stopPropagation(); bukaModalEdit('${rowId}')" class="bg-blue-50 text-blue-600 px-2 py-1 rounded-md text-[11px] font-bold border border-blue-200">Edit</button>`
        : `<span class="text-gray-400 text-[10px]">-</span>`;

      tbody.innerHTML += `
        <tr class="border-b hover:bg-blue-50/50 cursor-pointer transition" onclick="showDetailWarga('${rowId}')">
          <td class="p-3 text-center text-gray-400">${i + 1}</td>
          <td class="p-3 font-mono text-[10px] text-gray-600">${nikVal}</td>
          <td class="p-3 font-medium text-gray-800">${namaVal}</td>
          <td class="p-3 text-gray-600 truncate max-w-[150px]">${alamatVal}</td>
          <td class="p-3 text-center">${btnAksi}</td>
        </tr>`;
    });
  }
}

function showDetailWarga(id) {
  let headers = currentHeaders.map(h => h.toLowerCase().trim());
  let idIdx = headers.indexOf('id') > -1 ? headers.indexOf('id') : 0;
  let nikIdx = headers.indexOf('nik');
  
  let row = rawWargaData.find(r => (r[idIdx] === id || r[nikIdx] === id));
  if (!row) return;

  selectedWargaRow = row;
  let fotoIdx = headers.findIndex(h => h.includes('foto') || h.includes('bukti'));
  let fotoUrl = fotoIdx > -1 ? row[fotoIdx] : '';

  let imgHtml = (fotoUrl && fotoUrl !== '-' && fotoUrl !== '***Rahasia***') 
    ? `<div class="mt-2"><p class="text-[10px] text-gray-400 font-bold uppercase mb-1">Foto Warga:</p><img src="${fotoUrl}" onclick="bukaPopUpFoto('${fotoUrl}')" class="w-full max-h-40 object-contain rounded-xl border cursor-pointer shadow-sm"></div>` 
    : '';

  let detailHtml = '';
  currentHeaders.forEach((h, idx) => {
    let hLower = h.toLowerCase().trim();
    if (hLower.includes('foto') || hLower.includes('bukti') || hLower === 'no') return;
    detailHtml += `
      <div class="border-b pb-1">
        <p class="text-[10px] text-gray-400 font-bold uppercase">${h.replace(/_/g, ' ')}</p>
        <p class="font-semibold text-gray-800">${row[idx] || '-'}</p>
      </div>`;
  });
  detailHtml += imgHtml;

  document.getElementById('modal-detail-warga-body').innerHTML = detailHtml;

  let actionHtml = '';
  if (session.role === 'RT') {
    let nikVal = row[nikIdx] || id;
    actionHtml = `
      <button onclick="bukaModalEdit('${nikVal}'); tutupDetailWarga();" class="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl text-xs font-bold shadow-sm">Edit Data Warga</button>`;
  }
  document.getElementById('warga-action-buttons').innerHTML = actionHtml;

  document.getElementById('modal-detail-warga').classList.remove('hidden');
}

function tutupDetailWarga() {
  document.getElementById('modal-detail-warga').classList.add('hidden');
}

async function loadWargaView() {
  const res = await callGASGet('getTableData', { sheetName: 'Warga' });
  if (res) {
    currentHeaders = res.headers || [];
    currentRows = res.rows || [];
    renderWargaCustom(res);
  }
}
