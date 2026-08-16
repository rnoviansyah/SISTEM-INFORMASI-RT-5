# PRODUCT KNOWLEDGE — SISTEM INFORMASI RT 5 (SIR5)

> Dokumen ini adalah panduan internal untuk memahami aplikasi secara utuh:
> cara kerjanya, file apa saja yang ada, dan bagaimana semuanya saling terhubung.
>
> **Versi aplikasi: v3.42** (lihat `?v=` di `index.html` & `CACHE_VERSION` di `sw.js`).

---

## 1. Ringkasan Eksekutif

**SIR5 adalah PWA (Progressive Web App) manajemen Rukun Tetangga** berbasis web statis
(vanilla JavaScript, tanpa framework), dengan backend **Supabase (PostgreSQL)** dan model
keamanan **RPC berlapis** yang membuat aplikasi ini berbeda dari kebanyakan aplikasi RT
sejenis di pasaran.

| Aspek | Nilai |
|---|---|
| Bentuk aplikasi | PWA statis — bisa di-install di HP Android/iOS & jalan offline (shell) |
| Frontend | HTML + Tailwind + Bootstrap 5 + Vanilla JS (32 file modul, tanpa build framework) |
| Backend/Database | Supabase (PostgreSQL + RLS + Stored Procedure RPC) |
| Hosting | Hasil build statis — jalan di GitHub Pages, Vercel, Netlify, cPanel, atau hosting mana pun |
| Autentikasi | Custom (bukan Supabase Auth) — token sesi + password hashed **bcrypt**, diverifikasi di RPC |
| Peran | RT (pengelola) & Warga (masyarakat) — satu aplikasi, menu menyesuaikan peran |
| Bahasa | Indonesia |

**Keunggulan utama:** seluruh akses data dari browser lewat **stored procedure
`SECURITY DEFINER`** yang memverifikasi token sesi + peran — browser **tidak pernah**
menyentuh tabel secara langsung, sehingga RLS/aturan keamanan tidak bisa di-bypass lewat
konsol browser.

---

## 2. Arsitektur & Alur Data

```
                         +-----------------------------+
                         |  index.html (satu halaman)  |
                         |  login + app shell + modal  |
                         +--------------+--------------+
                                        |  memuat 32 file JS berurutan (?v=3.32)
                                        v
        +----------+  +---------+  +----------+  +----------+  +-----------+
        | app.js   |  | auth.js |  | badges.js|  | table.js |  | settings.js|
        | (CORE)   |  | login/  |  | badge    |  | dispatcher| | pengaturan |
        | backend, |  | sesi    |  | navbar   |  | form/CRUD | | RT + tema  |
        | helper,  |  | logout  |  | dashboard|  | generik   | | + logo     |
        | notif    |  +---------+  +----------+  +----------+  +-----------+
        | fetch    |       +---------+ modul menu (17) ---------+  +-----------+
        +----------+       | dashboard, profil, warga, iuran,  |  | notifikasi.js |
                           | bansos, keuangan, pengaduan, surat|  | (izin/badge/  |
                           | surat_templates, tanda_tangan,    |  | push/TTD)     |
                           | sumbangan, aspirasi, kelahiran,   |  +-----------+
                           | kematian, pindah_masuk, pindah    |
                           | keluar, aset                      |
                           +----------------+------------------+
                                            | SEMUA akses data lewat:
                                            v
                    safeSupabaseSelect/Insert/Update/Delete (app.js)
                            = db.rpc('generic_*_secured', {...})
                                            |
                                            v
              Supabase: 17 tabel (RLS ON, policy default deny)
                 ▲ hanya bisa lewat 18+ fungsi RPC SECURITY DEFINER
                 │  yang cek token sesi + peran + kepemilikan data
                 └─────────────── get_server_time() = sumber waktu server

     Rendering tabel/list di SEMUA menu memakai helpers/pagination.js
     (25 baris/halaman, kontrol "Halaman 1 2 3…" selalu tampil).
```

**Alur request singkat:**
1. User login → `auth.js` memanggil `verify_user_login()` (RPC, cek **bcrypt**) → token sesi disimpan
   (`localStorage rt_user_session` + tabel `Sessions`).
