let rawKeuanganData = [];
let selectedKeuanganRow = null;
function renderKeuanganCustom(data) {
  rawKeuanganData = data.rows || [];
  let html = `
    <div class="p-1 text-gray-800 font-sans">
      <div class="grid grid-cols-3 gap-3 mb-4">
        <div class="bg-white border-l-4 border-emerald-500 p-3 rounded-xl shadow-sm">
          <p class="text-[10px] text-gray-500 uppercase font-bold">Masuk</p>
          <p id="card-masuk" class="font-bold text-emerald-600 text-sm md:text-base">Rp 0</p>
        </div>
        <div class="bg-white border-l-4 border-rose-500 p-3 rounded-xl shadow-sm">
          <p class="text-[10px] text-gray-500 uppercase font-bold">Keluar</p>
          <p id="card-keluar" class="font-bold text-rose-600 text-sm md:text-base">Rp 0</p>
        </div>
        <div class="bg-white border-l-4 border-blue-500 p-3 rounded-xl shadow-sm">
          <p class="text-[10px] text-gray-500 uppercase font-bold">Saldo</p>
          <p id="card-saldo" class="font-bold text-blue-600 text-sm md:text-base">Rp 0</p>
        </div>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        ${session.role === 'RT' ? `
          <button onclick="bukaModalForm()" class="col-span-2 md:col-span-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-lg text-xs shadow transition">
            + Transaksi Baru
          </button>
        ` : ''}
        <select id="filter-periode" onchange="filterDataKeuangan()" class="p-2 border rounded-lg text-xs bg-white shadow-sm">
          <option value="all">Semua Periode</option>
          <option value="hari">Hari Ini</option>
          <option value="bulan">Bulan Ini</option>
          <option value="tahun">Tahun Ini</option>
          <option value="custom">Pilih Tanggal</option>
        </select>
        <select id="sort-order" onchange="filterDataKeuangan()" class="p-2 border rounded-lg text-xs bg-white shadow-sm">
          <option value="newest">Terbaru</option>
          <option value="oldest">Terlama</option>
        </select>
        <button onclick="cetakLaporanKeuanganPDF()" class="bg-gray-800 text-white rounded-lg text-xs py-2 font-bold shadow hover:bg-gray-900 transition">
          <i class="bi bi-file-earmark-pdf-fill me-1"></i> Cetak PDF
        </button>
      </div>
      <div id="custom-date-box" class="hidden grid grid-cols-2 gap-2 mb-4">
        <div>
          <label class="text-[10px] text-gray-500 font-bold ml-1">Dari Tanggal</label>
          <input type="date" id="date-start" onchange="filterDataKeuangan()" class="w-full p-2 border rounded-lg text-xs bg-white">
        </div>
        <div>
          <label class="text-[10px] text-gray-500 font-bold ml-1">Sampai Tanggal</label>
          <input type="date" id="date-end" onchange="filterDataKeuangan()" class="w-full p-2 border rounded-lg text-xs bg-white">
        </div>
      </div>
      <div class="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-gray-100/70 text-gray-600 uppercase font-semibold border-b">
              <tr>
                <th class="p-3 text-center">No</th>
                <th class="p-3">ID</th>
                <th class="p-3">Tgl</th>
                <th class="p-3">Keterangan</th>
                <th class="p-3 text-right">Masuk</th>
                <th class="p-3 text-right">Keluar</th>
                <th class="p-3 text-center">Bukti</th>
                <th class="p-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody id="keuangan-table-body"></tbody>
          </table>
        </div>
      </div>
    </div>
    <div id="modal-detail-keuangan" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="bg-white p-5 rounded-2xl w-full max-w-sm shadow-2xl animate-fade-in">
        <div class="flex justify-between items-center mb-3 border-b pb-2">
          <h3 class="font-bold text-gray-800 text-sm">Rincian Transaksi</h3>
          <button onclick="tutupDetailKeuangan()" class="text-gray-400 hover:text-gray-600 font-bold text-lg">&times;</button>
        </div>
        <div id="modal-detail-body" class="mb-4"></div>
        <a id="btn-wa-detail" href="#" target="_blank" class="block w-full text-center bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-xl font-bold text-xs shadow-sm transition mb-2">
          <i class="bi bi-whatsapp me-1"></i> Laporkan Masalah (WA)
        </a>
        ${session.role === 'RT' ? `
          <div class="grid grid-cols-2 gap-2 border-t pt-3 mt-2">
            <button onclick="editDariDetail()" class="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl text-xs font-bold shadow-sm">Edit Data</button>
            <button onclick="hapusDariDetail()" class="bg-rose-600 hover:bg-rose-700 text-white p-2 rounded-xl text-xs font-bold shadow-sm">Hapus Data</button>
          </div>
        ` : ''}
        <button onclick="tutupDetailKeuangan()" class="w-full mt-2 bg-gray-100 hover:bg-gray-200 text-gray-600 p-2 rounded-xl text-xs font-bold transition">Tutup</button>
      </div>
    </div>
  `;
  document.getElementById('main-content').innerHTML = html;
  filterDataKeuangan();
  let searchInp = document.getElementById('searchInput');
  if (searchInp) {
    searchInp.onkeyup = function() {
      filterDataKeuangan();
    };
  }
}
function filterDataKeuangan() {
  let p = document.getElementById('filter-periode') ? document.getElementById('filter-periode').value : 'all';
  let o = document.getElementById('sort-order') ? document.getElementById('sort-order').value : 'newest';
  let searchVal = document.getElementById('searchInput') ? document.getElementById('searchInput').value.toLowerCase().trim() : '';
  let now = new Date();
  let customBox = document.getElementById('custom-date-box');
  if (customBox) {
    if (p === 'custom') customBox.classList.remove('hidden'); 
    else customBox.classList.add('hidden');
  }
  let start = document.getElementById('date-start') ? document.getElementById('date-start').value : '';
  let end = document.getElementById('date-end') ? document.getElementById('date-end').value : '';
  let headers = currentHeaders.map(h => h.toLowerCase().trim());
  let idIdx = headers.indexOf('id') > -1 ? headers.indexOf('id') : 0;
  let tglIdx = headers.findIndex(h => h.includes('tanggal') || h.includes('tgl'));
  let pemIdx = headers.indexOf('pemasukan');
  let pengIdx = headers.indexOf('pengeluaran');
  let ketIdx = headers.indexOf('keterangan');
  let fotoIdx = headers.findIndex(h => h.includes('foto') || h.includes('bukti'));
  let filtered = [...rawKeuanganData].filter(row => {
    let dateStr = row[tglIdx] || '';
    let dateParts = dateStr.split(' ')[0].split('/');
    let d = dateParts.length === 3 ? new Date(dateParts[2], dateParts[1] - 1, dateParts[0]) : new Date();
    let dateMatch = true;
    if (p === 'hari') dateMatch = d.toDateString() === now.toDateString();
    else if (p === 'bulan') dateMatch = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    else if (p === 'tahun') dateMatch = d.getFullYear() === now.getFullYear();
    else if (p === 'custom') {
      let rowTime = d.getTime();
      let sTime = start ? new Date(start).setHours(0,0,0,0) : -Infinity;
      let eTime = end ? new Date(end).setHours(23,59,59,999) : Infinity;
      dateMatch = rowTime >= sTime && rowTime <= eTime;
    }
    let rowId = (row[idIdx] || '').toLowerCase();
    let ketText = (row[ketIdx] || '').toLowerCase();
    let searchMatch = rowId.includes(searchVal) || ketText.includes(searchVal);
    return dateMatch && searchMatch;
  });
  if (o === 'oldest') {
    filtered.reverse();
  }
  let tbody = document.getElementById('keuangan-table-body');
  if (!tbody) return;
  let t = { m: 0, k: 0 };
  tbody.innerHTML = '';
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center p-4 text-gray-400">Tidak ada data transaksi yang cocok.</td></tr>`;
  } else {
    filtered.forEach((r, i) => {
      let pem = Number((r[pemIdx] || '0').toString().replace(/[^0-9]/g, '')) || 0;
      let peng = Number((r[pengIdx] || '0').toString().replace(/[^0-9]/g, '')) || 0;
      t.m += pem;
      t.k += peng;
      let fotoUrl = r[fotoIdx] || '';
      let fotoBtn = (fotoUrl && fotoUrl !== '-') 
        ? `<button onclick="event.stopPropagation(); bukaPopUpFoto('${fotoUrl}')" class="text-blue-600 font-bold hover:underline"><i class="bi bi-image me-1"></i>Foto</button>` 
        : '-';
      let btnAksi = session.role === 'RT' 
        ? `<button onclick="event.stopPropagation(); bukaModalEdit('${r[idIdx]}')" class="bg-blue-50 text-blue-600 px-2 py-1 rounded-md text-[11px] font-bold border border-blue-200 hover:bg-blue-100">Edit</button>`
        : `<button onclick="event.stopPropagation(); waLaporMasalahKeuangan('${r[idIdx]}')" class="bg-rose-50 text-rose-600 px-2 py-1 rounded-md text-[11px] font-bold border border-rose-200 hover:bg-rose-100">Laporkan</button>`;
      tbody.innerHTML += `
        <tr class="border-b hover:bg-blue-50/50 cursor-pointer transition" onclick="showDetailKeuangan('${r[idIdx]}')">
          <td class="p-3 text-center text-gray-400">${i + 1}</td>
          <td class="p-3 text-[10px] font-mono text-gray-600">${r[idIdx]}</td>
          <td class="p-3 font-medium whitespace-nowrap">${r[tglIdx] || '-'}</td>
          <td class="p-3 text-gray-800 font-medium">${r[ketIdx] || '-'}</td>
          <td class="p-3 text-right text-emerald-600 font-bold whitespace-nowrap">Rp ${pem.toLocaleString('id-ID')}</td>
          <td class="p-3 text-right text-rose-600 font-bold whitespace-nowrap">Rp ${peng.toLocaleString('id-ID')}</td>
          <td class="p-3 text-center">${fotoBtn}</td>
          <td class="p-3 text-center">${btnAksi}</td>
        </tr>`;
    });
  }
  if (document.getElementById('card-masuk')) document.getElementById('card-masuk').innerText = 'Rp ' + t.m.toLocaleString('id-ID');
  if (document.getElementById('card-keluar')) document.getElementById('card-keluar').innerText = 'Rp ' + t.k.toLocaleString('id-ID');
  if (document.getElementById('card-saldo')) document.getElementById('card-saldo').innerText = 'Rp ' + (t.m - t.k).toLocaleString('id-ID');
}
function showDetailKeuangan(id) {
  let headers = currentHeaders.map(h => h.toLowerCase().trim());
  let idIdx = headers.indexOf('id') > -1 ? headers.indexOf('id') : 0;
  let tglIdx = headers.findIndex(h => h.includes('tanggal') || h.includes('tgl'));
  let pemIdx = headers.indexOf('pemasukan');
  let pengIdx = headers.indexOf('pengeluaran');
  let ketIdx = headers.indexOf('keterangan');
  let fotoIdx = headers.findIndex(h => h.includes('foto') || h.includes('bukti'));
  let row = rawKeuanganData.find(r => r[idIdx] === id);
  if (!row) return;
  selectedKeuanganRow = row;
  let pem = Number((row[pemIdx] || '0').toString().replace(/[^0-9]/g, '')) || 0;
  let peng = Number((row[pengIdx] || '0').toString().replace(/[^0-9]/g, '')) || 0;
  let fotoUrl = row[fotoIdx] || '';
  let imgHtml = (fotoUrl && fotoUrl !== '-') 
    ? `<div class="mt-3"><p class="text-[10px] text-gray-400 font-bold uppercase mb-1">Bukti Lampiran:</p><img src="${fotoUrl}" onclick="bukaPopUpFoto('${fotoUrl}')" class="w-full max-h-48 object-contain rounded-xl border border-gray-200 cursor-pointer shadow-sm hover:opacity-90 transition"></div>` 
    : '';
  let detailHtml = `
    <div class="space-y-2 text-xs">
      <div class="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
        <span class="text-gray-400 font-mono text-[10px]">ID: ${row[idIdx]}</span>
        <span class="text-gray-500 font-bold">${row[tglIdx] || '-'}</span>
      </div>
      <div>
        <p class="text-[10px] text-gray-400 uppercase font-bold">Keterangan:</p>
        <p class="font-semibold text-gray-800 text-sm">${row[ketIdx] || '-'}</p>
      </div>
      <div class="grid grid-cols-2 gap-2 pt-1">
        <div class="bg-emerald-50 p-2 rounded-lg">
          <p class="text-[10px] text-emerald-600 font-bold uppercase">Pemasukan</p>
          <p class="font-bold text-emerald-700 text-sm">Rp ${pem.toLocaleString('id-ID')}</p>
        </div>
        <div class="bg-rose-50 p-2 rounded-lg">
          <p class="text-[10px] text-rose-600 font-bold uppercase">Pengeluaran</p>
          <p class="font-bold text-rose-700 text-sm">Rp ${peng.toLocaleString('id-ID')}</p>
        </div>
      </div>
      ${imgHtml}
    </div>
  `;
  document.getElementById('modal-detail-body').innerHTML = detailHtml;
  let msg = `Halo RT 5, saya mau bertanya/melaporkan kendala mengenai Transaksi Keuangan ID: ${row[idIdx]}`;
  document.getElementById('btn-wa-detail').href = `https://wa.me/${noWaAdmin}?text=${encodeURIComponent(msg)}`;
  document.getElementById('modal-detail-keuangan').classList.remove('hidden');
}
function tutupDetailKeuangan() {
  document.getElementById('modal-detail-keuangan').classList.add('hidden');
}
function editDariDetail() {
  if (!selectedKeuanganRow) return;
  let headers = currentHeaders.map(h => h.toLowerCase().trim());
  let idIdx = headers.indexOf('id') > -1 ? headers.indexOf('id') : 0;
  tutupDetailKeuangan();
  bukaModalEdit(selectedKeuanganRow[idIdx]);
}
function hapusDariDetail() {
  if (!selectedKeuanganRow) return;
  let headers = currentHeaders.map(h => h.toLowerCase().trim());
  let idIdx = headers.indexOf('id') > -1 ? headers.indexOf('id') : 0;
  let id = selectedKeuanganRow[idIdx];
  showUIConfirm(`Apakah Anda yakin ingin menghapus data transaksi ${id}?`, function() {
    tutupDetailKeuangan();
    editingId = id;
    hapusDataAktif();
  }, 'Hapus Transaksi');
}
function waLaporMasalahKeuangan(id) {
  let msg = `Halo RT 5, saya mau melaporkan kendala/pertanyaan terkait Transaksi Keuangan dengan ID: ${id}`;
  window.open(`https://wa.me/${noWaAdmin}?text=${encodeURIComponent(msg)}`, '_blank');
}
async function loadKeuanganView() {
  currentActiveMenu = 'Keuangan';
  syncActiveNav('Keuangan');
  document.getElementById('page-title').innerText = 'Laporan Keuangan & Kas RT';
  document.getElementById('main-content').innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><br><small class="text-muted mt-2 d-block">Memuat data keuangan & sumbangan terverifikasi...</small></div>';
  document.getElementById('rek-info').style.display = 'none';

  const [resKeuangan, resSumbangan] = await Promise.all([
    callGASGet('getTableData', { sheetName: 'Keuangan' }),
    callGASGet('getTableData', { sheetName: 'Sumbangan' }).catch(() => null)
  ]);

  if (resKeuangan && resKeuangan.status === 'success') {
    let headers = (resKeuangan.headers || []).map(h => h.toLowerCase().trim());
    let rows = [...(resKeuangan.rows || [])];

    let idIdx = headers.indexOf('id') > -1 ? headers.indexOf('id') : 0;
    let existingIds = new Set(rows.map(r => String(r[idIdx] || '').toLowerCase()));

    if (resSumbangan && resSumbangan.rows && resSumbangan.headers) {
      let sHeaders = resSumbangan.headers.map(h => h.toLowerCase().trim());
      let sIdIdx = sHeaders.indexOf('id') > -1 ? sHeaders.indexOf('id') : 0;
      let sTglIdx = sHeaders.findIndex(h => h.includes('tanggal') || h.includes('tgl') || h.includes('waktu'));
      let sNamaIdx = sHeaders.findIndex(h => h.includes('nama'));
      let sNominalIdx = sHeaders.findIndex(h => h.includes('nominal') || h.includes('jumlah') || h.includes('pemasukan'));
      let sKetIdx = sHeaders.findIndex(h => h.includes('keterangan') || h.includes('jenis') || h.includes('peruntukan'));
      let sStatusIdx = sHeaders.indexOf('status');
      let sFotoIdx = sHeaders.findIndex(h => h.includes('foto') || h.includes('bukti'));

      resSumbangan.rows.forEach(sRow => {
        let sStatus = sStatusIdx > -1 ? String(sRow[sStatusIdx] || '').toLowerCase().trim() : '';
        let isApproved = sStatus.includes('diterima') || sStatus.includes('selesai') || sStatus.includes('lunas') || sStatus.includes('acc') || sStatus.includes('terverifikasi');
        let sId = sRow[sIdIdx] || '';

        if (isApproved && sId && !existingIds.has(String(sId).toLowerCase())) {
          let sTgl = sTglIdx > -1 ? sRow[sTglIdx] : '';
          let sNama = sNamaIdx > -1 ? sRow[sNamaIdx] : 'Warga';
          let sNominal = sNominalIdx > -1 ? (Number(String(sRow[sNominalIdx]).replace(/[^0-9]/g, '')) || 0) : 0;
          let sKetDetail = sKetIdx > -1 ? sRow[sKetIdx] : '';
          let sFoto = sFotoIdx > -1 ? sRow[sFotoIdx] : '-';

          let newRow = [];
          resKeuangan.headers.forEach(h => {
            let hLower = h.toLowerCase().trim();
            if (hLower === 'id') newRow.push(sId);
            else if (hLower.includes('tanggal') || hLower.includes('tgl')) newRow.push(sTgl || new Date().toLocaleDateString('id-ID'));
            else if (hLower === 'keterangan') newRow.push(`[Sumbangan Warga] ${sNama}${sKetDetail ? ` - ${sKetDetail}` : ''}`);
            else if (hLower === 'pemasukan') newRow.push(sNominal);
            else if (hLower === 'pengeluaran') newRow.push(0);
            else if (hLower.includes('foto') || hLower.includes('bukti')) newRow.push(sFoto || '-');
            else newRow.push('-');
          });
          rows.push(newRow);
        }
      });
    }

    currentHeaders = resKeuangan.headers;
    currentRows = rows;
    renderKeuanganCustom({ headers: resKeuangan.headers, rows: rows });
  } else {
    document.getElementById('main-content').innerHTML = '<div class="alert alert-danger text-center my-3">Gagal memuat data keuangan dari server.</div>';
  }
}
window.loadKeuanganView = loadKeuanganView;
const originalLoadMenuKeuangan = window.loadMenu;
window.loadMenu = async function(menu) {
  if (menu === 'Keuangan') {
    loadKeuanganView();
  } else {
    if (typeof originalLoadMenuKeuangan === 'function') originalLoadMenuKeuangan(menu);
  }
};
function cetakLaporanKeuanganPDF() {
  let headers = currentHeaders.map(h => h.toLowerCase().trim());
  let tglIdx = headers.findIndex(h => h.includes('tanggal') || h.includes('tgl'));
  let pemIdx = headers.indexOf('pemasukan');
  let pengIdx = headers.indexOf('pengeluaran');
  let ketIdx = headers.indexOf('keterangan');
  let idIdx = headers.indexOf('id') > -1 ? headers.indexOf('id') : 0;

  // Ambil data yang sedang difilter (pakai rawKeuanganData untuk semua)
  let p = document.getElementById('filter-periode') ? document.getElementById('filter-periode').value : 'all';
  let o = document.getElementById('sort-order') ? document.getElementById('sort-order').value : 'newest';
  let now = new Date();
  let start = document.getElementById('date-start') ? document.getElementById('date-start').value : '';
  let end = document.getElementById('date-end') ? document.getElementById('date-end').value : '';
  let filtered = [...rawKeuanganData].filter(row => {
    let dateStr = row[tglIdx] || '';
    let dateParts = dateStr.split(' ')[0].split('/');
    let d = dateParts.length === 3 ? new Date(dateParts[2], dateParts[1] - 1, dateParts[0]) : new Date();
    if (p === 'hari') return d.toDateString() === now.toDateString();
    if (p === 'bulan') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (p === 'tahun') return d.getFullYear() === now.getFullYear();
    if (p === 'custom') {
      let rowTime = d.getTime();
      let sTime = start ? new Date(start).setHours(0,0,0,0) : -Infinity;
      let eTime = end ? new Date(end).setHours(23,59,59,999) : Infinity;
      return rowTime >= sTime && rowTime <= eTime;
    }
    return true;
  });
  if (o === 'oldest') filtered.reverse();

  let totalMasuk = 0, totalKeluar = 0;
  let rows = filtered.map((r, i) => {
    let pem = Number((r[pemIdx] || '0').toString().replace(/[^0-9]/g, '')) || 0;
    let peng = Number((r[pengIdx] || '0').toString().replace(/[^0-9]/g, '')) || 0;
    totalMasuk += pem;
    totalKeluar += peng;
    let saldo = pem - peng;
    return `<tr style="border-bottom:1px solid #e5e7eb;">
      <td style="padding:7px 8px; text-align:center; color:#6b7280; font-size:10pt;">${i+1}</td>
      <td style="padding:7px 8px; font-size:9pt; color:#6b7280; font-family:monospace;">${r[idIdx] || '-'}</td>
      <td style="padding:7px 8px; font-size:10pt; white-space:nowrap;">${r[tglIdx] || '-'}</td>
      <td style="padding:7px 8px; font-size:10pt;">${r[ketIdx] || '-'}</td>
      <td style="padding:7px 8px; text-align:right; font-size:10pt; color:#059669; font-weight:600;">${pem > 0 ? 'Rp ' + pem.toLocaleString('id-ID') : '-'}</td>
      <td style="padding:7px 8px; text-align:right; font-size:10pt; color:#dc2626; font-weight:600;">${peng > 0 ? 'Rp ' + peng.toLocaleString('id-ID') : '-'}</td>
    </tr>`;
  }).join('');

  let isRT = (typeof session !== 'undefined' && session.role === 'RT');
  let ttdSekretaris = (isRT && typeof appSettings !== 'undefined' && appSettings.ttd_sekretaris) ? appSettings.ttd_sekretaris : '';
  let ttdKetuaRt    = (isRT && typeof appSettings !== 'undefined' && appSettings.ttd_ketua_rt)    ? appSettings.ttd_ketua_rt    : '';
  let namaSekretaris = (typeof appSettings !== 'undefined' && appSettings.nama_sekretaris) ? appSettings.nama_sekretaris : 'Sekretaris RT 05';
  let namaKetuaRt    = (typeof appSettings !== 'undefined' && appSettings.nama_rt_ketua)    ? appSettings.nama_rt_ketua    : 'Ketua RT 05';
  let totalSaldo = totalMasuk - totalKeluar;
  let titleApp = (typeof appSettings !== 'undefined' && appSettings.app_title) ? appSettings.app_title : 'SISTEM INFORMASI RT 5';
  let logoUrl = (typeof appSettings !== 'undefined' && appSettings.app_logo) ? appSettings.app_logo : './img/logo.webp';
  let todayStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  let periodeLabel = { all: 'Semua Periode', hari: 'Hari Ini (' + todayStr + ')', bulan: 'Bulan ' + now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }), tahun: 'Tahun ' + now.getFullYear(), custom: (start || '...') + ' s/d ' + (end || '...') }[p] || 'Semua Periode';

  let pw = window.open('', '_blank', 'width=900,height=1000');
  pw.document.write(`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Laporan Keuangan - ${titleApp}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', serif; font-size: 11pt; color: #1f2937; background: #fff; padding: 30px 40px; }
    .header-wrap { display: flex; align-items: center; gap: 18px; border-bottom: 3px double #1e3a5f; padding-bottom: 14px; margin-bottom: 18px; }
    .header-logo { width: 65px; height: 65px; object-fit: contain; }
    .header-text { flex: 1; text-align: center; }
    .header-text h1 { font-size: 14pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #1e3a5f; }
    .header-text h2 { font-size: 11pt; font-weight: bold; text-transform: uppercase; }
    .header-text p { font-size: 9pt; color: #6b7280; }
    .doc-title { text-align: center; margin: 16px 0 6px; }
    .doc-title h3 { font-size: 13pt; font-weight: bold; text-transform: uppercase; text-decoration: underline; }
    .doc-title p { font-size: 10pt; color: #6b7280; }
    .summary-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin: 16px 0; }
    .summary-card { border-radius: 8px; padding: 10px 14px; text-align: center; }
    .summary-card.masuk { background: #ecfdf5; border: 1px solid #6ee7b7; }
    .summary-card.keluar { background: #fff1f2; border: 1px solid #fca5a5; }
    .summary-card.saldo { background: #eff6ff; border: 1px solid #93c5fd; }
    .summary-card p.label { font-size: 8.5pt; color: #6b7280; font-weight: bold; text-transform: uppercase; margin-bottom: 4px; }
    .summary-card p.value { font-size: 13pt; font-weight: bold; }
    .summary-card.masuk p.value { color: #059669; }
    .summary-card.keluar p.value { color: #dc2626; }
    .summary-card.saldo p.value { color: #2563eb; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    thead tr { background: #1e3a5f; color: #fff; }
    thead th { padding: 9px 8px; font-size: 9.5pt; font-weight: bold; text-align: left; }
    thead th.right { text-align: right; }
    thead th.center { text-align: center; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    tfoot tr { background: #f1f5f9; font-weight: bold; border-top: 2px solid #1e3a5f; }
    tfoot td { padding: 9px 8px; font-size: 10pt; }
    .footer-note { margin-top: 24px; font-size: 9pt; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 10px; text-align: center; }
    .ttd-section { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 36px; }
    .ttd-box { text-align: center; }
    .ttd-box p { font-size: 10pt; margin-bottom: 4px; }
    .ttd-line { border-bottom: 1px solid #374151; margin: 55px 30px 6px; }
    .ttd-name { font-weight: bold; font-size: 10pt; }
    @media print {
      body { padding: 20px 30px; }
      button { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="header-wrap">
    <img src="${logoUrl}" class="header-logo" onerror="this.style.display='none'">
    <div class="header-text">
      <h1>PENGURUS RUKUN TETANGGA 05 / RW 01</h1>
      <h2>${titleApp}</h2>
      <p>Sistem Layanan & Informasi Warga Digital - Modern, Transparan & Efisien</p>
    </div>
  </div>
  <div class="doc-title">
    <h3>Laporan Keuangan RT 05</h3>
    <p>Periode: ${periodeLabel} &nbsp;|&nbsp; Dicetak: ${todayStr}</p>
  </div>
  <div class="summary-grid">
    <div class="summary-card masuk"><p class="label">Total Pemasukan</p><p class="value">Rp ${totalMasuk.toLocaleString('id-ID')}</p></div>
    <div class="summary-card keluar"><p class="label">Total Pengeluaran</p><p class="value">Rp ${totalKeluar.toLocaleString('id-ID')}</p></div>
    <div class="summary-card saldo"><p class="label">Saldo Akhir</p><p class="value" style="color:${totalSaldo>=0?'#2563eb':'#dc2626'}">Rp ${totalSaldo.toLocaleString('id-ID')}</p></div>
  </div>
  <table>
    <thead>
      <tr>
        <th class="center" style="width:40px;">No</th>
        <th style="width:90px;">ID</th>
        <th style="width:95px;">Tanggal</th>
        <th>Keterangan</th>
        <th class="right" style="width:110px;">Pemasukan</th>
        <th class="right" style="width:110px;">Pengeluaran</th>
      </tr>
    </thead>
    <tbody>${rows || '<tr><td colspan="6" style="text-align:center;padding:20px;color:#9ca3af;">Tidak ada data transaksi.</td></tr>'}</tbody>
    <tfoot>
      <tr>
        <td colspan="4" style="text-align:right; padding-right:16px;">TOTAL</td>
        <td style="text-align:right; color:#059669;">Rp ${totalMasuk.toLocaleString('id-ID')}</td>
        <td style="text-align:right; color:#dc2626;">Rp ${totalKeluar.toLocaleString('id-ID')}</td>
      </tr>
      <tr>
        <td colspan="4" style="text-align:right; padding-right:16px;">SALDO AKHIR</td>
        <td colspan="2" style="text-align:right; color:${totalSaldo>=0?'#2563eb':'#dc2626'}; font-size:12pt;">Rp ${totalSaldo.toLocaleString('id-ID')}</td>
      </tr>
    </tfoot>
  </table>
  <div class="ttd-section">
    <div class="ttd-box">
      <p>Dibuat oleh,<br><b>${namaSekretaris}</b></p>
      ${ttdSekretaris ? `<img src="${ttdSekretaris}" style="max-height:70px; max-width:160px; object-fit:contain; display:block; margin:10px auto 0;">` : '<div class="ttd-line"></div>'}
      <p class="ttd-name">( ${isRT ? namaSekretaris : '................................'} )</p>
    </div>
    <div class="ttd-box">
      <p>Diketahui oleh,<br><b>${namaKetuaRt}</b></p>
      ${ttdKetuaRt ? `<img src="${ttdKetuaRt}" style="max-height:70px; max-width:160px; object-fit:contain; display:block; margin:10px auto 0;">` : '<div class="ttd-line"></div>'}
      <p class="ttd-name">( ${isRT ? namaKetuaRt : '................................'} )</p>
    </div>
  </div>
  <div class="footer-note">Laporan ini dicetak secara otomatis oleh ${titleApp} pada ${todayStr}. Dokumen ini sah tanpa tanda tangan basah apabila dicetak dari sistem.</div>
  <script>window.onload=function(){setTimeout(function(){window.print();},400);};<\/script>
</body>
</html>`);
  pw.document.close();
}
