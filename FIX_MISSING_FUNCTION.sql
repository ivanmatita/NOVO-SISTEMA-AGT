-- ============================================================
-- FIX: Garantir existência da função anular_documento_fiscal
-- com lógica completa de geração automática de corretivo:
--   • Anular NC → gera ND (Nota de Débito)
--   • Anular qualquer outro doc → gera NC (Nota de Crédito)
-- ============================================================

CREATE OR REPLACE FUNCTION public.anular_documento_fiscal(
    p_documento_id UUID,
    p_motivo TEXT,
    p_usuario_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_doc RECORD;
    v_tipo_corretivo TEXT;
    v_new_doc_id UUID;
    v_res JSONB;
BEGIN
    -- Verificar se o documento existe
    SELECT * INTO v_doc FROM public.documentos_emitidos WHERE id = p_documento_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Documento não encontrado');
    END IF;

    -- Verificar se já foi anulado
    IF v_doc.documento_anulado = true OR v_doc.status = 'anulado' OR v_doc.estado = 'ANULADO' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Documento já se encontra anulado');
    END IF;

    -- Marcar documento como anulado
    UPDATE public.documentos_emitidos
    SET 
        documento_anulado   = true,
        motivo_anulacao     = p_motivo,
        anulado_por         = p_usuario_id,
        anulado_at          = now(),
        status              = 'anulado',
        estado              = 'ANULADO',
        estado_certificacao = 'ANULADO',
        updated_at          = now()
    WHERE id = p_documento_id;

    -- Auditoria (ignora erro caso tabela não exista)
    BEGIN
        INSERT INTO public.logs_auditoria (company_id, user_id, acao, created_at)
        VALUES (
            v_doc.empresa_id,
            p_usuario_id,
            'ANULAÇÃO - DOC: ' || COALESCE(v_doc.numero_documento, p_documento_id::text) || ' | MOTIVO: ' || p_motivo,
            now()
        );
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- Determinar tipo de documento corretivo:
    --   NC/Nota de Crédito → gera ND (reverte o crédito concedido)
    --   Qualquer outro doc → gera NC (anula a faturação)
    IF v_doc.tipo_documento IN ('NC', 'Nota de Crédito', 'NOTA_CREDITO', 'Nota de Credito') THEN
        v_tipo_corretivo := 'ND';
    ELSE
        v_tipo_corretivo := 'NC';
    END IF;

    v_new_doc_id := gen_random_uuid();

    INSERT INTO public.documentos_emitidos (
        id, empresa_id, tipo_documento, numero_documento, cliente_nome, cliente_email,
        total, imposto, estado, data_emissao, detalhes,
        documento_origem_id, numero_documento_origem, tipo_documento_origem,
        serie, ano, is_certified, created_at,
        created_by, created_by_username, created_by_nome, criado_por
    ) VALUES (
        v_new_doc_id, v_doc.empresa_id, v_tipo_corretivo,
        v_tipo_corretivo || ' TEMP-' || v_new_doc_id::text,
        v_doc.cliente_nome, v_doc.cliente_email,
        v_doc.total, v_doc.imposto, 'EMITIDO', now(), v_doc.detalhes,
        v_doc.id, v_doc.numero_documento, v_doc.tipo_documento,
        v_doc.serie, EXTRACT(YEAR FROM now())::int, false, now(),
        v_doc.created_by, v_doc.created_by_username, v_doc.created_by_nome, v_doc.criado_por
    );

    -- Tentar certificar o documento corretivo
    BEGIN
        SELECT public.certificar_documento_existente(v_new_doc_id, p_usuario_id) INTO v_res;
    EXCEPTION WHEN OTHERS THEN
        v_res := jsonb_build_object('error', SQLERRM);
    END;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Documento anulado e ' || v_tipo_corretivo || ' gerada com sucesso',
        'corretivo_id', v_new_doc_id,
        'corretivo_tipo', v_tipo_corretivo,
        'certificacao_result', v_res
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.anular_documento_fiscal(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.anular_documento_fiscal(UUID, TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.anular_documento_fiscal(UUID, TEXT, UUID) TO service_role;
