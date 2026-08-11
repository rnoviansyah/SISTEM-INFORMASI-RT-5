-- ============================================================
-- SECURITY PATCH v4 - PASSWORD HASHING DENGAN BCRYPT
-- Jalankan di Supabase SQL Editor.
-- ============================================================

-- 1) Install extension pgcrypto (untuk bcrypt)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2) Fungsi hash password
CREATE OR REPLACE FUNCTION public.hash_password(p_password text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN crypt(p_password, gen_salt('bf', 8));
END $$;

-- 3) Fungsi verifikasi password
CREATE OR REPLACE FUNCTION public.verify_password(p_password text, p_hash text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN crypt(p_password, p_hash) = p_hash;
END $$;

-- 4) Update RPC verify_user_login
DROP FUNCTION IF EXISTS public.verify_user_login(text, text);
CREATE OR REPLACE FUNCTION public.verify_user_login(p_username text, p_password text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_user public."Users"%ROWTYPE;
  v_u text := lower(trim(coalesce(p_username,'')));
  v_p text := coalesce(p_password,'');
  v_is_hashed boolean;
BEGIN
  IF v_u = '' OR v_p = '' THEN
    RETURN jsonb_build_object('status','error','message','Username / NIK dan Password tidak boleh kosong!');
  END IF;
  
  SELECT * INTO v_user FROM public."Users"
    WHERE lower(trim(coalesce(username,''))) = v_u
       OR lower(trim(coalesce(nik,''))) = v_u
    LIMIT 1;
    
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status','error','message','Akun tidak ditemukan.');
  END IF;
  
  -- Cek apakah password sudah di-hash atau masih plaintext
  v_is_hashed := v_user.password LIKE '$2a$%' OR v_user.password LIKE '$2b$%';
  
  IF v_is_hashed THEN
    -- Sudah hash: verifikasi dengan bcrypt
    IF NOT public.verify_password(v_p, v_user.password) THEN
      RETURN jsonb_build_object('status','error','message','Password salah.');
    END IF;
  ELSE
    -- Masih plaintext (legacy): bandingkan langsung
    IF v_user.password IS DISTINCT FROM v_p THEN
      RETURN jsonb_build_object('status','error','message','Password salah.');
    END IF;
    -- Upgrade ke hash (biar next login pake hash)
    UPDATE public."Users" 
      SET password = public.hash_password(v_p) 
      WHERE username = v_user.username;
  END IF;
  
  RETURN jsonb_build_object(
    'status','success',
    'username', v_user.username,
    'role', v_user.role,
    'nik', v_user.nik,
    'nama', v_user.nama
  );
END $$;

-- 5) Update RPC generic_insert_secured untuk Users
DROP FUNCTION IF EXISTS public.generic_insert_secured(text, text, jsonb);
CREATE OR REPLACE FUNCTION public.generic_insert_secured(p_table text, p_token text, p_row jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_table  text := lower(trim(p_table));
  v_qname  text := public._qname(v_table);
  v_role   text := public.auth_role(p_token);
  v_clean  jsonb;
  v_hashed text;
BEGIN
  IF v_qname IS NULL THEN
    RETURN jsonb_build_object('status','error','message','Tabel tidak diizinkan: '||v_table);
  END IF;
  IF v_role IS NULL THEN
    RETURN jsonb_build_object('status','error','message','Sesi tidak valid. Silakan login ulang.');
  END IF;
  IF v_table IN ('users','sessions','warga','pengaturan','keuangan','aset','bansos') AND v_role <> 'RT' THEN
    RETURN jsonb_build_object('status','error','message','Akses ditolak: operasi ini hanya untuk RT.');
  END IF;
  
  v_clean := public._normalize_row(p_row, v_qname);
  IF v_clean = '{}'::jsonb THEN
    RETURN jsonb_build_object('status','error','message','Data tidak valid.');
  END IF;
  
  -- KHUSUS TABEL Users: hash password sebelum insert
  IF v_table = 'users' AND v_clean ? 'password' THEN
    v_hashed := public.hash_password(v_clean->>'password');
    v_clean := v_clean || jsonb_build_object('password', v_hashed);
  END IF;
  
  -- created_at otomatis
  IF NOT (v_clean ? 'created_at') THEN
    v_clean := v_clean || jsonb_build_object('created_at', to_jsonb(now()));
  END IF;
  
  EXECUTE 'INSERT INTO ' || v_qname || ' SELECT * FROM jsonb_populate_record(NULL::' || v_qname || ', $1)'
    USING v_clean;
  RETURN jsonb_build_object('status','success','message','Data berhasil disimpan!');
END $$;

-- 6) Update RPC generic_update_secured untuk Users
DROP FUNCTION IF EXISTS public.generic_update_secured(text, text, text, text, jsonb);
CREATE OR REPLACE FUNCTION public.generic_update_secured(
  p_table text, p_token text, p_id_col text, p_id_val text, p_row jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_table  text := lower(trim(p_table));
  v_qname  text := public._qname(v_table);
  v_role   text := public.auth_role(p_token);
  v_nik    text := '';
  v_clean  jsonb;
  v_set    text := '';
  v_k      text; v_v jsonb; v_val text;
  v_row    jsonb;
  v_hashed text;
  v_old_status text;
BEGIN
  IF v_qname IS NULL THEN
    RETURN jsonb_build_object('status','error','message','Tabel tidak diizinkan: '||v_table);
  END IF;
  IF v_role IS NULL THEN
    RETURN jsonb_build_object('status','error','message','Sesi tidak valid. Silakan login ulang.');
  END IF;
  IF p_id_col IS NULL OR p_id_val IS NULL THEN
    RETURN jsonb_build_object('status','error','message','Parameter id tidak lengkap.');
  END IF;

  IF v_role <> 'RT' THEN
    IF v_table IN ('users','sessions','warga','pengaturan') THEN
      RETURN jsonb_build_object('status','error','message','Akses ditolak: operasi ini hanya untuk RT.');
    ELSIF v_table IN ('pengaduan','suratpengantar','peminjaman','sumbangan','iuran','aspirasi') THEN
      SELECT coalesce(nik,'') INTO v_nik FROM public."Sessions" WHERE token = trim(p_token) LIMIT 1;
      EXECUTE 'SELECT to_jsonb(t) FROM ' || v_qname || ' t WHERE ' || quote_ident(p_id_col) || ' = $1 LIMIT 1'
        INTO v_row USING p_id_val;
      IF NOT public._row_owner_match(v_row, v_nik, '') THEN
        RETURN jsonb_build_object('status','error','message','Akses ditolak: data bukan milik Anda.');
      END IF;
    ELSE
      RETURN jsonb_build_object('status','error','message','Akses ditolak: operasi ini hanya untuk RT.');
    END IF;
  END IF;

  v_clean := public._normalize_row(p_row, v_qname);
  
  -- KHUSUS TABEL Users: hash password jika ada
  IF v_table = 'users' AND v_clean ? 'password' THEN
    v_hashed := public.hash_password(v_clean->>'password');
    v_clean := v_clean || jsonb_build_object('password', v_hashed);
  END IF;
  
  FOR v_k, v_v IN SELECT lower(key), value FROM jsonb_each(v_clean) LOOP
    IF lower(v_k) = lower(p_id_col) THEN CONTINUE; END IF;
    IF lower(v_k) IN ('created_at', 'verified_at') THEN CONTINUE; END IF;
    v_val := v_v#>>'{}';
    IF v_set <> '' THEN v_set := v_set || ', '; END IF;
    v_set := v_set || quote_ident(v_k) || ' = ' || coalesce(quote_literal(v_val), 'NULL');
  END LOOP;

  -- Catat waktu verifikasi saat RT mengubah status
  IF v_role = 'RT' AND (p_row ? 'status' OR p_row ? 'Status')
     AND public._col_exists(v_qname, 'verified_at') THEN
    EXECUTE 'SELECT coalesce(status::text,'''') FROM ' || v_qname
            || ' WHERE ' || quote_ident(p_id_col) || ' = $1 LIMIT 1'
      INTO v_old_status USING p_id_val;
    IF lower(trim(coalesce(v_old_status, '')))
       IS DISTINCT FROM lower(trim(coalesce(p_row->>'status', p_row->>'Status', ''))) THEN
      IF v_set <> '' THEN v_set := v_set || ', '; END IF;
      v_set := v_set || 'verified_at = now()';
    END IF;
  END IF;

  IF v_set = '' THEN
    RETURN jsonb_build_object('status','error','message','Tidak ada kolom yang diubah.');
  END IF;
  EXECUTE 'UPDATE ' || v_qname || ' SET ' || v_set || ' WHERE ' || quote_ident(p_id_col) || ' = $1'
    USING p_id_val;
  RETURN jsonb_build_object('status','success','message','Data berhasil diperbarui!');
END $$;

-- 7) Migrasi data lama: hash semua password yang masih plaintext
UPDATE public."Users" 
  SET password = public.hash_password(password) 
  WHERE password NOT LIKE '$2a$%' AND password NOT LIKE '$2b$%';