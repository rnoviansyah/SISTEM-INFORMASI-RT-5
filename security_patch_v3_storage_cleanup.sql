-- ============================================================
-- SECURITY PATCH v3 — HAPUS FILE STORAGE SAAT DATA DIHAPUS
-- Jalankan di Supabase SQL Editor SETELAH security_patch_v2 berhasil.
--
-- Tujuan:
--   1. RPC delete_storage_files_secured: menghapus file dari bucket
--      'rt-media' (Supabase Storage). Dipakai oleh:
--        a) "Bersihkan Tabel" di Pengaturan (dengan password RT)
--        b) Tombol "Hapus Data" per baris (sesi RT valid)
--      sehingga kuota storage tidak menumpuk file sampah.
--   2. Idempotent — aman dijalankan ulang.
-- ============================================================

CREATE OR REPLACE FUNCTION public.delete_storage_files_secured(
  p_token text, p_password text, p_paths text[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_role text := public.auth_role(p_token);
  v_rt_pass text;
  v_paths text[] := ARRAY[]::text[];
  v_p text;
  v_res jsonb;
BEGIN
  IF v_role <> 'RT' THEN
    RETURN jsonb_build_object('status','error','message','Akses ditolak.');
  END IF;
  -- Password wajib saat dipanggil dari alur "Bersihkan Tabel" (opsional di alur hapus per baris)
  IF coalesce(p_password, '') <> '' THEN
    SELECT password INTO v_rt_pass FROM public."Users"
      WHERE upper(trim(coalesce(role,''))) = 'RT' LIMIT 1;
    IF v_rt_pass IS DISTINCT FROM coalesce(p_password,'') THEN
      RETURN jsonb_build_object('status','error','message','Password salah.');
    END IF;
  END IF;
  -- Filter path kosong / bukan string
  FOREACH v_p IN ARRAY coalesce(p_paths, ARRAY[]::text[]) LOOP
    IF coalesce(trim(v_p),'') <> '' THEN
      v_paths := v_paths || trim(v_p);
    END IF;
  END LOOP;
  IF array_length(v_paths, 1) IS NULL THEN
    RETURN jsonb_build_object('status','success','message','Tidak ada file storage untuk dihapus.', 'deleted', 0);
  END IF;
  -- Hapus file dari bucket rt-media (pakai storage.delete resmi; fallback: hapus metadata)
  BEGIN
    SELECT storage.delete('rt-media', v_paths) INTO v_res;
  EXCEPTION WHEN undefined_function THEN
    DELETE FROM storage.objects
      WHERE bucket_id = 'rt-media' AND name = ANY(v_paths);
  END;
  RETURN jsonb_build_object('status','success',
    'message', array_length(v_paths, 1) || ' file storage dibersihkan.',
    'deleted', array_length(v_paths, 1));
END $$;

-- ============================================================
-- SELESAI — jalankan, lalu muat ulang aplikasi.
-- ============================================================
