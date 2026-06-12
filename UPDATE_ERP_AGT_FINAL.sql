
-- 1. Create table for Document Types
CREATE TABLE IF NOT EXISTS public.documentos_tipos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT UNIQUE NOT NULL,
    descricao TEXT NOT NULL,
    ativo BOOLEAN DEFAULT true,
    ordem INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed basic types if empty
INSERT INTO public.documentos_tipos (codigo, descricao, ordem)
VALUES 
('FT', 'Fatura', 1),
('FR', 'Fatura Recibo', 2),
('RC', 'Recibo', 3),
('NC', 'Nota de Crédito', 4),
('ND', 'Nota de Débito', 5),
('PP', 'Fatura Proforma', 6),
('OR', 'Orçamento', 7),
('FS', 'Fatura Simplificada', 8),
('GR', 'Guia de Remessa', 9),
('GT', 'Guia de Transporte', 10)
ON CONFLICT (codigo) DO NOTHING;

-- 2. Update documentos_emitidos for related docs and multi-currency
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS documento_origem_id UUID;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS documento_relacionado_id UUID;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS moeda TEXT DEFAULT 'AOA';
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS taxa_cambio NUMERIC DEFAULT 1;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS valor_original_moeda NUMERIC DEFAULT 0;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS numero_documento_origem TEXT;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT true;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS is_final BOOLEAN DEFAULT false;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS pdf_url TEXT;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS valor_extenso TEXT;

-- 3. Create related documents join table for many-to-many if needed (usually one-to-one or one-to-many is enough but this is cleaner)
CREATE TABLE IF NOT EXISTS public.documentos_relacionados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    documento_origem_id UUID NOT NULL REFERENCES public.documentos_emitidos(id),
    documento_relacionado_id UUID NOT NULL REFERENCES public.documentos_emitidos(id),
    tipo_relacao TEXT NOT NULL, -- 'estorno', 'liquidacao', 'transporte', etc.
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Ensure series_fiscais scales properly
ALTER TABLE public.series_fiscais ADD COLUMN IF NOT EXISTS current_document_no INTEGER DEFAULT 0;
ALTER TABLE public.series_fiscais ADD COLUMN IF NOT EXISTS prefixo TEXT;
ALTER TABLE public.series_fiscais ADD COLUMN IF NOT EXISTS sufixo TEXT;

-- Enable RLS on new tables
ALTER TABLE public.documentos_tipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_relacionados ENABLE ROW LEVEL SECURITY;

-- Basic Policies
DROP POLICY IF EXISTS "allow_read_tipos" ON public.documentos_tipos;
CREATE POLICY "allow_read_tipos" ON public.documentos_tipos FOR SELECT USING (true);

DROP POLICY IF EXISTS "allow_all_relacionados" ON public.documentos_relacionados;
CREATE POLICY "allow_all_relacionados" ON public.documentos_relacionados FOR ALL USING (true);

-- 5. Updated certificar_documento_existente to be more robust and handle sequences strictly
CREATE OR REPLACE FUNCTION public.certificar_documento_existente_v2(p_documento_id uuid, p_usuario_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_doc record;
    v_serie record;
    v_numero integer;
    v_hash_anterior text;
    v_hash_novo text;
    v_texto_hash text;
    v_ano_fiscal integer;
    v_numero_final text;
    v_tipo_sigla text;
    v_data_formatada text;
BEGIN
    -- 1. Obter o documento
    SELECT * INTO v_doc FROM public.documentos_emitidos WHERE id = p_documento_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Documento não encontrado.');
    END IF;

    IF v_doc.is_certified OR v_doc.estado_certificacao = 'Certificado' THEN
        RETURN jsonb_build_object('error', 'Documento já está certificado.', 'numero_documento', v_doc.numero_documento);
    END IF;

    -- 2. Obter a série correspondente ao tipo do documento
    -- Se o documento não tem série atribuída, buscamos a ativa para aquele tipo
    SELECT * INTO v_serie FROM public.series_fiscais 
    WHERE empresa_id = v_doc.empresa_id 
    AND tipo = v_doc.tipo_documento 
    AND ativo = true
    ORDER BY created_at DESC LIMIT 1;

    IF NOT FOUND THEN
        -- Fallback: Se não houver série específica para o tipo, tenta uma genérica ou erro
        RETURN jsonb_build_object('error', 'Nenhuma série fiscal ativa encontrada para o tipo ' || v_doc.tipo_documento);
    END IF;

    -- 3. Bloquear a série para evitar concorrência (Sequência Crítica)
    PERFORM id FROM public.series_fiscais WHERE id = v_serie.id FOR UPDATE;
    
    -- Recarregar dados após lock
    SELECT proximo_numero, ultimo_hash, ano, serie INTO v_numero, v_hash_anterior, v_ano_fiscal, v_tipo_sigla 
    FROM public.series_fiscais WHERE id = v_serie.id;

    -- 4. Gerar número do documento: SIGLA ANO/NUMERO (Ex: FT 2026/1)
    v_numero_final := v_serie.tipo || ' ' || v_ano_fiscal || '/' || v_numero;

    -- 5. Gerar Hash Fiscal (Regras simplificadas AGT: Data;Numero;Total;HashAnterior)
    v_data_formatada := to_char(v_doc.data_emissao, 'YYYY-MM-DD');
    v_texto_hash := v_data_formatada || ';' || v_numero_final || ';' || v_doc.total::text || ';' || COALESCE(v_hash_anterior, '');
    v_hash_novo := encode(digest(v_texto_hash, 'sha256'), 'hex');

    -- 6. Atualizar Documento
    UPDATE public.documentos_emitidos SET
        numero_documento = v_numero_final,
        numero_fiscal = v_numero_final,
        hash_fiscal = v_hash_novo,
        hash_anterior = v_hash_anterior,
        is_certified = true,
        estado_certificacao = 'Certificado',
        certified_at = now(),
        certificado_por = p_usuario_id,
        is_draft = false,
        is_final = true,
        serie = v_serie.serie,
        ano = v_ano_fiscal,
        numero_sequencial = v_numero,
        qr_code = 'https://agt.minfin.gov.ao/document/' || v_hash_novo -- Link fictício para homologação
    WHERE id = p_documento_id;

    -- 7. Atualizar Série
    UPDATE public.series_fiscais SET
        proximo_numero = v_numero + 1,
        current_document_no = v_numero,
        ultimo_hash = v_hash_novo,
        ultimo_documento_id = p_documento_id,
        ultima_certificacao = now()
    WHERE id = v_serie.id;

    RETURN jsonb_build_object(
        'success', true, 
        'numero_documento', v_numero_final, 
        'hash', v_hash_novo,
        'serie_id', v_serie.id
    );
END;
$$;
