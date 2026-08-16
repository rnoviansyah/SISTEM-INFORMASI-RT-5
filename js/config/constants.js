// ============================================================
// config/constants.js
// Konstanta global aplikasi (tanpa dependensi lain).
// Dipisah dari app.js (refactor modul). Classic script — berbagi
// global scope dengan file JS lain. URUTAN LOAD di index.html WAJIB dijaga.
// ============================================================

const MENU_CACHE_TTL = 30000;

// Header fallback per menu (dipakai callRpcGet, table.js, dan form dinamis).
// NOTE: FALLBACK_HEADERS dulu dideklarasikan di DALAM callRpcGet sehingga
// tidak terlihat oleh table.js (bug laten). Di sini dinaikkan ke global.
const FALLBACK_HEADERS = {
  'Warga': ['id', 'nama_lengkap', 'nama_panggilan', 'nik', 'no_kk', 'tempat_lahir', 'tanggal_lahir', 'jenis_kelamin', 'alamat', 'status_nikah', 'status_tinggal', 'status_keluarga', 'pekerjaan', 'no_hp', 'foto_url'],
  'Iuran': ['id', 'nik', 'nama', 'no_kk', 'bulan', 'tahun', 'nominal', 'status', 'tanggal_bayar', 'diterima_oleh', 'bukti_transfer'],
  'Pengaduan': ['id', 'nama', 'nik', 'no_hp', 'jenis_aduan', 'keterangan', 'tanggal', 'foto_url', 'status', 'foto_penyelesaian'],
  'SuratPengantar': ['id', 'nama', 'nik', 'alamat', 'rt', 'jenis_surat', 'keterangan', 'status', 'keterangan_admin'],
  'Keuangan': ['id', 'tanggal', 'pemasukan', 'pengeluaran', 'keterangan', 'foto_url'],
  'Sumbangan': ['id', 'nama', 'tanggal', 'jenis_sumbangan', 'keterangan', 'nominal', 'bukti_transfer', 'status', 'nik'],
  'Aset': ['id', 'nama_barang', 'kondisi', 'jumlah', 'status_barang'],
  'Peminjaman': ['id', 'nama_peminjam', 'id_barang', 'nama_barang', 'jumlah_minta', 'acc', 'keterangan', 'catatan_rt', 'status', 'tanggal', 'nik', 'jumlah'],
  'Aspirasi': ['id', 'tanggal', 'isi_aspirasi', 'status', 'nama'],
  'Kelahiran': ['id', 'nama_bayi', 'tanggal_lahir', 'nama_ayah', 'nama_ibu', 'alamat', 'rt'],
  'Kematian': ['id', 'nama', 'nik', 'no_kk', 'tanggal_meninggal', 'rt', 'alamat', 'keterangan'],
  'PindahMasuk': ['id', 'nama', 'nik', 'no_kk', 'asal', 'alamat_baru', 'rt', 'tanggal_pindah', 'status_pindah'],
  'PindahKeluar': ['id', 'nama', 'nik', 'no_kk', 'alamat_tujuan', 'rt', 'rw', 'tanggal_pindah']
};

// Kolom teknis yang tidak boleh tampil di tabel data
const HIDDEN_TABLE_COLS = ['created_at', 'createdat', 'updated_at', 'timestamp', 'saldo', 'nik_sha', 'kk_sha'];

// ============================================================
// TIER APLIKASI: 'premium' (default) | 'free'
//   premium — semua fitur terbuka (npm run build / dev).
//   free    — modul premium TIDAK disertakan di bundle (build:free);
//             menu premium dihapus dari UI; tombol upgrade mengarah
//             ke WhatsApp (model jual source code: free = demo).
// window.APP_TIER disuntikkan oleh scripts/build.js; di dev (tanpa
// build) window.APP_TIER tidak ada -> premium.
// ============================================================
const APP_TIER = (typeof window !== 'undefined' && window.APP_TIER === 'free') ? 'free' : 'premium';
const PREMIUM_MENUS = ['Bansos', 'Keuangan', 'Sumbangan', 'Aset', 'SuratPengantar'];

function isFreeTier() { return APP_TIER === 'free'; }
function isMenuAllowed(menu) { return APP_TIER !== 'free' || PREMIUM_MENUS.indexOf(menu) === -1; }

// Versi FREE: hapus pintu masuk menu premium dari UI (kode fiturnya
// memang tidak ada di bundle). Dipanggil berulang (watcher 3 detik)
// karena sebagian menu di-render dinamis (dashboard, sheet "Lainnya").
function applyTierUI() {
  if (APP_TIER !== 'free') return;
  PREMIUM_MENUS.forEach(function(m) {
    document.querySelectorAll('[onclick*="loadMenu(\'' + m + '\')"], [onclick*="pilihMenuLainnya(\'' + m + '\')"]').forEach(function(el) {
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });
    ['dmenu', 'smenu', 'mmenu'].forEach(function(p) {
      const b = document.getElementById('badge-' + p + '-' + m);
      if (b && b.parentNode) b.parentNode.removeChild(b);
    });
  });
  // Sembunyikan grup sidebar yang semua link-nya sudah dihapus oleh tier
  // (mis. grup "Keuangan & Kas" di versi free) — hanya jika link-nya habis.
  document.querySelectorAll('.sidebar-group').forEach(function(g) {
    if (g.querySelectorAll('a').length === 0 && g.parentNode) g.parentNode.removeChild(g);
  });
}
