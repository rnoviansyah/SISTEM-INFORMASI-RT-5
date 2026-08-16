-- ============================================================
-- SECURITY PATCH v10 — WARGA LIHAT SEMUA WARGA (INFO SENSITIF DISENSOR)
-- Jalankan di Supabase SQL Editor. Idempotent — aman dijalankan ulang.
--
-- APA MASALAHNYA:
--   Akun Warga (bukan RT) di menu Data Warga hanya melihat data keluarganya
--   sendiri — padahal seharusnya SEMUA warga/hunian tampil, dengan kolom
--   sensitif (NIK, No. KK, No. HP, tanggal & tempat lahir) disensor menjadi
--   ***RAHASIA*** untuk rumah lain (RT & pemilik data tetap melihat lengkap).
--
--   Ini terjadi karena fungsi RPC di database masih versi LAMA (sebelum
--   perilaku "lihat semua + sensor" ditambahkan). File ini menimpa
--   (CREATE OR REPLACE) fungsi-fungsi berikut dengan versi terbaru:
--
--     1. generic_select_secured        — jalur fallback / menu generik:
--                                        Warga lihat SEMUA baris Warga,
--                                        kolom sensitif disensor bila KK beda.
--     2. get_warga_page_secured        — pagination server-side (patch v9)
--                                        mode 'tabel' & 'rumah': sama, semua
--                                        baris/grup rumah dikembalikan untuk
--                                        role Warga, yang lain disensor.
--     3. get_warga_rumah_detail_secured— detail penghuni satu alamat (modal):
--                                        semua penghuni tampil (nama/alamat),
--                                        sensitif disensor untuk KK beda.
--
--   Prasyarat: patch v7 (enkripsi) sudah terpasang — fungsi _decrypt_row,
--   _dec_data, _sha, _row_owner_match, auth_role sudah ada. Bila belum,
--   jalankan dulu security_patch_v7_data_encryption.sql.
-- ============================================================

-- ------------------------------------------------------------
-- 1) GENERIC SELECT — Warga lihat semua warga, disensor bila KK beda
-- ------------------------------------------------------------
create or replace function public.generic_select_secured(p_table text, p_token text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_table   text := lower(trim(p_table));
  v_qname   text := public._qname(v_table);
  v_role    text := public.auth_role(p_token);
  v_nik     text := '';
  v_user_kk text := '';
  v_rows    jsonb := '[]'::jsonb;
  v_row     jsonb;
  v_private boolean;
  v_row_kk  text;
  v_row_nik text;
  v_allow   boolean;
begin
  if v_qname is null then
    return jsonb_build_object('status','error','message','Tabel tidak diizinkan: '||v_table);
  end if;

  if v_table = 'pengaturan' then
    for v_row in execute 'select to_jsonb(t) from public."Pengaturan" t' loop
      if (v_row->>'kunci') in ('gemini_api_key','password') then continue; end if;
      v_rows := v_rows || v_row;
    end loop;
    return jsonb_build_object('status','success','data', v_rows);
  end if;

  if v_role is null then
    return jsonb_build_object('status','error','message','Sesi tidak valid. Silakan login ulang.');
  end if;

  select coalesce(public._dec_data(nik),'') into v_nik
    from public."Sessions" where token = trim(p_token) limit 1;

  if v_nik <> '' then
    select coalesce(public._dec_data(no_kk),'') into v_user_kk
      from public."Warga"
     where nik_sha = public._sha(v_nik) limit 1;
  end if;

  -- Khusus tabel Warga: RT lihat full; Warga lihat semua warga tetapi disensor bila KK beda
  if v_table = 'warga' then
    for v_row in execute 'select to_jsonb(t) from public."Warga" t' loop
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
  end if;

  v_private := v_table in ('users','sessions','pengaduan','suratpengantar','peminjaman','sumbangan','iuran');

  for v_row in execute 'select to_jsonb(t) from ' || v_qname || ' t' loop
    if v_role = 'RT' then
      v_rows := v_rows || public._decrypt_row(v_row, true);
    elsif not v_private or public._row_owner_match(v_row, v_nik, '') then
      v_allow := public._row_owner_match(v_row, v_nik, '')
              or (v_user_kk <> '' and lower(trim(coalesce(public._dec_data(v_row->>'no_kk'),''))) = lower(trim(v_user_kk)));
      v_rows := v_rows || public._decrypt_row(v_row, v_allow);
    end if;
  end loop;

  if v_table = 'users' then
    select coalesce(jsonb_agg(x), '[]'::jsonb) into v_rows
      from (select v.value - 'password' as x from jsonb_array_elements(v_rows) v) s;
  end if;

  return jsonb_build_object('status','success','data', v_rows);
end $$;

grant execute on function public.generic_select_secured(text, text) to anon, authenticated, service_role;

-- ------------------------------------------------------------
-- 2) WARGA — pagination server-side (tabel & grup per rumah)
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 3) WARGA — detail penghuni satu alamat (modal rumah)
-- ------------------------------------------------------------
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
