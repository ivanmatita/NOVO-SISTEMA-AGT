-- ============================================================
-- SCRIPT DE CORREÇÃO: REGISTO DE COMPRAS - FATURAS DE COMPRA PENDENTES
-- Execute no Supabase SQL Editor
-- ============================================================

-- 1. Garantir que os valores por defeito da tabela compras refletem faturas pendentes
ALTER TABLE public.compras ALTER COLUMN status SET DEFAULT 'pendente';
ALTER TABLE public.compras ALTER COLUMN estado SET DEFAULT 'pendente';
ALTER TABLE public.compras ALTER COLUMN recibo_emitido SET DEFAULT FALSE;

-- 2. Corrigir faturas de compra existentes sem recibo emitido que estavam marcadas como PAGO ou sem saldo_pendente
UPDATE public.compras
SET 
  status = 'pendente',
  estado = 'pendente',
  recibo_emitido = FALSE,
  valor_pago = 0,
  saldo_pendente = COALESCE(valor_total, total, 0)
WHERE 
  UPPER(COALESCE(tipo_documento, document_type, '')) IN ('FATURA DE COMPRA', 'FTC', 'COMPRA', 'FATURA')
  AND (recibo_emitido IS NOT TRUE OR recibo_emitido IS NULL)
  AND (valor_pago IS NULL OR valor_pago <= 0);

-- 3. Notificar o PostgREST para recarregar a cache do esquema
NOTIFY pgrst, 'reload schema';

-- ✅ Concluído!