2. Setiap operasi data → `callRpcGet/callRpcPost` (implementasi aslinya = Supabase RPC) → `safeSupabase*` → `db.rpc(...)`.
3. RPC memvalidasi token → peran (RT/Warga) → izin tabel → **dekripsi kolom sensitif**
   hanya untuk yang berhak → lalu eksekusi SQL.
4. Notifikasi & ringkasan dashboard **dihitung on-the-fly** dari tabel (bukan tabel
   notifikasi terpisah), diurutkan `created_at`/`verified_at` (waktu server).

---

## 3. Peta File

### Root
| File | Isi & Peran |
|---|---|
| `index.html` | Satu-satunya halaman: login, shell aplikasi, sidebar desktop, bottom-nav HP, sheet "Lainnya", semua modal (form, foto, notifikasi, TTD), animasi login "pintu". Library dipakai dari **lokal `vendor/`** (offline-first, v3.37) + 32 script JS + manifest + favicon dinamis |
| `manifest.json` | Manifest PWA dasar — **ditimpa dinamis** oleh `updateDynamicManifest()` (settings.js) agar ikon & nama ikut pengaturan |
| `sw.js` | Service Worker: precache shell (termasuk `vendor/` + `css/dark-mode.css`), cache-first aset statis, network-first navigasi, push notification click handler, pembersihan cache lama |
| `server.js` | Server preview/dev murni Node (tanpa dependency): SPA fallback + endpoint `/api/config` (baca `SUPABASE_URL`/`SUPABASE_KEY` dari env/.env), bind `0.0.0.0` + PORT |
| `scripts/build.js` | Build: menyalin aset ke `dist/` (`js`, `img`, `vendor/`, `css/`) + **menggabung semua 33 file JS lokal menjadi 1 bundle** `js/app.bundle.min.js` (terser; nama fungsi global dipertahankan untuk `onclick`), lalu menulis ulang `dist/index.html` (1 tag script) & `dist/sw.js` (APP_SHELL = bundle + vendor + dark-mode). **Tier build (v3.42):** `npm run build` = premium (semua fitur — yang dijual ke pembeli), `npm run build:free` (`--tier free`) = **free/demo** — 7 modul premium (bansos, keuangan, sumbangan, aset, surat, surat_templates, tanda_tangan) di-EXCLUDE dari bundle + `window.APP_TIER='free'` disuntikkan |
| `scripts/smoke_load_test.js` | Smoke test Node: memuat semua file JS sesuai urutan index.html dalam 1 konteks global (stub DOM/Supabase) untuk menangkap error runtime/deklarasi ganda |
| `schema.sql` | Skema lengkap: 17 tabel + RLS policies + fungsi dasar |
| `security_patch.sql` | Patch keamanan: kolom `created_at` otomatis, fungsi RPC lengkap, backfill, admin RT default |
| `security_patch_v2_verified_at.sql` | Patch v2: kolom `verified_at` + auto-set waktu verifikasi saat status diubah RT |
| `security_patch_v3_storage_cleanup.sql` | Patch v3: hapus file storage (bucket rt-media) via Storage API + pg_net saat data dihapus |
| `security_patch_v4_orphan_cleanup.sql` | Patch v4: bersihkan file storage tidak terpakai (yatim) via Storage API + pg_net |
| `security_patch_v5_usage_stats.sql` | Patch v5: statistik server real (egress, ukuran DB/storage, MAU, realtime, edge function) dari Supabase Management API |
| `security_patch_v6_bcrypt.sql` | Patch v6: password di-hash **bcrypt** (pgcrypto) + trigger + migrasi otomatis |
| `security_patch_v6b_keuangan_saldo.sql` | Patch v6b: hapus kolom `saldo` (Keuangan) → saldo dihitung query agregasi server |
| `security_patch_v6c_fix_login.sql` | Patch v6c (opsional): perbaiki login bcrypt bila `crypt()/gen_salt()` tidak ditemukan (search_path menyertakan `extensions`); idempotent |
| `security_patch_v7_data_encryption.sql` | Patch v7: **enkripsi at-rest** data sensitif (NIK, No. KK, No. HP, TTL) + kolom `nik_sha`/`kk_sha` (SHA-256) untuk pencocokan; RT & pemilik data tetap lihat plaintext |
| `security_patch_v8_server_pagination.sql` | Patch v8 (opsional, sangat disarankan): **pagination server-side** — RPC `get_table_page_secured` (LIMIT/OFFSET + total + pencarian + filter kolom `p_filter`) dengan keamanan identik v7 |
| `security_patch_v9_custom_menu_pagination.sql` | Patch v9 (opsional, sangat disarankan): **pagination server-side untuk menu custom** — 6 RPC bespoke (Warga tabel/rumah + detail rumah, Iuran + agregasi, Bansos + auto-kedaluwarsa server, Keuangan UNION Sumbangan + filter periode, Aset stok/riwayat) |
| `security_patch_v10_warga_view_public.sql` | Patch v10: **akun Warga melihat SEMUA warga/hunian di menu Data Warga** (nama & alamat tampil), info sensitif rumah lain (NIK, No. KK, No. HP, TTL) disensor `***RAHASIA***` — menimpa `generic_select_secured` + RPC Warga v9 dengan versi terbaru; prasyarat v7 |
| `security_patch_v11_server_session.sql` | Patch v11: **token sesi dibuat di SERVER** — RPC `login_secured` (bcrypt + `gen_random_uuid()`) membuat & menyimpan sesi dalam satu transaksi; frontend hanya memakai `token` hasil server (temuan audit); fallback otomatis ke alur lama bila v11 belum dijalankan |
| `security_patch_v12_audit_hardening.sql` | Patch v12 (hasil audit): **storage privat** (bucket rt-media private, hapus anon-upload/read; upload via `upload_file_secured` terautentikasi, gambar disimpan dataURL di kolom DB); **enforce kepemilikan & status di server** (Warga tak bisa set status final / NIK orang lain); **sesi kedaluwarsa 30 hari**; **rate-limit login** (5× gagal → kunci 15 menit); **PK semua tabel**; **notifikasi server-side** (`get_notifications_secured`); `created_at` dipaksa server |
| `security_patch_v13_pending_status.sql` | Patch v13: **status awal kanonik "Belum di verifikasi"** — whitelist status + pemetaan kanonik (sinonim `baru`/`diajukan`/`pending`/`belum diverifikasi` → "Belum di verifikasi", bukan initcap "Belum Di Verifikasi"); default insert Warga untuk Pengaduan/SuratPengantar/Sumbangan = "Belum di verifikasi" (Peminjaman/Iuran tetap "Menunggu Verifikasi", Aspirasi tetap "Baru"); backfill data lama `Baru`/NULL → "Belum di verifikasi"; frontend `normalizeStatusDisplay` menampilkan status lama dengan label kanonik; prasyarat v12 |
| `security_patch_v14_iuran_keuangan.sql` | Patch v14 (2 bug): **tagihan Iuran kini terlihat di akun Warga** — `_row_owner_match` dicocokkan via `nik_sha` (sebelumnya membandingkan NIK ciphertext v7 vs plaintext sehingga selalu gagal); **sumbangan yang di-ACC tidak lagi dobel di Keuangan** — `verifikasiSumbanganRT` berhenti menyalin ke tabel Keuangan (sumber tunggal = UNION v9), `get_keuangan_page_secured` melewati baris UNION yang sudah punya salinan ekuivalen, cleanup hapus salinan Keuangan duplikat lama (hanya yang cocok dengan sumbangan DISETUJUI), `get_keuangan_summary_secured` menyertakan nominal sumbangan disetujui; prasyarat v9/v13 |
| `security_patch_v15_status_keluarga.sql` | Patch v15: **kolom `status_keluarga` di tabel Warga** ("Kepala Keluarga" / "Anggota Keluarga") — menu Warga menampilkan status keluarga di tabel daftar, tab Per Keluarga memakai kolom ini untuk menentukan kepala keluarga (fallback anggota pertama), form Tambah/Edit Warga punya pilihan status keluarga; backfill data lama menandai anggota paling awal per KK sebagai Kepala Keluarga (idempotent); prasyarat v7 |
| `PANDUAN_INSTALASI.md` | Panduan setup lengkap |
| `README.md` | Ringkasan proyek |
| `PRODUCT_KNOWLEDGE.md` | Dokumen ini |

