import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim().replace(/\/rest\/v1\/?$/, '');
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

if (!serviceKey) {
  console.error("SUPABASE_SERVICE_ROLE_KEY is missing from environment variables.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

const sqlScript = `
-- =====================================================
-- TABELA DOCUMENTOS EMPRESA
-- =====================================================
CREATE TABLE IF NOT EXISTS public.documentos_empresa (
    id BIGSERIAL PRIMARY KEY,
    empresa_id UUID NOT NULL,
    titulo_documento TEXT NOT NULL,
    descricao TEXT,
    data_emissao DATE,
    prioridade TEXT DEFAULT 'normal',
    observacoes TEXT,
    arquivo_id BIGINT,
    arquivo_url TEXT,
    nome_arquivo TEXT,
    tipo_arquivo TEXT,
    tamanho_arquivo BIGINT,
    criado_por UUID,
    updated_by UUID,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index documentos_empresa
CREATE INDEX IF NOT EXISTS idx_documentos_empresa_empresa
ON public.documentos_empresa(empresa_id);

-- Ativar RLS documentos_empresa
ALTER TABLE public.documentos_empresa ENABLE ROW LEVEL SECURITY;

-- Limpar políticas antigas se existirem
DROP POLICY IF EXISTS documentos_empresa_select ON public.documentos_empresa;
DROP POLICY IF EXISTS documentos_empresa_insert ON public.documentos_empresa;
DROP POLICY IF EXISTS documentos_empresa_update ON public.documentos_empresa;
DROP POLICY IF EXISTS documentos_empresa_delete ON public.documentos_empresa;

-- Políticas de RLS com get_auth_empresa_id() para evitar loops/recursão e garantir isolamento
CREATE POLICY documentos_empresa_select ON public.documentos_empresa
FOR SELECT USING (
    empresa_id = public.get_auth_empresa_id()
    OR auth.role() = 'service_role'
);

CREATE POLICY documentos_empresa_insert ON public.documentos_empresa
FOR INSERT WITH CHECK (
    empresa_id = public.get_auth_empresa_id()
    OR auth.role() = 'service_role'
);

CREATE POLICY documentos_empresa_update ON public.documentos_empresa
FOR UPDATE USING (
    empresa_id = public.get_auth_empresa_id()
    OR auth.role() = 'service_role'
);

CREATE POLICY documentos_empresa_delete ON public.documentos_empresa
FOR DELETE USING (
    empresa_id = public.get_auth_empresa_id()
    OR auth.role() = 'service_role'
);

-- Trigger de actualização automática do updated_at
CREATE OR REPLACE FUNCTION public.update_documentos_empresa_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_documentos_empresa_updated_at ON public.documentos_empresa;
CREATE TRIGGER trg_update_documentos_empresa_updated_at
BEFORE UPDATE ON public.documentos_empresa
FOR EACH ROW
EXECUTE FUNCTION public.update_documentos_empresa_updated_at();

-- =====================================================
-- STORAGE BUCKET E POLÍTICAS SECRETA-DOCUMENTOS
-- =====================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('empresa-documentos', 'empresa-documentos', true)
ON CONFLICT (id) DO NOTHING;

-- Limpar políticas antigas de storage
DROP POLICY IF EXISTS empresa_documentos_storage_select ON storage.objects;
DROP POLICY IF EXISTS empresa_documentos_storage_insert ON storage.objects;
DROP POLICY IF EXISTS empresa_documentos_storage_update ON storage.objects;
DROP POLICY IF EXISTS empresa_documentos_storage_delete ON storage.objects;

-- Criar novas políticas de storage
CREATE POLICY empresa_documentos_storage_select ON storage.objects
FOR SELECT USING (bucket_id = 'empresa-documentos');

CREATE POLICY empresa_documentos_storage_insert ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'empresa-documentos'
    AND auth.role() = 'authenticated'
);

CREATE POLICY empresa_documentos_storage_update ON storage.objects
FOR UPDATE USING (
    bucket_id = 'empresa-documentos'
    AND auth.role() = 'authenticated'
);

CREATE POLICY empresa_documentos_storage_delete ON storage.objects
FOR DELETE USING (
    bucket_id = 'empresa-documentos'
    AND auth.role() = 'authenticated'
);

-- =====================================================
-- TABELA MEDIA ARQUIVOS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.media_arquivos (
    id BIGSERIAL PRIMARY KEY,
    empresa_id UUID NOT NULL,
    nome_arquivo TEXT,
    url_arquivo TEXT,
    tipo_arquivo TEXT,
    tamanho_arquivo BIGINT,
    bucket TEXT DEFAULT 'empresa-documentos',
    criado_por UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index media
CREATE INDEX IF NOT EXISTS idx_media_arquivos_empresa ON public.media_arquivos(empresa_id);

-- RLS media
ALTER TABLE public.media_arquivos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS media_arquivos_select ON public.media_arquivos;
DROP POLICY IF EXISTS media_arquivos_insert ON public.media_arquivos;
DROP POLICY IF EXISTS media_arquivos_update ON public.media_arquivos;
DROP POLICY IF EXISTS media_arquivos_delete ON public.media_arquivos;

CREATE POLICY media_arquivos_select ON public.media_arquivos
FOR SELECT USING (
    empresa_id = public.get_auth_empresa_id()
    OR auth.role() = 'service_role'
);

CREATE POLICY media_arquivos_insert ON public.media_arquivos
FOR INSERT WITH CHECK (
    empresa_id = public.get_auth_empresa_id()
    OR auth.role() = 'service_role'
);

CREATE POLICY media_arquivos_update ON public.media_arquivos
FOR UPDATE USING (
    empresa_id = public.get_auth_empresa_id()
    OR auth.role() = 'service_role'
);

CREATE POLICY media_arquivos_delete ON public.media_arquivos
FOR DELETE USING (
    empresa_id = public.get_auth_empresa_id()
    OR auth.role() = 'service_role'
);
`;

async function run() {
  console.log("Running migration script in database...");
  const { data, error } = await supabase.rpc('query_exec', { query: sqlScript });
  
  if (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } else {
    console.log("Migration executed successfully!");
    console.log("DB Response:", data);
  }
}

run();
