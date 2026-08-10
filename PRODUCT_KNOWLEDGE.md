# PRODUCT KNOWLEDGE — SISTEM INFORMASI RT 5 (SIR5)

> Dokumen ini adalah panduan internal untuk memahami aplikasi secara utuh:
> apa yang dijual, bagaimana cara kerjanya, file apa saja yang ada, dan bagaimana
> semuanya saling terhubung. Dibuat untuk persiapan penjualan & serah terima.

---

## 1. Ringkasan Eksekutif

**SIR5 adalah PWA (Progressive Web App) manajemen Rukun Tetangga** berbasis web statis
(vanilla JavaScript, tanpa framework), dengan backend **Supabase (PostgreSQL)** dan model
keamanan **RPC berlapis** yang membuat aplikasi ini berbeda dari kebanyakan aplikasi RT
sejenis di pasaran.

| Aspek | Nilai |
|---|---|
| Bentuk aplikasi | PWA statis — bisa di-install di HP Android/iOS & jalan offline (shell) |
| Frontend | HTML + Tailwind + Bootstrap 5 + Vanilla JS (23 modul, tanpa build framework) |
| Backend/Database | Supabase (PostgreSQL + RLS + Stored Procedure RPC) |
| Hosting | Hasil build statis — jalan di GitHub Pages, Vercel, Netlify, cPanel, atau hosting mana pun |
| Autentikasi | Custom (bukan Supabase Auth) — token sesi + password hashed, diverifikasi di RPC |
| Peran | RT (pengelola) & Warga (masyarakat) — satu aplikasi, menu menyesuaikan peran |
| Bahasa | Indonesia |