### `js/` — modul frontend (urut load = urutan penting, 32 file)
| File | Isi & Peran |
|---|---|
| `config/constants.js` | Konstanta global (fallback header, daftar jenis surat, dsb.) |
| `config/app_config.js` | Inisialisasi backend: baca `/api/config` → `supabase.createClient(SUPABASE_URL, SUPABASE_KEY)`; tampilkan peringatan bila backend belum dikonfigurasi |
| `helpers/data.js` | Helper data generik + **escape HTML anti-XSS** (`escHtml`/`escHtmlAttr`/`escJsStr`, dimuat PERTAMA, dipakai semua renderer tabel/modal/notifikasi/form) |
| `helpers/ui.js` | Helper UI generik (toast, konfirmasi, format) |
| `helpers/pagination.js` | **Pagination generik** (`Pagination.*`, 25 baris/halaman, kontrol selalu tampil) — dipakai semua tabel/list |
| `services/supabase.js` | `safeSupabaseSelect/Insert/Update/Delete` → `db.rpc('generic_*_secured', ...)` |
| `services/api.js` | `callRpcGet/callRpcPost` — pemetaan aksi aplikasi → RPC Supabase (termasuk login, simpan/update data, verifikasi RT) |
| `services/realtime.js` | Realtime Supabase (postgres_changes): suara + notif native hanya untuk INSERT tabel relevan (Pengaduan, SuratPengantar, Iuran, dll); perubahan lain refresh senyap + debounce; tanpa channel broadcast ping |
| `app.js` (CORE) | Config (env), `initBackendConfig`, helper `safeSupabase*`, `cariNilaiKolom`, `callRpcGet/Post` (termasuk `getNotifications`, `getDashboardSummary`, `getInfoWarga`), notifikasi (fetch/modal/badge aplikasi), navigasi, `applyAppSettingsUI`, PWA register, bootstrap |
| `auth.js` | `doLogin`, `verifySessionToken`, `doLogout`, `checkExistingSession`, `getValidUserRole` |
| `badges.js` | `MENU_BADGE_IDS`, `updateMenuBadges`, `applyMenuBadgeCache` (jumlah belum diverifikasi per menu di navbar + dashboard) |
| `table.js` | Dispatcher `loadMenu` → view per menu / tabel generik; `renderTable` (pagination), `bukaModalForm`, `generateFormInputs` (form dinamis), `submitFormBaru` (insert/update), validasi, filter per menu |
| `table_renderer.js` | Renderer tabel generik (Kelahiran, Kematian, Pengaduan, Pindah, Sumbangan, Surat) dengan pencarian + pagination |
| `settings.js` | Pengaturan aplikasi & panel RT: identitas, tema, logo→favicon, QRIS/rekening, user/sesi, export/cleanup DB, `updateDynamicManifest` |
| `dashboard.js` | Beranda: ringkasan statistik + badge per menu + info warga (collapsible) |
| `profil.js` | Profil & ganti password |
| `warga.js` | Data warga (per rumah/KK + tabel, keduanya pagination **server-side** patch v9 — grup per alamat & pengecualian Kematian di RPC; tampilkan data milik sendiri utk warga) |
| `iuran.js` | Iuran bulanan: input tagihan, verifikasi LUNAS oleh RT, status, QRIS dinamis — pagination **server-side** (patch v9, halaman + agregasi banner) |
| `bansos.js` | Bansos: penyaluran (pilih KK), periode ambil, auto-kedaluwarsa (di server, patch v9), verifikasi diambil, cek NIK (RPC `cek_bansos_public`) |
| `keuangan.js` | Kas/keuangan RT (saldo dari query agregasi server, pagination **server-side** patch v9 — UNION Sumbangan disetujui + filter periode/urutan di server) |
| `pengaduan.js` | Aduan warga + foto + tindak lanjut RT (TableRenderer + pagination) |
| `surat.js` | Surat pengantar: permohonan warga → persetujuan RT + tanda tangan digital |
| `surat_templates.js` | Template dokumen surat |
| `tanda_tangan.js` | Canvas TTD inline (form surat) + modal TTD pemohon (buka/tutup/hapus/konfirmasi) |
| `sumbangan.js` | Donasi: input + verifikasi RT (TableRenderer + pagination) |
| `aspirasi.js` | Aspirasi/masukan (anonim) — pagination **server-side** (patch v8) + pencarian; fallback otomatis ke mode lama bila v8 belum terpasang |
| `aset.js` | Aset/inventaris + peminjaman (tab stok & riwayat, keduanya pagination **server-side** patch v9) |
| `kelahiran.js`, `kematian.js`, `pindah_masuk.js`, `pindah_keluar.js` | Catatan kependudukan (Kematian: dropdown nama dari data Warga) — TableRenderer + pagination |
| `notifikasi.js` | Manajemen notifikasi: izin, push (SW), badge, tandai dibaca, kirim |

