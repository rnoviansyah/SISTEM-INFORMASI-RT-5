# 📖 PANDUAN INSTALASI & SETUP LENGKAP
## SISTEM INFORMASI PERUMAHAN & RT MODERN (PWA)

Panduan ini berisi langkah-langkah instalasi dan setup awal sistem.

---

## 🗂️ STRUKTUR PROYEK

```
index.html, manifest.json, sw.js    → App shell (PWA, satu halaman)
js/                                 → Modul aplikasi (17+ file JavaScript)
server.js                           → Server preview/dev (Node murni, tanpa dependency)
scripts/build.js                    → Build: salin ke dist/ + MINIFY otomatis (terser)
api/config.js                       → Endpoint konfigurasi untuk hosting Vercel
schema.sql                          → Skema lengkap 17 tabel + RLS + RPC (wajib dijalankan)
security_patch.sql                  → Patch keamanan: kolom created_at + fungsi RPC + admin default (wajib)
security_patch_v2_verified_at.sql   → Patch v2: kolom verified_at = waktu RT memverifikasi (wajib)
security_patch_v3_storage_cleanup.sql → Patch v3: hapus file storage via Storage API saat data dihapus (wajib)
security_patch_v4_orphan_cleanup.sql → Patch v4: bersihkan file storage tidak terpakai (yatim) via Storage API (wajib)
security_patch_v5_usage_stats.sql   → Patch v5: statistik server real (egress, ukuran DB/storage, MAU, realtime, edge function) dari Supabase Management API (wajib)
security_patch_v6_bcrypt.sql        → Patch v6: bcrypt untuk login & register (password tidak pernah disimpan plaintext) (wajib)
security_patch_v6b_keuangan_saldo.sql → Patch v6b: hapus kolom saldo (Keuangan) → saldo dihitung query agregasi server (wajib)
security_patch_v6c_fix_login.sql    → Patch v6c: perbaikan login bcrypt — hanya dijalankan bila login gagal setelah v6 (opsional)
security_patch_v7_data_encryption.sql → Patch v7: ENKRIPSI data sensitif at-rest (NIK, No. KK, No. HP, tanggal/tempat lahir) + pencocokan lewat nik_sha/kk_sha; RT & pemilik data tetap lihat plaintext di UI, database yang bocor hanya berisi ciphertext (wajib)
security_patch_v8_server_pagination.sql → Patch v8: pagination server-side (LIMIT/OFFSET + total + pencarian + filter kolom di RPC) — menu data hanya mengunduh 1 halaman; opsional tapi sangat disarankan
security_patch_v9_custom_menu_pagination.sql → Patch v9: pagination server-side untuk MENU CUSTOM (Warga, Iuran, Bansos, Keuangan, Aset) via 6 RPC bespoke (grup per rumah, agregasi iuran/keuangan, auto-kedaluwarsa bansos di server, tab stok/riwayat aset) — keamanan identik v7; opsional tapi sangat disarankan
security_patch_v10_warga_view_public.sql → Patch v10: akun WARGA melihat SEMUA warga/hunian di menu Data Warga (nama & alamat tampil) dengan info sensitif (NIK, No. KK, No. HP, TTL) rumah lain disensor `***RAHASIA***`; menimpa `generic_select_secured` + RPC Warga v9 dengan versi terbaru — wajib dijalankan bila akun Warga hanya melihat keluarganya sendiri; prasyarat v7
package.json                        → Script: dev / start / build
free version/                       → Salinan source code VERSI FREE (demo) — modul premium (Bansos, Keuangan, Sumbangan, Aset, Surat Pengantar, tanda tangan digital) dihapus + menu-nya disembunyikan; folder inilah yang dibagikan ke publik
```

> ⚠️ **PENTING:** Tidak ada kredensial (URL/key Supabase) yang di-*hardcode* di dalam kode.
> Aplikasi membaca konfigurasi dari **environment variable** melalui endpoint `/api/config`
> (disediakan oleh `server.js` saat preview, atau `api/config.js` saat di-deploy ke Vercel).

