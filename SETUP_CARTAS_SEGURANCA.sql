-- SQL de Segurança e Estrutura para tabela "cartas"
-- Executar no seu editor SQL do Supabase

-- 1. Habilitar RLS na tabela cartas
ALTER TABLE public.cartas ENABLE ROW LEVEL SECURITY;

-- 2. Limpar políticas antigas
DROP POLICY IF EXISTS "Select isolado por empresa cartas" ON public.cartas;
DROP POLICY IF EXISTS "Insert isolado por empresa cartas" ON public.cartas;
DROP POLICY IF EXISTS "Update isolado por empresa cartas" ON public.cartas;
DROP POLICY IF EXISTS "Permissao Total Cartas" ON public.cartas;

-- 3. Políticas robustas de isolamento
-- Verifica compatibilidade com o empresa_id do JWT ou da tabela perfis
CREATE POLICY "Permissao Total Cartas" ON public.cartas
FOR ALL TO authenticated
USING (
  empresa_id::text = (auth.jwt() -> 'user_metadata' ->> 'empresa_id') 
  OR empresa_id IN (SELECT company_id FROM public.perfis WHERE id = auth.uid())
)
WITH CHECK (
  empresa_id::text = (auth.jwt() -> 'user_metadata' ->> 'empresa_id') 
  OR empresa_id IN (SELECT company_id FROM public.perfis WHERE id = auth.uid())
);
