// ============================================================
// pindah_masuk.js
// Data Pindah Masuk — dirender oleh TableRenderer GENERIK (table_renderer.js).
// Konfigurasi tampilan ada di TableRenderer.configs['PindahMasuk'].
// Dipanggil dari table.js loadMenu.
// ============================================================

async function loadPindahMasukView() {
  const res = await callRpcGet('getTableData', { sheetName: 'PindahMasuk' });
  if (res) {
    currentHeaders = res.headers || [];
    currentRows = res.rows || [];
    TableRenderer.render('PindahMasuk', res);
  }
}
