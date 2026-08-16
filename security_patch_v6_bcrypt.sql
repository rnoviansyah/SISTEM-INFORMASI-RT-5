-- ============================================================
-- SECURITY PATCH v6 — BCRYPT UNTUK LOGIN & REGISTER
-- Jalankan di Supabase SQL Editor SETELAH security_patch_v5_usage_stats.sql.
-- Idempotent — aman dijalankan ulang.
--
-- APA YANG DILAKUKAN:
--   1. Aktifkan ekstensi pgcrypto (crypt / gen_salt 'bf' = bcrypt).
--   2. Helper _bcrypt_limit / _bcrypt_hash / _bcrypt_check.
--   3. Migrasi password lama (plaintext) yang tersimpan di tabel Users
--      menjadi hash bcrypt (cost 10). Password login warga TIDAK berubah —
--      yang berubah hanya cara penyimpanannya.
--   4. Trigger BEFORE INSERT/UPDATE OF password pada tabel Users:
--      setiap password baru (register, reset password, edit user)
--      otomatis di-hash bcrypt di sisi server — frontend TIDAK perlu diubah.
--   5. verify_user_login memakai bcrypt (bukan perbandingan plaintext).
--   6. cleanup_database_secured & delete_storage_files_secured memverifikasi
--      password akun RT dengan bcrypt (menggantikan perbandingan plaintext).
--
-- CATATAN: setelah patch ini dijalankan, semua password di tabel Users
-- berbentuk hash bcrypt ($2a$.../$2b$...). Jangan pernah menimpa kolom
-- password dengan teks biasa manual (trigger akan me-hash otomatis).
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1) HELPER: batasi password ke 72 byte (batas internal bcrypt)
-- ------------------------------------------------------------
create or replace function public._bcrypt_limit(p_password text)
returns text language sql immutable as $$
  select case when octet_length(coalesce(p_password,'')) > 72
    then convert_from(substring(convert_to(coalesce(p_password,''), 'UTF8') from 1 for 72), 'UTF8')
    else coalesce(p_password,'') end;
$$;

-- ------------------------------------------------------------
-- 2) HELPER: hash password dengan bcrypt (cost 10)
--    PENTING (Supabase): pgcrypto terpasang di schema 'extensions', jadi
--    search_path helper harus menyertakan 'extensions' — tanpa itu
--    crypt()/gen_salt() tidak ketemu saat dipanggil dari fungsi lain
--    (error 42883 'function crypt(text, text) does not exist' = penyebab
--    login selalu gagal walau hash sudah benar).
-- ------------------------------------------------------------
create or replace function public._bcrypt_hash(p_password text)
returns text language sql volatile set search_path = public, extensions, pg_temp as $$
  select crypt(public._bcrypt_limit(p_password), gen_salt('bf', 10));
$$;

-- ------------------------------------------------------------
-- 3) HELPER: verifikasi password terhadap hash bcrypt
--    (aman terhadap NULL / hash tidak valid)
-- ------------------------------------------------------------
create or replace function public._bcrypt_check(p_password text, p_hash text)
returns boolean language sql volatile set search_path = public, extensions, pg_temp as $$
  select p_hash is not null and p_hash <> '' and
         crypt(public._bcrypt_limit(coalesce(p_password,'')), p_hash) = p_hash;
$$;

-- ------------------------------------------------------------
-- 4) MIGRASI password plaintext lama -> hash bcrypt
--    (hanya baris yang belum berbentuk hash bcrypt)
-- ------------------------------------------------------------
update public."Users"
   set password = public._bcrypt_hash(password)
 where password is not null and password <> '' and password not like '$2%';

-- ------------------------------------------------------------
-- 5) TRIGGER: hash otomatis setiap INSERT / UPDATE password
--    (register via tambahUserWarga, resetPasswordUser, editUserAkun)
-- ------------------------------------------------------------
create or replace function public.trg_users_hash_password()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if new.password is not null and new.password <> '' and new.password not like '$2%' then
    new.password := public._bcrypt_hash(new.password);
  end if;
  return new;
end $$;

drop trigger if exists trg_users_hash_password on public."Users";
create trigger trg_users_hash_password
  before insert or update of password on public."Users"
  for each row execute function public.trg_users_hash_password();

-- ------------------------------------------------------------
-- 6) LOGIN: verify_user_login memakai bcrypt
-- ------------------------------------------------------------
drop function if exists public.verify_user_login(text, text);
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
       or lower(trim(coalesce(nik,''))) = v_u
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
    'nik', v_user.nik,
    'nama', v_user.nama
  );
end $$;

-- ------------------------------------------------------------
-- 7) cleanup_database_secured: verifikasi password RT via bcrypt
-- ------------------------------------------------------------
create or replace function public.cleanup_database_secured(
  p_token text, p_password text, p_table_name text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
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

-- ------------------------------------------------------------
-- 8) delete_storage_files_secured (override patch v3.3/v4.3):
--    verifikasi password RT via bcrypt
-- ------------------------------------------------------------
drop function if exists public.delete_storage_files_secured(text, text, text[]);
create or replace function public.delete_storage_files_secured(
  p_token text, p_password text, p_paths text[])
returns jsonb language plpgsql security definer
set search_path = public, pg_temp
set statement_timeout = 0
as $$
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
alter function public.delete_storage_files_secured(text, text, text[]) owner to postgres;

-- ============================================================
-- CEK SETUP (read-only): semua password harus diawali '$2a$'/'$2b$'
--   select username, role, left(password, 7) as hash_awal
--   from public."Users" order by id;
-- ============================================================
