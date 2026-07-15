-- 1. Criar a Tabela hr_assiduidade
CREATE TABLE IF NOT EXISTS public.hr_assiduidade (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
    mes_referencia TEXT NOT NULL,
    mapa JSONB DEFAULT '{}'::jsonb,
    is_processed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(colaborador_id, mes_referencia)
);

-- 2. Activar o Nível de Segurança (RLS - Row Level Security)
ALTER TABLE public.hr_assiduidade ENABLE ROW LEVEL SECURITY;

-- 3. Criar a Política de Isolamento de Dados para Cada Empresa (Leitura, Inserção, Edição e Remoção)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'hr_assiduidade' AND policyname = 'hr_assiduidade_isolation_policy'
    ) THEN
        CREATE POLICY "hr_assiduidade_isolation_policy"
        ON public.hr_assiduidade
        FOR ALL
        TO authenticated
        USING (empresa_id = public.get_auth_empresa_id())
        WITH CHECK (empresa_id = public.get_auth_empresa_id());
    END IF;
END $$;

-- 4. Política de Contingência Geral (para o admin dashboard ou UI fallback)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'hr_assiduidade' AND policyname = 'Allow all actions for company'
    ) THEN
        CREATE POLICY "Allow all actions for company"
        ON public.hr_assiduidade
        FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

-- 5. Trigger para Atualizar o "updated_at" Automaticamente
CREATE OR REPLACE FUNCTION update_hr_assiduidade_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS hr_assiduidade_updated_at_trigger ON public.hr_assiduidade;

CREATE TRIGGER hr_assiduidade_updated_at_trigger
BEFORE UPDATE ON public.hr_assiduidade
FOR EACH ROW
EXECUTE FUNCTION update_hr_assiduidade_updated_at();

-- 6. Índices para Otimizar as Consultas
CREATE INDEX IF NOT EXISTS idx_hr_assiduidade_empresa_id ON public.hr_assiduidade(empresa_id);
CREATE INDEX IF NOT EXISTS idx_hr_assiduidade_colaborador_id ON public.hr_assiduidade(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_hr_assiduidade_mes_referencia ON public.hr_assiduidade(mes_referencia);
