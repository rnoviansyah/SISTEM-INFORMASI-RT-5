let rawIuranData = [];
let selectedIuranWarga = null;

function renderIuranCustom(data) {
  rawIuranData = data.rows || [];
  
  let html = `
    <div class="p-1 text-gray-800 font-sans">
      <!-- Header Banner Status Iuran -->
      <div class="bg-gradient-to-r from-blue-900 to-blue-600 text-white p-5 rounded-2xl shadow-md mb-4 text-center">
        <h2 class="font-bold text-lg mb-1"><i class="bi bi-wallet2 me-2"></i>Status Iuran Warga 2026</h2>
        <p class="text-xs text-blue-100">Transparan, Cek Status & Pembayaran Bulanan RT 05</p>
      </div>

      <!-- Card Ringkasan Tagihan / Warga -->
      <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-4">
        <div class="flex justify-between items-center mb-3">
          <div>
            <h4 class="font-bold text-gray-800 text-sm" id="iuran-nama-warga">RIZKY NOVIANSYAH</h4>
            <p class="text-[10px] text-gray-400 font-mono">Blok / Alamat RT 05</p>
          </div>
          <span class="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full text-[11px] font-bold border border-blue-100">Aktif</span>
        </div>

        <div class="bg-rose-50 border border-rose-100 p-3.5 rounded-xl flex items-center justify-between">
          <div>
            <p class="text-[10px] text-rose-500 uppercase font-bold">Jumlah Belum Bayar</p>
            <p class="font-bold text-rose-700 text-base" id="total-belum-bayar">Rp 90.000</p>
          </div>
          <button onclick="bukaModalBayarIuran()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow transition flex items-center gap-1">
            <i class="bi bi-credit-card-2-front-fill"></i> Bayar Iuran
          </button>
        </div>
      </div>

      <!-- List Bulan Iuran -->
      <div class="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 p-3 space-y-2">
        <h3 class="font-bold text-xs text-gray-500 uppercase px-2 mb-2">Daftar Bulan Tahun 2026</h3>
        
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
  loadListBulanDummy();
}

function loadListBulanDummy() {
  let bulanList = [
    { bulan: 'Januari', status: 'Lunas', tgl: '11/01/26 15:04', oleh: 'Bendahara' },
    { bulan: 'Februari', status: 'Lunas', tgl: '05/02/26 17:59', oleh: 'Bendahara' },
    { bulan: 'Maret', status: 'Lunas', tgl: '09/03/26 12:40', oleh: 'Bendahara' },
    { bulan: 'April', status: 'Belum', tgl: '-', oleh: '-' },
    { bulan: 'Mei', status: 'Belum', tgl: '-', oleh: '-' },
    { bulan: 'Juni', status: 'Belum', tgl: '-', oleh: '-' },
  ];

  let container = document.getElementById('list-bulan-iuran');
  if(!container) return;
  container.innerHTML = '';

  bulanList.forEach((item) => {
    let isLunas = item.status === 'Lunas';
    let badgeHtml = isLunas 
      ? `<div class="text-right"><span class="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-bold">LUNAS</span><span class="block text-[9px] text-gray-400 mt-0.5"><i class="bi bi-clock me-1"></i>${item.tgl} | <i class="bi bi-person me-1"></i>${item.oleh}</span></div>`
      : `<button onclick="bukaModalBayarIuran()" class="bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 px-3 py-1 rounded-lg text-[11px] font-bold transition">Bayar</button>`;

    container.innerHTML += `
      <div class="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 border border-gray-100 transition">
        <div>
          <p class="font-bold text-gray-800 text-xs">${item.bulan}</p>
          <p class="text-[10px] text-gray-400">${isLunas ? 'Iuran bulanan tercatat' : 'Belum melakukan pembayaran'}</p>
        </div>
        <div>${badgeHtml}</div>
      </div>
    `;
  });
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
  let pesan = "Halo Pengurus RT 05, saya ingin konfirmasi pembayaran iuran bulanan warga.";
  window.open(`https://wa.me/${noWaAdmin}?text=${encodeURIComponent(pesan)}`, '_blank');
}

// Handler Load Menu Iuran
const originalLoadMenuIuran = window.loadMenu;
window.loadMenu = async function(menu) {
  if (menu === 'Iuran') {
    currentActiveMenu = menu;
    syncActiveNav(menu);
    document.getElementById('page-title').innerText = 'Iuran Warga';
    document.getElementById('main-content').innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><br><small class="text-muted mt-2 d-block">Memuat data iuran...</small></div>';
    document.getElementById('rek-info').style.display = 'none';

    // Karena ini data custom, kita bisa pakai callGASGet atau render langsung
    renderIuranCustom({ rows: [] });
  } else {
    if (typeof originalLoadMenuIuran === 'function') originalLoadMenuIuran(menu);
  }
};
