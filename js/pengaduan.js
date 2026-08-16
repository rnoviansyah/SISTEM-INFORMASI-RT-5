// ============================================================
// pengaduan.js
// Pengaduan Warga — dirender oleh TableRenderer GENERIK (table_renderer.js).
// Konfigurasi tampilan ada di TableRenderer.configs['Pengaduan'].
// ============================================================

async function loadPengaduanView() {
  currentActiveMenu = 'Pengaduan';
  syncActiveNav('Pengaduan');
  document.getElementById('page-title').innerText = 'Pengaduan Warga';
  document.getElementById('main-content').innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><br><small class="text-muted mt-2 d-block">Memuat pengaduan...</small></div>';
  document.getElementById('rek-info').style.display = 'none';
  const res = await callRpcGet('getTableData', { sheetName: 'Pengaduan' });
  if (res) {
    currentHeaders = res.headers || [];
    currentRows = res.rows || [];
    TableRenderer.render('Pengaduan', res);
  }
}
window.loadPengaduanView = loadPengaduanView;
const originalLoadMenuPengaduan = window.loadMenu;
window.loadMenu = async function(menu) {
  if (menu === 'Pengaduan') {
    loadPengaduanView();
  } else {
    if (typeof originalLoadMenuPengaduan === 'function') originalLoadMenuPengaduan(menu);
  }
};

function waKirimLaporanKeWarga(id, noHp) {
  let cleanNo = noHp ? noHp.toString().replace(/[^0-9]/g, '') : '';
  if (cleanNo.startsWith('0')) {
    cleanNo = '62' + cleanNo.slice(1);
  }
  if (!cleanNo) {
    cleanNo = prompt("Nomor WA warga tidak terdeteksi otomatis di kolom. Silakan ketik manual (ex: 628xxx):");
    if (cleanNo) cleanNo = cleanNo.toString().replace(/[^0-9]/g, '');
  }
  if (cleanNo) {
    bukaWa(cleanNo, `Pengaduan/Surat Anda dengan ID ${id} telah selesai diproses. Mohon hubungi RT 5 bila ada pertanyaan.`);
  }
}

function waKirimLaporan(jenis, id) {
  let pesan = jenis === 'aduan' 
    ? `Mohon segera ditindaklanjuti pengaduan saya dengan ID ${id}. Terima kasih.`
    : `Mohon segera diproses surat pengantar saya dengan ID ${id}. Terima kasih.`;
  bukaWa(noWaAdmin, pesan);
}
