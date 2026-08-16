-- ============================================================
-- SECURITY PATCH v9 — PAGINATION SERVER-SIDE UNTUK MENU CUSTOM
-- Jalankan di Supabase SQL Editor SETELAH v8. Idempotent — aman dijalankan ulang.
--
-- APA YANG DILAKUKAN:
--   RPC bespoke per menu custom yang TIDAK bisa ditangani RPC generik v8:
--     1. get_warga_page_secured        — Warga: mode 'tabel' (LIMIT/OFFSET baris)
--                                        & mode 'rumah' (grup per alamat + jumlah
--                                        penghuni + pratinjau nama), kecualikan
--                                        warga yang tercatat di tabel Kematian.
--     2. get_warga_rumah_detail_secured — penghuni satu alamat (untuk modal detail).
--     3. get_iuran_page_secured        — halaman baris + AGREGASI banner
--                                        (total lunas / menunggu / belum lunas).
--     4. get_bansos_page_secured       — auto-"Kedaluwarsa" dijalankan DI SERVER
--                                        (jam server) + hitungan status header.
--     5. get_keuangan_page_secured     — UNION tabel Keuangan + Sumbangan yang
--                                        disetujui (dipetakan ke kolom Keuangan),
--                                        filter periode (hari/bulan/tahun/custom),
--                                        urutan terbaru/terlama, + ringkasan kas.
--     6. get_aset_page_secured         — tab 'stok' (tabel Aset) / 'riwayat'
--                                        (tabel Peminjaman), LIMIT/OFFSET.
--
--   Semua RPC: keamanan IDENTIK v7 (validasi sesi & peran, dekripsi at-rest,
--   sensor warga beda KK), pencarian & filter di server, dan hanya SATU halaman
--   (25 baris) yang dikirim ke perangkat.
--
-- BACKWARD COMPATIBLE: bila file ini belum dijalankan, aplikasi otomatis
-- kembali ke mode lama (fetch semua + slice di klien) — tidak error.
-- ============================================================

-- ------------------------------------------------------------
-- HELPER: timestamp absolut tanggal_selesai bansos (format id)
-- 'YYYY-MM-DD' -> akhir hari; 'YYYY-MM-DDTHH:MI' -> apa adanya.
-- Diasumsikan zona WIB (Asia/Jakarta), konsisten dengan aplikasi.
-- ------------------------------------------------------------
create or replace function public._bansos_expired_ts(p_val text)
returns timestamptz language plpgsql immutable set search_path = public, pg_temp as $$
begin
  if p_val is null or trim(p_val) = '' or p_val = '-' then return null; end if;
  if p_val ~ '^\d{4}-\d{2}-\d{2}$' then
    return (p_val || ' 23:59:59')::timestamp at time zone 'Asia/Jakarta';
  end if;
  begin
    return (replace(p_val, ' ', 'T'))::timestamp at time zone 'Asia/Jakarta';
  exception when others then return null; end;
end $$;

-- ------------------------------------------------------------
-- HELPER: timestamp efektif baris keuangan (tanggal/id, zona WIB).
-- Fallback ke created_at bila tanggal tidak bisa diparse.
-- ------------------------------------------------------------
create or replace function public._keuangan_ts(p_tanggal text, p_created_at text)
returns timestamptz language plpgsql immutable set search_path = public, pg_temp as $$
declare v_out timestamptz;
begin
  v_out := null;
  if p_tanggal is not null and trim(p_tanggal) <> '' and p_tanggal <> '-' then
    begin
      if p_tanggal ~ '^\d{4}-\d{2}-\d{2}' then
        v_out := (replace(p_tanggal, ' ', 'T'))::timestamp at time zone 'Asia/Jakarta';
      elsif p_tanggal ~ '^\d{1,2}/\d{1,2}/\d{4}' then
        begin
          v_out := (to_timestamp(p_tanggal, 'DD/MM/YYYY HH24:MI')::timestamp) at time zone 'Asia/Jakarta';
        exception when others then
          begin
            v_out := (to_timestamp(p_tanggal, 'DD/MM/YYYY')::timestamp) at time zone 'Asia/Jakarta';
          exception when others then v_out := null; end;
        end;
      end if;
    exception when others then v_out := null; end;
  end if;
  if v_out is null and p_created_at is not null and trim(p_created_at) <> '' then
    begin
      v_out := p_created_at::timestamptz;
    exception when others then v_out := null; end;
  end if;
  return v_out;
