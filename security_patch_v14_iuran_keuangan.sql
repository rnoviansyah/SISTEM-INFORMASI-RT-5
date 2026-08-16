-- ============================================================
-- SECURITY PATCH v14 — FIX IURAN WARGA & DUPLIKAT SUMBANGAN DI KEUANGAN
-- Jalankan di Supabase SQL Editor SETELAH v13. Idempotent — aman dijalankan ulang.
--
-- DUA BUG YANG DIPERBAIKI (temuan pengguna):
--
-- A. Tagihan iuran tidak terlihat di akun Warga
--    get_iuran_page_secured (v9) memanggil _row_owner_match(v_row, v_nik, '')
--    dengan baris MENTAH (nik masih ciphertext PGP v7). Perbandingan
--    ciphertext vs plaintext SELALU gagal, sehingga Warga hanya cocok lewat
--    cabang no_kk (yang didekripsi). Bila no_kk tagihan kosong/berbeda →
--    tagihan tidak pernah muncul di akun Warga padahal NIK-nya cocok.
--    Perbaikan: _row_owner_match kini juga mencocokkan nik_sha (hash SHA-256
--    dari NIK, kolom v7) — cocok untuk baris terenkripsi tanpa perlu dekripsi.
--
-- B. Sumbangan yang di-ACC masuk 2x ke Keuangan
--    Alur verifikasiSumbanganRT (frontend) menulis salinan sumbangan ke tabel
--    Keuangan, PADAHAL get_keuangan_page_secured (v9) sudah menampilkan
--    sumbangan disetujui lewat UNION. Akibatnya satu donasi tampil 2 baris.
--    Perbaikan (3 lapis):
--      1. get_keuangan_page_secured: baris UNION SUMBANGAN dilewati bila
--         salinan ekuivalen (keterangan '[Sumbangan Warga] ...' + nominal +
--         dibuat setelah sumbangan) sudah ada di tabel Keuangan.
--      2. Pembersihan data lama: hapus salinan Keuangan yang memang duplikat
--         dari sumbangan yang sudah DISETUJUI (aman — data kas tidak hilang,
--         karena sumbangan tetap tampil lewat UNION). Baris manual RT yang
--         kebetulan berawalan '[Sumbangan Warga]' TANPA sumbangan disetujui
--         yang cocok TIDAK dihapus.
--      3. get_keuangan_summary_secured (fallback tanpa v9): ringkasan kas
--         kini menambahkan nominal sumbangan disetujui — konsisten dengan
--         daftar UNION (sebelumnya hanya menjumlah tabel Keuangan).
--
-- Catatan: setelah patch ini, aplikasi TIDAK lagi menulis salinan sumbangan
-- ke Keuangan saat ACC (fix frontend) — sumber tunggal = UNION.
-- ============================================================

-- ------------------------------------------------------------
-- 1) _row_owner_match — cocokkan NIK lewat plaintext ATAU nik_sha
--    (baris terenkripsi v7). Tidak mengubah perilaku untuk baris
--    plaintext / pencocokan nama.
-- ------------------------------------------------------------
create or replace function public._row_owner_match(p_row jsonb, p_nik text, p_nama text)
returns boolean language plpgsql immutable as $$
declare
  r_nik text; r_nik_sha text; r_nama text;
begin
  if p_row is null then return false; end if;
  r_nik     := lower(trim(coalesce(p_row->>'nik', p_row->>'NIK', '')));
  r_nik_sha := lower(trim(coalesce(p_row->>'nik_sha', '')));
  r_nama    := lower(trim(coalesce(p_row->>'nama', p_row->>'nama_lengkap',
                    p_row->>'nama_peminjam', p_row->>'pelapor', p_row->>'pemohon', '')));
  if coalesce(p_nik, '') <> '' then
    -- NIK plaintext (DB tanpa enkripsi v7)
    if r_nik <> '' and r_nik = lower(trim(p_nik)) then
      return true;
    end if;
    -- NIK terenkripsi (v7): cocokkan hash — tanpa perlu dekripsi
    if r_nik_sha <> '' and r_nik_sha = public._sha(p_nik) then
      return true;
    end if;
  end if;
  if coalesce(p_nama, '') <> '' and r_nama <> '' then
    return r_nama = lower(trim(p_nama))
        or r_nama like '%' || lower(trim(p_nama)) || '%'
        or lower(trim(p_nama)) like '%' || r_nama || '%';
  end if;
  return false;
