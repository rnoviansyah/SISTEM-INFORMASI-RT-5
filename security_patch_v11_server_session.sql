-- ============================================================
-- SECURITY PATCH v11 — SESSION TOKEN DIBUAT DI SERVER
-- Jalankan di Supabase SQL Editor SETELAH v10. Idempotent — aman dijalankan ulang.
--
-- APA MASALAHNYA (temuan audit):
--   Token sesi sebelumnya dibuat DI BROWSER memakai Math.random() + Date.now()
--   (PRNG JavaScript yang predictable), lalu dikirim ke save_session_secured.
--   Attacker yang bisa menebak pola token bisa memalsukan sesi orang lain.
--
-- APA YANG DILAKUKAN:
--   RPC baru login_secured(p_username, p_password):
--     1. Verifikasi kredensial persis seperti verify_user_login (bcrypt, NIK
--        dicocokkan via nik_sha — tidak pernah plaintext).
--     2. Membuat token sesi DI SERVER: 'SESS-' + hex dari gen_random_uuid()
--        (128-bit acak kriptografis PostgreSQL — bukan PRNG browser).
--     3. Menyimpan sesi ke tabel "Sessions" (nik terenkripsi + nik_sha,
--        role, created_at) dalam SATU transaksi atomik.
--     4. Mengembalikan token aman + data user ke frontend.
--   Frontend TIDAK pernah membuat token lagi — cukup memakai token hasil
--   kembalian server. Fungsi lama (verify_user_login / save_session_secured)
--   TIDAK diubah agar tetap kompatibel.
--
-- BACKWARD COMPATIBLE: bila patch ini belum dijalankan, aplikasi otomatis
-- kembali ke alur lama (verify_user_login + token klien) — tidak error.
-- ============================================================

-- 1) LOGIN + BUAT SESSION: token di-generate di server
create or replace function public.login_secured(p_username text, p_password text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_user public."Users"%rowtype;
  v_u text := lower(trim(coalesce(p_username,'')));
  v_p text := coalesce(p_password,'');
  v_token text := 'SESS-' || replace(gen_random_uuid()::text, '-', '');
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

  -- Simpan sesi (format identik dengan save_session_secured lama)
  insert into public."Sessions" (token, nik, nik_sha, role, createdat, created_at)
  values (v_token,
          public._enc_data(trim(coalesce(public._dec_data(v_user.nik),''))),
          public._sha(trim(coalesce(public._dec_data(v_user.nik),''))),
          trim(coalesce(v_user.role,'Warga')),
          to_char(now(), 'YYYY-MM-DD HH24:MI:SS'), now())
  on conflict (token) do nothing;

  return jsonb_build_object(
    'status','success',
    'token', v_token,
    'username', v_user.username,
    'role', v_user.role,
    'nik', public._dec_data(v_user.nik),
    'nama', v_user.nama
  );
end $$;

-- 2) HAK EKSEKUSI (idempotent)
grant execute on function public.login_secured(text, text) to anon, authenticated, service_role;

notify pgrst, 'reload schema';

-- ============================================================
-- CEK SETUP (read-only, setelah patch):
--   select public.login_secured('adminrt', 'admin123');
--   -> status 'success' + field token (panjang, acak) — itu yang dipakai
--      frontend sebagai sesi. Token lama yang sudah ada di tabel Sessions
--      tetap valid sampai logout.
--   Catatan: jangan jalankan cek ini berulang-ulang — setiap sukses
--   membuat satu baris Sessions baru.
-- ============================================================