end $$;

-- ============================================================
-- 1) WARGA — tabel / rumah (grup per alamat) + pengecualian Kematian
-- ============================================================
create or replace function public.get_warga_page_secured(
  p_token     text,
  p_mode      text   default 'tabel',
  p_page      int    default 1,
  p_page_size int    default 25,
  p_search    text   default '',
  p_status    text   default ''
)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_role      text := public.auth_role(p_token);
  v_nik       text := '';
  v_user_kk   text := '';
  v_rows      jsonb := '[]'::jsonb;
  v_all       jsonb := '[]'::jsonb;
  v_row       jsonb;
  v_row_kk    text;
  v_row_nik   text;
  v_allow     boolean;
  v_needle    text;
  v_status    text;
  v_mode      text := lower(trim(coalesce(p_mode, 'tabel')));
  v_total     int := 0;
  v_page      int := greatest(1, coalesce(p_page, 1));
  v_page_size int := least(10000, greatest(1, coalesce(p_page_size, 25)));
  v_start     int := 0;
  v_page_rows jsonb := '[]'::jsonb;
  v_groups    jsonb := '[]'::jsonb;
  v_map       jsonb := '{}'::jsonb;
  v_key       text;
  v_g         jsonb;
  v_item      jsonb;
begin
  if v_role is null then
    return jsonb_build_object('status','error','message','Sesi tidak valid. Silakan login ulang.');
  end if;

  select coalesce(public._dec_data(nik),'') into v_nik
    from public."Sessions" where token = trim(p_token) limit 1;

  if v_nik <> '' then
    select coalesce(public._dec_data(no_kk),'') into v_user_kk
      from public."Warga" where nik_sha = public._sha(v_nik) limit 1;
  end if;

  -- Kecualikan warga yang tercatat meninggal di tabel Kematian
  -- (nik_sha sama ATAU NIK terdekripsi sama), konsisten dengan filter klien.
  for v_row in execute 'select to_jsonb(t) from public."Warga" t' loop
    if exists (
      select 1 from public."Kematian" km
      where (coalesce(v_row->>'nik_sha','') <> '' and km.nik_sha is not null and v_row->>'nik_sha' = km.nik_sha)
         or (coalesce(lower(trim(public._dec_data(km.nik))),'') <> ''
             and coalesce(lower(trim(public._dec_data(km.nik))),'') = lower(trim(coalesce(public._dec_data(v_row->>'nik'),''))))
    ) then
      continue;
    end if;
    if v_role = 'RT' then
      v_rows := v_rows || public._decrypt_row(v_row, true);
    else
      v_row_kk  := lower(trim(coalesce(public._dec_data(v_row->>'no_kk'),'')));
      v_row_nik := lower(trim(coalesce(public._dec_data(v_row->>'nik'),'')));
      v_allow := (v_user_kk <> '' and v_row_kk <> '' and v_row_kk = lower(trim(v_user_kk)))
              or (v_nik <> '' and v_row_nik = lower(trim(v_nik)));
      v_rows := v_rows || public._decrypt_row(v_row, v_allow);
    end if;
  end loop;

  -- Urutkan created_at terbaru dulu
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v_all
    from (
      select value as x from jsonb_array_elements(v_rows) v
      order by (v.value->>'created_at')::timestamptz desc nulls last
    ) s;

  -- Pencarian (semua kolom teks, case-insensitive, wildcard di-escape)
  v_needle := lower(trim(coalesce(p_search, '')));
  v_needle := replace(replace(replace(v_needle, '\', '\\'), '%', '\%'), '_', '\_');
  if v_needle <> '' then
    select coalesce(jsonb_agg(x), '[]'::jsonb) into v_all
      from (
        select value as x from jsonb_array_elements(v_all) v
        where exists (
          select 1 from jsonb_each_text(v.value) kv
          where lower(coalesce(kv.value,'')) like '%' || v_needle || '%' escape '\'
        )
      ) s;
  end if;

  -- Filter status tinggal (dropdown RT)
  v_status := upper(trim(coalesce(p_status, '')));
  if v_status = 'TETAP' then
    select coalesce(jsonb_agg(x), '[]'::jsonb) into v_all
      from (select value as x from jsonb_array_elements(v_all) v
            where lower(coalesce(v.value->>'status_tinggal','')) like '%tetap%') s;
  elsif v_status = 'DOMISILI' then
    select coalesce(jsonb_agg(x), '[]'::jsonb) into v_all
      from (select value as x from jsonb_array_elements(v_all) v
            where lower(coalesce(v.value->>'status_tinggal','')) like '%domisili%'
               or lower(coalesce(v.value->>'status_tinggal','')) like '%kontrak%') s;
  end if;

  if v_mode = 'rumah' then
    -- GRUP per alamat (normalisasi lowercase+trim, konsisten dgn klien)
    v_map := '{}'::jsonb;
    for v_item in select value from jsonb_array_elements(v_all) loop
      v_key := lower(trim(coalesce(v_item->>'alamat','')));
      if v_key = '' then v_key := 'alamat belum terdata'; end if;
      v_g := v_map->v_key;
      if v_g is null then
        v_g := jsonb_build_object('alamat', coalesce(v_item->>'alamat','-'), 'jumlah_penghuni', 0, 'nama_pratinjau', jsonb_build_array());
      end if;
      v_g := jsonb_set(v_g, '{jumlah_penghuni}', to_jsonb(coalesce((v_g->>'jumlah_penghuni')::int, 0) + 1));
      if jsonb_array_length(v_g->'nama_pratinjau') < 3 then
        v_g := jsonb_set(v_g, '{nama_pratinjau}', (v_g->'nama_pratinjau') || to_jsonb(coalesce(v_item->>'nama_lengkap','-')));
      end if;
      v_map := jsonb_set(v_map, array[v_key], v_g);
    end loop;
    select coalesce(jsonb_agg(x), '[]'::jsonb) into v_groups
      from (
        select value as x from jsonb_array_elements(
          (select coalesce(jsonb_agg(value), '[]'::jsonb) from jsonb_each(v_map))
        ) order by lower(coalesce(value->>'alamat',''))
      ) s;
    v_total := jsonb_array_length(v_groups);
    v_start := (v_page - 1) * v_page_size;
    select coalesce(jsonb_agg(x), '[]'::jsonb) into v_page_rows
      from (select value as x from jsonb_array_elements(v_groups) v limit v_page_size offset v_start) s;
    return jsonb_build_object('status','success','mode','rumah','data', v_page_rows,
                              'total', v_total, 'page', v_page, 'page_size', v_page_size);
  end if;

  -- Mode tabel
  v_total := jsonb_array_length(v_all);
  v_start := (v_page - 1) * v_page_size;
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v_page_rows
    from (select value as x from jsonb_array_elements(v_all) v limit v_page_size offset v_start) s;
  return jsonb_build_object('status','success','mode','tabel','data', v_page_rows,
                            'total', v_total, 'page', v_page, 'page_size', v_page_size);
end $$;

grant execute on function public.get_warga_page_secured(text, text, int, int, text, text) to anon, authenticated, service_role;

-- ============================================================
-- 2) WARGA — detail penghuni satu alamat (modal rumah)
-- ============================================================
create or replace function public.get_warga_rumah_detail_secured(p_token text, p_alamat text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_role      text := public.auth_role(p_token);
  v_nik       text := '';
  v_user_kk   text := '';
  v_rows      jsonb := '[]'::jsonb;
  v_row       jsonb;
  v_row_kk    text;
  v_row_nik   text;
  v_allow     boolean;
  v_needle    text := lower(trim(coalesce(p_alamat,'')));
begin
  if v_role is null then
    return jsonb_build_object('status','error','message','Sesi tidak valid. Silakan login ulang.');
  end if;

  select coalesce(public._dec_data(nik),'') into v_nik
    from public."Sessions" where token = trim(p_token) limit 1;

  if v_nik <> '' then
    select coalesce(public._dec_data(no_kk),'') into v_user_kk
      from public."Warga" where nik_sha = public._sha(v_nik) limit 1;
  end if;

  for v_row in execute 'select to_jsonb(t) from public."Warga" t' loop
    if lower(trim(coalesce(public._dec_data(v_row->>'alamat'),''))) <> v_needle then
      continue;
    end if;
    -- kecualikan warga meninggal (nik_sha / NIK terdekripsi)
    if exists (
      select 1 from public."Kematian" km
      where (coalesce(v_row->>'nik_sha','') <> '' and km.nik_sha is not null and v_row->>'nik_sha' = km.nik_sha)
         or (coalesce(lower(trim(public._dec_data(km.nik))),'') <> ''
             and coalesce(lower(trim(public._dec_data(km.nik))),'') = lower(trim(coalesce(public._dec_data(v_row->>'nik'),''))))
    ) then
      continue;
    end if;
    if v_role = 'RT' then
      v_rows := v_rows || public._decrypt_row(v_row, true);
    else
      v_row_kk  := lower(trim(coalesce(public._dec_data(v_row->>'no_kk'),'')));
      v_row_nik := lower(trim(coalesce(public._dec_data(v_row->>'nik'),'')));
      v_allow := (v_user_kk <> '' and v_row_kk <> '' and v_row_kk = lower(trim(v_user_kk)))
              or (v_nik <> '' and v_row_nik = lower(trim(v_nik)));
      v_rows := v_rows || public._decrypt_row(v_row, v_allow);
    end if;
  end loop;

  return jsonb_build_object('status','success','data', v_rows);
end $$;

grant execute on function public.get_warga_rumah_detail_secured(text, text) to anon, authenticated, service_role;

-- ============================================================
-- 3) IURAN — halaman baris + agregasi banner
-- ============================================================
create or replace function public.get_iuran_page_secured(
  p_token     text,
  p_page      int    default 1,
  p_page_size int    default 25,
  p_search    text   default ''
)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_role      text := public.auth_role(p_token);
  v_nik       text := '';
  v_user_kk   text := '';
  v_rows      jsonb := '[]'::jsonb;
  v_all       jsonb := '[]'::jsonb;
  v_row       jsonb;
  v_row_kk    text;
  v_owner     boolean;
  v_allow     boolean;
  v_needle    text;
  v_total     int := 0;
  v_page      int := greatest(1, coalesce(p_page, 1));
  v_page_size int := least(10000, greatest(1, coalesce(p_page_size, 25)));
  v_start     int := 0;
  v_page_rows jsonb := '[]'::jsonb;
  v_sum_lunas     numeric := 0;
  v_sum_menunggu  numeric := 0;
  v_sum_belum     numeric := 0;
  v_cnt_menunggu  int := 0;
  v_st    text;
  v_nom   numeric;
  v_item  jsonb;
begin
  if v_role is null then
    return jsonb_build_object('status','error','message','Sesi tidak valid. Silakan login ulang.');
  end if;

  select coalesce(public._dec_data(nik),'') into v_nik
    from public."Sessions" where token = trim(p_token) limit 1;

  if v_nik <> '' then
    select coalesce(public._dec_data(no_kk),'') into v_user_kk
      from public."Warga" where nik_sha = public._sha(v_nik) limit 1;
  end if;

  -- Iuran = tabel privat: warga hanya melihat catatan miliknya / satu KK
  for v_row in execute 'select to_jsonb(t) from public."Iuran" t' loop
    if v_role = 'RT' then
      v_allow := true;
    else
      v_owner := public._row_owner_match(v_row, v_nik, '');
      v_allow := v_owner
              or (v_user_kk <> '' and lower(trim(coalesce(public._dec_data(v_row->>'no_kk'),''))) = lower(trim(v_user_kk)));
      if not v_allow then continue; end if;
    end if;
    v_rows := v_rows || public._decrypt_row(v_row, v_allow);
  end loop;

  -- Agregasi banner dihitung dari SEMUA baris (tanpa pencarian), konsisten dgn klien
  for v_item in (select value from jsonb_array_elements(v_rows)) loop
    v_st  := lower(trim(coalesce(v_item->>'status','')));
    v_nom := coalesce((v_item->>'nominal')::numeric, 0);
    if v_st like '%lunas%' and v_st not like '%belum%' then
      v_sum_lunas := v_sum_lunas + v_nom;
    elsif v_st like '%menunggu%' or v_st like '%verifikasi%' then
      v_sum_menunggu := v_sum_menunggu + v_nom;
      v_cnt_menunggu := v_cnt_menunggu + 1;
    else
      v_sum_belum := v_sum_belum + v_nom;
    end if;
  end loop;

  -- Urutkan created_at terbaru dulu
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v_all
    from (
      select value as x from jsonb_array_elements(v_rows) v
      order by (v.value->>'created_at')::timestamptz desc nulls last
    ) s;

  -- Pencarian
  v_needle := lower(trim(coalesce(p_search, '')));
  v_needle := replace(replace(replace(v_needle, '\', '\\'), '%', '\%'), '_', '\_');
  if v_needle <> '' then
    select coalesce(jsonb_agg(x), '[]'::jsonb) into v_all
      from (
        select value as x from jsonb_array_elements(v_all) v
        where exists (
          select 1 from jsonb_each_text(v.value) kv
          where lower(coalesce(kv.value,'')) like '%' || v_needle || '%' escape '\'
        )
      ) s;
  end if;

  v_total := jsonb_array_length(v_all);
  v_start := (v_page - 1) * v_page_size;
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v_page_rows
    from (select value as x from jsonb_array_elements(v_all) v limit v_page_size offset v_start) s;

  return jsonb_build_object('status','success','data', v_page_rows, 'total', v_total,
    'page', v_page, 'page_size', v_page_size,
    'summary', jsonb_build_object(
      'total_lunas', v_sum_lunas,
      'total_menunggu', v_sum_menunggu,
      'total_belum_lunas', v_sum_belum,
      'count_menunggu', v_cnt_menunggu
    ));
end $$;

grant execute on function public.get_iuran_page_secured(text, int, int, text) to anon, authenticated, service_role;

-- ============================================================
-- 4) BANSOS — auto-kedaluwarsa di server + halaman + hitungan header (khusus RT)
-- ============================================================
create or replace function public.get_bansos_page_secured(
  p_token     text,
  p_page      int    default 1,
  p_page_size int    default 25,
  p_search    text   default ''
)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_role      text := public.auth_role(p_token);
  v_nik       text := '';
  v_rows      jsonb := '[]'::jsonb;
  v_all       jsonb := '[]'::jsonb;
  v_row       jsonb;
  v_needle    text;
  v_total     int := 0;
  v_page      int := greatest(1, coalesce(p_page, 1));
  v_page_size int := least(10000, greatest(1, coalesce(p_page_size, 25)));
  v_start     int := 0;
  v_page_rows jsonb := '[]'::jsonb;
  v_count_total  int := 0;
  v_count_belum  int := 0;
  v_count_sudah  int := 0;
  v_count_kadalu int := 0;
  v_st text;
  v_item jsonb;
begin
  if v_role is null then
    return jsonb_build_object('status','error','message','Sesi tidak valid. Silakan login ulang.');
  end if;
  if v_role <> 'RT' then
    return jsonb_build_object('status','error','message','Akses ditolak: menu ini khusus RT.');
  end if;

  -- Auto-kedaluwarsa DI SERVER (jam server), idempotent & aman dijalankan ulang.
  update public."Bansos" set status = 'Kedaluwarsa'
   where lower(trim(coalesce(status,''))) like '%belum%'
     and public._bansos_expired_ts(tanggal_selesai) is not null
     and public._bansos_expired_ts(tanggal_selesai) <= now();

  for v_row in execute 'select to_jsonb(t) from public."Bansos" t' loop
    v_rows := v_rows || public._decrypt_row(v_row, true);
  end loop;

  -- Hitungan header dihitung dari SEMUA baris (tanpa pencarian), konsisten dgn klien
  v_count_total := jsonb_array_length(v_rows);
  for v_item in (select value from jsonb_array_elements(v_rows)) loop
    v_st := lower(trim(coalesce(v_item->>'status','')));
    if v_st like '%sudah%' then
      v_count_sudah := v_count_sudah + 1;
    elsif v_st like '%kedaluwarsa%' then
      v_count_kadalu := v_count_kadalu + 1;
    elsif v_st like '%belum%' then
      if public._bansos_expired_ts(v_item->>'tanggal_selesai') is not null
         and public._bansos_expired_ts(v_item->>'tanggal_selesai') <= now() then
        v_count_kadalu := v_count_kadalu + 1;
      else
        v_count_belum := v_count_belum + 1;
      end if;
    else
      v_count_belum := v_count_belum + 1;
    end if;
  end loop;

  -- Urutkan created_at terbaru dulu
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v_all
    from (
      select value as x from jsonb_array_elements(v_rows) v
      order by (v.value->>'created_at')::timestamptz desc nulls last
    ) s;

  -- Pencarian
  v_needle := lower(trim(coalesce(p_search, '')));
  v_needle := replace(replace(replace(v_needle, '\', '\\'), '%', '\%'), '_', '\_');
  if v_needle <> '' then
    select coalesce(jsonb_agg(x), '[]'::jsonb) into v_all
      from (
        select value as x from jsonb_array_elements(v_all) v
        where exists (
          select 1 from jsonb_each_text(v.value) kv
          where lower(coalesce(kv.value,'')) like '%' || v_needle || '%' escape '\'
        )
      ) s;
  end if;

  v_total := jsonb_array_length(v_all);
  v_start := (v_page - 1) * v_page_size;
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v_page_rows
    from (select value as x from jsonb_array_elements(v_all) v limit v_page_size offset v_start) s;

  return jsonb_build_object('status','success','data', v_page_rows, 'total', v_total,
    'page', v_page, 'page_size', v_page_size,
    'counts', jsonb_build_object(
      'total', v_count_total,
      'belum', v_count_belum,
      'sudah', v_count_sudah,
      'kedaluwarsa', v_count_kadalu
    ));
end $$;

grant execute on function public.get_bansos_page_secured(text, int, int, text) to anon, authenticated, service_role;

-- ============================================================
-- 5) KEUANGAN — UNION Keuangan + Sumbangan disetujui, filter & ringkasan
-- ============================================================
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
  v_needle    text;
  v_periode   text := lower(trim(coalesce(p_periode, 'all')));
  v_order     text := lower(trim(coalesce(p_order, 'newest')));
  v_date_from timestamptz;
  v_date_to   timestamptz;
  v_ts        timestamptz;
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

  -- Sumbangan yang DISETUJUI dipetakan ke kolom Keuangan (konsisten dengan klien)
  for v_row in execute 'select to_jsonb(t) from public."Sumbangan" t
      where lower(trim(coalesce(status,''''))) like ''%diterima%''
         or lower(trim(coalesce(status,''''))) like ''%selesai%''
         or lower(trim(coalesce(status,''''))) like ''%lunas%''
         or lower(trim(coalesce(status,''''))) like ''%acc%''
         or lower(trim(coalesce(status,''''))) like ''%terverifikasi%''' loop
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

grant execute on function public.get_keuangan_page_secured(text, int, int, text, text, text, text, text) to anon, authenticated, service_role;

-- ============================================================
-- 6) ASET — stok (tabel Aset) / riwayat (tabel Peminjaman)
-- ============================================================
create or replace function public.get_aset_page_secured(
  p_token     text,
  p_tab       text   default 'stok',
  p_page      int    default 1,
  p_page_size int    default 25,
  p_search    text   default ''
)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_role      text := public.auth_role(p_token);
  v_nik       text := '';
  v_user_kk   text := '';
  v_tab       text := lower(trim(coalesce(p_tab, 'stok')));
  v_rows      jsonb := '[]'::jsonb;
  v_all       jsonb := '[]'::jsonb;
  v_row       jsonb;
  v_owner     boolean;
  v_allow     boolean;
  v_needle    text;
  v_total     int := 0;
  v_page      int := greatest(1, coalesce(p_page, 1));
  v_page_size int := least(10000, greatest(1, coalesce(p_page_size, 25)));
  v_start     int := 0;
  v_page_rows jsonb := '[]'::jsonb;
begin
  if v_role is null then
    return jsonb_build_object('status','error','message','Sesi tidak valid. Silakan login ulang.');
  end if;
  if v_tab not in ('stok','riwayat') then
    return jsonb_build_object('status','error','message','Tab tidak dikenal: '||v_tab);
  end if;

  select coalesce(public._dec_data(nik),'') into v_nik
    from public."Sessions" where token = trim(p_token) limit 1;

  if v_nik <> '' then
    select coalesce(public._dec_data(no_kk),'') into v_user_kk
      from public."Warga" where nik_sha = public._sha(v_nik) limit 1;
  end if;

  if v_tab = 'stok' then
    -- Aset bukan tabel privat — warga melihat semua (konsisten v8)
    for v_row in execute 'select to_jsonb(t) from public."Aset" t' loop
      v_rows := v_rows || public._decrypt_row(v_row, true);
    end loop;
  else
    -- Peminjaman privat — warga hanya melihat miliknya
    for v_row in execute 'select to_jsonb(t) from public."Peminjaman" t' loop
      v_owner := public._row_owner_match(v_row, v_nik, '');
      v_allow := v_owner
              or (v_user_kk <> '' and lower(trim(coalesce(public._dec_data(v_row->>'no_kk'),''))) = lower(trim(v_user_kk)));
      if v_role <> 'RT' and not v_allow then continue; end if;
      v_rows := v_rows || public._decrypt_row(v_row, v_role = 'RT' or v_allow);
    end loop;
  end if;

  select coalesce(jsonb_agg(x), '[]'::jsonb) into v_all
    from (
      select value as x from jsonb_array_elements(v_rows) v
      order by (v.value->>'created_at')::timestamptz desc nulls last
    ) s;

  v_needle := lower(trim(coalesce(p_search, '')));
  v_needle := replace(replace(replace(v_needle, '\', '\\'), '%', '\%'), '_', '\_');
  if v_needle <> '' then
    select coalesce(jsonb_agg(x), '[]'::jsonb) into v_all
      from (
        select value as x from jsonb_array_elements(v_all) v
        where exists (
          select 1 from jsonb_each_text(v.value) kv
          where lower(coalesce(kv.value,'')) like '%' || v_needle || '%' escape '\'
        )
      ) s;
  end if;

  v_total := jsonb_array_length(v_all);
  v_start := (v_page - 1) * v_page_size;
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v_page_rows
    from (select value as x from jsonb_array_elements(v_all) v limit v_page_size offset v_start) s;

  return jsonb_build_object('status','success','tab', v_tab, 'data', v_page_rows, 'total', v_total,
    'page', v_page, 'page_size', v_page_size);
end $$;

grant execute on function public.get_aset_page_secured(text, text, int, int, text) to anon, authenticated, service_role;