end $$;

-- ------------------------------------------------------------
-- 2) get_keuangan_page_secured (override v9) — UNION sumbangan
--    dilewati bila salinan ekuivalen sudah ada di tabel Keuangan
-- ------------------------------------------------------------
create or replace function public.get_keuangan_page_secured(
  p_token      text,
  p_page       int    default 1,
  p_page_size  int    default 25,
  p_search     text   default '',
  p_periode    text   default 'all',
  p_date_from  text   default '',
  p_date_to    text   default '',
  p_order      text   default 'newest'
)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_role      text := public.auth_role(p_token);
  v_nik       text := '';
  v_rows      jsonb := '[]'::jsonb;
  v_all       jsonb := '[]'::jsonb;
  v_row       jsonb;
  v_sumb_ket  text;
  v_needle    text;
  v_periode   text := lower(trim(coalesce(p_periode, 'all')));
  v_order     text := lower(trim(coalesce(p_order, 'newest')));
  v_date_from timestamptz;
  v_date_to   timestamptz;
  v_total     int := 0;
  v_page      int := greatest(1, coalesce(p_page, 1));
  v_page_size int := least(10000, greatest(1, coalesce(p_page_size, 25)));
  v_start     int := 0;
  v_page_rows jsonb := '[]'::jsonb;
  v_sum_masuk numeric := 0;
  v_sum_keluar numeric := 0;
