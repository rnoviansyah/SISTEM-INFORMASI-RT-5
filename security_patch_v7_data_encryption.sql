-- ============================================================
-- SECURITY PATCH v7 — ENKRIPSI DATA SENSITIF AT-REST
-- Jalankan di Supabase SQL Editor SETELAH security_patch_v6c_fix_login.sql.
-- Idempotent — aman dijalankan ulang.
--
-- APA YANG DILAKUKAN:
--   Kolom sensitif (nik, no_kk, no_hp, tanggal_lahir, tempat_lahir) di
--   semua tabel disimpan TERENKRIPSI (pgp_sym_encrypt, kunci di Vault).
--   Kalau database di-dump/dibobol, yang keluar hanya ciphertext.
--   Dekripsi HANYA dilakukan di server (di dalam RPC) untuk yang berhak:
--     - role RT  -> melihat plaintext semua data
--     - pemilik data / anggota keluarga (No. KK sama) -> plaintext
--     - selain itu -> "***RAHASIA***" (sama seperti sensor sekarang)
--   UI tidak berubah: RT & pemilik tetap melihat angka asli.
--
--   Pencocokan NIK antar tabel / login by NIK tetap jalan lewat kolom
--   nik_sha (sha256) — ciphertext tidak bisa dibandingkan langsung.
--
-- PENTING SEBELUM MENJALANKAN (wajib, sekali):
--   1) Buat kunci enkripsi acak (32 byte) — contoh:
--        select encode(gen_random_bytes(32), 'hex');
--   2) Simpan ke Vault (GANTI <KUNCI>):
--        select vault.create_secret('<KUNCI>', 'data_enc_key');
--   3) SIMPAN CADANGAN kunci di tempat aman (password manager / kertas).
--      Kalau kunci hilang, data terenkripsi TIDAK BISA dibaca lagi.
--   4) Cek: select name from vault.decrypted_secrets where name='data_enc_key';
--
-- CATATAN:
--   - Tabel Kelahiran TIDAK dienkripsi (tidak punya kolom nik, sehingga
--     tidak ada sinyal kepemilikan — data kelahiran bersifat publik RT).
--   - Kolom password Users tetap di-handle trigger bcrypt (v6), tidak
--     disentuh di sini.
--   - PERBAIKAN rilis pertama: pgp_sym_encrypt mengembalikan bytea, dan tanpa
--     armor() nilainya tersimpan sebagai teks hex '\x...' yang tampil acak
--     di UI. Patch ini sudah diperbaiki (enkripsi = armor() + perbaikan data
--     lama otomatis di bagian 4b). Kalau database SUDAH pernah menjalankan
--     patch ini versi lama, cukup JALANKAN ULANG file ini — idempotent,
--     data lama yang berformat '\x...' diubah ke armor tanpa perlu kunci.
--   Verifikasi: setelah patch, jalankan:
--       select public._dec_data(nik) from public."Warga" limit 5;
--     Hasilnya harus NIK asli (bukan ciphertext).
--   (Verifikasi di atas berjalan sebagai postgres di SQL Editor —
--    anon/authenticated TIDAK punya akses ke _dec_data, hanya RPC
--    SECURITY DEFINER yang boleh memanggilnya.)
-- ============================================================

-- ============================================================
-- 0) GUARD: kunci data_enc_key WAJIB ada di Vault
-- ============================================================
do $$
begin
  if (select count(*) from vault.decrypted_secrets where name = 'data_enc_key') = 0 then
    raise exception 'Kunci data_enc_key belum disimpan di Vault. Jalankan dulu: select vault.create_secret(''<KUNCI_ACAK>'', ''data_enc_key''); lalu simpan cadangan kunci di tempat aman.';
  end if;
end $$;

-- ============================================================
-- 1) HELPER: hash lookup + enkripsi/dekripsi
--    (search_path menyertakan 'extensions' — pgcrypto/vault di sana)
-- ============================================================
-- _is_enc: true bila nilai adalah ciphertext PGP — format armor '-----'
-- atau format hex bytea lama '\x...' (bug rilis pertama).
create or replace function public._is_enc(p_val text)
returns boolean language sql immutable as $$
  select p_val is not null and (left(p_val, 5) = '-----' or left(p_val, 2) = '\x');