### `vendor/` (v3.37)
Library pihak ketiga disalin lokal agar PWA **offline-first & tidak bergantung CDN**: Bootstrap CSS/JS, Bootstrap Icons + font, Tailwind Play CDN, Supabase JS, SheetJS (xlsx), JSZip. Disalin apa adanya ke `dist/` saat build (tidak di-minify ulang).

### `css/`
`dark-mode.css` — palet gelap konsisten untuk SEMUA permukaan (kartu, tabel, modal, form, dropdown, notifikasi) yang aktif otomatis saat tema `dark` dipilih di Pengaturan.

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
   `supabase.from(...)` langsung — mereka memakai `safeSupabase*`/`callRpc*` dari
   `app.js`. Inilah kunci keamanan & konsistensi.
3. **`table.js` adalah dispatcher**: `loadMenu('Warga')` → `warga.js` punya wrapper
   `window.loadMenu` (pola "wrapper loadMenu" dipakai juga oleh kematian/dashboard)
   → jika menu tidak punya view khusus, dipakai tabel generik (`renderTable`) atau
   `TableRenderer` — semuanya lewat `helpers/pagination.js`.
4. **Pagination** (`helpers/pagination.js`, dimuat setelah `helpers/ui.js`):
   - Render halaman: `Pagination.slice(key, rows)` → render baris halaman aktif.
   - Render kontrol: `Pagination.render(el, key, total, cb)` — **selalu tampil**
     (termasuk "Halaman 1" + tombol ‹ › walau data < 25 baris).
   - Saat pencarian/filter berubah → `Pagination.reset(key)` agar kembali ke halaman 1.
   - Cache PWA: setiap rilis wajib menaikkan `?v=` di `index.html` DAN `CACHE_VERSION`
     di `sw.js`.
