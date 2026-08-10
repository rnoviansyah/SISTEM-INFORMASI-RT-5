-- ============================================================
-- SECURITY PATCH - SISTEM INFORMASI RT 5
-- Versi ringkas: Hanya meng-update fungsi RPC & Keamanan
-- (Tabel TIDAK dibuat ulang, data TIDAK disentuh/dihapus).
-- ============================================================

-- ------------------------------------------------------------
-- 1) RLS: AKTIFKAN SEMUA + HAPUS POLICY LAMA (default deny)
-- ------------------------------------------------------------
ALTER TABLE public."Aset"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Aspirasi"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Bansos"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Iuran"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Kelahiran"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Kematian"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Keuangan"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Peminjaman"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Pengaduan"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Pengaturan"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PindahKeluar" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PindahMasuk"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Sessions"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Sumbangan"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SuratPengantar" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Users"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Warga"        ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text; pol text;
BEGIN
  FOREACH t IN ARRAY ARRAY['Aset','Aspirasi','Bansos','Iuran','Kelahiran','Kematian','Keuangan',
    'Peminjaman','Pengaduan','Pengaturan','PindahKeluar','PindahMasuk','Sessions',
    'Sumbangan','SuratPengantar','Users','Warga'] LOOP
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol, t);
    END LOOP;
  END LOOP;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Sessions_pkey') THEN
    ALTER TABLE public."Sessions" ADD PRIMARY KEY (token);
  END IF;
END $$;

-- ------------------------------------------------------------
-- 1b) KOLOM created_at (semua tabel) + BACKFILL data lama
-- ------------------------------------------------------------
ALTER TABLE public."Aset"         ADD COLUMN IF NOT EXISTS "created_at" timestamptz DEFAULT now();
ALTER TABLE public."Aspirasi"     ADD COLUMN IF NOT EXISTS "created_at" timestamptz DEFAULT now();
ALTER TABLE public."Bansos"       ADD COLUMN IF NOT EXISTS "created_at" timestamptz DEFAULT now();
ALTER TABLE public."Iuran"        ADD COLUMN IF NOT EXISTS "created_at" timestamptz DEFAULT now();
ALTER TABLE public."Kelahiran"    ADD COLUMN IF NOT EXISTS "created_at" timestamptz DEFAULT now();
ALTER TABLE public."Kematian"     ADD COLUMN IF NOT EXISTS "created_at" timestamptz DEFAULT now();
ALTER TABLE public."Keuangan"     ADD COLUMN IF NOT EXISTS "created_at" timestamptz DEFAULT now();
ALTER TABLE public."Peminjaman"   ADD COLUMN IF NOT EXISTS "created_at" timestamptz DEFAULT now();
ALTER TABLE public."Pengaduan"    ADD COLUMN IF NOT EXISTS "created_at" timestamptz DEFAULT now();
ALTER TABLE public."Pengaturan"   ADD COLUMN IF NOT EXISTS "created_at" timestamptz DEFAULT now();
ALTER TABLE public."PindahKeluar" ADD COLUMN IF NOT EXISTS "created_at" timestamptz DEFAULT now();
ALTER TABLE public."PindahMasuk"  ADD COLUMN IF NOT EXISTS "created_at" timestamptz DEFAULT now();
ALTER TABLE public."Sessions"     ADD COLUMN IF NOT EXISTS "created_at" timestamptz DEFAULT now();
ALTER TABLE public."Sumbangan"    ADD COLUMN IF NOT EXISTS "created_at" timestamptz DEFAULT now();
ALTER TABLE public."SuratPengantar" ADD COLUMN IF NOT EXISTS "created_at" timestamptz DEFAULT now();
ALTER TABLE public."Users"        ADD COLUMN IF NOT EXISTS "created_at" timestamptz DEFAULT now();
ALTER TABLE public."Warga"        ADD COLUMN IF NOT EXISTS "created_at" timestamptz DEFAULT now();

