let rawPindahMasukData = [];
let selectedPindahMasukRow = null;

function renderPindahMasukCustom(data) {
  rawPindahMasukData = data.rows || [];
  let headers = data.headers.map(h => h.toLowerCase().trim());

  let html = `
    <div class="p-1 text-gray-800 font-sans">
      <div class="flex justify-between items-center mb-4">
        <h2 class="font-bold text-base text-gray-800"><i class="bi bi-box-arrow-in-right me-2 text-primary"></i>Data Pindah Masuk RT 05</h2>
        ${session.role === 'RT' ? `
          <button onclick="bukaModalForm()" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-xl text-xs shadow transition">
            + Tambah Pindah Masuk Baru
          </button>
        ` : ''}
      </div>

      <div class="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-gray-100/70 text-gray-600 uppercase font-semibold border-b">
              <tr>
                <th class="p-3 text-center">No</th>`;
  data.headers.forEach(h => html += `<th class="p-3">${h.toUpperCase()}</th>`);
  html += `
                <th class="p-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody id="pindahmasuk-table-body"></tbody>
          </table>
        </div>
      </div>
    </div>

    <div id="modal-detail-pindahmasuk" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="bg-white p-5 rounded-2xl w-full max-w-sm shadow-2xl relative font-sans">
        <button onclick="tutupDetailPindahMasuk()" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-lg w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">&times;</button>
        
        <div class="mb-3 border-b pb-2 pe-6">
          <h3 class="font-bold text-gray-800 text-sm">Rincian Pindah Masuk</h3>
        </div>
        <div id="modal-detail-pindahmasuk-body" class="mb-4 space-y-2 text-xs max-h-[60vh] overflow-y-auto pe-1"></div>
        <div id="pindahmasuk-action-buttons" class="space-y-2 mb-2"></div>
        <button onclick="tutupDetailPindahMasuk()" class="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 p-2 rounded-xl text-xs font-bold transition">Tutup</button>
      </div>
    </div>
  `;

  document.getElementById('main-content').innerHTML = html;
  filterDataPindahMasuk();

  let searchInp = document.getElementById('searchInput');
  if (searchInp) {
    searchInp.onkeyup = function() {
      filterDataPindahMasuk();
    };
  }
}

function filterDataPindahMasuk() {
  let searchVal = document.getElementById('searchInput') ? document.getElementById('searchInput').value.toLowerCase().trim() : '';
  
  let headers = currentHeaders.map(h => h.toLowerCase().trim());
  let idIdx = headers.indexOf('id') > -1 ? headers.indexOf('id') : 0;
  let namaIdx = headers.findIndex(h => h.includes('nama'));

  let filtered = [...rawPindahMasukData].filter(row => {
    let rowId = (row[idIdx] || '').toLowerCase();
    let namaText = (row[namaIdx] || '').toLowerCase();
    return rowId.includes(searchVal) || namaText.includes(searchVal);
  });

  let tbody = document.getElementById('pindahmasuk-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${currentHeaders.length + 2}" class="text-center p-4 text-gray-400">Tidak ada data pindah masuk yang cocok.</td></tr>`;
  } else {
    filtered.reverse().forEach((r, i) => {
      let idIdx = headers.indexOf('id') > -1 ? headers.indexOf('id') : 0;
      let rowId = r[idIdx];

      let btnAksi = session.role === 'RT' 
        ? `<button onclick="event.stopPropagation(); bukaModalEdit('${rowId}')" class="bg-blue-50 text-blue-600 px-2 py-1 rounded-md text-[11px] font-bold border border-blue-200">Edit</button>`
        : `<span class="text-gray-400 text-[10px]">-</span>`;

      let rowHtml = `<tr class="border-b hover:bg-blue-50/50 cursor-pointer transition" onclick="showDetailPindahMasuk('${rowId}')">`;
      rowHtml += `<td class="p-3 text-center text-gray-400">${i + 1}</td>`;
      
      r.forEach((val, idx) => {
        let headName = currentHeaders[idx].toLowerCase();
        if (headName.includes('foto') || headName.includes('bukti')) {
          rowHtml += `<td class="p-3">${val && val !== '***Rahasia***' ? `<img src="${val}" class="w-10 h-10 object-cover rounded-lg border shadow-sm" onclick="event.stopPropagation(); bukaPopUpFoto('${val}')">` : '-'}</td>`;
        } else {
          rowHtml += `<td class="p-3 font-medium text-gray-800">${val}</td>`;
        }
      });

      rowHtml += `<td class="p-3 text-center">${btnAksi}</td></tr>`;
      tbody.innerHTML += rowHtml;
    });
  }
}

