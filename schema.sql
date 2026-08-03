-- ==========================================================
-- SI RT 05 - CLEAN DATABASE SCHEMA FOR SUPABASE
-- ==========================================================

-- 1. PILIH SCHEMA PUBLIC
SET search_path TO public;

-- 2. DOKUMEN FUNGSI SERVER (RPC)
CREATE OR REPLACE FUNCTION public.get_warga_secured(p_token text) 
RETURNS TABLE(id text, nama_lengkap text, nama_panggilan text, nik text, no_kk text, tempat_lahir text, tanggal_lahir text, jenis_kelamin text, alamat text, status_nikah text, status_tinggal text, pekerjaan text, no_hp text, foto_url text)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_nik TEXT;
  v_user_role TEXT;
  v_user_kk TEXT;
BEGIN
  SELECT s.nik, LOWER(TRIM(s.role)) INTO v_user_nik, v_user_role
  FROM public."Sessions" s WHERE s.token = p_token LIMIT 1;

  IF v_user_nik IS NULL THEN
    RAISE EXCEPTION 'Akses ditolak! Sesi login tidak valid.';
  END IF;

  SELECT w.no_kk INTO v_user_kk 
  FROM public."Warga" w WHERE w.nik::text = v_user_nik::text LIMIT 1;

  IF v_user_role IN ('rt', 'admin') THEN
    RETURN QUERY 
    SELECT w.id, w.nama_lengkap, w.nama_panggilan, w.nik::text, w.no_kk, w.tempat_lahir, w.tanggal_lahir, w.jenis_kelamin, w.alamat, w.status_nikah, w.status_tinggal, w.pekerjaan, w.no_hp::text, w.foto_url 
    FROM public."Warga" w;
  ELSE
    RETURN QUERY 
    SELECT 
      w.id, w.nama_lengkap, w.nama_panggilan,
      CASE WHEN (v_user_kk IS NOT NULL AND w.no_kk = v_user_kk) OR w.nik::text = v_user_nik::text THEN w.nik::text ELSE 'XXXXX' END AS nik,
      CASE WHEN (v_user_kk IS NOT NULL AND w.no_kk = v_user_kk) OR w.nik::text = v_user_nik::text THEN w.no_kk ELSE 'XXXXX' END AS no_kk,
      CASE WHEN (v_user_kk IS NOT NULL AND w.no_kk = v_user_kk) OR w.nik::text = v_user_nik::text THEN w.tempat_lahir ELSE 'XXXXX' END AS tempat_lahir,
      CASE WHEN (v_user_kk IS NOT NULL AND w.no_kk = v_user_kk) OR w.nik::text = v_user_nik::text THEN w.tanggal_lahir ELSE 'XXXXX' END AS tanggal_lahir,
      w.jenis_kelamin, w.alamat,
      CASE WHEN (v_user_kk IS NOT NULL AND w.no_kk = v_user_kk) OR w.nik::text = v_user_nik::text THEN w.status_nikah ELSE 'XXXXX' END AS status_nikah,
      w.status_tinggal,
      CASE WHEN (v_user_kk IS NOT NULL AND w.no_kk = v_user_kk) OR w.nik::text = v_user_nik::text THEN w.pekerjaan ELSE 'XXXXX' END AS pekerjaan,
      CASE WHEN (v_user_kk IS NOT NULL AND w.no_kk = v_user_kk) OR w.nik::text = v_user_nik::text THEN w.no_hp::text ELSE '****' END AS no_hp,
      w.foto_url
    FROM public."Warga" w;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_user_login(p_username text, p_password text) 
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user RECORD;
    v_warga RECORD;
    v_user_json JSONB;
    v_warga_json JSONB;
    v_role TEXT;
    v_nik TEXT;
    v_nama TEXT := '';
    v_alamat TEXT := '';
    v_nohp TEXT := '';
    v_db_password TEXT;
BEGIN
    SELECT * INTO v_user FROM public."Users"
    WHERE LOWER(username) = LOWER(p_username) OR COALESCE(nik::text, '') = p_username LIMIT 1;

    IF v_user IS NULL THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Username / NIK tidak ditemukan!');
    END IF;

    v_user_json := to_jsonb(v_user);
    v_db_password := COALESCE(v_user_json->>'password', v_user_json->>'pass', v_user_json->>'pwd', '');

    IF v_db_password IS DISTINCT FROM p_password THEN
        RETURN jsonb_build_object('status', 'error', 'message', 'Password salah!');
    END IF;

    v_role := COALESCE(v_user_json->>'role', 'Warga');
    v_nik  := COALESCE(v_user_json->>'nik', p_username);

    IF LOWER(v_role) = 'rt' OR LOWER(p_username) = 'adminrt' THEN
        RETURN jsonb_build_object(
            'status', 'success',
            'token', 'token-' || md5(random()::text || clock_timestamp()::text),
            'role', 'RT',
            'nik', v_nik,
            'nama', 'Administrator RT 05',
            'alamat', 'Wilayah RT 05',
            'noHp', '628973366667'
        );
    END IF;

    SELECT * INTO v_warga FROM public."Warga"
    WHERE COALESCE(nik::text, '') = v_nik::text LIMIT 1;

    IF v_warga IS NOT NULL THEN
        v_warga_json := to_jsonb(v_warga);
        v_nama   := COALESCE(v_warga_json->>'nama_lengkap', v_warga_json->>'nama', v_warga_json->>'fullname', p_username);
        v_alamat := COALESCE(v_warga_json->>'alamat', '');
        v_nohp   := COALESCE(v_warga_json->>'no_hp', v_warga_json->>'hp', '');
    ELSE
        v_nama := p_username;
    END IF;

    RETURN jsonb_build_object(
        'status', 'success',
        'token', 'token-' || md5(random()::text || clock_timestamp()::text),
        'role', 'Warga',
        'nik', v_nik,
        'nama', v_nama,
        'alamat', v_alamat,
        'noHp', v_nohp
    );