begin
  if v_role is null then
    return jsonb_build_object('status','error','message','Sesi tidak valid. Silakan login ulang.');
  end if;

  -- Baris Keuangan (bukan tabel privat — warga melihat semua, konsisten v8)
  for v_row in execute 'select to_jsonb(t) from public."Keuangan" t' loop
    v_rows := v_rows || public._decrypt_row(v_row, true);
  end loop;

  -- Sumbangan yang DISETUJUI dipetakan ke kolom Keuangan (konsisten dengan klien).
  -- v14: lewati sumbangan yang salinan Keuangan-nya sudah ada (duplikat).
  for v_row in execute 'select to_jsonb(t) from public."Sumbangan" t
      where lower(trim(coalesce(status,''''))) like ''%diterima%''
         or lower(trim(coalesce(status,''''))) like ''%selesai%''
         or lower(trim(coalesce(status,''''))) like ''%lunas%''
         or lower(trim(coalesce(status,''''))) like ''%acc%''
         or lower(trim(coalesce(status,''''))) like ''%terverifikasi%''' loop
    if exists (
      select 1 from public."Keuangan" k
      where k.pemasukan = coalesce((v_row->>'nominal')::numeric, 0)
        and lower(coalesce(k.keterangan,'')) like '[sumbangan warga]%'
        and coalesce(k.created_at, '-infinity'::timestamptz)
            >= coalesce((v_row->>'created_at')::timestamptz, '-infinity'::timestamptz)
        and (
              lower(coalesce(k.keterangan,'')) = lower('[Sumbangan Warga] ' || trim(coalesce(nullif(v_row->>'nama',''),'Warga')))
           or lower(coalesce(k.keterangan,'')) like lower('[Sumbangan Warga] ' || trim(coalesce(nullif(v_row->>'nama',''),'Warga')) || ' - %')
        )
    ) then
      continue;
    end if;
    v_rows := v_rows || jsonb_build_object(
      'id', v_row->>'id',
      'tanggal', v_row->>'tanggal',
      'pemasukan', v_row->>'nominal',
      'pengeluaran', 0,
      'keterangan', '[Sumbangan Warga] ' || coalesce(v_row->>'nama','Warga')
                    || case when coalesce(v_row->>'keterangan','') <> '' then ' - ' || v_row->>'keterangan' else '' end,
      'foto_url', v_row->>'bukti_transfer',
      'created_at', v_row->>'created_at',
      '_keuangan_ts', to_jsonb(public._keuangan_ts(v_row->>'tanggal', v_row->>'created_at'))
    );
  end loop;

  -- Tambahkan timestamp efektif untuk baris Keuangan asli
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v_rows
    from (
      select case when v.value ? '_keuangan_ts' then v.value
                  else v.value || jsonb_build_object('_keuangan_ts', to_jsonb(public._keuangan_ts(v.value->>'tanggal', v.value->>'created_at')))
             end as x
      from jsonb_array_elements(v_rows) v
    ) s;

  -- Filter periode (WIB)
  if v_periode = 'hari' then
    v_date_from := date_trunc('day', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta';
    v_date_to   := v_date_from + interval '1 day';
  elsif v_periode = 'bulan' then
    v_date_from := date_trunc('month', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta';
    v_date_to   := v_date_from + interval '1 month';
  elsif v_periode = 'tahun' then
    v_date_from := date_trunc('year', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta';
    v_date_to   := v_date_from + interval '1 year';
  elsif v_periode = 'custom' then
    v_date_from := case when p_date_from <> '' then (p_date_from::timestamp) at time zone 'Asia/Jakarta' else '-infinity'::timestamptz end;
    v_date_to   := case when p_date_to <> '' then ((p_date_to::timestamp + interval '1 day - 1 second')) at time zone 'Asia/Jakarta' else 'infinity'::timestamptz end;
  end if;

  if v_periode in ('hari','bulan','tahun','custom') then
    select coalesce(jsonb_agg(x), '[]'::jsonb) into v_rows
      from (
        select value as x from jsonb_array_elements(v_rows) v
        where coalesce((v.value->>'_keuangan_ts')::timestamptz, '-infinity'::timestamptz) >= coalesce(v_date_from, '-infinity'::timestamptz)
          and coalesce((v.value->>'_keuangan_ts')::timestamptz, 'infinity'::timestamptz) <  coalesce(v_date_to, 'infinity'::timestamptz)
      ) s;
  end if;

  -- Urutkan: terbaru / terlama (pakai tanggal efektif, fallback created_at)
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v_all
    from (
      select value as x from jsonb_array_elements(v_rows) v
      order by case when v_order = 'oldest'
                    then coalesce((v.value->>'_keuangan_ts')::timestamptz, (v.value->>'created_at')::timestamptz)::timestamptz
               end asc nulls last,
               case when v_order <> 'oldest'
                    then coalesce((v.value->>'_keuangan_ts')::timestamptz, (v.value->>'created_at')::timestamptz)::timestamptz
               end desc nulls last
    ) s;

  -- Pencarian (ID + keterangan, konsisten dgn filter klien)
  v_needle := lower(trim(coalesce(p_search, '')));
  if v_needle <> '' then
    select coalesce(jsonb_agg(x), '[]'::jsonb) into v_all
      from (
        select value as x from jsonb_array_elements(v_all) v
        where lower(coalesce(v.value->>'id','')) like '%' || v_needle || '%'
           or lower(coalesce(v.value->>'keterangan','')) like '%' || v_needle || '%'
      ) s;
  end if;

  -- Ringkasan kas dari hasil TERFILTER (konsisten: kartu = agregat server)
  select coalesce(sum(coalesce((v.value->>'pemasukan')::numeric, 0)), 0),
         coalesce(sum(coalesce((v.value->>'pengeluaran')::numeric, 0)), 0)
    into v_sum_masuk, v_sum_keluar
    from jsonb_array_elements(v_all) v;

  v_total := jsonb_array_length(v_all);
  v_start := (v_page - 1) * v_page_size;
  -- Buang field internal _keuangan_ts sebelum dikirim ke perangkat
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v_page_rows
    from (select v.value - '_keuangan_ts' as x from jsonb_array_elements(v_all) v limit v_page_size offset v_start) s;

  return jsonb_build_object('status','success','data', v_page_rows, 'total', v_total,
    'page', v_page, 'page_size', v_page_size,
    'summary', jsonb_build_object('total_masuk', v_sum_masuk, 'total_keluar', v_sum_keluar));
end $$;

-- ------------------------------------------------------------
-- 3) get_keuangan_summary_secured (override v6b) — ringkasan kas
--    fallback juga menghitung sumbangan yang DISETUJUI (konsisten
--    dengan daftar UNION). Setelah cleanup di bawah, tidak ada
--    salinan ganda yang tersisa di tabel Keuangan.
-- ------------------------------------------------------------
create or replace function public.get_keuangan_summary_secured(p_token text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_role  text := public.auth_role(p_token);
  v_masuk numeric := 0;
  v_keluar numeric := 0;
  v_sumb  numeric := 0;
  v_saldo numeric := 0;
begin
  if v_role is null then
    return jsonb_build_object('status','error','message','Sesi tidak valid. Silakan login ulang.');
  end if;
  select coalesce(sum(coalesce(pemasukan, 0)), 0),
         coalesce(sum(coalesce(pengeluaran, 0)), 0)
    into v_masuk, v_keluar
    from public."Keuangan";
  select coalesce(sum(coalesce(nominal, 0)), 0) into v_sumb
    from public."Sumbangan"
   where lower(trim(coalesce(status,''))) like '%diterima%'
      or lower(trim(coalesce(status,''))) like '%selesai%'
      or lower(trim(coalesce(status,''))) like '%lunas%'
      or lower(trim(coalesce(status,''))) like '%acc%'
      or lower(trim(coalesce(status,''))) like '%terverifikasi%';
  v_masuk := v_masuk + v_sumb;
  v_saldo := v_masuk - v_keluar;
  return jsonb_build_object(
    'status', 'success',
    'total_masuk', v_masuk,
    'total_keluar', v_keluar,
    'saldo', v_saldo
  );
end $$;

-- ------------------------------------------------------------
-- 4) PEMBERSIHAN data lama (idempotent — aman dijalankan ulang):
--    hapus salinan Keuangan yang DUPLIKAT dari sumbangan DISETUJUI.
--    Hanya baris yang: berawalan '[Sumbangan Warga]', nominal sama,
--    nama penyumbang sama, dan dibuat SETELAH sumbangan dibuat.
--    Baris manual RT yang tidak cocok dengan sumbangan disetujui
--    TIDAK dihapus.
-- ------------------------------------------------------------
delete from public."Keuangan" k
 where lower(coalesce(k.keterangan,'')) like '[sumbangan warga]%'
   and exists (
     select 1 from public."Sumbangan" s
     where k.pemasukan = coalesce(s.nominal, 0)
       and (
             lower(trim(coalesce(s.status,''))) like '%diterima%'
          or lower(trim(coalesce(s.status,''))) like '%selesai%'
          or lower(trim(coalesce(s.status,''))) like '%lunas%'
          or lower(trim(coalesce(s.status,''))) like '%acc%'
          or lower(trim(coalesce(s.status,''))) like '%terverifikasi%'
       )
       and coalesce(k.created_at, '-infinity'::timestamptz)
           >= coalesce(s.created_at, '-infinity'::timestamptz)
       and (
             lower(coalesce(k.keterangan,'')) = lower('[Sumbangan Warga] ' || trim(coalesce(nullif(s.nama,''),'Warga')))
          or lower(coalesce(k.keterangan,'')) like lower('[Sumbangan Warga] ' || trim(coalesce(nullif(s.nama,''),'Warga')) || ' - %')
       )
   );

-- ------------------------------------------------------------
-- 5) HAK EKSEKUSI (idempotent)
-- ------------------------------------------------------------
grant execute on function public._row_owner_match(jsonb, text, text) to anon, authenticated, service_role;
grant execute on function public.get_keuangan_page_secured(text, int, int, text, text, text, text, text) to anon, authenticated, service_role;
grant execute on function public.get_keuangan_summary_secured(text) to anon, authenticated, service_role;

notify pgrst, 'reload schema';

-- ============================================================
-- CEK SETUP (read-only, setelah patch):
--   1) Iuran warga:
--      select id, bulan, tahun, nama, status, nik_sha from public."Iuran" order by created_at desc limit 5;
--      Lalu bandingkan dengan NIK akun warga (login): buka menu Iuran di akun
--      warga → tagihan yang NIK-nya cocok kini muncul.
--   2) Keuangan tanpa duplikat:
--      select count(*) from public."Keuangan" where lower(keterangan) like '[sumbangan warga]%';
--      -> hanya baris MANUAL yang tersisa (bukan salinan otomatis ACC).
--      Buka menu Keuangan → tiap sumbangan disetujui tampil SATU kali.
-- ============================================================