5. **Badge & notifikasi**: `badges.js` menghitung jumlah per menu (untuk RT = belum
   diverifikasi, untuk warga = milik sendiri), `notifikasi.js` menyediakan push/badge
   aktif, keduanya ditenagai `getNotifications`/query di `app.js` yang membaca tabel
   lewat RPC.
6. **Pengaturan → seluruh aplikasi**: `settings.js` menyimpan identitas/tema/logo ke
   tabel `Pengaturan`; `applyAppSettingsUI()` (app.js) menyebar ke semua layar + favicon
   + manifest PWA.
7. **Waktu**: semua timestamp penting memakai `get_server_time()` (jam server Supabase,
   zona WIB `Asia/Jakarta`), bukan jam perangkat — dipakai notifikasi, kedaluwarsa
   bansos, dan waktu verifikasi.

---

## 5. Model Keamanan

- **RLS aktif di semua tabel + policy di-drop** → default deny.
- **18+ fungsi RPC `SECURITY DEFINER`** adalah satu-satunya jalan akses data; semuanya
  menerima `p_token` dan memvalidasi via `auth_role()`.
- **Pemisahan peran**: warga membaca **semua warga di menu Data Warga** dengan kolom
  sensitif rumah lain disensor `***RAHASIA***` (patch v10, NIK/No. KK/No. HP/TTL);
  mengubah data tetap terbatas — hanya datanya sendiri (dicocokkan NIK/No. KK/nama di
  `_row_owner_match`); tabel sensitif (`Users`, `Sessions`, `Pengaturan`) khusus RT.
