let rawSumbanganData = [];
let selectedSumbanganRow = null;
async function renderSumbanganCustom(data) {
  rawSumbanganData = data.rows || [];
  let headers = data.headers.map(h => h.toLowerCase().trim());
  
  await loadViewTemplate('sumbangan');

  let actionBox = document.getElementById('sumbangan-header-action');
  if (actionBox) {
    if (session.role === 'Warga') {
      actionBox.innerHTML = `
        <button onclick="bukaModalForm()" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-xl text-xs shadow transition">
          + Buat Sumbangan Baru
        </button>
      `;
    } else {
      actionBox.innerHTML = '';
    }
  }

  filterDataSumbangan();
  let searchInp = document.getElementById('searchInput');
  if (searchInp) {
    searchInp.onkeyup = function() {
      filterDataSumbangan();
    };
  }
}
function filterDataSumbangan() {
  let searchVal = document.getElementById('searchInput') ? document.getElementById('searchInput').value.toLowerCase().trim() : '';
  let headers = currentHeaders.map(h => h.toLowerCase().trim());
  let idIdx = headers.indexOf('id') > -1 ? headers.indexOf('id') : 0;
  let namaIdx = headers.findIndex(h => h.includes('nama'));
  let filtered = [...rawSumbanganData].filter(row => {
    if (!searchVal) return true;
    return row.some(val => String(val || '').toLowerCase().includes(searchVal));
  });
  let tbody = document.getElementById('sumbangan-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center p-4 text-gray-400">Tidak ada data sumbangan.</td></tr>`;
  } else {
    filtered.forEach((r, i) => {
      let tglIdx = headers.findIndex(h => h.includes('tanggal') || h.includes('tgl') || h.includes('waktu'));
      let statusIdx = headers.indexOf('status');
      let statusVal = r[statusIdx] || 'Belum di verifikasi';
      let badgeColor = statusVal.toLowerCase().includes('diterima') || statusVal.toLowerCase().includes('selesai') ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700';
      let btnAksi = session.role === 'RT' 
        ? `<button onclick="event.stopPropagation(); bukaModalEdit('${r[idIdx]}')" class="bg-blue-50 text-blue-600 px-2 py-1 rounded-md text-[11px] font-bold border border-blue-200">Edit</button>`
        : `<button onclick="event.stopPropagation(); waVerifikasiSumbangan('${r[idIdx]}')" class="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md text-[11px] font-bold border border-emerald-200">WA</button>`;
      tbody.innerHTML += `
        <tr class="border-b hover:bg-blue-50/50 cursor-pointer transition" onclick="showDetailSumbangan('${r[idIdx]}')">
          <td class="p-3 text-center text-gray-400">${i + 1}</td>
          <td class="p-3 text-[10px] font-mono text-gray-600">${r[idIdx]}</td>
          <td class="p-3 font-medium">${r[tglIdx] || '-'}</td>
          <td class="p-3 font-medium text-gray-800">${r[namaIdx] || '-'}</td>
          <td class="p-3"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeColor}">${statusVal}</span></td>
          <td class="p-3 text-center">${btnAksi}</td>
        </tr>`;
    });
  }
}
function showDetailSumbangan(id) {
  let headers = currentHeaders.map(h => h.toLowerCase().trim());
  let idIdx = headers.indexOf('id') > -1 ? headers.indexOf('id') : 0;
  let row = rawSumbanganData.find(r => r[idIdx] === id);
  if (!row) return;
  selectedSumbanganRow = row;
  let fotoIdx = headers.findIndex(h => h.includes('foto') || h.includes('bukti'));
  let fotoUrl = row[fotoIdx] || '';
  let fotoDirectUrl = (typeof convertToImageLink === 'function') ? convertToImageLink(fotoUrl) : fotoUrl;
  let hasFoto = (fotoUrl && String(fotoUrl).trim() !== '' && String(fotoUrl).toUpperCase() !== 'EMPTY' && String(fotoUrl).toUpperCase() !== 'NULL' && fotoUrl !== '-' && fotoUrl !== '***Rahasia***');
  let imgHtml = `
    <div class="text-center mb-3 p-3 bg-gray-50 rounded-2xl border shadow-sm">
      <p class="text-[10px] text-gray-400 font-bold uppercase mb-2">Bukti Foto Transfer Sumbangan:</p>
      ${hasFoto 
        ? `<img src="${fotoDirectUrl}" onclick="bukaPopUpFoto('${fotoUrl}')" class="w-32 h-32 object-cover mx-auto rounded-2xl border shadow cursor-pointer hover:opacity-90 transition">
           <small class="text-[9px] text-blue-600 block mt-1.5 font-bold"><i class="bi bi-zoom-in me-1"></i>Klik foto untuk memperbesar</small>`
        : `<div class="w-16 h-16 bg-gray-200 text-gray-400 rounded-full flex items-center justify-center mx-auto text-2xl shadow-inner"><i class="bi bi-receipt"></i></div>
           <small class="text-[10px] text-gray-400 block mt-1">Belum ada foto bukti transfer</small>`
      }
    </div>`;
  let detailHtml = imgHtml;
  currentHeaders.forEach((h, idx) => {
    let hLower = h.toLowerCase().trim();
    if (hLower.includes('nik') || hLower.includes('foto') || hLower.includes('bukti') || hLower === 'id' || hLower === 'no') return;
    detailHtml += `
      <div class="border-b pb-1">
        <p class="text-[10px] text-gray-400 font-bold uppercase">${h.replace(/_/g, ' ')}</p>
        <p class="font-semibold text-gray-800">${row[idx] || '-'}</p>
      </div>`;
  });
  document.getElementById('modal-detail-sumbangan-body').innerHTML = detailHtml;
  let actionHtml = '';
  if (session.role === 'RT') {
    actionHtml = `
      <button onclick="bukaModalEdit('${id}'); tutupDetailSumbangan();" class="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl text-xs font-bold shadow-sm">Edit Data</button>`;
  } else {
    actionHtml = `
      <button onclick="waVerifikasiSumbangan('${id}')" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-xl text-xs font-bold shadow-sm">Verifikasi via WhatsApp</button>`;
  }
  document.getElementById('sumbangan-action-buttons').innerHTML = actionHtml;
  document.getElementById('modal-detail-sumbangan').classList.remove('hidden');
}
function tutupDetailSumbangan() {
  document.getElementById('modal-detail-sumbangan').classList.add('hidden');
}
function waVerifikasiSumbangan(id) {
  bukaWa(noWaAdmin, `ID sumbangan ${id} mohon di verifikasi.`);
}
const originalLoadMenuSumbangan = window.loadMenu;
window.loadMenu = async function(menu) {
  if (menu === 'Sumbangan') {
    currentActiveMenu = menu;
    syncActiveNav(menu);
    document.getElementById('page-title').innerText = 'Sumbangan';
    document.getElementById('main-content').innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><br><small class="text-muted mt-2 d-block">Memuat data sumbangan...</small></div>';
    document.getElementById('rek-info').style.display = 'block';
    const res = await callGASGet('getTableData', { sheetName: 'Sumbangan' });
    if (res) {
      currentHeaders = res.headers || [];
      currentRows = res.rows || [];
      renderSumbanganCustom(res);
    }
  } else {
    if (typeof originalLoadMenuSumbangan === 'function') originalLoadMenuSumbangan(menu);
  }
};
