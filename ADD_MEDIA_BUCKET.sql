-- Criar o bucket "media" se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Criar a política de leitura pública para o bucket media
DROP POLICY IF EXISTS "Media Public Access" ON storage.objects;
CREATE POLICY "Media Public Access" ON storage.objects
FOR SELECT
USING (bucket_id = 'media');

-- Criar política para permitir uploads em media (apenas utilizadores autenticados)
DROP POLICY IF EXISTS "Allow Uploads to Media" ON storage.objects;
CREATE POLICY "Allow Uploads to Media" ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'media');

-- Criar política para permitir updates em media
DROP POLICY IF EXISTS "Allow Updates to Media" ON storage.objects;
CREATE POLICY "Allow Updates to Media" ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'media')
WITH CHECK (bucket_id = 'media');
