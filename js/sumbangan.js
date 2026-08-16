// ============================================================
// sumbangan.js
// Sumbangan — dirender oleh TableRenderer GENERIK (table_renderer.js).
// Konfigurasi tampilan ada di TableRenderer.configs['Sumbangan'].
// ============================================================

async function loadSumbanganView() {
  currentActiveMenu = 'Sumbangan';
  syncActiveNav('Sumbangan');
  document.getElementById('page-title').innerText = 'Data Sumbangan';
  document.getElementById('main-content').innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><br><small class="text-muted mt-2 d-block">Memuat data sumbangan...</small></div>';
  document.getElementById('rek-info').style.display = 'block';
  const res = await callRpcGet('getTableData', { sheetName: 'Sumbangan' });
  if (res) {
    currentHeaders = res.headers || [];
    currentRows = res.rows || [];
    TableRenderer.render('Sumbangan', res);
  }
}
window.loadSumbanganView = loadSumbanganView;
const originalLoadMenuSumbangan = window.loadMenu;
window.loadMenu = async function(menu) {
  if (menu === 'Sumbangan') {
    loadSumbanganView();
  } else {
    if (typeof originalLoadMenuSumbangan === 'function') originalLoadMenuSumbangan(menu);
  }
};

function waVerifikasiSumbangan(id) {
  bukaWa(noWaAdmin, `Mohon verifikasi sumbangan saya dengan ID ${id}. Terima kasih.`);
}

async function verifikasiSumbanganRT(id, status = 'Diterima') {
  showUIConfirm(`Apakah Anda yakin ingin memverifikasi sumbangan ${id} dengan status "${status}"? Donasi akan otomatis tercatat di Kas Keuangan RT.`, async function() {
    let payload = { status: status };
    if (typeof menuDataCache !== 'undefined') {
      delete menuDataCache['Sumbangan'];
      delete menuDataCache['Keuangan'];
    }
    const res = await callRpcPost('updateDataDiSheet', { sheetName: 'Sumbangan', id: id, formData: payload });
    // v14: TIDAK lagi menyalin sumbangan ke tabel Keuangan — menu Keuangan
    // menampilkan sumbangan disetujui lewat UNION (patch v9 di server, atau
    // penggabungan di klien saat v9 belum terpasang). Menulis salinan di sini
    // justru membuat satu donasi tampil 2x di Keuangan.
    TableRenderer.tutupDetail();
    showUIToast(res && res.message ? res.message : 'Sumbangan berhasil diverifikasi dan dicatat di kas RT!', 'success');
    loadSumbanganView();
  }, 'Verifikasi Sumbangan RT');
}
