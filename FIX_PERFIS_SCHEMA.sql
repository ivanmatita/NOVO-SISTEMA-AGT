-- 1. Ensure columns exist safely
DO $$
BEGIN
    -- Ensure perfis table exists first
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='perfis') THEN
        CREATE TABLE public.perfis (
            id UUID REFERENCES auth.users(id) PRIMARY KEY,
            empresa_id UUID NOT NULL, -- Will link later or assume FK constraint added elsewhere
            permission_areas TEXT[] DEFAULT '{}',
            level TEXT DEFAULT 'user',
            is_active BOOLEAN DEFAULT true,
            updated_at TIMESTAMPTZ DEFAULT now()
        );
    END IF;

    -- Add columns conditionally
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='perfis' AND column_name='permission_areas') THEN
        ALTER TABLE public.perfis ADD COLUMN permission_areas TEXT[] DEFAULT '{}';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='perfis' AND column_name='level') THEN
        ALTER TABLE public.perfis ADD COLUMN level TEXT DEFAULT 'user';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='perfis' AND column_name='is_active') THEN
        ALTER TABLE public.perfis ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- 2. Garantir RLS (Segurança)
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

-- ... (The rest of the policy/trigger setup is already fine, just keeping it idempotent)

-- 3. Limpar políticas obsoletas para criar as novas
DROP POLICY IF EXISTS "perfis_select_policy" ON public.perfis;
DROP POLICY IF EXISTS "perfis_update_policy" ON public.perfis;

-- 4. Nova Política: Usuários só veem e editam seu perfil (ou Admins da Empresa)
CREATE POLICY "perfis_select_policy" ON public.perfis
    FOR SELECT USING (
        auth.uid() = id OR 
        empresa_id IN (SELECT empresa_id FROM public.perfis WHERE id = auth.uid() AND level = 'admin')
    );

CREATE POLICY "perfis_update_policy" ON public.perfis
    FOR UPDATE USING (
        auth.uid() = id OR 
        empresa_id IN (SELECT empresa_id FROM public.perfis WHERE id = auth.uid() AND level = 'admin')
    );

-- 5. Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.handle_perfis_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_perfis_updated_at ON public.perfis;
CREATE TRIGGER tr_perfis_updated_at BEFORE UPDATE ON public.perfis FOR EACH ROW EXECUTE FUNCTION public.handle_perfis_updated_at();
