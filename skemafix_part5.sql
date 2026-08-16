
ALTER FUNCTION public.get_usage_secured(p_token text, p_org_slug text) OWNER TO postgres;

--
-- Name: get_usage_secured(text, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_usage_secured(p_token text, p_org_slug text DEFAULT NULL::text, p_ref text DEFAULT NULL::text) RETURNS jsonb
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

  -- Ref project: prioritas dari frontend (SUPABASE_URL), fallback Vault
  v_ref := coalesce(nullif(trim(coalesce(p_ref,'')), ''));
  IF v_ref IS NULL OR v_ref = '' THEN
    BEGIN
      SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets
        WHERE name = 'storage_project_url' LIMIT 1;
    EXCEPTION WHEN OTHERS THEN v_url := NULL; END;
    IF coalesce(v_url,'') <> '' THEN
      v_ref := split_part(split_part(v_url, '://', 2), '.', 1);
    END IF;
  END IF;

  -- Slug organisasi: parameter -> Vault -> discovery
  v_slug := coalesce(nullif(trim(coalesce(p_org_slug,'')), ''));
  IF v_slug IS NULL OR v_slug = '' THEN
    BEGIN
      SELECT decrypted_secret INTO v_slug FROM vault.decrypted_secrets
        WHERE name = 'supabase_org_slug' LIMIT 1;
    EXCEPTION WHEN OTHERS THEN v_slug := NULL; END;
  END IF;

  -- Mode discovery bila slug belum diketahui
  IF coalesce(v_slug,'') = '' THEN
    IF coalesce(v_ref,'') = '' THEN
      RETURN jsonb_build_object('status','error','message',
        'Ref project tidak terdeteksi. Cek SUPABASE_URL aplikasi atau simpan: select vault.create_secret(''https://<REF>.supabase.co'', ''storage_project_url'');');
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

  -- Antrekan GET usage organisasi
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


ALTER FUNCTION public.get_usage_secured(p_token text, p_org_slug text, p_ref text) OWNER TO postgres;

--
-- Name: get_users_secured(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_users_secured(p_token text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare v_rows jsonb;
begin
  if public.auth_role(p_token) <> 'RT' then
    return jsonb_build_object('status','error','message','Akses ditolak.');
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
           'username', username,
           'nik', public._dec_data(nik),
           'role', role,
           'nama', nama)), '[]'::jsonb)
    into v_rows from public."Users";
  return v_rows;
end $$;


ALTER FUNCTION public.get_users_secured(p_token text) OWNER TO postgres;

