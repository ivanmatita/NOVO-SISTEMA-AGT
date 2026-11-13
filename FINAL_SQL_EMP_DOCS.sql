-- SQL para criar tabela de documentos da empresa com segurança RLS isolada
-- Executar no seu editor SQL do Supabase

CREATE TABLE IF NOT EXISTS public.empresa_documentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    nome_documento TEXT NOT NULL,
    tipo_documento TEXT NOT NULL,
    data_validade DATE,
    media_id UUID REFERENCES public.media_arquivos(id) ON DELETE SET NULL,
    descricao TEXT,
    metadados JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.empresa_documentos ENABLE ROW LEVEL SECURITY;

-- Excluir políticas antigas caso já existam
DROP POLICY IF EXISTS "Acesso isolado por empresa" ON public.empresa_documentos;

-- Política RLS: Isolamento baseado no perfil do utilizador (mais robusta contra JWT ausentes)
CREATE POLICY "Acesso isolado por empresa" 
ON public.empresa_documentos
FOR ALL 
TO authenticated
USING (
    empresa_id IN (
        SELECT company_id 
        FROM public.perfis 
        WHERE id = auth.uid()
    )
)
WITH CHECK (
    empresa_id IN (
        SELECT company_id 
        FROM public.perfis 
        WHERE id = auth.uid()
    )
);

-- Índices principais para performance
CREATE INDEX IF NOT EXISTS idx_empresa_documentos_empresa ON public.empresa_documentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_empresa_documentos_media ON public.empresa_documentos(media_id);

-- Notificar PostgREST
NOTIFY pgrst, 'reload schema';