END;
$$;

-- 3. BUAT SEMUA TABEL APLIKASI DI SCHEMA PUBLIC
CREATE TABLE IF NOT EXISTS public."Aset" (
    id text NOT NULL PRIMARY KEY,
    nama_barang text,
    kondisi text,
    jumlah bigint,
    status_barang text
);

CREATE TABLE IF NOT EXISTS public."Aspirasi" (
    id text NOT NULL PRIMARY KEY,
    tanggal text,
    isi_aspirasi text,
    status text,
    nik bigint
);

CREATE TABLE IF NOT EXISTS public."Iuran" (
    id text NOT NULL PRIMARY KEY,
    nik bigint,
    nama text,
    no_kk bigint,
    bulan text,
    tahun bigint,
    nominal bigint,
    status text,
    tanggal_bayar text,
    diterima_oleh text,
    bukti_transfer text
);

CREATE TABLE IF NOT EXISTS public."Kelahiran" (
    id text NOT NULL PRIMARY KEY,
    nama_bayi text,
    tanggal_lahir text,
    nama_ayah text,
    nama_ibu text,
    alamat text,
    rt bigint
);

CREATE TABLE IF NOT EXISTS public."Kematian" (
    id text NOT NULL PRIMARY KEY,
    nama text,
    nik text,
    no_kk text,
    tanggal_meninggal text,
    rt text,
    alamat text,
    keterangan text
);

CREATE TABLE IF NOT EXISTS public."Keuangan" (
    id text NOT NULL PRIMARY KEY,
    tanggal text,
    pemasukan text,
    pengeluaran text,
    keterangan text,
    saldo text,
    foto_url text
);

CREATE TABLE IF NOT EXISTS public."Peminjaman" (
    id text NOT NULL PRIMARY KEY,
    nama_peminjam text,
    id_barang text,
    nama_barang text,
    jumlah_minta bigint,
    acc bigint,
    keterangan text,
    catatan_rt text,
    status text,
    tanggal text,
    nik text,
    jumlah bigint
);

CREATE TABLE IF NOT EXISTS public."Pengaduan" (
    id text NOT NULL PRIMARY KEY,
    nama text,
    nik bigint,
    no_hp text,
    jenis_aduan text,
    keterangan text,
    tanggal text,
    foto_url text,
    status text,
    foto_penyelesaian text
);

CREATE TABLE IF NOT EXISTS public."Pengaturan" (
    kunci text NOT NULL PRIMARY KEY,
    nilai text
);

CREATE TABLE IF NOT EXISTS public."PindahKeluar" (
    id text NOT NULL PRIMARY KEY,
    nama text,
    nik text,
    no_kk text,
    alamat_tujuan text,
    rt text,
    rw text,
    tanggal_pindah text
);

CREATE TABLE IF NOT EXISTS public."PindahMasuk" (
    id text NOT NULL PRIMARY KEY,
    nama text,
    nik text,
    no_kk text,
    asal text,
    alamat_baru text,
    rt text,
    tanggal_pindah text,
    status_pindah text
);

CREATE TABLE IF NOT EXISTS public."Sessions" (
    token text NOT NULL PRIMARY KEY,
    nik text,
    role text,
    createdat text
);

CREATE TABLE IF NOT EXISTS public."Sumbangan" (
    id text NOT NULL PRIMARY KEY,
    nama text,
    tanggal text,
    jenis_sumbangan text,
    keterangan text,
    nominal bigint,
    bukti_transfer text,
    status text,
    nik bigint
);

CREATE TABLE IF NOT EXISTS public."SuratPengantar" (
    id text NOT NULL PRIMARY KEY,
    nama text,
    nik bigint,
    alamat text,
    rt bigint,
    jenis_surat text,
    status text,
    keterangan_admin text
);

CREATE TABLE IF NOT EXISTS public."Users" (
    username text,
    password text,
    role text,
    nik text NOT NULL PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS public."Warga" (
    id text NOT NULL PRIMARY KEY,
    nama_lengkap text,
    nama_panggilan text,
    nik bigint NOT NULL,
    no_kk text,
    tempat_lahir text,
    tanggal_lahir text,
    jenis_kelamin text,
    alamat text,
    status_nikah text,
    status_tinggal text,
    pekerjaan text,
    no_hp bigint,
    foto_url text
);

-- 4. BUAT SEKALIGUS AKUN ADMIN RT DEFAULT (Username: adminrt, Password: admin123)
INSERT INTO public."Users" (username, password, role, nik)
VALUES ('adminrt', 'admin123', 'RT', '0')
ON CONFLICT (nik) DO NOTHING;
