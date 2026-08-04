let rawWargaData = [];
let selectedWargaRow = null;
let currentWargaViewMode = 'rumah';
let groupedRumahCache = {};
function renderWargaCustom(data) {
  rawWargaData = data.rows || [];
  currentHeaders = data.headers || [];
  currentRows = data.rows || [];
  let html = `
    <div class="p-1 text-gray-800 font-sans space-y-4">
      <!-- Header Controls & Toggle Mode -->
      <div class="flex justify-between items-center flex-wrap gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h2 class="font-bold text-base text-gray-800 flex items-center gap-2">
            <i class="bi bi-houses-fill text-blue-600 text-lg"></i>
            Data Warga & Hunian RT 5
          </h2>
          <p class="text-[11px] text-gray-500 mt-0.5">Daftar hunian rumah per alamat dan anggota keluarga terdaftar</p>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <!-- Toggle View Mode Button -->
          <div class="bg-gray-100 p-1 rounded-xl flex items-center text-xs font-bold border">
            <button id="btnViewRumah" onclick="switchWargaViewMode('rumah')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition ${currentWargaViewMode==='rumah'?'bg-blue-600 text-white shadow-sm':'text-gray-600 hover:text-gray-900'}">
              <i class="bi bi-house-door-fill me-1"></i>Per Rumah
            </button>
            <button id="btnViewTabel" onclick="switchWargaViewMode('tabel')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition ${currentWargaViewMode==='tabel'?'bg-blue-600 text-white shadow-sm':'text-gray-600 hover:text-gray-900'}">
              <i class="bi bi-table me-1"></i>Tabel Daftar
            </button>
          </div>
          ${session.role === 'RT' ? `
            <select id="filterStatusTinggal" onchange="filterDataWarga()" class="form-select text-xs font-bold py-2 px-3 border rounded-xl bg-white shadow-sm" style="max-width:170px;">
              <option value="">-- Semua Status --</option>
              <option value="TETAP">Warga Tetap</option>
              <option value="DOMISILI">Warga Domisili</option>
            </select>
            <button onclick="bukaModalForm()" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-xl text-xs shadow transition flex items-center gap-1">
              <i class="bi bi-plus-circle-fill"></i> Tambah Warga
            </button>
          ` : ''}
        </div>
      </div>
      <!-- Container Tampilan Per Rumah (Grid Cards) -->
      <div id="warga-grid-container" class="${currentWargaViewMode === 'rumah' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'hidden'}"></div>
      <!-- Container Tampilan Tabel -->
      <div id="warga-table-container" class="${currentWargaViewMode === 'tabel' ? 'bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100' : 'hidden'}">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-gray-100/70 text-gray-600 uppercase font-semibold border-b">
              <tr>
                <th class="p-3 text-center">No</th>
                <th class="p-3">NIK</th>
                <th class="p-3">Nama Lengkap</th>
                <th class="p-3">Alamat Rumah</th>
                <th class="p-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody id="warga-table-body"></tbody>
          </table>
        </div>
      </div>
    </div>
    <!-- MODAL DETAIL RUMAH (Daftar Penghuni dalam 1 Alamat) -->
    <div id="modal-detail-rumah" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="bg-white p-5 rounded-2xl w-full max-w-lg shadow-2xl relative font-sans max-h-[85vh] flex flex-col">
        <button onclick="tutupDetailRumah()" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-lg w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">&times;</button>
        <div class="mb-4 border-b pb-3 pe-6 flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center text-xl font-bold shadow-sm">
            <i class="bi bi-house-heart-fill"></i>
          </div>
          <div>
            <h3 class="font-bold text-gray-800 text-sm" id="modal-rumah-title">Penghuni Rumah</h3>
            <p class="text-[11px] text-gray-500" id="modal-rumah-subtitle">Daftar anggota terdaftar di alamat hunian ini</p>
          </div>
        </div>
        <div id="modal-detail-rumah-body" class="space-y-2 text-xs overflow-y-auto pe-1 flex-1 mb-3"></div>
        <button onclick="tutupDetailRumah()" class="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 p-2.5 rounded-xl text-xs font-bold transition">Tutup</button>
      </div>
    </div>
    <!-- MODAL DETAIL WARGA (Individu) -->
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
function switchWargaViewMode(mode) {
  currentWargaViewMode = mode;
  let gridContainer = document.getElementById('warga-grid-container');
  let tableContainer = document.getElementById('warga-table-container');
  let btnRumah = document.getElementById('btnViewRumah');
  let btnTabel = document.getElementById('btnViewTabel');
  if (mode === 'rumah') {
    if (gridContainer) gridContainer.classList.remove('hidden');
    if (tableContainer) tableContainer.classList.add('hidden');
    if (btnRumah) btnRumah.className = 'px-3 py-1.5 rounded-lg text-xs font-bold transition bg-blue-600 text-white shadow-sm';
    if (btnTabel) btnTabel.className = 'px-3 py-1.5 rounded-lg text-xs font-bold transition text-gray-600 hover:text-gray-900';
  } else {
    if (gridContainer) gridContainer.classList.add('hidden');
    if (tableContainer) tableContainer.classList.remove('hidden');
    if (btnRumah) btnRumah.className = 'px-3 py-1.5 rounded-lg text-xs font-bold transition text-gray-600 hover:text-gray-900';
    if (btnTabel) btnTabel.className = 'px-3 py-1.5 rounded-lg text-xs font-bold transition bg-blue-600 text-white shadow-sm';
  }
  filterDataWarga();
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
  groupedRumahCache = {};
  filtered.forEach(row => {
    let alamatVal = (alamatIdx > -1 && row[alamatIdx]) ? String(row[alamatIdx]).trim() : '';
    if (!alamatVal || alamatVal === '-') alamatVal = 'Alamat Belum Terdata';
    let key = alamatVal.toLowerCase().replace(/\s+/g, ' ');
    if (!groupedRumahCache[key]) {
      groupedRumahCache[key] = {
        alamatNama: alamatVal,
        rows: []
      };
    }
    groupedRumahCache[key].rows.push(row);
  });
  let gridBox = document.getElementById('warga-grid-container');
  if (gridBox) {
    gridBox.innerHTML = '';
    let keys = Object.keys(groupedRumahCache);
    if (keys.length === 0) {
      gridBox.innerHTML = `<div class="col-span-full text-center p-8 bg-white rounded-2xl border text-gray-400">Tidak ada data alamat rumah yang cocok.</div>`;
    } else {
      keys.forEach(key => {
        let group = groupedRumahCache[key];
        let jumlahPenghuni = group.rows.length;
        let namaPratinjau = group.rows.map(r => r[namaIdx] || '-').slice(0, 3).join(', ');
        if (jumlahPenghuni > 3) namaPratinjau += ` ... (+${jumlahPenghuni - 3} lainnya)`;
        gridBox.innerHTML += `
          <div class="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between" onclick="bukaModalRumah('${key.replace(/'/g, "\\'")}')">
            <div>
              <div class="flex justify-between items-start mb-2.5">
                <div class="flex items-center gap-2.5">
                  <div class="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg font-bold border border-blue-100">
                    <i class="bi bi-house-door-fill"></i>
                  </div>
                  <div>
                    <h3 class="font-bold text-gray-800 text-xs line-clamp-1">${group.alamatNama}</h3>
                  </div>
                </div>
                <span class="badge bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2 py-1 rounded-lg">
                  ${jumlahPenghuni} Penghuni
                </span>
              </div>
              <div class="bg-gray-50/80 p-2.5 rounded-xl border border-gray-100 mb-3">
                <p class="text-[10px] text-gray-400 font-bold uppercase mb-1 flex items-center gap-1">
                  <i class="bi bi-people-fill text-gray-400"></i> Penghuni Rumah:
                </p>
                <p class="text-[11px] font-medium text-gray-700 line-clamp-2">${namaPratinjau}</p>
              </div>
            </div>
            <button onclick="event.stopPropagation(); bukaModalRumah('${key.replace(/'/g, "\\'")}')" class="w-full bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white py-2 px-3 rounded-xl text-xs font-bold border border-blue-200 transition flex items-center justify-center gap-1.5">
              <span>Lihat Penghuni Rumah</span>
              <i class="bi bi-arrow-right-short text-base"></i>
            </button>
          </div>`;
      });
    }
  }
  let tbody = document.getElementById('warga-table-body');
  if (tbody) {
    tbody.innerHTML = '';
    let isRT = String(session.role || '').toUpperCase() === 'RT';
    let userNik = (session && session.nik) ? String(session.nik).trim() : '';
    let kkIdxTbl = headers.findIndex(h => h.includes('kk') || h.includes('no_kk'));
    let userKkTbl = '';
    if (!isRT && userNik) {
      let myW = (rawWargaData || []).find(w => String(cariNilaiKolom(w, ['nik', 'ktp'])).trim() === userNik);
      if (myW) userKkTbl = String(cariNilaiKolom(myW, ['kk', 'no_kk']) || '').trim();
    }
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
        let rowKkVal = kkIdxTbl > -1 ? String(r[kkIdxTbl] || '').trim() : '';
        let rowNikStr = String(nikVal).trim();
        let isSameKkTbl = isRT || (rowNikStr && rowNikStr === userNik) || (userKkTbl && rowKkVal && userKkTbl === rowKkVal);
        let nikDisplay = isSameKkTbl ? nikVal : '***';
        let btnAksi = session.role === 'RT' 
          ? `<button onclick="event.stopPropagation(); showDetailWarga('${rowId}')" class="bg-blue-50 text-blue-600 px-2 py-1 rounded-md text-[11px] font-bold border border-blue-200">Detail</button>`
          : `<button onclick="event.stopPropagation(); showDetailWarga('${rowId}')" class="bg-blue-50 text-blue-600 px-2 py-1 rounded-md text-[11px] font-bold border border-blue-200">Rincian</button>`;
        tbody.innerHTML += `
          <tr class="border-b hover:bg-blue-50/50 cursor-pointer transition" onclick="showDetailWarga('${rowId}')">
            <td class="p-3 text-center text-gray-400">${i + 1}</td>
            <td class="p-3 font-mono text-[10px] text-gray-600">${nikDisplay}</td>
            <td class="p-3 font-medium text-gray-800">${namaVal}</td>
            <td class="p-3 text-gray-600 truncate max-w-[150px]">${alamatVal}</td>
            <td class="p-3 text-center">${btnAksi}</td>
          </tr>`;
      });
    }
  }
}
function bukaModalRumah(key) {
  let group = groupedRumahCache[key];
  if (!group) return;
  document.getElementById('modal-rumah-title').innerText = group.alamatNama;
  document.getElementById('modal-rumah-subtitle').innerText = `Total ${group.rows.length} Anggota Keluarga Terdaftar`;
  let headers = (currentHeaders || []).map(h => (h || '').toLowerCase().trim());
  let idIdx = headers.indexOf('id') > -1 ? headers.indexOf('id') : 0;
  let nikIdx = headers.indexOf('nik');
  if (nikIdx === -1) nikIdx = 0;
  let namaIdx = headers.findIndex(h => h.includes('nama') || h.includes('name'));
  if (namaIdx === -1) namaIdx = 1;
  let statusTinggalIdx = headers.findIndex(h => h.includes('status_tinggal') || h.includes('status_huni'));
  let pekerjaanIdx = headers.findIndex(h => h.includes('pekerjaan') || h.includes('job'));
  let hpIdx = headers.findIndex(h => h.includes('hp') || h.includes('wa') || h.includes('telp'));
  let fotoIdx = headers.findIndex(h => h.includes('foto') || h.includes('bukti'));
  let kkIdx = headers.findIndex(h => h.includes('kk') || h.includes('no_kk'));
  let userKk = '';
  let userNik = (session && session.nik) ? String(session.nik).trim() : '';
  let isRT = String(session.role || '').toUpperCase() === 'RT';
  if (!isRT && userNik) {
    let myW = (rawWargaData || []).find(w => String(cariNilaiKolom(w, ['nik', 'ktp'])).trim() === userNik);
    if (myW) userKk = String(cariNilaiKolom(myW, ['kk', 'no_kk']) || '').trim();
  }
  let html = '';
  group.rows.forEach((r, idx) => {
    let rowId = r[idIdx] || r[nikIdx] || r[0];
    let nikVal = r[nikIdx] !== undefined ? r[nikIdx] : '-';
    let namaVal = r[namaIdx] !== undefined ? r[namaIdx] : '-';
    let stVal = (statusTinggalIdx > -1 && r[statusTinggalIdx]) ? String(r[statusTinggalIdx]).toUpperCase() : 'TETAP';
    let kerjaVal = (pekerjaanIdx > -1 && r[pekerjaanIdx]) ? String(r[pekerjaanIdx]) : '';
    let hpVal = (hpIdx > -1 && r[hpIdx]) ? String(r[hpIdx]) : '';
    let fotoUrl = (fotoIdx > -1 && r[fotoIdx]) ? String(r[fotoIdx]) : '';
    let fotoDirectUrl = (typeof convertToImageLink === 'function') ? convertToImageLink(fotoUrl) : fotoUrl;
    let hasFoto = (fotoUrl && String(fotoUrl).trim() !== '' && String(fotoUrl).toUpperCase() !== 'EMPTY' && String(fotoUrl).toUpperCase() !== 'NULL' && fotoUrl !== '-');
    let rowKk = kkIdx > -1 ? String(r[kkIdx] || '').trim() : '';
    let rowNik = String(nikVal).trim();
    let isSameKk = isRT || (rowNik && rowNik === userNik) || (userKk && rowKk && userKk === rowKk);
    let nikDisplay = isSameKk ? nikVal : '***';
    let showFoto = isSameKk;
    html += `
      <div class="bg-gray-50/80 p-3 rounded-2xl border border-gray-200/80 flex items-center justify-between gap-3 hover:bg-white hover:shadow-sm transition">
        <div class="flex items-center gap-3">
          ${showFoto && hasFoto 
            ? `<img src="${fotoDirectUrl}" class="w-10 h-10 rounded-full object-cover border shadow-sm cursor-pointer" onclick="bukaPopUpFoto('${fotoUrl}')">`
            : `<div class="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm shadow-inner"><i class="bi bi-person-fill"></i></div>`
          }
          <div>
            <h4 class="font-bold text-gray-800 text-xs">${namaVal}</h4>
            ${isSameKk ? `<p class="text-[10px] text-gray-500 font-mono">NIK: ${nikDisplay}</p>` : ''}
            ${isSameKk && kerjaVal ? `<p class="text-[10px] text-gray-400">${kerjaVal}</p>` : ''}
          </div>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="badge ${stVal==='TETAP'?'bg-emerald-50 text-emerald-700 border-emerald-200':'bg-amber-50 text-amber-700 border-amber-200'} border text-[9px] font-bold px-2 py-0.5 rounded-md">
            ${stVal}
          </span>
          <button onclick="showDetailWarga('${rowId}')" class="bg-blue-600 hover:bg-blue-700 text-white font-bold px-2.5 py-1 rounded-lg text-[10px] shadow-sm transition">
            Rincian
          </button>
        </div>
      </div>`;
  });
  document.getElementById('modal-detail-rumah-body').innerHTML = html;
  document.getElementById('modal-detail-rumah').classList.remove('hidden');
}
function tutupDetailRumah() {
  document.getElementById('modal-detail-rumah').classList.add('hidden');
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
  let detailHtml = (isSameKk || session.role === 'RT') ? imgHtml : '';
  let safeFieldsForPublic = ['nama', 'name', 'nama_lengkap', 'alamat', 'address', 'jenis_kelamin', 'gender', 'jk', 'status_tinggal', 'status_huni'];
  currentHeaders.forEach((h, idx) => {
    let hLower = (h || '').toLowerCase().trim();
    if (hLower.includes('foto') || hLower.includes('bukti') || hLower === 'no' || hLower === 'id') return;
    let valDisplay = row[idx] || '-';
    if (!isSameKk && session.role !== 'RT') {
      let isSafe = safeFieldsForPublic.some(sf => hLower.includes(sf));
      if (!isSafe) return;
    }
    if (!isSameKk && ['no_hp','hp','wa','telp','nomor_hp'].includes(hLower)) {
      valDisplay = (typeof sensorPhoneNumber === 'function') ? sensorPhoneNumber(valDisplay) : '****';
    }
    detailHtml += `
      <div class="border-b pb-1">
        <p class="text-[10px] text-gray-400 font-bold uppercase">${h.replace(/_/g, ' ')}</p>
        <p class="font-semibold text-gray-800">${valDisplay}</p>
      </div>`;
  });
  if (!isSameKk && session.role !== 'RT') {
    detailHtml += `
      <div class="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
        <p class="text-[10px] text-amber-700 font-bold"><i class="bi bi-shield-lock me-1"></i> Data sensitif (NIK, No KK, Tempat/Tanggal Lahir, Status Nikah, No HP) disembunyikan untuk privasi warga beda KK.</p>
      </div>`;
  }
  document.getElementById('modal-detail-warga-body').innerHTML = detailHtml;
  let actionHtml = '';
  if (session.role === 'RT') {
    actionHtml = `
      <button onclick="editWargaDariDetail()" class="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl text-xs font-bold shadow-sm mb-2">Edit Data Warga</button>
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
  window._detailWargaRowId = rowId;
  window._detailWargaNik  = rowNik;
  window._detailWargaRow  = row;
}
function editWargaDariDetail() {
  let rId  = window._detailWargaRowId;
  let rNik = window._detailWargaNik;
  let rRow = window._detailWargaRow;
  if (!rId && !rNik) {
    alert('Gagal membuka form edit: data warga tidak ditemukan.');
    return;
  }
  editingId  = rId  || null;
  editingNik = rNik || null;
  tutupDetailWarga();
  setTimeout(async () => {
    try {
      document.getElementById('formModalTitle').innerText = 'Edit Data: Warga';
      let btnHapus = document.getElementById('btn-hapus-modal');
      if (btnHapus) btnHapus.style.display = (session && session.role === 'RT') ? 'inline-block' : 'none';
      if (typeof generateFormInputs === 'function') {
        await generateFormInputs(rRow);
      }
      if (!bootstrapModalInstance) {
        bootstrapModalInstance = new bootstrap.Modal(document.getElementById('formModal'));
      }
      bootstrapModalInstance.show();
    } catch(err) {
      console.error('[editWargaDariDetail] Error:', err);
      alert('Gagal membuka form edit: ' + err.message);
    }
  }, 200);
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
  bukaWa(cleanNo, `Halo warga RT 5, ada hal yang ingin saya sampaikan.`);
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
