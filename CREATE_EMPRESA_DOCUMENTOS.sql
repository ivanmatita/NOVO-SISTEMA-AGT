-- Tabela: empresa_documentos
-- Armazena metadados de documentos da empresa associados à tabela media_arquivos
-- Garante isolamento multi-tenant (empresa_id)

CREATE TABLE IF NOT EXISTS public.empresa_documentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL, -- Tenant de isolamento
    nome_documento TEXT NOT NULL,
    tipo_documento TEXT NOT NULL, -- Contrato, Identificação, Alvará, etc.
    data_validade DATE,
    media_id UUID REFERENCES public.media_arquivos(id) ON DELETE SET NULL, -- Referência à tabela de arquivos
    descricao TEXT,
    metadados JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ativar Row Level Security (RLS)
ALTER TABLE public.empresa_documentos ENABLE ROW LEVEL SECURITY;

-- Excluir políticas existentes se for re-correr o script
DROP POLICY IF EXISTS "Acesso isolado por empresa" ON public.empresa_documentos;

-- Política de RLS: Isolamento por empresa baseada no claim JWT 'empresa_id'
CREATE POLICY "Acesso isolado por empresa" 
ON public.empresa_documentos
FOR ALL TO authenticated
USING (empresa_id::text = (current_setting('request.jwt.claims', true)::jsonb->>'empresa_id'))
WITH CHECK (empresa_id::text = (current_setting('request.jwt.claims', true)::jsonb->>'empresa_id'));

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_empresa_documentos_empresa ON public.empresa_documentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_empresa_documentos_media ON public.empresa_documentos(media_id);

-- Notificar PostgREST
NOTIFY pgrst, 'reload schema';
