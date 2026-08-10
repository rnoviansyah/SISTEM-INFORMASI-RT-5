-- ============================================================
-- SECURITY PATCH v2 — KOLOM verified_at & WAKTU VERIFIKASI
-- Jalankan di Supabase SQL Editor SETELAH security_patch.sql berhasil.
--
-- Tujuan:
--   1. Tambah kolom verified_at (timestamptz) = waktu RT memverifikasi
--      / mengubah status (surat, aduan, pinjam, iuran, sumbangan, aspirasi).
--   2. generic_update_secured otomatis mengisi verified_at = now()
--      setiap kali status BERUBAH (dieksekusi RT).
--   3. Backfill data lama yang sudah berstatus selesai/lunas/diterima
--      memakai created_at sebagai perkiraan waktu verifikasi.
-- ============================================================

-- 1) KOLOM verified_at (idempotent)
ALTER TABLE public."Pengaduan"      ADD COLUMN IF NOT EXISTS verified_at timestamptz;
ALTER TABLE public."SuratPengantar" ADD COLUMN IF NOT EXISTS verified_at timestamptz;
ALTER TABLE public."Peminjaman"     ADD COLUMN IF NOT EXISTS verified_at timestamptz;
ALTER TABLE public."Iuran"          ADD COLUMN IF NOT EXISTS verified_at timestamptz;
ALTER TABLE public."Sumbangan"      ADD COLUMN IF NOT EXISTS verified_at timestamptz;
ALTER TABLE public."Aspirasi"       ADD COLUMN IF NOT EXISTS verified_at timestamptz;

-- 2) BACKFILL data lama yang sudah diproses RT (perkiraan = created_at)
UPDATE public."Pengaduan"
   SET verified_at = created_at
 WHERE verified_at IS NULL
   AND lower(trim(coalesce(status, ''))) NOT IN ('', 'belum di verifikasi', 'baru', 'menunggu');

UPDATE public."SuratPengantar"
   SET verified_at = created_at
 WHERE verified_at IS NULL
   AND lower(trim(coalesce(status, ''))) NOT IN ('', 'belum di verifikasi', 'baru', 'menunggu');

UPDATE public."Peminjaman"
   SET verified_at = created_at
 WHERE verified_at IS NULL
   AND lower(trim(coalesce(status, ''))) NOT IN ('', 'belum', 'belum dikembalikan', 'menunggu', 'baru', 'pending');

UPDATE public."Iuran"
   SET verified_at = created_at
 WHERE verified_at IS NULL
   AND lower(trim(coalesce(status, ''))) = 'lunas';

UPDATE public."Sumbangan"
   SET verified_at = created_at
 WHERE verified_at IS NULL
   AND lower(trim(coalesce(status, ''))) NOT IN ('', 'belum di verifikasi', 'belum diverifikasi', 'baru', 'menunggu');

UPDATE public."Aspirasi"
   SET verified_at = created_at
 WHERE verified_at IS NULL
   AND lower(trim(coalesce(status, ''))) NOT IN ('', 'baru', 'belum', 'menunggu');

-- 3) UPDATE RPC: otomatis catat verified_at = now() saat status berubah (oleh RT)
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
    IF lower(v_k) IN ('created_at', 'verified_at') THEN CONTINUE; END IF; -- timestamp sistem, diatur server
    v_val := v_v#>>'{}';
    IF v_set <> '' THEN v_set := v_set || ', '; END IF;
    v_set := v_set || quote_ident(v_k) || ' = ' || coalesce(quote_literal(v_val), 'NULL');
  END LOOP;

  -- (BARU) Catat waktu verifikasi saat RT mengubah status record
  IF v_role = 'RT' AND (p_row ? 'status' OR p_row ? 'Status')
     AND public._col_exists(v_qname, 'verified_at') THEN
    DECLARE
      v_old_status text;
    BEGIN
      EXECUTE 'SELECT coalesce(status::text,'''') FROM ' || v_qname
              || ' WHERE ' || quote_ident(p_id_col) || ' = $1 LIMIT 1'
        INTO v_old_status USING p_id_val;
      IF lower(trim(coalesce(v_old_status, '')))
         IS DISTINCT FROM lower(trim(coalesce(p_row->>'status', p_row->>'Status', ''))) THEN
        IF v_set <> '' THEN v_set := v_set || ', '; END IF;
        v_set := v_set || 'verified_at = now()';
      END IF;
    END;
  END IF;

  IF v_set = '' THEN
    RETURN jsonb_build_object('status','error','message','Tidak ada kolom yang diubah.');
  END IF;
  EXECUTE 'UPDATE ' || v_qname || ' SET ' || v_set || ' WHERE ' || quote_ident(p_id_col) || ' = $1'
    USING p_id_val;
  RETURN jsonb_build_object('status','success','message','Data berhasil diperbarui!');
END $$;

-- ============================================================
-- SELESAI — verifikasi: jalankan, lalu muat ulang aplikasi.
-- Kolom verified_at juga muncul di tampilan tabel menu terkait.
-- ============================================================