function showDetailPindahMasuk(id) {
  let headers = currentHeaders.map(h => h.toLowerCase().trim());
  let idIdx = headers.indexOf('id') > -1 ? headers.indexOf('id') : 0;
  
  let row = rawPindahMasukData.find(r => r[idIdx] === id);
  if (!row) return;

  let fotoIdx = headers.findIndex(h => h.includes('foto') || h.includes('bukti'));
  let fotoUrl = fotoIdx > -1 ? row[fotoIdx] : '';
  let fotoDirectUrl = (typeof convertToImageLink === 'function') ? convertToImageLink(fotoUrl) : fotoUrl;
  let hasFoto = (fotoUrl && fotoUrl !== '-' && fotoUrl !== '***Rahasia***');

  let imgHtml = `
    <div class="text-center mb-3 p-3 bg-gray-50 rounded-2xl border shadow-sm">
      <p class="text-[10px] text-gray-400 font-bold uppercase mb-2">Lampiran Foto / Bukti:</p>
      ${hasFoto 
        ? `<img src="${fotoDirectUrl}" onclick="bukaPopUpFoto('${fotoUrl}')" class="w-32 h-32 object-cover mx-auto rounded-2xl border shadow cursor-pointer hover:opacity-90 transition">
           <small class="text-[9px] text-blue-600 block mt-1.5 font-bold"><i class="bi bi-zoom-in me-1"></i>Klik foto untuk memperbesar</small>`
        : `<div class="w-16 h-16 bg-gray-200 text-gray-400 rounded-full flex items-center justify-center mx-auto text-2xl shadow-inner"><i class="bi bi-image"></i></div>
           <small class="text-[10px] text-gray-400 block mt-1">Belum ada lampiran foto</small>`
      }
    </div>`;

  let detailHtml = imgHtml;
  currentHeaders.forEach((h, idx) => {
    let hLower = h.toLowerCase().trim();
    if (hLower.includes('foto') || hLower.includes('bukti') || hLower === 'no') return;
    detailHtml += `
      <div class="border-b pb-1">
        <p class="text-[10px] text-gray-400 font-bold uppercase">${h.replace(/_/g, ' ')}</p>
        <p class="font-semibold text-gray-800">${row[idx] || '-'}</p>
      </div>`;
  });

  document.getElementById('modal-detail-pindahmasuk-body').innerHTML = detailHtml;

  let actionHtml = '';
  if (session.role === 'RT') {
    actionHtml = `<button onclick="tutupDetailPindahMasuk(); bukaModalEdit('${id}');" class="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl text-xs font-bold shadow-sm">Edit Data</button>`;
  }
  document.getElementById('pindahmasuk-action-buttons').innerHTML = actionHtml;

  document.getElementById('modal-detail-pindahmasuk').classList.remove('hidden');
}

function tutupDetailPindahMasuk() {
  document.getElementById('modal-detail-pindahmasuk').classList.add('hidden');
}

async function loadPindahMasukView() {
  const res = await callGASGet('getTableData', { sheetName: 'PindahMasuk' });
  if (res) {
    currentHeaders = res.headers || [];
    currentRows = res.rows || [];
    renderPindahMasukCustom(res);
  }
}
