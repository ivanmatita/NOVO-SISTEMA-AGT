-- ============================================================================
-- SOLUCAO DEFINITIVA DE CLIENTES: IMPEDIR DUPLICAÇÃO POR NIF E NOME (POR EMPRESA)
-- ============================================================================

-- 1. Desativar temporariamente o trigger que bloqueia eliminações (para limpeza de duplicados)
ALTER TABLE public.clientes DISABLE TRIGGER trg_bloquear_delete_clientes;

-- 2. Eliminar clientes duplicados mantendo apenas o registo mais recente
WITH ranked_clientes AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY empresa_id, COALESCE(NULLIF(TRIM(nif), ''), NULLIF(TRIM(contribuinte), ''))
               ORDER BY updated_at DESC, id DESC
           ) as rank_nif,
           ROW_NUMBER() OVER (
               PARTITION BY empresa_id, LOWER(TRIM(nome))
               ORDER BY updated_at DESC, id DESC
           ) as rank_nome,
           COALESCE(NULLIF(TRIM(nif), ''), NULLIF(TRIM(contribuinte), '')) as nif_clean,
           LOWER(TRIM(nome)) as nome_clean
    FROM public.clientes
)
DELETE FROM public.clientes
WHERE id IN (
    SELECT id FROM ranked_clientes 
    WHERE (nif_clean IS NOT NULL AND nif_clean NOT IN ('999999999', '0', '') AND rank_nif > 1)
       OR (nome_clean IS NOT NULL AND nome_clean != '' AND rank_nome > 1)
);

-- 3. Reativar o trigger de segurança fiscal
ALTER TABLE public.clientes ENABLE TRIGGER trg_bloquear_delete_clientes;

-- 4. Assegurar colunas nif e contribuinte sincronizadas
UPDATE public.clientes 
SET contribuinte = COALESCE(NULLIF(TRIM(contribuinte), ''), NULLIF(TRIM(nif), ''), '999999999'),
    nif = COALESCE(NULLIF(TRIM(nif), ''), NULLIF(TRIM(contribuinte), ''), '999999999')
WHERE contribuinte IS NULL OR nif IS NULL;

-- 5. Criar Índices Únicos por Empresa
DROP INDEX IF EXISTS idx_unique_clientes_empresa_nif;
DROP INDEX IF EXISTS idx_unique_clientes_empresa_nif_alt;
DROP INDEX IF EXISTS idx_unique_clientes_empresa_nome;

CREATE UNIQUE INDEX idx_unique_clientes_empresa_nif 
ON public.clientes (empresa_id, contribuinte) 
WHERE contribuinte IS NOT NULL AND contribuinte NOT IN ('999999999', '0', '');

CREATE UNIQUE INDEX idx_unique_clientes_empresa_nif_alt 
ON public.clientes (empresa_id, nif) 
WHERE nif IS NOT NULL AND nif NOT IN ('999999999', '0', '');

CREATE UNIQUE INDEX idx_unique_clientes_empresa_nome 
ON public.clientes (empresa_id, LOWER(TRIM(nome)));

-- 6. Trigger para auto-sincronizar NIF e Contribuinte no INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.sync_cliente_nif_fields()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.contribuinte IS NULL OR NEW.contribuinte = '' THEN
        NEW.contribuinte := COALESCE(NEW.nif, '999999999');
    END IF;
    IF NEW.nif IS NULL OR NEW.nif = '' THEN
        NEW.nif := COALESCE(NEW.contribuinte, '999999999');
    END IF;
    NEW.nome := TRIM(NEW.nome);
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_cliente_nif ON public.clientes;

CREATE TRIGGER trg_sync_cliente_nif
BEFORE INSERT OR UPDATE ON public.clientes
FOR EACH ROW EXECUTE FUNCTION public.sync_cliente_nif_fields();
