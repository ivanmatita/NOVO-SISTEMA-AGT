-- SQL de Segurança e Estrutura para tabela "cartas"
-- Executar no seu editor SQL do Supabase

-- 1. Habilitar RLS na tabela cartas
ALTER TABLE public.cartas ENABLE ROW LEVEL SECURITY;

-- 2. Limpar políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Public access" ON public.cartas;
DROP POLICY IF EXISTS "Select cartas" ON public.cartas;
DROP POLICY IF EXISTS "Insert cartas" ON public.cartas;
DROP POLICY IF EXISTS "Update cartas" ON public.cartas;
DROP POLICY IF EXISTS "Delete cartas" ON public.cartas;

-- 3. Criar políticas robustas de isolamento por empresa
-- Garante que o empresa_id do registro coincide com o company_id do usuário logado na tabela perfis

-- SELECT: Only allow users to see data from their own company
CREATE POLICY "Select cartas" ON public.cartas
FOR SELECT TO authenticated
USING (
  empresa_id IN (
    SELECT company_id 
    FROM public.perfis 
    WHERE id = auth.uid()
  )
);

-- INSERT: Only allow users to insert data into their own company
CREATE POLICY "Insert cartas" ON public.cartas
FOR INSERT TO authenticated
WITH CHECK (
  empresa_id IN (
    SELECT company_id 
    FROM public.perfis 
    WHERE id = auth.uid()
  )
);

-- UPDATE: Allow users to update only their own company's data
CREATE POLICY "Update cartas" ON public.cartas
FOR UPDATE TO authenticated
USING (
  empresa_id IN (
    SELECT company_id 
    FROM public.perfis 
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  empresa_id IN (
    SELECT company_id 
    FROM public.perfis 
    WHERE id = auth.uid()
  )
);

-- DELETE: Allow users to delete only their own company's data
CREATE POLICY "Delete cartas" ON public.cartas
FOR DELETE TO authenticated
USING (
  empresa_id IN (
    SELECT company_id 
    FROM public.perfis 
    WHERE id = auth.uid()
  )
);
