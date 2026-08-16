-- ============================================================
-- SECURITY PATCH v6b — HAPUS KOLOM saldo, GANTI QUERY AGREGASI
-- Jalankan di Supabase SQL Editor SETELAH security_patch_v6_bcrypt.sql.
-- Idempotent — aman dijalankan ulang.
--
-- APA YANG DILAKUKAN:
--   1. Hapus kolom "saldo" pada tabel Keuangan. Kolom ini selama ini
--      disimpan per baris tapi tidak pernah dihitung dengan benar
--      (selalu 0 / tidak konsisten) — data turunan (derived) sebaiknya
--      TIDAK disimpan di database.
--   2. Saldo kini dihitung on-demand lewat QUERY AGREGASI server-side:
--      SUM(pemasukan) - SUM(pengeluaran) pada RPC baru
--      get_keuangan_summary_secured(p_token).
--
-- Frontend (js/keuangan.js) memakai RPC ini untuk kartu ringkasan
-- Masuk / Keluar / Saldo. Semua penulisan kolom saldo di js/iuran.js
-- dan js/app.js sudah dihapus bersamaan dengan rilis ini.
-- ============================================================

-- 1) Drop kolom saldo (data turunan — dihitung ulang dari agregasi)
alter table public."Keuangan" drop column if exists saldo;

-- 2) RPC ringkasan kas dari query agregasi (SUMS di sisi server)
create or replace function public.get_keuangan_summary_secured(p_token text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_role text := public.auth_role(p_token);
  v_masuk numeric := 0;
  v_keluar numeric := 0;
  v_saldo numeric := 0;
begin
  if v_role is null then
    return jsonb_build_object('status','error','message','Sesi tidak valid. Silakan login ulang.');
  end if;
  select coalesce(sum(coalesce(pemasukan, 0)), 0),
         coalesce(sum(coalesce(pengeluaran, 0)), 0)
    into v_masuk, v_keluar
    from public."Keuangan";
  v_saldo := v_masuk - v_keluar;
  return jsonb_build_object(
    'status', 'success',
    'total_masuk', v_masuk,
    'total_keluar', v_keluar,
    'saldo', v_saldo
  );
end $$;

-- ============================================================
-- CEK SETUP (read-only):
--   select column_name from information_schema.columns
--    where table_schema = 'public' and table_name = 'Keuangan'
--    order by ordinal_position;
--   (kolom "saldo" sudah tidak ada)
-- ============================================================
