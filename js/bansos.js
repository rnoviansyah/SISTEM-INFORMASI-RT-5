// ============================================================
// MODUL BANSOS (Bantuan Sosial) — SISTEM INFORMASI RT 5
// ------------------------------------------------------------
// RT  : buat penyaluran bansos (pilih warga dari data Warga +
//       periode ambil + keterangan). Status awal "Belum Diambil".
//       Saat warga sudah mengambil, RT verifikasi -> "Sudah Diambil".
// Warga: cek pakai NIK (NIK sendiri atau bantuan cek tetangga).
//       NIK penerima TIDAK pernah ditampilkan di layar warga.
// ============================================================

let rawBansosData = [];
let kkHintBansos = ''; // No. KK milik warga yang login -> bansos satu keluarga (KK sama) ikut tampil
let serverNowMs = 0;        // waktu server (epoch ms) — sumber waktu utama
let serverNowFetchedAt = 0; // cache: kapan terakhir ambil waktu server

// Ambil waktu server Supabase (fungsi RPC get_server_time). Fallback: jam perangkat.
async function ambilWaktuServer(force) {
  let now = Date.now();
  if (!force && serverNowMs && (now - serverNowFetchedAt < 120000)) return serverNowMs;
  try {
    const res = await db.rpc('get_server_time');
    if (res && !res.error && res.data != null) {
      serverNowMs = Number(res.data);
      serverNowFetchedAt = Date.now();
      return serverNowMs;
    }
  } catch (e) {}
  return now;
}

// Waktu "sekarang" untuk perhitungan kedaluwarsa (sinkron; cache server, fallback perangkat)
function waktuServerNow() {
  return serverNowMs || Date.now();
}