- **`_qname()` whitelist tabel** — payload tidak bisa menyuntikkan nama tabel lain.
- **`_normalize_row()`** membuang kolom yang tidak ada di tabel → anti kolom palsu.
- **Password bcrypt** (patch v6/v6c): diverifikasi di sisi server via `_bcrypt_check`
  (tidak pernah dikirim plaintext ke client untuk perbandingan); trigger hash otomatis.
- **Enkripsi at-rest (patch v7)**: kolom sensitif (NIK, No. KK, No. HP, tanggal/tempat
  lahir) disimpan sebagai ciphertext PGP (kunci `data_enc_key` di Vault) + `nik_sha`/
  `kk_sha` untuk pencocokan. Dekripsi hanya di server (RPC) untuk RT & pemilik data;
  baris orang lain tampil `***RAHASIA***`.
- **Escape output anti-XSS (v3.36)**: SEMUA data user yang dirender ke `innerHTML`
  (tabel, kartu, modal detail, notifikasi, dropdown, form) di-escape lewat
  `escHtml`/`escHtmlAttr`/`escJsStr` dari `helpers/data.js` (dimuat pertama) —
  input warga tidak bisa menyuntikkan HTML/script ke halaman RT atau warga lain.
- **Upload wajib file gambar asli (v3.38)**: validasi via **magic bytes**
  (`isValidImageFile` di `helpers/data.js`) — file PDF/DOC/arsip yang di-rename
  jadi `.jpg`/`.png` DITOLAK; hanya JPEG/PNG/WebP/GIF/BMP yang diproses.
  Berlaku di semua jalur upload: form dinamis (foto warga/pengaduan/dll),
  bukti transfer iuran, logo aplikasi, dan tanda tangan digital.
- Kredensial Supabase TIDAK di-hardcode — dari env (`/api/config`), `.env` di-gitignore.

---

## 6. Fitur per Menu

| Menu | RT | Warga |
|---|---|---|
| Dashboard | Statistik + badge yang belum diverifikasi + info warga | Statistik miliknya + info warga |
| Warga | CRUD penuh, tampilan per rumah/KK + tabel (pagination) | Hanya data milik sendiri (keluarga satu KK) |
| Iuran | Input tagihan, verifikasi LUNAS | Bayar & cek status |
| Bansos | Penyaluran + periode ambil + verifikasi | Cek bansos (NIK/KK), status otomatis kedaluwarsa |
| Keuangan | Kas RT (saldo agregasi server) | Lihat ringkasan |
| Pengaduan | Terima + tindak lanjut + foto | Ajukan aduan + status |
| Surat | Setujui + TTD digital | Ajukan + unduh |
| Aset/Inventaris | Kelola stok + setujui peminjaman | Pinjam barang |
| Sumbangan | Verifikasi donasi | Donasi |
| Aspirasi | Baca + respon | Kirim (anonim) |
| Kelahiran/Kematian/Pindah | Input catatan | Info keluarga |
| Notifikasi | Pusat notifikasi, badge per menu, push | Notifikasi status (muncul **setelah diverifikasi RT**) |

**Fitur unggulan lintas menu:** notifikasi real-time WIB, bansos auto-kedaluwarsa,
surat TTD digital, QRIS dinamis/export Excel, PWA installable + offline, tema custom +
mode gelap, favicon ikut logo, badge jumlah belum diverifikasi, **pagination 25 baris/
halaman di semua tabel & list menu** (termasuk pencarian yang ikut pagination).

---

## 7. Setup & Env Vars

