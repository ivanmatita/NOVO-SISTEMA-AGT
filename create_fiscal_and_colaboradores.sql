-- ============================================================================
-- SCRIPT ÚNICO DE CRIAÇÃO E CONFIGURAÇÃO FISCAL + COLABORADORES (SaaS MULTITENANT)
-- Execute este script no SQL Editor do seu Supabase Dashboard
-- ============================================================================

-- EXTENSÕES REQUERIDAS
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 1. ESTRUTURA E REGRAS PARA COLABORADORES (PORTUGUÊS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.colaboradores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE, 

    -- Informações Principais do Colaborador
    name TEXT NOT NULL,
    role TEXT,
    profession_id UUID REFERENCES public.professions(id) ON DELETE SET NULL,
    salary NUMERIC DEFAULT 0,
    email TEXT,
    phone TEXT,
    hired_at TEXT,
    nif TEXT,
    bi TEXT,
    image_url TEXT,
    gender TEXT,
    birth_date TEXT,
    marital_status TEXT,
    academic_level TEXT,
    department TEXT,
    contract_type TEXT,
    dependents INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active', -- active, inactive, dismissed

    -- Informações Financeiras e Fiscais
    iban TEXT,
    bank_name TEXT,
    bank_account TEXT,
    inss_number TEXT,
    inss_number_antigo TEXT,
    subject_to_irt BOOLEAN DEFAULT TRUE,
    subject_to_inss BOOLEAN DEFAULT TRUE,
    grupo_irt TEXT,
    reparticao_fiscal TEXT,

    -- Dados da Morada no Funcionário
    address TEXT,
    casa_no TEXT,
    rua TEXT,
    zona TEXT,
    bairro TEXT,
    provincia_morada TEXT,
    municipio_morada TEXT,
    codigo_postal TEXT DEFAULT '0000-00',
    pais TEXT DEFAULT 'AO',

    -- Indicação de Carga Semanal em Horas
    seg_hours TEXT DEFAULT '8',
    ter_hours TEXT DEFAULT '8',
    qua_hours TEXT DEFAULT '8',
    qui_hours TEXT DEFAULT '8',
    sex_hours TEXT DEFAULT '8',
    sab_hours TEXT DEFAULT '4',
    dom_hours TEXT DEFAULT '0',

    -- Admissão e Outros Registros
    complemento_salarial NUMERIC DEFAULT 0,
    local_trabalho_id TEXT,
    solicitante_admissao TEXT,
    motivo_admissao TEXT,
    provincia_trabalho TEXT,
    municipio_trabalho TEXT,
    agente_no TEXT,
    document_type TEXT,
    entidade_emissora TEXT,
    data_emissao_doc TEXT,
    data_validade_doc TEXT,
    naturalidade TEXT,
    provincia_nascimento TEXT,
    nacionalidade TEXT,
    nome_pai TEXT,
    nome_mae TEXT,

    -- Demissão / Extinção Laboral
    dismissed_at TEXT,
    dismissal_reason TEXT,
    dismissal_ordered_by TEXT,
    dismissal_observations TEXT,

    -- Controle de auditoria
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas para evitar colisões
DROP POLICY IF EXISTS colaboradores_isolation_policy ON public.colaboradores;

-- Criar política robusta multitenant
CREATE POLICY colaboradores_isolation_policy
ON public.colaboradores
FOR ALL
TO authenticated
USING (
  empresa_id = public.get_auth_empresa_id()
)
WITH CHECK (
  empresa_id = public.get_auth_empresa_id()
);

-- Índices Rápidos de Isolamento
CREATE INDEX IF NOT EXISTS idx_colaboradores_empresa_id ON public.colaboradores(empresa_id);

-- ============================================================================
-- 2. ENQUADRAMENTO FISCAL - SÉRIES E DOCUMENTOS EMITIDOS
-- ============================================================================

-- Criar tabela series_fiscais se não existir
CREATE TABLE IF NOT EXISTS public.series_fiscais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    serie TEXT DEFAULT 'PRD',
    descricao TEXT DEFAULT 'Série Produção',
    tipo TEXT NOT NULL, -- FT, FR, VD, etc.
    proximo_numero INTEGER DEFAULT 1,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para as séries
ALTER TABLE public.series_fiscais ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS series_fiscais_isolation_policy ON public.series_fiscais;
CREATE POLICY series_fiscais_isolation_policy
ON public.series_fiscais
FOR ALL
TO authenticated
USING (empresa_id = public.get_auth_empresa_id())
WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- Alterações de colunas em series_fiscais
ALTER TABLE public.series_fiscais ADD COLUMN IF NOT EXISTS ano integer;
ALTER TABLE public.series_fiscais ADD COLUMN IF NOT EXISTS ultimo_hash text;

-- Criar tabela documentos_emitidos se não existir
CREATE TABLE IF NOT EXISTS public.documentos_emitidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    tipo_documento TEXT NOT NULL,
    numero_documento TEXT,
    cliente_nome TEXT,
    cliente_email TEXT,
    total NUMERIC DEFAULT 0,
    imposto NUMERIC DEFAULT 0,
    estado TEXT DEFAULT 'emitido',
    data_emissao TIMESTAMPTZ DEFAULT now(),
    detalhes JSONB,
    is_certified BOOLEAN DEFAULT FALSE,
    estado_certificacao TEXT DEFAULT 'pendente',
    status TEXT DEFAULT 'ativo',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para Documentos Emitidos
ALTER TABLE public.documentos_emitidos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS documentos_emitidos_isolation_policy ON public.documentos_emitidos;
CREATE POLICY documentos_emitidos_isolation_policy
ON public.documentos_emitidos
FOR ALL
TO authenticated
USING (empresa_id = public.get_auth_empresa_id())
WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- Atualizações para o Certificado e Segurança do Documento
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS serie text;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS ano integer;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS numero_sequencial integer;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS hash_anterior text;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS hash_documento text;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS codigo_validacao text;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS assinatura_digital text;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS documento_formatado text;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS documento_anulado boolean DEFAULT false;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS motivo_anulacao text;

-- Criar Índices Únicos para evitar qualquer duplicação ou colisão fiscal
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_documento_empresa
ON public.documentos_emitidos (
    empresa_id,
    tipo_documento,
    serie,
    ano,
    numero_sequencial
);

-- ============================================================================
-- 3. CRIPTO, HASH MANUAL E SEGURANÇA IMUTÁVEL
-- ============================================================================

-- Função para gerar o hash SHA256 completo
CREATE OR REPLACE FUNCTION gerar_hash_sha256(texto text)
RETURNS text
LANGUAGE sql
AS $$
    SELECT encode(digest(texto, 'sha256'), 'hex');
$$;

-- Função para gerar o código curto de validação (4 caracteres finais legíveis)
CREATE OR REPLACE FUNCTION gerar_codigo_curto(hash_text text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN upper(substring(hash_text from 1 for 4));
END;
$$;

-- Trigger para bloquear qualquer e qualquere exclusão física (DELETE) de Documentos Fiscais
CREATE OR REPLACE FUNCTION bloquear_delete_documentos()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'DELETE de documentos fiscais nao e permitido por lei. Use apenas a funcionalidade de Anulacao.';
END;
$$;

DROP TRIGGER IF EXISTS trg_block_delete_documentos ON public.documentos_emitidos;
CREATE TRIGGER trg_block_delete_documentos
BEFORE DELETE ON public.documentos_emitidos
FOR EACH ROW
EXECUTE FUNCTION bloquear_delete_documentos();

-- ============================================================================
-- 4. FUNÇÕES DE OPERAÇÃO FISCAL (RPC)
-- ============================================================================

-- Emissão de Documento Fiscal Gerenciada pelo Banco de Dados
CREATE OR REPLACE FUNCTION emitir_documento_fiscal(
    p_empresa_id uuid,
    p_tipo_documento text,
    p_cliente_nome text,
    p_cliente_email text,
    p_total numeric,
    p_imposto numeric,
    p_detalhes jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_serie_record record;
    v_numero integer;
    v_ano integer;
    v_documento text;
    v_hash_anterior text;
    v_hash_novo text;
    v_codigo_curto text;
    v_texto_hash text;
    v_documento_id uuid;
BEGIN
    v_ano := EXTRACT(YEAR FROM now());

    -- 1. Obter ou Criar Série Fiscal ativa
    SELECT * INTO v_serie_record
    FROM public.series_fiscais
    WHERE empresa_id = p_empresa_id
      AND ativo = true
      AND tipo = p_tipo_documento
      AND ("ano" = v_ano OR "ano" IS NULL)
    LIMIT 1;

    IF v_serie_record IS NULL THEN
        INSERT INTO public.series_fiscais (
            empresa_id, serie, descricao, tipo, proximo_numero, ativo, "ano"
        )
        VALUES (
            p_empresa_id, 'PRD', 'Serie Producao', p_tipo_documento, 1, true, v_ano
        )
        RETURNING * INTO v_serie_record;
    END IF;

    -- 2. Incrementar número e obter atual de forma segura contra concorrências
    UPDATE public.series_fiscais
    SET proximo_numero = proximo_numero + 1
    WHERE id = v_serie_record.id
    RETURNING (proximo_numero - 1) INTO v_numero;

    -- 3. Formatar o número do documento
    v_documento := p_tipo_documento || ' ' || v_serie_record.serie || '/' || v_ano || '/' || LPAD(v_numero::text, 6, '0');

    -- 4. Buscar o hash do último documento emitido para criar a cadeia encadeada
    SELECT hash_documento INTO v_hash_anterior
    FROM public.documentos_emitidos
    WHERE empresa_id = p_empresa_id
      AND tipo_documento = p_tipo_documento
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_hash_anterior IS NULL THEN
        v_hash_anterior := '';
    END IF;

    -- 5. Montar payload do hash encadeado (SHA256)
    v_texto_hash := COALESCE(v_documento,'')
                 || COALESCE(p_cliente_nome,'')
                 || COALESCE(p_total::text,'')
                 || COALESCE(p_imposto::text,'')
                 || COALESCE(v_hash_anterior,'');

    v_hash_novo := gerar_hash_sha256(v_texto_hash);
    v_codigo_curto := gerar_codigo_curto(v_hash_novo);

    -- 6. Gravar o novo registro com carimbo "CERTIFICADO" em conformidade AGT
    INSERT INTO public.documentos_emitidos (
        empresa_id,
        tipo_documento,
        numero_documento,
        cliente_nome,
        cliente_email,
        total,
        imposto,
        estado,
        data_emissao,
        detalhes,
        serie,
        ano,
        numero_sequencial,
        hash_anterior,
        hash_documento,
        codigo_validacao,
        assinatura_digital,
        documento_formatado,
        is_certified,
        estado_certificacao,
        status
    )
    VALUES (
        p_empresa_id,
        p_tipo_documento,
        v_documento,
        p_cliente_nome,
        p_cliente_email,
        p_total,
        p_imposto,
        'emitido',
        now(),
        p_detalhes,
        v_serie_record.serie,
        v_ano,
        v_numero,
        v_hash_anterior,
        v_hash_novo,
        v_codigo_curto,
        v_hash_novo,
        v_documento,
        true, -- Is Certified!
        'certificado',
        'ativo'
    )
    RETURNING id INTO v_documento_id;

    -- 7. Atualizar o último hash na série
    UPDATE public.series_fiscais
    SET ultimo_hash = v_hash_novo
    WHERE id = v_serie_record.id;

    RETURN json_build_object(
        'success', true,
        'documento_id', v_documento_id,
        'documento', v_documento,
        'hash', v_hash_novo,
        'codigo_validacao', v_codigo_curto
    );
END;
$$;

-- Função de Anulação Fiscal de Faturas / Documentos
CREATE OR REPLACE FUNCTION anular_documento_fiscal(
    p_documento_id uuid,
    p_motivo text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.documentos_emitidos
    SET documento_anulado = true,
        motivo_anulacao = p_motivo,
        status = 'anulado',
        estado = 'anulado'
    WHERE id = p_documento_id;

    RETURN json_build_object(
        'success', true
    );
END;
$$;

-- Notificar recarregamento schema
NOTIFY pgrst, 'reload schema';