-- Backfill: data lama yang belum punya created_at diberi waktu sekarang agar urutan notifikasi konsisten
UPDATE public."Aset"         SET "created_at" = now() WHERE "created_at" IS NULL;
UPDATE public."Aspirasi"     SET "created_at" = now() WHERE "created_at" IS NULL;
UPDATE public."Bansos"       SET "created_at" = now() WHERE "created_at" IS NULL;
UPDATE public."Iuran"        SET "created_at" = now() WHERE "created_at" IS NULL;
UPDATE public."Kelahiran"    SET "created_at" = now() WHERE "created_at" IS NULL;
UPDATE public."Kematian"     SET "created_at" = now() WHERE "created_at" IS NULL;
UPDATE public."Keuangan"     SET "created_at" = now() WHERE "created_at" IS NULL;
UPDATE public."Peminjaman"   SET "created_at" = now() WHERE "created_at" IS NULL;
UPDATE public."Pengaduan"    SET "created_at" = now() WHERE "created_at" IS NULL;
UPDATE public."Pengaturan"   SET "created_at" = now() WHERE "created_at" IS NULL;
UPDATE public."PindahKeluar" SET "created_at" = now() WHERE "created_at" IS NULL;
UPDATE public."PindahMasuk"  SET "created_at" = now() WHERE "created_at" IS NULL;
UPDATE public."Sessions"     SET "created_at" = now() WHERE "created_at" IS NULL;
UPDATE public."Sumbangan"    SET "created_at" = now() WHERE "created_at" IS NULL;
UPDATE public."SuratPengantar" SET "created_at" = now() WHERE "created_at" IS NULL;
UPDATE public."Users"        SET "created_at" = now() WHERE "created_at" IS NULL;
UPDATE public."Warga"        SET "created_at" = now() WHERE "created_at" IS NULL;

-- ------------------------------------------------------------
-- 2) STORAGE: bucket rt-media
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('rt-media', 'rt-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "rt-media-public-read" ON storage.objects;
CREATE POLICY "rt-media-public-read" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'rt-media');

DROP POLICY IF EXISTS "rt-media-anon-upload" ON storage.objects;
CREATE POLICY "rt-media-anon-upload" ON storage.objects
  FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'rt-media');

-- ------------------------------------------------------------
-- 3) HELPER FUNGSI
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._qname(p_table text)
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
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

CREATE OR REPLACE FUNCTION public._col_exists(p_qname text, p_col text)
RETURNS boolean LANGUAGE plpgsql STABLE AS $$
DECLARE v_tab text;
BEGIN
  v_tab := substring(p_qname from '"(.*)"');
  PERFORM 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND lower(table_name) = lower(v_tab)
      AND lower(column_name) = lower(p_col);
  RETURN FOUND;
END $$;

CREATE OR REPLACE FUNCTION public._normalize_row(p_row jsonb, p_qname text)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE v_out jsonb := '{}'::jsonb; v_k text; v_v jsonb;
BEGIN
  FOR v_k, v_v IN SELECT lower(key), value FROM jsonb_each(coalesce(p_row,'{}'::jsonb)) LOOP
    IF public._col_exists(p_qname, v_k) THEN
      v_out := v_out || jsonb_build_object(v_k, v_v);
    END IF;
  END LOOP;
  RETURN v_out;
END $$;