1. Buat proyek Supabase → jalankan di SQL Editor, **urut**:
   `schema.sql` → `security_patch.sql` → `security_patch_v2_verified_at.sql` →
   v3 (storage cleanup) → v4 (orphan cleanup) → v5 (usage stats) → v6 (bcrypt) →
   v6b (hapus saldo) → v7 (enkripsi data) → v8 (pagination server-side generik,
   opsional) → v9 (pagination server-side menu custom, opsional) →
   v10 (Warga lihat semua warga + sensor info sensitif; wajib bila akun Warga
   saat ini hanya melihat keluarganya sendiri) → v11 (token sesi dibuat di
   server via `login_secured`; disarankan) → v12 (hardening audit: storage
   privat, enforce kepemilikan/status, expiry sesi, rate-limit login,
   notifikasi server-side; disarankan) → v13 (status awal kanonik
   "Belum di verifikasi" untuk Pengaduan/SuratPengantar/Sumbangan + backfill
   data lama "Baru"; disarankan).
   `security_patch_v6c_fix_login.sql` hanya bila setelah v6 login masih gagal
   (opsional, idempotent).
2. Setup sekali setelah patch: ekstensi `pg_net` + `supabase_vault`; Vault secrets:
   `storage_service_role` (service_role key), `storage_project_url`,
   `supabase_mgmt_pat` (PAT Supabase, opsional slug organisasi), dan
   **`data_enc_key`** (kunci dibuat langsung di SQL Editor: `vault.create_secret(encode(gen_random_bytes(32),'hex'),'data_enc_key')` — **wajib di-backup** salinannya, kalau hilang data terenkripsi tidak bisa dibaca). Detail lengkap: `PANDUAN_INSTALASI.md`.
3. Isi env: `SUPABASE_URL` dan `SUPABASE_KEY` (anon **public** key — bukan
   `service_role`) — di tab API Keys / `.env` untuk dev, dashboard hosting untuk
   produksi. Tanpa ini, halaman login menampilkan peringatan "backend belum dikonfigurasi".
4. Build: `npm run build` → hasil di `dist/` → deploy ke hosting statis mana pun.
5. Login pertama: `adminrt` / `admin123` → segera ganti di menu Pengaturan.

**Catatan database:** patch v2 WAJIB dijalankan agar notifikasi warga menampilkan
jam verifikasi yang benar (kolom `verified_at`). Tanpa patch, aplikasi tetap jalan —
notifikasi hanya muncul setelah diverifikasi, tapi jamnya memakai `created_at`.

---

## 8. Keunggulan Utama

1. **Keamanan RPC berlapis** — akses data hanya lewat RPC yang memvalidasi sesi & peran;
   password bcrypt + enkripsi at-rest NIK/KK (patch v6/v7).
2. **PWA** — install di HP, jalan offline, ikon custom.
3. **Fitur lengkap 13+ menu** — dari surat TTD, bansos, iuran, sampai kependudukan,
   semua dengan pagination.
