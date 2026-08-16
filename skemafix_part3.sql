CREATE FUNCTION public.get_aset_page_secured(p_token text, p_tab text DEFAULT 'stok'::text, p_page integer DEFAULT 1, p_page_size integer DEFAULT 25, p_search text DEFAULT ''::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION public.get_aset_page_secured(p_token text, p_tab text, p_page integer, p_page_size integer, p_search text) OWNER TO postgres;

--
-- Name: get_auth_nik(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_auth_nik() RETURNS text
    LANGUAGE sql STABLE
    AS $$
              SELECT COALESCE(
                  (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'user_nik'),
                      ''
                        );
                        $$;


ALTER FUNCTION public.get_auth_nik() OWNER TO postgres;

--
-- Name: get_auth_role(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_auth_role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  SELECT COALESCE(
      (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'user_role'),
          'Warga'
            );
            $$;


ALTER FUNCTION public.get_auth_role() OWNER TO postgres;

--
-- Name: get_bansos_page_secured(text, integer, integer, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_bansos_page_secured(p_token text, p_page integer DEFAULT 1, p_page_size integer DEFAULT 25, p_search text DEFAULT ''::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION public.get_bansos_page_secured(p_token text, p_page integer, p_page_size integer, p_search text) OWNER TO postgres;

--
-- Name: get_iuran_page_secured(text, integer, integer, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_iuran_page_secured(p_token text, p_page integer DEFAULT 1, p_page_size integer DEFAULT 25, p_search text DEFAULT ''::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION public.get_iuran_page_secured(p_token text, p_page integer, p_page_size integer, p_search text) OWNER TO postgres;

--
-- Name: get_keuangan_page_secured(text, integer, integer, text, text, text, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_keuangan_page_secured(p_token text, p_page integer DEFAULT 1, p_page_size integer DEFAULT 25, p_search text DEFAULT ''::text, p_periode text DEFAULT 'all'::text, p_date_from text DEFAULT ''::text, p_date_to text DEFAULT ''::text, p_order text DEFAULT 'newest'::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION public.get_keuangan_page_secured(p_token text, p_page integer, p_page_size integer, p_search text, p_periode text, p_date_from text, p_date_to text, p_order text) OWNER TO postgres;

--
-- Name: get_keuangan_summary_secured(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_keuangan_summary_secured(p_token text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION public.get_keuangan_summary_secured(p_token text) OWNER TO postgres;

--
-- Name: get_notifications_secured(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_notifications_secured(p_token text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
  v_role    text := public.auth_role(p_token);
  v_nik     text := '';
  v_nik_sha text := '';
  v_kk_sha  text := '';
  v_nama    text := '';
  v_rows    jsonb := '[]'::jsonb;
  v_row     jsonb;
  v_pesan   text;
  v_raw     text;
  v_st      text;
  v_stl     text;
  v_pending boolean;
  v_match   boolean;
  v_trunc   text;
  v_n       int := 0;
  v_max     int;
begin
  if v_role is null then
    return jsonb_build_object('status','error','message','Sesi tidak valid. Silakan login ulang.');
  end if;

  select coalesce(public._dec_data(nik),''), nik_sha into v_nik, v_nik_sha
    from public."Sessions" where token = trim(p_token) limit 1;
  v_nama := lower(trim(coalesce((select nama from public."Users" where nik_sha = v_nik_sha limit 1),'')));
  select coalesce(kk_sha,'') into v_kk_sha
    from public."Warga" where nik_sha = v_nik_sha limit 1;

  v_max := case when v_role = 'RT' then 200 else 100 end;

  -- PENGADUAN
  for v_row in
    select value from jsonb_array_elements(
      (select coalesce(jsonb_agg(to_jsonb(t) order by created_at desc), '[]'::jsonb) from public."Pengaduan" t)
    )
  loop
    if v_n >= v_max then exit; end if;
    v_st := coalesce(v_row->>'status','');
    v_stl := lower(v_st);
    v_pending := v_st = '' or v_stl like '%belum%' or v_stl like '%menunggu%' or v_stl like '%baru%' or v_stl like '%pending%';
    if v_role = 'RT' then
      v_rows := v_rows || jsonb_build_object('id', coalesce(v_row->>'id',''),
        'menu','Pengaduan',
        'pesan', 'Aduan ' || coalesce(v_row->>'jenis_aduan', v_row->>'jenis', 'Umum')
              || ' dari ' || coalesce(v_row->>'nama', v_row->>'nama_lengkap', v_row->>'pelapor', 'Warga')
              || ': (' || v_st || ')',
        'rawDate', coalesce(v_row->>'verified_at', v_row->>'created_at'));
      v_n := v_n + 1;
    else
      v_match := (v_row->>'nik_sha') = v_nik_sha
              or (coalesce(v_row->>'kk_sha','') <> '' and (v_row->>'kk_sha') = v_kk_sha)
              or (v_nama <> '' and lower(coalesce(v_row->>'nama', v_row->>'nama_lengkap', v_row->>'pelapor','')) like '%' || v_nama || '%');
      if v_match and not v_pending then
        v_rows := v_rows || jsonb_build_object('id', coalesce(v_row->>'id',''), 'menu','Pengaduan',
          'pesan', 'Status Aduan ' || coalesce(v_row->>'jenis_aduan', v_row->>'jenis', 'Aduan') || ': ' || v_st,
          'rawDate', coalesce(v_row->>'verified_at', v_row->>'created_at'));
        v_n := v_n + 1;
      end if;
    end if;
  end loop;

  -- SURAT PENGANTAR
  for v_row in
    select value from jsonb_array_elements(
      (select coalesce(jsonb_agg(to_jsonb(t) order by created_at desc), '[]'::jsonb) from public."SuratPengantar" t)
    )
  loop
    if v_n >= v_max then exit; end if;
    v_st := coalesce(v_row->>'status','');
    v_stl := lower(v_st);
    v_pending := v_st = '' or v_stl like '%belum%' or v_stl like '%menunggu%' or v_stl like '%baru%' or v_stl like '%pending%';
    if v_role = 'RT' then
      if v_pending then
        v_rows := v_rows || jsonb_build_object('id', coalesce(v_row->>'id',''),
          'menu','SuratPengantar',
          'pesan', 'Pengajuan ' || coalesce(v_row->>'jenis_surat', v_row->>'keperluan', v_row->>'jenis', 'Surat')
                || ' dari ' || coalesce(v_row->>'nama', v_row->>'nama_lengkap', v_row->>'pemohon', 'Warga'),
          'rawDate', coalesce(v_row->>'verified_at', v_row->>'created_at'));
        v_n := v_n + 1;
      end if;
    else
      v_match := (v_row->>'nik_sha') = v_nik_sha
              or (coalesce(v_row->>'kk_sha','') <> '' and (v_row->>'kk_sha') = v_kk_sha)
              or (v_nama <> '' and lower(coalesce(v_row->>'nama', v_row->>'nama_lengkap', v_row->>'pemohon','')) like '%' || v_nama || '%');
      if v_match and not v_pending then
        v_rows := v_rows || jsonb_build_object('id', coalesce(v_row->>'id',''), 'menu','SuratPengantar',
          'pesan', 'Surat Pengantar Anda: Status kini "' || v_st || '"',
          'rawDate', coalesce(v_row->>'verified_at', v_row->>'created_at'));
        v_n := v_n + 1;
      end if;
    end if;
  end loop;

  -- PEMINJAMAN
  for v_row in
    select value from jsonb_array_elements(
      (select coalesce(jsonb_agg(to_jsonb(t) order by created_at desc), '[]'::jsonb) from public."Peminjaman" t)
    )
  loop
    if v_n >= v_max then exit; end if;
    v_st := coalesce(v_row->>'status','');
    v_stl := lower(v_st);
    v_pending := v_st = '' or v_stl like '%menunggu%' or v_stl like '%belum%' or v_stl like '%baru%' or v_stl like '%pending%';
    if v_role = 'RT' then
      if v_pending then
        v_rows := v_rows || jsonb_build_object('id', coalesce(v_row->>'id',''), 'menu','Aset',
          'pesan', 'Pengajuan Pinjam ' || coalesce(v_row->>'nama_barang', v_row->>'nama_aset', v_row->>'barang','Aset')
                || ' (' || coalesce(v_row->>'jumlah', v_row->>'qty','1') || ' unit) dari '
                || coalesce(v_row->>'nama_peminjam', v_row->>'nama', v_row->>'peminjam','Warga'),
          'rawDate', coalesce(v_row->>'verified_at', v_row->>'created_at'));
        v_n := v_n + 1;
      end if;
    else
      v_match := (v_row->>'nik_sha') = v_nik_sha
              or (v_nama <> '' and lower(coalesce(v_row->>'nama_peminjam', v_row->>'nama', v_row->>'peminjam','')) like '%' || v_nama || '%');
      if v_match and not v_pending then
        v_rows := v_rows || jsonb_build_object('id', coalesce(v_row->>'id',''), 'menu','Aset',
          'pesan', 'Peminjaman ' || coalesce(v_row->>'nama_barang', v_row->>'nama_aset', v_row->>'barang','Barang') || ': ' || v_st,
          'rawDate', coalesce(v_row->>'verified_at', v_row->>'created_at'));
        v_n := v_n + 1;
      end if;
    end if;
  end loop;

  -- IURAN
  for v_row in
    select value from jsonb_array_elements(
      (select coalesce(jsonb_agg(to_jsonb(t) order by created_at desc), '[]'::jsonb) from public."Iuran" t)
    )
  loop
    if v_n >= v_max then exit; end if;
    v_st := coalesce(v_row->>'status','');
    v_stl := lower(v_st);
    if v_role = 'RT' then
      if v_stl like '%menunggu%' or v_stl like '%verifikasi%' then
        v_rows := v_rows || jsonb_build_object('id', coalesce(v_row->>'id',''), 'menu','Iuran',
          'pesan', 'Iuran ' || coalesce(v_row->>'bulan','') || ' ' || coalesce(v_row->>'tahun','')
                || ' dari ' || coalesce(v_row->>'nama', v_row->>'nama_lengkap','Warga') || ' perlu verifikasi',
          'rawDate', coalesce(v_row->>'verified_at', v_row->>'created_at'));
        v_n := v_n + 1;
      end if;
    else
      v_match := (v_row->>'nik_sha') = v_nik_sha
              or (coalesce(v_row->>'kk_sha','') <> '' and (v_row->>'kk_sha') = v_kk_sha)
              or (v_nama <> '' and lower(coalesce(v_row->>'nama', v_row->>'nama_lengkap','')) like '%' || v_nama || '%');
      if v_match then
        if v_stl = 'lunas' or (v_stl like '%lunas%' and v_stl not like '%belum%') then
          v_rows := v_rows || jsonb_build_object('id', coalesce(v_row->>'id',''), 'menu','Iuran',
            'pesan', 'Iuran ' || coalesce(v_row->>'bulan','') || ' telah LUNAS diverifikasi RT!',
            'rawDate', coalesce(v_row->>'verified_at', v_row->>'created_at'));
          v_n := v_n + 1;
        end if;
      end if;
    end if;
  end loop;

  -- SUMBANGAN
  for v_row in
    select value from jsonb_array_elements(
      (select coalesce(jsonb_agg(to_jsonb(t) order by created_at desc), '[]'::jsonb) from public."Sumbangan" t)
    )
  loop
    if v_n >= v_max then exit; end if;
    v_st := coalesce(v_row->>'status','');
    v_stl := lower(v_st);
    v_pending := v_st = '' or v_stl like '%belum%' or v_stl like '%menunggu%' or v_stl like '%baru%' or v_stl like '%pending%';
    if v_role = 'RT' then
      if v_pending then
        v_rows := v_rows || jsonb_build_object('id', coalesce(v_row->>'id',''), 'menu','Sumbangan',
          'pesan', 'Sumbangan Baru dari ' || coalesce(v_row->>'nama', v_row->>'nama_lengkap','Warga')
                || ' (' || (case when v_st = '' then 'Belum diverifikasi' else v_st end) || ')',
          'rawDate', coalesce(v_row->>'verified_at', v_row->>'created_at'));
        v_n := v_n + 1;
      end if;
    else
      v_match := (v_row->>'nik_sha') = v_nik_sha
              or (v_nama <> '' and lower(coalesce(v_row->>'nama', v_row->>'nama_lengkap','')) like '%' || v_nama || '%');
      if v_match and not v_pending then
        v_rows := v_rows || jsonb_build_object('id', coalesce(v_row->>'id',''), 'menu','Sumbangan',
          'pesan', 'Sumbangan Anda: ' || v_st,
          'rawDate', coalesce(v_row->>'verified_at', v_row->>'created_at'));
        v_n := v_n + 1;
      end if;
    end if;
  end loop;

  -- ASPIRASI
  for v_row in
    select value from jsonb_array_elements(
      (select coalesce(jsonb_agg(to_jsonb(t) order by created_at desc), '[]'::jsonb) from public."Aspirasi" t)
    )
  loop
    if v_n >= v_max then exit; end if;
    v_st := coalesce(v_row->>'status','');
    v_stl := lower(v_st);
    v_pending := v_st = '' or v_stl like '%baru%' or v_stl like '%menunggu%' or v_stl like '%belum%';
    v_trunc := coalesce(v_row->>'isi_aspirasi', v_row->>'isi', v_row->>'aspirasi', v_row->>'pesan', v_row->>'saran', 'Masukan baru');
    if octet_length(v_trunc) > 35 then v_trunc := left(v_trunc, 35) || '...'; end if;
    if v_role = 'RT' then
      if v_pending then
        v_rows := v_rows || jsonb_build_object('id', coalesce(v_row->>'id',''), 'menu','Aspirasi',
          'pesan', 'Aspirasi Anonim: "' || v_trunc || '"',
          'rawDate', coalesce(v_row->>'verified_at', v_row->>'created_at'));
        v_n := v_n + 1;
      end if;
    else
      if not v_pending then
        v_rows := v_rows || jsonb_build_object('id', coalesce(v_row->>'id',''), 'menu','Aspirasi',
          'pesan', 'Aspirasi Anda: ' || v_st,
          'rawDate', coalesce(v_row->>'verified_at', v_row->>'created_at'));
        v_n := v_n + 1;
      end if;
    end if;
  end loop;

  -- BANSOS
  for v_row in
    select value from jsonb_array_elements(
      (select coalesce(jsonb_agg(to_jsonb(t) order by created_at desc), '[]'::jsonb) from public."Bansos" t)
    )
  loop
    if v_n >= v_max then exit; end if;
    v_st := coalesce(v_row->>'status','');
    v_stl := lower(v_st);
    v_pending := v_st = '' or v_stl like '%belum%' or v_stl like '%kedaluwarsa%' or v_stl like '%menunggu%';
    if v_role = 'RT' then
      if v_pending then
        v_rows := v_rows || jsonb_build_object('id', coalesce(v_row->>'id',''), 'menu','Bansos',
          'pesan', 'Bansos ' || coalesce(v_row->>'jenis_bansos', v_row->>'jenis','Bansos') || ' untuk '
                || coalesce(v_row->>'nama', v_row->>'nama_lengkap','Warga') || ': ' || (case when v_st = '' then 'Belum Diambil' else v_st end),
          'rawDate', coalesce(v_row->>'created_at',''));
        v_n := v_n + 1;
      end if;
    else
      v_match := (v_row->>'nik_sha') = v_nik_sha
              or (coalesce(v_row->>'kk_sha','') <> '' and (v_row->>'kk_sha') = v_kk_sha)
              or (v_nama <> '' and lower(coalesce(v_row->>'nama', v_row->>'nama_lengkap','')) like '%' || v_nama || '%');
      if v_match then
        v_raw := case when v_stl like '%sudah%' and coalesce(v_row->>'diambil_pada','') <> ''
                  then v_row->>'diambil_pada' else coalesce(v_row->>'created_at','') end;
        v_rows := v_rows || jsonb_build_object('id', coalesce(v_row->>'id',''), 'menu','Bansos',
          'pesan', 'Bansos Anda (' || coalesce(v_row->>'jenis_bansos', v_row->>'jenis','Bansos') || '): ' || (case when v_st = '' then 'Belum Diambil' else v_st end),
          'rawDate', v_raw);
        v_n := v_n + 1;
      end if;
    end if;
  end loop;

  -- KELAHIRAN
  for v_row in
    select value from jsonb_array_elements(
      (select coalesce(jsonb_agg(to_jsonb(t) order by created_at desc), '[]'::jsonb) from public."Kelahiran" t)
    )
  loop
    if v_n >= v_max then exit; end if;
    if v_role = 'RT' then
      v_rows := v_rows || jsonb_build_object('id', coalesce(v_row->>'id',''), 'menu','Kelahiran',
        'pesan', 'Kelahiran baru: ' || coalesce(v_row->>'nama_bayi', v_row->>'nama','anak baru'),
        'rawDate', coalesce(v_row->>'created_at',''));
      v_n := v_n + 1;
    else
      v_match := (v_row->>'nik_sha') = v_nik_sha
              or (coalesce(v_row->>'kk_sha','') <> '' and (v_row->>'kk_sha') = v_kk_sha)
              or (v_nama <> '' and lower(coalesce(v_row->>'nama_bayi', v_row->>'nama_ayah', v_row->>'nama_ibu', v_row->>'nama','')) like '%' || v_nama || '%');
      if v_match then
        v_rows := v_rows || jsonb_build_object('id', coalesce(v_row->>'id',''), 'menu','Kelahiran',
          'pesan', 'Kelahiran: ' || coalesce(v_row->>'nama_bayi', v_row->>'nama','anak baru'),
          'rawDate', coalesce(v_row->>'created_at',''));
        v_n := v_n + 1;
      end if;
    end if;
  end loop;

  -- KEMATIAN
  for v_row in
    select value from jsonb_array_elements(
      (select coalesce(jsonb_agg(to_jsonb(t) order by created_at desc), '[]'::jsonb) from public."Kematian" t)
    )
  loop
    if v_n >= v_max then exit; end if;
    if v_role = 'RT' then
      v_rows := v_rows || jsonb_build_object('id', coalesce(v_row->>'id',''), 'menu','Kematian',
        'pesan', 'Kematian baru: ' || coalesce(v_row->>'nama', v_row->>'nama_lengkap','Warga'),
        'rawDate', coalesce(v_row->>'created_at',''));
      v_n := v_n + 1;
    else
      v_match := (v_row->>'nik_sha') = v_nik_sha
              or (v_nama <> '' and lower(coalesce(v_row->>'nama', v_row->>'nama_lengkap','')) like '%' || v_nama || '%');
      if v_match then
        v_rows := v_rows || jsonb_build_object('id', coalesce(v_row->>'id',''), 'menu','Kematian',
          'pesan', 'Kematian: ' || coalesce(v_row->>'nama', v_row->>'nama_lengkap','Warga'),
          'rawDate', coalesce(v_row->>'created_at',''));
        v_n := v_n + 1;
      end if;
    end if;
  end loop;

  -- PINDAH MASUK
  for v_row in
    select value from jsonb_array_elements(
      (select coalesce(jsonb_agg(to_jsonb(t) order by created_at desc), '[]'::jsonb) from public."PindahMasuk" t)
    )
  loop
    if v_n >= v_max then exit; end if;
    if v_role = 'RT' then
      v_rows := v_rows || jsonb_build_object('id', coalesce(v_row->>'id',''), 'menu','PindahMasuk',
        'pesan', 'Pindah masuk: ' || coalesce(v_row->>'nama', v_row->>'nama_lengkap','Warga') || ' dari ' || coalesce(v_row->>'asal','-'),
        'rawDate', coalesce(v_row->>'created_at',''));
      v_n := v_n + 1;
    else
      v_match := (v_row->>'nik_sha') = v_nik_sha
              or (v_nama <> '' and lower(coalesce(v_row->>'nama', v_row->>'nama_lengkap','')) like '%' || v_nama || '%');
      if v_match then
        v_rows := v_rows || jsonb_build_object('id', coalesce(v_row->>'id',''), 'menu','PindahMasuk',
          'pesan', 'Pindah masuk: ' || coalesce(v_row->>'nama', v_row->>'nama_lengkap','Warga') || ' dari ' || coalesce(v_row->>'asal','-'),
          'rawDate', coalesce(v_row->>'created_at',''));
        v_n := v_n + 1;
      end if;
    end if;
  end loop;

  -- PINDAH KELUAR
  for v_row in
    select value from jsonb_array_elements(
      (select coalesce(jsonb_agg(to_jsonb(t) order by created_at desc), '[]'::jsonb) from public."PindahKeluar" t)
    )
  loop
    if v_n >= v_max then exit; end if;
    if v_role = 'RT' then
      v_rows := v_rows || jsonb_build_object('id', coalesce(v_row->>'id',''), 'menu','PindahKeluar',
        'pesan', 'Pindah keluar: ' || coalesce(v_row->>'nama', v_row->>'nama_lengkap','Warga') || ' ke ' || coalesce(v_row->>'alamat_tujuan', v_row->>'tujuan','-'),
        'rawDate', coalesce(v_row->>'created_at',''));
      v_n := v_n + 1;
    else
      v_match := (v_row->>'nik_sha') = v_nik_sha
              or (v_nama <> '' and lower(coalesce(v_row->>'nama', v_row->>'nama_lengkap','')) like '%' || v_nama || '%');
      if v_match then
        v_rows := v_rows || jsonb_build_object('id', coalesce(v_row->>'id',''), 'menu','PindahKeluar',
          'pesan', 'Pindah keluar: ' || coalesce(v_row->>'nama', v_row->>'nama_lengkap','Warga') || ' ke ' || coalesce(v_row->>'alamat_tujuan', v_row->>'tujuan','-'),
          'rawDate', coalesce(v_row->>'created_at',''));
        v_n := v_n + 1;
      end if;
    end if;
  end loop;

  return jsonb_build_object('status','success','data', v_rows);
end $$;


ALTER FUNCTION public.get_notifications_secured(p_token text) OWNER TO postgres;

--
-- Name: get_real_database_stats(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_real_database_stats() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_total bigint := 0;
  v_t     text;
  v_n     bigint;
  v_mb    numeric;
BEGIN
  FOR v_t IN
    SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  LOOP
    BEGIN
      EXECUTE format('SELECT count(*) FROM public.%I', v_t) INTO v_n;
      v_total := v_total + coalesce(v_n, 0);
    EXCEPTION WHEN OTHERS THEN
      NULL; -- lewati tabel yang tidak bisa dihitung (mis. tanpa izin)
    END;
  END LOOP;
  SELECT (pg_database_size(current_database()) / 1024.0 / 1024.0)::numeric(12,2)
    INTO v_mb;
  RETURN jsonb_build_object(
    'total_mb', v_mb,
    'db_size_mb', v_mb,
    'total_rows', v_total
  );
END $$;


ALTER FUNCTION public.get_real_database_stats() OWNER TO postgres;

--
-- Name: get_server_time(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_server_time() RETURNS bigint
    LANGUAGE sql STABLE
    AS $$ SELECT (extract(epoch from now()) * 1000)::bigint $$;


ALTER FUNCTION public.get_server_time() OWNER TO postgres;

--
-- Name: get_sessions_secured(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_sessions_secured(p_token text) RETURNS TABLE(token text, nik text, role text, createdat text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
                                                DECLARE
                                                    v_role text := 'Warga';
                                                        v_nik text := '';
                                                        BEGIN
                                                            SELECT s.role, s.nik INTO v_role, v_nik 
                                                                FROM public."Sessions" s 
                                                                    WHERE TRIM(s.token) = TRIM(p_token) 
                                                                        LIMIT 1;

                                                                            IF v_role IS NULL AND v_nik IS NOT NULL AND v_nik != '' THEN
                                                                                    SELECT u.role INTO v_role 
                                                                                            FROM public."Users" u 
                                                                                                    WHERE LOWER(u.username) = LOWER(v_nik) OR LOWER(u.nik) = LOWER(v_nik) 
                                                                                                            LIMIT 1;
                                                                                                                END IF;

                                                                                                                    IF UPPER(COALESCE(v_role, '')) = 'RT' THEN
                                                                                                                            RETURN QUERY SELECT s.token, s.nik, s.role, s.createdat FROM public."Sessions" s;
                                                                                                                                ELSE
                                                                                                                                        RETURN QUERY SELECT s.token, s.nik, s.role, s.createdat FROM public."Sessions" s WHERE TRIM(s.token) = TRIM(p_token);
                                                                                                                                            END IF;
                                                                                                                                            END;
                                                                                                                                            $$;


ALTER FUNCTION public.get_sessions_secured(p_token text) OWNER TO postgres;

--
-- Name: get_table_page_secured(text, text, integer, integer, text, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_table_page_secured(p_token text, p_table text, p_page integer DEFAULT 1, p_page_size integer DEFAULT 25, p_search text DEFAULT ''::text, p_filter jsonb DEFAULT '{}'::jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
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