$$;

create or replace function public._sha(p_text text)
returns text language sql immutable set search_path = public, extensions, pg_temp as $$
  select encode(digest(coalesce(p_text,''), 'sha256'), 'hex');
$$;

create or replace function public._enc_data(p_plain text)
returns text language plpgsql volatile set search_path = public, extensions, pg_temp as $$
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

create or replace function public._dec_data(p_cipher text)
returns text language plpgsql volatile set search_path = public, extensions, pg_temp as $$
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

-- ============================================================
-- 2) HELPER: siapkan baris untuk TULIS (enkripsi + nik_sha/kk_sha)
-- ============================================================
create or replace function public._encrypt_row(p_row jsonb)
returns jsonb language plpgsql volatile set search_path = public, extensions, pg_temp as $$
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

-- ============================================================
-- 3) HELPER: siapkan baris untuk BACA
--    p_allowed = true  -> dekripsi kolom sensitif (RT / pemilik / keluarga)
--    p_allowed = false -> kolom yang terenkripsi disensor; yang plaintext dibiarkan
-- ============================================================
create or replace function public._decrypt_row(p_row jsonb, p_allowed boolean)
returns jsonb language plpgsql volatile set search_path = public, extensions, pg_temp as $$
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

-- ============================================================
-- 4) KOLOM nik_sha / kk_sha (untuk pencocokan nilai terenkripsi)
-- ============================================================
alter table public."Warga"           add column if not exists nik_sha text;
alter table public."Warga"           add column if not exists kk_sha  text;
alter table public."Users"           add column if not exists nik_sha text;
alter table public."Iuran"           add column if not exists nik_sha text;
alter table public."Iuran"           add column if not exists kk_sha  text;
alter table public."Bansos"          add column if not exists nik_sha text;
alter table public."Bansos"          add column if not exists kk_sha  text;
alter table public."Pengaduan"       add column if not exists nik_sha text;
alter table public."SuratPengantar"  add column if not exists nik_sha text;
alter table public."Peminjaman"      add column if not exists nik_sha text;
alter table public."Sumbangan"       add column if not exists nik_sha text;
alter table public."Kematian"        add column if not exists nik_sha text;
alter table public."Kematian"        add column if not exists kk_sha  text;
alter table public."PindahMasuk"     add column if not exists nik_sha text;
alter table public."PindahMasuk"     add column if not exists kk_sha  text;
alter table public."PindahKeluar"    add column if not exists nik_sha text;
alter table public."PindahKeluar"    add column if not exists kk_sha  text;
alter table public."Sessions"        add column if not exists nik_sha text;

-- ============================================================
-- 4b) PERBAIKAN FORMAT CIPHERTEXT LAMA (bug rilis pertama v7):
--     pgp_sym_encrypt mengembalikan bytea; tanpa armor() tersimpan
--     sebagai teks hex '\x...' yang TIDAK bisa didekripsi _dec_data
--     (UI menampilkan teks acak). Nilai '\x...' diubah ke armor — isi
--     ciphertext TIDAK berubah, kunci TIDAK diperlukan. Idempotent:
--     nilai yang sudah armor ('-----') tidak tersentuh.
-- ============================================================
do $$
declare r record; v_q text;
begin
  perform set_config('search_path', 'public, extensions', true);
  for r in
    select t.table_name, c.column_name
      from information_schema.tables t
      join information_schema.columns c
        on c.table_schema = t.table_schema and c.table_name = t.table_name
     where t.table_schema = 'public'
       and t.table_name in ('Warga','Users','Iuran','Bansos','Pengaduan',
                            'SuratPengantar','Peminjaman','Sumbangan','Kematian',
                            'PindahMasuk','PindahKeluar','Sessions')
       and lower(c.column_name) in ('nik','no_kk','no_hp','tanggal_lahir','tempat_lahir')
  loop
    begin
      v_q := format(
        'update public.%I set %I = armor(decode(substring(%I from 3), ''hex''))
          where %I is not null and left(%I, 2) = ''\x'' and length(%I) > 8',
        r.table_name, r.column_name, r.column_name, r.column_name, r.column_name, r.column_name);
      execute v_q;
    exception when others then
      raise notice 'Gagal perbaiki %.%: %', r.table_name, r.column_name, SQLERRM;
    end;
  end loop;