// Lampirkan offset zona perangkat: '2026-08-17T08:30' -> '2026-08-17T08:30+07:00'
// (batas waktu jadi absolut & bisa dibandingkan dengan jam server)
function denganOffsetWaktu(v) {
  let s = String(v || '').trim();
  if (!s || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return s;
  let off = -new Date().getTimezoneOffset();
  let sign = off >= 0 ? '+' : '-';
  let abs = Math.abs(off);
  return s + sign + String(Math.floor(abs / 60)).padStart(2, '0') + ':' + String(abs % 60).padStart(2, '0');
}

// ---------------- DATA WARGA (di-cache: pencarian NIK -> No. KK & pilihan form RT) ----------------
let wargaCacheBansos = null;

function normWargaBansosList(rawList) {
  let out = [];
  (rawList || []).forEach(w => {
    let nik = String((typeof cariNilaiKolom === 'function' ? cariNilaiKolom(w, ['nik', 'ktp']) : '') || '').replace(/\D/g, '');
    let kk = String((typeof cariNilaiKolom === 'function' ? cariNilaiKolom(w, ['no_kk', 'kk', 'nomor_kk']) : '') || '').replace(/\D/g, '');
    let nama = String((typeof cariNilaiKolom === 'function' ? cariNilaiKolom(w, ['nama_lengkap', 'nama', 'name', 'nama_panggilan']) : '') || '');
    if (kk) out.push({ nik: nik, kk: kk, nama: nama });
  });
  return out;
}

async function ambilWargaBansosCache() {
  if (wargaCacheBansos) return wargaCacheBansos;
  let raw = [];
  try {
    const gas = await callGASGet('getDaftarWargaUntukIuran');
    if (gas && gas.status === 'success' && gas.data && gas.data.length) raw = gas.data;
  } catch (e) {}
  if (!raw.length) {
    const res = await safeSupabaseSelect('Warga');
    if (res && !res.error && res.data) raw = res.data;
  }
  wargaCacheBansos = normWargaBansosList(raw);
  return wargaCacheBansos;
}

function kelompokkanPerKKBansos(list) {
  let map = {};
  (list || []).forEach(w => {
    if (!w.kk) return;
    if (!map[w.kk]) map[w.kk] = { no_kk: w.kk, nama: w.nama, nik: w.nik, anggota: [] };
    map[w.kk].anggota.push(w.nama || '');
  });
  return Object.keys(map).map(kk => {
    let g = map[kk];
    return { no_kk: g.no_kk, nama: g.nama, nik: g.nik, anggota: g.anggota };
  });
}

async function ambilDaftarWargaBansos() {
  const list = await ambilWargaBansosCache();
  return kelompokkanPerKKBansos(list);
}

function opsiKeluargaBansosHTML() {
  let opts = '<option value="">Pilih Nomor KK (Keluarga)...</option>';
  kelompokkanPerKKBansos(wargaCacheBansos || []).forEach(g => {
    let anggotaStr = g.anggota.map(a => escBansos(a)).join(', ');
    opts += '<option value="' + escBansos(g.no_kk) + '" data-nama="' + escBansos(g.nama) +
      '" data-nik="' + escBansos(g.nik) + '" data-anggota="' + escBansos(anggotaStr) + '">' +
      'KK: ' + escBansos(g.no_kk) + ' — ' + escBansos(g.nama) + '</option>';
  });
  return opts;
}

async function loadBansosView() {
  document.getElementById('main-content').innerHTML =
    '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><br><small class="text-muted mt-2 d-block">Memuat data bansos...</small></div>';
  const res = await safeSupabaseSelect('Bansos');
  await ambilWaktuServer(); // pastikan kedaluwarsa dihitung pakai jam server
  if (res && !res.error) {
    rawBansosData = res.data || [];
    // Otomatis ubah status -> "Kedaluwarsa" jika sudah melewati batas waktu pengambilan (RT yang menulis DB)
    if (isBansosRT()) await tandaiKedaluwarsaBansos();
    renderBansosView();
  } else {
    // Tampilkan pesan error asli dari server (mis. "Tabel tidak diizinkan: bansos")
    let errText = 'Gagal memuat data bansos';
    if (res && res.error) {
      errText = (typeof res.error === 'string') ? res.error : (res.error.message || errText);
    }
    document.getElementById('main-content').innerHTML =
      '<div class="alert alert-danger"><i class="bi bi-exclamation-triangle-fill me-1"></i>' + errText +
      '<div class="text-xs text-muted mt-2">Pastikan tabel <b>Bansos</b> sudah dibuat di database Supabase (jalankan <code>schema.sql</code> & <code>security_patch.sql</code> via SQL Editor), lalu muat ulang halaman.</div></div>';
  }
}
window.loadBansosView = loadBansosView;

// Ubah status "Belum Diambil" -> "Kedaluwarsa" bila sudah melewati batas waktu (dipanggil saat RT buka menu)
async function tandaiKedaluwarsaBansos() {
  for (let r of rawBansosData || []) {
    let st = String(r.status || '').trim().toLowerCase();
    if (st.includes('belum') && isBansosExpired(r)) {
      r.status = 'Kedaluwarsa';
      try {
        await safeSupabaseUpdate('Bansos', { status: 'Kedaluwarsa' }, 'id', String(r.id));
      } catch (e) {}
    }
  }
}

function isBansosRT() {
  let role = (typeof session !== 'undefined' && session && session.role) ? String(session.role).trim().toUpperCase() : '';
  return role === 'RT' || role === 'ADMIN';
}

function escBansos(str) {
  return String(str === undefined || str === null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// '2026-08-17' -> '17/08/2026' (biarkan yang sudah berformat lain)
function formatTglBansos(iso) {
  if (!iso || iso === '-' || String(iso).includes('/')) return String(iso || '-');
  let parts = String(iso).split('-');
  if (parts.length === 3 && parts[0].length === 4) return parts[2] + '/' + parts[1] + '/' + parts[0];
  return String(iso || '-');
}

// '2026-08-17T08:30+07:00' / '2026-08-17T08:30' / '2026-08-17' -> '17/08/2026 08:30'
// Yang membawa zona waktu dikonversi ke waktu lokal perangkat penampil.
function formatWaktuBansos(iso) {
  if (!iso || iso === '-') return '-';
  let s = String(iso).trim();
  let pad = n => String(n).padStart(2, '0');
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(Z|[-+]\d{2}:\d{2})$/.test(s)) {
    let d = new Date(s.replace(' ', 'T'));
    if (!isNaN(d.getTime())) {
      return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() +
        ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    }
  }
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (m) return m[3] + '/' + m[2] + '/' + m[1] + (m[4] ? ' ' + m[4] + ':' + m[5] : '');
  return formatTglBansos(s);
}

// Nilai untuk input datetime-local. Format lama ('2026-08-17T08:30') dipakai apa adanya;
// yang membawa zona waktu dikonversi ke waktu lokal perangkat agar isi ulang input tepat.
function keInputWaktu(v) {
  let s = String(v || '').trim();
  if (!s || s === '-') return '';
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(Z|[-+]\d{2}:\d{2})$/.test(s)) {
    let d = new Date(s.replace(' ', 'T'));
    if (!isNaN(d.getTime())) {
      let pad = n => String(n).padStart(2, '0');
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
        'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    }
  }
  let m = s.match(/^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}))?/);
  if (!m) return s;
  return m[1] + (m[2] ? 'T' + m[2] : 'T00:00');
}

