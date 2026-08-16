-- ============================================================
-- SECURITY PATCH v15 — KOLOM STATUS KELUARGA
-- (Kepala Keluarga / Anggota Keluarga) di tabel Warga
-- Jalankan di Supabase SQL Editor SETELAH v14. Idempotent — aman dijalankan ulang.
--
-- FITUR BARU (temuan pengguna):
--   Menu Warga kini menampilkan peran tiap warga dalam keluarganya:
--   "Kepala Keluarga" atau "Anggota Keluarga". Saat RT membuat/mengedit
--   data warga, tersedia pilihan tersebut.
--
-- ISI PATCH:
--   1) Tambah kolom `status_keluarga` (text, default "Anggota Keluarga").
--   2) Backfill data lama: untuk tiap Nomor KK, anggota yang PALING AWAL
--      dicatat (created_at terkecil, id sebagai tie-break) ditandai
--      "Kepala Keluarga" — asumsi umum saat input, anggota pertama =
--      kepala keluarga. RT tetap bisa mengubahnya kapan pun lewat
--      menu Warga → Edit Data Warga.
--
-- Prasyarat: patch v7 (struktur Warga) — kolom ini tidak masuk daftar
-- enkripsi at-rest, jadi aman untuk semua database.
-- ============================================================

-- 1) Tambah kolom (idempotent — baris lama otomatis berisi default)
alter table public."Warga"
  add column if not exists "status_keluarga" text default 'Anggota Keluarga';

-- 2) Backfill idempotent: hanya baris yang status_keluarga-nya masih
--    kosong/NULL yang diproses → aman dijalankan ulang kapan pun.
--    Tanpa no_kk (tidak masuk keluarga mana pun) dibiarkan "Anggota Keluarga".
update public."Warga" w
   set "status_keluarga" = 'Kepala Keluarga'
 where coalesce(trim(coalesce(w."status_keluarga", '')), '') = ''
   and coalesce(trim(coalesce(w."no_kk", '')), '') <> ''
   and w."id" = (
         select w2."id"
           from public."Warga" w2
          where coalesce(trim(coalesce(w2."no_kk", '')), '') = coalesce(trim(coalesce(w."no_kk", '')), '')
          order by w2."created_at" asc nulls last, w2."id" asc
          limit 1
       );
