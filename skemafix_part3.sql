
ALTER FUNCTION public.delete_storage_files_secured(p_token text, p_password text, p_paths text[]) OWNER TO postgres;

--
-- Name: delete_user_secured(text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.delete_user_secured(p_token text, p_username text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            DECLARE
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                v_role text := 'Warga';
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                BEGIN
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    SELECT s.role INTO v_role FROM public."Sessions" s WHERE TRIM(s.token) = TRIM(p_token) LIMIT 1;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            IF UPPER(COALESCE(v_role, '')) != 'RT' THEN
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    RETURN json_build_object('status', 'error', 'message', 'Akses ditolak! Hanya RT yang diizinkan menghapus user.');
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        END IF;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            DELETE FROM public."Users" WHERE LOWER(username) = LOWER(p_username);

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                RETURN json_build_object('status', 'success', 'message', 'Akun User berhasil dihapus!');
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                EXCEPTION WHEN OTHERS THEN
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    RETURN json_build_object('status', 'error', 'message', SQLERRM);
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    $$;


ALTER FUNCTION public.delete_user_secured(p_token text, p_username text) OWNER TO postgres;

--
-- Name: delete_warga_secured(text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.delete_warga_secured(p_token text, p_id text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
                                                                                                                                                                                                                                                                                                                                                DECLARE
                                                                                                                                                                                                                                                                                                                                                    v_role text := 'Warga';
                                                                                                                                                                                                                                                                                                                                                    BEGIN
                                                                                                                                                                                                                                                                                                                                                        SELECT s.role INTO v_role FROM public."Sessions" s WHERE TRIM(s.token) = TRIM(p_token) LIMIT 1;
                                                                                                                                                                                                                                                                                                                                                            
                                                                                                                                                                                                                                                                                                                                                                IF UPPER(COALESCE(v_role, '')) != 'RT' THEN
                                                                                                                                                                                                                                                                                                                                                                        RETURN json_build_object('status', 'error', 'message', 'Akses ditolak! Hanya RT yang diizinkan menghapus data warga.');
                                                                                                                                                                                                                                                                                                                                                                            END IF;

                                                                                                                                                                                                                                                                                                                                                                                DELETE FROM public."Warga" WHERE id = p_id OR nik = p_id;

                                                                                                                                                                                                                                                                                                                                                                                    RETURN json_build_object('status', 'success', 'message', 'Data Warga berhasil dihapus!');
                                                                                                                                                                                                                                                                                                                                                                                    EXCEPTION WHEN OTHERS THEN
                                                                                                                                                                                                                                                                                                                                                                                        RETURN json_build_object('status', 'error', 'message', SQLERRM);
                                                                                                                                                                                                                                                                                                                                                                                        END;
                                                                                                                                                                                                                                                                                                                                                                                        $$;


ALTER FUNCTION public.delete_warga_secured(p_token text, p_id text) OWNER TO postgres;

--
-- Name: generic_delete_secured(text, text, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generic_delete_secured(p_table text, p_token text, p_id_col text, p_id_val text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $_$
declare v_qname text := public._qname(p_table);
begin
  if v_qname is null then
    return jsonb_build_object('status','error','message','Tabel tidak diizinkan.');
  end if;
  if public.auth_role(p_token) <> 'RT' then
    return jsonb_build_object('status','error','message','Akses ditolak: hanya RT yang boleh menghapus data.');
  end if;
  if lower(trim(p_id_col)) in ('nik','no_kk') then
    execute 'DELETE FROM ' || v_qname || ' WHERE ' || quote_ident(lower(trim(p_id_col))||'_sha') || ' = $1'
      using public._sha(p_id_val);
  else
    execute 'DELETE FROM ' || v_qname || ' WHERE ' || quote_ident(p_id_col) || ' = $1'
      using p_id_val;
  end if;
  return jsonb_build_object('status','success','message','Data berhasil dihapus!');
end $_$;


ALTER FUNCTION public.generic_delete_secured(p_table text, p_token text, p_id_col text, p_id_val text) OWNER TO postgres;

--
-- Name: generic_insert_secured(text, text, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generic_insert_secured(p_table text, p_token text, p_row jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $_$
declare
  v_table  text := lower(trim(p_table));
  v_qname  text := public._qname(v_table);
  v_role   text := public.auth_role(p_token);
  v_nik    text := '';
  v_nama   text := '';
  v_clean  jsonb;
  v_status text;
  v_default_status text;
  v_status_whitelist text[] := array['baru','menunggu verifikasi','diajukan','pending','belum di verifikasi','belum diverifikasi'];
  v_allow_warga boolean;
begin
  if v_qname is null then
    return jsonb_build_object('status','error','message','Tabel tidak diizinkan: '||v_table);
  end if;
  if v_role is null then
    return jsonb_build_object('status','error','message','Sesi tidak valid. Silakan login ulang.');
  end if;
  if v_table in ('users','sessions','warga','pengaturan','keuangan','aset','bansos') AND v_role <> 'RT' then
    return jsonb_build_object('status','error','message','Akses ditolak: operasi ini hanya untuk RT.');
  end if;

  v_allow_warga := v_table in ('pengaduan','suratpengantar','peminjaman','sumbangan','iuran','aspirasi');

  if v_role <> 'RT' then
    if not v_allow_warga then
      return jsonb_build_object('status','error','message','Akses ditolak: operasi ini hanya untuk RT.');
    end if;
    -- Nik diambil dari Sessions (pemilik sesi), nama dari Users — dikualifikasi
    -- agar tidak ambigu: kedua tabel sama-sama punya kolom nik.
    select coalesce(public._dec_data(s.nik),''), coalesce(public._dec_data(u.nama),'')
      into v_nik, v_nama
      from public."Sessions" s
      left join public."Users" u on u.nik_sha = s.nik_sha
      where s.token = trim(p_token) limit 1;
  end if;

  -- Buang kolom yang tidak boleh di-set klien; created_at dipaksa server
  v_clean := public._normalize_row(p_row, v_qname);
  v_clean := v_clean - 'created_at' - 'verified_at' - 'nik_sha' - 'kk_sha';

  if v_role <> 'RT' then
    -- Paksa kepemilikan: nik = nik sesi (Aspirasi anonim dikecualikan)
    if v_table <> 'aspirasi' and public._col_exists(v_qname, 'nik') then
      v_clean := v_clean || jsonb_build_object('nik', v_nik);
    end if;
    -- Paksa nama = nama sesi bila tersedia (cegah spoof nama orang lain)
    if v_nama <> '' and public._col_exists(v_qname, 'nama') then
      v_clean := v_clean || jsonb_build_object('nama', v_nama);
    end if;
    -- Paksa status awal (v13): "Belum di verifikasi" untuk menu aduan/surat/sumbangan
    v_default_status := case v_table
      when 'peminjaman' then 'Menunggu Verifikasi'
      when 'iuran'      then 'Menunggu Verifikasi'
      when 'aspirasi'   then 'Baru'
      else 'Belum di verifikasi' end;
    if public._col_exists(v_qname, 'status') then
      v_status := lower(trim(coalesce(v_clean->>'status','')));
      if v_status = '' or not (v_status = any(v_status_whitelist)) then
        v_status := v_default_status;
      else
        -- Kanonik (bukan initcap yang jadi "Belum Di Verifikasi"):
        -- semua sinonim pending diseragamkan menjadi "Belum di verifikasi"
        -- (searched CASE + IN — PL/pgSQL tidak menerima daftar nilai di WHEN)
        v_status := case
          when v_status = 'menunggu verifikasi' then 'Menunggu Verifikasi'
          when v_status in ('baru','belum di verifikasi','belum diverifikasi','diajukan','pending') then 'Belum di verifikasi'
          else initcap(v_status) end;
      end if;
      v_clean := jsonb_set(v_clean, '{status}', to_jsonb(v_status));
    end if;
  end if;

  v_clean := public._encrypt_row(v_clean);
  v_clean := v_clean || jsonb_build_object('created_at', to_jsonb(now()));
  execute 'INSERT INTO ' || v_qname || ' SELECT * FROM jsonb_populate_record(NULL::' || v_qname || ', $1)'
    using v_clean;
  return jsonb_build_object('status','success','message','Data berhasil disimpan!');
end $_$;


ALTER FUNCTION public.generic_insert_secured(p_table text, p_token text, p_row jsonb) OWNER TO postgres;

--
-- Name: generic_select_secured(text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generic_select_secured(p_table text, p_token text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION public.generic_select_secured(p_table text, p_token text) OWNER TO postgres;

--
-- Name: generic_update_secured(text, text, text, text, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generic_update_secured(p_table text, p_token text, p_id_col text, p_id_val text, p_row jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $_$
declare
  v_table  text := lower(trim(p_table));
  v_qname  text := public._qname(v_table);
  v_role   text := public.auth_role(p_token);
  v_nik    text := '';
  v_clean  jsonb;
  v_set    text := '';
  v_k      text; v_v jsonb; v_val text;
  v_row    jsonb;
  v_where  text;
  v_use_sha boolean;
  v_status_whitelist text[] := array['baru','menunggu verifikasi','diajukan','pending','belum di verifikasi','belum diverifikasi'];
begin
  if v_qname is null then
    return jsonb_build_object('status','error','message','Tabel tidak diizinkan: '||v_table);
  end if;
  if v_role is null then
    return jsonb_build_object('status','error','message','Sesi tidak valid. Silakan login ulang.');
  end if;
  if p_id_col is null or p_id_val is null then
    return jsonb_build_object('status','error','message','Parameter id tidak lengkap.');
  end if;

  v_use_sha := lower(trim(p_id_col)) in ('nik','no_kk');
  if v_use_sha then
    v_where := quote_ident(lower(trim(p_id_col)) || '_sha') || ' = $1';
  else
    v_where := quote_ident(p_id_col) || ' = $1';
  end if;

  if v_role <> 'RT' then
    if v_table in ('users','sessions','warga','pengaturan') then
      return jsonb_build_object('status','error','message','Akses ditolak: operasi ini hanya untuk RT.');
    elsif v_table in ('pengaduan','suratpengantar','peminjaman','sumbangan','iuran','aspirasi') then
      select coalesce(public._dec_data(nik),'') into v_nik
        from public."Sessions" where token = trim(p_token) limit 1;
      execute 'select to_jsonb(t) from ' || v_qname || ' t where ' || v_where || ' limit 1'
        into v_row
        using case when v_use_sha then public._sha(p_id_val) else p_id_val end;
      if not public._row_owner_match(v_row, v_nik, '') then
        return jsonb_build_object('status','error','message','Akses ditolak: data bukan milik Anda.');
      end if;
    else
      return jsonb_build_object('status','error','message','Akses ditolak: operasi ini hanya untuk RT.');
    end if;
  end if;

  v_clean := public._normalize_row(p_row, v_qname);
  for v_k, v_v in select lower(key), value from jsonb_each(v_clean) loop
    if lower(v_k) = lower(trim(p_id_col)) then continue; end if;
    if lower(v_k) in ('created_at','verified_at','nik_sha','kk_sha') then continue; end if;

    -- Temuan audit #2: Warga tidak boleh mengubah kolom kepemilikan / status final
    if v_role <> 'RT' then
      if lower(v_k) in ('nik','no_kk') then
        continue; -- kepemilikan tidak bisa dipindah
      end if;
      if lower(v_k) = 'status' then
        v_val := lower(trim(coalesce(v_v#>>'{}','')));
        if v_val = '' or not (v_val = any(v_status_whitelist)) then
          return jsonb_build_object('status','error','message',
            'Akses ditolak: perubahan status ke "' || coalesce(v_v#>>'{}','') || '" hanya bisa dilakukan RT.');
        end if;
      end if;
    end if;

    v_val := v_v#>>'{}';
    if lower(v_k) in ('nik','no_kk','no_hp','tanggal_lahir','tempat_lahir') then
      v_val := public._enc_data(v_val);
    end if;
    if v_set <> '' then v_set := v_set || ', '; end if;
    v_set := v_set || quote_ident(v_k) || ' = ' || coalesce(quote_literal(v_val), 'NULL');
    if lower(v_k) = 'nik' then
      v_set := v_set || ', nik_sha = ' || quote_literal(public._sha(coalesce(v_v#>>'{}','')));
    elsif lower(v_k) = 'no_kk' then
      v_set := v_set || ', kk_sha = ' || quote_literal(public._sha(coalesce(v_v#>>'{}','')));
    end if;
  end loop;

  -- Catat waktu verifikasi saat RT mengubah status record
  if v_role = 'RT' and (p_row ? 'status' or p_row ? 'Status')
     and public._col_exists(v_qname, 'verified_at') then
    declare
      v_old_status text;
    begin
      execute 'select coalesce(status::text,'''') from ' || v_qname
              || ' where ' || v_where || ' limit 1'
        into v_old_status
        using case when v_use_sha then public._sha(p_id_val) else p_id_val end;
      if lower(trim(coalesce(v_old_status, '')))
         is distinct from lower(trim(coalesce(p_row->>'status', p_row->>'Status', ''))) then
        if v_set <> '' then v_set := v_set || ', '; end if;
        v_set := v_set || 'verified_at = now()';
      end if;
    end;
  end if;

  if v_set = '' then
    return jsonb_build_object('status','error','message','Tidak ada kolom yang diubah.');
  end if;
  execute 'UPDATE ' || v_qname || ' SET ' || v_set || ' WHERE ' || v_where
    using case when v_use_sha then public._sha(p_id_val) else p_id_val end;
  return jsonb_build_object('status','success','message','Data berhasil diperbarui!');
end $_$;


ALTER FUNCTION public.generic_update_secured(p_table text, p_token text, p_id_col text, p_id_val text, p_row jsonb) OWNER TO postgres;

--
-- Name: get_aset_page_secured(text, text, integer, integer, text); Type: FUNCTION; Schema: public; Owner: postgres
--

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

