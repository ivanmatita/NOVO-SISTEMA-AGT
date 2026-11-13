-- 🚨 STORAGE / MEDIA SaaS MULTIEMPRESA PRODUCTION READY
-- Objetivo:
-- ✅ guardar imagens
-- ✅ guardar documentos
-- ✅ guardar uploads do sistema
-- ✅ guardar imagem da barra lateral/menu
-- ✅ isolamento por empresa
-- ✅ integração frontend + Supabase
-- ✅ realtime ready
-- ✅ sem apagar funcionalidades existentes

-- =====================================================
-- 1. TABELA PRINCIPAL DE ARQUIVOS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.media_arquivos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    empresa_id UUID NOT NULL,

    utilizador_id UUID,

    tipo TEXT NOT NULL CHECK (
        tipo IN (
            'imagem',
            'documento',
            'menu_logo',
            'sidebar_image',
            'avatar',
            'comprovativo',
            'anexo',
            'fatura',
            'contrato',
            'outros'
        )
    ),

    nome_arquivo TEXT NOT NULL,

    nome_original TEXT,

    bucket TEXT NOT NULL DEFAULT 'media',

    caminho_arquivo TEXT NOT NULL,

    url_publica TEXT,

    mime_type TEXT,

    tamanho_bytes BIGINT DEFAULT 0,

    extensao TEXT,

    entidade TEXT,

    entidade_id UUID,

    observacao TEXT,

    ativo BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. HABILITAR RLS
-- =====================================================

ALTER TABLE public.media_arquivos
ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. REMOVER POLICY ANTIGA
-- =====================================================

DROP POLICY IF EXISTS "SAAS_TENANT_ISOLATION_media_arquivos"
ON public.media_arquivos;

-- =====================================================
-- 4. POLICY MULTIEMPRESA
-- =====================================================

CREATE POLICY "SAAS_TENANT_ISOLATION_media_arquivos"
ON public.media_arquivos
FOR ALL
TO authenticated
USING (
    empresa_id = (
        SELECT empresa_id
        FROM public.perfis
        WHERE id = auth.uid()
    )
)
WITH CHECK (
    empresa_id = (
        SELECT empresa_id
        FROM public.perfis
        WHERE id = auth.uid()
    )
);

-- =====================================================
-- 5. ÍNDICES PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_media_empresa_id
ON public.media_arquivos(empresa_id);

CREATE INDEX IF NOT EXISTS idx_media_tipo
ON public.media_arquivos(tipo);

CREATE INDEX IF NOT EXISTS idx_media_entidade
ON public.media_arquivos(entidade);

CREATE INDEX IF NOT EXISTS idx_media_created_at
ON public.media_arquivos(created_at);

CREATE INDEX IF NOT EXISTS idx_media_entidade_id
ON public.media_arquivos(entidade_id);

-- =====================================================
-- 6. UPDATED_AT TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_media_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_media_updated_at
ON public.media_arquivos;

CREATE TRIGGER tr_media_updated_at
BEFORE UPDATE
ON public.media_arquivos
FOR EACH ROW
EXECUTE PROCEDURE public.update_media_updated_at();

-- =====================================================
-- 7. REALTIME
-- =====================================================

DO $$
BEGIN

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE tablename = 'media_arquivos'
  ) THEN

    ALTER PUBLICATION supabase_realtime
    ADD TABLE public.media_arquivos;

  END IF;

END $$;

-- =====================================================
-- 8. STORAGE BUCKET
-- =====================================================

INSERT INTO storage.buckets (
    id,
    name,
    public
)
VALUES (
    'media',
    'media',
    true
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 9. STORAGE POLICIES
-- =====================================================

DROP POLICY IF EXISTS "MEDIA_UPLOAD_AUTH"
ON storage.objects;

DROP POLICY IF EXISTS "MEDIA_SELECT_AUTH"
ON storage.objects;

DROP POLICY IF EXISTS "MEDIA_UPDATE_AUTH"
ON storage.objects;

DROP POLICY IF EXISTS "MEDIA_DELETE_AUTH"
ON storage.objects;

-- SELECT

CREATE POLICY "MEDIA_SELECT_AUTH"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'media'
);

-- INSERT

CREATE POLICY "MEDIA_UPLOAD_AUTH"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'media'
);

-- UPDATE

CREATE POLICY "MEDIA_UPDATE_AUTH"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'media'
);

-- DELETE

CREATE POLICY "MEDIA_DELETE_AUTH"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'media'
);

-- =====================================================
-- 10. COMENTÁRIOS
-- =====================================================

COMMENT ON TABLE public.media_arquivos IS
'Sistema central de uploads SaaS multiempresa';

COMMENT ON COLUMN public.media_arquivos.tipo IS
'Tipo do arquivo: imagem, documento, menu_logo, sidebar_image, etc';

COMMENT ON COLUMN public.media_arquivos.entidade IS
'Tabela relacionada: clientes, documentos_emitidos, produtos, etc';

COMMENT ON COLUMN public.media_arquivos.entidade_id IS
'ID do registro relacionado';

-- =====================================================
-- ✅ RESULTADO FINAL
-- =====================================================