4. **Waktu server & zona WIB konsisten** — jam/urutan tidak ngaco.
5. **Hasil build statis** — berjalan di hosting statis mana pun.
6. **Setup terpandu** — panduan lengkap + 15 file SQL.
7. **Satu aplikasi dua peran** (RT & warga) dengan badge & notifikasi terpisah.
8. **Bundle build 1 file** — 32 file JS digabung jadi `app.bundle.min.js` saat build (1 request HTTP, lebih cepat di HP/4G); pengembangan tetap modular di `js/`.
9. **UI ramah lansia** — teks kecil di-bump, quick action mobile 3 kolom (tap target besar), form 2 kolom di desktop.
10. **Offline-first (v3.37)** — semua library (Bootstrap, Tailwind, Supabase, xlsx, JSZip, ikon) disalin ke `vendor/` & di-cache PWA; aplikasi tidak mati walau CDN down.
11. **Dark mode konsisten (v3.37)** — palet gelap diterapkan ke seluruh permukaan UI (tidak hanya shell), via `css/dark-mode.css` + `body.theme-dark`.
12. **Form Warga ringkas (v3.37, disempurnakan v3.39)** — 14+ field dikelompokkan dalam seksi collapsible (Data Pribadi / Alamat & Keluarga / Kontak & Foto) — tidak scroll panjang di HP. v3.39 memperbaiki pengelompokan: field dikumpulkan dulu per grup lalu dirender urut tetap (kolom Warga selang-seling sebelumnya membuat grup "Data Pribadi" berulang 4x dengan isi cuma sisa field); kini tiap grup muncul SEKALI berisi semua field-nya.
13. **Dua tier dari satu codebase (v3.42)** — model jual source code: `npm run build` = **premium** (semua fitur, tanpa gate — yang diserahkan ke pembeli), `npm run build:free` = **free/demo** (7 modul premium — bansos, keuangan, sumbangan, aset, surat, surat_templates, tanda_tangan — TIDAK disertakan di bundle; `window.APP_TIER='free'` disuntikkan build; UI menyembunyikan pintu masuk menu premium via `applyTierUI`). `loadMenu` memblokir akses langsung ke menu premium di build free dengan toast; helper tier ada di `js/config/constants.js` (`isFreeTier`, `isMenuAllowed`). **Folder `free version/` (v3.42)** — salinan source code free yang berdiri sendiri untuk dibagikan ke publik: 7 modul premium dihapus dari `js/`, script & pintu menu premium dihapus dari `index.html`, `window.APP_TIER='free'` disuntik via `<script>` inline (bukan build), plus `package.json` + `README.md` sendiri. Sinkronisasi: salin ulang dari root lalu ulangi pemangkasan.

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
- **Pagination server-side penuh (patch v8 + v9)**: SEMUA menu list kini — ⚠️ **Bila pagination server-side tidak aktif di DB lama**: versi awal patch v8/v9 merujuk kolom SRF dengan nama salah (`select x from jsonb_array_elements(...)` padahal kolomnya `value`) sehingga RPC gagal saat runtime (`column "x" does not exist`) dan aplikasi diam-diam memakai fallback mode lama. Jalankan ulang `security_patch_v8_server_pagination.sql` + `security_patch_v9_custom_menu_pagination.sql` (+ v10) versi terbaru (sudah diperbaiki, idempotent) untuk mengaktifkannya.
  mengunduh hanya 25 baris per halaman dari server (LIMIT/OFFSET di RPC) —
  generik (Kelahiran, Kematian, Pindah, Pengaduan, Sumbangan, Surat, Aspirasi)
  lewat `get_table_page_secured` (v8, pencarian + filter kolom `p_filter`), dan
  custom (Warga, Iuran, Bansos, Keuangan, Aset) lewat 6 RPC bespoke (v9): Warga
  (tabel & grup per rumah + pengecualian Kematian + detail penghuni alamat),
  Iuran (halaman + agregasi lunas/menunggu/belum), Bansos (auto-kedaluwarsa
  dijalankan DI SERVER pakai jam server + hitungan status header), Keuangan
  (UNION Keuangan + Sumbangan disetujui, filter periode hari/bulan/tahun/custom,
  urutan terbaru/terlama, ringkasan kas), Aset (tab stok & riwayat). Pencarian &
  filter berjalan di server SETELAH filter izin/dekripsi (aman, kolom terenkripsi
  ikut dicari). Bila patch v8/v9 belum dijalankan, menu otomatis fallback ke mode
  lama (fetch semua + slice klien) — tidak pernah rusak.
- **Enkripsi v7**: kunci `data_enc_key` dibuat & disimpan di Vault Supabase (SQL Editor),
  tapi salinannya wajib di-backup di luar Supabase — jika database dihapus atau kunci hilang,
  seluruh data terenkripsi (NIK/KK/HP/TTL) tidak dapat dibaca.
- Service worker aktif (PWA); pastikan setiap rilis menaikkan `?v=` di `index.html`
  DAN `CACHE_VERSION` di `sw.js` agar cache pengguna selalu segar.

---

## 10. Reward & Kontak

Apabila aplikasi ini bermanfaat, Anda dapat memberikan reward/support ke:

- **Reward (DANA)**: 08973366667 a.n. **Rizky Noviansyah**
- **WhatsApp**: 08973366667

Untuk pertanyaan, kendala, atau permintaan penyesuaian fitur, hubungi via WhatsApp di atas.
