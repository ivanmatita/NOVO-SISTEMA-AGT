-- ============================================================
-- FIX: Adicionar coluna anulado_at + corrigir tipos documentos
-- Aplicar no Supabase SQL Editor
-- ============================================================

-- 1. Adicionar colunas em falta na tabela documentos_emitidos
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'documentos_emitidos' 
          AND column_name = 'anulado_at'
    ) THEN
        ALTER TABLE public.documentos_emitidos ADD COLUMN anulado_at timestamptz;
        RAISE NOTICE 'Coluna anulado_at adicionada com sucesso.';
    ELSE
        RAISE NOTICE 'Coluna anulado_at já existe.';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'documentos_emitidos' 
          AND column_name = 'motivo_anulacao'
    ) THEN
        ALTER TABLE public.documentos_emitidos ADD COLUMN motivo_anulacao text;
        RAISE NOTICE 'Coluna motivo_anulacao adicionada.';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'documentos_emitidos' 
          AND column_name = 'anulado_por'
    ) THEN
        ALTER TABLE public.documentos_emitidos ADD COLUMN anulado_por uuid;
        RAISE NOTICE 'Coluna anulado_por adicionada.';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'documentos_emitidos' 
          AND column_name = 'documento_anulado'
    ) THEN
        ALTER TABLE public.documentos_emitidos ADD COLUMN documento_anulado boolean DEFAULT false;
        RAISE NOTICE 'Coluna documento_anulado adicionada.';
    END IF;
END $$;

-- 2. Recriar a função anular_documento_fiscal com verificação de coluna
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

    -- Marcar documento como anulado (incluindo anulado_at)
    UPDATE public.documentos_emitidos
    SET 
        documento_anulado = true,
        motivo_anulacao   = p_motivo,
        anulado_por       = p_usuario_id,
        anulado_at        = now(),
        status            = 'anulado',
        estado            = 'ANULADO',
        estado_certificacao = 'ANULADO',
        updated_at        = now()
    WHERE id = p_documento_id;

    -- Auditoria (ignora erro caso tabela não exista)
    BEGIN
        INSERT INTO public.logs_auditoria (company_id, user_id, acao, created_at)
        VALUES (
            v_doc.empresa_id,
            p_usuario_id,
            'ANULAÇÃO DE DOCUMENTO FISCAL - DOC: ' || COALESCE(v_doc.numero_documento, p_documento_id::text) || ' | MOTIVO: ' || p_motivo,
            now()
        );
    EXCEPTION WHEN OTHERS THEN
        NULL; -- ignora erro de auditoria
    END;

    -- Se for documento certificado, gera documento corretivo automático
    IF v_doc.is_certified = true THEN
        IF v_doc.tipo_documento IN ('FT', 'FR', 'Factura', 'Factura Recibo', 'Fatura', 'Fatura Recibo', 'Factura Simplificada', 'FS', 'Guia de Remessa', 'Guia de Transporte', 'GR', 'GT') THEN
            v_tipo_corretivo := 'NC';
        ELSIF v_doc.tipo_documento IN ('NC', 'Nota de Crédito', 'NOTA_CREDITO') THEN
            v_tipo_corretivo := 'ND';
        ELSE
            -- Outros tipos: anula apenas, sem corretivo automático
            RETURN jsonb_build_object('success', true, 'message', 'Documento anulado com sucesso');
        END IF;

        v_new_doc_id := gen_random_uuid();

        INSERT INTO public.documentos_emitidos (
            id, empresa_id, tipo_documento, numero_documento, cliente_nome, cliente_email,
            total, imposto, estado, data_emissao, detalhes,
            documento_origem_id, numero_documento_origem, tipo_documento_origem,
            serie, ano, is_certified, created_at,
            created_by, created_by_username, created_by_nome, criado_por
        ) VALUES (
            v_new_doc_id, v_doc.empresa_id, v_tipo_corretivo, v_tipo_corretivo || ' TEMP-' || v_new_doc_id::text,
            v_doc.cliente_nome, v_doc.cliente_email,
            v_doc.total, v_doc.imposto, 'EMITIDO', now(), v_doc.detalhes,
            v_doc.id, v_doc.numero_documento, v_doc.tipo_documento,
            v_doc.serie, EXTRACT(YEAR FROM now())::int, false, now(),
            v_doc.created_by, v_doc.created_by_username, v_doc.created_by_nome, v_doc.criado_por
        );

        -- Tentar certificar o corretivo
        BEGIN
            SELECT public.certificar_documento_existente(v_new_doc_id, p_usuario_id) INTO v_res;
        EXCEPTION WHEN OTHERS THEN
            v_res := jsonb_build_object('error', SQLERRM);
        END;

        RETURN jsonb_build_object(
            'success', true,
            'message', 'Documento anulado e ' || v_tipo_corretivo || ' gerada com sucesso',
            'corretivo_id', v_new_doc_id,
            'certificacao_result', v_res
        );
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Documento anulado com sucesso');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Garantir permissões
GRANT EXECUTE ON FUNCTION public.anular_documento_fiscal(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.anular_documento_fiscal(UUID, TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.anular_documento_fiscal(UUID, TEXT, UUID) TO service_role;

-- 4. Corrigir registos de Recibos que foram guardados com tipo incorreto
-- Normalizar 'Recibo', 'RECIBO', 'REC' para 'RC'
UPDATE public.documentos_emitidos
SET tipo_documento = 'RC'
WHERE tipo_documento IN ('Recibo', 'RECIBO', 'REC', 'Recibo de Venda', 'RE')
  AND tipo_documento != 'RC';

-- Normalizar 'Nota de Débito', 'NOTA_DEBITO' para 'ND'  
UPDATE public.documentos_emitidos
SET tipo_documento = 'ND'
WHERE tipo_documento IN ('Nota de Débito', 'Nota de Debito', 'NOTA_DEBITO', 'NOTA DEBITO')
  AND tipo_documento != 'ND';

-- Normalizar 'Nota de Crédito', 'NOTA_CREDITO' para 'NC'
UPDATE public.documentos_emitidos
SET tipo_documento = 'NC'
WHERE tipo_documento IN ('Nota de Crédito', 'Nota de Credito', 'NOTA_CREDITO', 'NOTA CREDITO')
  AND tipo_documento != 'NC';

-- 5. Verificação final
SELECT 
    tipo_documento, 
    COUNT(*) as total,
    SUM(CASE WHEN documento_anulado = true THEN 1 ELSE 0 END) as anulados
FROM public.documentos_emitidos
GROUP BY tipo_documento
ORDER BY total DESC;
