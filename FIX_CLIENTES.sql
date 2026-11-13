-- ========================================================
-- PATCH SEGURO DE ISOLAMENTO CLIENTES
-- ========================================================

-- 1. GARANTIR QUE A TABELA CLIENTES TEM A COLUNA empresa_id
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE;

-- 2. CORRIGIR REGISTROS ANTIGOS (SEM APAGAR DADOS)
-- Associamos os clientes órfãos à primeira empresa do sistema para não perder os dados.
DO $$
DECLARE 
  primeira_empresa uuid;
BEGIN
  SELECT id INTO primeira_empresa FROM public.empresas ORDER BY created_at ASC LIMIT 1;
  IF primeira_empresa IS NOT NULL THEN
    UPDATE public.clientes SET empresa_id = primeira_empresa WHERE empresa_id IS NULL;
  END IF;
END $$;

-- 3. FORCAR RLS
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- 4. REMOVER POLÍTICAS ANTIGAS INSEGURAS/CONFLITANTES DA TABELA CLIENTES
DO $$ 
DECLARE 
  pol record;
BEGIN
  FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'clientes' AND schemaname = 'public') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.clientes', pol.policyname);
  END LOOP;
END $$;

-- 5. CRIAR POLICY FINAL SEGURA
CREATE POLICY clientes_isolation
ON public.clientes
FOR ALL
TO authenticated
USING (
  empresa_id = public.get_auth_empresa_id()
)
WITH CHECK (
  empresa_id = public.get_auth_empresa_id()
);

-- 6. CRIAR INDEX DE PERFORMANCE SE NÃO EXISTIR
CREATE INDEX IF NOT EXISTS idx_clientes_empresa_isolation ON public.clientes(empresa_id);

-- 7. RECARREGAR CONFIGURAÇÃO DA API NO POSTGREST
NOTIFY pgrst, 'reload schema';
ANALYZE public.clientes;
