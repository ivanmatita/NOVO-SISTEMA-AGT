-- ==================================================================================
-- 🔐 SCRIPT DE CONFIGURAÇÃO DE SEGURANÇA E ESTRUTURA PARA CARTAS E SECRETARIA DIGITAL
-- Executar esta query no editor SQL do seu painel Supabase (https://supabase.com)
-- ==================================================================================

-- 1. ADICIONAR COLUNAS EM FALTA SE NÃO EXISTIREM (Alinhando banco com formulários)
ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS imagem_url text;
ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS imagem_path text;
ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS imagem_nome text;
ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;

ALTER TABLE public.secretaria_digital ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;


-- 2. HABILITAR ROW LEVEL SECURITY (RLS) NAS DUAS TABELAS
ALTER TABLE public.cartas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secretaria_digital ENABLE ROW LEVEL SECURITY;


-- 3. REMOVER E LIMPAR TODAS AS POLÍTICAS ANTIGAS (Garante que nenhuma política obsoleta interfira)
DROP POLICY IF EXISTS "Select cartas" ON public.cartas;
DROP POLICY IF EXISTS "Insert cartas" ON public.cartas;
DROP POLICY IF EXISTS "Update cartas" ON public.cartas;
DROP POLICY IF EXISTS "Delete cartas" ON public.cartas;
DROP POLICY IF EXISTS "Select isolado por empresa cartas" ON public.cartas;
DROP POLICY IF EXISTS "Insert isolado por empresa cartas" ON public.cartas;
DROP POLICY IF EXISTS "Update isolado por empresa cartas" ON public.cartas;
DROP POLICY IF EXISTS "Permissao Total Cartas" ON public.cartas;
DROP POLICY IF EXISTS "cartas_select_policy" ON public.cartas;
DROP POLICY IF EXISTS "cartas_insert_policy" ON public.cartas;
DROP POLICY IF EXISTS "cartas_update_policy" ON public.cartas;
DROP POLICY IF EXISTS "cartas_delete_policy" ON public.cartas;

DROP POLICY IF EXISTS "Select secretaria_digital" ON public.secretaria_digital;
DROP POLICY IF EXISTS "Insert secretaria_digital" ON public.secretaria_digital;
DROP POLICY IF EXISTS "Update secretaria_digital" ON public.secretaria_digital;
DROP POLICY IF EXISTS "Delete secretaria_digital" ON public.secretaria_digital;
DROP POLICY IF EXISTS "Permissao Total Secretaria" ON public.secretaria_digital;
DROP POLICY IF EXISTS "secretaria_select_policy" ON public.secretaria_digital;
DROP POLICY IF EXISTS "secretaria_insert_policy" ON public.secretaria_digital;
DROP POLICY IF EXISTS "secretaria_update_policy" ON public.secretaria_digital;
DROP POLICY IF EXISTS "secretaria_delete_policy" ON public.secretaria_digital;


-- 4. CRIAR NOVAS POLÍTICAS DE MULTI-TENANT ISOLADAS POR EMPRESA_ID
-- Nota: Usando a função otimizada e nativa 'public.get_auth_empresa_id()' do seu sistema SaaS parceiro.
-- Isso previne a recursividade infinita que costuma dar stack overflow e estragar as tabelas.

-- ==================== TABELA 'cartas' ====================

-- Nível 1: Leitura isolada (Seletivamente restrito para a empresa do utilizador)
CREATE POLICY "cartas_select_policy" ON public.cartas
FOR SELECT TO authenticated
USING (empresa_id = public.get_auth_empresa_id());

-- Nível 2: Inserção isolada (Inserir apenas com id de empresa do utilizador verificado)
CREATE POLICY "cartas_insert_policy" ON public.cartas
FOR INSERT TO authenticated
WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- Nível 3: Edição isolada (Atualizar apenas com id de empresa do utilizador verificado)
CREATE POLICY "cartas_update_policy" ON public.cartas
FOR UPDATE TO authenticated
USING (empresa_id = public.get_auth_empresa_id())
WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- Nível 4: Bloqueio Total de DELETE Físico no Banco de Dados
-- "nunca apagar dados no supabase"
-- Deixamos de criar política para o método DELETE. No PostgreSQL, a ausência de uma política condicional
-- para a operação impede que os utilizadores autenticados executem comandos DELETE diretos na tabela.
-- A verdadeira exclusão é lógica: atualiza-se 'is_deleted = true' via UPDATE acima.
DROP POLICY IF EXISTS "cartas_delete_policy" ON public.cartas;


-- ==================== TABELA 'secretaria_digital' ====================

-- Nível 1: Leitura isolada
CREATE POLICY "secretaria_select_policy" ON public.secretaria_digital
FOR SELECT TO authenticated
USING (empresa_id = public.get_auth_empresa_id());

-- Nível 2: Inserção isolada
CREATE POLICY "secretaria_insert_policy" ON public.secretaria_digital
FOR INSERT TO authenticated
WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- Nível 3: Edição isolada
CREATE POLICY "secretaria_update_policy" ON public.secretaria_digital
FOR UPDATE TO authenticated
USING (empresa_id = public.get_auth_empresa_id())
WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- Nível 4: Bloqueio Total de DELETE Físico no Banco de Dados
DROP POLICY IF EXISTS "secretaria_delete_policy" ON public.secretaria_digital;
