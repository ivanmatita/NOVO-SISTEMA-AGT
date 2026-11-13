-- =========================================================================
-- SCRIPT ÚNICO: ARMAZÉNS E MEDIA (ISOLAMENTO DE DADOS, SEM PERDER DADOS)
-- =========================================================================

-- 1. ADICIONAR COLUNAS FALTANTES NA TABELA EXISTENTE DE ARMAZÉNS (Evita o erro 'contacto não encontrado')
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='armazens' AND column_name='contacto') THEN
        ALTER TABLE public.armazens ADD COLUMN contacto TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='armazens' AND column_name='observacao') THEN
        ALTER TABLE public.armazens ADD COLUMN observacao TEXT;
    END IF;
END $$;

-- 2. GARANTIR A EXISTÊNCIA E ISOLAMENTO MULTI-TENANT DA TABELA DE ARMAZÉNS
ALTER TABLE public.armazens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SAAS_TENANT_ISOLATION_armazens" ON public.armazens;
CREATE POLICY "SAAS_TENANT_ISOLATION_armazens"
ON public.armazens
FOR ALL TO authenticated
USING (empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = auth.uid()))
WITH CHECK (empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_armazens_empresa_id ON public.armazens(empresa_id);


-- 3. GARANTIR A EXISTÊNCIA E ISOLAMENTO DA TABELA DE MEDIA (usada também para a barra lateral/avatar)
CREATE TABLE IF NOT EXISTS public.media_arquivos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    utilizador_id UUID,
    tipo TEXT NOT NULL,
    nome_arquivo TEXT NOT NULL,
    nome_original TEXT,
    bucket TEXT,
    caminho_arquivo TEXT,
    url_publica TEXT,
    mime_type TEXT,
    tamanho_bytes BIGINT,
    extensao TEXT,
    entidade TEXT,
    entidade_id TEXT,
    observacao TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar Políticas RLS na tabela de media
ALTER TABLE public.media_arquivos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SAAS_TENANT_ISOLATION_media_arquivos" ON public.media_arquivos;
CREATE POLICY "SAAS_TENANT_ISOLATION_media_arquivos"
ON public.media_arquivos
FOR ALL TO authenticated
USING (empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = auth.uid()))
WITH CHECK (empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_media_empresa_id ON public.media_arquivos(empresa_id);

-- 4. ATIVAR REALTIME PARA AS DUAS TABELAS (Evita que os dados não apareçam de imediato na UI)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE tablename = 'armazens') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.armazens;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE tablename = 'media_arquivos') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.media_arquivos;
  END IF;
END $$;

-- Atualizar o cache de schema da API Rest
NOTIFY pgrst, 'reload schema';
