# 📖 PANDUAN INSTALASI & SETUP LENGKAP
## SISTEM INFORMASI PERUMAHAN & RT MODERN (PWA)

Panduan ini berisi langkah-langkah mudah dan praktis untuk melakukan instalasi dan setup awal sistem untuk pembeli/klien Anda.

---

## 🗂️ STRUKTUR PROYEK (VERSI SAAT INI)

```
index.html, manifest.json, sw.js    → App shell (PWA, satu halaman)
js/                                 → Modul aplikasi (17+ file JavaScript)
server.js                           → Server preview/dev (Node murni, tanpa dependency)
scripts/build.js                    → Build: salin ke dist/ + MINIFY otomatis (terser)
api/config.js                       → Endpoint konfigurasi untuk hosting Vercel
schema.sql                          → Skema lengkap 17 tabel + RLS + RPC (wajib dijalankan)
security_patch.sql                  → Patch keamanan: kolom created_at + fungsi RPC + admin default (wajib)
security_patch_v2_verified_at.sql   → Patch v2: kolom verified_at = waktu RT memverifikasi (wajib)
security_patch_v3_storage_cleanup.sql → Patch v3: hapus file storage otomatis saat data dihapus (wajib)
package.json                        → Script: dev / start / build
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

## 🚀 LANGKAH 1: SETUP DATABASE SUPABASE (5 MENIT)

1. **Buat Project Baru di Supabase**:
   - Login ke [supabase.com](https://supabase.com) > Klik **New Project**.
   - Isi Nama Project, Password Database, dan pilih region terdekat (Singapore).
   - Tunggu 1–2 menit hingga project selesai dibuat.

2. **Jalankan Database (3 file SQL, urut)**:
   - Di dashboard Supabase, buka menu **SQL Editor** (icon `>_` di sidebar kiri).
   - Untuk tiap file: klik **New Query** (pastikan area editor **kosong**), paste **seluruh isi file**, lalu klik **Run**. Urutannya:
     1. `schema.sql` → 17 tabel + RLS + fungsi dasar.
     2. `security_patch.sql` → kolom `created_at` (waktu server), fungsi RPC lengkap, akun admin `adminrt`, `get_server_time()`.
     3. `security_patch_v2_verified_at.sql` → kolom `verified_at` = waktu RT memverifikasi/mengubah status (dipakai jam notifikasi warga).
     4. `security_patch_v3_storage_cleanup.sql` → RPC hapus file storage (bucket rt-media) otomatis saat data dihapus/dibersihkan — kuota storage tidak menumpuk sampah.
   - ⚠️ **Keempatnya wajib** dijalankan agar semua fitur berfungsi: notifikasi warga (muncul setelah diverifikasi RT), badge menu, bansos auto-kedaluwarsa, jam WIB konsisten, dan pembersihan otomatis file foto di storage.

3. **Fitur Bansos (Bantuan Sosial) — khusus database lama**:
   Database yang sudah pernah terpakai dan **tidak** menjalankan ulang seluruh `schema.sql`:
   buat tabel `Bansos` sekali lewat SQL Editor, lalu tetap jalankan kedua patch di atas:

   ```sql
   CREATE TABLE IF NOT EXISTS public."Bansos" (
       "id" text NOT NULL,
       "nik" text,
       "nama" text,
       "no_kk" text,
       "jenis_bansos" text,
       "tanggal_mulai" text,
       "tanggal_selesai" text,
       "status" text,
       "keterangan" text,
       "diambil_pada" text,
       "diverifikasi_oleh" text,
       "created_at" timestamptz DEFAULT now()
   );
   ALTER TABLE public."Bansos" ENABLE ROW LEVEL SECURITY;
   ```

   Catatan: patch juga membuat fungsi RPC `get_server_time()` — status **Kedaluwarsa** bansos
   dihitung memakai **waktu server Supabase**, bukan jam HP pengguna.

4. **Ambil Kredensial API Supabase**:
   - Buka menu **Project Settings** (roda gigi kiri bawah) > **API**.
   - Salin 2 data ini:
     - **Project URL** (contoh: `https://xxxxxxxxx.supabase.co`)
     - **Project API Key `anon` `public`** (string panjang berawal `eyJhb...`)
   - ⚠️ **JANGAN pernah menggunakan `service_role` key** untuk aplikasi — itu kunci akses penuh database!