end $$;

-- ============================================================
-- 5) MIGRASI data lama: enkripsi + isi sha (idempotent)
-- ============================================================
-- Warga
update public."Warga" set nik = public._enc_data(nik), nik_sha = public._sha(nik)
 where nik is not null and nik <> '' and not public._is_enc(nik) and nik <> '***RAHASIA***';
update public."Warga" set no_kk = public._enc_data(no_kk), kk_sha = public._sha(no_kk)
 where no_kk is not null and no_kk <> '' and not public._is_enc(no_kk) and no_kk <> '***RAHASIA***';
update public."Warga" set no_hp = public._enc_data(no_hp)
 where no_hp is not null and no_hp <> '' and not public._is_enc(no_hp);
update public."Warga" set tanggal_lahir = public._enc_data(tanggal_lahir)
 where tanggal_lahir is not null and tanggal_lahir <> '' and not public._is_enc(tanggal_lahir);
update public."Warga" set tempat_lahir = public._enc_data(tempat_lahir)
 where tempat_lahir is not null and tempat_lahir <> '' and not public._is_enc(tempat_lahir);
-- Users
update public."Users" set nik = public._enc_data(nik), nik_sha = public._sha(nik)
 where nik is not null and nik <> '' and not public._is_enc(nik) and nik <> '***RAHASIA***';
-- Iuran
update public."Iuran" set nik = public._enc_data(nik), nik_sha = public._sha(nik)
 where nik is not null and nik <> '' and not public._is_enc(nik) and nik <> '***RAHASIA***';
update public."Iuran" set no_kk = public._enc_data(no_kk), kk_sha = public._sha(no_kk)
 where no_kk is not null and no_kk <> '' and not public._is_enc(no_kk) and no_kk <> '***RAHASIA***';
-- Bansos
update public."Bansos" set nik = public._enc_data(nik), nik_sha = public._sha(nik)
 where nik is not null and nik <> '' and not public._is_enc(nik) and nik <> '***RAHASIA***';
update public."Bansos" set no_kk = public._enc_data(no_kk), kk_sha = public._sha(no_kk)
 where no_kk is not null and no_kk <> '' and not public._is_enc(no_kk) and no_kk <> '***RAHASIA***';
-- Pengaduan
update public."Pengaduan" set nik = public._enc_data(nik), nik_sha = public._sha(nik)
 where nik is not null and nik <> '' and not public._is_enc(nik) and nik <> '***RAHASIA***';
update public."Pengaduan" set no_hp = public._enc_data(no_hp)
 where no_hp is not null and no_hp <> '' and not public._is_enc(no_hp);
-- SuratPengantar
update public."SuratPengantar" set nik = public._enc_data(nik), nik_sha = public._sha(nik)
 where nik is not null and nik <> '' and not public._is_enc(nik) and nik <> '***RAHASIA***';
-- Peminjaman
update public."Peminjaman" set nik = public._enc_data(nik), nik_sha = public._sha(nik)
 where nik is not null and nik <> '' and not public._is_enc(nik) and nik <> '***RAHASIA***';
-- Sumbangan
update public."Sumbangan" set nik = public._enc_data(nik), nik_sha = public._sha(nik)
 where nik is not null and nik <> '' and not public._is_enc(nik) and nik <> '***RAHASIA***';
-- Kematian
update public."Kematian" set nik = public._enc_data(nik), nik_sha = public._sha(nik)
 where nik is not null and nik <> '' and not public._is_enc(nik) and nik <> '***RAHASIA***';
update public."Kematian" set no_kk = public._enc_data(no_kk), kk_sha = public._sha(no_kk)
 where no_kk is not null and no_kk <> '' and not public._is_enc(no_kk) and no_kk <> '***RAHASIA***';
-- PindahMasuk
update public."PindahMasuk" set nik = public._enc_data(nik), nik_sha = public._sha(nik)
 where nik is not null and nik <> '' and not public._is_enc(nik) and nik <> '***RAHASIA***';
