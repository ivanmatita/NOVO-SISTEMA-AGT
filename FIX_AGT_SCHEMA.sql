-- 1. Create missing table
CREATE TABLE IF NOT EXISTS public.series_fiscais_usuarios (
    id BIGSERIAL PRIMARY KEY,
    empresa_id UUID NOT NULL,
    utilizador_id UUID NOT NULL,
    serie_id BIGINT NOT NULL REFERENCES public.series_fiscais(id),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(empresa_id, utilizador_id, serie_id)
);

-- 2. Add fiscal columns to documentos_emitidos
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS hash_anterior TEXT;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS hash_fiscal TEXT;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS assinatura_digital TEXT;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS qr_code TEXT;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS numero_sequencial INTEGER;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS documento_formatado TEXT;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS estado_certificacao TEXT DEFAULT 'Pendente';
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS submission_uuid UUID;

-- 3. Add fiscal columns to series_fiscais
ALTER TABLE public.series_fiscais ADD COLUMN IF NOT EXISTS ano INTEGER DEFAULT 2026;
ALTER TABLE public.series_fiscais ADD COLUMN IF NOT EXISTS ultimo_hash TEXT;
ALTER TABLE public.series_fiscais ADD COLUMN IF NOT EXISTS current_document_no INTEGER DEFAULT 0;
ALTER TABLE public.series_fiscais ADD COLUMN IF NOT EXISTS proximo_numero INTEGER DEFAULT 1;

-- 4. Set unique constraint on series (SAFELY)
-- First check if data is duplicated
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM public.series_fiscais 
        GROUP BY empresa_id, tipo, ano, serie 
        HAVING count(*) > 1
    ) THEN
        RAISE NOTICE 'Duplicate series found. Please clean manually or run a cleanup script.';
    ELSE
        ALTER TABLE public.series_fiscais DROP CONSTRAINT IF EXISTS series_fiscais_unique;
        CREATE UNIQUE INDEX IF NOT EXISTS series_fiscais_unique ON public.series_fiscais (empresa_id, tipo, ano, serie);
    END IF;
END $$;
