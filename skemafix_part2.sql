
ALTER FUNCTION pgbouncer.get_auth(p_usename text) OWNER TO supabase_admin;

--
-- Name: _bansos_expired_ts(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public._bansos_expired_ts(p_val text) RETURNS timestamp with time zone
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public', 'pg_temp'
    AS $_$
begin
  if p_val is null or trim(p_val) = '' or p_val = '-' then return null; end if;
  if p_val ~ '^\d{4}-\d{2}-\d{2}$' then
    return (p_val || ' 23:59:59')::timestamp at time zone 'Asia/Jakarta';
  end if;
  begin
    return (replace(p_val, ' ', 'T'))::timestamp at time zone 'Asia/Jakarta';
  exception when others then return null; end;
end $_$;


ALTER FUNCTION public._bansos_expired_ts(p_val text) OWNER TO postgres;

--
-- Name: _bcrypt_check(text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public._bcrypt_check(p_password text, p_hash text) RETURNS boolean
    LANGUAGE sql
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
  select p_hash is not null and p_hash <> '' and
         crypt(public._bcrypt_limit(coalesce(p_password,'')), p_hash) = p_hash;
$$;


ALTER FUNCTION public._bcrypt_check(p_password text, p_hash text) OWNER TO postgres;

--
-- Name: _bcrypt_hash(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public._bcrypt_hash(p_password text) RETURNS text
    LANGUAGE sql
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
  select crypt(public._bcrypt_limit(p_password), gen_salt('bf', 10));
$$;


ALTER FUNCTION public._bcrypt_hash(p_password text) OWNER TO postgres;

--
-- Name: _bcrypt_limit(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public._bcrypt_limit(p_password text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
  select case when octet_length(coalesce(p_password,'')) > 72
    then convert_from(substring(convert_to(coalesce(p_password,''), 'UTF8') from 1 for 72), 'UTF8')
    else coalesce(p_password,'') end;
$$;


ALTER FUNCTION public._bcrypt_limit(p_password text) OWNER TO postgres;

--
-- Name: _col_exists(text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public._col_exists(p_qname text, p_col text) RETURNS boolean
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE v_tab text;
BEGIN
  v_tab := substring(p_qname from '"(.*)"');
  PERFORM 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND lower(table_name) = lower(v_tab)
      AND lower(column_name) = lower(p_col);
  RETURN FOUND;
END $$;


ALTER FUNCTION public._col_exists(p_qname text, p_col text) OWNER TO postgres;

--
-- Name: _dec_data(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public._dec_data(p_cipher text) RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
declare v_key text; v_out text; v_bin bytea;
begin
  if p_cipher is null or p_cipher = '' then return p_cipher; end if;
  -- bukan ciphertext pgp -> kembalikan apa adanya (plaintext lama / placeholder)
  if not public._is_enc(p_cipher) then return p_cipher; end if;
  select decrypted_secret into v_key
    from vault.decrypted_secrets where name = 'data_enc_key' limit 1;
  if v_key is null then return p_cipher; end if;
  begin
    if left(p_cipher, 2) = '\x' then
      -- format hex bytea lama (bug rilis pertama): '\x...' -> decode ke bytea
      v_bin := decode(substring(p_cipher from 3), 'hex');
    else
      -- format armor '-----BEGIN PGP MESSAGE-----'
      v_bin := dearmor(p_cipher);
    end if;
    v_out := pgp_sym_decrypt(v_bin, v_key);
    return v_out;
  exception when others then
    return p_cipher; -- gagal dekripsi: kembalikan mentah
  end;
end $$;


ALTER FUNCTION public._dec_data(p_cipher text) OWNER TO postgres;

--
-- Name: _decrypt_row(jsonb, boolean); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public._decrypt_row(p_row jsonb, p_allowed boolean) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
declare v_out jsonb := p_row; k text; v_val text;
begin
  if p_row is null then return p_row; end if;
  for k in select jsonb_object_keys(p_row) loop
    if lower(k) in ('nik_sha','kk_sha') then
      v_out := v_out - k;
    elsif lower(k) in ('nik','no_kk','no_hp','tanggal_lahir','tempat_lahir')
       and jsonb_typeof(p_row -> k) = 'string' then
      v_val := p_row ->> k;
      if p_allowed then
        v_out := jsonb_set(v_out, array[k], to_jsonb(coalesce(public._dec_data(v_val), '')));
      elsif public._is_enc(coalesce(v_val,'')) then
        v_out := jsonb_set(v_out, array[k], '"***RAHASIA***"'::jsonb);
      end if;
    end if;
  end loop;
  return v_out;
end $$;


ALTER FUNCTION public._decrypt_row(p_row jsonb, p_allowed boolean) OWNER TO postgres;

--
-- Name: _enc_data(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public._enc_data(p_plain text) RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
declare v_key text;
begin
  if p_plain is null or p_plain = '' then return p_plain; end if;
  -- jangan enkripsi ulang nilai yang sudah ciphertext / placeholder sensor
  if public._is_enc(p_plain) or p_plain = '***RAHASIA***' then return p_plain; end if;
  select decrypted_secret into v_key
    from vault.decrypted_secrets where name = 'data_enc_key' limit 1;
  if v_key is null then return p_plain; end if;
  -- PENTING: pgp_sym_encrypt mengembalikan bytea. Tanpa armor(), bytea
  -- yang di-cast ke text tersimpan sebagai hex '\x...' yang tidak bisa
  -- didekripsi ulang. armor() membungkusnya jadi teks armor
  -- '-----BEGIN PGP MESSAGE-----' (nama fungsi resmi pgcrypto: armor/dearmor,
  -- BUKAN pgp_armor/pgp_dearmor).
  return armor(pgp_sym_encrypt(p_plain::text, v_key));
end $$;


ALTER FUNCTION public._enc_data(p_plain text) OWNER TO postgres;

--
-- Name: _encrypt_row(jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public._encrypt_row(p_row jsonb) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
declare
  v_out jsonb := p_row;
  v_nik text; v_kk text;
  k text;
begin
  if p_row is null or p_row = '{}'::jsonb then return p_row; end if;
  for k in select jsonb_object_keys(p_row) loop
    if lower(k) in ('nik','no_kk','no_hp','tanggal_lahir','tempat_lahir')
       and jsonb_typeof(p_row -> k) = 'string' then
      v_out := jsonb_set(v_out, array[k], to_jsonb(public._enc_data(p_row ->> k)));
    end if;
  end loop;
  v_nik := lower(trim(coalesce(p_row ->> 'nik', '')));
  if v_nik <> '' then
    v_out := v_out || jsonb_build_object('nik_sha', public._sha(v_nik));
  end if;
  v_kk := lower(trim(coalesce(p_row ->> 'no_kk', '')));
  if v_kk <> '' then
    v_out := v_out || jsonb_build_object('kk_sha', public._sha(v_kk));
  end if;
  return v_out;
end $$;


ALTER FUNCTION public._encrypt_row(p_row jsonb) OWNER TO postgres;

--
-- Name: _is_enc(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public._is_enc(p_val text) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $$
  select p_val is not null and (left(p_val, 5) = '-----' or left(p_val, 2) = '\x');
$$;


ALTER FUNCTION public._is_enc(p_val text) OWNER TO postgres;

--
-- Name: _is_image_base64(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public._is_image_base64(p_b64 text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare v_bytes bytea;
begin
  if p_b64 is null or p_b64 = '' then return false; end if;
  begin
    v_bytes := decode(substring(p_b64 from 1 for 16), 'base64');
  exception when others then return false; end;
  if octet_length(v_bytes) >= 3 and get_byte(v_bytes,0) = 255 and get_byte(v_bytes,1) = 216 and get_byte(v_bytes,2) = 255 then return true; end if; -- JPEG
  if octet_length(v_bytes) >= 4 and get_byte(v_bytes,0) = 137 and get_byte(v_bytes,1) = 80 and get_byte(v_bytes,2) = 78 and get_byte(v_bytes,3) = 71 then return true; end if; -- PNG
  if octet_length(v_bytes) >= 4 and get_byte(v_bytes,0) = 71 and get_byte(v_bytes,1) = 73 and get_byte(v_bytes,2) = 70 and get_byte(v_bytes,3) = 56 then return true; end if; -- GIF
  if octet_length(v_bytes) >= 2 and get_byte(v_bytes,0) = 66 and get_byte(v_bytes,1) = 77 then return true; end if; -- BMP
  if octet_length(v_bytes) >= 12 and get_byte(v_bytes,0) = 82 and get_byte(v_bytes,1) = 73 and get_byte(v_bytes,2) = 70 and get_byte(v_bytes,3) = 70
     and get_byte(v_bytes,8) = 87 and get_byte(v_bytes,9) = 69 and get_byte(v_bytes,10) = 66 and get_byte(v_bytes,11) = 80 then return true; end if; -- WebP
  return false;
end $$;


ALTER FUNCTION public._is_image_base64(p_b64 text) OWNER TO postgres;

--
-- Name: _keuangan_ts(text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public._keuangan_ts(p_tanggal text, p_created_at text) RETURNS timestamp with time zone
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public', 'pg_temp'
    AS $$
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


ALTER FUNCTION public._keuangan_ts(p_tanggal text, p_created_at text) OWNER TO postgres;

--
-- Name: _login_lock_check(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public._login_lock_check(p_username text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare v_locked_until timestamptz;
begin
  select locked_until into v_locked_until from public."LoginAttempts"
    where username = lower(trim(coalesce(p_username,''))) limit 1;
  if v_locked_until is not null and v_locked_until > now() then
    return 'Terlalu banyak percobaan login gagal. Coba lagi dalam beberapa menit.';
  end if;
  return null;
end $$;


ALTER FUNCTION public._login_lock_check(p_username text) OWNER TO postgres;

--
-- Name: _login_lock_clear(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public._login_lock_clear(p_username text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
begin
  delete from public."LoginAttempts" where username = lower(trim(coalesce(p_username,'')));
end $$;


ALTER FUNCTION public._login_lock_clear(p_username text) OWNER TO postgres;

--
-- Name: _login_lock_fail(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public._login_lock_fail(p_username text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare v_u text := lower(trim(coalesce(p_username,'')));
begin
  if v_u = '' then return; end if;
  insert into public."LoginAttempts" (username, failed, locked_until)
  values (v_u, 1, null)
  on conflict (username) do update set failed = public."LoginAttempts".failed + 1;
  update public."LoginAttempts" set locked_until = now() + interval '15 minutes', failed = 0
   where username = v_u and failed >= 5;
end $$;


ALTER FUNCTION public._login_lock_fail(p_username text) OWNER TO postgres;

--
-- Name: _normalize_row(jsonb, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public._normalize_row(p_row jsonb, p_qname text) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE v_out jsonb := '{}'::jsonb; v_k text; v_v jsonb;
BEGIN
  FOR v_k, v_v IN SELECT lower(key), value FROM jsonb_each(coalesce(p_row,'{}'::jsonb)) LOOP
    IF public._col_exists(p_qname, v_k) THEN
      v_out := v_out || jsonb_build_object(v_k, v_v);
    END IF;
  END LOOP;
  RETURN v_out;
END $$;


ALTER FUNCTION public._normalize_row(p_row jsonb, p_qname text) OWNER TO postgres;

--
-- Name: _qname(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public._qname(p_table text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
  RETURN CASE lower(trim(p_table))
    WHEN 'aset'          THEN 'public."Aset"'
    WHEN 'aspirasi'      THEN 'public."Aspirasi"'
    WHEN 'bansos'        THEN 'public."Bansos"'
    WHEN 'iuran'         THEN 'public."Iuran"'
    WHEN 'kelahiran'     THEN 'public."Kelahiran"'
    WHEN 'kematian'      THEN 'public."Kematian"'
    WHEN 'keuangan'      THEN 'public."Keuangan"'
    WHEN 'peminjaman'    THEN 'public."Peminjaman"'
    WHEN 'pengaduan'     THEN 'public."Pengaduan"'
    WHEN 'pengaturan'    THEN 'public."Pengaturan"'
    WHEN 'pindahkeluar'  THEN 'public."PindahKeluar"'
    WHEN 'pindahmasuk'   THEN 'public."PindahMasuk"'
    WHEN 'sessions'      THEN 'public."Sessions"'
    WHEN 'sumbangan'     THEN 'public."Sumbangan"'
    WHEN 'suratpengantar' THEN 'public."SuratPengantar"'
    WHEN 'users'         THEN 'public."Users"'
    WHEN 'warga'         THEN 'public."Warga"'
    ELSE NULL END;
END $$;


ALTER FUNCTION public._qname(p_table text) OWNER TO postgres;

--
-- Name: _row_owner_match(jsonb, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public._row_owner_match(p_row jsonb, p_nik text, p_nama text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    AS $$
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


ALTER FUNCTION public._row_owner_match(p_row jsonb, p_nik text, p_nama text) OWNER TO postgres;

--
-- Name: _sha(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public._sha(p_text text) RETURNS text
    LANGUAGE sql IMMUTABLE
    SET search_path TO 'public', 'extensions', 'pg_temp'
    AS $$
  select encode(digest(coalesce(p_text,''), 'sha256'), 'hex');
$$;


ALTER FUNCTION public._sha(p_text text) OWNER TO postgres;

--
-- Name: auth_role(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.auth_role(p_token text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare v_role text;
begin
  if p_token is null or trim(p_token) = '' then return null; end if;
  select role into v_role from public."Sessions"
    where token = trim(p_token)
      and (expires_at is null or expires_at > now())
    limit 1;
  if v_role is not null then
    return upper(trim(v_role));
  end if;
  -- Sesi ada tapi kadaluarsa -> hapus
  delete from public."Sessions" where token = trim(p_token) and expires_at <= now();
  return null;
end $$;


ALTER FUNCTION public.auth_role(p_token text) OWNER TO postgres;

--
-- Name: cek_bansos_public(text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cek_bansos_public(p_token text, p_query text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
  v_role   text := public.auth_role(p_token);
  v_q      text := regexp_replace(coalesce(p_query,''), '\D', '', 'g');
  v_kk_set text[] := '{}';
  v_rows   jsonb := '[]'::jsonb;
  v_row    jsonb;
  v_kk     text;
  v_row_nik text;
  v_direct boolean;
begin
  if v_role is null then
    return jsonb_build_object('status','error','message','Sesi tidak valid. Silakan login ulang.');
  end if;
  if v_q = '' then
    return jsonb_build_object('status','error','message','Masukkan NIK atau No. KK terlebih dahulu.');
  end if;

  -- 1) Resolusi NIK -> No. KK (exact dulu, lalu parsial bila >= 4 digit)
  for v_kk in
    select coalesce(public._dec_data(no_kk),'') from public."Warga"
     where nik_sha = public._sha(v_q)
  loop
    if v_kk <> '' and not v_kk = any(v_kk_set) then v_kk_set := v_kk_set || v_kk; end if;
  end loop;
  if cardinality(v_kk_set) = 0 and length(v_q) >= 4 then
    for v_kk in
      select coalesce(public._dec_data(no_kk),'') from public."Warga"
       where nik_sha is not null
         and public._dec_data(nik) like '%' || v_q || '%'
    loop
      if v_kk <> '' and not v_kk = any(v_kk_set) then v_kk_set := v_kk_set || v_kk; end if;
    end loop;
  end if;
  -- 2) Query yang berupa No. KK langsung
  if not v_q = any(v_kk_set) then
    v_kk_set := v_kk_set || v_q;
  end if;

  -- 3) Cari bansos yang relevan
  for v_row in execute 'select to_jsonb(t) from public."Bansos" t' loop
    v_row_nik := coalesce(public._dec_data(v_row->>'nik'),'');
    v_kk       := lower(trim(coalesce(public._dec_data(v_row->>'no_kk'),'')));
    v_direct   := (v_row_nik <> '' and v_row_nik = v_q) or (v_kk <> '' and v_kk = v_q);
    if v_direct
       or (v_row_nik <> '' and public._sha(v_row_nik) = public._sha(v_q))
       or (v_kk <> '' and v_kk = any(v_kk_set))
       or (v_row_nik <> '' and length(v_q) >= 4 and v_row_nik like '%' || v_q || '%') then
      v_row := v_row - 'nik_sha' - 'kk_sha';
      v_row := jsonb_set(v_row, '{nik}',   '"***RAHASIA***"'::jsonb);
      v_row := jsonb_set(v_row, '{no_kk}', '"***RAHASIA***"'::jsonb);
      v_row := v_row || jsonb_build_object('_keluarga', to_jsonb(not v_direct));
      v_rows := v_rows || v_row;
    end if;
  end loop;

  return jsonb_build_object('status','success','data', v_rows);
end $$;


ALTER FUNCTION public.cek_bansos_public(p_token text, p_query text) OWNER TO postgres;

--
-- Name: cleanup_database_secured(text, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cleanup_database_secured(p_token text, p_password text, p_table_name text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
declare
  v_role text := public.auth_role(p_token);
  v_rt_pass text;
  v_target text := upper(trim(coalesce(p_table_name,'')));
  v_tables text[] := array['Iuran','Bansos','Pengaduan','SuratPengantar','Sumbangan','Aset',
                           'Aspirasi','Keuangan','Kelahiran','Kematian',
                           'PindahMasuk','PindahKeluar','Peminjaman'];
  v_locked text[] := array['Warga','Users','Sessions','Pengaturan'];
  v_t text;
  v_count int := 0;
begin
  if v_role <> 'RT' then
    return jsonb_build_object('status','error','message','Akses ditolak.');
  end if;
  select password into v_rt_pass from public."Users"
    where upper(trim(coalesce(role,''))) = 'RT' limit 1;
  if not public._bcrypt_check(coalesce(p_password,''), v_rt_pass) then
    return jsonb_build_object('status','error','message','Password salah.');
  end if;
  if v_target = 'ALL_OPTIONAL' then
    foreach v_t in array v_tables loop
      -- WHERE id IS NOT NULL wajib: Supabase menolak DELETE tanpa WHERE clause
      execute format('delete from public.%I where id is not null', v_t);
      v_count := v_count + 1;
    end loop;
  elsif v_target = any (v_locked) then
    return jsonb_build_object('status','error','message','Tabel terkunci (Warga/Users/Sessions/Pengaturan).');
  elsif v_target = any (v_tables) then
    execute format('delete from public.%I where id is not null', v_target);
    v_count := 1;
  else
    return jsonb_build_object('status','error','message','Tabel tidak valid.');
  end if;
  return jsonb_build_object('status','success','message', v_count || ' tabel dibersihkan.');
end $$;


ALTER FUNCTION public.cleanup_database_secured(p_token text, p_password text, p_table_name text) OWNER TO postgres;

--
-- Name: cleanup_orphan_storage_secured(text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cleanup_orphan_storage_secured(p_token text, p_password text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    SET statement_timeout TO '0'
    AS $$
DECLARE
  v_role      text := public.auth_role(p_token);
  v_rt_pass   text;
  v_files     text[] := ARRAY[]::text[];
  v_refs      text[] := ARRAY[]::text[];
  v_ref_tmp   text[];
  v_orphans   text[] := ARRAY[]::text[];
  v_f         record;
  v_file      text;
  v_ref       text;
  v_q         text;
  v_exists    boolean;
  v_res       jsonb;
  v_errmsg    text;
  v_req_id    bigint;
BEGIN
  IF v_role <> 'RT' THEN
    RETURN jsonb_build_object('status','error','message','Akses ditolak.');
  END IF;

  IF coalesce(p_password,'') = '' THEN
    RETURN jsonb_build_object('status','error','message','Password wajib diisi.');
  END IF;

  SELECT password INTO v_rt_pass FROM public."Users"
    WHERE upper(trim(coalesce(role,''))) = 'RT' LIMIT 1;
  IF v_rt_pass IS DISTINCT FROM coalesce(p_password,'') THEN
    RETURN jsonb_build_object('status','error','message','Password salah.');
  END IF;

  -- 1) Semua file di bucket rt-media
  SELECT COALESCE(array_agg(name), ARRAY[]::text[]) INTO v_files
    FROM storage.objects WHERE bucket_id = 'rt-media';

  IF array_length(v_files, 1) IS NULL THEN
    RETURN jsonb_build_object('status','success',
      'message','Storage bersih: tidak ada file di bucket rt-media.',
      'deleted',0,'total',0,'orphans',0,'failed',0,'request_id',NULL::bigint);
  END IF;

  -- 2) Kumpulkan nilai semua kolom foto/bukti/ttd/gambar di semua tabel public
  FOR v_f IN
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (column_name ILIKE '%foto%'
        OR column_name ILIKE '%bukti%'
        OR column_name ILIKE '%gambar%'
        OR column_name ILIKE '%ttd%')
  LOOP
    v_q := format(
      'SELECT COALESCE(array_agg(DISTINCT %I), ARRAY[]::text[]) FROM public.%I WHERE %I IS NOT NULL AND %I <> ''''',
      v_f.column_name, v_f.table_name, v_f.column_name, v_f.column_name);
    BEGIN
      EXECUTE v_q INTO v_ref_tmp;
      v_refs := v_refs || v_ref_tmp;
    EXCEPTION WHEN OTHERS THEN
      NULL; -- tabel/kolom tidak bisa dibaca — lewati
    END;
  END LOOP;

  -- 3) Tentukan file yatim (path-nya tidak muncul di nilai referensi mana pun)
  FOREACH v_file IN ARRAY v_files LOOP
    v_exists := false;
    FOREACH v_ref IN ARRAY v_refs LOOP
      IF position(v_file IN v_ref) > 0 THEN
        v_exists := true;
        EXIT;
      END IF;
    END LOOP;
    IF NOT v_exists THEN
      v_orphans := v_orphans || v_file;
    END IF;
  END LOOP;

  -- 4) Fase 1: antrekan hapus SEMUA file yatim ke Storage API
  v_req_id := NULL;
  IF array_length(v_orphans, 1) > 0 THEN
    v_res := public.storage_api_delete(v_orphans);
    IF v_res ->> 'status' = 'success' THEN
      v_req_id := (v_res ->> 'request_id')::bigint;
    ELSE
      v_errmsg := v_res ->> 'message';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'status','success',
    'message',
      CASE
        WHEN v_req_id IS NOT NULL THEN
          'Storage: perintah hapus ' || array_length(v_orphans, 1) || ' file yatim dikirim. Memverifikasi hasil...'
        WHEN array_length(v_orphans, 1) > 0 THEN
          'Storage: gagal mengirim perintah hapus. Error: ' || coalesce(v_errmsg,'')
        ELSE
          'Storage bersih: tidak ada file yatim.'
      END,
    'deleted', 0,
    'total', array_length(v_files, 1),
    'orphans', array_length(v_orphans, 1),
    'failed', CASE WHEN v_req_id IS NULL AND array_length(v_orphans, 1) > 0 THEN array_length(v_orphans, 1) ELSE 0 END,
    'request_id', v_req_id);
END $$;


ALTER FUNCTION public.cleanup_orphan_storage_secured(p_token text, p_password text) OWNER TO postgres;

--
-- Name: delete_data_secured(text, text, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.delete_data_secured(p_table_name text, p_id_column text, p_id_value text, p_token text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
        DECLARE
          v_role text;
          BEGIN
            -- Cek Role berdasarkan token di tabel Sessions
              SELECT role INTO v_role FROM public."Sessions" WHERE token = p_token LIMIT 1;
                
                  IF v_role IS NULL OR UPPER(v_role) != 'RT' THEN
                      RETURN jsonb_build_object('status', 'error', 'message', 'Akses ditolak! Sesi Anda bukan RT terverifikasi di database.');
                        END IF;

                          -- Eksekusi Hapus berdasarkan Nama Tabel
                            IF LOWER(p_table_name) = 'keuangan' THEN
                                DELETE FROM public."Keuangan" WHERE id = p_id_value;
                                  ELSIF LOWER(p_table_name) = 'iuran' THEN
                                      DELETE FROM public."Iuran" WHERE id = p_id_value;
                                        ELSIF LOWER(p_table_name) = 'warga' THEN
                                            DELETE FROM public."Warga" WHERE id = p_id_value OR nik = p_id_value;
                                              ELSIF LOWER(p_table_name) = 'pengaduan' THEN
                                                  DELETE FROM public."Pengaduan" WHERE id = p_id_value;
                                                    ELSIF LOWER(p_table_name) = 'suratpengantar' THEN
                                                        DELETE FROM public."SuratPengantar" WHERE id = p_id_value;
                                                          ELSIF LOWER(p_table_name) = 'sumbangan' THEN
                                                              DELETE FROM public."Sumbangan" WHERE id = p_id_value;
                                                                ELSIF LOWER(p_table_name) = 'aset' THEN
                                                                    DELETE FROM public."Aset" WHERE id = p_id_value;
                                                                      ELSIF LOWER(p_table_name) = 'peminjaman' THEN
                                                                          DELETE FROM public."Peminjaman" WHERE id = p_id_value;
                                                                            ELSIF LOWER(p_table_name) = 'users' THEN
                                                                                DELETE FROM public."Users" WHERE username = p_id_value OR nik = p_id_value;
                                                                                  END IF;

                                                                                    RETURN jsonb_build_object('status', 'success', 'message', 'Data berhasil dihapus dari server!');
                                                                                    END;
                                                                                    $$;


ALTER FUNCTION public.delete_data_secured(p_table_name text, p_id_column text, p_id_value text, p_token text) OWNER TO postgres;

--
-- Name: delete_session_secured(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.delete_session_secured(p_token text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
BEGIN
  DELETE FROM public."Sessions" WHERE token = trim(coalesce(p_token,''));
  RETURN jsonb_build_object('status','success');
END $$;


ALTER FUNCTION public.delete_session_secured(p_token text) OWNER TO postgres;

--
-- Name: delete_storage_files_secured(text, text, text[]); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.delete_storage_files_secured(p_token text, p_password text, p_paths text[]) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    SET statement_timeout TO '0'
    AS $$
declare
  v_role text := public.auth_role(p_token);
  v_rt_pass text;
  v_res jsonb;
begin
  if v_role <> 'RT' then
    return jsonb_build_object('status','error','message','Akses ditolak.');
  end if;
  -- Password wajib saat dipanggil dari alur "Bersihkan Tabel" (opsional di alur hapus per baris)
  if coalesce(p_password, '') <> '' then
    select password into v_rt_pass from public."Users"
      where upper(trim(coalesce(role,''))) = 'RT' limit 1;
    if not public._bcrypt_check(coalesce(p_password,''), v_rt_pass) then
      return jsonb_build_object('status','error','message','Password salah.');
    end if;
  end if;
  -- Antrekan hapus via Storage API (diproses async — hasil dicek storage_get_delete_result)
  v_res := public.storage_api_delete(coalesce(p_paths, array[]::text[]));
  if v_res ->> 'status' = 'success' then
    return jsonb_build_object('status','success',
      'message','Perintah hapus ' || coalesce((v_res ->> 'queued')::int, 0) || ' file storage dikirim.',
      'deleted', 0, 'request_id', (v_res ->> 'request_id')::bigint);
  end if;
  return jsonb_build_object('status','error','message',
    'Gagal hapus file storage: ' || coalesce(v_res ->> 'message',''));
end $$;