**Nilai jual utama (#1):** seluruh akses data dari browser lewat **stored procedure
`SECURITY DEFINER`** yang memverifikasi token sesi + peran — klien (browser) **tidak pernah**
menyentuh tabel secara langsung, sehingga RLS/aturan keamanan tidak bisa di-bypass lewat
konsol browser. Ini jarang ada di aplikasi RT sejenis dan sangat meyakinkan untuk klien.

---

## 2. Arsitektur & Alur Data

```
                         +-----------------------------+
                         |  index.html (satu halaman)  |
                         |  login + app shell + modal  |
                         +--------------+--------------+
                                        |  memuat 23 file JS berurutan (?v=3.14)
                                        v
        +----------+  +---------+  +----------+  +----------+  +-----------+
        | app.js   |  | auth.js |  | badges.js|  | table.js |  | settings.js|
        | (CORE)   |  | login/  |  | badge    |  | dispatcher| | pengaturan |
        | backend, |  | sesi    |  | navbar   |  | form/CRUD | | RT + tema  |
        | helper,  |  | logout  |  | dashboard|  | generik   | | + logo     |
        | notif    |  +---------+  +----------+  +----------+  +-----------+
        | fetch    |       +---------+ 13 modul menu ---------+  +-----------+
        +----------+       | dashboard, profil, warga, iuran,  |  | notifikasi.js |
                           | bansos, keuangan, pengaduan, surat|  | (izim/badge/ |
                           | surat_templates, tanda_tangan,    |  | push/TTD)   |
                           | sumbangan, aspirasi, kelahiran,   |  +-----------+
                           | kematian, pindah_masuk, pindah    |
                           | keluar                            |
                           +----------------+------------------+
                                            | SEMUA akses data lewat:
                                            v
                    safeSupabaseSelect/Insert/Update/Delete (app.js)
                            = db.rpc('generic_*_secured', {...})
                                            |
                                            v
              Supabase: 17 tabel (RLS ON, policy default deny)
                 ▲ hanya bisa lewat 18 fungsi RPC SECURITY DEFINER
                 │  yang cek token sesi + peran + kepemilikan data
                 └─────────────── get_server_time() = sumber waktu server
```

**Alur request singkat:**
1. User login → `auth.js` memanggil `verify_user_login()` (RPC) → token sesi disimpan
   (`localStorage rt_user_session` + tabel `Sessions`).
2. Setiap operasi data → `callGASGet/callGASPost` (nama peninggalan "Google Apps
   Script", implementasi aslinya = Supabase RPC) → `safeSupabase*` → `db.rpc(...)`.
3. RPC memvalidasi token → peran (RT/Warga) → izin tabel → lalu eksekusi SQL.
4. Notifikasi & ringkasan dashboard **dihitung on-the-fly** dari tabel (bukan tabel
   notifikasi terpisah), diurutkan `created_at`/`verified_at` (waktu server).

---

## 3. Peta File

### Root
| File | Isi & Peran |
|---|---|
| `index.html` | Satu-satunya halaman: login, shell aplikasi, sidebar desktop, bottom-nav HP, sheet "Lainnya", semua modal (form, foto, notifikasi, TTD), animasi login "pintu". Memuat CDN (Bootstrap, Tailwind, Supabase JS, xlsx) + 23 script JS + manifest + favicon dinamis |
| `manifest.json` | Manifest PWA dasar — **ditimpa dinamis** oleh `updateDynamicManifest()` (settings.js) agar ikon & nama ikut pengaturan |
| `sw.js` | Service Worker: precache shell, cache-first aset statis, network-first navigasi, push notification click handler, pembersihan cache lama (`kahfi-v4`) |
| `server.js` | Server preview/dev murni Node (tanpa dependency): SPA fallback + endpoint `/api/config` |
| `scripts/build.js` | Build: menyalin aset + **minify semua file `js/`** ke `dist/` (24 file) |
| `schema.sql` | Skema lengkap: 17 tabel + RLS policies + fungsi dasar |
| `security_patch.sql` | Patch keamanan: kolom `created_at` otomatis, fungsi RPC lengkap, backfill, admin RT default |
| `security_patch_v2_verified_at.sql` | Patch v2: kolom `verified_at` + auto-set waktu verifikasi saat status diubah RT |
| `PANDUAN_INSTALASI.md` | Panduan setup untuk pengguna/klien (5 menit) |
| `README.md` | Ringkasan proyek |
| `PRODUCT_KNOWLEDGE.md` | Dokumen ini |

### `js/` — modul frontend (urut load = urutan penting)
| File | Isi |
|---|---|
| `app.js` (CORE) | Config (env), `initBackendConfig`, helper `safeSupabase*`, `cariNilaiKolom`, `callGASGet/Post` (termasuk `getNotifications`, `getDashboardSummary`, `getInfoWarga`), notifikasi (fetch/modal/badge aplikasi), navigasi, `applyAppSettingsUI`, PWA register, bootstrap |
| `auth.js` | `doLogin`, `verifySessionToken`, `doLogout`, `checkExistingSession`, `getValidUserRole` |
| `badges.js` | `MENU_BADGE_IDS`, `updateMenuBadges`, `applyMenuBadgeCache` (jumlah belum diverifikasi per menu di navbar + dashboard) |
| `table.js` | Dispatcher `loadMenu` → view per menu / tabel generik; `renderTable`, `bukaModalForm`, `generateFormInputs` (form dinamis + dropdown warga untuk Kematian), `submitFormBaru` (insert/update), validasi, filter |
| `settings.js` | Pengaturan aplikasi & panel RT: identitas, tema, logo→favicon, user/sesi, export/cleanup DB, `updateDynamicManifest` |
| `dashboard.js` | Beranda: ringkasan statistik + badge per menu + info warga (collapsible) |
| `profil.js` | Profil & ganti password |
| `warga.js` | Data warga (per rumah/KK, tampilkan data milik sendiri utk warga; warga meninggal otomatis tersembunyi) |
| `iuran.js` | Iuran bulanan: input, verifikasi LUNAS oleh RT, status |
| `bansos.js` | Bansos: penyaluran (pilih KK), periode ambil, auto-kedaluwarsa (jam server), verifikasi diambil, cek NIK |
| `keuangan.js` | Kas/keuangan RT |
| `pengaduan.js` | Aduan warga + foto + tindak lanjut RT |
| `surat.js` | Surat pengantar: permohonan warga → persetujuan RT + tanda tangan digital |
| `surat_templates.js` | Template dokumen surat |
| `tanda_tangan.js` | Canvas TTD inline (form surat) + modal TTD pemohon (buka/tutup/hapus/konfirmasi) |
| `sumbangan.js` | Donasi: input + verifikasi RT |
| `aspirasi.js` | Aspirasi/masukan (anonim) |
| `kelahiran.js`, `kematian.js`, `pindah_masuk.js`, `pindah_keluar.js` | Catatan kependudukan (Kematian: dropdown nama dari data Warga) |
| `notifikasi.js` | Versi AKTIF manajemen notifikasi: izin, push (SW), badge, tandai dibaca, kirim |

### `img/`
Logo aplikasi (`logo.webp`/`logo.jpg`) — sumber favicon & ikon PWA (ikut pengaturan).

### `api/`
`config.js` — endpoint server-side yang membuka `SUPABASE_URL`/`SUPABASE_KEY` dari env
(dipakai saat di-hosting di Vercel; di preview dipakai `server.js`).

---

## 4. Bagaimana File Saling Terhubung

1. **`index.html` memuat semua modul secara berurutan** — urutan itu wajib: `app.js`
   (core/global) → `auth.js` → `badges.js` → `table.js` → `settings.js` → modul menu
   → `notifikasi.js` di akhir. Fungsi antar-modul dipanggil sebagai global (classic
   script), jadi yang dimuat belakangan menimpa yang sama namanya.
2. **Semua akses DB lewat `app.js`**: modul menu TIDAK pernah memanggil
   `supabase.from(...)` langsung — mereka memakai `safeSupabase*`/`callGAS*` dari
   `app.js`. Inilah kunci keamanan & konsistensi.
3. **`table.js` adalah dispatcher**: `loadMenu('Warga')` → `warga.js` punya wrapper
   `window.loadMenu` (pola "wrapper loadMenu" dipakai juga oleh kematian/dashboard)
   → jika menu tidak punya view khusus, dipakai tabel generik + `renderTable`.
4. **Badge & notifikasi**: `badges.js` menghitung jumlah per menu (untuk RT = belum
   diverifikasi, untuk warga = milik sendiri), `notifikasi.js` menyediakan push/badge
   aktif, keduanya ditenagai `getNotifications`/query di `app.js` yang membaca tabel
   lewat RPC.
5. **Pengaturan → seluruh aplikasi**: `settings.js` menyimpan identitas/tema/logo ke
   tabel `Pengaturan`; `applyAppSettingsUI()` (app.js) menyebar ke semua layar + favicon
   + manifest PWA.
6. **Waktu**: semua timestamp penting memakai `get_server_time()` (jam server Supabase,
   zona WIB `Asia/Jakarta`), bukan jam perangkat — dipakai notifikasi, kedaluwarsa
   bansos, dan waktu verifikasi.

---

## 5. Model Keamanan (Nilai Jual #1)

- **RLS aktif di semua tabel + policy di-drop** → default deny.
- **18 fungsi RPC `SECURITY DEFINER`** adalah satu-satunya jalan akses data; semuanya
  menerima `p_token` dan memvalidasi via `auth_role()`.
- **Pemisahan peran**: warga hanya bisa membaca/mengubah **datanya sendiri** (dicocokkan
  NIK/No. KK/nama di `_row_owner_match`); tabel sensitif (`Users`, `Sessions`, `Warga`,
  `Pengaturan`) khusus RT.
- **`_qname()` whitelist tabel** — payload tidak bisa menyuntikkan nama tabel lain.
- **`_normalize_row()`** membuang kolom yang tidak ada di tabel → anti kolom palsu.
- **Password** diverifikasi di sisi server (tidak pernah dikirim plaintext ke client
  untuk perbandingan).
- Kredensial Supabase TIDAK di-hardcode — dari env (`/api/config`), `.env` di-gitignore.

---

## 6. Fitur per Menu (untuk Pitching)

| Menu | RT | Warga |
|---|---|---|
| Dashboard | Statistik + badge yang belum diverifikasi + info warga | Statistik miliknya + info warga |
| Warga | CRUD penuh, tampilan per rumah/KK | Hanya data milik sendiri (keluarga satu KK) |
| Iuran | Input tagihan, verifikasi LUNAS | Bayar & cek status |
| Bansos | Penyaluran + periode ambil + verifikasi | Cek bansos (NIK/KK), status otomatis kedaluwarsa |
| Keuangan | Kas RT | Lihat ringkasan |
| Pengaduan | Terima + tindak lanjut + foto | Ajukan aduan + status |
| Surat | Setujui + TTD digital | Ajukan + unduh |
| Aset/Inventaris | Kelola + setujui peminjaman | Pinjam barang |
| Sumbangan | Verifikasi donasi | Donasi |
| Aspirasi | Baca + respon | Kirim (anonim) |
| Kelahiran/Kematian/Pindah | Input catatan | Info keluarga |
| Notifikasi | Pusat notifikasi, badge per menu, push | Notifikasi status (muncul **setelah diverifikasi RT**) |

**Fitur unggulan lintas menu:** notifikasi real-time WIB, bansos auto-kedaluwarsa,
surat TTD digital, QRIS/export Excel, PWA installable + offline, tema custom + mode
gelap, favicon ikut logo, badge jumlah belum diverifikasi.

---

## 7. Setup & Env Vars (untuk serah terima)

1. Buat proyek Supabase → jalankan `schema.sql`, `security_patch.sql`, lalu
   `security_patch_v2_verified_at.sql` di SQL Editor (tab baru, kosong, sekali jalan).
2. Isi env: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (di `.env` untuk dev / dashboard
   hosting untuk produksi). Detail lengkap: `PANDUAN_INSTALASI.md`.
3. Build: `npm run build` → hasil di `dist/` → deploy ke hosting statis mana pun.

**Catatan database:** patch v2 WAJIB dijalankan agar notifikasi warga menampilkan
jam verifikasi yang benar (kolom `verified_at`). Tanpa patch, aplikasi tetap jalan —
notifikasi hanya muncul setelah diverifikasi, tapi jamnya memakai `created_at`.

---

## 8. Nilai Jual / Selling Points (ringkas untuk promosi)

1. **Keamanan RPC berlapis** — klien tidak bisa akses DB langsung (langka di aplikasi RT).
2. **PWA** — install di HP, jalan offline, ikon custom.
3. **Fitur lengkap 13+ menu** — dari surat TTD, bansos, iuran, sampai kependudukan.
4. **Waktu server & zona WIB konsisten** — jam/urutan tidak ngaco.
5. **Tanpa biaya lisensi** — hasil build statis murah di hosting mana pun.
6. **Setup 5 menit** via panduan + 3 file SQL.
7. **Satu aplikasi dua peran** (RT & warga) dengan badge & notifikasi terpisah.

---

## 9. Batasan & Catatan Jujur

- **Data lama** yang diverifikasi sebelum patch v2 memakai `created_at` sebagai perkiraan
  waktu verifikasi (waktu asli tidak tersimpan).
- **Aspirasi anonim** — notifikasi warga dicocokkan via nama, sehingga jarang muncul
  untuk warga (sengaja, karena anonim).
- **TTD modal** tersedia (`bukaModalTandaTangan`) — alur surat saat ini memakai TTD
  inline di form.
- **Notifikasi berbasis on-the-fly** (dihitung dari tabel saat dibuka), bukan tabel
  notifikasi terpisah — konsekuensinya "tandai dibaca" bersifat lokal per perangkat.
- Service worker aktif (PWA); pastikan setiap rilis menaikkan `?v=` di `index.html`
  DAN `CACHE_VERSION` di `sw.js` agar cache pengguna selalu segar.