update public."PindahMasuk" set no_kk = public._enc_data(no_kk), kk_sha = public._sha(no_kk)
 where no_kk is not null and no_kk <> '' and not public._is_enc(no_kk) and no_kk <> '***RAHASIA***';
-- PindahKeluar
update public."PindahKeluar" set nik = public._enc_data(nik), nik_sha = public._sha(nik)
 where nik is not null and nik <> '' and not public._is_enc(nik) and nik <> '***RAHASIA***';
update public."PindahKeluar" set no_kk = public._enc_data(no_kk), kk_sha = public._sha(no_kk)
 where no_kk is not null and no_kk <> '' and not public._is_enc(no_kk) and no_kk <> '***RAHASIA***';
-- Sessions
update public."Sessions" set nik = public._enc_data(nik), nik_sha = public._sha(nik)
 where nik is not null and nik <> '' and not public._is_enc(nik) and nik <> '***RAHASIA***';

-- ============================================================
-- 6) REWRITE RPC — semuanya sadar enkripsi
-- ============================================================

-- 6a) _row_owner_match: row nik kini ciphertext -> dekripsi dulu
create or replace function public._row_owner_match(p_row jsonb, p_nik text, p_nama text)
returns boolean language plpgsql volatile as $$
declare r_nik text; r_nama text;
begin
  if p_row is null then return false; end if;
  r_nik  := lower(trim(coalesce(public._dec_data(p_row->>'nik'), '')));
  r_nama := lower(trim(coalesce(p_row->>'nama', p_row->>'nama_lengkap',
                  p_row->>'nama_peminjam', p_row->>'pelapor', p_row->>'pemohon', '')));
  if coalesce(p_nik,'') <> '' and r_nik <> '' then
    return r_nik = lower(trim(p_nik));
  end if;
  if coalesce(p_nama,'') <> '' and r_nama <> '' then
    return r_nama = lower(trim(p_nama))
        or r_nama like '%'||lower(trim(p_nama))||'%'
        or lower(trim(p_nama)) like '%'||r_nama||'%';
  end if;
  return false;
end $$;

