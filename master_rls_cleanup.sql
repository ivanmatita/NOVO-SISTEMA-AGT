-- ==================================================================
-- TAREFA CRÍTICA — LIMPEZA TOTAL DAS POLICIES RLS DO SUPABASE
-- ==================================================================

-- ------------------------------------------------------------------
-- PASSO 1 — REMOVER TODAS AS POLICIES CONFUSIONAIS/DUPLICADAS
-- ------------------------------------------------------------------

-- CLIENTES
DROP POLICY IF EXISTS "Acesso Total Anonimo" ON clientes;
DROP POLICY IF EXISTS "clientes_select" ON clientes;
DROP POLICY IF EXISTS "clientes_insert" ON clientes;
DROP POLICY IF EXISTS "clientes_update" ON clientes;
DROP POLICY IF EXISTS "clientes_delete" ON clientes;
DROP POLICY IF EXISTS "Empresas só veem seus próprios clientes" ON clientes;
DROP POLICY IF EXISTS "Isolamento por empresa - Atualização" ON clientes;
DROP POLICY IF EXISTS "Isolamento por empresa - Eliminação" ON clientes;
DROP POLICY IF EXISTS "Isolamento por empresa - Inserção" ON clientes;
DROP POLICY IF EXISTS "Isolamento por empresa - Visualização" ON clientes;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios clientes" ON clientes;
DROP POLICY IF EXISTS "Usuários podem deletar seus próprios clientes" ON clientes;
DROP POLICY IF EXISTS "Usuários podem inserir seus próprios clientes" ON clientes;
DROP POLICY IF EXISTS "Usuários podem ver apenas seus próprios clientes" ON clientes;

-- LOCAIS DE TRABALHO
DROP POLICY IF EXISTS "locais_select" ON locais_trabalho;
DROP POLICY IF EXISTS "locais_insert" ON locais_trabalho;
DROP POLICY IF EXISTS "locais_update" ON locais_trabalho;
DROP POLICY IF EXISTS "locais_delete" ON locais_trabalho;

-- ------------------------------------------------------------------
-- PASSO 2 — GARANTIR RLS ATIVA
-- ------------------------------------------------------------------

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE locais_trabalho ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------
-- PASSO 3 — CRIAR POLICIES LIMPAS E SEGURAS (MULTIEMPRESA)
-- ------------------------------------------------------------------

-- POLICIES PARA: CLIENTES
CREATE POLICY "clientes_select" ON clientes FOR SELECT USING (auth.uid() = company_id);
CREATE POLICY "clientes_insert" ON clientes FOR INSERT WITH CHECK (auth.uid() = company_id);
CREATE POLICY "clientes_update" ON clientes FOR UPDATE USING (auth.uid() = company_id);
CREATE POLICY "clientes_delete" ON clientes FOR DELETE USING (auth.uid() = company_id);

-- POLICIES PARA: LOCAIS_TRABALHO
CREATE POLICY "locais_select" ON locais_trabalho FOR SELECT USING (auth.uid() = company_id);
CREATE POLICY "locais_insert" ON locais_trabalho FOR INSERT WITH CHECK (auth.uid() = company_id);
CREATE POLICY "locais_update" ON locais_trabalho FOR UPDATE USING (auth.uid() = company_id);
CREATE POLICY "locais_delete" ON locais_trabalho FOR DELETE USING (auth.uid() = company_id);

-- ------------------------------------------------------------------
-- PASSO 4 — NOTA PARA O DESENVOLVEDOR
-- ------------------------------------------------------------------
-- Certifique-se de que a coluna 'company_id' em ambas as tabelas é do tipo UUID.
-- Se não for, as policies baseadas em auth.uid() podem falhar se os tipos não coincidirem.