---

## 🛠️ PERSYARATAN (PREREQUISITES)

1. **Database Backend**: Akun Supabase (Gratis di [supabase.com](https://supabase.com))
2. **Node.js ≥ 16** (hanya untuk preview & build — hasil akhirnya 100% file statis)
3. **Hosting Frontend**: Freebuff / GitHub Pages / Vercel / Netlify / cPanel Hosting

---

## 🚀 LANGKAH 1: SETUP DATABASE SUPABASE

1. **Buat Project Baru di Supabase**:
   - Login ke [supabase.com](https://supabase.com) > Klik **New Project**.
   - Isi Nama Project, Password Database, dan pilih region terdekat (Singapore).
   - Tunggu hingga project selesai dibuat.

2. **Jalankan Database (15 file SQL, urut)**:
   - Di dashboard Supabase, buka menu **SQL Editor** (icon `>_` di sidebar kiri).
   - Untuk tiap file: klik **New Query** (pastikan area editor **kosong**), paste **seluruh isi file**, lalu klik **Run**. Urutannya:
     1. `schema.sql` → 17 tabel + RLS + fungsi dasar.
     2. `security_patch.sql` → kolom `created_at` (waktu server), fungsi RPC lengkap, akun admin `adminrt`, `get_server_time()`.
     3. `security_patch_v2_verified_at.sql` → kolom `verified_at` = waktu RT memverifikasi/mengubah status (dipakai jam notifikasi warga).
     4. `security_patch_v3_storage_cleanup.sql` → RPC hapus file storage (bucket rt-media) otomatis saat data dihapus/dibersihkan — kuota storage tidak menumpuk sampah.
     5. `security_patch_v4_orphan_cleanup.sql` → RPC bersihkan file storage tidak terpakai: memindai seluruh bucket rt-media & menghapus file yang tidak dirujuk data (sampah lama, file uji coba) — kuota benar-benar pulih.
     6. `security_patch_v5_usage_stats.sql` → RPC statistik server real (egress, ukuran DB/storage, MAU, realtime, edge function) diambil langsung dari Supabase Management API — angka di menu Pengaturan → Database Settings & Server Stats bukan lagi placeholder.
     7. `security_patch_v6_bcrypt.sql` → semua password (admin & warga) di-hash **bcrypt** (pgcrypto). Login diverifikasi lewat RPC `verify_user_login` dengan bcrypt; password lama (plaintext) di-migrasi otomatis; setiap register/reset/edit password di-hash trigger database. **Password login tidak berubah.**
     8. `security_patch_v6b_keuangan_saldo.sql` → kolom `saldo` di tabel Keuangan **dihapus** (data turunan yang selama ini salah/0). Saldo kini dihitung on-demand lewat query agregasi server `get_keuangan_summary_secured` (SUM pemasukan − SUM pengeluaran).
     9. `security_patch_v7_data_encryption.sql` → **enkripsi at-rest** untuk data sensitif (NIK, No. KK, No. HP, tanggal & tempat lahir) di SEMUA tabel (Warga, Users, Iuran, Bansos, Pengaduan, SuratPengantar, Peminjaman, Sumbangan, Kematian, PindahMasuk, PindahKeluar, Sessions). Data tersimpan sebagai ciphertext (PGP simetris) + kolom `nik_sha`/`kk_sha` (SHA-256) untuk pencocokan. **RT dan pemilik data/anggota keluarga tetap melihat plaintext di UI** (dekripsi di server, peran & kepemilikan diperiksa di RPC); baris orang lain tetap `***RAHASIA***`. Data lama dienkripsi otomatis (idempotent), login pakai NIK tetap jalan lewat `nik_sha`, dan pencarian bansos lewat RPC server (`cek_bansos_public`) sehingga NIK tidak pernah dikirim/tampil.
     10. `security_patch_v6c_fix_login.sql` → Patch v6c: perbaikan login bcrypt (error `crypt`/`gen_salt` tidak ditemukan di Supabase) — **opsional**, hanya dijalankan bila login masih gagal setelah patch v6; idempotent, aman dijalankan kapan pun.
     11. `security_patch_v8_server_pagination.sql` → Patch v8: **pagination server-side** — RPC `get_table_page_secured` (LIMIT/OFFSET + total + pencarian + filter kolom `p_filter`) sehingga menu data hanya mengunduh 1 halaman (25 baris), bukan semua ribuan baris. **Opsional tapi sangat disarankan** untuk performa saat data besar; aman dijalankan kapan pun — aplikasi otomatis kembali ke mode lama bila file ini belum dijalankan.
     12. `security_patch_v9_custom_menu_pagination.sql` → Patch v9: **pagination server-side untuk menu custom** — 6 RPC bespoke: `get_warga_page_secured` (tabel & grup per rumah, pengecualian warga meninggal), `get_warga_rumah_detail_secured` (penghuni satu alamat), `get_iuran_page_secured` (halaman + agregasi lunas/menunggu/belum), `get_bansos_page_secured` (auto-"Kedaluwarsa" dijalankan di server pakai jam server + hitungan status), `get_keuangan_page_secured` (UNION Keuangan + Sumbangan disetujui, filter periode & urutan + ringkasan kas), `get_aset_page_secured` (tab stok & riwayat). Keamanan identik v7 (sesi, peran, dekripsi, sensor warga). **Opsional tapi sangat disarankan**; aman dijalankan ulang — aplikasi otomatis kembali ke mode lama bila file ini belum dijalankan.
     13. `security_patch_v10_warga_view_public.sql` → Patch v10: **Warga lihat SEMUA warga di menu Data Warga, info sensitif disensor** — menimpa `generic_select_secured`, `get_warga_page_secured`, & `get_warga_rumah_detail_secured` dengan versi terbaru: akun Warga melihat semua hunian/warga (nama & alamat tampil), sedangkan NIK, No. KK, No. HP, tanggal & tempat lahir milik rumah lain menjadi `***RAHASIA***` (RT & pemilik data tetap lengkap). **Wajib dijalankan bila akun Warga saat ini hanya melihat keluarganya sendiri.** Idempotent, aman dijalankan ulang; prasyarat patch v7.
     14. `security_patch_v11_server_session.sql` → Patch v11: **token sesi dibuat DI SERVER** — RPC `login_secured` memverifikasi kredensial (bcrypt) lalu membuat token `SESS-`+hex `gen_random_uuid()` (acak kriptografis PostgreSQL, bukan `Math.random()` browser) dan menyimpan sesi dalam satu transaksi; frontend tinggal memakai `token` hasil kembalian. **Disarankan dijalankan** (temuan audit); idempotent, aman dijalankan ulang; prasyarat v6/v7. Bila belum dijalankan, aplikasi otomatis kembali ke alur lama (token dibuat klien).
     15. `security_patch_v12_audit_hardening.sql` → Patch v12 (**disarankan, hasil audit**): bucket storage `rt-media` jadi **PRIVAT** (hapus baca-publik & upload-anonim; upload baru via RPC `upload_file_secured` — validasi sesi + magic bytes + ukuran, gambar disimpan sebagai dataURL di kolom DB); **enforce kepemilikan & status di server** (Warga tidak bisa set status LUNAS/Disetujui/Ditolak atau atas nama NIK orang lain — dipaksa nik sesi & status awal; RT tidak terpengaruh); **sesi kedaluwarsa 30 hari** (`expires_at`, `auth_role` menolak & membersihkan sesi lama); **rate-limit login** (5 gagal → kunci 15 menit); **PRIMARY KEY semua tabel** (id); **notifikasi server-side** (`get_notifications_secured` — tidak lagi mengunduh semua baris 11 tabel); `created_at` dipaksa `now()` di server. Idempotent, aman dijalankan ulang; prasyarat v7/v10/v11.
   - ⚠️ **PENTING — jalankan ulang v8 + v9 + v10 bila pagination server-side tidak aktif**: versi awal patch v8 & v9 memuat RPC dengan referensi kolom salah (`select x from jsonb_array_elements(...)` — kolom hasil SRF bernama `value`, bukan `x`) sehingga semua RPC pagination (v8 generik + v9 custom: Warga, Iuran, Bansos, Keuangan, Aset) gagal saat runtime dengan error `column "x" does not exist`. Aplikasi tetap berjalan (fallback otomatis ke mode lama), tapi tidak pernah benar-benar memakai pagination server-side. File v8/v9/v10 di repo sudah DIPERBAIKI (kolom dirujuk sebagai `value`/alias yang benar) — jalankan ulang ketiganya di SQL Editor (idempotent) untuk mengaktifkan pagination server-side.
   - ⚠️ **SETUP SEKALI setelah ketigabelas file SQL**: (1) aktifkan ekstensi `create extension if not exists pg_net;` dan `create extension if not exists supabase_vault;`; (2) simpan **service_role key** (Supabase → Settings → API) ke Vault: `select vault.create_secret('<KEY_ANDA>', 'storage_service_role');`; (3) simpan **Project URL** ke Vault: `select vault.create_secret('https://<REF>.supabase.co', 'storage_project_url');`; (4) buat **Personal Access Token (PAT)** (supabase.com → Account → Access Tokens → Generate New Token) lalu simpan ke Vault: `select vault.create_secret('<PAT_ANDA>', 'supabase_mgmt_pat');` dan (opsional) slug organisasi: `select vault.create_secret('<SLUG>', 'supabase_org_slug');` — detail lengkap ada di komentar atas masing-masing file patch. Tanpa (1)–(3), tombol hapus/bersihkan tetap jalan tapi file storage tidak terhapus; tanpa (4), kartu statistik cloud menampilkan "—" dengan pesan petunjuk.
   - ⚠️ **SETUP KUNCI ENKRIPSI (v7)**: kunci dibuat **langsung di dalam Supabase (SQL Editor)** — tidak perlu generate di luar (openssl/generator lain). Jalankan blok ini sekali (aman dijalankan ulang):

     ```sql
     do $$
     begin
       if not exists (select 1 from vault.decrypted_secrets where name = 'data_enc_key') then
         perform vault.create_secret(encode(gen_random_bytes(32), 'hex'), 'data_enc_key');
         raise notice 'Kunci data_enc_key berhasil dibuat & disimpan di Vault.';
       else
         raise notice 'Kunci data_enc_key sudah ada — tidak dibuat ulang.';
       end if;
     end $$;
     ```

     Cek: `select name, decrypted_secret from vault.decrypted_secrets where name = 'data_enc_key';`
     **Simpan salinan kunci ini di tempat aman (password manager / offline)** — kalau hilang (mis. database dihapus, Vault ikut hilang), seluruh data terenkripsi tidak bisa dibaca lagi. Patch v7 otomatis berhenti dengan pesan jelas bila kunci belum ada, jadi aman untuk dijalankan duluan pun.
   - ⚠️ **Sembilan di antaranya wajib** dijalankan agar semua fitur berfungsi (v6c, v8, & v9 opsional — v6c = perbaikan login, v8 & v9 = performa pagination server-side): notifikasi warga (muncul setelah diverifikasi RT), badge menu, bansos auto-kedaluwarsa, jam WIB konsisten, pembersihan otomatis file foto di storage, statistik server real, dan keamanan password bcrypt.

3. **Ambil Kredensial API Supabase**:
   - Buka menu **Project Settings** (roda gigi kiri bawah) > **API**.
   - Salin 2 data ini:
     - **Project URL** (contoh: `https://xxxxxxxxx.supabase.co`)
     - **Project API Key `anon` `public`** (string panjang berawal `eyJhb...`)
   - ⚠️ **JANGAN pernah menggunakan `service_role` key** untuk aplikasi — itu kunci akses penuh database!

---

## 🔗 LANGKAH 2: HUBUNGKAN APLIKASI KE SUPABASE (TANPA EDIT KODE)

**Tidak perlu menyentuh kode sama sekali** — cukup isi environment variable:

### A. Untuk Preview / Local (`server.js` otomatis membaca `.env`)
Buat file **`.env`** di root proyek (jangan di-commit ke git):

```
SUPABASE_URL=https://xxxxxxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIs...
```

Lalu jalankan `npm run dev` — aplikasi mengambil konfigurasi ini lewat `/api/config`.
Jika env kosong, halaman login akan menampilkan peringatan yang jelas.

### B. Untuk Freebuff
Isi `SUPABASE_URL` dan `SUPABASE_KEY` di tab **API Keys / Keys** pada platform Freebuff.

### C. Untuk Vercel
Tambahkan kedua variable di menu **Project → Settings → Environment Variables**.
Endpoint `/api/config` otomatis dilayani oleh `api/config.js`.

---

## ⚙️ LANGKAH 3: JALANKAN PREVIEW & BUILD

```bash
npm install        # menginstall terser (untuk minify saat build)
npm run dev        # preview server → http://localhost:3000 (bind 0.0.0.0)
npm run build      # menghasilkan folder dist/ siap deploy (versi PREMIUM — yang dijual ke pembeli)
npm run build:free # menghasilkan folder dist/ versi FREE / DEMO (menu premium tidak disertakan)
```

- **Dua versi (v3.42) — satu codebase**: cukup deploy hasil build yang diinginkan.
  - `npm run build` = **PREMIUM** (default) — semua menu terbuka, tanpa gate. Inilah yang
    diserahkan ke pembeli source code.
  - `npm run build:free` = **FREE / DEMO** — modul menu premium (Bansos, Keuangan, Sumbangan,
    Aset, Surat Pengantar + tanda tangan digital) TIDAK ikut di-bundle (kode-nya benar-benar
    tidak ada di aplikasi), UI menyembunyikan menu-nya. Cocok sebagai demo untuk calon pembeli
    — upgrade = beli source code (hubungi developer via WhatsApp).

- **`npm run dev`** menjalankan `server.js` (Node murni, tanpa dependency): menyajikan file statis, SPA fallback, dan endpoint `/api/config`.
- **`npm run build`** menyalin app ke `dist/` **dan otomatis mem-minify semua file JS (terser)**:
  - kode di F12 versi online menjadi satu baris yang sulit dibaca & disalin;
  - ukuran file lebih kecil → website lebih cepat dimuat;
  - nama fungsi global tidak diubah, jadi semua tombol/menu tetap berfungsi normal.
- File asli yang rapi tetap tersimpan di folder `js/` untuk keperluan pengembangan.

---

## 🌐 LANGKAH 4: DEPLOY / UPLOAD WEBSITE

### Opsi A: Freebuff (rekomendasi)
Jalankan `npm run build` (perintah build = `npm run build`, output di `dist/`), lalu klik **Deploy**.

### Opsi B: GitHub Pages (Gratis & Otomatis HTTPS)
1. Build dulu: `npm run build`.
2. Upload/push seluruh isi folder **`dist/`** ke repository.
3. Buka **Settings** repository > **Pages** > pilih **Branch: main / Folder: / (root)** > **Save**.
4. Website langsung aktif. (Catatan: Pages tidak menyediakan `/api/config`, jadi isi URL & key langsung melalui env di platform lain, atau tempel nilai `supabaseUrl`/`supabaseKey` pada halaman konfigurasi.)

### Opsi C: Hosting cPanel / Vercel / Netlify
- Upload seluruh isi **`dist/`** ke `public_html` hosting.
- Di Vercel, pastikan `vercel.json` ikut ter-upload (untuk rewrite `/api/config`) dan environment variable diisi.

---

## 🔑 LANGKAH 5: LOGIN PERTAMA KALI & KONFIGURASI PENGURUS RT

1. Buka URL website yang sudah aktif.
2. Login dengan akun Admin Default:
   - **Username**: `adminrt`
   - **Password**: `admin123`
   - ⚠️ **Segera ganti password** lewat menu Pengaturan setelah login pertama.
3. **Menu Pengaturan RT & Sistem**:
   - **Tab Identitas & Tema**: upload logo RT/Perumahan, ubah Nama RT, Slogan, Warna Tema, dan Nomor WhatsApp Laporan RT.
   - **Tab QRIS & Rekening**: atur nomor rekening bank warga dan string/foto QRIS iuran (nama merchant, NMID, dan "Dicetak oleh" di kartu QRIS otomatis mengikuti payload).
   - **Tab Manajemen Akun Warga**: daftarkan akun login warga atau ubah password default.
   - **Tab Pengumuman Warga**: tulis running text / pengumuman penting untuk warga.

---

## 🔒 KEAMANAN & PROTEKSI KODE (FAKTA PENTING)

1. **Kode front-end tidak bisa disembunyikan 100%** — browser harus mengunduh dan menjalankan HTML/JS/CSS, sehingga kode selalu bisa dibuka lewat F12/View Source. Yang kita lakukan: **mem-minify** saat build agar yang terlihat adalah versi padat satu baris yang sulit dibaca & disalin, bukan kode sumber asli yang rapi.
2. **Proteksi data yang sebenarnya ada di server** — semua akses data lewat **fungsi RPC + RLS** di Supabase. Key `anon` (publik) yang tampil di jaringan hanya bisa memanggil fungsi RPC yang sudah dibatasi; tanpa sesi login yang valid, tidak ada data yang bisa diambil. **Jangan pernah menaruh `service_role` key di aplikasi.**
3. **Repository GitHub disarankan PRIVATE** agar source code lengkap (termasuk `schema.sql`) tidak bisa diunduh orang lain.

---

## ✨ FITUR UTAMA

1. 🌐 **Hosting Statis**: Hasil build berupa file statis — berjalan di hosting mana pun tanpa server khusus.
2. 📱 **Bisa Di-install di HP (PWA)**: Tampil seperti aplikasi PlayStore/AppStore tanpa download di PlayStore.
3. 🔒 **Proteksi KTP & NIK Warga**: Privasi warga terjamin dengan sensor NIK & No HP otomatis.
4. 💳 **Iuran QRIS Dinamis**: Warga bisa bayar iuran bulanan pakai GoPay/OVO/DANA/ShopeePay/BCA dengan nominal otomatis.
5. 📊 **Laporan Kas Keuangan Transparan**: Pencatatan kas RT real-time & otomatis.
6. 🎁 **Manajemen Bansos**: RT menyalurkan bansos per keluarga (pilih Nomor KK + periode ambil dengan tanggal & jam + keterangan), warga cek status pakai NIK — begitu NIK terhubung ke No. KK penerima, bansos keluarga langsung tampil tanpa NIK ditampilkan, RT verifikasi saat bansos diambil, dan status otomatis menjadi **Kedaluwarsa** jika melewati batas waktu pengambilan.

---

## 💝 REWARD & KONTAK

Apabila aplikasi ini bermanfaat, Anda dapat memberikan reward/support ke:

- **Reward (DANA)**: 08973366667 a.n. **Rizky Noviansyah**
- **WhatsApp**: 08973366667

Untuk pertanyaan, kendala instalasi, atau permintaan penyesuaian fitur, silakan hubungi via WhatsApp di atas.
