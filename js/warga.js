let rawWargaData = [];
let selectedWargaRow = null;

function renderWargaCustom(data) {
  rawWargaData = data.rows || [];
  currentHeaders = data.headers || [];
  currentRows = data.rows || [];
  
  let headers = currentHeaders.map(h => (h || '').toLowerCase().trim());
  
  let idIdx = headers.indexOf('id') > -1 ? headers.indexOf('id') : 0;
  let nikIdx = headers.indexOf('nik');
  if (nikIdx === -1) nikIdx = headers.findIndex(h => h.includes('nik') || h.includes('ktp'));
  if (nikIdx === -1) nikIdx = 0;

  let namaIdx = headers.findIndex(h => h.includes('nama') || h.includes('name'));
  if (namaIdx === -1) namaIdx = headers.length > 1 ? 1 : 0;

  let html = `
    <div class="p-1 text-gray-800 font-sans">
      <div class="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h2 class="font-bold text-base text-gray-800"><i class="bi bi-people-fill me-2 text-primary"></i>Data Warga RT 05</h2>
        <div class="flex items-center gap-2">
          ${session.role === 'RT' ? `
            <select id="filterStatusTinggal" onchange="filterDataWarga()" class="form-select text-xs font-bold py-2 px-3 border rounded-xl bg-white shadow-sm" style="max-width:170px;">
              <option value="">-- Semua Status --</option>
              <option value="TETAP">Warga Tetap</option>
              <option value="DOMISILI">Warga Domisili</option>
            </select>
            <button onclick="bukaModalForm()" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-xl text-xs shadow transition">
              + Tambah Warga Baru
            </button>
          ` : ''}
        </div>
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
      <div class="bg-white p-5 rounded-2xl w-full max-w-sm shadow-2xl relative font-sans">
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
  let filterStatus = document.getElementById('filterStatusTinggal') ? document.getElementById('filterStatusTinggal').value.toUpperCase().trim() : '';

  let headers = (currentHeaders || []).map(h => (h || '').toLowerCase().trim());
  let nikIdx = headers.indexOf('nik');
  if (nikIdx === -1) nikIdx = headers.findIndex(h => h.includes('nik') || h.includes('ktp'));
  if (nikIdx === -1) nikIdx = 0;

  let namaIdx = headers.findIndex(h => h.includes('nama') || h.includes('name'));
  if (namaIdx === -1) namaIdx = headers.length > 1 ? 1 : 0;

  let alamatIdx = headers.findIndex(h => h.includes('alamat') || h.includes('address'));
  let hpIdx = headers.findIndex(h => h.includes('hp') || h.includes('wa') || h.includes('telp'));
  let statusTinggalIdx = headers.findIndex(h => h.includes('status_tinggal') || h.includes('status_huni') || h.includes('status_pindah'));

  let filtered = [...rawWargaData].filter(row => {
    if (!row) return false;

    if (searchVal && !row.some(val => String(val || '').toLowerCase().includes(searchVal))) {
      return false;
    }

    if (filterStatus) {
      let valSt = '';
      if (statusTinggalIdx > -1 && row[statusTinggalIdx] !== undefined) {
        valSt = String(row[statusTinggalIdx] || '').toUpperCase().trim();
      } else {
        let foundVal = row.find(v => {
          let vUpper = String(v || '').toUpperCase().trim();
          return vUpper === 'TETAP' || vUpper === 'DOMISILI' || vUpper === 'KONTRAK';
        });
        valSt = foundVal ? String(foundVal).toUpperCase().trim() : '';
      }

      if (filterStatus === 'TETAP' && valSt !== 'TETAP') return false;
      if (filterStatus === 'DOMISILI' && (valSt !== 'DOMISILI' && valSt !== 'KONTRAK')) return false;
    }

    return true;
  });

  let tbody = document.getElementById('warga-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center p-4 text-gray-400">Tidak ada data warga yang cocok.</td></tr>`;
  } else {
    filtered.forEach((r, i) => {
      let nikVal = r[nikIdx] !== undefined ? r[nikIdx] : (r[0] || '-');
      let namaVal = r[namaIdx] !== undefined ? r[namaIdx] : (r[1] || '-');
      let alamatVal = alamatIdx > -1 && r[alamatIdx] !== undefined ? r[alamatIdx] : '-';
      let hpVal = hpIdx > -1 && r[hpIdx] !== undefined ? r[hpIdx] : '';
      let idIdx = headers.indexOf('id') > -1 ? headers.indexOf('id') : 0;
      let rowId = r[idIdx] || nikVal;

      let btnAksi = session.role === 'RT' 
        ? `<button onclick="event.stopPropagation(); bukaModalEdit('${rowId}')" class="bg-blue-50 text-blue-600 px-2 py-1 rounded-md text-[11px] font-bold border border-blue-200">Edit</button>`
        : `<button onclick="event.stopPropagation(); waHubungiWarga('${hpVal}')" class="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md text-[11px] font-bold border border-emerald-200">WA</button>`;

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
  let headers = (currentHeaders || []).map(h => (h || '').toLowerCase().trim());
  let idIdx = headers.indexOf('id') > -1 ? headers.indexOf('id') : 0;
  let nikIdx = headers.indexOf('nik');
  if (nikIdx === -1) nikIdx = 0;
  let hpIdx = headers.findIndex(h => h.includes('hp') || h.includes('wa') || h.includes('telp'));
  let kkIdx = headers.findIndex(h => h.includes('kk') || h.includes('no_kk'));

  let row = rawWargaData.find(r => (String(r[idIdx]) === String(id) || String(r[nikIdx]) === String(id) || String(r[0]) === String(id)));
  if (!row) return;

  selectedWargaRow = row;
  let fotoIdx = headers.findIndex(h => h.includes('foto') || h.includes('bukti'));
  let fotoUrl = fotoIdx > -1 ? row[fotoIdx] : '';
  let noHpWarga = hpIdx > -1 ? row[hpIdx] : '';
  let rowId = row[idIdx] || row[nikIdx] || id;

  let rowKk = kkIdx > -1 ? String(row[kkIdx] || '').trim() : '';
  let rowNik = row[nikIdx] !== undefined ? String(row[nikIdx] || '').trim() : '';

  let userKk = '';
  if (session.role === 'Warga' && session.nik) {
    let myW = (rawWargaData || []).find(w => String(cariNilaiKolom(w, ['nik', 'ktp'])).trim() === session.nik.trim());
    if (myW) userKk = String(cariNilaiKolom(myW, ['kk', 'no_kk']) || '').trim();
  }

  let isSameKk = (session.role === 'RT') || (rowNik && rowNik === session.nik.trim()) || (userKk && rowKk && userKk === rowKk);

  let fotoDirectUrl = (typeof convertToImageLink === 'function') ? convertToImageLink(fotoUrl) : fotoUrl;
  let hasFoto = (fotoUrl && String(fotoUrl).trim() !== '' && String(fotoUrl).toUpperCase() !== 'EMPTY' && String(fotoUrl).toUpperCase() !== 'NULL' && fotoUrl !== '-' && fotoUrl !== '***Rahasia***');

  let imgHtml = `
    <div class="text-center mb-3 p-3 bg-gray-50 rounded-2xl border shadow-sm">
      <p class="text-[10px] text-gray-400 font-bold uppercase mb-2">Foto Profil / KTP Warga:</p>
      ${hasFoto 
        ? `<img src="${fotoDirectUrl}" onclick="bukaPopUpFoto('${fotoUrl}')" class="w-32 h-32 object-cover mx-auto rounded-2xl border shadow cursor-pointer hover:opacity-90 transition">
           <small class="text-[9px] text-blue-600 block mt-1.5 font-bold"><i class="bi bi-zoom-in me-1"></i>Klik foto untuk memperbesar</small>`
        : `<div class="w-20 h-20 bg-gray-200 text-gray-400 rounded-full flex items-center justify-center mx-auto text-3xl shadow-inner"><i class="bi bi-person-fill"></i></div>
           <small class="text-[10px] text-gray-400 block mt-1">Belum ada foto yang diunggah</small>`
      }
    </div>`;

  let detailHtml = imgHtml;
  currentHeaders.forEach((h, idx) => {
    let hLower = (h || '').toLowerCase().trim();
    if (hLower.includes('foto') || hLower.includes('bukti') || hLower === 'no') return;

    let valDisplay = row[idx] || '-';
    if (!isSameKk && ['no_hp','hp','wa','telp','nomor_hp'].includes(hLower)) {
      valDisplay = (typeof sensorPhoneNumber === 'function') ? sensorPhoneNumber(valDisplay) : '****';
    }

    detailHtml += `
      <div class="border-b pb-1">
        <p class="text-[10px] text-gray-400 font-bold uppercase">${h.replace(/_/g, ' ')}</p>
        <p class="font-semibold text-gray-800">${valDisplay}</p>
      </div>`;
  });

  document.getElementById('modal-detail-warga-body').innerHTML = detailHtml;

  let actionHtml = '';
  if (session.role === 'RT') {
    actionHtml = `
      <button onclick="bukaModalEdit('${rowId}'); tutupDetailWarga();" class="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl text-xs font-bold shadow-sm mb-2">Edit Data Warga</button>
      <button onclick="waHubungiWarga('${noHpWarga}'); tutupDetailWarga();" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-xl text-xs font-bold shadow-sm">Kirim WhatsApp</button>`;
  } else if (isSameKk) {
    actionHtml = `
      <button onclick="waHubungiWarga('${noHpWarga}')" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-xl text-xs font-bold shadow-sm">Hubungi via WhatsApp</button>`;
  } else {
    actionHtml = `
      <p class="text-[10px] text-gray-400 text-center italic py-1"><i class="bi bi-shield-lock me-1"></i>Nomor HP disensor untuk privasi sesama warga beda KK.</p>`;
  }
  document.getElementById('warga-action-buttons').innerHTML = actionHtml;

  document.getElementById('modal-detail-warga').classList.remove('hidden');
}

function tutupDetailWarga() {
  document.getElementById('modal-detail-warga').classList.add('hidden');
}

function waHubungiWarga(noHp) {
  let cleanNo = noHp ? noHp.toString().replace(/[^0-9]/g, '') : '';
  if (cleanNo.startsWith('0')) {
    cleanNo = '62' + cleanNo.slice(1);
  }
  if (!cleanNo) {
    alert("Nomor WhatsApp warga ini tidak tersedia.");
    return;
  }
  bukaWa(cleanNo, `Halo warga RT 05, ada hal yang ingin saya sampaikan.`);
}

async function loadWargaView() {
  const res = await callGASGet('getTableData', { sheetName: 'Warga' });
  if (res && res.headers) {
    currentHeaders = res.headers || [];
    currentRows = res.rows || [];
    renderWargaCustom(res);
  } else {
    document.getElementById('main-content').innerHTML = `<div class="alert alert-danger text-center my-3">${res ? res.message : 'Gagal memuat data warga'}</div>`;
  }
}

// HOOK UNTUK SYSTEM NAVIGATION
const originalLoadMenuWarga = window.loadMenu;
window.loadMenu = async function(menu) {
  if (menu === 'Warga') {
    currentActiveMenu = menu;
    if (typeof syncActiveNav === 'function') syncActiveNav(menu);
    let titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.innerText = 'Data Warga';
    document.getElementById('main-content').innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><br><small class="text-muted mt-2 d-block">Memuat data warga...</small></div>';
    if (document.getElementById('rek-info')) document.getElementById('rek-info').style.display = 'none';

    await loadWargaView();
  } else {
    if (typeof originalLoadMenuWarga === 'function') originalLoadMenuWarga(menu);
  }
};
