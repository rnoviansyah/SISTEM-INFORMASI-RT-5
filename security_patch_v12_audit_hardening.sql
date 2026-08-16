-- ============================================================
-- SECURITY PATCH v12 — AUDIT HARDENING (TEMUAN AUDIT TOTAL)
-- Jalankan di Supabase SQL Editor SETELAH v11. Idempotent — aman dijalankan ulang.
--
-- ISI PATCH (urutan temuan audit):
--   A. Storage privat  : bucket rt-media -> private, hapus policy baca-publik
--                        & upload-anonim. Upload baru lewat RPC terautentikasi
--                        (validasi sesi + magic bytes + ukuran) dan gambarnya
--                        disimpan sebagai dataURL di kolom DB — TIDAK ada lagi
--                        file yang bisa dibaca/di-upload siapa pun tanpa login.
--   B. Enforce kepemilikan & status di server (generic_insert/update_secured):
--                        role Warga TIDAK bisa lagi insert/update dengan status
--                        final (LUNAS/Disetujui/Ditolak/dll) atau mengaku atas
--                        nama NIK orang lain — dipaksa nik = nik sesi & status
--                        awal. RT tidak terpengaruh.
--   C. Sesi kedaluwarsa  : kolom expires_at (30 hari); auth_role menolak &
--                        menghapus sesi kadaluarsa. Frontend logout otomatis.
--   D. PRIMARY KEY semua tabel (id) + ID baru dibuat crypto.randomUUID (frontend).
--   E. Rate-limit login  : 5 percobaan gagal -> terkunci 15 menit.
--   F. Notifikasi server-side : RPC get_notifications_secured (LIMIT, filter
--                        peran/pemilik) — getNotifications tidak lagi
--                        mengunduh SEMUA baris 11 tabel ke browser.
--   G. created_at selalu dipaksa now() di server (tidak bisa di-backdate klien).
--
-- BACKWARD COMPATIBLE: bila patch ini belum dijalankan, aplikasi tetap berjalan
-- (alur lama). Beberapa fungsi di-CREATE OR REPLACE — pastikan patch v7 + v10
-- + v11 sudah dijalankan sebelumnya (fungsi _dec_data, _sha, _enc_data,
-- auth_role, _col_exists, _row_owner_match, _decrypt_row).
-- ============================================================

-- ============================================================
-- A) STORAGE PRIVAT — hapus akses publik & upload anonim
-- ============================================================
UPDATE storage.buckets SET public = false WHERE id = 'rt-media';

DROP POLICY IF EXISTS "rt-media-public-read" ON storage.objects;
DROP POLICY IF EXISTS "rt-media-anon-upload" ON storage.objects;

-- Validasi magic bytes gambar (JPEG/PNG/WebP/GIF/BMP) dari base64 — versi
-- server dari isValidImageFile klien (PDF/doc yang di-rename ditolak).
create or replace function public._is_image_base64(p_b64 text)
returns boolean language plpgsql immutable set search_path = public, pg_temp as $$
declare v_bytes bytea;
begin
  if p_b64 is null or p_b64 = '' then return false; end if;
  begin
    v_bytes := decode(substring(p_b64 from 1 for 16), 'base64');
  exception when others then return false; end;
  if octet_length(v_bytes) >= 3 and get_byte(v_bytes,0) = 255 and get_byte(v_bytes,1) = 216 and get_byte(v_bytes,2) = 255 then return true; end if; -- JPEG
  if octet_length(v_bytes) >= 4 and get_byte(v_bytes,0) = 137 and get_byte(v_bytes,1) = 80 and get_byte(v_bytes,2) = 78 and get_byte(v_bytes,3) = 71 then return true; end if; -- PNG
  if octet_length(v_bytes) >= 4 and get_byte(v_bytes,0) = 71 and get_byte(v_bytes,1) = 73 and get_byte(v_bytes,2) = 70 and get_byte(v_bytes,3) = 56 then return true; end if; -- GIF
  if octet_length(v_bytes) >= 2 and get_byte(v_bytes,0) = 66 and get_byte(v_bytes,1) = 77 then return true; end if; -- BMP
  if octet_length(v_bytes) >= 12 and get_byte(v_bytes,0) = 82 and get_byte(v_bytes,1) = 73 and get_byte(v_bytes,2) = 70 and get_byte(v_bytes,3) = 70
     and get_byte(v_bytes,8) = 87 and get_byte(v_bytes,9) = 69 and get_byte(v_bytes,10) = 66 and get_byte(v_bytes,11) = 80 then return true; end if; -- WebP
  return false;
end $$;

-- Validasi & "simpan" upload gambar (sesi valid; ukuran & magic bytes diverifikasi
-- di server). Karena bucket storage kini PRIVAT (tidak ada lagi jalur publik),
-- gambar hasil validasi dikembalikan sebagai dataURL dan disimpan langsung di
-- kolom DB (pola yang sama dengan bukti_transfer iuran). Bucket rt-media lama
-- hanya menampung file peninggalan sebelum patch ini dan tidak lagi bisa dibaca
-- publik.
create or replace function public.upload_file_secured(p_token text, p_path text, p_base64 text, p_content_type text default 'image/jpeg')
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_role text := public.auth_role(p_token);
  v_b64  text := trim(coalesce(p_base64,''));
  v_path text := lower(trim(coalesce(p_path,'')));