// Nilai default datetime-local = sekarang (waktu lokal)
function nowLocalInputValue() {
  let d = new Date();
  let pad = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
    'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

// Batas waktu -> timestamp absolut (format lama tanpa zona & format baru dengan offset)
function waktuAbsolutBansos(s) {
  s = String(s || '').trim();
  if (!s || s === '-') return NaN;
  let norm = s.replace(' ', 'T');
  if (/^\d{4}-\d{2}-\d{2}$/.test(norm)) return new Date(norm + 'T23:59:59').getTime();
  return new Date(norm).getTime();
}

// Bansos masih "Belum Diambil" tapi sudah lewat batas waktu (tanggal & jam) pengambilan?
// Perbandingan memakai WAKTU SERVER (get_server_time), bukan jam perangkat.
function isBansosExpired(row) {
  let status = String(row.status || '').trim().toLowerCase();
  if (status.includes('sudah') || status.includes('kedaluwarsa')) return false;
  let t = waktuAbsolutBansos(row.tanggal_selesai);
  if (isNaN(t)) return false;
  return waktuServerNow() > t;
}

function badgeStatusBansos(row, isRT) {
  let status = String(row.status || 'Belum Diambil').trim().toLowerCase();
  if (status.includes('sudah')) {
    return '<span class="inline-block bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-bold">SUDAH DIAMBIL</span>';
  }
  if (status.includes('kedaluwarsa') || isBansosExpired(row)) {
    return '<span class="inline-block bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-[10px] font-bold" title="Melewati batas waktu pengambilan"><i class="bi bi-clock-history me-1"></i>KEDALUWARSA</span>';
  }
  return '<span class="inline-block bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-bold">BELUM DIAMBIL</span>';
}

function renderBansosView() {
  let isRT = isBansosRT();
  let rows = rawBansosData || [];

  let html = `
    <div class="p-1 text-gray-800 font-sans">
      <!-- Header Banner -->
      <div class="bg-gradient-to-r from-rose-900 via-rose-700 to-orange-600 text-white p-5 rounded-2xl shadow-md mb-4 text-center">
        <h2 class="font-bold text-lg mb-1"><i class="bi bi-box-seam-fill me-2"></i>Bantuan Sosial (Bansos)</h2>
        <p class="text-xs text-rose-100">Transparan, Penyaluran Bansos RT 5</p>
      </div>
      ${isRT ? renderBansosHeaderRT(rows) : renderBansosHeaderWarga()}
      ${isRT ? '<div id="tabel-bansos-rt"></div>' : '<div id="bansos-hasil-cari" class="mt-3 space-y-2"></div>'}
    </div>`;
  document.getElementById('main-content').innerHTML = html;

  if (isRT) {
    renderTabelBansosRT(rows);
  } else {
    // Bantu warga: isi otomatis NIK sendiri + tampilkan bansos miliknya & satu keluarga (No. KK sama)
    let myNik = (session && session.nik) ? String(session.nik).replace(/\D/g, '') : '';
    if (myNik) {
      let inp = document.getElementById('bansos-cari-nik');
      if (inp) inp.value = myNik;
    }
    // Ambil No. KK milik sendiri dari data Warga agar bansos satu keluarga ikut tampil
    ambilWargaBansosCache().then(list => {
      let nikLogin = (session && session.nik) ? String(session.nik).replace(/\D/g, '') : '';
      if (nikLogin) {
        const me = (list || []).find(w => w.nik === nikLogin);
        if (me) kkHintBansos = me.kk;
      }
      cariBansosByNik();
    }).catch(() => cariBansosByNik());
  }
}

// ---------------- VIEW RT ----------------
function renderBansosHeaderRT(rows) {
  let total = rows.length;
  let belum = rows.filter(r => String(r.status || '').toLowerCase().includes('belum') && !isBansosExpired(r)).length;
  let sudah = rows.filter(r => String(r.status || '').toLowerCase().includes('sudah')).length;
  let kedaluwarsa = rows.filter(r => {
    let st = String(r.status || '').toLowerCase();
    return st.includes('kedaluwarsa') || (st.includes('belum') && isBansosExpired(r));
  }).length;
  return `
    <div class="mb-4 flex justify-end">
      <button onclick="bukaModalTambahBansosRT()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-bold shadow transition flex items-center gap-1">
        <i class="bi bi-plus-circle-fill"></i> + Tambah Penyaluran Bansos
      </button>
    </div>
    <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-4">
      <div class="flex justify-between items-center mb-3">
        <div>
          <h4 class="font-bold text-gray-800 text-sm">Administrator RT (Pengelola Bansos)</h4>
          <p class="text-[10px] text-gray-400 font-mono">NIK: ${session && session.nik ? escBansos(session.nik) : '-'} | Role: RT</p>
        </div>
        <span class="bg-purple-50 text-purple-600 px-2.5 py-1 rounded-full text-[11px] font-bold border border-purple-100"><i class="bi bi-shield-lock me-1"></i> Admin RT</span>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div class="bg-rose-50 border border-rose-100 p-3 rounded-xl">
          <p class="text-[10px] text-rose-600 uppercase font-bold">Total Penerima</p>
          <p class="font-bold text-rose-700 text-sm md:text-base">${total}</p>
        </div>
        <div class="bg-amber-50 border border-amber-100 p-3 rounded-xl">
          <p class="text-[10px] text-amber-600 uppercase font-bold">Belum Diambil</p>
          <p class="font-bold text-amber-700 text-sm md:text-base">${belum}</p>
        </div>
        <div class="bg-emerald-50 border border-emerald-100 p-3 rounded-xl">
          <p class="text-[10px] text-emerald-600 uppercase font-bold">Sudah Diambil</p>
          <p class="font-bold text-emerald-700 text-sm md:text-base">${sudah}</p>
        </div>
        <div class="bg-gray-50 border border-gray-100 p-3 rounded-xl">
          <p class="text-[10px] text-gray-500 uppercase font-bold">Kedaluwarsa</p>
          <p class="font-bold text-gray-700 text-sm md:text-base">${kedaluwarsa}</p>
        </div>
      </div>
    </div>`;
}

function renderTabelBansosRT(rows) {
  let container = document.getElementById('tabel-bansos-rt');
  if (!container) return;
  if (rows.length === 0) {
    container.innerHTML = '<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center text-gray-400 text-xs">Belum ada penyaluran bansos tercatat. Klik <b>+ Tambah Penyaluran Bansos</b> untuk memulai.</div>';
    return;
  }
  let thead = `
    <table class="w-full text-left text-xs min-w-[860px]">
      <thead>
        <tr class="text-[10px] uppercase text-gray-400 border-b border-gray-100">
          <th class="py-2 px-2 font-bold">#</th>
          <th class="py-2 px-2 font-bold">Nama</th>
          <th class="py-2 px-2 font-bold">NIK</th>
          <th class="py-2 px-2 font-bold">Jenis Bansos</th>
          <th class="py-2 px-2 font-bold">Periode Ambil</th>
          <th class="py-2 px-2 font-bold">Status</th>
          <th class="py-2 px-2 font-bold">Keterangan</th>
          <th class="py-2 px-2 font-bold">Aksi</th>
        </tr>
      </thead>
      <tbody>`;
  let tbody = rows.map((r, i) => {
    let id = String(r.id || '');
    let nama = escBansos(r.nama || '-');
    let nik = escBansos(r.nik || '-');
    let jenis = escBansos(r.jenis_bansos || '-');
    let periode = formatWaktuBansos(r.tanggal_mulai) + ' – ' + formatWaktuBansos(r.tanggal_selesai);
    let ket = escBansos(r.keterangan || '-');
    let isSudah = String(r.status || '').toLowerCase().includes('sudah');
    let aksi;
    if (isSudah) {
      aksi = `
        <div class="flex items-center gap-1">
          <button onclick="bukaModalEditBansosRT('${id}')" class="bg-amber-500 hover:bg-amber-600 text-white p-1 px-2 rounded-lg text-[10px] font-bold shadow transition"><i class="bi bi-pencil-square"></i> Edit</button>
          <button onclick="hapusBansosRT('${id}')" class="bg-rose-600 hover:bg-rose-700 text-white p-1 px-2 rounded-lg text-[10px] font-bold shadow transition"><i class="bi bi-trash-fill"></i> Hapus</button>
        </div>`;
    } else {
      aksi = `
        <div class="flex items-center gap-1">
          <button onclick="verifikasiBansosDiambilRT('${id}')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold shadow transition"><i class="bi bi-check-circle-fill"></i> Verifikasi Diambil</button>
          <button onclick="bukaModalEditBansosRT('${id}')" class="bg-amber-500 hover:bg-amber-600 text-white p-1 px-2 rounded-lg text-[10px] font-bold shadow transition"><i class="bi bi-pencil-square"></i> Edit</button>
          <button onclick="hapusBansosRT('${id}')" class="bg-rose-600 hover:bg-rose-700 text-white p-1 px-2 rounded-lg text-[10px] font-bold shadow transition"><i class="bi bi-trash-fill"></i> Hapus</button>
        </div>`;
    }
    return `
      <tr class="border-b border-gray-50 hover:bg-gray-50 transition align-top">
        <td class="py-2.5 px-2 text-gray-400">${i + 1}</td>
        <td class="py-2.5 px-2 font-bold text-gray-800">${nama}</td>
        <td class="py-2.5 px-2 font-mono text-gray-500">${nik}</td>
        <td class="py-2.5 px-2 text-gray-600">${jenis}</td>
        <td class="py-2.5 px-2 text-gray-600 whitespace-nowrap">${periode}</td>
        <td class="py-2.5 px-2">${badgeStatusBansos(r, true)}</td>
        <td class="py-2.5 px-2 text-gray-600 max-w-[240px]">${ket}</td>
        <td class="py-2.5 px-2">${aksi}</td>
      </tr>`;
  }).join('');
  container.innerHTML = `
    <div class="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 p-3">
      <div class="flex justify-between items-center mb-3 px-1">
        <h3 class="font-bold text-xs text-gray-500 uppercase">Daftar Penerima Bansos</h3>
        <span class="text-[10px] text-gray-400">${rows.length} penerima</span>
      </div>
      <div class="overflow-x-auto">
        ${thead + tbody + '</tbody></table>'}
      </div>
    </div>`;
}

// ---------------- VIEW WARGA ----------------
function renderBansosHeaderWarga() {
  return `
    <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-4">
      <h4 class="font-bold text-gray-800 text-sm mb-2"><i class="bi bi-info-circle-fill me-1 text-rose-500"></i> Cara Cek Bansos</h4>
      <ul class="text-xs text-gray-600 space-y-1.5 list-disc ps-4">
        <li>RT mencatat bansos per <b>keluarga</b> berdasarkan <b>Nomor KK</b>.</li>
        <li>Masukkan <b>NIK</b> (atau <b>No. KK</b>) pada kolom pencarian di bawah — bisa milik Anda sendiri, anggota keluarga, atau tetangga yang ingin Anda bantu cek.</li>
        <li>Begitu NIK tersebut terhubung ke <b>No. KK penerima bansos</b>, informasi bansos + <b>periode pengambilan (tanggal & jam)</b> langsung muncul — <b>seluruh anggota keluarga</b> dengan KK yang sama bisa melihatnya.</li>
        <li>Jika NIK/No. KK <b>tidak terdaftar</b>, hasilnya <b>"Data tidak ditemukan"</b>.</li>
        <li>Ambil bansos sesuai jadwal di rumah RT. <b>Jika tidak diambil sampai batas tanggal & jam, status otomatis berubah menjadi Kedaluwarsa</b> dan bansos akan diserahkan kepada warga lain.</li>
        <li><i class="bi bi-shield-lock me-1 text-emerald-500"></i> Untuk alasan privasi, <b>NIK tidak ditampilkan</b> pada hasil pencarian.</li>
      </ul>
    </div>
    <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-4">
      <label class="font-bold text-gray-700 text-xs mb-1 block">Cek NIK / No. KK Penerima Bansos</label>
      <div class="flex gap-2">
        <input type="text" id="bansos-cari-nik" inputmode="numeric" maxlength="20" placeholder="Masukkan NIK / No. KK" class="flex-1 p-2.5 border rounded-xl bg-white text-xs font-mono" onkeydown="if(event.key==='Enter'){cariBansosByNik()}">
        <button onclick="cariBansosByNik()" class="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow transition whitespace-nowrap"><i class="bi bi-search me-1"></i> Cari</button>
      </div>
    </div>`;
}

function cariBansosByNik(qOverride) {
  let inp = document.getElementById('bansos-cari-nik');
  let box = document.getElementById('bansos-hasil-cari');
  if (!inp || !box) return;
  let q = (typeof qOverride === 'string' && String(qOverride).trim() !== '')
    ? String(qOverride).replace(/\D/g, '')
    : String(inp.value || '').replace(/\D/g, '');
  if (!q) {
    box.innerHTML = '<div class="bg-amber-50 border border-amber-100 text-amber-800 rounded-xl p-3 text-xs"><i class="bi bi-exclamation-circle me-1"></i> Masukkan NIK atau No. KK terlebih dahulu.</div>';
    return;
  }
  let norm = v => String(v || '').replace(/\D/g, '');
  // NIK yang dicari -> cari No. KK-nya di data Warga (bansos dicatat PER KK, jadi siapapun yang NIK-nya
  // terhubung ke KK penerima bansos akan ketemu — termasuk cek pakai NIK anggota keluarga lain)
  let cariKk = '';
  let wList = wargaCacheBansos || [];
  let wFound = wList.find(w => w.nik && (w.nik === q || w.nik.endsWith(q) || w.nik.includes(q)));
  if (wFound) cariKk = norm(wFound.kk);
  // Penerima yang cocok langsung: NIK yang cocok ATAU No. KK yang diketik langsung
  let matchesNik = (rawBansosData || []).filter(r => {
    let nik = norm(r.nik);
    let kk = norm(r.no_kk);
    return (q && nik && (nik === q || nik.endsWith(q) || nik.includes(q))) || (kk === q);
  });
  // Kumpulkan No. KK yang relevan: dari penerima yang cocok + hasil resolve NIK -> KK
  let kkSet = new Set();
  matchesNik.forEach(r => { let kk = norm(r.no_kk); if (kk) kkSet.add(kk); });
  if (cariKk) kkSet.add(cariKk);
  // Kalau yang dicari NIK milik sendiri -> bansos satu keluarga (No. KK sama) ikut tampil
  let myNikDigits = (session && session.nik) ? String(session.nik).replace(/\D/g, '') : '';
  if (myNikDigits && q === myNikDigits) {
    let ownKk = norm(kkHintBansos);
    if (ownKk) kkSet.add(ownKk);
  }
  // Final: baris yang cocok via NIK/KK yang dicari ATAU No. KK sama (keluarga), tanpa duplikat
  let matches = [];
  let seen = new Set();
  (rawBansosData || []).forEach(r => {
    let nik = norm(r.nik);
    let kk = norm(r.no_kk);
    let isDirect = (q && nik && (nik === q || nik.endsWith(q) || nik.includes(q))) || (kk === q);
    let isFamily = kk && kkSet.has(kk);
    if ((isDirect || isFamily) && !seen.has(String(r.id))) {
      seen.add(String(r.id));
      matches.push(Object.assign({}, r, { _keluarga: isFamily && !isDirect }));
    }
  });
  if (matches.length === 0) {
    box.innerHTML = '<div class="bg-white border border-gray-100 rounded-xl p-4 text-center text-xs text-gray-500"><i class="bi bi-search me-1"></i> Data <b>tidak ditemukan</b> — NIK/No. KK tersebut tidak terdaftar sebagai penerima bansos saat ini.</div>';
    return;
  }
  box.innerHTML = matches.map(r => {
    let sudah = String(r.status || '').toLowerCase().includes('sudah');
    let expired = !sudah && isBansosExpired(r);
    let jenis = escBansos(r.jenis_bansos || 'Bansos');
    let periode = formatWaktuBansos(r.tanggal_mulai) + ' – ' + formatWaktuBansos(r.tanggal_selesai);
    let ket = escBansos(r.keterangan || '');
    let keluargaBadge = r._keluarga
      ? '<span class="inline-block bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full text-[10px] font-bold ms-1"><i class="bi bi-people-fill me-1"></i>Anggota keluarga (KK sama)</span>'
      : '';
    let statusNote = sudah
      ? '<p class="text-[10px] text-emerald-600 font-bold mt-1"><i class="bi bi-check-circle-fill me-1"></i>Bansos sudah diambil' + (r.diambil_pada && r.diambil_pada !== '-' ? ' pada ' + escBansos(r.diambil_pada) : '') + '.</p>'
      : expired
        ? '<p class="text-[10px] text-rose-600 font-bold mt-1"><i class="bi bi-clock-history me-1"></i>Batas waktu pengambilan sudah lewat — bansos akan diserahkan kepada warga lain.</p>'
        : '<p class="text-[10px] text-amber-600 font-bold mt-1"><i class="bi bi-clock-history me-1"></i>Segera ambil bansos sebelum batas waktu pengambilan (tanggal & jam) berakhir.</p>';
    return `
      <div class="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
        <div class="flex justify-between items-start gap-2 flex-wrap">
          <div>
            <p class="font-bold text-gray-800 text-sm">${escBansos(r.nama || 'Penerima')}${keluargaBadge}</p>
            <p class="text-[10px] text-gray-400 font-mono">NIK: ••••••••••• (disembunyikan)</p>
          </div>
          ${badgeStatusBansos(r, false)}
        </div>
        <div class="mt-3 space-y-1 text-xs text-gray-700">
          <p><span class="font-bold text-gray-500 uppercase text-[10px]">Jenis Bansos : </span>${jenis}</p>
          <p><span class="font-bold text-gray-500 uppercase text-[10px]">Periode Ambil : </span>${periode}</p>
          ${ket ? '<p class="bg-amber-50 border border-amber-100 text-amber-900 rounded-xl p-2.5 mt-2"><i class="bi bi-info-circle me-1"></i>' + ket + '</p>' : ''}
          ${statusNote}
        </div>
      </div>`;
  }).join('');
}
window.cariBansosByNik = cariBansosByNik;

// ---------------- FORM TAMBAH / EDIT (RT) ----------------
// (data Warga & helper ambilDaftarWargaBansos dipindah ke bagian atas file)

function formBansosModalHtml(wargaOptions, prefill) {
  prefill = prefill || {};
  let tanggalMulia = keInputWaktu(prefill.tanggal_mulai);
  let tanggalSelesai = keInputWaktu(prefill.tanggal_selesai);
  return `
    <div class="p-2 space-y-3 text-xs">
      <div>
        <label class="font-bold text-gray-600 mb-1 block">Pilih Keluarga (Nomor KK)</label>
        <select id="bansos-pilih-kk" class="w-full p-2 border rounded-xl bg-white" onchange="isiOtomatisKKBansos(this)">
          ${wargaOptions}
        </select>
        <div id="bansos-anggota-kk" class="mt-1.5 text-[10px] text-gray-500 bg-gray-50 border border-gray-100 rounded-xl p-2 hidden"></div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="font-bold text-gray-600 mb-1 block">Nomor KK</label>
          <input type="text" id="bansos-input-kk" value="${escBansos(prefill.no_kk || '')}" class="w-full p-2 border rounded-xl bg-gray-50" readonly>
        </div>
        <div>
          <label class="font-bold text-gray-600 mb-1 block">NIK Kepala Keluarga</label>
          <input type="text" id="bansos-input-nik" value="${escBansos(prefill.nik || '')}" class="w-full p-2 border rounded-xl bg-gray-50" readonly>
        </div>
      </div>
      <div>
        <label class="font-bold text-gray-600 mb-1 block">Nama Kepala Keluarga</label>
        <input type="text" id="bansos-input-nama" value="${escBansos(prefill.nama || '')}" class="w-full p-2 border rounded-xl bg-gray-50" readonly>
      </div>
      <div>
        <label class="font-bold text-gray-600 mb-1 block">Jenis Bansos</label>
        <input type="text" id="bansos-input-jenis" value="${escBansos(prefill.jenis_bansos || '')}" placeholder="Contoh: Bantuan Sembako / BLT / PKH" class="w-full p-2 border rounded-xl bg-white">
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="font-bold text-gray-600 mb-1 block">Tanggal & Jam Mulai Ambil</label>
          <input type="datetime-local" id="bansos-tgl-mulai" value="${tanggalMulia}" class="w-full p-2 border rounded-xl bg-white" onchange="perbaruiKeteranganBansos()">
        </div>
        <div>
          <label class="font-bold text-gray-600 mb-1 block">Tanggal & Jam Selesai Ambil</label>
          <input type="datetime-local" id="bansos-tgl-selesai" value="${tanggalSelesai}" class="w-full p-2 border rounded-xl bg-white" onchange="perbaruiKeteranganBansos()">
        </div>
      </div>
      <div>
        <label class="font-bold text-gray-600 mb-1 block">Keterangan (info untuk warga)</label>
        <textarea id="bansos-keterangan" rows="3" class="w-full p-2 border rounded-xl bg-white" placeholder="Silakan ambil bansos di rumah RT 5 dari tanggal ... sampai ... Jika tidak diambil, bansos akan diserahkan ke warga lain.">${escBansos(prefill.keterangan || '')}</textarea>
      </div>
      <div>
        <label class="font-bold text-gray-600 mb-1 block">Status</label>
        <select id="bansos-input-status" class="w-full p-2 border rounded-xl bg-white">
          <option value="Belum Diambil" ${String(prefill.status || '').toLowerCase().includes('belum') || !prefill.status ? 'selected' : ''}>Belum Diambil</option>
          <option value="Sudah Diambil" ${String(prefill.status || '').toLowerCase().includes('sudah') ? 'selected' : ''}>Sudah Diambil</option>
          <option value="Kedaluwarsa" ${String(prefill.status || '').toLowerCase().includes('kedaluwarsa') ? 'selected' : ''}>Kedaluwarsa</option>
        </select>
      </div>
      <div class="pt-2">
        <button type="button" onclick="${prefill.id ? "simpanEditBansosRT(event, '" + prefill.id + "')" : 'simpanBansosBaruRT(event)'}" class="w-full bg-rose-600 hover:bg-rose-700 text-white p-2.5 rounded-xl font-bold shadow transition">
          ${prefill.id ? 'Simpan Perubahan' : 'Simpan Penyaluran Bansos'}
        </button>
      </div>
    </div>`;
}

function bukaModalBansosUmum(prefill) {
  let styleId = 'hide-modal-footer-override';
  if (!document.getElementById(styleId)) {
    let style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `#formModal .modal-footer { display: none !important; }`;
    document.head.appendChild(style);
  }
  document.getElementById('formModalTitle').innerText = prefill.id ? 'Edit Penyaluran Bansos' : 'Tambah Penyaluran Bansos';
  document.getElementById('btn-hapus-modal').style.display = 'none';
  let modal = new bootstrap.Modal(document.getElementById('formModal'));
  // Render form kosong dulu, isi opsi warga setelah data siap
  document.getElementById('dynamicForm').innerHTML =
    '<div class="p-4 text-center text-xs text-gray-500"><div class="spinner-border spinner-border-sm text-primary me-2"></div>Memuat data warga...</div>';
  modal.show();
  return modal;
}

async function bukaModalTambahBansosRT() {
  let modal = bukaModalBansosUmum({});
  await ambilDaftarWargaBansos(); // isi cache warga & kelompokkan per KK
  let opts = opsiKeluargaBansosHTML();
  document.getElementById('dynamicForm').innerHTML = formBansosModalHtml(opts, {});
  // Status default
  let st = document.getElementById('bansos-input-status');
  if (st) st.value = 'Belum Diambil';
  let now = nowLocalInputValue();
  let mulai = document.getElementById('bansos-tgl-mulai');
  let selesai = document.getElementById('bansos-tgl-selesai');
  if (mulai) mulai.value = now;
  if (selesai) selesai.value = now;
  perbaruiKeteranganBansos();
}

function isiOtomatisKKBansos(selectEl) {
  let opt = selectEl.options[selectEl.selectedIndex];
  let kk = opt ? (opt.value || '') : '';
  let nama = opt ? (opt.getAttribute('data-nama') || '') : '';
  let nik = opt ? (opt.getAttribute('data-nik') || '') : '';
  let anggota = opt ? (opt.getAttribute('data-anggota') || '') : '';
  if (kk === 'undefined') kk = '';
  if (nama === 'undefined') nama = '';
  if (nik === 'undefined') nik = '';
  if (anggota === 'undefined') anggota = '';
  document.getElementById('bansos-input-kk').value = kk;
  document.getElementById('bansos-input-nama').value = nama;
  document.getElementById('bansos-input-nik').value = nik;
  let box = document.getElementById('bansos-anggota-kk');
  if (box) {
    if (anggota) {
      box.innerHTML = '<i class="bi bi-people-fill me-1 text-sky-500"></i><b>Anggota keluarga:</b> ' + anggota;
      box.classList.remove('hidden');
    } else {
      box.classList.add('hidden');
    }
  }
}

function perbaruiKeteranganBansos() {
  let mulai = document.getElementById('bansos-tgl-mulai');
  let selesai = document.getElementById('bansos-tgl-selesai');
  let ket = document.getElementById('bansos-keterangan');
  if (!ket || !mulai || !selesai) return;
  let m = mulai.value;
  let s = selesai.value;
  if (m && s) {
    ket.value = 'Silakan ambil bansos di rumah RT 5 dari tanggal ' + formatWaktuBansos(m) +
      ' sampai ' + formatWaktuBansos(s) +
      '. Jika tidak diambil sampai batas waktu tersebut, bansos akan diserahkan kepada warga lain.';
  }
}

async function simpanBansosBaruRT(event) {
  if (event) event.preventDefault();
  let noKk = document.getElementById('bansos-input-kk').value.trim();
  let nik = document.getElementById('bansos-input-nik').value.trim();
  if (!noKk && !nik) {
    showUIToast('Silakan pilih keluarga (Nomor KK) terlebih dahulu!', 'error');
    return;
  }
  let jenis = document.getElementById('bansos-input-jenis').value.trim();
  let mulai = document.getElementById('bansos-tgl-mulai').value;
  let selesai = document.getElementById('bansos-tgl-selesai').value;
  if (!jenis) {
    showUIToast('Isi jenis bansos terlebih dahulu!', 'error');
    return;
  }
  if (!mulai || !selesai) {
    showUIToast('Isi tanggal & jam mulai dan selesai pengambilan!', 'error');
    return;
  }
  if (selesai < mulai) {
    showUIToast('Waktu selesai tidak boleh sebelum waktu mulai!', 'error');
    return;
  }
  let row = {
    id: 'BNS-' + Date.now(),
    nik: nik,
    nama: document.getElementById('bansos-input-nama').value.trim(),
    no_kk: document.getElementById('bansos-input-kk').value.trim(),
    jenis_bansos: jenis,
    tanggal_mulai: denganOffsetWaktu(mulai),
    tanggal_selesai: denganOffsetWaktu(selesai),
    status: document.getElementById('bansos-input-status').value || 'Belum Diambil',
    keterangan: document.getElementById('bansos-keterangan').value.trim(),
    diambil_pada: '-',
    diverifikasi_oleh: '-'
  };
  const res = await safeSupabaseInsert('Bansos', [row]);
  if (res && !res.error) {
    showUIToast('Penyaluran bansos berhasil ditambahkan!', 'success');
    let modalEl = document.getElementById('formModal');
    let mi = bootstrap.Modal.getInstance(modalEl);
    if (mi) mi.hide();
    if (typeof clearAppCache === 'function') clearAppCache();
    loadBansosView();
  } else {
    showUIToast('Gagal menyimpan: ' + ((res && res.error && res.error.message) ? res.error.message : 'Terjadi kesalahan'), 'error');
  }
}

async function verifikasiBansosDiambilRT(id) {
  showUIConfirm('Verifikasi bahwa bansos ini SUDAH diambil oleh warga? Status akan berubah menjadi "Sudah Diambil".', async function() {
    let nowMs = await ambilWaktuServer(true);
    let nowD = new Date(nowMs);
    let nowFormatted = nowD.toLocaleDateString('id-ID', {
      day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Jakarta'
    }) + ' ' + nowD.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).replace('.', ':') + ' WIB';
    let res = await safeSupabaseUpdate('Bansos', {
      status: 'Sudah Diambil',
      diambil_pada: nowFormatted,
      diverifikasi_oleh: 'RT 5 (' + ((session && session.nama) ? session.nama : 'Pengurus') + ')'
    }, 'id', id);
    if (res && !res.error) {
      if (typeof menuDataCache !== 'undefined') delete menuDataCache['Bansos'];
      showUIToast('Bansos diverifikasi sudah diambil!', 'success');
      loadBansosView();
    } else {
      showUIToast('Gagal verifikasi: ' + ((res && res.error && res.error.message) ? res.error.message : 'Terjadi kesalahan'), 'error');
    }
  }, 'Verifikasi Pengambilan Bansos');
}

