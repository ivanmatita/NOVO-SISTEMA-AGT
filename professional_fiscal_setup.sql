-- ======================================================
-- SISTEMA FISCAL PROFISSIONAL (ANGOLA LGT/AGT)
-- ERP/POS SaaS MULTIEMPRESA
-- ======================================================

-- 1. EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. AJUSTAR TABELAS EXISTENTES
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS serie text DEFAULT 'PRD';
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS ano integer DEFAULT EXTRACT(YEAR FROM now());
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS numero_sequencial integer;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS hash_anterior text;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS hash_documento text;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS codigo_validacao text;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS assinatura_digital text;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS documento_formatado text;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS documento_anulado boolean DEFAULT false;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS motivo_anulacao text;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS is_certified boolean DEFAULT false;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS estado_certificacao text DEFAULT 'pendente';

-- Preparação para o índice (Limpar dados de teste duplicados se necessário)
-- DELETE FROM public.documentos_emitidos WHERE numero_sequencial IS NULL OR numero_sequencial = 1;

-- 3. ÍNDICES DE SEGURANÇA E INTEGRIDADE
-- DROP INDEX IF EXISTS idx_unique_documento_empresa;
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_documento_empresa 
ON public.documentos_emitidos (empresa_id, tipo_documento, serie, ano, numero_sequencial);

-- 4. AJUSTAR TABELA DE SÉRIES
ALTER TABLE public.series_fiscais ADD COLUMN IF NOT EXISTS ano integer DEFAULT EXTRACT(YEAR FROM now());
ALTER TABLE public.series_fiscais ADD COLUMN IF NOT EXISTS ultimo_hash text;

-- 5. FUNÇÕES AUXILIARES
CREATE OR REPLACE FUNCTION gerar_hash_sha256(texto text) RETURNS text LANGUAGE sql AS $$
    SELECT encode(digest(texto, 'sha256'), 'hex');
$$;

CREATE OR REPLACE FUNCTION gerar_codigo_curto(hash_text text) RETURNS text LANGUAGE plpgsql AS $$
BEGIN
    RETURN upper(substring(hash_text from 1 for 4));
END;
$$;

-- 6. FUNÇÃO PRINCIPAL: EMITIR DOCUMENTO FISCAL
CREATE OR REPLACE FUNCTION emitir_documento_fiscal(
    p_empresa_id uuid,
    p_tipo_documento text,
    p_cliente_nome text,
    p_cliente_email text,
    p_total numeric,
    p_imposto numeric,
    p_detalhes jsonb
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
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

    -- BUSCAR SÉRIE ATIVA
    SELECT * INTO v_serie_record FROM public.series_fiscais
    WHERE empresa_id = p_empresa_id AND ativo = true AND tipo = p_tipo_documento AND ano = v_ano
    LIMIT 1;

    -- CRIAR SÉRIE AUTOMÁTICA SE NÃO EXISTIR
    IF v_serie_record IS NULL THEN
        INSERT INTO public.series_fiscais (empresa_id, serie, descricao, tipo, proximo_numero, ativo, ano)
        VALUES (p_empresa_id, 'PRD', 'Serie Produção', p_tipo_documento, 1, true, v_ano)
        RETURNING * INTO v_serie_record;
    END IF;

    -- BLOQUEAR LINHA PARA EVITAR DUPLICAÇÃO E INCREMENTAR
    UPDATE public.series_fiscais SET proximo_numero = proximo_numero + 1
    WHERE id = v_serie_record.id
    RETURNING proximo_numero - 1 INTO v_numero;

    -- GERAR NÚMERO FORMATADO (Ex: FT PRD/2026/000001)
    v_documento := p_tipo_documento || ' ' || v_serie_record.serie || '/' || v_ano || '/' || LPAD(v_numero::text, 6, '0');

    -- BUSCAR HASH ANTERIOR (ENcadeamento Fiscal)
    SELECT hash_documento INTO v_hash_anterior FROM public.documentos_emitidos
    WHERE empresa_id = p_empresa_id AND tipo_documento = p_tipo_documento
    ORDER BY created_at DESC LIMIT 1;

    -- GERAR TEXTO PARA HASH
    v_texto_hash := COALESCE(v_documento,'') || COALESCE(p_cliente_nome,'') || COALESCE(p_total::text,'') || COALESCE(p_imposto::text,'') || COALESCE(v_hash_anterior,'');
    v_hash_novo := gerar_hash_sha256(v_texto_hash);
    v_codigo_curto := gerar_codigo_curto(v_hash_novo);

    -- SALVAR DOCUMENTO CERTIFICADO
    INSERT INTO public.documentos_emitidos (
        empresa_id, tipo_documento, numero_documento, cliente_nome, cliente_email,
        total, imposto, estado, data_emissao, detalhes,
        serie, ano, numero_sequencial, hash_anterior, hash_documento,
        codigo_validacao, assinatura_digital, documento_formatado,
        is_certified, estado_certificacao, status
    ) VALUES (
        p_empresa_id, p_tipo_documento, v_documento, p_cliente_nome, p_cliente_email,
        p_total, p_imposto, 'emitido', now(), p_detalhes,
        v_serie_record.serie, v_ano, v_numero, v_hash_anterior, v_hash_novo,
        v_codigo_curto, v_hash_novo, v_documento, true, 'CERTIFICADO', 'ativo'
    ) RETURNING id INTO v_documento_id;

    -- ATUALIZAR ÚLTIMO HASH NA SÉRIE
    UPDATE public.series_fiscais SET ultimo_hash = v_hash_novo WHERE id = v_serie_record.id;

    RETURN json_build_object(
        'success', true,
        'documento_id', v_documento_id,
        'documento', v_documento,
        'hash', v_hash_novo,
        'codigo_validacao', v_codigo_curto,
        'numero_sequencial', v_numero
    );
END;
$$;

-- 7. BLOQUEAR DELETE FÍSICO (IMUTABILIDADE)
CREATE OR REPLACE FUNCTION bloquear_delete_documentos() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'DELETE de documentos fiscais não permitido. Use a funcionalidade de anulação.';
END;
$$;

DROP TRIGGER IF EXISTS trg_block_delete_documentos ON public.documentos_emitidos;
CREATE TRIGGER trg_block_delete_documentos BEFORE DELETE ON public.documentos_emitidos FOR EACH ROW EXECUTE FUNCTION bloquear_delete_documentos();

-- 8. FUNÇÃO DE ANULAÇÃO FISCAL
CREATE OR REPLACE FUNCTION anular_documento_fiscal(p_documento_id uuid, p_motivo text) RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE public.documentos_emitidos SET 
        documento_anulado = true, 
        motivo_anulacao = p_motivo, 
        status = 'anulado', 
        estado = 'anulado',
        is_certified = false -- O documento deixa de ser válido mas o registo permanece
    WHERE id = p_documento_id;
    RETURN json_build_object('success', true);
END;
$$;
