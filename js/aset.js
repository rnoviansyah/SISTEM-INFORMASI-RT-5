let rawAsetData = [];
let listDaftarBarang = [];
let activeVerifikasiData = null;
let activeKembaliData = null;
let currentAsetTab = 'stok';
let isEditModeAset = false;
function renderAsetCustom(data) {
  rawAsetData = data.rows || [];
  let isRt = session && session.role === 'RT';
  let btnRtTambah = isRt ? `
    <button onclick="bukaModalTambahAset()" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-xl text-xs shadow transition flex items-center gap-1">
      <i class="bi bi-plus-circle"></i> + Tambah Barang Aset
    </button>
  ` : '';
  let html = `
    <div class="p-1 text-gray-800 font-sans space-y-4">
      <div class="flex justify-between items-center flex-wrap gap-2">
        <h2 class="font-bold text-base text-gray-800"><i class="bi bi-tools me-2 text-blue-600"></i>Aset & Inventaris RT 008/006</h2>
        <div class="flex gap-2">
          ${btnRtTambah}
          <button onclick="bukaModalPinjamBarang()" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-xl text-xs shadow transition flex items-center gap-1">
            <i class="bi bi-plus-lg"></i> Form Peminjaman Barang
          </button>
        </div>
      </div>
      <div class="bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 flex gap-2">
        <button id="tab-btn-stok" onclick="switchAsetTab('stok')" class="flex-1 py-2 px-3 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 ${currentAsetTab === 'stok' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}">
          <span>📦</span> Daftar Barang Aset RT
        </button>
        <button id="tab-btn-riwayat" onclick="switchAsetTab('riwayat')" class="flex-1 py-2 px-3 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 ${currentAsetTab === 'riwayat' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}">
          <span>📋</span> Riwayat Peminjaman Warga
        </button>
      </div>
      <div id="tab-content-stok" class="${currentAsetTab === 'stok' ? 'block' : 'hidden'} bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 p-4">
        <div class="flex justify-between items-center mb-3">
          <h3 class="font-bold text-xs text-gray-700 uppercase tracking-wide">📦 Stok Barang Aset RT</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-gray-100/70 text-gray-600 uppercase font-semibold border-b">
              <tr>
                <th class="p-3 text-center">NO</th>
                <th class="p-3">ID BARANG</th>
                <th class="p-3">NAMA BARANG</th>
                <th class="p-3">STOK TERSEDIA</th>
                <th class="p-3 text-center">STATUS</th>
                ${isRt ? '<th class="p-3 text-center">AKSI RT</th>' : ''}
              </tr>
            </thead>
            <tbody id="aset-table-body"></tbody>
          </table>
        </div>
      </div>
      <div id="tab-content-riwayat" class="${currentAsetTab === 'riwayat' ? 'block' : 'hidden'} bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 p-4">
        <div class="flex justify-between items-center mb-3">
          <h3 class="font-bold text-xs text-gray-700 uppercase tracking-wide">📋 Riwayat & Status Peminjaman</h3>
          <button onclick="loadTabelRiwayat()" class="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center gap-1"><i class="bi bi-arrow-clockwise"></i> Refresh</button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-gray-100/70 text-gray-600 uppercase font-semibold border-b">
              <tr>
                <th class="p-3">NAMA PEMINJAM</th>
                <th class="p-3">BARANG</th>
                <th class="p-3 text-center">MINTA</th>
                <th class="p-3 text-center">ACC RT</th>
                <th class="p-3">KET. WARGA</th>
                <th class="p-3">CATATAN / LOKASI RT</th>
                <th class="p-3 text-center">STATUS</th>
                <th class="p-3 text-center">AKSI RT</th>
              </tr>
            </thead>
            <tbody id="riwayat-table-body">
              <tr><td colspan="8" class="text-center p-4 text-gray-400">Memuat riwayat peminjaman...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <!-- MODAL KELOLA ASET RT -->
    <div id="modal-kelola-aset" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="bg-white p-5 rounded-2xl w-full max-w-md shadow-2xl relative">
        <button onclick="tutupModalKelolaAset()" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-lg w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">&times;</button>
        <div class="mb-4 border-b pb-2">
          <h3 class="font-bold text-gray-800 text-sm" id="modalKelolaTitle">Kelola Barang Aset</h3>
          <p class="text-[11px] text-gray-500">Tambah barang baru atau perbarui stok inventaris RT</p>
        </div>
        <form id="formKelolaAset" onsubmit="submitKelolaAset(event)" class="space-y-3">
          <input type="hidden" id="editAsetId" value="">
          <div>
            <label class="block text-[11px] font-bold text-gray-600 uppercase mb-1">NAMA BARANG</label>
            <input type="text" id="asetNama" required class="w-full p-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Contoh: Kursi Plastik, Tenda, Sound System">
          </div>
          <div>
            <label class="block text-[11px] font-bold text-gray-600 uppercase mb-1">STOK / JUMLAH TERSEDIA</label>
            <input type="number" id="asetStok" min="0" required class="w-full p-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Masukkan jumlah stok...">
          </div>
          <div>
            <label class="block text-[11px] font-bold text-gray-600 uppercase mb-1">STATUS BARANG</label>
            <select id="asetStatus" class="w-full p-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white">
              <option value="Tersedia">Tersedia</option>
              <option value="Habis">Habis</option>
              <option value="Perbaikan">Perbaikan / Rusak</option>
            </select>
          </div>
          <div class="flex justify-end gap-2 pt-2 border-t">
            <button type="button" onclick="tutupModalKelolaAset()" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold transition">Batal</button>
            <button type="submit" id="btnSubmitKelolaAset" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition">Simpan Data Aset</button>
          </div>
        </form>
      </div>
    </div>
    <!-- MODAL FORM PEMINJAMAN WARGA -->
    <div id="modal-form-pinjam" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="bg-white p-5 rounded-2xl w-full max-w-md shadow-2xl relative">
        <button onclick="tutupModalPinjam()" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-lg w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">&times;</button>
        <div class="mb-4 border-b pb-2">
          <h3 class="font-bold text-gray-800 text-sm">Form Peminjaman Barang</h3>
          <p class="text-[11px] text-gray-500">Isi detail pengajuan peminjaman fasilitas/aset RT</p>
        </div>
        <form id="formPinjamAset" onsubmit="submitFormPinjam(event)" class="space-y-3">
          <div>
            <label class="block text-[11px] font-bold text-gray-600 uppercase mb-1">NAMA PEMINJAM</label>
            <input type="text" id="pinjamNama" readonly style="background-color: #f1f5f9; cursor: not-allowed;" required class="w-full p-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Masukkan nama peminjam...">
          </div>
          <div>
            <label class="block text-[11px] font-bold text-gray-600 uppercase mb-1">NAMA BARANG</label>
            <select id="pinjamBarangSelect" required onchange="onBarangSelectChange()" class="w-full p-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white">
              <option value="">-- Pilih Barang --</option>
            </select>
          </div>
          <div>
            <div class="flex justify-between items-center mb-1">
              <label class="block text-[11px] font-bold text-gray-600 uppercase">JUMLAH</label>
              <span id="stokInfoText" class="text-[10px] text-emerald-600 font-bold">Maksimal Stok: -</span>
            </div>
            <input type="number" id="pinjamJumlah" min="1" required class="w-full p-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Masukkan jumlah yang mau dipinjam...">
          </div>
          <div>
            <label class="block text-[11px] font-bold text-gray-600 uppercase mb-1">KETERANGAN WARGA</label>
            <textarea id="pinjamKeterangan" rows="2" class="w-full p-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Untuk keperluan apa peminjaman ini..."></textarea>
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" onclick="tutupModalPinjam()" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold transition">Batal</button>
            <button type="submit" id="btnSubmitPinjam" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow transition">Kirim Pengajuan</button>
          </div>
        </form>
      </div>
    </div>
    <!-- MODAL VERIFIKASI RT -->
    <div id="modal-verifikasi-rt" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="bg-white p-5 rounded-2xl w-full max-w-md shadow-2xl relative">
        <button onclick="tutupModalVerifikasiRT()" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-lg w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">&times;</button>
        <div class="mb-4 border-b pb-2">
          <h3 class="font-bold text-gray-800 text-sm">Verifikasi Peminjaman (RT)</h3>
          <p class="text-[11px] text-gray-500">Proses persetujuan peminjaman warga</p>
        </div>
        <div class="space-y-3">
          <div class="bg-blue-50/70 p-3 rounded-xl text-xs border border-blue-100 space-y-1">
            <p><b>Peminjam:</b> <span id="verifNamaPeminjam">-</span></p>
            <p><b>Barang:</b> <span id="verifNamaBarang">-</span></p>
            <p><b>Jumlah Diminta:</b> <span id="verifJumlahMinta" class="font-bold text-blue-600">-</span></p>
          </div>
          <div>
            <label class="block text-[11px] font-bold text-gray-600 uppercase mb-1">JUMLAH YANG DI-ACC RT</label>
            <input type="number" id="verifJumlahAcc" min="1" class="w-full p-2 border border-gray-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none">
          </div>
          <div>
            <label class="block text-[11px] font-bold text-gray-600 uppercase mb-1">CATATAN RT / LOKASI PENGAMBILAN BARANG</label>
            <textarea id="verifCatatanRt" rows="3" class="w-full p-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Contoh: Ambil di gudang RT samping posyandu jam 4 sore..."></textarea>
          </div>
          <div class="flex justify-end gap-2 pt-2 border-t">
            <button type="button" onclick="kirimVerifikasiRT('Ditolak')" class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition">Tolak</button>
            <button type="button" onclick="kirimVerifikasiRT('Disetujui')" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition">Setujui (ACC)</button>
          </div>
        </div>
      </div>
    </div>
    <!-- MODAL PENGEMBALIAN BARANG RT -->
    <div id="modal-kembali-rt" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="bg-white p-5 rounded-2xl w-full max-w-md shadow-2xl relative">
        <button onclick="tutupModalKembaliRT()" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-lg w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">&times;</button>
        <div class="mb-4 border-b pb-2">
          <h3 class="font-bold text-gray-800 text-sm">Pengembalian Barang Aset</h3>
          <p class="text-[11px] text-gray-500">Catat jumlah barang yang dikembalikan warga</p>
        </div>
        <div class="space-y-3">
          <div class="bg-gray-50 p-3 rounded-xl text-xs border space-y-1">
            <p><b>Peminjam:</b> <span id="kembaliNamaPeminjam">-</span></p>
            <p><b>Barang:</b> <span id="kembaliNamaBarang">-</span></p>
            <p><b>Total Dipinjam (ACC):</b> <span id="kembaliTotalAcc" class="font-bold text-blue-600">-</span></p>
          </div>
          <div>
            <label class="block text-[11px] font-bold text-gray-600 uppercase mb-1">JUMLAH YANG BENERAN DIKEMBALIKAN</label>
            <input type="number" id="kembaliJumlahBalik" min="0" class="w-full p-2 border border-gray-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none">
          </div>
          <div>
            <label class="block text-[11px] font-bold text-gray-600 uppercase mb-1">CATATAN RT / KONDISI BARANG</label>
            <textarea id="kembaliCatatanRt" rows="2" class="w-full p-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Contoh: Dikembalikan kondisi bersih & lengkap..."></textarea>
          </div>
          <div class="flex justify-end gap-2 pt-2 border-t">
            <button type="button" onclick="tutupModalKembaliRT()" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold transition">Batal</button>
            <button type="button" id="btnKirimKembaliRT" onclick="kirimPengembalianRT(event)" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow transition flex items-center justify-center gap-1">Proses Selesai</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.getElementById('main-content').innerHTML = html;
  filterDataAset();
  loadTabelRiwayat();
}
function switchAsetTab(tab) {
  currentAsetTab = tab;
  let btnStok = document.getElementById('tab-btn-stok');
  let btnRiwayat = document.getElementById('tab-btn-riwayat');
  let contentStok = document.getElementById('tab-content-stok');
  let contentRiwayat = document.getElementById('tab-content-riwayat');
  if (!btnStok || !btnRiwayat) return;
  if (tab === 'stok') {
    btnStok.className = 'flex-1 py-2 px-3 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 bg-blue-600 text-white shadow-sm';
    btnRiwayat.className = 'flex-1 py-2 px-3 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50';
    contentStok.classList.remove('hidden');
    contentStok.classList.add('block');
    contentRiwayat.classList.remove('block');
    contentRiwayat.classList.add('hidden');
  } else {
    btnRiwayat.className = 'flex-1 py-2 px-3 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 bg-blue-600 text-white shadow-sm';
    btnStok.className = 'flex-1 py-2 px-3 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50';
    contentRiwayat.classList.remove('hidden');
    contentRiwayat.classList.add('block');
    contentStok.classList.remove('block');
    contentStok.classList.add('hidden');
  }
}
function filterDataAset() {
  let headers = currentHeaders.map(h => h.toLowerCase().trim());
  let idIdx = headers.indexOf('id') > -1 ? headers.indexOf('id') : 0;
  let namaBarangIdx = headers.findIndex(h => h.includes('nama_barang') || h.includes('barang') || h.includes('nama'));
  let stokIdx = headers.findIndex(h => h.includes('stok') || h.includes('jumlah') || h.includes('qty'));
  let statusIdx = headers.indexOf('status');
  let isRt = session && session.role === 'RT';
  let tbody = document.getElementById('aset-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (rawAsetData.length === 0) {
    let colSpan = isRt ? 6 : 5;
    tbody.innerHTML = `<tr><td colspan="${colSpan}" class="text-center p-4 text-gray-400">Belum ada data barang aset.</td></tr>`;
  } else {
    rawAsetData.forEach((r, i) => {
      let idVal = r[idIdx] || '';
      let namaVal = r[namaBarangIdx] || '-';
      let stokVal = stokIdx > -1 ? (parseInt(r[stokIdx]) || 0) : 0;
      let statusVal = statusIdx > -1 && r[statusIdx] ? r[statusIdx] : (stokVal > 0 ? 'Tersedia' : 'Habis');
      let badgeColor = stokVal > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700';
      let aksiRt = isRt ? `
        <td class="p-3 text-center">
          <button onclick="bukaModalEditAset('${idVal}', '${namaVal.replace(/'/g, "\\'")}', ${stokVal}, '${statusVal}')" class="bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 px-2 py-1 rounded-lg text-[10px] font-bold transition">
            ✏️ Edit / Tambah Stok
          </button>
        </td>
      ` : '';
      tbody.innerHTML += `
        <tr class="border-b hover:bg-gray-50/50 transition">
          <td class="p-3 text-center text-gray-400">${i + 1}</td>
          <td class="p-3 font-mono text-[10px] text-gray-600">${idVal || '-'}</td>
          <td class="p-3 font-semibold text-gray-800">${namaVal}</td>
          <td class="p-3 font-bold text-blue-600">${stokVal}</td>
          <td class="p-3 text-center"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeColor}">${statusVal}</span></td>
          ${aksiRt}
        </tr>`;
    });
  }
}
function bukaModalTambahAset() {
  isEditModeAset = false;
  document.getElementById('modalKelolaTitle').innerText = '➕ Tambah Barang Aset Baru';
  document.getElementById('editAsetId').value = '';
  document.getElementById('asetNama').value = '';
  document.getElementById('asetStok').value = '';
  document.getElementById('asetStatus').value = 'Tersedia';
  document.getElementById('modal-kelola-aset').classList.remove('hidden');
}
function bukaModalEditAset(id, nama, stok, status) {
  isEditModeAset = true;
  document.getElementById('modalKelolaTitle').innerText = '✏️ Edit / Update Stok Aset (' + id + ')';
  document.getElementById('editAsetId').value = id;
  document.getElementById('asetNama').value = nama;
  document.getElementById('asetStok').value = stok;
  document.getElementById('asetStatus').value = status;
  document.getElementById('modal-kelola-aset').classList.remove('hidden');
}
function tutupModalKelolaAset() {
  document.getElementById('modal-kelola-aset').classList.add('hidden');
  document.getElementById('formKelolaAset').reset();
}
async function submitKelolaAset(e) {
  e.preventDefault();
  let id = document.getElementById('editAsetId').value;
  let nama = document.getElementById('asetNama').value;
  let stok = parseInt(document.getElementById('asetStok').value) || 0;
  let status = document.getElementById('asetStatus').value;
  let payload = {};
  currentHeaders.forEach(h => {
    let hLower = h.toLowerCase().trim();
    if (hLower.includes('barang') || hLower.includes('nama')) {
      payload[h] = nama;
    } else if (hLower.includes('stok') || hLower.includes('jumlah') || hLower.includes('qty')) {
      payload[h] = stok;
    } else if (hLower === 'status') {
      payload[h] = stok > 0 ? status : 'Habis';
    }
  });
  let btn = document.getElementById('btnSubmitKelolaAset');
  btn.disabled = true;
  btn.innerText = 'Menyimpan...';
  if (isEditModeAset && id) {
    const res = await callGASPost('updateDataDiSheet', {
      sheetName: 'Aset',
      id: id,
      formData: payload
    });
    btn.disabled = false;
    btn.innerText = 'Simpan Data Aset';
    alert(res ? res.message : 'Proses selesai');
    tutupModalKelolaAset();
    if (typeof window.loadMenu === 'function') window.loadMenu('Aset');
  } else {
    const res = await callGASPost('simpanDataKeSheet', {
      sheetName: 'Aset',
      formData: payload
    });
    btn.disabled = false;
    btn.innerText = 'Simpan Data Aset';
    alert(res ? res.message : 'Proses selesai');
    tutupModalKelolaAset();
    if (typeof window.loadMenu === 'function') window.loadMenu('Aset');
  }
}
async function bukaModalPinjamBarang() {
  if (session && session.nama) {
    document.getElementById('pinjamNama').value = session.nama;
  }
  const res = await callGASGet('getDaftarBarangAset');
  if (res && res.status === 'success') {
    listDaftarBarang = res.data || [];
    let select = document.getElementById('pinjamBarangSelect');
    select.innerHTML = '<option value="">-- Pilih Barang --</option>';
    if (listDaftarBarang.length === 0) {
      select.innerHTML = '<option value="">-- Stok Barang Sedang Kosong --</option>';
    } else {
      listDaftarBarang.forEach(item => {
        select.innerHTML += `<option value="${item.id}" data-nama="${item.nama}" data-stok="${item.stok}">${item.nama} (Sisa Stok: ${item.stok})</option>`;
      });
    }
  }
  document.getElementById('modal-form-pinjam').classList.remove('hidden');
}
function onBarangSelectChange() {
  let select = document.getElementById('pinjamBarangSelect');
  let selectedOption = select.options[select.selectedIndex];
  let inputJumlah = document.getElementById('pinjamJumlah');
  let infoText = document.getElementById('stokInfoText');
  if (select.value) {
    let maxStok = parseInt(selectedOption.getAttribute('data-stok')) || 1;
    inputJumlah.max = maxStok;
    infoText.innerText = `Maksimal Stok: ${maxStok}`;
  } else {
    inputJumlah.removeAttribute('max');
    infoText.innerText = 'Maksimal Stok: -';
  }
}
function tutupModalPinjam() {
  document.getElementById('modal-form-pinjam').classList.add('hidden');
  document.getElementById('formPinjamAset').reset();
}
async function submitFormPinjam(e) {
  e.preventDefault();
  let select = document.getElementById('pinjamBarangSelect');
  let selectedOption = select.options[select.selectedIndex];
  let jumlahInput = parseInt(document.getElementById('pinjamJumlah').value);
  let maxStok = parseInt(selectedOption.getAttribute('data-stok')) || 0;
  if (jumlahInput > maxStok) {
    alert(`Jumlah pinjam (${jumlahInput}) melebihi stok yang tersedia (${maxStok})!`);
    return;
  }
  let payload = {
    namaPeminjam: document.getElementById('pinjamNama').value,
    idBarang: select.value,
    namaBarang: selectedOption.getAttribute('data-nama'),
    jumlah: jumlahInput,
    keterangan: document.getElementById('pinjamKeterangan').value,
    nik: session ? session.nik : ''
  };
  let btn = document.getElementById('btnSubmitPinjam');
  btn.disabled = true;
  btn.innerText = 'Mengirim...';
  const res = await callGASPost('simpanPengajuanPeminjaman', { payload: payload });
  btn.disabled = false;
  btn.innerText = 'Kirim Pengajuan';
  alert(res ? res.message : 'Pengajuan dikirim');
  tutupModalPinjam();
  loadTabelRiwayat();
  if (typeof window.loadMenu === 'function') window.loadMenu('Aset');
}
async function loadTabelRiwayat() {
  const res = await callGASGet('getRiwayatPeminjaman');
  let tbody = document.getElementById('riwayat-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (res && res.status === 'success' && res.data && res.data.length > 0) {
    res.data.forEach(item => {
      let statusText = item.status || 'Menunggu Verifikasi';
      let badgeClass = 'bg-amber-100 text-amber-700';
      if (statusText === 'Disetujui') badgeClass = 'bg-emerald-100 text-emerald-700';
      if (statusText === 'Ditolak') badgeClass = 'bg-red-100 text-red-700';
      if (statusText.includes('Selesai')) badgeClass = 'bg-gray-100 text-gray-700';
      let aksiHtml = '<span class="text-gray-400 text-[10px]">-</span>';
      if (session && session.role === 'RT') {
        if (statusText === 'Menunggu Verifikasi') {
          aksiHtml = `
            <button onclick="bukaModalVerifikasiRT('${item.idPinjam}', '${item.namaPeminjam}', '${item.namaBarang}', ${item.jumlahMinta})" class="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-[10px] font-bold shadow">Verifikasi RT</button>
          `;
        } else if (statusText === 'Disetujui') {
          aksiHtml = `
            <button onclick="bukaModalKembaliRT('${item.idPinjam}', '${item.namaPeminjam}', '${item.namaBarang}', ${item.jumlahAcc})" class="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded text-[10px] font-bold shadow">Barang Kembali</button>
          `;
        }
      }
      let catatanRtDisplay = item.catatanRt && item.catatanRt !== '-' 
        ? `<span class="text-blue-700 font-medium">${item.catatanRt}</span>` 
        : '<span class="text-gray-400">-</span>';
      tbody.innerHTML += `
        <tr class="border-b hover:bg-gray-50/50 transition">
          <td class="p-3 font-bold text-gray-800">${item.namaPeminjam}</td>
          <td class="p-3 text-gray-700">${item.namaBarang}</td>
          <td class="p-3 text-center font-bold text-gray-600">${item.jumlahMinta}</td>
          <td class="p-3 text-center font-extrabold text-blue-600">${item.jumlahAcc || 0}</td>
          <td class="p-3 text-gray-500">${item.keterangan || '-'}</td>
          <td class="p-3">${catatanRtDisplay}</td>
          <td class="p-3 text-center"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeClass}">${statusText}</span></td>
          <td class="p-3 text-center">${aksiHtml}</td>
        </tr>
      `;
    });
  } else {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center p-4 text-gray-400">Belum ada riwayat peminjaman.</td></tr>`;
  }
}
function bukaModalVerifikasiRT(idPinjam, namaPeminjam, namaBarang, jumlahMinta) {
  activeVerifikasiData = { idPinjam, jumlahMinta };
  document.getElementById('verifNamaPeminjam').innerText = namaPeminjam;
  document.getElementById('verifNamaBarang').innerText = namaBarang;
  document.getElementById('verifJumlahMinta').innerText = jumlahMinta + ' unit';
  document.getElementById('verifJumlahAcc').value = jumlahMinta;
  document.getElementById('verifJumlahAcc').max = jumlahMinta;
  document.getElementById('verifCatatanRt').value = '';
  document.getElementById('modal-verifikasi-rt').classList.remove('hidden');
}
function tutupModalVerifikasiRT() {
  document.getElementById('modal-verifikasi-rt').classList.add('hidden');
}
async function kirimVerifikasiRT(status) {
  if (!activeVerifikasiData) return;
  let qtyAcc = document.getElementById('verifJumlahAcc').value;
  let catatanRt = document.getElementById('verifCatatanRt').value;
  if (status === 'Disetujui' && (!qtyAcc || parseInt(qtyAcc) <= 0)) {
    alert('Jumlah ACC harus lebih dari 0!');
    return;
  }
  const res = await callGASPost('verifikasiPeminjamanRT', {
    idPinjam: activeVerifikasiData.idPinjam,
    status: status,
    qtyAcc: qtyAcc,
    catatanRt: catatanRt
  });
  alert(res ? res.message : 'Verifikasi dikirim');
  tutupModalVerifikasiRT();
  loadTabelRiwayat();
  if (typeof window.loadMenu === 'function') window.loadMenu('Aset');
}
function bukaModalKembaliRT(idPinjam, namaPeminjam, namaBarang, qtyAcc) {
  activeKembaliData = { idPinjam, qtyAcc };
  document.getElementById('kembaliNamaPeminjam').innerText = namaPeminjam;
  document.getElementById('kembaliNamaBarang').innerText = namaBarang;
  document.getElementById('kembaliTotalAcc').innerText = qtyAcc + ' unit';
  document.getElementById('kembaliJumlahBalik').value = qtyAcc;
  document.getElementById('kembaliJumlahBalik').max = qtyAcc;
  document.getElementById('kembaliCatatanRt').value = '';
  document.getElementById('modal-kembali-rt').classList.remove('hidden');
}
function tutupModalKembaliRT() {
  document.getElementById('modal-kembali-rt').classList.add('hidden');
}
async function kirimPengembalianRT(e) {
  if (!activeKembaliData) return;
  let qtyKembali = document.getElementById('kembaliJumlahBalik').value;
  let catatanRt = document.getElementById('kembaliCatatanRt').value;
  if (qtyKembali === '' || parseInt(qtyKembali) < 0 || parseInt(qtyKembali) > activeKembaliData.qtyAcc) {
    alert(`Jumlah tidak valid! Masukkan angka antara 0 sampai ${activeKembaliData.qtyAcc}.`);
    return;
  }
  let btn = (e && e.target) ? e.target.closest('button') : document.getElementById('btnKirimKembaliRT');
  if (!btn) btn = document.getElementById('btnKirimKembaliRT');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> Memproses...`;
  }
  try {
    const res = await callGASPost('prosesPengembalianAsetRT', {
      idPinjam: activeKembaliData.idPinjam,
      qtyKembali: qtyKembali,
      catatanRt: catatanRt
    });
    alert(res ? res.message : 'Pengembalian diproses');
    tutupModalKembaliRT();
    loadTabelRiwayat();
    if (typeof window.loadMenu === 'function') window.loadMenu('Aset');
  } catch (err) {
    alert('Gagal memproses pengembalian: ' + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = 'Proses Selesai';
    }
  }
}
const originalLoadMenuAset = window.loadMenu;
window.loadMenu = async function(menu) {
  if (menu === 'Aset') {
    currentActiveMenu = menu;
    syncActiveNav(menu);
    document.getElementById('page-title').innerText = 'Aset & Inventaris';
    document.getElementById('main-content').innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><br><small class="text-muted mt-2 d-block">Memuat data aset & peminjaman...</small></div>';
    document.getElementById('rek-info').style.display = 'none';
    const res = await callGASGet('getTableData', { sheetName: 'Aset' });
    if (res) {
      currentHeaders = res.headers || [];
      currentRows = res.rows || [];
      renderAsetCustom(res);
    }
  } else {
    if (typeof originalLoadMenuAset === 'function') originalLoadMenuAset(menu);
  }
};
