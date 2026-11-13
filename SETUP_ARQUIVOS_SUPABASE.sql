-- SQL para criar a tabela de arquivos e o bucket de storage
-- Criado em: 2026-05-19
-- Versão 1.5 - Melhoria nas políticas de RLS e Bucket

BEGIN;

-- 1. Criar a tabela 'arquivos' se não existir
CREATE TABLE IF NOT EXISTS public.arquivos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id uuid NOT NULL,
    nome_documento text NOT NULL,
    descricao text,
    categoria text,
    data_registro timestamptz DEFAULT now(),
    arquivo_url text NOT NULL,
    arquivo_path text NOT NULL, -- Caminho interno no bucket (ex: empresa_id/documentos/file.pdf)
    arquivo_nome text,          -- Nome original do arquivo
    arquivo_tipo text,
    arquivo_tamanho text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_arquivos_empresa_id ON public.arquivos(empresa_id);

-- 2. Habilitar RLS na tabela
ALTER TABLE public.arquivos ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de RLS para a tabela 'arquivos'
DROP POLICY IF EXISTS "SAAS_TENANT_ISOLATION_arquivos" ON public.arquivos;
DROP POLICY IF EXISTS "SAAS_TENANT_ISOLATION_arquivos_SELECT" ON public.arquivos;
DROP POLICY IF EXISTS "SAAS_TENANT_ISOLATION_arquivos_INSERT" ON public.arquivos;
DROP POLICY IF EXISTS "SAAS_TENANT_ISOLATION_arquivos_UPDATE" ON public.arquivos;
DROP POLICY IF EXISTS "SAAS_TENANT_ISOLATION_arquivos_DELETE" ON public.arquivos;

-- SELECT
CREATE POLICY "SAAS_TENANT_ISOLATION_arquivos_SELECT" ON public.arquivos
FOR SELECT TO authenticated
USING (empresa_id = COALESCE((auth.jwt() -> 'user_metadata' ->> 'empresa_id')::uuid, (SELECT empresa_id FROM public.perfis WHERE id = auth.uid())));

-- INSERT
CREATE POLICY "SAAS_TENANT_ISOLATION_arquivos_INSERT" ON public.arquivos
FOR INSERT TO authenticated
WITH CHECK (empresa_id = COALESCE((auth.jwt() -> 'user_metadata' ->> 'empresa_id')::uuid, (SELECT empresa_id FROM public.perfis WHERE id = auth.uid())));

-- UPDATE
CREATE POLICY "SAAS_TENANT_ISOLATION_arquivos_UPDATE" ON public.arquivos
FOR UPDATE TO authenticated
USING (empresa_id = COALESCE((auth.jwt() -> 'user_metadata' ->> 'empresa_id')::uuid, (SELECT empresa_id FROM public.perfis WHERE id = auth.uid())))
WITH CHECK (empresa_id = COALESCE((auth.jwt() -> 'user_metadata' ->> 'empresa_id')::uuid, (SELECT empresa_id FROM public.perfis WHERE id = auth.uid())));

-- DELETE
CREATE POLICY "SAAS_TENANT_ISOLATION_arquivos_DELETE" ON public.arquivos
FOR DELETE TO authenticated
USING (empresa_id = COALESCE((auth.jwt() -> 'user_metadata' ->> 'empresa_id')::uuid, (SELECT empresa_id FROM public.perfis WHERE id = auth.uid())));

-- 4. Criação e Configuração do Bucket
-- Tentamos inserir o bucket se ele não existir
INSERT INTO storage.buckets (id, name, public) 
VALUES ('arquivos-empresas', 'arquivos-empresas', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 5. Políticas de RLS para o Bucket (storage.objects)
DROP POLICY IF EXISTS "Storage - Multi-empresa" ON storage.objects;
DROP POLICY IF EXISTS "Storage - Multi-empresa-SELECT" ON storage.objects;
DROP POLICY IF EXISTS "Storage - Multi-empresa-INSERT" ON storage.objects;
DROP POLICY IF EXISTS "Storage - Multi-empresa-UPDATE" ON storage.objects;
DROP POLICY IF EXISTS "Storage - Multi-empresa-DELETE" ON storage.objects;

-- SELECT
CREATE POLICY "Storage - Multi-empresa-SELECT" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'arquivos-empresas' AND (storage.foldername(name))[1] = COALESCE((auth.jwt() -> 'user_metadata' ->> 'empresa_id'), (SELECT empresa_id::text FROM public.perfis WHERE id = auth.uid())));

-- INSERT
CREATE POLICY "Storage - Multi-empresa-INSERT" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'arquivos-empresas' AND (storage.foldername(name))[1] = COALESCE((auth.jwt() -> 'user_metadata' ->> 'empresa_id'), (SELECT empresa_id::text FROM public.perfis WHERE id = auth.uid())));

-- UPDATE
CREATE POLICY "Storage - Multi-empresa-UPDATE" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'arquivos-empresas' AND (storage.foldername(name))[1] = COALESCE((auth.jwt() -> 'user_metadata' ->> 'empresa_id'), (SELECT empresa_id::text FROM public.perfis WHERE id = auth.uid())));

-- DELETE
CREATE POLICY "Storage - Multi-empresa-DELETE" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'arquivos-empresas' AND (storage.foldername(name))[1] = COALESCE((auth.jwt() -> 'user_metadata' ->> 'empresa_id'), (SELECT empresa_id::text FROM public.perfis WHERE id = auth.uid())));

-- Nota: Se o comando acima falhar por erro de sintaxe no COALESCE do WITH CHECK, 
-- certifique-se de que o auth.jwt() está sendo acessado corretamente.

COMMIT;
