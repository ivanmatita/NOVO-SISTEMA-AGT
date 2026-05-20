-- ATUALIZAÇÃO DA FUNÇÃO DE EMISSÃO DE DOCUMENTOS FISCAIS DE ACORDO COM AS NORMAS DA AGT
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
    v_abbr text;
BEGIN
    v_ano := EXTRACT(YEAR FROM now());

    -- MAPEAR O TIPO DE DOCUMENTO PARA A RECOPILAÇÃO OFICIAL DA SÉRIE (FT, FR, FP, NC, ND, RC)
    v_abbr := CASE 
        WHEN lower(p_tipo_documento) LIKE '%fatura recibo%' OR lower(p_tipo_documento) = 'fr' OR lower(p_tipo_documento) = 'fatura-recibo' THEN 'FR'
        WHEN lower(p_tipo_documento) LIKE '%proforma%' OR lower(p_tipo_documento) LIKE '%pro-forma%' OR lower(p_tipo_documento) = 'fp' THEN 'FP'
        WHEN lower(p_tipo_documento) LIKE '%nota%credito%' OR lower(p_tipo_documento) LIKE '%nota%crédito%' OR lower(p_tipo_documento) = 'nc' THEN 'NC'
        WHEN lower(p_tipo_documento) LIKE '%nota%debito%' OR lower(p_tipo_documento) LIKE '%nota%débito%' OR lower(p_tipo_documento) = 'nd' THEN 'ND'
        WHEN lower(p_tipo_documento) LIKE '%recibo%' OR lower(p_tipo_documento) = 'rc' THEN 'RC'
        WHEN lower(p_tipo_documento) LIKE '%fatura%' OR lower(p_tipo_documento) = 'ft' THEN 'FT'
        ELSE 'FT'
    END;

    -- BUSCAR SÉRIE ATIVA
    SELECT * INTO v_serie_record FROM public.series_fiscais
    WHERE empresa_id = p_empresa_id AND ativo = true AND (tipo = p_tipo_documento OR tipo = v_abbr) AND ano = v_ano
    LIMIT 1;

    -- CRIAR SÉRIE AUTOMÁTICA SE NÃO EXISTIR
    IF v_serie_record IS NULL THEN
        INSERT INTO public.series_fiscais (empresa_id, serie, descricao, tipo, proximo_numero, ativo, ano)
        VALUES (p_empresa_id, 'PRD', 'Serie Produção', v_abbr, 1, true, v_ano)
        RETURNING * INTO v_serie_record;
    END IF;

    -- BLOQUEAR LINHA PARA EVITAR DUPLICAÇÃO E INCREMENTAR
    UPDATE public.series_fiscais SET proximo_numero = proximo_numero + 1
    WHERE id = v_serie_record.id
    RETURNING proximo_numero - 1 INTO v_numero;

    -- GERAR NÚMERO FORMATADO EM CONFORMIDADE DA AGT (Ex: FT PRD/2026/000001)
    v_documento := v_abbr || ' ' || v_serie_record.serie || '/' || v_ano || '/' || LPAD(v_numero::text, 6, '0');

    -- BUSCAR HASH ANTERIOR (Encadeamento Fiscal)
    SELECT hash_documento INTO v_hash_anterior FROM public.documentos_emitidos
    WHERE empresa_id = p_empresa_id AND tipo_documento = v_abbr
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
        p_empresa_id, v_abbr, v_documento, p_cliente_nome, p_cliente_email,
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
