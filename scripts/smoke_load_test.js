// Smoke test: muat SEMUA file JS sesuai urutan index.html dalam satu
// konteks global (seperti browser) dengan stub DOM/supabase, lalu jalankan
// fungsi kunci refactor (login RPC, canonicalTableHeaders, TableRenderer).
// Menangkap: deklarasi let/const ganda, referensi global hilang saat eval,
// dan error runtime pada jalur kode yang diubah. Bukan pengganti tes browser.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

// ---------- Stub global ----------
function makeFakeElement() {
  const classSet = new Set();
  const el = {
    style: {}, dataset: {},
    classList: {
      add(c) { classSet.add(c); },
      remove(c) { classSet.delete(c); },
      toggle(c) { if (classSet.has(c)) { classSet.delete(c); return false; } classSet.add(c); return true; },
      contains(c) { return classSet.has(c); }
    },
    options: [], selectedIndex: -1, files: [],
    innerHTML: '', innerText: '', textContent: '', value: '', disabled: false,
    src: '', href: '', title: '', id: '',
    addEventListener() {}, removeEventListener() {},
    appendChild() {}, prepend() {}, remove() {}, focus() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    insertAdjacentHTML() {}, setAttribute() {}, getAttribute() { return null; },
    cloneNode() { return makeFakeElement(); }, replaceChild() {}, closest() { return null; },
    parentNode: { replaceChild() {} },
    firstElementChild: null
  };
  return new Proxy(el, {
    get(t, p) {
      if (p in t) return t[p];
      if (typeof p === 'symbol') return t[p];
      return function() {};
    },
    set(t, p, v) { t[p] = v; return true; }
  });
}

// Elemen per-ID agar innerHTML antar elemen tidak saling menimpa
const elMap = new Map();
function getEl(id) {
  if (!elMap.has(id)) elMap.set(id, makeFakeElement());
  return elMap.get(id);
}
const fakeDocument = {
  readyState: 'loading',
  body: makeFakeElement(),
  head: makeFakeElement(),
  documentElement: { style: {} },
  addEventListener() {},
  removeEventListener() {},
  getElementById(id) { return getEl(id); },
  querySelector() { return getEl('main-content'); },
  querySelectorAll() { return []; },
  createElement() { return makeFakeElement(); }
};

function makeStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
    clear: () => { m.clear(); }
  };
}