--
-- Name: get_warga_page_secured(text, text, integer, integer, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_warga_page_secured(p_token text, p_mode text DEFAULT 'tabel'::text, p_page integer DEFAULT 1, p_page_size integer DEFAULT 25, p_search text DEFAULT ''::text, p_status text DEFAULT ''::text) RETURNS jsonb
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


ALTER FUNCTION public.get_warga_page_secured(p_token text, p_mode text, p_page integer, p_page_size integer, p_search text, p_status text) OWNER TO postgres;

--
-- Name: get_warga_rumah_detail_secured(text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_warga_rumah_detail_secured(p_token text, p_alamat text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION public.get_warga_rumah_detail_secured(p_token text, p_alamat text) OWNER TO postgres;

--
-- Name: get_warga_secured(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_warga_secured(p_token text) RETURNS TABLE(id text, nama_lengkap text, nama_panggilan text, nik text, no_kk text, tempat_lahir text, tanggal_lahir text, jenis_kelamin text, alamat text, status_nikah text, status_tinggal text, pekerjaan text, no_hp text, foto_url text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
                                                        DECLARE
                                                            v_role text := 'Warga';
                                                                v_user_nik text := '';
                                                                    v_user_kk text := '';
                                                                    BEGIN
                                                                        -- Validasi role & NIK berdasarkan token sesi aktif di tabel Sessions
                                                                            SELECT s.role, s.nik INTO v_role, v_user_nik 
                                                                                FROM public."Sessions" s 
                                                                                    WHERE s.token = p_token 
                                                                                        LIMIT 1;

                                                                                            -- Ambil No KK milik pengguna yang sedang login
                                                                                                IF v_user_nik IS NOT NULL AND v_user_nik != '' THEN
                                                                                                        SELECT w.no_kk INTO v_user_kk FROM public."Warga" w WHERE w.nik = v_user_nik LIMIT 1;
                                                                                                            END IF;

                                                                                                                -- JIKA ROLE RT: Berikan data lengkap tanpa sensor
                                                                                                                    IF UPPER(COALESCE(v_role, '')) = 'RT' THEN
                                                                                                                            RETURN QUERY 
                                                                                                                                    SELECT w.id, w.nama_lengkap, w.nama_panggilan, w.nik, w.no_kk, 
                                                                                                                                                   w.tempat_lahir, w.tanggal_lahir, w.jenis_kelamin, w.alamat, 
                                                                                                                                                                  w.status_nikah, w.status_tinggal, w.pekerjaan, w.no_hp, w.foto_url 
                                                                                                                                                                          FROM public."Warga" w;
                                                                                                                                                                              ELSE
                                                                                                                                                                                      -- JIKA ROLE WARGA / ANONYMOUS:
                                                                                                                                                                                              -- Data 1 KK ditampilkan lengkap, data warga KK lain disensor otomatis dari Server
                                                                                                                                                                                                      RETURN QUERY 
                                                                                                                                                                                                              SELECT 
                                                                                                                                                                                                                          w.id,
                                                                                                                                                                                                                                      w.nama_lengkap,
                                                                                                                                                                                                                                                  w.nama_panggilan,
                                                                                                                                                                                                                                                              CASE 
                                                                                                                                                                                                                                                                              WHEN (v_user_nik != '' AND w.nik = v_user_nik) OR (v_user_kk != '' AND w.no_kk = v_user_kk) THEN w.nik
                                                                                                                                                                                                                                                                                              ELSE '***'
                                                                                                                                                                                                                                                                                                          END AS nik,
                                                                                                                                                                                                                                                                                                                      CASE 
                                                                                                                                                                                                                                                                                                                                      WHEN (v_user_nik != '' AND w.nik = v_user_nik) OR (v_user_kk != '' AND w.no_kk = v_user_kk) THEN w.no_kk
                                                                                                                                                                                                                                                                                                                                                      ELSE '***'
                                                                                                                                                                                                                                                                                                                                                                  END AS no_kk,
                                                                                                                                                                                                                                                                                                                                                                              CASE 
                                                                                                                                                                                                                                                                                                                                                                                              WHEN (v_user_nik != '' AND w.nik = v_user_nik) OR (v_user_kk != '' AND w.no_kk = v_user_kk) THEN w.tempat_lahir
                                                                                                                                                                                                                                                                                                                                                                                                              ELSE '***'
                                                                                                                                                                                                                                                                                                                                                                                                                          END AS tempat_lahir,
                                                                                                                                                                                                                                                                                                                                                                                                                                      CASE 
                                                                                                                                                                                                                                                                                                                                                                                                                                                      WHEN (v_user_nik != '' AND w.nik = v_user_nik) OR (v_user_kk != '' AND w.no_kk = v_user_kk) THEN w.tanggal_lahir
                                                                                                                                                                                                                                                                                                                                                                                                                                                                      ELSE '***'
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  END AS tanggal_lahir,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              w.jenis_kelamin,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          w.alamat,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      CASE 
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      WHEN (v_user_nik != '' AND w.nik = v_user_nik) OR (v_user_kk != '' AND w.no_kk = v_user_kk) THEN w.status_nikah
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      ELSE '***'
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  END AS status_nikah,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              w.status_tinggal,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          w.pekerjaan,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      CASE 
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      WHEN (v_user_nik != '' AND w.nik = v_user_nik) OR (v_user_kk != '' AND w.no_kk = v_user_kk) THEN w.no_hp
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      ELSE '****'
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  END AS no_hp,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              w.foto_url
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      FROM public."Warga" w;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          END IF;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          $$;


ALTER FUNCTION public.get_warga_secured(p_token text) OWNER TO postgres;

--
-- Name: is_rt(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_rt() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN (
      (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'RT' OR
          (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'RT'
            );
            END;
            $$;


ALTER FUNCTION public.is_rt() OWNER TO postgres;

--
-- Name: is_valid_rt(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_valid_rt(p_token text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
                BEGIN
                    RETURN EXISTS (
                        SELECT 1 FROM public."Sessions"
                        WHERE token = p_token AND role = 'RT'
                    );
                END;
                $$;


ALTER FUNCTION public.is_valid_rt(p_token text) OWNER TO postgres;

--
-- Name: login_secured(text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.login_secured(p_username text, p_password text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
  v_user public."Users"%rowtype;
  v_u text := lower(trim(coalesce(p_username,'')));
  v_p text := coalesce(p_password,'');
  v_token text := 'SESS-' || replace(gen_random_uuid()::text, '-', '');
  v_lock text;
begin
  if v_u = '' or v_p = '' then
    return jsonb_build_object('status','error','message','Username / NIK dan Password tidak boleh kosong!');
  end if;

  v_lock := public._login_lock_check(v_u);
  if v_lock is not null then
    return jsonb_build_object('status','error','message', v_lock);
  end if;

  select * into v_user from public."Users"
    where lower(trim(coalesce(username,''))) = v_u
       or nik_sha = public._sha(v_u)
       or public._sha(coalesce(nik,'')) = public._sha(v_u)
    limit 1;
  if not found then
    perform public._login_lock_fail(v_u);
    return jsonb_build_object('status','error','message','Akun tidak ditemukan.');
  end if;
  if not public._bcrypt_check(v_p, v_user.password) then
    perform public._login_lock_fail(v_u);
    return jsonb_build_object('status','error','message','Password salah.');
  end if;

  perform public._login_lock_clear(v_u);
  -- Bersihkan sesi lama user ini (maks 5 sesi aktif per akun)
  delete from public."Sessions"
   where nik_sha = public._sha(trim(coalesce(public._dec_data(v_user.nik),'')))
     and token not in (
       select token from public."Sessions"
        where nik_sha = public._sha(trim(coalesce(public._dec_data(v_user.nik),'')))
        order by created_at desc limit 4
     );

  insert into public."Sessions" (token, nik, nik_sha, role, createdat, created_at, expires_at)
  values (v_token,
          public._enc_data(trim(coalesce(public._dec_data(v_user.nik),''))),
          public._sha(trim(coalesce(public._dec_data(v_user.nik),''))),
          trim(coalesce(v_user.role,'Warga')),
          to_char(now(), 'YYYY-MM-DD HH24:MI:SS'), now(),
          now() + interval '30 days')
  on conflict (token) do nothing;

  return jsonb_build_object(
    'status','success',
    'token', v_token,
    'expires_at', (now() + interval '30 days')::text,
    'username', v_user.username,
    'role', v_user.role,
    'nik', public._dec_data(v_user.nik),
    'nama', v_user.nama
  );
end $$;


ALTER FUNCTION public.login_secured(p_username text, p_password text) OWNER TO postgres;

--
-- Name: save_session_secured(text, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.save_session_secured(p_token text, p_nik text, p_role text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
begin
  if p_token is null or trim(p_token) = '' then
    return jsonb_build_object('status','error','message','Token kosong.');
  end if;
  insert into public."Sessions" (token, nik, nik_sha, role, createdat, created_at, expires_at)
  values (trim(p_token),
          public._enc_data(trim(coalesce(p_nik,''))),
          public._sha(trim(coalesce(p_nik,''))),
          trim(coalesce(p_role,'Warga')),
          to_char(now(), 'YYYY-MM-DD HH24:MI:SS'), now(),
          now() + interval '30 days')
  on conflict (token) do update
    set nik = excluded.nik, nik_sha = excluded.nik_sha, role = excluded.role,
        createdat = excluded.createdat, created_at = excluded.created_at,
        expires_at = excluded.expires_at;
  return jsonb_build_object('status','success');
end $$;


ALTER FUNCTION public.save_session_secured(p_token text, p_nik text, p_role text) OWNER TO postgres;

--
-- Name: save_user_secured(text, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.save_user_secured(p_token text, p_data jsonb) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
                                                                                                                                                                                                                                                                                                                                                                                        DECLARE
                                                                                                                                                                                                                                                                                                                                                                                            v_role text := 'Warga';
                                                                                                                                                                                                                                                                                                                                                                                            BEGIN
                                                                                                                                                                                                                                                                                                                                                                                                SELECT s.role INTO v_role FROM public."Sessions" s WHERE TRIM(s.token) = TRIM(p_token) LIMIT 1;
                                                                                                                                                                                                                                                                                                                                                                                                    
                                                                                                                                                                                                                                                                                                                                                                                                        IF UPPER(COALESCE(v_role, '')) != 'RT' THEN
                                                                                                                                                                                                                                                                                                                                                                                                                RETURN json_build_object('status', 'error', 'message', 'Akses ditolak! Hanya RT yang diizinkan menambah user baru.');
                                                                                                                                                                                                                                                                                                                                                                                                                    END IF;

                                                                                                                                                                                                                                                                                                                                                                                                                        INSERT INTO public."Users" (id, username, password, role, nama, nik)
                                                                                                                                                                                                                                                                                                                                                                                                                            VALUES (
                                                                                                                                                                                                                                                                                                                                                                                                                                    COALESCE((p_data->>'id')::bigint, (extract(epoch from now())*1000)::bigint),
                                                                                                                                                                                                                                                                                                                                                                                                                                            p_data->>'username',
                                                                                                                                                                                                                                                                                                                                                                                                                                                    p_data->>'password',
                                                                                                                                                                                                                                                                                                                                                                                                                                                            COALESCE(p_data->>'role', 'Warga'),
                                                                                                                                                                                                                                                                                                                                                                                                                                                                    p_data->>'nama',
                                                                                                                                                                                                                                                                                                                                                                                                                                                                            p_data->>'nik'
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                );

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    RETURN json_build_object('status', 'success', 'message', 'Akun User berhasil didaftarkan!');
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    EXCEPTION WHEN OTHERS THEN
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        RETURN json_build_object('status', 'error', 'message', SQLERRM);
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        $$;


ALTER FUNCTION public.save_user_secured(p_token text, p_data jsonb) OWNER TO postgres;

--
-- Name: save_warga_secured(text, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.save_warga_secured(p_token text, p_data jsonb) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_role text := 'Warga';
    BEGIN
        SELECT s.role INTO v_role FROM public."Sessions" s WHERE TRIM(s.token) = TRIM(p_token) LIMIT 1;
            
                IF UPPER(COALESCE(v_role, '')) != 'RT' THEN
                        RETURN json_build_object('status', 'error', 'message', 'Akses ditolak! Hanya RT yang diizinkan menambah warga.');
                            END IF;

                                INSERT INTO public."Warga" (
                                        id, nama_lengkap, nama_panggilan, nik, no_kk, tempat_lahir, 
                                                tanggal_lahir, jenis_kelamin, alamat, status_nikah, status_tinggal, 
                                                        pekerjaan, no_hp, foto_url
                                                            ) VALUES (
                                                                    COALESCE(p_data->>'id', 'WAR-' || floor(random()*9000 + 1000)::text),
                                                                            p_data->>'nama_lengkap',
                                                                                    p_data->>'nama_panggilan',
                                                                                            p_data->>'nik',
                                                                                                    p_data->>'no_kk',
                                                                                                            p_data->>'tempat_lahir',
                                                                                                                    p_data->>'tanggal_lahir',
                                                                                                                            p_data->>'jenis_kelamin',
                                                                                                                                    p_data->>'alamat',
                                                                                                                                            p_data->>'status_nikah',
                                                                                                                                                    p_data->>'status_tinggal',
                                                                                                                                                            p_data->>'pekerjaan',
                                                                                                                                                                    p_data->>'no_hp',
                                                                                                                                                                            p_data->>'foto_url'
                                                                                                                                                                                );

                                                                                                                                                                                    RETURN json_build_object('status', 'success', 'message', 'Data Warga berhasil disimpan!');
                                                                                                                                                                                    EXCEPTION WHEN OTHERS THEN
                                                                                                                                                                                        RETURN json_build_object('status', 'error', 'message', SQLERRM);
                                                                                                                                                                                        END;
                                                                                                                                                                                        $$;


ALTER FUNCTION public.save_warga_secured(p_token text, p_data jsonb) OWNER TO postgres;

--
-- Name: storage_api_delete(text[]); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.storage_api_delete(p_paths text[]) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    SET statement_timeout TO '0'
    AS $$
DECLARE
  v_paths text[] := ARRAY[]::text[];
  v_p     text;
  v_key   text;
  v_iss   text;
  v_url   text;
  v_req   bigint;
BEGIN
  -- Filter path kosong
  FOREACH v_p IN ARRAY coalesce(p_paths, ARRAY[]::text[]) LOOP
    IF coalesce(trim(v_p),'') <> '' THEN
      v_paths := v_paths || trim(v_p);
    END IF;
  END LOOP;
  IF array_length(v_paths, 1) IS NULL THEN
    RETURN jsonb_build_object('status','success','message','Tidak ada file untuk dihapus.','queued',0,'request_id',NULL::bigint);
  END IF;

  -- 1) Ambil service_role key dari Vault
  BEGIN
    SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets
      WHERE name = 'storage_service_role' LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('status','error','message',
      'Vault belum siap: ' || SQLERRM || '. Aktifkan: create extension if not exists supabase_vault; lalu simpan key: select vault.create_secret(''<service_role_key>'', ''storage_service_role'');');
  END;
  IF coalesce(v_key,'') = '' THEN
    RETURN jsonb_build_object('status','error','message',
      'Service role key belum disimpan di Vault. Jalankan: select vault.create_secret(''<service_role_key>'', ''storage_service_role'');');
  END IF;

  -- 2) Tentukan URL project: prioritas dari Vault (storage_project_url),
  --    fallback dari klaim JWT request (iss = https://<ref>.supabase.co/auth/v1)
  BEGIN
    SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets
      WHERE name = 'storage_project_url' LIMIT 1;
  EXCEPTION WHEN OTHERS THEN v_url := NULL; END;
  IF coalesce(v_url,'') = '' OR position('http' IN v_url) <> 1 THEN
    v_iss := NULLIF(current_setting('request.jwt.claims', true), '');
    IF v_iss IS NOT NULL THEN
      BEGIN
        v_url := NULLIF(v_iss::jsonb ->> 'iss', '');
        IF v_url IS NOT NULL THEN v_url := replace(v_url, '/auth/v1', ''); END IF;
      EXCEPTION WHEN OTHERS THEN v_url := NULL; END;
    END IF;
  END IF;
  IF coalesce(v_url,'') <> '' THEN v_url := rtrim(v_url, '/'); END IF;
  IF coalesce(v_url,'') = '' OR position('http' IN v_url) <> 1 THEN
    RETURN jsonb_build_object('status','error','message',
      'URL project belum disimpan. Jalankan sekali di SQL Editor: select vault.create_secret(''https://<REF>.supabase.co'', ''storage_project_url'');');
  END IF;

  -- 3) Antrekan permintaan hapus massal ke Storage API via pg_net
  --    (request baru benar-benar dikirim setelah transaksi ini commit)
  BEGIN
    v_req := net.http_post(
      url := v_url || '/storage/v1/object/rt-media',
      body := jsonb_build_object('prefixes', v_paths),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', v_key,
        'Authorization', 'Bearer ' || v_key
      ),
      timeout_milliseconds := 15000,
      method := 'DELETE'
    );
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      v_req := extensions.net.http_post(
        url := v_url || '/storage/v1/object/rt-media',
        body := jsonb_build_object('prefixes', v_paths),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'apikey', v_key,
          'Authorization', 'Bearer ' || v_key
        ),
        timeout_milliseconds := 15000,
        method := 'DELETE'
      );
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object('status','error','message',
        'pg_net tidak tersedia: ' || SQLERRM || '. Aktifkan: create extension if not exists pg_net;');
    END;
  END;

  RETURN jsonb_build_object('status','success','message','Perintah hapus dikirim.',
    'queued', array_length(v_paths, 1), 'request_id', v_req);
END $$;


ALTER FUNCTION public.storage_api_delete(p_paths text[]) OWNER TO postgres;

--
-- Name: storage_get_delete_result(bigint); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.storage_get_delete_result(p_request_id bigint) RETURNS jsonb
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
    RETURN jsonb_build_object('status','success','http',200);
  END IF;
  RETURN jsonb_build_object('status','error','message',
    'Storage API ' || CASE WHEN v_status IS NOT NULL THEN '(HTTP ' || v_status || ')' ELSE '(gagal terkirim)' END
    || ': ' || coalesce(v_body, v_err, ''));
END $$;


ALTER FUNCTION public.storage_get_delete_result(p_request_id bigint) OWNER TO postgres;

--
-- Name: trg_users_hash_password(); Type: FUNCTION; Schema: public; Owner: postgres
