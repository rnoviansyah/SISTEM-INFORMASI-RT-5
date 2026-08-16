-- ============================================================
-- SECURITY PATCH v4.3 — BERSIHKAN FILE STORAGE TIDAK TERPAKAI
-- Jalankan di Supabase SQL Editor SETELAH security_patch_v3 berhasil.
-- Idempotent — aman dijalankan ulang (jika sudah pernah menjalankan v4
-- / v4.1 / v4.2, jalankan ulang file ini untuk mendapat perbaikan v4.3).
--
-- APA YANG BERUBAH DI v4.3 (PENTING):
--   a. Arsitektur DUA FASE. pg_net TIDAK mengirim request sampai
--      transaksi commit, jadi menunggu respons DI DALAM transaksi yang
--      sama tidak akan pernah berhasil (itulah penyebab "canceling
--      statement due to statement timeout" + request tidak pernah
--      terkirim). Sekarang:
--        Fase 1: cleanup_orphan_storage_secured() memindai bucket vs
--                data, mengantrekan hapus ke Storage API, lalu
--                mengembalikan request_id dengan cepat.
--        Fase 2: storage_get_delete_result(request_id) membaca hasil
--                dari transaksi terpisah (aplikasi memanggil berulang
--                sampai status bukan 'pending', lalu menampilkan toast).
--   b. SET statement_timeout = 0 pada semua fungsi — role anon default
--      punya batas 3 detik yang bisa mematikan RPC di tengah jalan.
--
-- SETUP SEKALI (wajib, sebelum tombol bisa menghapus file):
--   1) Aktifkan ekstensi:
--      create extension if not exists pg_net;
--      create extension if not exists supabase_vault;
--   2) Simpan service_role key Anda ke Vault. GANTI <KEY_ANDA> dengan
--      key asli (Supabase > Settings > API > service_role):
--      select vault.create_secret('<KEY_ANDA>', 'storage_service_role');
--      (Kalau error "already exists", timpa dengan: id bisa dicek lewat
--       "select id, name from vault.decrypted_secrets;" lalu
--       "select vault.update_secret('<id>', '<KEY_ANDA>');")
--   3) Simpan URL project Anda (Supabase > Project Settings > API >
--      Project URL) ke Vault — GANTI <URL_PROJECT>:
--      select vault.create_secret('https://<REF>.supabase.co', 'storage_project_url');
--
-- CEK SETUP (read-only, aman dijalankan kapan saja):
--   select name, (decrypted_secret is not null) as "key_tersimpan"
--   from vault.decrypted_secrets where name in ('storage_service_role','storage_project_url');
-- ============================================================

-- ============================================================
-- FASE 1 — HELPER: antrekan hapus file via Storage API
-- (DELETE /storage/v1/object/rt-media — multi-delete). Mengembalikan request_id;
-- hasilnya dicek dengan storage_get_delete_result.
-- Definisi sama dengan yang ada di patch v3.3 — idempotent.
-- ============================================================
CREATE OR REPLACE FUNCTION public.storage_api_delete(p_paths text[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET statement_timeout = 0
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
ALTER FUNCTION public.storage_api_delete(text[]) OWNER TO postgres;

-- ============================================================
-- FASE 2 — HELPER: cek hasil request hapus (panggil berulang sampai
-- status != 'pending'). Dipanggil dari transaksi TERPISAH sehingga
-- pg_net sudah mengirim request-nya.
-- ============================================================
CREATE OR REPLACE FUNCTION public.storage_get_delete_result(p_request_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET statement_timeout = 0
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
ALTER FUNCTION public.storage_get_delete_result(bigint) OWNER TO postgres;

-- ============================================================
-- RPC: bersihkan file storage tidak terpakai (yatim)
-- Fase 1: scan + antrekan hapus. Mengembalikan request_id yang
-- dipakai aplikasi untuk mengecek hasil via storage_get_delete_result.
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_orphan_storage_secured(
  p_token text,
  p_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET statement_timeout = 0
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
ALTER FUNCTION public.cleanup_orphan_storage_secured(text, text) OWNER TO postgres;

-- ============================================================
-- OPSIONAL (disarankan): hapus policy SELECT anon pada storage.objects.
-- Setelah fitur di atas dipakai, listing file dari browser TIDAK lagi
-- dibutuhkan, jadi policy ini boleh dihapus agar banner peringatan
-- "Clients can list all files in this bucket" hilang dan privasi lebih
-- ketat (foto tetap tampil normal karena bucket publik dibaca via URL).
--
-- Jalankan baris di bawah ini HANYA jika Anda menginginkannya:
--
-- DROP POLICY IF EXISTS "rt-media-public-read" ON storage.objects;
-- ============================================================
-- SELESAI — jalankan, lalu muat ulang aplikasi.
-- ============================================================
