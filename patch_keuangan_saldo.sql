-- ============================================================
-- PATCH KEUANGAN: HAPUS SALDO STATIS, PAKAI VIEW
-- ============================================================

-- 1) Hapus kolom saldo
ALTER TABLE public."Keuangan" DROP COLUMN IF EXISTS saldo;

-- 2) Buat VIEW untuk saldo kumulatif
CREATE OR REPLACE VIEW public.v_keuangan_saldo AS
SELECT 
  *,
  SUM(COALESCE(pemasukan, 0) - COALESCE(pengeluaran, 0)) 
    OVER (ORDER BY created_at ASC, id ASC) AS saldo_kumulatif
FROM public."Keuangan"
ORDER BY created_at ASC;

-- 3) Beri akses SELECT ke VIEW
GRANT SELECT ON public.v_keuangan_saldo TO anon, authenticated;