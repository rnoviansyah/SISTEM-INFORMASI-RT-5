
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


ALTER FUNCTION public.get_table_page_secured(p_token text, p_table text, p_page integer, p_page_size integer, p_search text, p_filter jsonb) OWNER TO postgres;

--
-- Name: get_usage_result(bigint); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_usage_result(p_request_id bigint) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    SET statement_timeout TO '0'
    AS $$
DECLARE
  v_status integer;
  v_body   text;
  v_err    text;
BEGIN
  IF p_request_id IS NULL THEN
    RETURN jsonb_build_object('status','error','message','request_id kosong.');
  END IF;
  BEGIN
    SELECT status_code, content, error_msg INTO v_status, v_body, v_err
      FROM net._http_response WHERE id = p_request_id;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      SELECT status_code, content, error_msg INTO v_status, v_body, v_err
        FROM extensions.net._http_response WHERE id = p_request_id;
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object('status','error','message','Tidak bisa membaca respons pg_net: ' || SQLERRM);
    END;
  END;
  IF v_status IS NULL AND v_err IS NULL THEN
    RETURN jsonb_build_object('status','pending');
  END IF;
  IF v_status = 200 THEN
    RETURN jsonb_build_object('status','success','http',200,'body', v_body);
  END IF;
  RETURN jsonb_build_object('status','error','message',
    'Management API ' || CASE WHEN v_status IS NOT NULL THEN ('HTTP ' || v_status || ' ') ELSE '(gagal terkirim) ' END
    || ': ' || coalesce(v_body, v_err, ''));
END $$;


ALTER FUNCTION public.get_usage_result(p_request_id bigint) OWNER TO postgres;

--
-- Name: get_usage_secured(text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_usage_secured(p_token text, p_org_slug text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    SET statement_timeout TO '0'
    AS $$
DECLARE
  v_role    text := public.auth_role(p_token);
  v_pat     text;
  v_slug    text;
  v_ref     text;
  v_url     text;
  v_headers jsonb;
  v_rid     bigint;
  v_rid2    bigint;
BEGIN
  IF v_role <> 'RT' THEN
    RETURN jsonb_build_object('status','error','message','Akses ditolak.');
  END IF;

  -- 1) PAT dari Vault (dibutuhkan semua jalur)
  BEGIN
    SELECT decrypted_secret INTO v_pat FROM vault.decrypted_secrets
      WHERE name = 'supabase_mgmt_pat' LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('status','error','message',
      'Vault belum siap: ' || SQLERRM || '. Aktifkan: create extension if not exists supabase_vault;');
  END;
  IF coalesce(v_pat,'') = '' THEN
    RETURN jsonb_build_object('status','error','message',
      'PAT belum disimpan di Vault. Buat di supabase.com -> Account -> Access Tokens, lalu: select vault.create_secret(''<PAT>'', ''supabase_mgmt_pat'');');
  END IF;

  v_headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'apikey', v_pat,
    'Authorization', 'Bearer ' || v_pat
  );

  -- 2) Ref project (dari storage_project_url yang sudah disimpan saat setup v3/v4)
  BEGIN
    SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets
      WHERE name = 'storage_project_url' LIMIT 1;
  EXCEPTION WHEN OTHERS THEN v_url := NULL; END;
  IF coalesce(v_url,'') <> '' THEN
    v_ref := substring(v_url FROM 'https://([a-z0-9]+)\\.supabase\\.co');
  END IF;

  -- 3) Slug organisasi: parameter -> Vault -> discovery
  v_slug := coalesce(nullif(trim(coalesce(p_org_slug,'')), ''));
  IF v_slug IS NULL OR v_slug = '' THEN
    BEGIN
      SELECT decrypted_secret INTO v_slug FROM vault.decrypted_secrets
        WHERE name = 'supabase_org_slug' LIMIT 1;
    EXCEPTION WHEN OTHERS THEN v_slug := NULL; END;
  END IF;

  -- 4) Mode discovery bila slug belum diketahui
  IF coalesce(v_slug,'') = '' THEN
    IF coalesce(v_ref,'') = '' THEN
      RETURN jsonb_build_object('status','error','message',
        'Ref project tidak terdeteksi. Simpan URL project di Vault: select vault.create_secret(''https://<REF>.supabase.co'', ''storage_project_url'');');
    END IF;
    BEGIN
      v_rid := net.http_get(
        url := 'https://api.supabase.com/v1/organizations',
        headers := v_headers,
        timeout_milliseconds := 15000
      );
      v_rid2 := net.http_get(
        url := 'https://api.supabase.com/v1/projects/' || v_ref,
        headers := v_headers,
        timeout_milliseconds := 15000
      );
    EXCEPTION WHEN OTHERS THEN
      BEGIN
        v_rid := extensions.net.http_get(
          url := 'https://api.supabase.com/v1/organizations',
          headers := v_headers,
          timeout_milliseconds := 15000
        );
        v_rid2 := extensions.net.http_get(
          url := 'https://api.supabase.com/v1/projects/' || v_ref,
          headers := v_headers,
          timeout_milliseconds := 15000
        );
      EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('status','error','message',
          'pg_net tidak tersedia: ' || SQLERRM || '. Aktifkan: create extension if not exists pg_net;');
      END;
    END;
    RETURN jsonb_build_object('status','needs_slug',
      'message','Slug organisasi belum diketahui — discovery.',
      'request_id_orgs', v_rid, 'request_id_project', v_rid2, 'ref', v_ref);
  END IF;

  -- 5) Antrekan GET usage organisasi
  BEGIN
    v_rid := net.http_get(
      url := 'https://api.supabase.com/v1/organizations/' || v_slug || '/usage',
      headers := v_headers,
      timeout_milliseconds := 15000
    );
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      v_rid := extensions.net.http_get(
        url := 'https://api.supabase.com/v1/organizations/' || v_slug || '/usage',
        headers := v_headers,
        timeout_milliseconds := 15000
      );
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object('status','error','message',
        'pg_net tidak tersedia: ' || SQLERRM || '. Aktifkan: create extension if not exists pg_net;');
    END;
  END;

  RETURN jsonb_build_object('status','success',
    'message','Permintaan statistik dikirim.',
    'request_id', v_rid, 'ref', v_ref, 'org_slug', v_slug);
END $$;

