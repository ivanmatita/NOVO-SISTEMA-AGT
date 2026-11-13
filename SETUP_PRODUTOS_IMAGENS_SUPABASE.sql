-- SQL para criar a tabela de produtos e configurar armazenamento de imagens
-- Criado em: 2026-05-19

BEGIN;

-- 1. Criar a tabela 'produtos' se não existir
CREATE TABLE IF NOT EXISTS public.produtos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id uuid NOT NULL,
    name text NOT NULL,
    referente text,
    barcode text,
    category text,
    tipologia text,
    unit text DEFAULT 'un',
    price numeric DEFAULT 0,
    cost_price numeric DEFAULT 0,
    stock_quantity numeric DEFAULT 0,
    min_stock numeric DEFAULT 0,
    warehouse_id integer,
    image_url text,           -- URL pública da imagem
    image_path text,          -- Caminho interno no bucket (para deleção: {empresa_id}/produtos/{filename})
    data_registo timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_produtos_empresa_id ON public.produtos(empresa_id);

-- 2. Habilitar RLS
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de RLS para a tabela 'produtos'
DROP POLICY IF EXISTS "PRODUTOS_SELECT" ON public.produtos;
DROP POLICY IF EXISTS "PRODUTOS_INSERT" ON public.produtos;
DROP POLICY IF EXISTS "PRODUTOS_UPDATE" ON public.produtos;
DROP POLICY IF EXISTS "PRODUTOS_DELETE" ON public.produtos;

CREATE POLICY "PRODUTOS_SELECT" ON public.produtos FOR SELECT TO authenticated
USING (empresa_id = COALESCE((auth.jwt() -> 'user_metadata' ->> 'empresa_id')::uuid, (SELECT empresa_id FROM public.perfis WHERE id = auth.uid())));

CREATE POLICY "PRODUTOS_INSERT" ON public.produtos FOR INSERT TO authenticated
WITH CHECK (empresa_id = COALESCE((auth.jwt() -> 'user_metadata' ->> 'empresa_id')::uuid, (SELECT empresa_id FROM public.perfis WHERE id = auth.uid())));

CREATE POLICY "PRODUTOS_UPDATE" ON public.produtos FOR UPDATE TO authenticated
USING (empresa_id = COALESCE((auth.jwt() -> 'user_metadata' ->> 'empresa_id')::uuid, (SELECT empresa_id FROM public.perfis WHERE id = auth.uid())))
WITH CHECK (empresa_id = COALESCE((auth.jwt() -> 'user_metadata' ->> 'empresa_id')::uuid, (SELECT empresa_id FROM public.perfis WHERE id = auth.uid())));

CREATE POLICY "PRODUTOS_DELETE" ON public.produtos FOR DELETE TO authenticated
USING (empresa_id = COALESCE((auth.jwt() -> 'user_metadata' ->> 'empresa_id')::uuid, (SELECT empresa_id FROM public.perfis WHERE id = auth.uid())));

-- 4. Criação do Bucket para Imagens de Produtos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('produtos-imagens', 'produtos-imagens', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 5. Políticas de RLS para o Bucket (storage.objects)
DROP POLICY IF EXISTS "Storage - Produtos Imagens" ON storage.objects;

CREATE POLICY "Storage - Produtos Imagens"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'produtos-imagens' AND 
  (storage.foldername(name))[1] = COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'empresa_id'),
    (SELECT empresa_id::text FROM public.perfis WHERE id = auth.uid())
  )
)
WITH CHECK (
  bucket_id = 'produtos-imagens' AND 
  (storage.foldername(name))[1] = COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'empresa_id'),
    (SELECT empresa_id::text FROM public.perfis WHERE id = auth.uid())
  )
);

COMMIT;
