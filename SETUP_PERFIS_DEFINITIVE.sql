-- 1. Criação da estrutura caso não exista
CREATE TABLE IF NOT EXISTS public.perfis (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id),
    permission_areas TEXT[] DEFAULT '{}',
    level TEXT DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Garantir RLS (Segurança)
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

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
