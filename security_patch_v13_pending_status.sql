-- ============================================================
-- SECURITY PATCH v13 — STATUS AWAL "BELUM DI VERIFIKASI" (KANONIK)
-- Jalankan di Supabase SQL Editor SETELAH v12. Idempotent — aman dijalankan ulang.
--
-- APA MASALAHNYA (temuan pengguna):
--   Data baru yang dibuat Warga (Pengaduan, Surat Pengantar, Sumbangan) tersimpan
--   dengan status "Baru" (dipaksa server patch v12), padahal UI & dropdown Edit
--   memakai label "Belum di verifikasi". Akibatnya tampilan tidak konsisten:
--     • badge tabel menampilkan "Baru" (bukan "Belum di verifikasi")
--     • nilai "Belum di verifikasi" yang dikirim klien DITOLAK whitelist v12
--       (hanya 'baru','menunggu verifikasi','diajukan','pending') lalu diubah
--       server menjadi "Baru"
--     • initcap() mengubah "belum di verifikasi" jadi "Belum Di Verifikasi"
--
-- APA YANG DILAKUKAN:
--   1. generic_insert_secured (override v12): whitelist status ditambah
--      'belum di verifikasi'/'belum diverifikasi'; default status untuk
--      Pengaduan / Surat Pengantar / Sumbangan = "Belum di verifikasi"
--      (Peminjaman & Iuran tetap "Menunggu Verifikasi", Aspirasi tetap "Baru"
--       karena notifikasi aspirasi memang bergantung pada label "Baru").
--   2. Pemetaan status kanonik (pengganti initcap): semua sinonim pending
--      ('baru','diajukan','pending','belum diverifikasi') diseragamkan menjadi
--      "Belum di verifikasi" — tidak lagi berubah jadi "Baru" atau
--      "Belum Di Verifikasi".
--   3. generic_update_secured (override v12): whitelist status sama ditambah,
--      agar penyimpanan status "Belum di verifikasi" tidak ditolak.
--   4. Backfill data lama: Pengaduan / SuratPengantar / Sumbangan dengan
--      status 'Baru' / 'belum diverifikasi' / NULL / '' -> "Belum di verifikasi";
--      Peminjaman 'Baru' -> "Menunggu Verifikasi".
--
-- CATATAN: notifikasi warga ("Status kini ...") TIDAK ikut berubah — status
-- pending (mengandung "belum") tetap tidak memunculkan notifikasi sampai RT
-- benar-benar memproses (mis. mengubah status menjadi "selesai").
-- ============================================================

-- ------------------------------------------------------------
-- 1) INSERT — paksa status awal kanonik (override v12)
-- ------------------------------------------------------------
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
  v_status_whitelist text[] := array['baru','menunggu verifikasi','diajukan','pending','belum di verifikasi','belum diverifikasi'];
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

  -- Buang kolom yang tidak boleh di-set klien; created_at dipaksa server
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
    -- Paksa status awal (v13): "Belum di verifikasi" untuk menu aduan/surat/sumbangan
    v_default_status := case v_table
      when 'peminjaman' then 'Menunggu Verifikasi'
      when 'iuran'      then 'Menunggu Verifikasi'
      when 'aspirasi'   then 'Baru'
      else 'Belum di verifikasi' end;
    if public._col_exists(v_qname, 'status') then
      v_status := lower(trim(coalesce(v_clean->>'status','')));
      if v_status = '' or not (v_status = any(v_status_whitelist)) then
        v_status := v_default_status;
      else
        -- Kanonik (bukan initcap yang jadi "Belum Di Verifikasi"):
        -- semua sinonim pending diseragamkan menjadi "Belum di verifikasi"
        -- (searched CASE + IN — PL/pgSQL tidak menerima daftar nilai di WHEN)
        v_status := case
          when v_status = 'menunggu verifikasi' then 'Menunggu Verifikasi'
          when v_status in ('baru','belum di verifikasi','belum diverifikasi','diajukan','pending') then 'Belum di verifikasi'
          else initcap(v_status) end;
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

-- ------------------------------------------------------------
-- 2) UPDATE — whitelist status sama (override v12)
-- ------------------------------------------------------------
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
  v_status_whitelist text[] := array['baru','menunggu verifikasi','diajukan','pending','belum di verifikasi','belum diverifikasi'];
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

-- ------------------------------------------------------------
-- 3) BACKFILL data lama (idempotent — nilai selain sinonim tidak disentuh)
-- ------------------------------------------------------------
update public."Pengaduan"
   set status = 'Belum di verifikasi'
 where lower(trim(coalesce(status,''))) in ('baru','belum diverifikasi','');

update public."SuratPengantar"
   set status = 'Belum di verifikasi'
 where lower(trim(coalesce(status,''))) in ('baru','belum diverifikasi','');

update public."Sumbangan"
   set status = 'Belum di verifikasi'
 where lower(trim(coalesce(status,''))) in ('baru','belum diverifikasi','');

update public."Peminjaman"
   set status = 'Menunggu Verifikasi'
 where lower(trim(coalesce(status,''))) in ('baru','');

-- ------------------------------------------------------------
-- 4) HAK EKSEKUSI (idempotent)
-- ------------------------------------------------------------
grant execute on function public.generic_insert_secured(text, text, jsonb) to anon, authenticated, service_role;
grant execute on function public.generic_update_secured(text, text, text, text, jsonb) to anon, authenticated, service_role;

notify pgrst, 'reload schema';

-- ============================================================
-- CEK SETUP (read-only, setelah patch):
--   select status, count(*) from public."SuratPengantar" group by status;
--   -> tidak ada lagi status 'Baru' — semuanya 'Belum di verifikasi' / status proses.
--   Buat data baru sebagai Warga -> status otomatis 'Belum di verifikasi'.
-- ============================================================
