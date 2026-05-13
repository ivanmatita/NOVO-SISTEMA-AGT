-- Criar o bucket "logos" se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Criar a política de leitura pública para o bucket logos
DROP POLICY IF EXISTS "Logos Public Access" ON storage.objects;
CREATE POLICY "Logos Public Access" ON storage.objects
FOR SELECT
USING (bucket_id = 'logos');

-- Criar política para permitir uploads (apenas utilizadores autenticados)
DROP POLICY IF EXISTS "Allow Uploads to Logos" ON storage.objects;
CREATE POLICY "Allow Uploads to Logos" ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'logos');

-- Criar política para permitir updates
DROP POLICY IF EXISTS "Allow Updates to Logos" ON storage.objects;
CREATE POLICY "Allow Updates to Logos" ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'logos')
WITH CHECK (bucket_id = 'logos');

-- Criar o bucket "anexos" se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('anexos', 'anexos', true)
ON CONFLICT (id) DO NOTHING;

-- Criar a política de leitura pública para o bucket anexos
DROP POLICY IF EXISTS "Anexos Public Access" ON storage.objects;
CREATE POLICY "Anexos Public Access" ON storage.objects
FOR SELECT
USING (bucket_id = 'anexos');

-- Criar política para permitir uploads em anexos
DROP POLICY IF EXISTS "Allow Uploads to Anexos" ON storage.objects;
CREATE POLICY "Allow Uploads to Anexos" ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'anexos');

-- Criar política para permitir updates em anexos
DROP POLICY IF EXISTS "Allow Updates to Anexos" ON storage.objects;
CREATE POLICY "Allow Updates to Anexos" ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'anexos')
WITH CHECK (bucket_id = 'anexos');