async function bukaModalEditBansosRT(id) {
  let item = (rawBansosData || []).find(r => String(r.id) === String(id));
  if (!item) {
    showUIToast('Data bansos tidak ditemukan!', 'error');
    return;
  }
  let modal = bukaModalBansosUmum({ id: id });
  await ambilDaftarWargaBansos(); // isi cache warga & kelompokkan per KK
  let opts = opsiKeluargaBansosHTML();
  document.getElementById('dynamicForm').innerHTML = formBansosModalHtml(opts, {
    id: id,
    nik: item.nik,
    nama: item.nama,
    no_kk: item.no_kk,
    jenis_bansos: item.jenis_bansos,
    tanggal_mulai: item.tanggal_mulai,
    tanggal_selesai: item.tanggal_selesai,
    keterangan: item.keterangan,
    status: item.status
  });
  let sel = document.getElementById('bansos-pilih-kk');
  if (sel) sel.value = item.no_kk || '';
}

async function simpanEditBansosRT(event, id) {
  if (event) event.preventDefault();
  let mulai = document.getElementById('bansos-tgl-mulai').value;
  let selesai = document.getElementById('bansos-tgl-selesai').value;
  if (!mulai || !selesai) {
    showUIToast('Isi tanggal & jam mulai dan selesai pengambilan!', 'error');
    return;
  }
  if (selesai < mulai) {
    showUIToast('Waktu selesai tidak boleh sebelum waktu mulai!', 'error');
    return;
  }
  let updatePayload = {
    nik: document.getElementById('bansos-input-nik').value.trim(),
    nama: document.getElementById('bansos-input-nama').value.trim(),
    no_kk: document.getElementById('bansos-input-kk').value.trim(),
    jenis_bansos: document.getElementById('bansos-input-jenis').value.trim(),
    tanggal_mulai: denganOffsetWaktu(mulai),
    tanggal_selesai: denganOffsetWaktu(selesai),
    status: document.getElementById('bansos-input-status').value,
    keterangan: document.getElementById('bansos-keterangan').value.trim()
  };
  if (!updatePayload.no_kk && !updatePayload.nik) {
    showUIToast('Silakan pilih keluarga (Nomor KK) terlebih dahulu!', 'error');
    return;
  }
  let res = await safeSupabaseUpdate('Bansos', updatePayload, 'id', id);
  if (res && !res.error) {
    if (typeof menuDataCache !== 'undefined') delete menuDataCache['Bansos'];
    showUIToast('Data bansos berhasil diperbarui!', 'success');
    let modalEl = document.getElementById('formModal');
    let mi = bootstrap.Modal.getInstance(modalEl);
    if (mi) mi.hide();
    loadBansosView();
  } else {
    showUIToast('Gagal menyimpan: ' + ((res && res.error && res.error.message) ? res.error.message : 'Terjadi kesalahan'), 'error');
  }
}

async function hapusBansosRT(id) {
  showUIConfirm('Apakah Anda yakin ingin menghapus data penyaluran bansos ini?', async function() {
    let res = await safeSupabaseDelete('Bansos', 'id', id);
    if (res && !res.error) {
      if (typeof menuDataCache !== 'undefined') delete menuDataCache['Bansos'];
      showUIToast('Data bansos berhasil dihapus!', 'success');
      loadBansosView();
    } else {
      showUIToast('Gagal menghapus: ' + ((res && res.error && res.error.message) ? res.error.message : 'Terjadi kesalahan'), 'error');
    }
  }, 'Hapus Penyaluran Bansos');
}

// ---------------- REGISTRASI MENU ----------------
const originalLoadMenuBansos = window.loadMenu;
window.loadMenu = async function(menu) {
  if (menu === 'Bansos') {
    currentActiveMenu = menu;
    syncActiveNav(menu);
    document.getElementById('page-title').innerText = 'Bansos';
    document.getElementById('rek-info').style.display = 'none';
    await loadBansosView();
  } else {
    if (typeof originalLoadMenuBansos === 'function') originalLoadMenuBansos(menu);
  }
};
