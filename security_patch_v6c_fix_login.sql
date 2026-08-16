-- ============================================================
-- SECURITY PATCH v6c — FIX LOGIN BCRYPT (idempotent)
-- Jalankan di Supabase SQL Editor. Aman dijalankan ulang.
-- PENTING: jalankan SELURUH file ini (jangan hanya sebagian).
--
-- GEJALA: setelah patch v6, login selalu gagal padahal password benar
-- ("Username/NIK atau Password salah!"), dan kolom password di tabel
-- Users sudah berbentuk hash bcrypt ($2a$10$...). Error asli di SQL
-- Editor: "function crypt(text, text) does not exist".
--
-- PENYEBAB AKAR:
--   Di Supabase, extension pgcrypto terpasang di schema 'extensions',
--   BUKAN 'public'. Fungsi helper _bcrypt_hash/_bcrypt_check tidak
--   menyertakan 'extensions' di search_path-nya, sehingga saat dipanggil
--   dari dalam verify_user_login (yang search_path-nya public, pg_temp),
--   crypt()/gen_salt() tidak ditemukan -> login selalu gagal.
--   (Migrasi hash bisa jalan karena dijalankan langsung dari SQL Editor
--   yang search_path-nya lengkap — itulah kenapa hash tampak benar.)
--
-- SOLUSI DI FILE INI (urutan sudah diatur agar aman dijalankan penuh):
--   1. Aktifkan pgcrypto + perbaiki helper bcrypt (search_path menyertakan
--      'extensions') + trigger + verify_user_login + GRANT + reload skema.
--   2. Diagnosa (baca hasilnya).
--   3. (OPSIONAL) reset password RT ke nilai yang diketahui.
-- ============================================================

-- ============================================================
-- BAGIAN 1: PERBAIKAN (jalankan dulu — wajib)
-- ============================================================

-- 1a) Aktifkan pgcrypto (di Supabase terpasang ke schema 'extensions')
create extension if not exists pgcrypto;

-- 1b) Helper bcrypt — search_path menyertakan 'extensions' agar
--     crypt()/gen_salt() ketemu saat dipanggil dari fungsi lain.
create or replace function public._bcrypt_limit(p_password text)
returns text language sql immutable as $$
  select case when octet_length(coalesce(p_password,'')) > 72
    then convert_from(substring(convert_to(coalesce(p_password,''), 'UTF8') from 1 for 72), 'UTF8')
    else coalesce(p_password,'') end;
$$;

create or replace function public._bcrypt_hash(p_password text)
returns text language sql volatile set search_path = public, extensions, pg_temp as $$
  select crypt(public._bcrypt_limit(p_password), gen_salt('bf', 10));
$$;

create or replace function public._bcrypt_check(p_password text, p_hash text)
returns boolean language sql volatile set search_path = public, extensions, pg_temp as $$
  select p_hash is not null and p_hash <> '' and
         crypt(public._bcrypt_limit(coalesce(p_password,'')), p_hash) = p_hash;
$$;

-- 1c) Trigger hash otomatis + sapuan aman:
--     password yang masih plaintext ikut di-hash.
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

update public."Users"
   set password = public._bcrypt_hash(password)
 where password is not null and password <> '' and password not like '$2%';

-- 1d) Login RPC versi bcrypt (drop + create ulang agar definisi pasti baru)
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

-- 1e) Hak eksekusi eksplisit (idempotent)
grant execute on function public.verify_user_login(text, text) to anon, authenticated, service_role;
grant execute on function public._bcrypt_limit(text)      to anon, authenticated, service_role;
grant execute on function public._bcrypt_hash(text)       to anon, authenticated, service_role;
grant execute on function public._bcrypt_check(text, text) to anon, authenticated, service_role;

-- 1f) Paksa PostgREST memuat definisi fungsi terbaru
notify pgrst, 'reload schema';

-- ============================================================
-- BAGIAN 2: DIAGNOSA (setelah Bagian 1 — baca hasilnya)
-- ============================================================

-- 2a) Tes hash bcrypt langsung. GANTI '<PASSWORD_ASLI>' dengan password
--     yang kamu ketik di layar login (mis. admin123).
select username,
       (password like '$2%')                     as sudah_bcrypt,
       public._bcrypt_check('<PASSWORD_ASLI>', password) as password_cocok
  from public."Users"
 where lower(trim(coalesce(username,''))) in ('admin','adminrt')
    or upper(trim(coalesce(role,''))) = 'RT';

-- 2b) Tes RPC login langsung. GANTI '<PASSWORD_ASLI>'.
select public.verify_user_login('admin', '<PASSWORD_ASLI>');

-- ============================================================
-- BAGIAN 3 (OPSIONAL): RESET PASSWORD RT KE NILAI YANG DIKETAHUI
-- Hanya jalankan bila Bagian 2 menunjukkan password_cocok = false
-- (password asli memang beda). Hapus tanda komentar di bawah:
-- password akun 'admin' di-reset jadi: admin123
-- (bisa diganti lagi di menu Pengaturan setelah berhasil masuk).
-- ============================================================
-- update public."Users"
--    set password = public._bcrypt_hash('admin123')
--  where role = 'RT'
--    and lower(trim(coalesce(username,''))) = 'admin';

-- ============================================================
-- CEK AKHIR (jalankan setelah semua bagian selesai):
--   select public.verify_user_login('admin', 'admin123');
-- Harus mengembalikan status success. Kalau 'Password salah.',
-- berarti password asli memang beda — jalankan Bagian 3.
-- ============================================================
