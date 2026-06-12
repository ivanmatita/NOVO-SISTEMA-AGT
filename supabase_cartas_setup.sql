-- ====================================================================
-- SCRIPT DE INSTALAÇÃO E ATUALIZAÇÃO ÚNICO: CARTAS E MEDIA_ARQUIVOS
-- MÓDULO DE CORRESPONDÊNCIA — ISOLAMENTO MULTI-EMPRESA (RLS) SEGURO
-- COM SUPORTE A LOGS, AUTOMAP DE ARQUIVOS E CORREÇÃO DE POLÍTICAS DE RLS
-- ====================================================================
-- Execute este script completo no Editor SQL (SQL Editor) do seu painel do Supabase.

-- 1. Garantir que a função de execução segura de queries existe (utilizada para migrações automatizadas)
CREATE OR REPLACE FUNCTION public.query_exec(query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ret json;
BEGIN
    EXECUTE query;
    RETURN json_build_object('success', true);
END;
$$;

-- 1.1 Garantir que a função de execução segura de queries (SELECT) existe
CREATE OR REPLACE FUNCTION public.query_exec_select(query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ret json;
BEGIN
    EXECUTE 'SELECT array_to_json(array_agg(t)) FROM (' || query || ') t' INTO v_ret;
    RETURN json_build_object('success', true, 'data', COALESCE(v_ret, '[]'::json));
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 2. Garantir estrutura base da tabela de perfis (para obter o ID da empresa do utilizador)
CREATE TABLE IF NOT EXISTS public.perfis (
    id UUID PRIMARY KEY,
    company_id UUID,
    empresa_id UUID,
    nome TEXT,
    email TEXT,
    role TEXT DEFAULT 'user',
    is_admin BOOLEAN DEFAULT false,
    level INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Migrar colunas adicionais de perfis se necessário
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS empresa_id UUID;
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;

-- 3. Função central de obtenção de Empresa ID (get_auth_empresa_id) otimizada para evitar recursão
CREATE OR REPLACE FUNCTION public.get_auth_empresa_id()
RETURNS UUID AS $$
DECLARE
  v_company_id UUID;
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN NULL; END IF;

  -- Método 1: Tentar ler metadados do JWT (ideal, pois evita consultas pesadas de RLS)
  BEGIN
    v_company_id := (auth.jwt() -> 'user_metadata' ->> 'empresa_id')::UUID;
    IF v_company_id IS NOT NULL THEN RETURN v_company_id; END IF;
  EXCEPTION WHEN OTHERS THEN END;

  BEGIN
    v_company_id := (auth.jwt() -> 'user_metadata' ->> 'company_id')::UUID;
    IF v_company_id IS NOT NULL THEN RETURN v_company_id; END IF;
  EXCEPTION WHEN OTHERS THEN END;

  -- Método 2: Obter diretamente da tabela de perfis (bypass RLS via SECURITY DEFINER)
  SELECT COALESCE(empresa_id, company_id) INTO v_company_id FROM public.perfis WHERE id = v_uid LIMIT 1;
  IF v_company_id IS NOT NULL THEN RETURN v_company_id; END IF;

  -- Método 3: Fallback de onboarding inicial ou propriedade direta
  SELECT id INTO v_company_id FROM public.empresas WHERE auth_user_id = v_uid LIMIT 1;
  RETURN v_company_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Criar aliasing para get_user_company_id para compatibilidade retroativa
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID AS $$
BEGIN
  RETURN public.get_auth_empresa_id();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 4. Função para verificar de forma segura se o utilizador é administrador do sistema
CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS BOOLEAN AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_role TEXT;
BEGIN
  IF v_uid IS NULL THEN RETURN false; END IF;
      
  v_role := (auth.jwt() -> 'user_metadata' ->> 'role');
  IF v_role IN ('super_admin', 'superadmin', 'suporte_tecnico') THEN
     RETURN true;
  END IF;

  SELECT role INTO v_role FROM public.perfis WHERE id = v_uid LIMIT 1;
  IF v_role IN ('super_admin', 'superadmin', 'suporte_tecnico') THEN 
    RETURN true; 
  END IF;
  RETURN false;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;


-- ====================================================================
-- TABELAS DO MÓDULO DE CORRESPONDÊNCIAS (CARTAS & GESTÃO DE ARQUIVOS)
-- ====================================================================

-- 5. Criar/Garantir a tabela de cartas (sem apagar dados existentes)
CREATE TABLE IF NOT EXISTS public.cartas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    destinatario TEXT,
    nome_destinatario TEXT NOT NULL,
    morada TEXT,
    localidade TEXT,
    provincia TEXT,
    codigo_postal TEXT,
    pais TEXT,
    observacoes TEXT,
    assunto TEXT NOT NULL,
    data_documento TEXT,
    data_carta TIMESTAMPTZ DEFAULT now(),
    descricao_data TEXT,
    email_destinatario TEXT,
    tracking TEXT,
    confidencial BOOLEAN DEFAULT false,
    imprimir_pagina BOOLEAN DEFAULT false,
    referencia TEXT,
    area_sector TEXT,
    serie TEXT,
    tipo_documento TEXT,
    conteudo TEXT,
    imagem_url TEXT,
    imagem_path TEXT,
    imagem_nome TEXT,
    imagem_name TEXT,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Garantir colunas adicionais caso a tabela já existisse antes ("sem apagar dados")
ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS destinatario TEXT;
ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS nome_destinatario TEXT;
ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS morada TEXT;
ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS localidade TEXT;
ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS provincia TEXT;
ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS codigo_postal TEXT;
ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS pais TEXT;
ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS assunto TEXT;
ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS data_documento TEXT;
ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS data_carta TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS descricao_data TEXT;
ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS email_destinatario TEXT;
ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS tracking TEXT;
ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS confidencial BOOLEAN DEFAULT false;
ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS imprimir_pagina BOOLEAN DEFAULT false;
ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS referencia TEXT;
ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS area_sector TEXT;
ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS serie TEXT;
ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS tipo_documento TEXT;
ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS conteudo TEXT;
ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS imagem_url TEXT;
ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS imagem_path TEXT;
ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS imagem_nome TEXT;
ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS imagem_name TEXT;
ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Índices de desempenho em buscas multi-tenant de cartas
CREATE INDEX IF NOT EXISTS cartas_empresa_id_idx ON public.cartas (empresa_id);
CREATE INDEX IF NOT EXISTS cartas_destinatario_idx ON public.cartas (nome_destinatario);
CREATE INDEX IF NOT EXISTS cartas_is_deleted_idx ON public.cartas (is_deleted);

-- 6. Criar/Garantir tabela de 'media_arquivos' (suporta anexos e multimídia da correspondência)
CREATE TABLE IF NOT EXISTS public.media_arquivos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Garantir todas as colunas de media_arquivos utilizadas no código React (App.tsx e CartasModule.tsx)
ALTER TABLE public.media_arquivos ADD COLUMN IF NOT EXISTS carta_id UUID REFERENCES public.cartas(id) ON DELETE SET NULL;
ALTER TABLE public.media_arquivos ADD COLUMN IF NOT EXISTS url TEXT;
ALTER TABLE public.media_arquivos ADD COLUMN IF NOT EXISTS path TEXT;
ALTER TABLE public.media_arquivos ADD COLUMN IF NOT EXISTS nome_original TEXT;
ALTER TABLE public.media_arquivos ADD COLUMN IF NOT EXISTS tipo_ficheiro TEXT;
ALTER TABLE public.media_arquivos ADD COLUMN IF NOT EXISTS tamanho BIGINT DEFAULT 0;
ALTER TABLE public.media_arquivos ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

ALTER TABLE public.media_arquivos ADD COLUMN IF NOT EXISTS utilizador_id UUID;
ALTER TABLE public.media_arquivos ADD COLUMN IF NOT EXISTS tipo TEXT;
ALTER TABLE public.media_arquivos ADD COLUMN IF NOT EXISTS nome_arquivo TEXT;
ALTER TABLE public.media_arquivos ADD COLUMN IF NOT EXISTS bucket TEXT DEFAULT 'media';
ALTER TABLE public.media_arquivos ADD COLUMN IF NOT EXISTS caminho_arquivo TEXT;
ALTER TABLE public.media_arquivos ADD COLUMN IF NOT EXISTS url_publica TEXT;
ALTER TABLE public.media_arquivos ADD COLUMN IF NOT EXISTS url_arquivo TEXT; -- Coluna crítica para App.tsx
ALTER TABLE public.media_arquivos ADD COLUMN IF NOT EXISTS mime_type TEXT;
ALTER TABLE public.media_arquivos ADD COLUMN IF NOT EXISTS tamanho_bytes BIGINT DEFAULT 0;
ALTER TABLE public.media_arquivos ADD COLUMN IF NOT EXISTS extensao TEXT;
ALTER TABLE public.media_arquivos ADD COLUMN IF NOT EXISTS entidade TEXT;
ALTER TABLE public.media_arquivos ADD COLUMN IF NOT EXISTS entidade_id UUID;
ALTER TABLE public.media_arquivos ADD COLUMN IF NOT EXISTS observacao TEXT;
ALTER TABLE public.media_arquivos ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;
ALTER TABLE public.media_arquivos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Remover restrições 'NOT NULL' em tabelas secundárias para evitar crashes em cadastros rápidos
ALTER TABLE public.media_arquivos ALTER COLUMN tipo DROP NOT NULL;
ALTER TABLE public.media_arquivos ALTER COLUMN nome_arquivo DROP NOT NULL;
ALTER TABLE public.media_arquivos ALTER COLUMN caminho_arquivo DROP NOT NULL;
ALTER TABLE public.media_arquivos ALTER COLUMN bucket DROP NOT NULL;

-- Índices adicionais para anexos rápidos
CREATE INDEX IF NOT EXISTS media_arquivos_carta_id_idx ON public.media_arquivos (carta_id);
CREATE INDEX IF NOT EXISTS media_arquivos_empresa_id_idx ON public.media_arquivos (empresa_id);

-- 7. Trigger de sincronização entre colunas equivalentes de useMedia e Anexos de Cartas
CREATE OR REPLACE FUNCTION public.sync_media_arquivos_columns()
RETURNS TRIGGER AS $$
BEGIN
    -- Sincronizar tipos de ficheiro
    IF NEW.tipo_ficheiro IS NULL AND NEW.tipo IS NOT NULL THEN
        NEW.tipo_ficheiro := NEW.tipo;
    ELSIF NEW.tipo IS NULL AND NEW.tipo_ficheiro IS NOT NULL THEN
        NEW.tipo := NEW.tipo_ficheiro;
    END IF;

    -- Mapeamento seguro para satisfazer CHECK constraints de tipo na tabela
    IF NEW.tipo IS NULL OR NOT (NEW.tipo = ANY(ARRAY['imagem'::text, 'documento'::text, 'menu_logo'::text, 'sidebar_image'::text, 'avatar'::text, 'comprovativo'::text, 'anexo'::text, 'fatura'::text, 'contrato'::text, 'outros'::text])) THEN
        IF NEW.tipo_ficheiro IS NOT NULL THEN
            IF NEW.tipo_ficheiro LIKE 'image/%' THEN
                NEW.tipo := 'imagem';
            ELSIF NEW.tipo_ficheiro LIKE '%pdf%' OR NEW.tipo_ficheiro LIKE '%doc%' OR NEW.tipo_ficheiro LIKE '%xls%' OR NEW.tipo_ficheiro LIKE '%txt%' THEN
                NEW.tipo := 'documento';
            ELSE
                NEW.tipo := 'outros';
            END IF;
        ELSE
            NEW.tipo := 'documento';
        END IF;
    END IF;

    -- Sincronizar tipo_ficheiro com o tipo mapeado seguro
    NEW.tipo_ficheiro := COALESCE(NEW.tipo_ficheiro, NEW.tipo);

    -- Sincronizar nomes de arquivos
    IF NEW.nome_original IS NULL AND NEW.nome_arquivo IS NOT NULL THEN
        NEW.nome_original := NEW.nome_arquivo;
    ELSIF NEW.nome_arquivo IS NULL AND NEW.nome_original IS NOT NULL THEN
        NEW.nome_arquivo := NEW.nome_original;
    END IF;

    -- Sincronizar caminhos dos ficheiros
    IF NEW.path IS NULL AND NEW.caminho_arquivo IS NOT NULL THEN
        NEW.path := NEW.caminho_arquivo;
    ELSIF NEW.caminho_arquivo IS NULL AND NEW.path IS NOT NULL THEN
        NEW.caminho_arquivo := NEW.path;
    END IF;

    -- Sincronizar URLs públicas e url_arquivo de compatibilidade
    IF NEW.url IS NULL AND NEW.url_publica IS NOT NULL THEN
        NEW.url := NEW.url_publica;
    ELSIF NEW.url_publica IS NULL AND NEW.url IS NOT NULL THEN
        NEW.url_publica := NEW.url;
    END IF;
    
    NEW.url_arquivo := COALESCE(NEW.url_arquivo, NEW.url, NEW.url_publica);

    -- Sincronizar tamanhos de arquivos
    IF NEW.tamanho IS NULL AND NEW.tamanho_bytes IS NOT NULL THEN
        NEW.tamanho := NEW.tamanho_bytes;
    ELSIF NEW.tamanho_bytes IS NULL AND NEW.tamanho IS NOT NULL THEN
        NEW.tamanho_bytes := NEW.tamanho;
    END IF;

    -- Atribuir valores padrão se ainda nulos para conformidade geral
    IF NEW.bucket IS NULL THEN
        NEW.bucket := 'media';
    END IF;
    
    IF NEW.nome_arquivo IS NULL THEN
        NEW.nome_arquivo := COALESCE(NEW.nome_original, 'arquivo');
    END IF;
    
    IF NEW.caminho_arquivo IS NULL THEN
        NEW.caminho_arquivo := COALESCE(NEW.path, 'default');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS media_arquivos_sync_trg ON public.media_arquivos;
CREATE TRIGGER media_arquivos_sync_trg
BEFORE INSERT OR UPDATE ON public.media_arquivos
FOR EACH ROW
EXECUTE FUNCTION public.sync_media_arquivos_columns();


-- ====================================================================
-- LIMPEZA DE POLÍTICAS DUPLICADAS OU COM LOOP INFINITO (PREVENÇÃO DE STACK OVERFLOW)
-- ====================================================================

ALTER TABLE public.cartas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_arquivos ENABLE ROW LEVEL SECURITY;

-- Limpar conflitos de políticas legadas na tabela de Cartas
DROP POLICY IF EXISTS "Todas as operações cartas" ON public.cartas;
DROP POLICY IF EXISTS cartas_select_policy ON public.cartas;
DROP POLICY IF EXISTS cartas_insert_policy ON public.cartas;
DROP POLICY IF EXISTS cartas_update_policy ON public.cartas;
DROP POLICY IF EXISTS cartas_delete_policy ON public.cartas;
DROP POLICY IF EXISTS cartas_isolation ON public.cartas;
DROP POLICY IF EXISTS "Select cartas" ON public.cartas;
DROP POLICY IF EXISTS "Insert cartas" ON public.cartas;
DROP POLICY IF EXISTS "Update cartas" ON public.cartas;
DROP POLICY IF EXISTS "Delete cartas" ON public.cartas;
DROP POLICY IF EXISTS "Permissao Total Cartas" ON public.cartas;
DROP POLICY IF EXISTS "cartas_select_iso" ON public.cartas;
DROP POLICY IF EXISTS "cartas_insert_iso" ON public.cartas;
DROP POLICY IF EXISTS "cartas_update_iso" ON public.cartas;
DROP POLICY IF EXISTS "cartas_delete_iso" ON public.cartas;
DROP POLICY IF EXISTS "Select isolado por empresa cartas" ON public.cartas;
DROP POLICY IF EXISTS "Insert isolado por empresa cartas" ON public.cartas;
DROP POLICY IF EXISTS "Update isolado por empresa cartas" ON public.cartas;

-- Limpar conflitos de políticas legadas na tabela de 'media_arquivos'
DROP POLICY IF EXISTS select_media_arquivos_policy ON public.media_arquivos;
DROP POLICY IF EXISTS media_arquivos_select ON public.media_arquivos;
DROP POLICY IF EXISTS media_arquivos_insert ON public.media_arquivos;
DROP POLICY IF EXISTS media_arquivos_update ON public.media_arquivos;
DROP POLICY IF EXISTS media_arquivos_delete ON public.media_arquivos;
DROP POLICY IF EXISTS media_select_iso ON public.media_arquivos;
DROP POLICY IF EXISTS media_insert_iso ON public.media_arquivos;
DROP POLICY IF EXISTS media_update_iso ON public.media_arquivos;
DROP POLICY IF EXISTS media_delete_iso ON public.media_arquivos;


-- ====================================================================
-- NOVAS POLÍTICAS DE CONTROLO DE SEGURANÇA SEGUROS (MÁXIMO ISOLAMENTO)
-- ====================================================================

-- --- POLÍTICAS PARA A TABELA 'CARTAS' ---

CREATE POLICY "cartas_select_iso" ON public.cartas
    FOR SELECT TO authenticated
    USING (
        public.is_system_admin() 
        OR empresa_id = public.get_auth_empresa_id()
    );

CREATE POLICY "cartas_insert_iso" ON public.cartas
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_system_admin() 
        OR empresa_id = public.get_auth_empresa_id()
    );

CREATE POLICY "cartas_update_iso" ON public.cartas
    FOR UPDATE TO authenticated
    USING (
        public.is_system_admin() 
        OR empresa_id = public.get_auth_empresa_id()
    )
    WITH CHECK (
        public.is_system_admin() 
        OR empresa_id = public.get_auth_empresa_id()
    );

CREATE POLICY "cartas_delete_iso" ON public.cartas
    FOR DELETE TO authenticated
    USING (
        public.is_system_admin() 
        OR empresa_id = public.get_auth_empresa_id()
    );


-- --- POLÍTICAS PARA A TABELA 'MEDIA_ARQUIVOS' ---

CREATE POLICY "media_select_iso" ON public.media_arquivos
    FOR SELECT TO authenticated
    USING (
        public.is_system_admin() 
        OR empresa_id = public.get_auth_empresa_id()
    );

CREATE POLICY "media_insert_iso" ON public.media_arquivos
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_system_admin() 
        OR empresa_id = public.get_auth_empresa_id()
    );

CREATE POLICY "media_update_iso" ON public.media_arquivos
    FOR UPDATE TO authenticated
    USING (
        public.is_system_admin() 
        OR empresa_id = public.get_auth_empresa_id()
    )
    WITH CHECK (
        public.is_system_admin() 
        OR empresa_id = public.get_auth_empresa_id()
    );

CREATE POLICY "media_isolation_delete" ON public.media_arquivos
    FOR DELETE TO authenticated
    USING (
        empresa_id = public.get_auth_empresa_id() OR public.is_system_admin()
    );

-- 9. Recarregar o cache de esquemas do Supabase
NOTIFY pgrst, 'reload schema';
