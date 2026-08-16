// ============================================================
// pindah_keluar.js
// Data Pindah Keluar — dirender oleh TableRenderer GENERIK (table_renderer.js).
// Konfigurasi tampilan ada di TableRenderer.configs['PindahKeluar'].
// Dipanggil dari table.js loadMenu.
// ============================================================

async function loadPindahKeluarView() {
  const res = await callRpcGet('getTableData', { sheetName: 'PindahKeluar' });
  if (res) {
    currentHeaders = res.headers || [];
    currentRows = res.rows || [];
    TableRenderer.render('PindahKeluar', res);
  }
}