CREATE OR REPLACE FUNCTION public._row_owner_match(p_row jsonb, p_nik text, p_nama text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE r_nik text; r_nama text;
BEGIN
  IF p_row IS NULL THEN RETURN false; END IF;
  r_nik  := lower(trim(coalesce(p_row->>'nik',  p_row->>'NIK', '')));
  r_nama := lower(trim(coalesce(p_row->>'nama', p_row->>'nama_lengkap',
                  p_row->>'nama_peminjam', p_row->>'pelapor', p_row->>'pemohon', '')));
  IF coalesce(p_nik,'') <> '' AND r_nik <> '' THEN
    RETURN r_nik = lower(trim(p_nik));
  END IF;
  IF coalesce(p_nama,'') <> '' AND r_nama <> '' THEN
    RETURN r_nama = lower(trim(p_nama))
        OR r_nama LIKE '%'||lower(trim(p_nama))||'%'
        OR lower(trim(p_nama)) LIKE '%'||r_nama||'%';
  END IF;
  RETURN false;
END $$;

CREATE OR REPLACE FUNCTION public.auth_role(p_token text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_role text;
BEGIN
  IF p_token IS NULL OR trim(p_token) = '' THEN RETURN NULL; END IF;
  SELECT role INTO v_role FROM public."Sessions"
    WHERE token = trim(p_token) LIMIT 1;
  IF v_role IS NULL THEN RETURN NULL; END IF;
  RETURN upper(trim(v_role));
END $$;

-- ------------------------------------------------------------
-- 4) FUNGSI RPC SECURED (OVERWRITE)
-- ------------------------------------------------------------

DROP FUNCTION IF EXISTS public.verify_user_login(text, text);
CREATE OR REPLACE FUNCTION public.verify_user_login(p_username text, p_password text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_user public."Users"%ROWTYPE;
  v_u text := lower(trim(coalesce(p_username,''))); v_p text := coalesce(p_password,'');
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
  IF v_user.password IS DISTINCT FROM v_p THEN
    RETURN jsonb_build_object('status','error','message','Password salah.');
  END IF;
  RETURN jsonb_build_object(
    'status','success',
    'username', v_user.username,
    'role', v_user.role,
    'nik', v_user.nik,
    'nama', v_user.nama
  );
END $$;

DROP FUNCTION IF EXISTS public.generic_select_secured(text, text);
CREATE OR REPLACE FUNCTION public.generic_select_secured(p_table text, p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_table      text := lower(trim(p_table));
  v_qname      text := public._qname(v_table);
  v_role       text := public.auth_role(p_token);
  v_nik        text := '';
  v_user_kk    text := '';
  v_rows       jsonb := '[]'::jsonb;
  v_row        jsonb;
  v_private    boolean;
  v_row_kk     text;
  v_row_nik    text;
BEGIN
  IF v_qname IS NULL THEN
    RETURN jsonb_build_object('status','error','message','Tabel tidak diizinkan: '||v_table);
  END IF;

  IF v_table = 'pengaturan' THEN
    FOR v_row IN EXECUTE 'SELECT to_jsonb(t) FROM public."Pengaturan" t' LOOP
      IF (v_row->>'kunci') IN ('gemini_api_key','password') THEN CONTINUE; END IF;
      v_rows := v_rows || v_row;
    END LOOP;
    RETURN jsonb_build_object('status','success','data', v_rows);
  END IF;

  IF v_role IS NULL THEN
    RETURN jsonb_build_object('status','error','message','Sesi tidak valid. Silakan login ulang.');
  END IF;

  SELECT coalesce(nik,'') INTO v_nik FROM public."Sessions" WHERE token = trim(p_token) LIMIT 1;

  IF v_nik <> '' THEN
    SELECT coalesce(no_kk, '') INTO v_user_kk 
    FROM public."Warga" 
    WHERE lower(trim(coalesce(nik,''))) = lower(trim(v_nik)) 
    LIMIT 1;
  END IF;

  -- Khusus tabel Warga: RT lihat full, Warga lihat semua warga tetapi disensor bila KK beda
  IF v_table = 'warga' THEN
    FOR v_row IN EXECUTE 'SELECT to_jsonb(t) FROM public."Warga" t' LOOP
      IF v_role = 'RT' THEN
        v_rows := v_rows || v_row;
      ELSE
        v_row_kk  := coalesce(v_row->>'no_kk', '');
        v_row_nik := coalesce(v_row->>'nik', coalesce(v_row->>'ktp', ''));
        
        -- Jika KK sama ATAU NIK cocok (diri sendiri / keluarga) -> tampilkan lengkap
        IF (v_user_kk <> '' AND v_row_kk <> '' AND lower(trim(v_user_kk)) = lower(trim(v_row_kk))) OR 
           (v_nik <> '' AND lower(trim(v_row_nik)) = lower(trim(v_nik))) THEN
          v_rows := v_rows || v_row;
        ELSE
          -- Jika KK beda -> sensor bidang sensitif
          v_row := jsonb_set(v_row, '{nik}', '"***RAHASIA***"'::jsonb);
          v_row := jsonb_set(v_row, '{no_kk}', '"***RAHASIA***"'::jsonb);
          v_row := jsonb_set(v_row, '{no_hp}', '"***RAHASIA***"'::jsonb);
          v_row := jsonb_set(v_row, '{tanggal_lahir}', '"***RAHASIA***"'::jsonb);
          v_row := jsonb_set(v_row, '{tempat_lahir}', '"***RAHASIA***"'::jsonb);
          v_rows := v_rows || v_row;
        END IF;
      END IF;
    END LOOP;

    RETURN jsonb_build_object('status','success','data', v_rows);
  END IF;

  v_private := v_table IN ('users','sessions','pengaduan','suratpengantar','peminjaman','sumbangan','iuran');

  FOR v_row IN EXECUTE 'SELECT to_jsonb(t) FROM ' || v_qname || ' t' LOOP
    IF v_role = 'RT' THEN
      v_rows := v_rows || v_row;
    ELSIF NOT v_private OR public._row_owner_match(v_row, v_nik, '') THEN
      v_rows := v_rows || v_row;
    END IF;
  END LOOP;

  IF v_table = 'users' THEN
    SELECT coalesce(jsonb_agg(x), '[]'::jsonb) INTO v_rows
      FROM (SELECT v - 'password' AS x FROM jsonb_array_elements(v_rows) v) s;
  END IF;

  RETURN jsonb_build_object('status','success','data', v_rows);
END $$;

DROP FUNCTION IF EXISTS public.generic_insert_secured(text, text, jsonb);
CREATE OR REPLACE FUNCTION public.generic_insert_secured(p_table text, p_token text, p_row jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_table  text := lower(trim(p_table));
  v_qname  text := public._qname(v_table);
  v_role   text := public.auth_role(p_token);
  v_clean  jsonb;
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
  -- created_at otomatis: tanggal & jam sampai detik saat data dibuat (untuk urutan notifikasi)
  IF NOT (v_clean ? 'created_at') THEN
    v_clean := v_clean || jsonb_build_object('created_at', to_jsonb(now()));
  END IF;
  EXECUTE 'INSERT INTO ' || v_qname || ' SELECT * FROM jsonb_populate_record(NULL::' || v_qname || ', $1)'
    USING v_clean;
  RETURN jsonb_build_object('status','success','message','Data berhasil disimpan!');
END $$;

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
  FOR v_k, v_v IN SELECT lower(key), value FROM jsonb_each(v_clean) LOOP
    IF lower(v_k) = lower(p_id_col) THEN CONTINUE; END IF;
    v_val := v_v#>>'{}';
    IF v_set <> '' THEN v_set := v_set || ', '; END IF;
    v_set := v_set || quote_ident(v_k) || ' = ' || coalesce(quote_literal(v_val), 'NULL');
  END LOOP;
  IF v_set = '' THEN
    RETURN jsonb_build_object('status','error','message','Tidak ada kolom yang diubah.');
  END IF;
  EXECUTE 'UPDATE ' || v_qname || ' SET ' || v_set || ' WHERE ' || quote_ident(p_id_col) || ' = $1'
    USING p_id_val;
  RETURN jsonb_build_object('status','success','message','Data berhasil diperbarui!');
END $$;

DROP FUNCTION IF EXISTS public.generic_delete_secured(text, text, text, text);
CREATE OR REPLACE FUNCTION public.generic_delete_secured(
  p_table text, p_token text, p_id_col text, p_id_val text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_qname text := public._qname(p_table);
BEGIN
  IF v_qname IS NULL THEN
    RETURN jsonb_build_object('status','error','message','Tabel tidak diizinkan.');
  END IF;
  IF public.auth_role(p_token) <> 'RT' THEN
    RETURN jsonb_build_object('status','error','message','Akses ditolak: hanya RT yang boleh menghapus data.');
  END IF;
  EXECUTE 'DELETE FROM ' || v_qname || ' WHERE ' || quote_ident(p_id_col) || ' = $1'
    USING p_id_val;
  RETURN jsonb_build_object('status','success','message','Data berhasil dihapus!');
END $$;

DROP FUNCTION IF EXISTS public.save_session_secured(text, text, text);
CREATE OR REPLACE FUNCTION public.save_session_secured(p_token text, p_nik text, p_role text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF p_token IS NULL OR trim(p_token) = '' THEN
    RETURN jsonb_build_object('status','error','message','Token kosong.');
  END IF;
  INSERT INTO public."Sessions" (token, nik, role, createdat, created_at)
  VALUES (trim(p_token), trim(coalesce(p_nik,'')), trim(coalesce(p_role,'Warga')),
          to_char(now(), 'YYYY-MM-DD HH24:MI:SS'), now())
  ON CONFLICT (token) DO UPDATE
    SET nik = EXCLUDED.nik, role = EXCLUDED.role, createdat = EXCLUDED.createdat, created_at = EXCLUDED.created_at;
  RETURN jsonb_build_object('status','success');
END $$;

DROP FUNCTION IF EXISTS public.delete_session_secured(text);
CREATE OR REPLACE FUNCTION public.delete_session_secured(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  DELETE FROM public."Sessions" WHERE token = trim(coalesce(p_token,''));
  RETURN jsonb_build_object('status','success');
END $$;

DROP FUNCTION IF EXISTS public.get_users_secured(text);
CREATE OR REPLACE FUNCTION public.get_users_secured(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_rows jsonb;
BEGIN
  IF public.auth_role(p_token) <> 'RT' THEN
    RETURN jsonb_build_object('status','error','message','Akses ditolak.');
  END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('username', username, 'nik', nik, 'role', role, 'nama', nama)), '[]'::jsonb)
    INTO v_rows FROM public."Users";
  RETURN v_rows;
END $$;

DROP FUNCTION IF EXISTS public.get_real_database_stats();
CREATE OR REPLACE FUNCTION public.get_real_database_stats()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_warga bigint; v_iuran bigint; v_keu bigint;
BEGIN
  SELECT count(*) INTO v_warga FROM public."Warga";
  SELECT count(*) INTO v_iuran FROM public."Iuran";
  SELECT count(*) INTO v_keu   FROM public."Keuangan";
  RETURN jsonb_build_object(
    'total_mb', 25.91,
    'total_rows', v_warga + v_iuran + v_keu,
    'warga', v_warga, 'iuran', v_iuran, 'keuangan', v_keu
  );
END $$;

DROP FUNCTION IF EXISTS public.cleanup_database_secured(text, text, text);
CREATE OR REPLACE FUNCTION public.cleanup_database_secured(
  p_token text, p_password text, p_table_name text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_role text := public.auth_role(p_token);
  v_rt_pass text;
  v_target text := upper(trim(coalesce(p_table_name,'')));
  v_tables text[] := ARRAY['Iuran','Bansos','Pengaduan','SuratPengantar','Sumbangan','Aset',
                           'Aspirasi','Keuangan','Kelahiran','Kematian',
                           'PindahMasuk','PindahKeluar','Peminjaman'];
  v_locked text[] := ARRAY['Warga','Users','Sessions','Pengaturan'];
  v_t text;
  v_count int := 0;
BEGIN
  IF v_role <> 'RT' THEN
    RETURN jsonb_build_object('status','error','message','Akses ditolak.');
  END IF;
  SELECT password INTO v_rt_pass FROM public."Users"
    WHERE upper(trim(coalesce(role,''))) = 'RT' LIMIT 1;
  IF v_rt_pass IS DISTINCT FROM coalesce(p_password,'') THEN
    RETURN jsonb_build_object('status','error','message','Password salah.');
  END IF;
  IF v_target = 'ALL_OPTIONAL' THEN
    FOREACH v_t IN ARRAY v_tables LOOP
      -- WHERE id IS NOT NULL wajib: Supabase menolak DELETE tanpa WHERE clause
      EXECUTE format('DELETE FROM public.%I WHERE id IS NOT NULL', v_t);
      v_count := v_count + 1;
    END LOOP;
  ELSIF v_target = ANY (v_locked) THEN
    RETURN jsonb_build_object('status','error','message','Tabel terkunci (Warga/Users/Sessions/Pengaturan).');
  ELSIF v_target = ANY (v_tables) THEN
    EXECUTE format('DELETE FROM public.%I WHERE id IS NOT NULL', v_target);
    v_count := 1;
  ELSE
    RETURN jsonb_build_object('status','error','message','Tabel tidak valid.');
  END IF;
  RETURN jsonb_build_object('status','success','message', v_count || ' tabel dibersihkan.');
END $$;

INSERT INTO public."Users" (id, username, password, role, nama, nik)
SELECT CAST(1 AS bigint), 'adminrt', 'admin123', 'RT', 'Admin RT 5', 'adminrt'
WHERE NOT EXISTS (SELECT 1 FROM public."Users" WHERE lower(trim(coalesce(username,''))) = 'adminrt');

CREATE OR REPLACE FUNCTION public.get_server_time()
RETURNS bigint
LANGUAGE sql
STABLE
AS $$ SELECT (extract(epoch from now()) * 1000)::bigint $$;
