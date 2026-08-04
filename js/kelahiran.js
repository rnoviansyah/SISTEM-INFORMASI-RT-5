let rawKelahiranData = [];
let selectedKelahiranRow = null;
async function renderKelahiranCustom(data) {
  if (!data || !data.headers) {
    document.getElementById('main-content').innerHTML = '<div class="alert alert-warning text-center p-4">Belum ada data kelahiran.</div>';
    return;
  }
  rawKelahiranData = data.rows || [];
  
  await loadViewTemplate('kelahiran');

  let actionBox = document.getElementById('kelahiran-header-action');
  if (actionBox) {
    if (session.role === 'RT') {
      actionBox.innerHTML = `
        <button onclick="bukaModalForm()" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-xl text-xs shadow transition">
          + Tambah Kelahiran Baru
        </button>
      `;
    } else {
      actionBox.innerHTML = '';
    }
  }

  let theadRow = document.getElementById('kelahiran-thead-row');
  if (theadRow) {
    let trContent = `<th class="p-3 text-center">No</th>`;
    data.headers.forEach(h => trContent += `<th class="p-3">${h.toUpperCase()}</th>`);
    trContent += `<th class="p-3 text-center">Aksi</th>`;
    theadRow.innerHTML = trContent;
  }

  filterDataKelahiran();
  let searchInp = document.getElementById('searchInput');
  if (searchInp) {
    searchInp.onkeyup = function() {
      filterDataKelahiran();
    };
  }
}
function filterDataKelahiran() {
  let searchInp = document.getElementById('searchInput');
  let searchVal = searchInp ? searchInp.value.toLowerCase().trim() : '';
  let headers = (currentHeaders || []).map(h => h.toLowerCase().trim());
  let idIdx = headers.indexOf('id') > -1 ? headers.indexOf('id') : 0;
  let namaIdx = headers.findIndex(h => h.includes('nama'));
  let filtered = [...rawKelahiranData].filter(row => {
    let rowId = (row[idIdx] || '').toString().toLowerCase();
    let namaText = (namaIdx > -1 && row[namaIdx] ? row[namaIdx] : '').toString().toLowerCase();
    return rowId.includes(searchVal) || namaText.includes(searchVal);
  });
  let tbody = document.getElementById('kelahiran-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${headers.length + 2}" class="text-center p-4 text-gray-400">Tidak ada data kelahiran yang cocok.</td></tr>`;
  } else {
    filtered.forEach((r, i) => {
      let rowId = r[idIdx];
      let btnAksi = session.role === 'RT' 
        ? `<button onclick="event.stopPropagation(); bukaModalEdit('${rowId}')" class="bg-blue-50 text-blue-600 px-2 py-1 rounded-md text-[11px] font-bold border border-blue-200">Edit</button>`
        : `<span class="text-gray-400 text-[10px]">-</span>`;
      let rowHtml = `<tr class="border-b hover:bg-blue-50/50 cursor-pointer transition" onclick="showDetailKelahiran('${rowId}')">`;
      rowHtml += `<td class="p-3 text-center text-gray-400">${i + 1}</td>`;
      r.forEach((val, idx) => {
        let headName = currentHeaders[idx] ? currentHeaders[idx].toLowerCase() : '';
        if (headName.includes('foto') || headName.includes('bukti')) {
          rowHtml += `<td class="p-3">${val && val !== '***Rahasia***' ? `<img src="${val}" class="w-10 h-10 object-cover rounded-lg border shadow-sm" onclick="event.stopPropagation(); bukaPopUpFoto('${val}')">` : '-'}</td>`;
        } else {
          rowHtml += `<td class="p-3 font-medium text-gray-800">${val || '-'}</td>`;
        }
      });
      rowHtml += `<td class="p-3 text-center">${btnAksi}</td></tr>`;
      tbody.innerHTML += rowHtml;
    });
  }
}
function showDetailKelahiran(id) {
  let headers = (currentHeaders || []).map(h => h.toLowerCase().trim());
  let idIdx = headers.indexOf('id') > -1 ? headers.indexOf('id') : 0;
  let row = rawKelahiranData.find(r => r[idIdx] === id);
  if (!row) return;
  let fotoIdx = headers.findIndex(h => h.includes('foto') || h.includes('bukti'));
  let fotoUrl = fotoIdx > -1 ? row[fotoIdx] : '';
  let imgHtml = (fotoUrl && fotoUrl !== '-' && fotoUrl !== '***Rahasia***') 
    ? `<div class="mt-2"><p class="text-[10px] text-gray-400 font-bold uppercase mb-1">Lampiran Foto / Bukti:</p><img src="${fotoUrl}" onclick="bukaPopUpFoto('${fotoUrl}')" class="w-full max-h-40 object-contain rounded-xl border cursor-pointer shadow-sm"></div>` 
    : '';
  let detailHtml = '';
  (currentHeaders || []).forEach((h, idx) => {
    let hLower = h.toLowerCase().trim();
    if (hLower.includes('foto') || hLower.includes('bukti') || hLower === 'no') return;
    detailHtml += `
      <div class="border-b pb-1">
        <p class="text-[10px] text-gray-400 font-bold uppercase">${h.replace(/_/g, ' ')}</p>
        <p class="font-semibold text-gray-800">${row[idx] || '-'}</p>
      </div>`;
  });
  detailHtml += imgHtml;
  document.getElementById('modal-detail-kelahiran-body').innerHTML = detailHtml;
  let actionHtml = '';
  if (session.role === 'RT') {
    actionHtml = `<button onclick="tutupDetailKelahiran(); bukaModalEdit('${id}');" class="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl text-xs font-bold shadow-sm">Edit Data</button>`;
  }
  document.getElementById('kelahiran-action-buttons').innerHTML = actionHtml;
  document.getElementById('modal-detail-kelahiran').classList.remove('hidden');
}
function tutupDetailKelahiran() {
  let modal = document.getElementById('modal-detail-kelahiran');
  if (modal) modal.classList.add('hidden');
}
async function loadKelahiranView() {
  const res = await callGASGet('getTableData', { sheetName: 'Kelahiran' });
  if (res) {
    currentHeaders = res.headers || [];
    currentRows = res.rows || [];
    renderKelahiranCustom(res);
  }
}
