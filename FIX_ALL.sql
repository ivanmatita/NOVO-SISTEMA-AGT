-- 1. ADICIONAR COLUNA E CONSTRAINTS PARA EVITAR SPAM/DUPLICAÇÕES
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'empresas_email_key') THEN
        ALTER TABLE public.empresas ADD CONSTRAINT empresas_email_key UNIQUE (email);
    END IF;
END $$;
-- Garantir coluna auth_user_id (caso tabela já exista, mas sem a coluna)
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);

-- Migrar dados antigos: assumir que id = auth_user_id se for um UUID do auth.users (quando não foi preenchido)
UPDATE public.empresas 
SET auth_user_id = id 
WHERE auth_user_id IS NULL AND id IN (SELECT id FROM auth.users);

-- 2. POLÍTICAS DE ACESSO REVERIFICADAS (CORRIGE ERRO DE SELECT APÓS INSERT)
-- Permitir que o proprietário original (auth_user_id) faça SELECT na sua própria empresa,
-- mesmo antes de ter um perfil criado.
DROP POLICY IF EXISTS "Empresas Isolation" ON public.empresas;
CREATE POLICY "Empresas Isolation" ON public.empresas
    FOR SELECT 
    USING (id = public.get_auth_empresa_id() OR auth_user_id = auth.uid());

-- Permitir update também pelo proprietário original
DROP POLICY IF EXISTS "Empresas Update Isolation" ON public.empresas;
CREATE POLICY "Empresas Update Isolation" ON public.empresas
    FOR UPDATE
    USING (id = public.get_auth_empresa_id() OR auth_user_id = auth.uid())
    WITH CHECK (id = public.get_auth_empresa_id() OR auth_user_id = auth.uid());

-- Atualizar política de INSERT para impedir spams ou criações não associadas a um UID
DROP POLICY IF EXISTS "Allow Registration Insert" ON public.empresas;
CREATE POLICY "Allow Registration Insert" ON public.empresas
    FOR INSERT
    TO authenticated
    WITH CHECK (auth_user_id = auth.uid());

-- Permitir que o próprio utilizador faça SELECT/UPDATE no seu perfil
DROP POLICY IF EXISTS "Perfis Isolation" ON public.perfis;
CREATE POLICY "Perfis Isolation" ON public.perfis
    FOR ALL
    USING (empresa_id = public.get_auth_empresa_id() OR id = auth.uid());


-- 3. CRIAR BUCKETS DE STORAGE SE NÃO EXISTIREM (LOGOS E ANEXOS)
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Logos Public Access" ON storage.objects;
CREATE POLICY "Logos Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'logos');

DROP POLICY IF EXISTS "Allow Uploads to Logos" ON storage.objects;
CREATE POLICY "Allow Uploads to Logos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'logos');

DROP POLICY IF EXISTS "Allow Updates to Logos" ON storage.objects;
CREATE POLICY "Allow Updates to Logos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'logos') WITH CHECK (bucket_id = 'logos');

INSERT INTO storage.buckets (id, name, public)
VALUES ('anexos', 'anexos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anexos Public Access" ON storage.objects;
CREATE POLICY "Anexos Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'anexos');

DROP POLICY IF EXISTS "Allow Uploads to Anexos" ON storage.objects;
CREATE POLICY "Allow Uploads to Anexos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'anexos');

DROP POLICY IF EXISTS "Allow Updates to Anexos" ON storage.objects;
CREATE POLICY "Allow Updates to Anexos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'anexos') WITH CHECK (bucket_id = 'anexos');
