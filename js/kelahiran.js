// ============================================================
// kelahiran.js
// Data Kelahiran — dirender oleh TableRenderer GENERIK (table_renderer.js).
// Konfigurasi tampilan (judul, ikon, kolom, aksi) ada di
// TableRenderer.configs['Kelahiran']. Dipanggil dari table.js loadMenu.
// ============================================================

async function loadKelahiranView() {
  const res = await callRpcGet('getTableData', { sheetName: 'Kelahiran' });
  if (res) {
    currentHeaders = res.headers || [];
    currentRows = res.rows || [];
    TableRenderer.render('Kelahiran', res);
  }
}
