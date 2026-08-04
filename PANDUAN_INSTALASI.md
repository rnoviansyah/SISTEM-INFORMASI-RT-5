# 📖 PANDUAN INSTALASI & SETUP LENGKAP
## SISTEM INFORMASI PERUMAHAN & RT MODERN (PWA)

Panduan ini berisi langkah-langkah mudah dan praktis untuk melakukan instalasi dan setup awal sistem untuk pembeli/klien Anda.

---

## 🛠️ PERSYARATAN (PREREQUISITES)

1. **Database Backend**: Akun Supabase (Gratis di [supabase.com](https://supabase.com))
2. **Hosting Frontend**: GitHub Pages / Vercel / Netlify / cPanel Hosting (Aplikasi ini 100% Web Statis PWA, tidak membutuhkan server Node.js/PHP yang mahal).

---

## 🚀 LANGKAH 1: SETUP DATABASE SUPABASE (5 MENIT)

1. **Buat Project Baru di Supabase**:
   - Login ke [supabase.com](https://supabase.com) > Klik **New Project**.
   - Isi Nama Project (misal: `Sistem-RT-Kahfi`), Password Database, dan pilih region terdekat (Singapore).
   - Tunggu 1–2 menit hingga project selesai dibuat.

2. **Jalankan Schema Database**:
   - Di dashboard Supabase, buka menu **SQL Editor** (icon `>_` di sidebar kiri).
   - Klik **New Query**.
   - Salin seluruh isi file `schema.sql` dari proyek ini, paste ke SQL Editor.
   - Klik tombol **Run** (atau tekan `Ctrl + Enter`).
   - *Status: Seluruh 16 tabel, Stored Procedures, dan RLS Security Policy telah berhasil dibuat.*

3. **Ambil Kredensial API Supabase**:
   - Buka menu **Project Settings** (icon roda gigi di kiri bawah) > **API**.
   - Salin 2 data penting ini:
     - **Project URL** (contoh: `https://xxxxxxxxx.supabase.co`)
     - **Project API Key (`anon` `public`)** (string panjang berawal `eyJhb...`)

---

## 🔗 LANGKAH 2: HUBUNGKAN APLIKASI KE SUPABASE (1 MENIT)

1. Buka file [`js/app.js`](file:///C:/Users/LENOVO/Downloads/rt%205/js/app.js) di text editor (VS Code / Notepad).
2. Cari baris berikut di bagian atas file (sekitar baris 137–141):

```javascript
const _k1 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
const _k2 = '...';
const _k3 = '...';
const SUPABASE_URL = 'https://xxxxxxxxx.supabase.co';
const SUPABASE_KEY = _k1 + _k2 + _k3;
```

3. Ganti `SUPABASE_URL` dan `SUPABASE_KEY` dengan kredensial Supabase milik klien Anda.

---

## 🌐 LANGKAH 3: DEPLOY / UPLOAD WEBSITE

### Opsi A: Menggunakan GitHub Pages (Gratis & Otomatis HTTPS)
1. Upload/Push seluruh file proyek ke Repository GitHub Klien.
2. Buka tab **Settings** di Repository GitHub > **Pages**.
3. Pada bagian **Build and deployment**, pilih **Branch: main** / **Folder: / (root)** > Klik **Save**.
4. Dalam 1–2 menit, website sudah aktif di URL `https://username.github.io/repository-name/`.

### Opsi B: Menggunakan Hosting cPanel / Vercel / Netlify
- Cukup upload seluruh isi folder aplikasi (`index.html`, `manifest.json`, `sw.js`, `README.md`, folder `js/`) ke `public_html` hosting klien.

---

## 🔑 LANGKAH 4: LOGIN PERTAMA KALI & KONFIGURASI PENGURUS RT

1. Buka URL website yang sudah aktif.
2. Login dengan akun Admin Default:
   - **Username**: `adminrt`
   - **Password**: `admin123`

3. **Buka Menu Pengaturan RT & Sistem**:
   - **Tab Identitas & Tema**: Upload file foto logo RT/Perumahan langsung dari galeri HP/Komputer, ubah Nama RT, Slogan/Tagline, Warna Tema, dan Nomor WhatsApp Laporan RT.
   - **Tab QRIS & Rekening**: Atur nomor rekening bank warga, nama merchant QRIS, dan string/foto QRIS pembayaran iuran.
   - **Tab Manajemen Akun Warga**: Daftarkan akun login untuk warga atau ubah password default `adminrt`.
   - **Tab Pengumuman Warga**: Tulis pesan running text / pengumuman penting untuk warga.

---

## 💎 NILAI JUAL UTAMA (SELLING POINTS UNTUK KLIEN)

1. 💰 **Bebas Biaya Server Bulanan**: Tidak perlu bayar hosting mahal setiap bulan.
2. 📱 **Bisa Di-install di HP (PWA)**: Tampil seperti aplikasi PlayStore/AppStore tanpa perlu download di PlayStore.
3. 🔒 **Proteksi KTP & NIK Warga**: Privasi warga terjamin dengan sensor NIK & No HP otomatis.
4. 💳 **Iuran QRIS Dinamis**: Warga bisa bayar iuran bulanan pakai GoPay/OVO/DANA/ShopeePay/BCA dengan nominal otomatis.
5. 📊 **Laporan Kas Keuangan Transparan**: Pencatatan kas RT real-time & otomatis.
