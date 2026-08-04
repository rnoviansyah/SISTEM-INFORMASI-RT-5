let rawIuranData = [];
let iuranHeaders = [];
let activeBayarId = null;
async function loadIuranView() {
  document.getElementById('main-content').innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><br><small class="text-muted mt-2 d-block">Memuat data iuran...</small></div>';
  const res = await callGASGet('getIuranData');
  if (res && res.status === 'success') {
    rawIuranData = res.rows || [];
    iuranHeaders = (res.headers || []).map(h => h.toLowerCase().trim());
    renderIuranCustom(res);
  } else {
    document.getElementById('main-content').innerHTML = `<div class="alert alert-danger">${res.message || 'Gagal memuat data'}</div>`;
  }
}
function getVal(r, headers, colName, defaultVal = '') {
  let idx = headers.indexOf(colName.toLowerCase());
  return idx > -1 && r[idx] !== undefined && r[idx] !== "" ? r[idx] : defaultVal;
}
async function renderIuranCustom(data) {
  let headers = (data.headers || []).map(h => h.toLowerCase().trim());
  let rows = data.rows || [];
  let nominalIdx = headers.indexOf('nominal');
  let statusIdx = headers.indexOf('status');
  let totalBelumBayar = 0;
  rows.forEach(r => {
    let statusVal = statusIdx > -1 ? (r[statusIdx] || '') : 'Belum Lunas';
    let statusLower = statusVal.toLowerCase().trim();
    let nominalVal = nominalIdx > -1 ? (Number(r[nominalIdx].toString().replace(/[^0-9]/g, '')) || 0) : 0;
    if (!statusLower.includes('lunas') || statusLower.includes('belum')) {
      totalBelumBayar += nominalVal;
    }
  });

  await loadViewTemplate('iuran');

  let rtContainer = document.getElementById('iuran-rt-tambah-container');
  if (rtContainer) {
    if (session.role === 'RT') {
      rtContainer.innerHTML = `
        <div class="mb-4 flex justify-end">
          <button onclick="bukaModalTambahIuranRT()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-bold shadow transition flex items-center gap-1">
            <i class="bi bi-plus-circle-fill"></i> + Tambah Tagihan / Iuran Warga
          </button>
        </div>
      `;
    } else {
      rtContainer.innerHTML = '';
    }
  }

  let elNama = document.getElementById('iuran-nama-warga');
  if (elNama) elNama.innerText = session.nama || session.nik;

  let elNikRole = document.getElementById('iuran-nik-role');
  if (elNikRole) elNikRole.innerText = `NIK: ${session.nik} | Role: ${session.role}`;

  let elTotal = document.getElementById('total-belum-bayar');
  if (elTotal) elTotal.innerText = `Rp ${totalBelumBayar.toLocaleString('id-ID')}`;

  let elListTitle = document.getElementById('iuran-list-title');
  if (elListTitle) elListTitle.innerText = session.role === 'RT' ? 'Semua Riwayat & Tagihan Warga' : 'Daftar Tagihan Iuran Warga';

  renderListBulanDatabase(rows, headers);
}
function renderListBulanDatabase(rows, headers) {
  let container = document.getElementById('list-bulan-iuran');
  if(!container) return;
  container.innerHTML = '';
  if (rows.length === 0) {
    container.innerHTML = `<div class="text-center p-4 text-gray-400 text-xs">Belum ada data iuran atau tagihan tercatat.</div>`;
    return;
  }
  let idIdx = headers.indexOf('id') > -1 ? headers.indexOf('id') : 0;
  rows.forEach((r) => {
    let rowId = r[idIdx] || '';
    let bulanVal = getVal(r, headers, 'bulan', '-');
    let tahunVal = getVal(r, headers, 'tahun', new Date().getFullYear().toString());
    let namaVal = getVal(r, headers, 'nama', '-');
    let nominalRaw = getVal(r, headers, 'nominal', '0');
    let nominalVal = Number(nominalRaw.toString().replace(/[^0-9]/g, '')) || 0;
    let statusVal = getVal(r, headers, 'status', 'Belum Lunas');
    let statusLower = statusVal.toLowerCase().trim();
    let tglBayar = getVal(r, headers, 'tanggal_bayar', '-');
    let buktiUrl = getVal(r, headers, 'bukti_transfer', '');
    let isLunas = statusLower === 'lunas' || (statusLower.includes('lunas') && !statusLower.includes('belum'));
    let isMenunggu = statusLower.includes('menunggu') || statusLower.includes('verifikasi');
    let badgeHtml = '';
    if (isLunas) {
      badgeHtml = `
        <div class="text-right">
          <span class="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-bold">LUNAS</span>
          <span class="block text-[9px] text-gray-400 mt-0.5"><i class="bi bi-clock me-1"></i>${tglBayar}</span>
        </div>`;
    } else if (isMenunggu) {
      if (session.role === 'RT') {
        badgeHtml = `
          <div class="text-right flex flex-col items-end gap-1">
            <span class="bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold">Menunggu Verifikasi</span>
            ${buktiUrl && buktiUrl !== '-' ? `<button onclick="bukaPopUpFoto('${buktiUrl}')" class="text-[10px] text-blue-600 underline font-semibold">Cek Bukti Foto</button>` : ''}
            <div class="flex items-center gap-1 mt-0.5">
              <button onclick="verifikasiPembayaranRT('${rowId}')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold shadow transition">ACC / Verifikasi Lunas</button>
              <button onclick="bukaModalEditIuranRT('${rowId}')" title="Edit Tagihan" class="bg-amber-500 hover:bg-amber-600 text-white p-1 px-2 rounded-lg text-[10px] font-bold shadow transition flex items-center gap-1"><i class="bi bi-pencil-square"></i> Edit</button>
              <button onclick="hapusIuranRT('${rowId}')" title="Hapus Tagihan" class="bg-rose-600 hover:bg-rose-700 text-white p-1 px-2 rounded-lg text-[10px] font-bold shadow transition flex items-center gap-1"><i class="bi bi-trash-fill"></i> Hapus</button>
            </div>
          </div>`;
      } else {
        badgeHtml = `
          <div class="text-right">
            <span class="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-bold">Menunggu Verifikasi</span>
            ${buktiUrl && buktiUrl !== '-' ? `<span class="block text-[9px] text-blue-600 cursor-pointer mt-0.5 underline font-semibold" onclick="bukaPopUpFoto('${buktiUrl}')">Lihat Bukti Foto</span>` : ''}
          </div>`;
      }
    } else {
      if (session.role === 'RT') {
        badgeHtml = `
          <div class="text-right flex flex-col items-end gap-1">
            <span class="bg-rose-100 text-rose-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold">Belum Lunas</span>
            <div class="flex items-center gap-1 mt-0.5">
              <button onclick="verifikasiPembayaranRT('${rowId}')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold shadow transition">+ Tandai Lunas</button>
              <button onclick="bukaModalEditIuranRT('${rowId}')" title="Edit Tagihan" class="bg-amber-500 hover:bg-amber-600 text-white p-1 px-2 rounded-lg text-[10px] font-bold shadow transition flex items-center gap-1"><i class="bi bi-pencil-square"></i> Edit</button>
              <button onclick="hapusIuranRT('${rowId}')" title="Hapus Tagihan" class="bg-rose-600 hover:bg-rose-700 text-white p-1 px-2 rounded-lg text-[10px] font-bold shadow transition flex items-center gap-1"><i class="bi bi-trash-fill"></i> Hapus</button>
            </div>
          </div>`;
      } else {
        badgeHtml = `<button onclick="bukaModalBayarIuran('${rowId}', '${bulanVal}', '${tahunVal}', '${nominalVal}')" class="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl text-[11px] font-bold shadow transition">Bayar</button>`;
      }
    }
    container.innerHTML += `
      <div class="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 border border-gray-100 transition">
        <div>
          <p class="font-bold text-gray-800 text-xs">${bulanVal} ${tahunVal} <span class="text-[10px] font-normal text-gray-500">(${namaVal})</span></p>
          <p class="text-[10px] text-blue-600 font-semibold">Nominal: Rp ${nominalVal.toLocaleString('id-ID')}</p>
        </div>
        <div>${badgeHtml}</div>
      </div>
    `;
  });
}
function calculateCRC16(str) {
  let crc = 0xFFFF;
  for (let c = 0; c < str.length; c++) {
    crc ^= str.charCodeAt(c) << 8;
    for (let i = 0; i < 8; i++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
    }
  }
  let hex = (crc & 0xFFFF).toString(16).toUpperCase();
  while (hex.length < 4) hex = '0' + hex;
  return hex;
}
function generateDynamicQRIS(staticQris, nominal) {
  let qris = staticQris.trim();
  if (qris.includes('010211')) {
    qris = qris.replace('010211', '010212');
  }
  if (qris.includes('6304')) {
    qris = qris.split('6304')[0];
  }
  let amountStr = Math.round(nominal).toString();
  let lenStr = amountStr.length < 10 ? '0' + amountStr.length : amountStr.length.toString();
  let tag54 = '54' + lenStr + amountStr;
  if (qris.includes('5802ID')) {
    qris = qris.replace('5802ID', tag54 + '5802ID');
  } else {
    qris += tag54;
  }
  qris += '6304';
  let crc = calculateCRC16(qris);
  return qris + crc;
}
function bukaModalBayarIuran(id, bulan, tahun, nominal) {
  activeBayarId = id;
  let infoEl = document.getElementById('info-bayar-target');
  if (infoEl) {
    infoEl.innerText = `Iuran ${bulan} ${tahun} - Rp ${Number(nominal).toLocaleString('id-ID')}`;
  }
  let fileInp = document.getElementById('iuran-bukti-file');
  if (fileInp) fileInp.value = '';
  let baseStaticQris = (typeof appSettings !== 'undefined' && appSettings.payment_qris_string)
    ? appSettings.payment_qris_string
    : "00020101021126570011ID.DANA.WWW011893600915311093669202091109366920303UKE51440014ID.CO.QRIS.WWW0215ID10210624013640303UKE5204899953033605802ID5909SHN GROUP6010Kab. Bogor6105163206304BAFC"; 
  let qrisDinamisString = generateDynamicQRIS(baseStaticQris, nominal);
  let qrImgEl = document.getElementById('qris-dynamic-img');
  if (qrImgEl) {
    qrImgEl.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrisDinamisString)}`;
  }
  let merchantEl = document.getElementById('qris-merchant-name');
  if (merchantEl) {
    merchantEl.innerText = (typeof appSettings !== 'undefined' && appSettings.payment_qris_name) ? appSettings.payment_qris_name : 'RT 5 / RW 01';
  }
  let tfBox = document.getElementById('content-tf');
  if (tfBox) {
    let rekList = [];
    try { rekList = JSON.parse((typeof appSettings !== 'undefined' && appSettings.payment_rekening) || '[]'); } catch(e) {}
    if (!Array.isArray(rekList) || rekList.length === 0) {
      rekList = [
        { bank: 'DANA', no: '08973366667', an: 'RIZKY NOVIANSYAH' },
        { bank: 'BRI', no: '231313', an: 'RIZKY NOVIANSYAH' }
      ];
    }
    let tfHtml = `<div class="bg-blue-50 p-3 rounded-xl border border-blue-100 space-y-1">`;
    rekList.forEach(r => {
      tfHtml += `<p class="text-gray-700 font-bold">${r.bank}: <span class="text-blue-700 font-mono">${r.no}</span> ${r.an ? `<small class="text-gray-500 font-normal">(a.n ${r.an})</small>` : ''}</p>`;
    });
    tfHtml += `</div>`;
    tfBox.innerHTML = tfHtml;
  }
  let modal = document.getElementById('modal-bayar-iuran');
  if (modal) modal.classList.remove('hidden');
}
function tutupModalBayarIuran() {
  let modal = document.getElementById('modal-bayar-iuran');
  if (modal) modal.classList.add('hidden');
}
async function prosesKirimBuktiBayar() {
  if (!activeBayarId) {
    alert('ID Tagihan iuran tidak ditemukan!');
    return;
  }
  let fileInp = document.getElementById('iuran-bukti-file');
  let file = fileInp && fileInp.files ? fileInp.files[0] : null;
  if (!file) {
    alert('Silakan pilih dan upload foto bukti transfer terlebih dahulu!');
    return;
  }
  let btnSubmit = document.getElementById('btn-kirim-bukti');
  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.innerText = 'Mengunggah & Mengirim...';
  }
  try {
    let compressedUrl = (typeof compressImageFile === 'function') ? await compressImageFile(file) : await new Promise(r => { let rd = new FileReader(); rd.onload = e => r(e.target.result); rd.readAsDataURL(file); });
    let formData = {
      status: 'Menunggu Verifikasi',
      bukti_transfer: compressedUrl
    };
    const res = await callGASPost('updateDataDiSheet', {
      sheetName: 'Iuran',
      id: activeBayarId,
      formData: formData
    });
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerText = 'Kirim Bukti Pembayaran';
    }
    if (res && res.status === 'success') {
      alert('Bukti transfer berhasil dikirim! Status pembayaran kini Menunggu Verifikasi RT.');
      tutupModalBayarIuran();
      loadIuranView();
    } else {
      alert('Gagal mengirim bukti: ' + (res ? res.message : 'Terjadi kesalahan'));
    }
  } catch (err) {
    alert('Gagal membaca file foto: ' + err.message);
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerText = 'Kirim Bukti Pembayaran';
    }
  }
}
async function verifikasiPembayaranRT(id) {
  showUIConfirm('Apakah Anda yakin ingin memverifikasi pembayaran iuran ini menjadi LUNAS?', async function() {
    let nowFormatted = new Date().toLocaleDateString('id-ID', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    }) + ' ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':') + ' WIB';
    let formData = {
      status: 'LUNAS',
      tanggal_bayar: nowFormatted,
      diterima_oleh: 'RT 5 (' + (session.nama || 'Pengurus') + ')'
    };
    let res = await safeSupabaseUpdate('Iuran', formData, 'id', id);
    if (res && (!res.error || res.status === 'success')) {
      delete menuDataCache['Iuran'];
      let idIdx = iuranHeaders.indexOf('id');
      let iuranItem = rawIuranData.find(r => idIdx > -1 && String(r[idIdx]) === String(id));
      let namaWarga = getVal(iuranItem || [], iuranHeaders, 'nama', 'Warga');
      let bulan = getVal(iuranItem || [], iuranHeaders, 'bulan', 'Iuran');
      let tahun = getVal(iuranItem || [], iuranHeaders, 'tahun', new Date().getFullYear());
      let nominal = getVal(iuranItem || [], iuranHeaders, 'nominal', '25000');
      let bukti = getVal(iuranItem || [], iuranHeaders, 'bukti_transfer', '-');
      let nominalNum = Number(nominal.toString().replace(/[^0-9]/g, '')) || 0;
      let kasItem = {
        id: 'KAS-' + Date.now(),
        tanggal: nowFormatted,
        pemasukan: nominalNum,
        pengeluaran: 0,
        keterangan: `Pembayaran Iuran ${bulan} ${tahun} (${namaWarga})`,
        saldo: 0,
        foto_url: bukti || '-'
      };
      try {
        await safeSupabaseInsert('Keuangan', [kasItem]);
        delete menuDataCache['Keuangan'];
      } catch (e) {
        console.error('Gagal otomatis mencatat ke Keuangan:', e);
      }
      let modalEl = document.getElementById('formModal');
      if (modalEl) {
        let mInst = bootstrap.Modal.getInstance(modalEl);
        if (mInst) mInst.hide();
      }
      showUIToast('Pembayaran iuran LUNAS & otomatis masuk Laporan Keuangan!', 'success');
      loadMenu('Iuran');
      fetchNotifikasi();
    }
  }, 'Verifikasi Iuran');
}
function bukaModalEditIuranRT(id) {
  let idIdx = iuranHeaders.indexOf('id');
  let iuranItem = rawIuranData.find(r => idIdx > -1 && String(r[idIdx]) === String(id));
  if (!iuranItem) {
    showUIToast('Data iuran tidak ditemukan!', 'error');
    return;
  }
  let styleId = 'hide-modal-footer-override';
  if (!document.getElementById(styleId)) {
    let style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `#formModal .modal-footer { display: none !important; }`;
    document.head.appendChild(style);
  }
  let nikVal = getVal(iuranItem, iuranHeaders, 'nik', '');
  let namaVal = getVal(iuranItem, iuranHeaders, 'nama', '');
  let bulanVal = getVal(iuranItem, iuranHeaders, 'bulan', 'Januari');
  let tahunVal = getVal(iuranItem, iuranHeaders, 'tahun', new Date().getFullYear().toString());
  let nominalVal = getVal(iuranItem, iuranHeaders, 'nominal', '25000');
  let statusVal = getVal(iuranItem, iuranHeaders, 'status', 'Belum Lunas');
  let months = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  let bulanOpts = months.map(m => `<option value="${m}" ${m === bulanVal ? 'selected' : ''}>${m}</option>`).join('');
  let currentYear = new Date().getFullYear();
  let yearOptions = '';
  for (let y = currentYear - 2; y <= currentYear + 3; y++) {
    yearOptions += `<option value="${y}" ${String(y) === String(tahunVal) ? 'selected' : ''}>${y}</option>`;
  }
  let htmlForm = `
    <div class="p-2 space-y-3 text-xs">
      <div>
        <label class="font-bold text-gray-600 mb-1 block">Nama Warga</label>
        <input type="text" id="edit-iuran-nama" value="${namaVal}" class="w-full p-2 border rounded-xl bg-gray-50" readonly>
      </div>
      <div>
        <label class="font-bold text-gray-600 mb-1 block">NIK Warga</label>
        <input type="text" id="edit-iuran-nik" value="${nikVal}" class="w-full p-2 border rounded-xl bg-gray-50" readonly>
      </div>
      <div>
        <label class="font-bold text-gray-600 mb-1 block">Bulan Iuran</label>
        <select id="edit-iuran-bulan" class="w-full p-2 border rounded-xl bg-white">
          ${bulanOpts}
        </select>
      </div>
      <div>
        <label class="font-bold text-gray-600 mb-1 block">Tahun</label>
        <select id="edit-iuran-tahun" class="w-full p-2 border rounded-xl bg-white">
          ${yearOptions}
        </select>
      </div>
      <div>
        <label class="font-bold text-gray-600 mb-1 block">Nominal Tagihan (Rp)</label>
        <input type="number" id="edit-iuran-nominal" value="${nominalVal}" class="w-full p-2 border rounded-xl bg-white">
      </div>
      <div>
        <label class="font-bold text-gray-600 mb-1 block">Status Pembayaran</label>
        <select id="edit-iuran-status" class="w-full p-2 border rounded-xl bg-white">
          <option value="Belum Lunas" ${statusVal.toLowerCase().includes('belum') ? 'selected' : ''}>Belum Lunas</option>
          <option value="Menunggu Verifikasi" ${statusVal.toLowerCase().includes('menunggu') ? 'selected' : ''}>Menunggu Verifikasi</option>
          <option value="Lunas" ${statusVal.toLowerCase() === 'lunas' ? 'selected' : ''}>Lunas</option>
        </select>
      </div>
      <div class="pt-2">
        <button type="button" onclick="simpanEditIuranRT(event, '${id}')" class="w-full bg-amber-600 hover:bg-amber-700 text-white p-2.5 rounded-xl font-bold shadow transition">Simpan Perubahan</button>
      </div>
    </div>
  `;
  document.getElementById('formModalTitle').innerText = 'Edit Tagihan Iuran Warga';
  document.getElementById('dynamicForm').innerHTML = htmlForm;
  document.getElementById('btn-hapus-modal').style.display = 'none';
  let modal = new bootstrap.Modal(document.getElementById('formModal'));
  modal.show();
}
async function simpanEditIuranRT(event, id) {
  if (event) event.preventDefault();
  let updatePayload = {
    bulan: document.getElementById('edit-iuran-bulan').value,
    tahun: document.getElementById('edit-iuran-tahun').value,
    nominal: document.getElementById('edit-iuran-nominal').value || '25000',
    status: document.getElementById('edit-iuran-status').value
  };
  if (updatePayload.status.toUpperCase() === 'LUNAS') {
    let nowFormatted = new Date().toLocaleDateString('id-ID', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    }) + ' ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':') + ' WIB';
    updatePayload.tanggal_bayar = nowFormatted;
    updatePayload.diterima_oleh = 'RT 5 (' + (session.nama || 'Pengurus') + ')';
  }
  let res = await safeSupabaseUpdate('Iuran', updatePayload, 'id', id);
  if (res && (!res.error || res.status === 'success')) {
    delete menuDataCache['Iuran'];
    showUIToast('Tagihan iuran berhasil diperbarui!', 'success');
    let modalEl = document.getElementById('formModal');
    let modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (modalInstance) modalInstance.hide();
    loadIuranView();
  } else {
    showUIToast('Gagal menyimpan: ' + ((res && res.error) ? res.error.message : 'Terjadi kesalahan'), 'error');
  }
}
async function hapusIuranRT(id) {
  showUIConfirm('Apakah Anda yakin ingin menghapus data tagihan iuran ini?', async function() {
    let res = await safeSupabaseDelete('Iuran', 'id', id);
    if (res && (!res.error || res.status === 'success')) {
      delete menuDataCache['Iuran'];
      showUIToast('Data tagihan iuran berhasil dihapus!', 'success');
      loadIuranView();
    } else {
      showUIToast('Gagal menghapus: ' + ((res && res.error) ? res.error.message : 'Terjadi kesalahan'), 'error');
    }
  }, 'Hapus Tagihan Iuran');
}
async function bukaModalTambahIuranRT() {
  let styleId = 'hide-modal-footer-override';
  if (!document.getElementById(styleId)) {
    let style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `#formModal .modal-footer { display: none !important; }`;
    document.head.appendChild(style);
  }
  const res = await callGASGet('getDaftarWargaUntukIuran');
  let wargaOptions = '<option value="">Pilih Warga...</option>';
  if (res && res.status === 'success' && res.data) {
    res.data.forEach(w => {
      let wNik = (typeof cariNilaiKolom === 'function' ? cariNilaiKolom(w, ['nik', 'ktp']) : '') || w.nik || w.NIK || '';
      let wNama = (typeof cariNilaiKolom === 'function' ? cariNilaiKolom(w, ['nama_lengkap', 'nama', 'name', 'nama_panggilan']) : '') || w.nama || w.Nama || '';
      let wKk = (typeof cariNilaiKolom === 'function' ? cariNilaiKolom(w, ['no_kk', 'kk', 'nomor_kk']) : '') || w.no_kk || w.KK || '';
      if (wNik || wNama) {
        wargaOptions += `<option value="${wNik}" data-nama="${wNama}" data-kk="${wKk}">${wNama} (NIK: ${wNik})</option>`;
      }
    });
  }
  let currentYear = new Date().getFullYear();
  let yearOptions = '';
  for (let y = currentYear - 2; y <= currentYear + 3; y++) {
    yearOptions += `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`;
  }
  let htmlForm = `
    <div class="p-2 space-y-3 text-xs">
      <div>
        <label class="font-bold text-gray-600 mb-1 block">Pilih Warga</label>
        <select id="iuran-pilih-warga" class="w-full p-2 border rounded-xl bg-white" onchange="isiOtomatisWarga(this)">
          ${wargaOptions}
        </select>
      </div>
      <div>
        <label class="font-bold text-gray-600 mb-1 block">NIK Warga</label>
        <input type="text" id="iuran-input-nik" class="w-full p-2 border rounded-xl bg-gray-50" readonly>
      </div>
      <div>
        <label class="font-bold text-gray-600 mb-1 block">Nama Warga</label>
        <input type="text" id="iuran-input-nama" class="w-full p-2 border rounded-xl bg-gray-50" readonly>
      </div>
      <div>
        <label class="font-bold text-gray-600 mb-1 block">Nomor KK</label>
        <input type="text" id="iuran-input-kk" class="w-full p-2 border rounded-xl bg-gray-50" readonly>
      </div>
      <div>
        <label class="font-bold text-gray-600 mb-1 block">Bulan Iuran</label>
        <select id="iuran-input-bulan" class="w-full p-2 border rounded-xl bg-white">
          <option value="Januari">Januari</option><option value="Februari">Februari</option><option value="Maret">Maret</option>
          <option value="April">April</option><option value="Mei">Mei</option><option value="Juni">Juni</option>
          <option value="Juli">Juli</option><option value="Agustus">Agustus</option><option value="September">September</option>
          <option value="Oktober">Oktober</option><option value="November">November</option><option value="Desember">Desember</option>
        </select>
      </div>
      <div>
        <label class="font-bold text-gray-600 mb-1 block">Tahun</label>
        <select id="iuran-input-tahun" class="w-full p-2 border rounded-xl bg-white">
          ${yearOptions}
        </select>
      </div>
      <div>
        <label class="font-bold text-gray-600 mb-1 block">Nominal Tagihan (Rp)</label>
        <input type="number" id="iuran-input-nominal" value="25000" class="w-full p-2 border rounded-xl bg-white">
      </div>
      <div>
        <label class="font-bold text-gray-600 mb-1 block">Status Pembayaran</label>
        <select id="iuran-input-status" class="w-full p-2 border rounded-xl bg-white">
          <option value="Belum Lunas">Belum Lunas</option>
          <option value="Menunggu Verifikasi">Menunggu Verifikasi</option>
          <option value="Lunas">Lunas</option>
        </select>
      </div>
      <button type="button" onclick="simpanIuranBaruRT(event)" class="w-full bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl font-bold shadow transition mt-2">Simpan Tagihan Iuran</button>
    </div>
  `;
  document.getElementById('formModalTitle').innerText = 'Tambah Tagihan Iuran Warga';
  document.getElementById('dynamicForm').innerHTML = htmlForm;
  document.getElementById('btn-hapus-modal').style.display = 'none';
  let modal = new bootstrap.Modal(document.getElementById('formModal'));
  modal.show();
}
function isiOtomatisWarga(selectEl) {
  let opt = selectEl.options[selectEl.selectedIndex];
  let nik = opt.value || '';
  let nama = opt.getAttribute('data-nama') || '';
  let kk = opt.getAttribute('data-kk') || '';
  if (nik === 'undefined') nik = '';
  if (nama === 'undefined') nama = '';
  if (kk === 'undefined') kk = '';
  document.getElementById('iuran-input-nik').value = nik;
  document.getElementById('iuran-input-nama').value = nama;
  document.getElementById('iuran-input-kk').value = kk;
}
async function simpanIuranBaruRT(event) {
  if (event) event.preventDefault();
  let formData = {
    nik: document.getElementById('iuran-input-nik').value,
    nama: document.getElementById('iuran-input-nama').value,
    no_kk: document.getElementById('iuran-input-kk').value,
    bulan: document.getElementById('iuran-input-bulan').value,
    tahun: document.getElementById('iuran-input-tahun').value,
    nominal: document.getElementById('iuran-input-nominal').value || '25000',
    status: document.getElementById('iuran-input-status').value,
    tanggal_bayar: '-',
    diterima_oleh: '-'
  };
  if(!formData.nik) {
    alert('Silakan pilih warga terlebih dahulu!');
    return;
  }
  if (formData.status.toUpperCase() === 'LUNAS') {
    let nowFormatted = new Date().toLocaleDateString('id-ID', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    }) + ' ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':') + ' WIB';
    formData.tanggal_bayar = nowFormatted;
    formData.diterima_oleh = 'RT 5 (' + (session.nama || 'Pengurus') + ')';
    let kasItem = {
      id: 'KAS-' + Date.now(),
      tanggal: nowFormatted,
      pemasukan: Number(formData.nominal) || 0,
      pengeluaran: 0,
      keterangan: `Pembayaran Iuran ${formData.bulan} ${formData.tahun} (${formData.nama})`,
      saldo: 0,
      foto_url: '-'
    };
    try {
      await safeSupabaseInsert('Keuangan', [kasItem]);
      delete menuDataCache['Keuangan'];
    } catch (e) {}
  }
  const res = await callGASPost('simpanDataKeSheet', { sheetName: 'Iuran', formData: formData });
  if (res && res.status === 'success') {
    showUIToast('Tagihan iuran berhasil ditambahkan!', 'success');
    let modalEl = document.getElementById('formModal');
    let modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (modalInstance) modalInstance.hide();
    if (typeof clearAppCache === 'function') clearAppCache();
    loadIuranView();
  } else {
    showUIToast('Gagal menyimpan: ' + (res.message || 'Terjadi kesalahan'), 'error');
  }
}
function switchTabBayar(type) {
  let btnQris = document.getElementById('tab-qris-btn');
  let btnTf = document.getElementById('tab-tf-btn');
  let boxQris = document.getElementById('content-qris');
  let boxTf = document.getElementById('content-tf');
  if(type === 'qris') {
    btnQris.className = "py-2 rounded-lg bg-white text-blue-600 shadow-sm transition font-bold";
    btnTf.className = "py-2 rounded-lg text-gray-500 transition";
    boxQris.classList.remove('hidden');
    boxTf.classList.add('hidden');
  } else {
    btnTf.className = "py-2 rounded-lg bg-white text-blue-600 shadow-sm transition font-bold";
    btnQris.className = "py-2 rounded-lg text-gray-500 transition";
    boxTf.classList.remove('hidden');
    boxQris.classList.add('hidden');
  }
}
function kirimKonfirmasiWA() {
  let pesan = `Halo Pengurus RT 5, saya ${session.nama || session.nik} ingin konfirmasi telah mengirimkan bukti pembayaran iuran bulanan warga.`;
  window.open(`https://wa.me/${noWaAdmin}?text=${encodeURIComponent(pesan)}`, '_blank');
}
const originalLoadMenuIuran = window.loadMenu;
window.loadMenu = async function(menu) {
  if (menu === 'Iuran') {
    currentActiveMenu = menu;
    syncActiveNav(menu);
    document.getElementById('page-title').innerText = 'Iuran Warga';
    document.getElementById('rek-info').style.display = 'none';
    await loadIuranView();
  } else {
    if (typeof originalLoadMenuIuran === 'function') originalLoadMenuIuran(menu);
  }
};
