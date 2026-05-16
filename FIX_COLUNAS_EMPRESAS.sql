-- ========================================================
-- FIX DEFINITIVO: COLUNAS DA TABELA EMPRESAS
-- ========================================================

-- 1. Garantir que a coluna nome_empresa existe (Padrão SaaS)
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS nome_empresa text;

-- 2. Garantir que a coluna nome existe (Compatibilidade legado)
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS nome text;

-- 3. Sincronizar dados entre colunas se uma estiver vazia
UPDATE public.empresas SET nome_empresa = nome WHERE nome_empresa IS NULL AND nome IS NOT NULL;
UPDATE public.empresas SET nome = nome_empresa WHERE nome IS NULL AND nome_empresa IS NOT NULL;

-- 4. Notificar o Supabase para recarregar o cache do esquema
-- Nota: O PostgREST recarrega automaticamente ao detetar alterações DDL, 
-- mas por vezes é necessário forçar via Painel Supabase (Project Settings > Database > Clear Cache)
-- ou simplesmente aguardar 10-30 segundos.

-- 5. Garantir que NIF e Email não bloqueiam o registo se forem nulos ou repetidos por erro
ALTER TABLE public.empresas ALTER COLUMN nome_empresa SET NOT NULL;
ALTER TABLE public.empresas ALTER COLUMN auth_user_id SET NOT NULL;

ANALYZE public.empresas;