-- 6b) SELECT: dekripsi untuk RT / pemilik / keluarga; selain itu sensor
create or replace function public.generic_select_secured(p_table text, p_token text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
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
      from (select v - 'password' as x from jsonb_array_elements(v_rows) v) s;
  end if;

  return jsonb_build_object('status','success','data', v_rows);
end $$;

-- 6c) INSERT: enkripsi + sha sebelum disimpan
create or replace function public.generic_insert_secured(p_table text, p_token text, p_row jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_table  text := lower(trim(p_table));
  v_qname  text := public._qname(v_table);
  v_role   text := public.auth_role(p_token);
  v_clean  jsonb;
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
  v_clean := public._normalize_row(p_row, v_qname);
  if v_clean = '{}'::jsonb then
    return jsonb_build_object('status','error','message','Data tidak valid.');
  end if;
  -- enkripsi kolom sensitif + isi nik_sha/kk_sha
  v_clean := public._encrypt_row(v_clean);
  if NOT (v_clean ? 'created_at') then
    v_clean := v_clean || jsonb_build_object('created_at', to_jsonb(now()));
  end if;
  execute 'INSERT INTO ' || v_qname || ' SELECT * FROM jsonb_populate_record(NULL::' || v_qname || ', $1)'
    using v_clean;
  return jsonb_build_object('status','success','message','Data berhasil disimpan!');
end $$;

-- 6d) UPDATE: enkripsi nilai sensitif + perbarui sha; cocokkan by id/nik_sha
create or replace function public.generic_update_secured(
  p_table text, p_token text, p_id_col text, p_id_val text, p_row jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
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
end $$;

-- 6e) DELETE: cocokkan by nik_sha bila dihapus by NIK
create or replace function public.generic_delete_secured(
  p_table text, p_token text, p_id_col text, p_id_val text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
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
end $$;

-- 6f) LOGIN: cocokkan NIK via nik_sha; kembalikan nik terdekripsi
create or replace function public.verify_user_login(p_username text, p_password text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_user public."Users"%rowtype;
  v_u text := lower(trim(coalesce(p_username,''))); v_p text := coalesce(p_password,'');
begin
  if v_u = '' or v_p = '' then
    return jsonb_build_object('status','error','message','Username / NIK dan Password tidak boleh kosong!');
  end if;
  select * into v_user from public."Users"
    where lower(trim(coalesce(username,''))) = v_u
       or nik_sha = public._sha(v_u)
       or public._sha(coalesce(nik,'')) = public._sha(v_u)
    limit 1;
  if not found then
    return jsonb_build_object('status','error','message','Akun tidak ditemukan.');
  end if;
  if not public._bcrypt_check(v_p, v_user.password) then
    return jsonb_build_object('status','error','message','Password salah.');
  end if;
  return jsonb_build_object(
    'status','success',
    'username', v_user.username,
    'role', v_user.role,
    'nik', public._dec_data(v_user.nik),
    'nama', v_user.nama
  );
end $$;

-- 6g) SESSION: simpan nik terenkripsi + nik_sha
create or replace function public.save_session_secured(p_token text, p_nik text, p_role text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if p_token is null or trim(p_token) = '' then
    return jsonb_build_object('status','error','message','Token kosong.');
  end if;
  insert into public."Sessions" (token, nik, nik_sha, role, createdat, created_at)
  values (trim(p_token),
          public._enc_data(trim(coalesce(p_nik,''))),
          public._sha(trim(coalesce(p_nik,''))),
          trim(coalesce(p_role,'Warga')),
          to_char(now(), 'YYYY-MM-DD HH24:MI:SS'), now())
  on conflict (token) do update
    set nik = excluded.nik, nik_sha = excluded.nik_sha, role = excluded.role,
        createdat = excluded.createdat, created_at = excluded.created_at;
  return jsonb_build_object('status','success');
end $$;

-- 6h) GET USERS (fallback Pengaturan -> Manajemen Akun Warga):
--     nik sudah ciphertext setelah migrasi -> dekripsi sebelum dikirim ke UI.
create or replace function public.get_users_secured(p_token text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
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

-- ============================================================
-- 7) RPC BARU: cek bansos publik (warga cek NIK/KK tetangga)
--    Mencocokkan lewat nik_sha/kk_sha di SERVER — NIK tidak pernah
--    dikirim/ditampilkan; hasil selalu disensor kolom sensitifnya.
-- ============================================================
create or replace function public.cek_bansos_public(p_token text, p_query text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
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

-- ============================================================
-- 8) HAK EKSEKUSI (idempotent)
-- ============================================================
-- PENTING: helper enkripsi/dekripsi (_enc_data, _dec_data, _encrypt_row,
-- _decrypt_row) TIDAK di-grant ke anon/authenticated. Fungsi-fungsi itu
-- hanya dipanggil dari dalam RPC SECURITY DEFINER (yang berjalan dengan
-- hak pemilik fungsi = postgres) atau dari SQL Editor (postgres).
-- Meng-grant _dec_data ke klien = membuka oracle dekripsi penuh jika
-- peran klien ternyata bisa membaca vault.decrypted_secrets.
grant execute on function public._sha(text)                    to anon, authenticated, service_role;
grant execute on function public.generic_select_secured(text, text)  to anon, authenticated, service_role;
grant execute on function public.generic_insert_secured(text, text, jsonb) to anon, authenticated, service_role;
grant execute on function public.generic_update_secured(text, text, text, text, jsonb) to anon, authenticated, service_role;
grant execute on function public.generic_delete_secured(text, text, text, text) to anon, authenticated, service_role;
grant execute on function public.verify_user_login(text, text) to anon, authenticated, service_role;
grant execute on function public.save_session_secured(text, text, text) to anon, authenticated, service_role;
grant execute on function public.cek_bansos_public(text, text) to anon, authenticated, service_role;

notify pgrst, 'reload schema';

-- ============================================================
-- CEK SETUP (read-only, setelah patch):
--   select left(nik, 5) as awalan from public."Warga" limit 5;
--   -> harus '-----' (ciphertext armor). Kalau masih '\x...' (hex bytea),
--      itu format bug rilis pertama — jalankan ulang patch ini (bagian 4b
--      otomatis mengubahnya ke armor, aman/idempotent).
--   select public._dec_data(nik) from public."Warga" limit 5;
--   -> harus NIK asli.
-- ============================================================