begin
  if v_role is null then
    return jsonb_build_object('status','error','message','Sesi tidak valid. Silakan login ulang.');
  end if;
  -- Terima "data:image/...;base64,...." atau base64 polos
  if v_b64 like 'data:%' then
    v_b64 := split_part(v_b64, ',', 2);
  end if;
  if v_b64 = '' or octet_length(v_b64) > 4000000 then
    return jsonb_build_object('status','error','message','File kosong atau terlalu besar (maks ±3 MB).');
  end if;
  if not public._is_image_base64(v_b64) then
    return jsonb_build_object('status','error','message','File bukan gambar asli (JPEG/PNG/WebP/GIF/BMP).');
  end if;
  -- Path aman: hanya huruf/angka/_/-// (cegah path traversal)
  if v_path = '' or v_path ~ '[^a-z0-9_\-/]' or v_path like '../%' or v_path like '%..' or strpos(v_path, '..') > 0 then
    return jsonb_build_object('status','error','message','Path file tidak valid.');
  end if;
  return jsonb_build_object('status','success','message','File valid & terverifikasi.');
end $$;

-- ============================================================
-- B) ENFORCE KEPEMILIKAN & STATUS DI SERVER (role Warga)
--    Menimpa generic_insert_secured & generic_update_secured (v7).
-- ============================================================
create or replace function public.generic_insert_secured(p_table text, p_token text, p_row jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_table  text := lower(trim(p_table));
  v_qname  text := public._qname(v_table);
  v_role   text := public.auth_role(p_token);
  v_nik    text := '';
  v_nama   text := '';
  v_clean  jsonb;
  v_status text;
  v_default_status text;
  v_status_whitelist text[] := array['baru','menunggu verifikasi','diajukan','pending'];
  v_allow_warga boolean;
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

  v_allow_warga := v_table in ('pengaduan','suratpengantar','peminjaman','sumbangan','iuran','aspirasi');

  if v_role <> 'RT' then
    if not v_allow_warga then
      return jsonb_build_object('status','error','message','Akses ditolak: operasi ini hanya untuk RT.');
    end if;
    -- Nik diambil dari Sessions (pemilik sesi), nama dari Users — dikualifikasi
    -- agar tidak ambigu: kedua tabel sama-sama punya kolom nik.
    select coalesce(public._dec_data(s.nik),''), coalesce(public._dec_data(u.nama),'')
      into v_nik, v_nama
      from public."Sessions" s
      left join public."Users" u on u.nik_sha = s.nik_sha
      where s.token = trim(p_token) limit 1;
  end if;

  -- Buang kolom yang tidak boleh di-set klien; created_at dipaksa server (temuan G)
  v_clean := public._normalize_row(p_row, v_qname);
  v_clean := v_clean - 'created_at' - 'verified_at' - 'nik_sha' - 'kk_sha';

  if v_role <> 'RT' then
    -- Paksa kepemilikan: nik = nik sesi (Aspirasi anonim dikecualikan)
    if v_table <> 'aspirasi' and public._col_exists(v_qname, 'nik') then
      v_clean := v_clean || jsonb_build_object('nik', v_nik);
    end if;
    -- Paksa nama = nama sesi bila tersedia (cegah spoof nama orang lain)
    if v_nama <> '' and public._col_exists(v_qname, 'nama') then
      v_clean := v_clean || jsonb_build_object('nama', v_nama);
    end if;
    -- Paksa status awal (whitelist status "pending"; selain itu default per tabel)
    v_default_status := case v_table
      when 'peminjaman' then 'Menunggu Verifikasi'
      when 'iuran'      then 'Menunggu Verifikasi'
      else 'Baru' end;
    if public._col_exists(v_qname, 'status') then
      v_status := lower(trim(coalesce(v_clean->>'status','')));
      if v_status = '' or not (v_status = any(v_status_whitelist)) then
        v_status := v_default_status;
      else
        v_status := initcap(v_status);
      end if;
      v_clean := jsonb_set(v_clean, '{status}', to_jsonb(v_status));
    end if;
  end if;

  v_clean := public._encrypt_row(v_clean);
  v_clean := v_clean || jsonb_build_object('created_at', to_jsonb(now()));
  execute 'INSERT INTO ' || v_qname || ' SELECT * FROM jsonb_populate_record(NULL::' || v_qname || ', $1)'
    using v_clean;
  return jsonb_build_object('status','success','message','Data berhasil disimpan!');
end $$;

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
  v_status_whitelist text[] := array['baru','menunggu verifikasi','diajukan','pending'];
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

    -- Temuan audit #2: Warga tidak boleh mengubah kolom kepemilikan / status final
    if v_role <> 'RT' then
      if lower(v_k) in ('nik','no_kk') then
        continue; -- kepemilikan tidak bisa dipindah
      end if;
      if lower(v_k) = 'status' then
        v_val := lower(trim(coalesce(v_v#>>'{}','')));
        if v_val = '' or not (v_val = any(v_status_whitelist)) then
          return jsonb_build_object('status','error','message',
            'Akses ditolak: perubahan status ke "' || coalesce(v_v#>>'{}','') || '" hanya bisa dilakukan RT.');
        end if;
      end if;
    end if;

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

-- ============================================================
-- C) SESI KEDALUWARSA (30 hari) + pembersihan otomatis
-- ============================================================
ALTER TABLE public."Sessions" ADD COLUMN IF NOT EXISTS "expires_at" timestamptz;
UPDATE public."Sessions" SET expires_at = now() + interval '30 days'
 WHERE expires_at IS NULL AND created_at IS NULL;
UPDATE public."Sessions" SET expires_at = created_at + interval '30 days'
 WHERE expires_at IS NULL AND created_at IS NOT NULL;

-- auth_role baru: tolak + hapus sesi yang sudah kadaluarsa
create or replace function public.auth_role(p_token text)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare v_role text;
begin
  if p_token is null or trim(p_token) = '' then return null; end if;
  select role into v_role from public."Sessions"
    where token = trim(p_token)
      and (expires_at is null or expires_at > now())
    limit 1;
  if v_role is not null then
    return upper(trim(v_role));
  end if;
  -- Sesi ada tapi kadaluarsa -> hapus
  delete from public."Sessions" where token = trim(p_token) and expires_at <= now();
  return null;
end $$;

-- login_secured baru: set expires_at & bersihkan sesi lama user
create or replace function public.login_secured(p_username text, p_password text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_user public."Users"%rowtype;
  v_u text := lower(trim(coalesce(p_username,'')));
  v_p text := coalesce(p_password,'');
  v_token text := 'SESS-' || replace(gen_random_uuid()::text, '-', '');
  v_lock text;
begin
  if v_u = '' or v_p = '' then
    return jsonb_build_object('status','error','message','Username / NIK dan Password tidak boleh kosong!');
  end if;

  v_lock := public._login_lock_check(v_u);
  if v_lock is not null then
    return jsonb_build_object('status','error','message', v_lock);
  end if;

  select * into v_user from public."Users"
    where lower(trim(coalesce(username,''))) = v_u
       or nik_sha = public._sha(v_u)
       or public._sha(coalesce(nik,'')) = public._sha(v_u)
    limit 1;
  if not found then
    perform public._login_lock_fail(v_u);
    return jsonb_build_object('status','error','message','Akun tidak ditemukan.');
  end if;
  if not public._bcrypt_check(v_p, v_user.password) then
    perform public._login_lock_fail(v_u);
    return jsonb_build_object('status','error','message','Password salah.');
  end if;

  perform public._login_lock_clear(v_u);
  -- Bersihkan sesi lama user ini (maks 5 sesi aktif per akun)
  delete from public."Sessions"
   where nik_sha = public._sha(trim(coalesce(public._dec_data(v_user.nik),'')))
     and token not in (
       select token from public."Sessions"
        where nik_sha = public._sha(trim(coalesce(public._dec_data(v_user.nik),'')))
        order by created_at desc limit 4
     );

  insert into public."Sessions" (token, nik, nik_sha, role, createdat, created_at, expires_at)
  values (v_token,
          public._enc_data(trim(coalesce(public._dec_data(v_user.nik),''))),
          public._sha(trim(coalesce(public._dec_data(v_user.nik),''))),
          trim(coalesce(v_user.role,'Warga')),
          to_char(now(), 'YYYY-MM-DD HH24:MI:SS'), now(),
          now() + interval '30 days')
  on conflict (token) do nothing;

  return jsonb_build_object(
    'status','success',
    'token', v_token,
    'expires_at', (now() + interval '30 days')::text,
    'username', v_user.username,
    'role', v_user.role,
    'nik', public._dec_data(v_user.nik),
    'nama', v_user.nama
  );
end $$;

-- save_session_secured (fallback DB lama): set expires_at juga
create or replace function public.save_session_secured(p_token text, p_nik text, p_role text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if p_token is null or trim(p_token) = '' then
    return jsonb_build_object('status','error','message','Token kosong.');
  end if;
  insert into public."Sessions" (token, nik, nik_sha, role, createdat, created_at, expires_at)
  values (trim(p_token),
          public._enc_data(trim(coalesce(p_nik,''))),
          public._sha(trim(coalesce(p_nik,''))),
          trim(coalesce(p_role,'Warga')),
          to_char(now(), 'YYYY-MM-DD HH24:MI:SS'), now(),
          now() + interval '30 days')
  on conflict (token) do update
    set nik = excluded.nik, nik_sha = excluded.nik_sha, role = excluded.role,
        createdat = excluded.createdat, created_at = excluded.created_at,
        expires_at = excluded.expires_at;
  return jsonb_build_object('status','success');
end $$;

-- ============================================================
-- E) RATE-LIMIT LOGIN (5 gagal -> kunci 15 menit)
-- ============================================================
CREATE TABLE IF NOT EXISTS public."LoginAttempts" (
  "username" text PRIMARY KEY,
  "failed" int NOT NULL DEFAULT 0,
  "locked_until" timestamptz
);
ALTER TABLE public."LoginAttempts" ENABLE ROW LEVEL SECURITY;

create or replace function public._login_lock_check(p_username text)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare v_locked_until timestamptz;
begin
  select locked_until into v_locked_until from public."LoginAttempts"
    where username = lower(trim(coalesce(p_username,''))) limit 1;
  if v_locked_until is not null and v_locked_until > now() then
    return 'Terlalu banyak percobaan login gagal. Coba lagi dalam beberapa menit.';
  end if;
  return null;
end $$;

create or replace function public._login_lock_fail(p_username text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_u text := lower(trim(coalesce(p_username,'')));
begin
  if v_u = '' then return; end if;
  insert into public."LoginAttempts" (username, failed, locked_until)
  values (v_u, 1, null)
  on conflict (username) do update set failed = public."LoginAttempts".failed + 1;
  update public."LoginAttempts" set locked_until = now() + interval '15 minutes', failed = 0
   where username = v_u and failed >= 5;
end $$;

create or replace function public._login_lock_clear(p_username text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  delete from public."LoginAttempts" where username = lower(trim(coalesce(p_username,'')));
end $$;

-- verify_user_login (fallback DB lama): rate-limit juga
create or replace function public.verify_user_login(p_username text, p_password text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_user public."Users"%rowtype;
  v_u text := lower(trim(coalesce(p_username,'')));
  v_p text := coalesce(p_password,'');
  v_lock text;
begin
  if v_u = '' or v_p = '' then
    return jsonb_build_object('status','error','message','Username / NIK dan Password tidak boleh kosong!');
  end if;
  v_lock := public._login_lock_check(v_u);
  if v_lock is not null then
    return jsonb_build_object('status','error','message', v_lock);
  end if;
  select * into v_user from public."Users"
    where lower(trim(coalesce(username,''))) = v_u
       or nik_sha = public._sha(v_u)
       or public._sha(coalesce(nik,'')) = public._sha(v_u)
    limit 1;
  if not found then
    perform public._login_lock_fail(v_u);
    return jsonb_build_object('status','error','message','Akun tidak ditemukan.');
  end if;
  if not public._bcrypt_check(v_p, v_user.password) then
    perform public._login_lock_fail(v_u);
    return jsonb_build_object('status','error','message','Password salah.');
  end if;
  perform public._login_lock_clear(v_u);
  return jsonb_build_object(
    'status','success',
    'username', v_user.username,
    'role', v_user.role,
    'nik', public._dec_data(v_user.nik),
    'nama', v_user.nama
  );
end $$;

-- ============================================================
-- D) PRIMARY KEY semua tabel (id) — idempotent, toleran duplikat
-- ============================================================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['Aset','Aspirasi','Bansos','Iuran','Kelahiran','Kematian','Keuangan',
    'Peminjaman','Pengaduan','Pengaturan','PindahKeluar','PindahMasuk',
    'Sumbangan','SuratPengantar','Users','Warga'] LOOP
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c JOIN pg_class r ON r.oid = c.conrelid
        WHERE r.relname = t AND c.contype = 'p'
      ) THEN
        EXECUTE format('ALTER TABLE public.%I ADD PRIMARY KEY (id)', t);
        RAISE NOTICE 'PK ditambahkan ke %', t;
      END IF;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'PK tabel % dilewati (kemungkinan ada id duplikat di data lama): %', t, SQLERRM;
    END;
  END LOOP;
END $$;

-- ============================================================
-- F) NOTIFIKASI SERVER-SIDE — get_notifications_secured
--    Menggantikan perhitungan di browser (fetch 11 tabel penuh) dengan
--    RPC terbatas + LIMIT. Menghasilkan {id, menu, pesan, rawDate}.
-- ============================================================
create or replace function public.get_notifications_secured(p_token text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_role    text := public.auth_role(p_token);
  v_nik     text := '';
  v_nik_sha text := '';
  v_kk_sha  text := '';
  v_nama    text := '';
  v_rows    jsonb := '[]'::jsonb;
  v_row     jsonb;
  v_pesan   text;
  v_raw     text;
  v_st      text;
  v_stl     text;
  v_pending boolean;
  v_match   boolean;
  v_trunc   text;
  v_n       int := 0;
  v_max     int;
begin
  if v_role is null then
    return jsonb_build_object('status','error','message','Sesi tidak valid. Silakan login ulang.');
  end if;

  select coalesce(public._dec_data(nik),''), nik_sha into v_nik, v_nik_sha
    from public."Sessions" where token = trim(p_token) limit 1;
  v_nama := lower(trim(coalesce((select nama from public."Users" where nik_sha = v_nik_sha limit 1),'')));
  select coalesce(kk_sha,'') into v_kk_sha
    from public."Warga" where nik_sha = v_nik_sha limit 1;

  v_max := case when v_role = 'RT' then 200 else 100 end;

  -- PENGADUAN
  for v_row in
    select value from jsonb_array_elements(
      (select coalesce(jsonb_agg(to_jsonb(t) order by created_at desc), '[]'::jsonb) from public."Pengaduan" t)
    )
  loop
    if v_n >= v_max then exit; end if;
    v_st := coalesce(v_row->>'status','');
    v_stl := lower(v_st);
    v_pending := v_st = '' or v_stl like '%belum%' or v_stl like '%menunggu%' or v_stl like '%baru%' or v_stl like '%pending%';
    if v_role = 'RT' then
      v_rows := v_rows || jsonb_build_object('id', coalesce(v_row->>'id',''),
        'menu','Pengaduan',
        'pesan', 'Aduan ' || coalesce(v_row->>'jenis_aduan', v_row->>'jenis', 'Umum')
              || ' dari ' || coalesce(v_row->>'nama', v_row->>'nama_lengkap', v_row->>'pelapor', 'Warga')
              || ': (' || v_st || ')',
        'rawDate', coalesce(v_row->>'verified_at', v_row->>'created_at'));
      v_n := v_n + 1;
    else
      v_match := (v_row->>'nik_sha') = v_nik_sha
              or (coalesce(v_row->>'kk_sha','') <> '' and (v_row->>'kk_sha') = v_kk_sha)
              or (v_nama <> '' and lower(coalesce(v_row->>'nama', v_row->>'nama_lengkap', v_row->>'pelapor','')) like '%' || v_nama || '%');
      if v_match and not v_pending then
        v_rows := v_rows || jsonb_build_object('id', coalesce(v_row->>'id',''), 'menu','Pengaduan',
          'pesan', 'Status Aduan ' || coalesce(v_row->>'jenis_aduan', v_row->>'jenis', 'Aduan') || ': ' || v_st,
          'rawDate', coalesce(v_row->>'verified_at', v_row->>'created_at'));
        v_n := v_n + 1;
      end if;
    end if;
  end loop;

  -- SURAT PENGANTAR
  for v_row in
    select value from jsonb_array_elements(
      (select coalesce(jsonb_agg(to_jsonb(t) order by created_at desc), '[]'::jsonb) from public."SuratPengantar" t)
    )
  loop
    if v_n >= v_max then exit; end if;
    v_st := coalesce(v_row->>'status','');
    v_stl := lower(v_st);
    v_pending := v_st = '' or v_stl like '%belum%' or v_stl like '%menunggu%' or v_stl like '%baru%' or v_stl like '%pending%';
    if v_role = 'RT' then
      if v_pending then
        v_rows := v_rows || jsonb_build_object('id', coalesce(v_row->>'id',''),
          'menu','SuratPengantar',
          'pesan', 'Pengajuan ' || coalesce(v_row->>'jenis_surat', v_row->>'keperluan', v_row->>'jenis', 'Surat')
                || ' dari ' || coalesce(v_row->>'nama', v_row->>'nama_lengkap', v_row->>'pemohon', 'Warga'),
          'rawDate', coalesce(v_row->>'verified_at', v_row->>'created_at'));
        v_n := v_n + 1;
      end if;
    else
      v_match := (v_row->>'nik_sha') = v_nik_sha
              or (coalesce(v_row->>'kk_sha','') <> '' and (v_row->>'kk_sha') = v_kk_sha)
              or (v_nama <> '' and lower(coalesce(v_row->>'nama', v_row->>'nama_lengkap', v_row->>'pemohon','')) like '%' || v_nama || '%');
      if v_match and not v_pending then
        v_rows := v_rows || jsonb_build_object('id', coalesce(v_row->>'id',''), 'menu','SuratPengantar',
          'pesan', 'Surat Pengantar Anda: Status kini "' || v_st || '"',
          'rawDate', coalesce(v_row->>'verified_at', v_row->>'created_at'));
        v_n := v_n + 1;
      end if;
    end if;
  end loop;

  -- PEMINJAMAN
  for v_row in
    select value from jsonb_array_elements(
      (select coalesce(jsonb_agg(to_jsonb(t) order by created_at desc), '[]'::jsonb) from public."Peminjaman" t)
    )
  loop
    if v_n >= v_max then exit; end if;
    v_st := coalesce(v_row->>'status','');
    v_stl := lower(v_st);
    v_pending := v_st = '' or v_stl like '%menunggu%' or v_stl like '%belum%' or v_stl like '%baru%' or v_stl like '%pending%';
    if v_role = 'RT' then
      if v_pending then
        v_rows := v_rows || jsonb_build_object('id', coalesce(v_row->>'id',''), 'menu','Aset',
          'pesan', 'Pengajuan Pinjam ' || coalesce(v_row->>'nama_barang', v_row->>'nama_aset', v_row->>'barang','Aset')
                || ' (' || coalesce(v_row->>'jumlah', v_row->>'qty','1') || ' unit) dari '
                || coalesce(v_row->>'nama_peminjam', v_row->>'nama', v_row->>'peminjam','Warga'),
          'rawDate', coalesce(v_row->>'verified_at', v_row->>'created_at'));
        v_n := v_n + 1;
      end if;
    else
      v_match := (v_row->>'nik_sha') = v_nik_sha
              or (v_nama <> '' and lower(coalesce(v_row->>'nama_peminjam', v_row->>'nama', v_row->>'peminjam','')) like '%' || v_nama || '%');
      if v_match and not v_pending then
        v_rows := v_rows || jsonb_build_object('id', coalesce(v_row->>'id',''), 'menu','Aset',
          'pesan', 'Peminjaman ' || coalesce(v_row->>'nama_barang', v_row->>'nama_aset', v_row->>'barang','Barang') || ': ' || v_st,
          'rawDate', coalesce(v_row->>'verified_at', v_row->>'created_at'));
        v_n := v_n + 1;
      end if;
    end if;
  end loop;

  -- IURAN
  for v_row in
    select value from jsonb_array_elements(
      (select coalesce(jsonb_agg(to_jsonb(t) order by created_at desc), '[]'::jsonb) from public."Iuran" t)
    )
  loop
    if v_n >= v_max then exit; end if;
    v_st := coalesce(v_row->>'status','');
    v_stl := lower(v_st);
    if v_role = 'RT' then
      if v_stl like '%menunggu%' or v_stl like '%verifikasi%' then
        v_rows := v_rows || jsonb_build_object('id', coalesce(v_row->>'id',''), 'menu','Iuran',
          'pesan', 'Iuran ' || coalesce(v_row->>'bulan','') || ' ' || coalesce(v_row->>'tahun','')
                || ' dari ' || coalesce(v_row->>'nama', v_row->>'nama_lengkap','Warga') || ' perlu verifikasi',
          'rawDate', coalesce(v_row->>'verified_at', v_row->>'created_at'));
        v_n := v_n + 1;
      end if;
    else
      v_match := (v_row->>'nik_sha') = v_nik_sha
              or (coalesce(v_row->>'kk_sha','') <> '' and (v_row->>'kk_sha') = v_kk_sha)
              or (v_nama <> '' and lower(coalesce(v_row->>'nama', v_row->>'nama_lengkap','')) like '%' || v_nama || '%');
      if v_match then
        if v_stl = 'lunas' or (v_stl like '%lunas%' and v_stl not like '%belum%') then
          v_rows := v_rows || jsonb_build_object('id', coalesce(v_row->>'id',''), 'menu','Iuran',
            'pesan', 'Iuran ' || coalesce(v_row->>'bulan','') || ' telah LUNAS diverifikasi RT!',
            'rawDate', coalesce(v_row->>'verified_at', v_row->>'created_at'));
          v_n := v_n + 1;
        end if;
      end if;
    end if;
  end loop;

  -- SUMBANGAN
  for v_row in
    select value from jsonb_array_elements(
      (select coalesce(jsonb_agg(to_jsonb(t) order by created_at desc), '[]'::jsonb) from public."Sumbangan" t)
    )
  loop
    if v_n >= v_max then exit; end if;
    v_st := coalesce(v_row->>'status','');
    v_stl := lower(v_st);
    v_pending := v_st = '' or v_stl like '%belum%' or v_stl like '%menunggu%' or v_stl like '%baru%' or v_stl like '%pending%';
    if v_role = 'RT' then
      if v_pending then
        v_rows := v_rows || jsonb_build_object('id', coalesce(v_row->>'id',''), 'menu','Sumbangan',
          'pesan', 'Sumbangan Baru dari ' || coalesce(v_row->>'nama', v_row->>'nama_lengkap','Warga')
                || ' (' || (case when v_st = '' then 'Belum diverifikasi' else v_st end) || ')',
          'rawDate', coalesce(v_row->>'verified_at', v_row->>'created_at'));
        v_n := v_n + 1;
      end if;
    else
      v_match := (v_row->>'nik_sha') = v_nik_sha
              or (v_nama <> '' and lower(coalesce(v_row->>'nama', v_row->>'nama_lengkap','')) like '%' || v_nama || '%');
      if v_match and not v_pending then
        v_rows := v_rows || jsonb_build_object('id', coalesce(v_row->>'id',''), 'menu','Sumbangan',
          'pesan', 'Sumbangan Anda: ' || v_st,
          'rawDate', coalesce(v_row->>'verified_at', v_row->>'created_at'));
        v_n := v_n + 1;
      end if;
    end if;
  end loop;

  -- ASPIRASI
  for v_row in
    select value from jsonb_array_elements(
      (select coalesce(jsonb_agg(to_jsonb(t) order by created_at desc), '[]'::jsonb) from public."Aspirasi" t)
    )
  loop
    if v_n >= v_max then exit; end if;
    v_st := coalesce(v_row->>'status','');
    v_stl := lower(v_st);
    v_pending := v_st = '' or v_stl like '%baru%' or v_stl like '%menunggu%' or v_stl like '%belum%';
    v_trunc := coalesce(v_row->>'isi_aspirasi', v_row->>'isi', v_row->>'aspirasi', v_row->>'pesan', v_row->>'saran', 'Masukan baru');
    if octet_length(v_trunc) > 35 then v_trunc := left(v_trunc, 35) || '...'; end if;
    if v_role = 'RT' then
      if v_pending then
        v_rows := v_rows || jsonb_build_object('id', coalesce(v_row->>'id',''), 'menu','Aspirasi',
          'pesan', 'Aspirasi Anonim: "' || v_trunc || '"',
          'rawDate', coalesce(v_row->>'verified_at', v_row->>'created_at'));
        v_n := v_n + 1;
      end if;
    else
      if not v_pending then
        v_rows := v_rows || jsonb_build_object('id', coalesce(v_row->>'id',''), 'menu','Aspirasi',
          'pesan', 'Aspirasi Anda: ' || v_st,
          'rawDate', coalesce(v_row->>'verified_at', v_row->>'created_at'));
        v_n := v_n + 1;
      end if;
    end if;
  end loop;

  -- BANSOS
  for v_row in
    select value from jsonb_array_elements(
      (select coalesce(jsonb_agg(to_jsonb(t) order by created_at desc), '[]'::jsonb) from public."Bansos" t)
    )
  loop
    if v_n >= v_max then exit; end if;
    v_st := coalesce(v_row->>'status','');
    v_stl := lower(v_st);
    v_pending := v_st = '' or v_stl like '%belum%' or v_stl like '%kedaluwarsa%' or v_stl like '%menunggu%';
    if v_role = 'RT' then
      if v_pending then
        v_rows := v_rows || jsonb_build_object('id', coalesce(v_row->>'id',''), 'menu','Bansos',
          'pesan', 'Bansos ' || coalesce(v_row->>'jenis_bansos', v_row->>'jenis','Bansos') || ' untuk '
                || coalesce(v_row->>'nama', v_row->>'nama_lengkap','Warga') || ': ' || (case when v_st = '' then 'Belum Diambil' else v_st end),
          'rawDate', coalesce(v_row->>'created_at',''));
        v_n := v_n + 1;
      end if;
    else
      v_match := (v_row->>'nik_sha') = v_nik_sha
              or (coalesce(v_row->>'kk_sha','') <> '' and (v_row->>'kk_sha') = v_kk_sha)
              or (v_nama <> '' and lower(coalesce(v_row->>'nama', v_row->>'nama_lengkap','')) like '%' || v_nama || '%');
      if v_match then
        v_raw := case when v_stl like '%sudah%' and coalesce(v_row->>'diambil_pada','') <> ''
                  then v_row->>'diambil_pada' else coalesce(v_row->>'created_at','') end;
        v_rows := v_rows || jsonb_build_object('id', coalesce(v_row->>'id',''), 'menu','Bansos',
          'pesan', 'Bansos Anda (' || coalesce(v_row->>'jenis_bansos', v_row->>'jenis','Bansos') || '): ' || (case when v_st = '' then 'Belum Diambil' else v_st end),
          'rawDate', v_raw);
        v_n := v_n + 1;
      end if;
    end if;
  end loop;

  -- KELAHIRAN
  for v_row in
    select value from jsonb_array_elements(
      (select coalesce(jsonb_agg(to_jsonb(t) order by created_at desc), '[]'::jsonb) from public."Kelahiran" t)
    )
  loop
    if v_n >= v_max then exit; end if;
    if v_role = 'RT' then
      v_rows := v_rows || jsonb_build_object('id', coalesce(v_row->>'id',''), 'menu','Kelahiran',
        'pesan', 'Kelahiran baru: ' || coalesce(v_row->>'nama_bayi', v_row->>'nama','anak baru'),
        'rawDate', coalesce(v_row->>'created_at',''));
      v_n := v_n + 1;
    else
      v_match := (v_row->>'nik_sha') = v_nik_sha
              or (coalesce(v_row->>'kk_sha','') <> '' and (v_row->>'kk_sha') = v_kk_sha)
              or (v_nama <> '' and lower(coalesce(v_row->>'nama_bayi', v_row->>'nama_ayah', v_row->>'nama_ibu', v_row->>'nama','')) like '%' || v_nama || '%');
      if v_match then
        v_rows := v_rows || jsonb_build_object('id', coalesce(v_row->>'id',''), 'menu','Kelahiran',
          'pesan', 'Kelahiran: ' || coalesce(v_row->>'nama_bayi', v_row->>'nama','anak baru'),
          'rawDate', coalesce(v_row->>'created_at',''));
        v_n := v_n + 1;
      end if;
    end if;
  end loop;

  -- KEMATIAN
  for v_row in
    select value from jsonb_array_elements(
      (select coalesce(jsonb_agg(to_jsonb(t) order by created_at desc), '[]'::jsonb) from public."Kematian" t)
    )
  loop
    if v_n >= v_max then exit; end if;
    if v_role = 'RT' then
      v_rows := v_rows || jsonb_build_object('id', coalesce(v_row->>'id',''), 'menu','Kematian',
        'pesan', 'Kematian baru: ' || coalesce(v_row->>'nama', v_row->>'nama_lengkap','Warga'),
        'rawDate', coalesce(v_row->>'created_at',''));
      v_n := v_n + 1;
    else
      v_match := (v_row->>'nik_sha') = v_nik_sha
              or (v_nama <> '' and lower(coalesce(v_row->>'nama', v_row->>'nama_lengkap','')) like '%' || v_nama || '%');
      if v_match then
        v_rows := v_rows || jsonb_build_object('id', coalesce(v_row->>'id',''), 'menu','Kematian',
          'pesan', 'Kematian: ' || coalesce(v_row->>'nama', v_row->>'nama_lengkap','Warga'),
          'rawDate', coalesce(v_row->>'created_at',''));
        v_n := v_n + 1;
      end if;
    end if;
  end loop;

  -- PINDAH MASUK
  for v_row in
    select value from jsonb_array_elements(
      (select coalesce(jsonb_agg(to_jsonb(t) order by created_at desc), '[]'::jsonb) from public."PindahMasuk" t)
    )
  loop
    if v_n >= v_max then exit; end if;
    if v_role = 'RT' then
      v_rows := v_rows || jsonb_build_object('id', coalesce(v_row->>'id',''), 'menu','PindahMasuk',
        'pesan', 'Pindah masuk: ' || coalesce(v_row->>'nama', v_row->>'nama_lengkap','Warga') || ' dari ' || coalesce(v_row->>'asal','-'),
        'rawDate', coalesce(v_row->>'created_at',''));
      v_n := v_n + 1;
    else
      v_match := (v_row->>'nik_sha') = v_nik_sha
              or (v_nama <> '' and lower(coalesce(v_row->>'nama', v_row->>'nama_lengkap','')) like '%' || v_nama || '%');
      if v_match then
        v_rows := v_rows || jsonb_build_object('id', coalesce(v_row->>'id',''), 'menu','PindahMasuk',
          'pesan', 'Pindah masuk: ' || coalesce(v_row->>'nama', v_row->>'nama_lengkap','Warga') || ' dari ' || coalesce(v_row->>'asal','-'),
          'rawDate', coalesce(v_row->>'created_at',''));
        v_n := v_n + 1;
      end if;
    end if;
  end loop;

  -- PINDAH KELUAR
  for v_row in
    select value from jsonb_array_elements(
      (select coalesce(jsonb_agg(to_jsonb(t) order by created_at desc), '[]'::jsonb) from public."PindahKeluar" t)
    )
  loop
    if v_n >= v_max then exit; end if;
    if v_role = 'RT' then
      v_rows := v_rows || jsonb_build_object('id', coalesce(v_row->>'id',''), 'menu','PindahKeluar',
        'pesan', 'Pindah keluar: ' || coalesce(v_row->>'nama', v_row->>'nama_lengkap','Warga') || ' ke ' || coalesce(v_row->>'alamat_tujuan', v_row->>'tujuan','-'),
        'rawDate', coalesce(v_row->>'created_at',''));
      v_n := v_n + 1;
    else
      v_match := (v_row->>'nik_sha') = v_nik_sha
              or (v_nama <> '' and lower(coalesce(v_row->>'nama', v_row->>'nama_lengkap','')) like '%' || v_nama || '%');
      if v_match then
        v_rows := v_rows || jsonb_build_object('id', coalesce(v_row->>'id',''), 'menu','PindahKeluar',
          'pesan', 'Pindah keluar: ' || coalesce(v_row->>'nama', v_row->>'nama_lengkap','Warga') || ' ke ' || coalesce(v_row->>'alamat_tujuan', v_row->>'tujuan','-'),
          'rawDate', coalesce(v_row->>'created_at',''));
        v_n := v_n + 1;
      end if;
    end if;
  end loop;

  return jsonb_build_object('status','success','data', v_rows);
end $$;

-- ============================================================
-- GRANT (idempotent)
-- ============================================================
grant execute on function public.upload_file_secured(text, text, text, text) to anon, authenticated, service_role;
grant execute on function public.generic_insert_secured(text, text, jsonb) to anon, authenticated, service_role;
grant execute on function public.generic_update_secured(text, text, text, text, jsonb) to anon, authenticated, service_role;
grant execute on function public.auth_role(text) to anon, authenticated, service_role;
grant execute on function public.login_secured(text, text) to anon, authenticated, service_role;
grant execute on function public.save_session_secured(text, text, text) to anon, authenticated, service_role;
grant execute on function public.verify_user_login(text, text) to anon, authenticated, service_role;
grant execute on function public.get_notifications_secured(text) to anon, authenticated, service_role;

notify pgrst, 'reload schema';

-- ============================================================
-- CEK SETUP (read-only, setelah patch):
--   select public.login_secured('adminrt', 'admin123');
--     -> status success + token + expires_at (+30 hari)
--   5x login salah -> 'Terlalu banyak percobaan...' selama 15 menit.
--   select public.upload_file_secured('<TOKEN>', 'warga/uji.jpg', '<base64_gambar>');
--     -> status success (gambar valid); status error bila bukan gambar asli.
-- ============================================================