const fakeSupabaseClient = {
  auth: { getSession: async () => ({ data: { session: null } }) },
  rpc: async () => ({ data: null, error: null }),
  storage: { from: () => ({ upload: async () => ({ data: null, error: null }), getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
  channel: () => ({ on: () => ({ subscribe: () => ({}) }), send: () => {}, removeChannel: () => {} }),
  removeChannel: () => {}
};

globalThis.window = globalThis;
globalThis.addEventListener = function() {};
globalThis.removeEventListener = function() {};
globalThis.dispatchEvent = function() { return false; };
globalThis.document = fakeDocument;
globalThis.localStorage = makeStorage();
globalThis.sessionStorage = makeStorage();
globalThis.supabase = { createClient: () => fakeSupabaseClient };
globalThis.bootstrap = { Modal: class { constructor() {} show() {} hide() {} getInstance() { return null; } } };
globalThis.navigator = {
  userAgent: 'smoke-test',
  serviceWorker: { register: async () => ({}) },
  clipboard: { writeText: async () => {} }
};
globalThis.location = { origin: 'http://localhost', pathname: '/' };
globalThis.fetch = async () => ({ ok: false });
globalThis.Notification = function() {};
globalThis.AudioContext = function() {};
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

// ---------- Urutan load persis index.html ----------
const order = [
  'js/config/constants.js',
  'js/config/app_config.js',
  'js/helpers/data.js',
  'js/helpers/ui.js',
  'js/helpers/pagination.js',
  'js/services/supabase.js',
  'js/services/api.js',
  'js/services/realtime.js',
  'js/app.js',
  'js/auth.js',
  'js/badges.js',
  'js/table.js',
  'js/table_renderer.js',
  'js/settings.js',
  'js/dashboard.js',
  'js/profil.js',
  'js/warga.js',
  'js/iuran.js',
  'js/pengaduan.js',
  'js/tanda_tangan.js',
  'js/surat_templates.js',
  'js/surat.js',
  'js/keuangan.js',
  'js/sumbangan.js',
  'js/aset.js',
  'js/aspirasi.js',
  'js/kelahiran.js',
  'js/kematian.js',
  'js/pindah_masuk.js',
  'js/pindah_keluar.js',
  'js/bansos.js',
  'js/notifikasi.js'
];

const missing = [];
const srcParts = [];
for (const rel of order) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) { missing.push(rel); continue; }
  srcParts.push(`/* ===== ${rel} ===== */\n` + fs.readFileSync(full, 'utf8'));
}
if (missing.length) {
  console.error('FILE HILANG:', missing.join(', '));
  process.exit(1);
}

try {
  vm.runInThisContext(srcParts.join('\n;\n'), { filename: 'app-bundle-smoke.js' });
  console.log('EVAL OK — semua ' + order.length + ' file JS dimuat tanpa error saat load.');
} catch (e) {
  console.error('EVAL ERROR:', e.message);
  if (e.stack) console.error(e.stack.split('\n').slice(0, 8).join('\n'));
  process.exit(1);
}

// ============================================================
// TES RUNTIME — fungsi kunci yang diubah refactor
// ============================================================
(async () => {
  const results = [];
  const check = (name, ok, detail) => {
    results.push((ok ? 'PASS' : 'FAIL') + ' - ' + name + (detail ? ' :: ' + detail : ''));
    if (!ok) process.exitCode = 1;
  };

  // 1) Login RPC path — TANPA perbandingan plaintext. Patch v11: token dibuat
  //    DI SERVER (login_secured); frontend hanya menerima token hasil server.
  window.db = fakeSupabaseClient;

  // 1a) Patch v11: login_secured sukses -> frontend menerima token dari server
  fakeSupabaseClient.rpc = async (fn) => {
    if (fn === 'login_secured') {
      return { data: { status: 'success', token: 'SESS-' + 'a'.repeat(32), role: 'RT', username: 'adminrt', nik: '123', nama: 'Admin RT' }, error: null };
    }
    return { data: null, error: null };
  };
  const loginV11 = await callRpcPost('processLogin', { username: 'adminrt', password: 'admin123' });
  check('Login v11: token sesi dibuat di server, diterima frontend',
    loginV11 && loginV11.status === 'success' && /^SESS-/.test(loginV11.token || ''), JSON.stringify(loginV11));

  // 1b) Fallback DB lama: login_secured belum ada -> verify_user_login (tanpa token)
  fakeSupabaseClient.rpc = async (fn) => {
    if (fn === 'login_secured') return { data: null, error: { message: 'could not find the function public.login_secured' } };
    if (fn === 'verify_user_login') return { data: { status: 'success', role: 'Warga', username: 'warga1' }, error: null };
    return { data: null, error: null };
  };
  const loginOld = await callRpcPost('processLogin', { username: 'warga1', password: 'x' });
  check('Login fallback (DB lama): verify_user_login sukses tanpa token',
    loginOld && loginOld.status === 'success' && !loginOld.token, JSON.stringify(loginOld));

  // 1c) db error -> pesan jelas, tidak crash
  fakeSupabaseClient.rpc = async () => ({ data: null, error: { message: 'koneksi gagal' } });
  const loginErr = await callRpcPost('processLogin', { username: 'adminrt', password: 'admin123' });
  check('Login RPC path tidak crash (db error ditangkap, tanpa fallback plaintext)',
    loginErr && loginErr.status === 'error' && /tidak berjalan|salah/i.test(loginErr.message), JSON.stringify(loginErr));

  // 1d) generateSecureId (patch v12): ID unik kriptografis dengan prefix
  const idA = generateSecureId('PIN');
  const idB = generateSecureId('PIN');
  check('generateSecureId: format prefix-hex & unik',
    /^PIN-[0-9a-f]{16}$/.test(idA) && idA !== idB, idA + ' vs ' + idB);

  // 1e) Notifikasi server-side (patch v12): RPC get_notifications_secured dipakai
  //     bila tersedia (fallback klien hanya bila RPC belum terpasang)
  session.token = 'SESS-tes-notif';
  fakeSupabaseClient.rpc = async (fn) => {
    if (fn === 'get_notifications_secured') {
      return { data: { status: 'success', data: [{ id: 'N1', menu: 'Iuran', pesan: 'Iuran Januari perlu verifikasi', rawDate: '2026-08-01T00:00:00Z' }] }, error: null };
    }
    return { data: null, error: null };
  };
  const notifSrv = await callRpcGet('getNotifications');
  check('getNotifications: pakai RPC server bila tersedia',
    notifSrv && notifSrv.status === 'success' && Array.isArray(notifSrv.data) && notifSrv.data.length === 1 && notifSrv.data[0].menu === 'Iuran', JSON.stringify(notifSrv));
  fakeSupabaseClient.rpc = async (fn) => {
    if (fn === 'get_notifications_secured') return { data: null, error: { message: 'could not find the function public.get_notifications_secured' } };
    return { data: null, error: null };
  };
  const notifOld = await callRpcGet('getNotifications');
  check('getNotifications: fallback klien bila RPC v12 belum ada',
    notifOld && notifOld.status === 'success' && Array.isArray(notifOld.data), JSON.stringify(notifOld).slice(0, 80));

  // 1f) Upload gambar (patch v12): upload_file_secured sukses -> dataURL dipakai
  session.token = 'SESS-tes-upload';
  const dummyImg = 'data:image/jpeg;base64,' + 'AAAA';
  fakeSupabaseClient.rpc = async (fn) => {
    if (fn === 'upload_file_secured') return { data: { status: 'success', message: 'File valid & terverifikasi.' }, error: null };
    return { data: null, error: null };
  };
  const uploaded = await uploadToSupabaseStorage(dummyImg, 'warga');
  check('uploadToSupabaseStorage: RPC v12 sukses -> dataURL dikembalikan',
    uploaded === dummyImg, String(uploaded).slice(0, 60));
  session.token = 'SESS-tes';
  fakeSupabaseClient.rpc = async () => ({ data: null, error: null });

  // 2) canonicalTableHeaders: kolom saldo & created_at TIDAK ikut tampil
  const hdrs = canonicalTableHeaders('Keuangan', { id: 'K-1', tanggal: 'x', pemasukan: 1, pengeluaran: 2, saldo: 3, created_at: 'now' });
  check('canonicalTableHeaders mengecualikan saldo & created_at',
    hdrs.indexOf('saldo') === -1 && hdrs.indexOf('created_at') === -1 && hdrs.indexOf('pemasukan') > -1, JSON.stringify(hdrs));

  // 3) TableRenderer generik: render -> filter -> detail (role RT -> tombol Edit)
  session.role = 'RT';
  const okRender = TableRenderer.render('Kelahiran', {
    headers: ['id', 'nama_bayi', 'tanggal_lahir'],
    rows: [['K-1', 'Bayi Satu', '10/08/2026'], ['K-2', 'Bayi Dua', '11/08/2026']]
  });
  check('TableRenderer.render Kelahiran', okRender === true);
  TableRenderer.filter('Kelahiran');
  const mainHtml = getEl('main-content').innerHTML;
  const tbodyHtml = getEl('table-renderer-body').innerHTML;
  check('TableRenderer.render membuat shell tabel', mainHtml.indexOf('table-renderer-body') > -1);
  check('TableRenderer.filter mengisi baris', tbodyHtml.indexOf('Bayi Satu') > -1 && tbodyHtml.indexOf('Bayi Dua') > -1);
  check('TableRenderer.filter tombol Edit RT default', tbodyHtml.indexOf('bukaModalEdit') > -1);
  check('TableRenderer.addButton hanya untuk RT', mainHtml.indexOf('Tambah Kelahiran Baru') > -1);
  TableRenderer.showDetail('Kelahiran', 'K-1');
  check('TableRenderer.showDetail mengisi judul modal', getEl('table-renderer-detail-title').innerText.indexOf('Rincian Data Kelahiran') > -1);
  check('TableRenderer.showDetail mengisi field', getEl('table-renderer-detail-body').innerHTML.indexOf('Bayi Satu') > -1);
  check('TableRenderer.showDetail modal tampil', getEl('table-renderer-detail-modal').classList.contains('hidden') === false);
  TableRenderer.tutupDetail();
  check('TableRenderer.tutupDetail menyembunyikan modal', getEl('table-renderer-detail-modal').classList.contains('hidden') === true);

  // 4) TableRenderer Pengaduan (role Warga): kolom subset + status badge + aksi WA
  session.role = 'Warga';
  TableRenderer.render('Pengaduan', {
    headers: ['id', 'nama', 'tanggal', 'jenis_aduan', 'status', 'foto_url'],
    rows: [['ADU-1', 'Warga A', '10/08/2026', 'KEBERSIHAN', 'selesai', '-']]
  });
  TableRenderer.filter('Pengaduan');
  const aduanMain = getEl('main-content').innerHTML;
  const aduanBody = getEl('table-renderer-body').innerHTML;
  check('Pengaduan: badge status hijau untuk selesai', aduanBody.indexOf('bg-emerald-100') > -1);
  check('Pengaduan: kolom foto_url tidak tampil sebagai header', aduanMain.indexOf('FOTO_URL') === -1);
  check('Pengaduan: header subset (ID, TANGGAL, NAMA, JENIS_ADUAN, STATUS)',
    aduanMain.indexOf('ID</th>') > -1 && aduanMain.indexOf('JENIS_ADUAN') > -1 && aduanMain.indexOf('STATUS') > -1);
  check('Pengaduan: tombol WA untuk Warga', aduanBody.indexOf("waKirimLaporan('aduan'") > -1);
  check('Pengaduan: tombol Tambah hanya untuk Warga', aduanMain.indexOf('Buat Aduan Baru') > -1);

  // 5) TableRenderer Surat: formatDetailValue JSON
  TableRenderer.render('SuratPengantar', {
    headers: ['id', 'nama', 'keterangan'],
    rows: [['SRT-1', 'Warga B', 'Surat Umum|{"keperluan":"SKCK"}']]
  });
  TableRenderer.showDetail('SuratPengantar', 'SRT-1');
  const suratHtml = getEl('table-renderer-detail-body').innerHTML;
  check('Surat: keterangan JSON diformat', suratHtml.indexOf('KEPERLUAN') > -1 && suratHtml.indexOf('SKCK') > -1);

  // 6) Login tetap RPC-only: tidak ada perbandingan password plaintext di klien
  check('Tidak ada perbandingan password plaintext di klien',
    !String(callRpcPost.toString()).includes('uPass === pClean'));

  // 7) Gate tier (free/premium): helper tersedia & perilaku default premium
  check('isFreeTier() false di dev/premium', isFreeTier() === false);
  check('isMenuAllowed(Bansos) true di dev/premium', isMenuAllowed('Bansos') === true);
  check('isMenuAllowed(Dashboard) true selalu', isMenuAllowed('Dashboard') === true);

  console.log('\n--- HASIL TES RUNTIME ---');
  results.forEach(r => console.log(r));
  process.exit(process.exitCode || 0);
})().catch(e => {
  console.error('RUNTIME TEST ERROR:', e.message);
  if (e.stack) console.error(e.stack.split('\n').slice(0, 8).join('\n'));
  process.exit(1);
});
