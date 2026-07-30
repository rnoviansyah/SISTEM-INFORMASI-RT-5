let rawIuranData = [];
let iuranHeaders = [];

async function loadIuranView() {
  document.getElementById('main-content').innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><br><small class="text-muted mt-2 d-block">Memuat data iuran...</small></div>';
  
  const res = await callGASGet('getIuranData');
  if (res && res.status === 'success') {
    rawIuranData = res.rows || [];
    iuranHeaders = res.headers || [];
    renderIuranCustom(res);
  } else {
    document.getElementById('main-content').innerHTML = `<div class="alert alert-danger">${res.message || 'Gagal memuat data'}</div>`;
  }
}

function renderIuranCustom(data) {
  let headers = (data.headers || []).map(h => h.toLowerCase().trim());
  let rows = data.rows || [];
  
  let nominalIdx = headers.indexOf('nominal');
  let statusIdx = headers.indexOf('status');
  
  let totalBelumBayar = 0;
  rows.forEach(r => {
    let statusVal = statusIdx > -1 ? (r[statusIdx] || '') : '';
    let nominalVal = nominalIdx > -1 ? (Number(r[nominalIdx].toString().replace(/[^0-9]/g, '')) || 0) : 30000;
    if(statusVal.toLowerCase().includes('belum')) {
      totalBelumBayar += nominalVal;
    }
  });

  let html = `
    <div class="p-1 text-gray-800 font-sans">
      <!-- Header Banner Status Iuran -->
      <div class="bg-gradient-to-r from-blue-900 to-blue-600 text-white p-5 rounded-2xl shadow-md mb-4 text-center">
        <h2 class="font-bold text-lg mb-1"><i class="bi bi-wallet2 me-2"></i>Status Iuran Warga 2026</h2>
        <p class="text-xs text-blue-100">Transparan, Cek Status & Pembayaran Bulanan RT 05</p>
      </div>

      <!-- Tombol Tambah Khusus RT -->
      ${session.role === 'RT' ? `
        <div class="mb-4 flex justify-end">
          <button onclick="bukaModalTambahIuranRT()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-bold shadow transition flex items-center gap-1">
            <i class="bi bi-plus-circle-fill"></i> + Tambah Tagihan / Iuran Warga
          </button>
        </div>
      ` : ''}

      <!-- Card Ringkasan Tagihan / Warga -->
      <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-4">
        <div class="flex justify-between items-center mb-3">
          <div>
            <h4 class="font-bold text-gray-800 text-sm" id="iuran-nama-warga">${session.nama || session.nik}</h4>
            <p class="text-[10px] text-gray-400 font-mono">NIK: ${session.nik} | Role: ${session.role}</p>
          </div>
          <span class="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full text-[11px] font-bold border border-blue-100">Aktif</span>
        </div>

        <div class="bg-rose-50 border border-rose-100 p-3.5 rounded-xl flex items-center justify-between">
          <div>
            <p class="text-[10px] text-rose-500 uppercase font-bold">Total Belum Bayar</p>
            <p class="font-bold text-rose-700 text-base" id="total-belum-bayar">Rp ${totalBelumBayar.toLocaleString('id-ID')}</p>
          </div>
          <button onclick="bukaModalBayarIuran()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow transition flex items-center gap-1">
            <i class="bi bi-credit-card-2-front-fill"></i> Bayar Iuran
          </button>
        </div>
      </div>

      <!-- List Bulan Iuran -->
      <div class="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 p-3 space-y-2">
        <h3 class="font-bold text-xs text-gray-500 uppercase px-2 mb-2">${session.role === 'RT' ? 'Semua Riwayat & Tagihan Warga' : 'Daftar Tagihan Iuran Warga'}</h3>
        
        <div id="list-bulan-iuran" class="space-y-2">
          <!-- Render via JS -->
        </div>
      </div>
    </div>

    <!-- MODAL PEMBAYARAN / KONFIRMASI (QRIS / TRANSFER) -->
    <div id="modal-bayar-iuran" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="bg-white p-5 rounded-2xl w-full max-w-sm shadow-2xl relative font-sans">
        <button onclick="tutupModalBayarIuran()" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-lg w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">&times;</button>
        
        <div class="mb-3 border-b pb-2 pe-6">
          <h3 class="font-bold text-gray-800 text-sm"><i class="bi bi-shield-check text-blue-600 me-1"></i> Konfirmasi Pembayaran</h3>
        </div>

        <!-- Tab Navigasi QRIS / Transfer -->
        <div class="grid grid-cols-2 gap-1 bg-gray-100 p-1 rounded-xl mb-3 text-xs font-bold text-center">
          <button id="tab-qris-btn" onclick="switchTabBayar('qris')" class="py-2 rounded-lg bg-white text-blue-600 shadow-sm transition">Scan QRIS</button>
          <button id="tab-tf-btn" onclick="switchTabBayar('tf')" class="py-2 rounded-lg text-gray-500 transition">Transfer Bank</button>
        </div>

        <!-- Konten QRIS -->
        <div id="content-qris" class="text-center space-y-2">
          <p class="text-[10px] text-gray-500">Scan QRIS di bawah ini dengan e-wallet atau m-banking Anda:</p>
          <div class="bg-gray-50 p-3 rounded-xl border inline-block">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=SIM-RT05-IURAN" class="w-36 h-36 mx-auto rounded-lg">
          </div>
          <p class="text-[10px] font-bold text-blue-600">a.n Kas RT 05 / Rizky Noviansyah</p>
        </div>

        <!-- Konten Transfer Bank -->
        <div id="content-tf" class="hidden space-y-2 text-xs">
          <div class="bg-blue-50 p-3 rounded-xl border border-blue-100 space-y-1">
            <p class="text-gray-500 font-bold">Bank BRI: <span class="text-blue-700 font-mono">231313</span></p>
            <p class="text-gray-500 font-bold">DANA: <span class="text-blue-700 font-mono">08973366667</span></p>
            <p class="text-[10px] text-gray-400">Atas Nama: RIZKY NOVIANSYAH</p>
          </div>
          <p class="text-[10px] text-gray-500">Silakan transfer dan kirim bukti ke pengurus RT melalui tombol WhatsApp di bawah.</p>
        </div>

        <div class="mt-4 space-y-2">
          <button onclick="kirimKonfirmasiWA()" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-xl text-xs font-bold shadow transition flex items-center justify-center gap-1">
            <i class="bi bi-whatsapp"></i> Konfirmasi ke Pengurus (WA)
          </button>
          <button onclick="tutupModalBayarIuran()" class="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 p-2 rounded-xl text-xs font-bold transition">Tutup</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('main-content').innerHTML = html;
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

  let idIdx = headers.indexOf('id');
  let nikIdx = headers.indexOf('nik');
  let namaIdx = headers.indexOf('nama');
  let bulanIdx = headers.indexOf('bulan');
  let tahunIdx = headers.indexOf('tahun');
  let nominalIdx = headers.indexOf('nominal');
  let statusIdx = headers.indexOf('status');
  let tglBayarIdx = headers.indexOf('tanggal_bayar');

  rows.forEach((r) => {
    let idVal = idIdx > -1 ? r[idIdx] : (r[0] || '-');
    let nikVal = nikIdx > -1 ? r[nikIdx] : (r[1] || '-');
    let namaVal = namaIdx > -1 ? r[namaIdx] : (r[2] || '-');
    let bulanVal = bulanIdx > -1 ? r[bulanIdx] : (r[4] || '-');
    let tahunVal = tahunIdx > -1 ? r[tahunIdx] : (r[5] || '2026');
    let nominalVal = nominalIdx > -1 ? (Number(r[nominalIdx].toString().replace(/[^0-9]/g, '')) || 30000) : 30000;
    let statusVal = statusIdx > -1 ? r[statusIdx] : (r[6] || 'Belum Lunas');
    let tglBayar = tglBayarIdx > -1 ? r[tglBayarIdx] : (r[7] || '-');

    let isLunas = statusVal.toLowerCase().includes('lunas');

    let badgeHtml = isLunas 
      ? `<div class="text-right"><span class="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-bold">LUNAS</span><span class="block text-[9px] text-gray-400 mt-0.5"><i class="bi bi-clock me-1"></i>${tglBayar}</span></div>`
      : `<button onclick="bukaModalBayarIuran()" class="bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 px-3 py-1 rounded-lg text-[11px] font-bold transition">Bayar</button>`;

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

async function bukaModalTambahIuranRT() {
  const res = await callGASGet('getDaftarWargaUntukIuran');
  let wargaOptions = '<option value="">Pilih Warga...</option>';
  if (res && res.status === 'success') {
    res.data.forEach(w => {
      wargaOptions += `<option value="${w.nik}" data-nama="${w.nama}" data-kk="${w.no_kk}">${w.nama} (NIK: ${w.nik})</option>`;
    });
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
        <input type="text" id="iuran-input-tahun" value="2026" class="w-full p-2 border rounded-xl bg-gray-50" readonly>
      </div>
      <div>
        <label class="font-bold text-gray-600 mb-1 block">Nominal Tagihan (Rp)</label>
        <input type="number" id="iuran-input-nominal" value="30000" class="w-full p-2 border rounded-xl bg-white">
      </div>
      <div>
        <label class="font-bold text-gray-600 mb-1 block">Status Pembayaran</label>
        <select id="iuran-input-status" class="w-full p-2 border rounded-xl bg-white">
          <option value="Belum Lunas">Belum Lunas</option>
          <option value="Lunas">Lunas</option>
        </select>
      </div>
      <button onclick="simpanIuranBaruRT()" class="w-full bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl font-bold shadow transition mt-2">Simpan Tagihan Iuran</button>
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
  document.getElementById('iuran-input-nik').value = opt.value || '';
  document.getElementById('iuran-input-nama').value = opt.getAttribute('data-nama') || '';
  document.getElementById('iuran-input-kk').value = opt.getAttribute('data-kk') || '';
}

async function simpanIuranBaruRT() {
  let formData = {
    nik: document.getElementById('iuran-input-nik').value,
    nama: document.getElementById('iuran-input-nama').value,
    no_kk: document.getElementById('iuran-input-kk').value,
    bulan: document.getElementById('iuran-input-bulan').value,
    tahun: document.getElementById('iuran-input-tahun').value,
    nominal: document.getElementById('iuran-input-nominal').value || '30000',
    status: document.getElementById('iuran-input-status').value,
    tanggal_bayar: '-',
    diterima_oleh: '-'
  };

  if(!formData.nik) {
    alert('Silakan pilih warga terlebih dahulu!');
    return;
  }

  const res = await callGASPost('simpanDataKeSheet', { sheetName: 'Iuran', formData: formData });
  if (res && res.status === 'success') {
    alert('Tagihan iuran berhasil ditambahkan!');
    bootstrap.Modal.getInstance(document.getElementById('formModal')).hide();
    loadIuranView();
  } else {
    alert('Gagal menyimpan: ' + (res.message || 'Terjadi kesalahan'));
  }
}

function bukaModalBayarIuran() {
  let modal = document.getElementById('modal-bayar-iuran');
  if(modal) modal.classList.remove('hidden');
}

function tutupModalBayarIuran() {
  let modal = document.getElementById('modal-bayar-iuran');
  if(modal) modal.classList.add('hidden');
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
  let pesan = `Halo Pengurus RT 05, saya ${session.nama || session.nik} ingin konfirmasi pembayaran iuran bulanan warga.`;
  window.open(`https://wa.me/${noWaAdmin}?text=${encodeURIComponent(pesan)}`, '_blank');
}

// Handler Load Menu Iuran
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
