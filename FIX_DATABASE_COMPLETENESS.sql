-- ====================================================================
-- COESÃO E SEGURANÇA: REPARAÇÃO DO MODELO DE DADOS DE CORRESPONDÊNCIA (CARTAS)
-- E ROBUSTECIMENTO DE FUNÇÕES AUXILIARES DE TENANT (RLS)
-- ====================================================================

-- 1. Uniformização de colunas na tabela public.perfis (Mapeamento de Multitenancy)
-- Garantir que as duas colunas chaves (empresa_id e company_id) existem e estão sincronizadas de forma bidireccional.
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS empresa_id UUID;
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS company_id UUID;

UPDATE public.perfis SET empresa_id = company_id WHERE empresa_id IS NULL AND company_id IS NOT NULL;
UPDATE public.perfis SET company_id = empresa_id WHERE company_id IS NULL AND empresa_id IS NOT NULL;


-- 2. Recriar a função public.get_user_company_id() com tratamento robusto de erros (Exception-safe)
-- Esta alteração previne que erros de coluna ou transacções locais quebrem o RLS em cascata.
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID AS $$
DECLARE
  v_company_id UUID;
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN 
    RETURN NULL; 
  END IF;

  -- Passo A: tentar do JWT metadata (Método de acesso ultra-rápido, sem hits directos na BD)
  BEGIN
    v_company_id := (auth.jwt() -> 'user_metadata' ->> 'empresa_id')::UUID;
    IF v_company_id IS NOT NULL THEN 
      RETURN v_company_id; 
    END IF;
  EXCEPTION WHEN OTHERS THEN 
    -- Suprimir erro
  END;

  BEGIN
    v_company_id := (auth.jwt() -> 'user_metadata' ->> 'company_id')::UUID;
    IF v_company_id IS NOT NULL THEN 
      RETURN v_company_id; 
    END IF;
  EXCEPTION WHEN OTHERS THEN 
    -- Suprimir erro
  END;

  -- Passo B: Consultar tabela perfis com Security Definer para ignorar RLS em loops de recursão
  BEGIN
    SELECT company_id INTO v_company_id FROM public.perfis WHERE id = v_uid LIMIT 1;
    IF v_company_id IS NOT NULL THEN 
      RETURN v_company_id; 
    END IF;
  EXCEPTION WHEN OTHERS THEN 
    -- Suprimir erro se a coluna company_id for temporariamente inacessível
  END;

  BEGIN
    SELECT empresa_id INTO v_company_id FROM public.perfis WHERE id = v_uid LIMIT 1;
    IF v_company_id IS NOT NULL THEN 
      RETURN v_company_id; 
    END IF;
  EXCEPTION WHEN OTHERS THEN 
    -- Suprimir erro se a coluna empresa_id for inacessível
  END;

  -- Passo C: Fallback para o proprietário directo da empresa
  BEGIN
    SELECT id INTO v_company_id FROM public.empresas WHERE auth_user_id = v_uid LIMIT 1;
  EXCEPTION WHEN OTHERS THEN 
    -- Suprimir erro
  END;

  RETURN v_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Certificar a existência da tabela public.cartas e correspondentes colunas
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
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexação para cartas
CREATE INDEX IF NOT EXISTS cartas_empresa_id_idx ON public.cartas (empresa_id);
CREATE INDEX IF NOT EXISTS cartas_is_deleted_idx ON public.cartas (is_deleted);


-- 4. Certificar a existência da tabela public.media_arquivos para anexos de correspondência
CREATE TABLE IF NOT EXISTS public.media_arquivos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    carta_id UUID REFERENCES public.cartas(id) ON DELETE SET NULL,
    url TEXT NOT NULL,
    path TEXT NOT NULL,
    nome_original TEXT NOT NULL,
    tipo_ficheiro TEXT NOT NULL,
    tamanho BIGINT DEFAULT 0,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexação para anexos
CREATE INDEX IF NOT EXISTS media_arquivos_carta_id_idx ON public.media_arquivos (carta_id);
CREATE INDEX IF NOT EXISTS media_arquivos_empresa_id_idx ON public.media_arquivos (empresa_id);


-- 5. Configurar as políticas de RLS e isolamento Multi-Empresa em Cartas e Media Ficheiros
ALTER TABLE public.cartas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_arquivos ENABLE ROW LEVEL SECURITY;

-- Limpar quaisquer políticas duplicadas que possam conflituar
DROP POLICY IF EXISTS cartas_select_policy ON public.cartas;
DROP POLICY IF EXISTS cartas_insert_policy ON public.cartas;
DROP POLICY IF EXISTS cartas_update_policy ON public.cartas;
DROP POLICY IF EXISTS cartas_delete_policy ON public.cartas;
DROP POLICY IF EXISTS "cartas_select_iso" ON public.cartas;
DROP POLICY IF EXISTS "cartas_insert_iso" ON public.cartas;
DROP POLICY IF EXISTS "cartas_update_iso" ON public.cartas;
DROP POLICY IF EXISTS cartas_isolation ON public.cartas;

DROP POLICY IF EXISTS media_select_policy ON public.media_arquivos;
DROP POLICY IF EXISTS media_insert_policy ON public.media_arquivos;
DROP POLICY IF EXISTS media_update_policy ON public.media_arquivos;
DROP POLICY IF EXISTS media_delete_policy ON public.media_arquivos;
DROP POLICY IF EXISTS "media_select_iso" ON public.media_arquivos;
DROP POLICY IF EXISTS "media_insert_iso" ON public.media_arquivos;
DROP POLICY IF EXISTS "media_update_iso" ON public.media_arquivos;
DROP POLICY IF EXISTS media_arquivos_isolation ON public.media_arquivos;

-- Criar novas políticas limpas e isoladas baseadas na função corrigida
CREATE POLICY cartas_isolation ON public.cartas 
    FOR ALL TO authenticated 
    USING (public.is_system_admin() OR empresa_id = public.get_user_company_id())
    WITH CHECK (public.is_system_admin() OR empresa_id = public.get_user_company_id());

CREATE POLICY media_arquivos_isolation ON public.media_arquivos 
    FOR ALL TO authenticated 
    USING (public.is_system_admin() OR empresa_id = public.get_user_company_id())
    WITH CHECK (public.is_system_admin() OR empresa_id = public.get_user_company_id());
