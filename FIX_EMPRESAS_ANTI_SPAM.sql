-- Adicionar constraints para evitar duplicação de emails
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'empresas_email_key') THEN
        ALTER TABLE public.empresas ADD CONSTRAINT empresas_email_key UNIQUE (email);
    END IF;
END $$;

-- Adicionar Auth User ID caso não exista e torná-lo obrigatório
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);

-- Atualizar política de INSERT para impedir spams ou criações não associadas a um UID
DROP POLICY IF EXISTS "Allow Registration Insert" ON public.empresas;
CREATE POLICY "Allow Registration Insert" ON public.empresas
    FOR INSERT
    TO authenticated
    WITH CHECK (auth_user_id = auth.uid());