---

## 🔗 LANGKAH 2: HUBUNGKAN APLIKASI KE SUPABASE (TANPA EDIT KODE)

Versi lama panduan menyuruh mengedit `js/app.js` dan menempel key ke dalam file.
**Versi sekarang tidak perlu menyentuh kode sama sekali** — cukup isi environment variable:

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
npm run build      # menghasilkan folder dist/ siap deploy
```

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
2. Upload/push seluruh isi folder **`dist/`** ke repository klien.
3. Buka **Settings** repository > **Pages** > pilih **Branch: main / Folder: / (root)** > **Save**.
4. Dalam 1–2 menit website aktif. (Catatan: Pages tidak menyediakan `/api/config`, jadi isi URL & key langsung melalui env di platform lain, atau tempel nilai `supabaseUrl`/`supabaseKey` pada halaman konfigurasi.)

### Opsi C: Hosting cPanel / Vercel / Netlify
- Upload seluruh isi **`dist/`** ke `public_html` hosting klien.
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
   - **Tab QRIS & Rekening**: atur nomor rekening bank warga, nama merchant QRIS, dan string/foto QRIS iuran.
   - **Tab Manajemen Akun Warga**: daftarkan akun login warga atau ubah password default.
   - **Tab Pengumuman Warga**: tulis running text / pengumuman penting untuk warga.

---

## 🔒 KEAMANAN & PROTEKSI KODE (FAKTA PENTING)

1. **Kode front-end tidak bisa disembunyikan 100%** — browser harus mengunduh dan menjalankan HTML/JS/CSS, sehingga kode selalu bisa dibuka lewat F12/View Source. Yang kita lakukan: **mem-minify** saat build agar yang terlihat adalah versi padat satu baris yang sulit dibaca & disalin, bukan kode sumber asli yang rapi.
2. **Proteksi data yang sebenarnya ada di server** — semua akses data lewat **fungsi RPC + RLS** di Supabase. Key `anon` (publik) yang tampil di jaringan hanya bisa memanggil fungsi RPC yang sudah dibatasi; tanpa sesi login yang valid, tidak ada data yang bisa diambil. **Jangan pernah menaruh `service_role` key di aplikasi.**
3. **Repository GitHub disarankan PRIVATE** agar source code lengkap (termasuk `schema.sql`) tidak bisa diunduh orang lain.

---

## 💎 NILAI JUAL UTAMA (SELLING POINTS UNTUK KLIEN)

1. 💰 **Bebas Biaya Server Bulanan**: Tidak perlu bayar hosting mahal setiap bulan.
2. 📱 **Bisa Di-install di HP (PWA)**: Tampil seperti aplikasi PlayStore/AppStore tanpa download di PlayStore.
3. 🔒 **Proteksi KTP & NIK Warga**: Privasi warga terjamin dengan sensor NIK & No HP otomatis.
4. 💳 **Iuran QRIS Dinamis**: Warga bisa bayar iuran bulanan pakai GoPay/OVO/DANA/ShopeePay/BCA dengan nominal otomatis.
5. 📊 **Laporan Kas Keuangan Transparan**: Pencatatan kas RT real-time & otomatis.
6. 🎁 **Manajemen Bansos**: RT menyalurkan bansos per keluarga (pilih Nomor KK + periode ambil dengan tanggal & jam + keterangan), warga cek status pakai NIK — begitu NIK terhubung ke No. KK penerima, bansos keluarga langsung tampil tanpa NIK ditampilkan, RT verifikasi saat bansos diambil, dan status otomatis menjadi **Kedaluwarsa** jika melewati batas waktu pengambilan.
