// ============================================================
// kematian.js
// Data Kematian — dirender oleh TableRenderer GENERIK (table_renderer.js).
// Konfigurasi tampilan ada di TableRenderer.configs['Kematian'].
// ============================================================

async function loadKematianView() {
  currentActiveMenu = 'Kematian';
  syncActiveNav('Kematian');
  document.getElementById('page-title').innerText = 'Data Kematian';
  document.getElementById('main-content').innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><br><small class="text-muted mt-2 d-block">Memuat data kematian...</small></div>';
  document.getElementById('rek-info').style.display = 'none';
  const res = await callRpcGet('getTableData', { sheetName: 'Kematian' });
  if (res) {
    currentHeaders = res.headers || [];
    currentRows = res.rows || [];
    TableRenderer.render('Kematian', res);
  }
}
const originalLoadMenuKematian = window.loadMenu;
window.loadMenu = async function(menu) {
  if (menu === 'Kematian') {
    loadKematianView();
  } else {
    if (typeof originalLoadMenuKematian === 'function') originalLoadMenuKematian(menu);
  }
};

// Dropdown form Kematian: pilih warga -> isi NIK, No. KK & alamat otomatis
function isiOtomatisKematianWarga(sel) {
  let opt = sel.options[sel.selectedIndex];
  if (!opt) return;
  function isiKolom(key, v) {
    let inp = document.querySelector('#dynamicForm .dynamic-input[data-key="' + key + '"]');
    if (inp) inp.value = v || '';
  }
  isiKolom('nik', opt.getAttribute('data-nik'));
  isiKolom('no_kk', opt.getAttribute('data-kk'));
  isiKolom('alamat', opt.getAttribute('data-alamat'));
}
window.isiOtomatisKematianWarga = isiOtomatisKematianWarga;
