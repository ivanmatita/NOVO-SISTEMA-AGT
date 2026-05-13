-- ==================================================================
-- CORREÇÃO CRÍTICA DE ISOLAMENTO: LOCAIS_TRABALHO (SAAS BLINDADO)
-- ==================================================================

-- 1. Garantir que a tabela está sob RLS
ALTER TABLE public.locais_trabalho ENABLE ROW LEVEL SECURITY;

-- 2. Limpeza profunda de TODAS as políticas anteriores (Remover qualquer vazamento)
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'locais_trabalho' AND schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.locais_trabalho', pol.policyname);
    END LOOP;
END $$;

-- 3. Criar Políticas Específicas por Operação para Isolamento Total
-- SELECT: Ver apenas locais da própria empresa
CREATE POLICY "locais_trabalho_select_isolation" 
ON public.locais_trabalho FOR SELECT 
TO authenticated 
USING (company_id = public.get_tenant_id());

-- INSERT: Inserir apenas com o ID da própria empresa
CREATE POLICY "locais_trabalho_insert_isolation" 
ON public.locais_trabalho FOR INSERT 
TO authenticated 
WITH CHECK (company_id = public.get_tenant_id());

-- UPDATE: Atualizar apenas locais da própria empresa
CREATE POLICY "locais_trabalho_update_isolation" 
ON public.locais_trabalho FOR UPDATE 
TO authenticated 
USING (company_id = public.get_tenant_id())
WITH CHECK (company_id = public.get_tenant_id());

-- DELETE: Eliminar apenas locais da própria empresa
CREATE POLICY "locais_trabalho_delete_isolation" 
ON public.locais_trabalho FOR DELETE 
TO authenticated 
USING (company_id = public.get_tenant_id());

-- 4. Garantir Isolamento forçado na inserção via Trigger (Opcional mas proativo)
-- Isso garante que mesmo que o frontend erre, o banco de dados força o company_id correto.
CREATE OR REPLACE FUNCTION public.force_company_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.company_id := public.get_tenant_id();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_force_company_id_locais ON public.locais_trabalho;
CREATE TRIGGER tr_force_company_id_locais
BEFORE INSERT ON public.locais_trabalho
FOR EACH ROW EXECUTE FUNCTION public.force_company_id();

-- 5. Aplicar o mesmo rigor à tabela de Clientes (conforme solicitado: "os seus clientes")
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'clientes' AND schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.clientes', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "clientes_select_isolation" ON public.clientes FOR SELECT TO authenticated USING (company_id = public.get_tenant_id());
CREATE POLICY "clientes_insert_isolation" ON public.clientes FOR INSERT TO authenticated WITH CHECK (company_id = public.get_tenant_id());
CREATE POLICY "clientes_update_isolation" ON public.clientes FOR UPDATE TO authenticated USING (company_id = public.get_tenant_id()) WITH CHECK (company_id = public.get_tenant_id());
CREATE POLICY "clientes_delete_isolation" ON public.clientes FOR DELETE TO authenticated USING (company_id = public.get_tenant_id());

DROP TRIGGER IF EXISTS tr_force_company_id_clientes ON public.clientes;
CREATE TRIGGER tr_force_company_id_clientes 
BEFORE INSERT ON public.clientes
FOR EACH ROW EXECUTE FUNCTION public.force_company_id();
