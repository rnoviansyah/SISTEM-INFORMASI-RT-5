async function renderAspirasiView(data) {
  let rows = data.rows || [];
  let isRt = session && session.role === 'RT';
  
  await loadViewTemplate('aspirasi');

  let titleHeader = document.getElementById('aspirasi-title-header');
  if (titleHeader) {
    titleHeader.innerText = `💬 DAFTAR ASPIRASI MASUK ${isRt ? '(KHUSUS RT: NAMA PENGIRIM TERLIHAT)' : '(100% RAHASIA & ANONIM UNTUK WARGA)'}`;
  }

  let theadRow = document.getElementById('aspirasi-thead-row');
  if (theadRow) {
    theadRow.innerHTML = `
      <th class="p-3 text-center">NO</th>
      <th class="p-3">TANGGAL</th>
      ${isRt ? '<th class="p-3 text-blue-600 font-bold">PENGIRIM (KHUSUS RT)</th>' : ''}
      <th class="p-3">ISI ASPIRASI / MASUKAN</th>
      <th class="p-3 text-center">STATUS</th>
      ${isRt ? '<th class="p-3 text-center">AKSI</th>' : ''}
    `;
  }

  renderTabelAspirasiRows(rows, isRt, data.headers || []);
}
}
function renderTabelAspirasiRows(rows, isRt, headers = []) {
  let tbody = document.getElementById('aspirasi-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  let colCount = isRt ? 6 : 5;
  if (!rows || rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${colCount}" class="text-center p-4 text-gray-400">Belum ada aspirasi yang masuk.</td></tr>`;
    return;
  }
  let idIdx = headers.indexOf('id');
  let tglIdx = headers.indexOf('tanggal');
  let isiIdx = headers.indexOf('isi_aspirasi');
  let statusIdx = headers.indexOf('status');
  let namaIdx = headers.indexOf('nama');
  rows.forEach((r, i) => {
    let idVal = (idIdx > -1 && r[idIdx]) ? r[idIdx] : (r[0] || '');
    let tglVal = (tglIdx > -1 && r[tglIdx]) ? r[tglIdx] : (r[1] || '-');
    let isiVal = (isiIdx > -1 && r[isiIdx]) ? r[isiIdx] : (r[2] || '-');
    let statusVal = (statusIdx > -1 && r[statusIdx]) ? r[statusIdx] : (r[3] || 'Baru');
    let namaVal = (namaIdx > -1 && r[namaIdx]) ? r[namaIdx] : (r[4] || '-');
    let pengirimHtml = '-';
    if (namaVal && namaVal !== '-' && namaVal !== 'null') {
      pengirimHtml = namaVal;
    } else {
      pengirimHtml = `<span class="text-gray-400 italic font-normal">Anonim (Data Lama)</span>`;
    }
    let aksiHtml = isRt ? `
      <button onclick="hapusAspirasi('${idVal}')" class="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 px-2 py-1 rounded-lg text-[10px] font-bold transition">
        <i class="bi bi-trash"></i> Hapus
      </button>
    ` : '-';
    tbody.innerHTML += `
      <tr class="border-b hover:bg-gray-50/50 transition">
        <td class="p-3 text-center text-gray-400">${i + 1}</td>
        <td class="p-3 text-gray-600 font-mono text-[10px]">${tglVal}</td>
        ${isRt ? `<td class="p-3 font-semibold text-blue-700 text-xs">${pengirimHtml}</td>` : ''}
        <td class="p-3 font-medium text-gray-800" style="white-space: pre-wrap;">${isiVal}</td>
        <td class="p-3 text-center"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">${statusVal}</span></td>
        ${isRt ? `<td class="p-3 text-center">${aksiHtml}</td>` : ''}
      </tr>`;
  });
}
function bukaModalAspirasi() {
  document.getElementById('modal-aspirasi').classList.remove('hidden');
}
function tutupModalAspirasi() {
  document.getElementById('modal-aspirasi').classList.add('hidden');
  document.getElementById('formAspirasi').reset();
}
async function submitAspirasi(e) {
  e.preventDefault();
  let isi = document.getElementById('aspirasiIsi').value;
  let btn = document.getElementById('btnSubmitAspirasi');
  btn.disabled = true;
  btn.innerText = 'Mengirim...';
  let namaPengirim = session.nama || session.nik || 'Warga';
  let payload = {
    tanggal: new Date().toLocaleDateString('id-ID') + ' ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':') + ' WIB',
    isi_aspirasi: isi,
    status: 'Baru',
    nama: namaPengirim
  };
  const res = await callGASPost('simpanDataKeSheet', {
    sheetName: 'Aspirasi',
    formData: payload
  });
  btn.disabled = false;
  btn.innerText = 'Kirim Aspirasi';
  alert(res ? res.message : 'Aspirasi berhasil dikirim!');
  tutupModalAspirasi();
  loadMenu('Aspirasi');
}
async function hapusAspirasi(id) {
  showUIConfirm('Apakah Anda yakin ingin menghapus aspirasi ini dari database?', async function() {
    const res = await callGASPost('hapusDataDariSheet', {
      sheetName: 'Aspirasi',
      id: id
    });
    showUIToast(res ? res.message : 'Berhasil dihapus', 'success');
    loadMenu('Aspirasi');
  }, 'Hapus Aspirasi');
}
const originalLoadMenuAspirasi = window.loadMenu;
window.loadMenu = async function(menu) {
  if (menu === 'Aspirasi') {
    currentActiveMenu = menu;
    syncActiveNav(menu);
    document.getElementById('page-title').innerText = 'Aspirasi Warga';
    document.getElementById('main-content').innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><br><small class="text-muted mt-2 d-block">Memuat kotak aspirasi...</small></div>';
    document.getElementById('rek-info').style.display = 'none';
    const res = await callGASGet('getTableData', { sheetName: 'Aspirasi' });
    if (res) {
      currentHeaders = res.headers || [];
      currentRows = res.rows || [];
      renderAspirasiView(res);
    }
  } else {
    if (typeof originalLoadMenuAspirasi === 'function') originalLoadMenuAspirasi(menu);
  }
};
