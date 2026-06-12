-- 1. Ensure the function exists with the exact signature needed.
-- Make sure the RPC function name is exactly 'anular_documento_fiscal' and parameters match.
-- Use parameters in a named JSON object as requested by postgrest.

CREATE OR REPLACE FUNCTION public.anular_documento_fiscal(
    p_documento_id UUID,
    p_motivo TEXT,
    p_usuario_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_doc RECORD;
    v_result JSONB;
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
        estado_certificacao = 'Anulado'
    WHERE id = p_documento_id;

    -- Return success
    RETURN jsonb_build_object('success', true, 'message', 'Documento anulado com sucesso!');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions if necessary
GRANT EXECUTE ON FUNCTION public.anular_documento_fiscal(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.anular_documento_fiscal(UUID, TEXT, UUID) TO anon;
