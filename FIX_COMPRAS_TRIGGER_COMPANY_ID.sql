-- ============================================================
-- FIX: record "new" has no field "company_id" na tabela compras
-- PROBLEMA: Trigger(s) na tabela compras fazem referência a
--           NEW.company_id mas a tabela usa empresa_id
-- SOLUÇÃO: Adicionar coluna company_id + recriar trigger correcto
-- Execute no Supabase SQL Editor
-- ============================================================

-- PASSO 1: Remover TODOS os triggers problemáticos na tabela compras
DROP TRIGGER IF EXISTS trg_bloqueio_compras           ON public.compras;
DROP TRIGGER IF EXISTS trg_sync_compras_tenant        ON public.compras;
DROP TRIGGER IF EXISTS trg_updated_at_compras         ON public.compras;
DROP TRIGGER IF EXISTS trigger_compras_updated_at     ON public.compras;
DROP TRIGGER IF EXISTS compras_sync_trigger           ON public.compras;
DROP TRIGGER IF EXISTS trg_compras_company_id         ON public.compras;
DROP TRIGGER IF EXISTS trg_compras_audit              ON public.compras;
DROP TRIGGER IF EXISTS check_exercicio_compras        ON public.compras;

-- PASSO 2: Garantir que a coluna company_id existe na tabela compras
-- (alguns triggers podem precisar dela)
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS company_id  UUID;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS empresa_id  UUID;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS data        DATE;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS data_compra DATE;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS ano         INT;

-- PASSO 3: Sincronizar dados existentes entre as duas colunas
UPDATE public.compras 
SET empresa_id = company_id 
WHERE empresa_id IS NULL AND company_id IS NOT NULL;

UPDATE public.compras 
SET company_id = empresa_id 
WHERE company_id IS NULL AND empresa_id IS NOT NULL;

UPDATE public.compras 
SET data = data_compra 
WHERE data IS NULL AND data_compra IS NOT NULL;

UPDATE public.compras 
SET data_compra = data 
WHERE data_compra IS NULL AND data IS NOT NULL;

UPDATE public.compras 
SET ano = EXTRACT(YEAR FROM COALESCE(data_compra, data, created_at))::INT
WHERE ano IS NULL;

-- PASSO 4: Recriar a função de sincronização (compatível com ambas as colunas)
CREATE OR REPLACE FUNCTION public.sync_compras_tenant_ids()
RETURNS TRIGGER AS $$
BEGIN
    -- Sincronizar empresa_id <-> company_id
    IF NEW.empresa_id IS NULL AND NEW.company_id IS NOT NULL THEN
        NEW.empresa_id := NEW.company_id;
    END IF;
    IF NEW.company_id IS NULL AND NEW.empresa_id IS NOT NULL THEN
        NEW.company_id := NEW.empresa_id;
    END IF;
    
    -- Sincronizar data <-> data_compra
    IF NEW.data IS NULL AND NEW.data_compra IS NOT NULL THEN
        NEW.data := NEW.data_compra;
    END IF;
    IF NEW.data_compra IS NULL AND NEW.data IS NOT NULL THEN
        NEW.data_compra := NEW.data;
    END IF;
    
    -- Preencher ano automaticamente
    IF NEW.ano IS NULL THEN
        NEW.ano := EXTRACT(YEAR FROM COALESCE(NEW.data_compra, NEW.data, NOW()))::INT;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- PASSO 5: Recriar o trigger limpo (sem referências a colunas inexistentes)
DROP TRIGGER IF EXISTS trg_sync_compras_tenant ON public.compras;
CREATE TRIGGER trg_sync_compras_tenant
BEFORE INSERT OR UPDATE ON public.compras
FOR EACH ROW EXECUTE FUNCTION public.sync_compras_tenant_ids();

-- PASSO 6: Garantir que o exercício fiscal 2026 não está bloqueado
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'exercicios_fiscais'
    ) THEN
        UPDATE public.exercicios_fiscais
        SET ativo = true, fechado = false
        WHERE ano = 2026;
        RAISE NOTICE 'Exercício fiscal 2026 desbloqueado.';
    ELSE
        RAISE NOTICE 'Tabela exercicios_fiscais não existe - OK.';
    END IF;
END $$;

-- PASSO 7: Garantir RLS correcta (aceitar empresa_id OU company_id)
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso isolado compras"     ON public.compras;
DROP POLICY IF EXISTS "Acesso isolado por empresa" ON public.compras;
DROP POLICY IF EXISTS "compras_isolation"          ON public.compras;
DROP POLICY IF EXISTS "Enforce company access for compras" ON public.compras;

CREATE POLICY "compras_isolation" ON public.compras
    FOR ALL
    TO authenticated
    USING (
        empresa_id = public.get_auth_empresa_id()
        OR company_id = public.get_auth_empresa_id()
        OR (SELECT role FROM public.perfis WHERE id = auth.uid()) = 'super_admin'
    )
    WITH CHECK (
        empresa_id = public.get_auth_empresa_id()
        OR company_id = public.get_auth_empresa_id()
        OR (SELECT role FROM public.perfis WHERE id = auth.uid()) = 'super_admin'
    );

-- PASSO 8: Garantir acesso ao service_role (para o backend)
GRANT ALL ON public.compras TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compras TO authenticated;

-- PASSO 9: Recarregar schema do PostgREST
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- VERIFICAÇÃO FINAL
-- ============================================================
SELECT 
    tgname AS trigger_name,
    tgtype,
    proname AS function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'compras'
  AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
