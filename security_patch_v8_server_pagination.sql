-- ============================================================
-- SECURITY PATCH v8 — PAGINATION SERVER-SIDE (LIMIT/OFFSET di RPC)
-- Jalankan di Supabase SQL Editor SETELAH v7. Idempotent — aman dijalankan ulang.
--
-- APA YANG DILAKUKAN:
--   1. RPC baru get_table_page_secured(p_token, p_table, p_page, p_page_size, p_search, p_filter)
--      yang mengembalikan SATU halaman data (LIMIT/OFFSET) + total, dengan
--      keamanan IDENTIK dengan generic_select_secured v7 (validasi sesi & peran,
--      dekripsi at-rest v7, sensor warga beda KK, kolom password Users dibuang).
--   2. Frontend (menu generik TableRenderer + menu custom seperti Aspirasi) memakai
--      RPC ini: hanya 25 baris per halaman yang dikirim ke perangkat — hemat
--      bandwidth & memory, tidak lagi mengunduh SEMUA ribuan baris lalu di-slice.
--   3. p_search  = pencarian bebas (semua kolom, case-insensitive).
--   4. p_filter  = filter kolom per menu, format JSON {"nama_kolom": "nilai"}
--      (contoh: {"status": "Lunas"}) — ILIKE contains, diterapkan SETELAH
--      filter izin & dekripsi (kolom terenkripsi ikut dicari), SEBELUM LIMIT/OFFSET.
--      Dipakai untuk dropdown/filter menu custom tanpa mengunduh semua baris.
--
-- BACKWARD COMPATIBLE: bila file ini belum dijalankan, aplikasi otomatis
-- kembali ke mode lama (fetch semua + slice di klien) — tidak error.
-- ============================================================

-- Fungsi lama (5 argumen) diganti — di-drop dulu agar tidak ambigu di PostgREST,
-- lalu dibuat ulang versi 6 argumen (default di argumen 3-6 tetap bisa dipanggil
-- dengan argumen 3 saja; PostgREST memakai versi 6 argumen).
drop function if exists public.get_table_page_secured(text, text, int, int, text);

create or replace function public.get_table_page_secured(
  p_token     text,
  p_table     text,
  p_page      int    default 1,
  p_page_size int    default 25,
  p_search    text   default '',
  p_filter    jsonb  default '{}'::jsonb
)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_table      text := lower(trim(p_table));
  v_qname      text := public._qname(v_table);
  v_role       text := public.auth_role(p_token);
  v_nik        text := '';
  v_user_kk    text := '';
  v_rows       jsonb := '[]'::jsonb;
  v_all        jsonb := '[]'::jsonb;
  v_row        jsonb;
  v_private    boolean;
  v_row_kk     text;
  v_row_nik    text;
  v_allow      boolean;
  v_owner      boolean;
  v_needle     text;
  v_fkey       text;
  v_fval       text;
  v_total      int  := 0;
  v_page       int  := greatest(1, coalesce(p_page, 1));
  v_page_size  int  := least(100, greatest(1, coalesce(p_page_size, 25)));
  v_start      int  := 0;
  v_page_rows  jsonb := '[]'::jsonb;
begin
  if v_qname is null then
    return jsonb_build_object('status','error','message','Tabel tidak diizinkan: '||v_table);
  end if;

  -- Tabel Pengaturan: sama seperti generic_select_secured (tanpa paging)
  if v_table = 'pengaturan' then
    for v_row in execute 'select to_jsonb(t) from public."Pengaturan" t' loop
      if (v_row->>'kunci') in ('gemini_api_key','password') then continue; end if;
      v_rows := v_rows || v_row;
    end loop;
    return jsonb_build_object('status','success','data', v_rows, 'total', jsonb_array_length(v_rows));
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
  else
    v_private := v_table in ('users','sessions','pengaduan','suratpengantar','peminjaman','sumbangan','iuran');

    for v_row in execute 'select to_jsonb(t) from ' || v_qname || ' t' loop
      if v_role = 'RT' then
        v_rows := v_rows || public._decrypt_row(v_row, true);
      else
        v_owner := public._row_owner_match(v_row, v_nik, '');
        if not v_private or v_owner then
          v_allow := v_owner
                  or (v_user_kk <> '' and lower(trim(coalesce(public._dec_data(v_row->>'no_kk'),''))) = lower(trim(v_user_kk)));
          v_rows := v_rows || public._decrypt_row(v_row, v_allow);
        end if;
      end if;
    end loop;

    -- Users: buang kolom password SEBELUM dihitung/dikirim
    if v_table = 'users' then
      select coalesce(jsonb_agg(x), '[]'::jsonb) into v_rows
        from (select v.value - 'password' as x from jsonb_array_elements(v_rows) v) s;
    end if;
  end if;

  -- Urutkan: created_at terbaru dulu (konsisten dengan urutan list aplikasi)
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v_all
    from (
      select value as x
      from jsonb_array_elements(v_rows) v
      order by (v.value->>'created_at')::timestamptz desc nulls last
    ) s;

  -- Filter pencarian (semua nilai teks, case-insensitive)
  -- Aman: p_search dipakai sebagai PARAMETER (bukan disuntikkan ke SQL dinamis),
  -- dan berjalan SETELAH filter izin (RT semua / warga hanya punya sendiri).
  -- Karakter wildcard LIKE (% _ \) di-escape agar dicari apa adanya (literal),
  -- konsisten dengan perilaku pencarian lama di klien.
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

  -- Filter dropdown per menu (p_filter): {"kolom": "nilai"} — ILIKE contains,
  -- case-insensitive, wildcard di-escape (konsisten dengan pencarian). Diterapkan
  -- SETELAH filter izin & dekripsi, SEBELUM LIMIT/OFFSET. Aman: nama kolom & nilai
  -- dipakai sebagai PARAMETER (bukan disuntikkan ke SQL dinamis).
  for v_fkey, v_fval in
    select kv.key, kv.value from jsonb_each_text(coalesce(p_filter, '{}'::jsonb)) kv
  loop
    v_fval := lower(trim(coalesce(v_fval, '')));
    v_fval := replace(replace(replace(v_fval, '\', '\\'), '%', '\%'), '_', '\_');
    if v_fval <> '' then
      select coalesce(jsonb_agg(x), '[]'::jsonb) into v_all
        from (
          select value as x from jsonb_array_elements(v_all) v
          where lower(coalesce(v.value->>v_fkey, '')) like '%' || v_fval || '%' escape '\'
        ) s;
    end if;
  end loop;

  v_total := jsonb_array_length(v_all);
  v_start := (v_page - 1) * v_page_size;
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v_page_rows
    from (
      select value as x from jsonb_array_elements(v_all) v
      limit v_page_size offset v_start
    ) s;

  return jsonb_build_object('status','success','data', v_page_rows, 'total', v_total, 'page', v_page, 'page_size', v_page_size);
end $$;

grant execute on function public.get_table_page_secured(text, text, int, int, text, jsonb) to anon, authenticated, service_role;
