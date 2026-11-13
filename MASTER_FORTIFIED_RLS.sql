-- ==================================================================
-- TAREFA CRÍTICA — LIMPEZA TOTAL E BLINDAGEM RLS DO SUPABASE
-- PROJETO: ERP IMATEC (NOVO-SISTEMA-AGT1)
-- ==================================================================

-- Este script deve ser executado no SQL Editor do Supabase para garantir:
-- 1. Remoção de políticas duplicadas e conflitantes.
-- 2. Ativação correta do Row Level Security (RLS).
-- 3. Isolamento multiempresa impenetrável baseado em auth.uid() = company_id.

-- ------------------------------------------------------------------
-- PASSO 0 — LIMPEZA DE POLÍTICAS EXISTENTES (PREVENTIVO)
-- ------------------------------------------------------------------

DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- Loop por todas as políticas nas tabelas do ERP e removê-las
    FOR r IN (
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN (
            'empresas', 'clientes', 'clients', 'locais_trabalho', 'work_sites', 'workplaces',
            'produtos', 'products', 'vendas', 'invoices', 'faturas', 'transacoes', 'transactions',
            'funcionarios', 'employees', 'caixas', 'caixa_movements', 'caixa_movimentos',
            'armazens', 'warehouses', 'stock_movements', 'secretaria_digital', 'metrics'
        )
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- ------------------------------------------------------------------
-- PASSO 1 — GARANTIR RLS ATIVA EM TODAS AS TABELAS
-- ------------------------------------------------------------------

ALTER TABLE IF EXISTS empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS locais_trabalho ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS work_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS workplaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS faturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS caixas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS caixa_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS caixa_movimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS armazens ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS secretaria_digital ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS metrics ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------
-- PASSO 2 — CRIAR POLÍTICAS BLINDADAS (MULTIEMPRESA)
-- ------------------------------------------------------------------

-- Função auxiliar para simplificar a aplicação de políticas (opcional)
-- Usaremos SQL direto para máxima transparência conforme solicitado.

-- TABELA: EMPRESAS (Perfil da Empresa)
-- O ID da empresa é o ID do usuário (Owner)
CREATE POLICY "empresas_profile_select" ON empresas FOR SELECT USING (auth.uid() = id);
CREATE POLICY "empresas_profile_update" ON empresas FOR UPDATE USING (auth.uid() = id);
-- Permitir inserção durante o registro (SignUp)
CREATE POLICY "empresas_profile_insert" ON empresas FOR INSERT WITH CHECK (auth.uid() = id);

-- POLÍTICAS GENÉRICAS PARA TODAS AS TABELAS DE DADOS
-- Padrão: auth.uid() deve ser igual a company_id

-- CLIENTES
CREATE POLICY "clientes_isolation" ON clientes FOR ALL USING (auth.uid() = company_id) WITH CHECK (auth.uid() = company_id);
CREATE POLICY "clients_isolation" ON clients FOR ALL USING (auth.uid() = company_id) WITH CHECK (auth.uid() = company_id);

-- LOCAIS DE TRABALHO
CREATE POLICY "locais_trabalho_isolation" ON locais_trabalho FOR ALL USING (auth.uid() = company_id) WITH CHECK (auth.uid() = company_id);
CREATE POLICY "work_sites_isolation" ON work_sites FOR ALL USING (auth.uid() = company_id) WITH CHECK (auth.uid() = company_id);
CREATE POLICY "workplaces_isolation" ON workplaces FOR ALL USING (auth.uid() = company_id) WITH CHECK (auth.uid() = company_id);

-- PRODUTOS
CREATE POLICY "produtos_isolation" ON produtos FOR ALL USING (auth.uid() = company_id) WITH CHECK (auth.uid() = company_id);
CREATE POLICY "products_isolation" ON products FOR ALL USING (auth.uid() = company_id) WITH CHECK (auth.uid() = company_id);

-- FATURAÇÃO E VENDAS
CREATE POLICY "invoices_isolation" ON invoices FOR ALL USING (auth.uid() = company_id) WITH CHECK (auth.uid() = company_id);
CREATE POLICY "vendas_isolation" ON vendas FOR ALL USING (auth.uid() = company_id) WITH CHECK (auth.uid() = company_id);

-- FINANCEIRO
CREATE POLICY "transactions_isolation" ON transactions FOR ALL USING (auth.uid() = company_id) WITH CHECK (auth.uid() = company_id);
CREATE POLICY "caixas_isolation" ON caixas FOR ALL USING (auth.uid() = company_id) WITH CHECK (auth.uid() = company_id);
CREATE POLICY "caixa_movements_isolation" ON caixa_movements FOR ALL USING (auth.uid() = company_id) WITH CHECK (auth.uid() = company_id);

-- RECURSOS HUMANOS
CREATE POLICY "employees_isolation" ON employees FOR ALL USING (auth.uid() = company_id) WITH CHECK (auth.uid() = company_id);
CREATE POLICY "funcionarios_isolation" ON funcionarios FOR ALL USING (auth.uid() = company_id) WITH CHECK (auth.uid() = company_id);

-- LOGÍSTICA
CREATE POLICY "warehouses_isolation" ON warehouses FOR ALL USING (auth.uid() = company_id) WITH CHECK (auth.uid() = company_id);
CREATE POLICY "stock_movements_isolation" ON stock_movements FOR ALL USING (auth.uid() = company_id) WITH CHECK (auth.uid() = company_id);

-- OUTROS
CREATE POLICY "secretaria_digital_isolation" ON secretaria_digital FOR ALL USING (auth.uid() = company_id) WITH CHECK (auth.uid() = company_id);
CREATE POLICY "metrics_isolation" ON metrics FOR ALL USING (auth.uid() = company_id) WITH CHECK (auth.uid() = company_id);

-- ------------------------------------------------------------------
-- PASSO 3 — STORAGE (DOCUMENTOS)
-- ------------------------------------------------------------------

-- Nota: Estas policies de Storage devem ser aplicadas na interface do Supabase ou via SQL na tabela storage.objects

-- Permitir que utilizadores façam upload para a sua própria pasta (id_do_user/)
-- DROP POLICY IF EXISTS "Acesso individual por empresa" ON storage.objects;
-- CREATE POLICY "Acesso individual por empresa" ON storage.objects
-- FOR ALL USING (bucket_id = 'documentos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ------------------------------------------------------------------
-- FINALIZAÇÃO
-- ------------------------------------------------------------------

-- 1. Verifique se a coluna 'company_id' existe e é UUID em todas as tabelas.
-- 2. Este script limpa o "ruído" de políticas duplicadas que causava listas vazias e conflitos.
-- 3. O sistema agora está "Blindado" — um usuário NUNCA verá dados de outra empresa.
