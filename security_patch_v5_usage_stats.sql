-- ============================================================
-- SECURITY PATCH v5 — STATISTIK SERVER REAL (Management API)
-- Jalankan di Supabase SQL Editor SETELAH security_patch_v4.
-- Idempotent — aman dijalankan ulang.
--
-- APA YANG DILAKUKAN:
--   Mengambil statistik pemakaian ASLI (egress, ukuran DB/storage,
--   MAU, realtime, edge function) dari Supabase Management API
--   (GET /v1/organizations/{slug}/usage) memakai pg_net + Vault,
--   pola dua fase yang sama dengan fitur hapus storage (v3.3/v4.3):
--     Fase 1: get_usage_secured() mengantrekan GET ke Management API
--             lalu langsung kembali dengan request_id.
--     Fase 2: get_usage_result(request_id) membaca respons dari
--             transaksi terpisah (aplikasi memanggil berulang).
--   PLUS: get_real_database_stats v2 dihitung ulang jadi ASLI
--   (pg_database_size + jumlah baris SEMUA tabel public), bukan
--   lagi angka hardcoded 25.91 MB / hanya 3 tabel.
--
-- SETUP SEKALI (wajib, sebelum angka cloud muncul di Pengaturan):
--   1) Buat Personal Access Token (PAT) di
--      supabase.com -> Account (avatar kanan atas) -> Access Tokens
--      -> Generate New Token (centang semua scope). Salin token-nya
--      (mulai "sbp_...").
--   2) Simpan PAT ke Vault (GANTI <PAT_ANDA>, JANGAN bagikan ke
--      siapa pun — token ini punya akses penuh ke organisasi):
--      select vault.create_secret('<PAT_ANDA>', 'supabase_mgmt_pat');
--   3) (Opsional tapi disarankan) Simpan slug organisasi ke Vault
--      agar hemat 2 panggilan API. Slug ada di URL dashboard:
--      supabase.com/dashboard/org/<SLUG>/...
--      select vault.create_secret('<SLUG>', 'supabase_org_slug');
--      Kalau dilewati, aplikasi akan otomatis mencari slug-nya
--      (mode discovery, sedikit lebih lambat).
--   4) Pastikan extension sudah aktif (dari setup v3/v4):
--      create extension if not exists pg_net;
--      create extension if not exists supabase_vault;
--
-- CEK SETUP (read-only):
--   select name, (decrypted_secret is not null) as "tersimpan"
--   from vault.decrypted_secrets
--   where name in ('supabase_mgmt_pat','supabase_org_slug','storage_project_url');
-- ============================================================

-- ============================================================
-- FASE 2 — HELPER: baca hasil request pg_net (body penuh).
-- Dipanggil berulang dari transaksi TERPISAH sampai status != pending.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_usage_result(p_request_id bigint)
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
    RETURN jsonb_build_object('status','success','http',200,'body', v_body);
  END IF;
  RETURN jsonb_build_object('status','error','message',
    'Management API ' || CASE WHEN v_status IS NOT NULL THEN ('HTTP ' || v_status || ' ') ELSE '(gagal terkirim) ' END
    || ': ' || coalesce(v_body, v_err, ''));
END $$;
ALTER FUNCTION public.get_usage_result(bigint) OWNER TO postgres;

-- ============================================================
-- FASE 1 — RPC: antrekan panggilan Management API.
--   p_token     : token sesi RT (wajib).
--   p_org_slug  : (opsional) slug organisasi. Kalau kosong, dicek
--                 dari Vault 'supabase_org_slug'. Kalau masih kosong,
--                 mode discovery: antrekan GET /v1/organizations +
--                 GET /v1/projects/{ref} supaya frontend bisa
--                 mencocokkan organisasi project ini, lalu memanggil
--                 fungsi ini lagi dengan slug.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_usage_secured(p_token text, p_org_slug text DEFAULT NULL, p_ref text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET statement_timeout = 0
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

  -- 2) Ref project: prioritas dari parameter frontend (SUPABASE_URL),
  --    fallback baca storage_project_url dari Vault.
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
ALTER FUNCTION public.get_usage_secured(text, text, text) OWNER TO postgres;

-- ============================================================
-- get_real_database_stats v2 — angka DATABASE ASLI.
-- Kartu "Database Size" & "Total Baris Data" di Pengaturan.
-- Sebelumnya: total_mb hardcoded 25.91 & hanya 3 tabel.
-- Sekarang: pg_database_size() asli + jumlah baris SEMUA tabel
-- public. Idempotent (DROP + CREATE).
-- ============================================================
DROP FUNCTION IF EXISTS public.get_real_database_stats();
CREATE OR REPLACE FUNCTION public.get_real_database_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

-- ============================================================
-- SELESAI — jalankan, lalu buka Pengaturan -> Database Settings
-- & Server Stats -> Refresh Stats.
-- ============================================================
