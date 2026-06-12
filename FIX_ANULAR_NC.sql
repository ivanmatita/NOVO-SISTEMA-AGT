-- 1. Redefine public.anular_documento_fiscal to automatically generate ND when NC is annulled
CREATE OR REPLACE FUNCTION public.anular_documento_fiscal(
    p_documento_id UUID,
    p_motivo TEXT,
    p_usuario_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_doc RECORD;
    v_nd_result JSON;
    v_detalhes_nd JSONB;
    v_nd_id UUID;
    v_nd_numero TEXT;
BEGIN
    -- Verify document exists
    SELECT * INTO v_doc FROM public.documentos_emitidos WHERE id = p_documento_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Documento não encontrado');
    END IF;

    -- Verify if already annulled
    IF v_doc.documento_anulado = true THEN
        RETURN jsonb_build_object('success', false, 'error', 'Documento já se encontra anulado');
    END IF;

    -- Perform the annulment update
    UPDATE public.documentos_emitidos
    SET 
        documento_anulado = true,
        motivo_anulacao = p_motivo,
        anulado_por = p_usuario_id,
        anulado_at = now(),
        status = 'anulado',
        estado_certificacao = 'Anulado',
        estado = 'anulado'
    WHERE id = p_documento_id;

    -- If the annulled document was a Credit Note (NC), automatically generate a Debit Note (ND)
    IF v_doc.tipo_documento = 'NC' THEN
        -- Construct details for ND referencing the NC
        v_detalhes_nd := jsonb_build_object(
            'items', COALESCE(v_doc.detalhes->'items', '[]'::jsonb),
            'documento_origem_id', v_doc.id,
            'documento_origem_numero', v_doc.numero_documento,
            'motivo_debitou', 'Reversão de Nota de Crédito anulada: ' || p_motivo
        );

        -- Call emitir_documento_fiscal to generate the ND
        SELECT emitir_documento_fiscal(
            v_doc.empresa_id,
            'Nota de Débito',
            v_doc.cliente_nome,
            v_doc.cliente_email,
            v_doc.total,
            v_doc.imposto,
            v_detalhes_nd
        ) INTO v_nd_result;

        -- Extract the generated ID and Number for audit/response
        v_nd_id := (v_nd_result->>'documento_id')::UUID;
        v_nd_numero := v_nd_result->>'documento';

        -- Update the generated ND with origin reference columns
        UPDATE public.documentos_emitidos
        SET
            numero_documento_origem = v_doc.numero_documento,
            tipo_documento_origem = v_doc.tipo_documento,
            documento_origem_id = v_doc.id,
            criado_por = p_usuario_id
        WHERE id = v_nd_id;

        RETURN jsonb_build_object(
            'success', true, 
            'message', 'Nota de Crédito anulada e Nota de Débito ' || v_nd_numero || ' gerada com sucesso!',
            'corretivo_id', v_nd_id
        );
    END IF;

    -- Return success for non-NC documents
    RETURN jsonb_build_object('success', true, 'message', 'Documento anulado com sucesso!');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Grant permissions
GRANT EXECUTE ON FUNCTION public.anular_documento_fiscal(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.anular_documento_fiscal(UUID, TEXT, UUID) TO anon;
