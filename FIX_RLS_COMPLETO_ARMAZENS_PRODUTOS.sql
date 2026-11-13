-- ==============================================================
-- SQL CORREÇÃO DEFINITIVA DE RLS (ARMAZENS E PRODUTOS)
-- ==============================================================

-- 1. Habilitar Row Level Security nas tabelas
ALTER TABLE public.armazens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

-- 2. Remover todas as políticas antigas ou conflituosas
DROP POLICY IF EXISTS "armazens_isolation" ON public.armazens;
DROP POLICY IF EXISTS "produtos_isolation" ON public.produtos;
DROP POLICY IF EXISTS "SAAS_TENANT_ISOLATION_armazens" ON public.armazens;
DROP POLICY IF EXISTS "SAAS_TENANT_ISOLATION_produtos" ON public.produtos;
DROP POLICY IF EXISTS "armazens_select_policy" ON public.armazens;
DROP POLICY IF EXISTS "armazens_insert_policy" ON public.armazens;
DROP POLICY IF EXISTS "armazens_update_policy" ON public.armazens;
DROP POLICY IF EXISTS "armazens_delete_policy" ON public.armazens;

-- 3. Criar novas políticas limpas e baseadas diretamente na tabela perfis
CREATE POLICY "SAAS_TENANT_ISOLATION_armazens"
ON public.armazens
FOR ALL
TO authenticated
USING (
  empresa_id = (
    SELECT empresa_id
    FROM public.perfis
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  empresa_id = (
    SELECT empresa_id
    FROM public.perfis
    WHERE id = auth.uid()
  )
);

CREATE POLICY "SAAS_TENANT_ISOLATION_produtos"
ON public.produtos
FOR ALL
TO authenticated
USING (
  empresa_id = (
    SELECT empresa_id
    FROM public.perfis
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  empresa_id = (
    SELECT empresa_id
    FROM public.perfis
    WHERE id = auth.uid()
  )
);

-- ==============================================================
-- FIM DO SCRIPT
-- ==============================================================
