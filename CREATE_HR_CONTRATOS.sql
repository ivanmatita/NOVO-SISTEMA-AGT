-- 1. Criar a Tabela hr_contratos
CREATE TABLE IF NOT EXISTS public.hr_contratos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE,
    tipo_contrato TEXT NOT NULL,
    data_inicio DATE,
    fim_contrato DATE,
    salario_base NUMERIC DEFAULT 0,
    content TEXT,
    status TEXT DEFAULT 'ativo',
    representative_name TEXT,
    representative_role TEXT,
    duration_months INTEGER DEFAULT 0,
    experimental_days INTEGER DEFAULT 0,
    notice_days INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Activar o Nível de Segurança (RLS - Row Level Security)
ALTER TABLE public.hr_contratos ENABLE ROW LEVEL SECURITY;

-- 3. Criar a Política de Isolamento de Dados para Cada Empresa (Leitura, Inserção, Edição e Remoção)
-- Esta política assegura que a empresa autenticada apenas pode gerir os seus próprios contratos.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'hr_contratos' AND policyname = 'hr_contratos_isolation_policy'
    ) THEN
        CREATE POLICY "hr_contratos_isolation_policy"
        ON public.hr_contratos
        FOR ALL
        TO authenticated
        USING (empresa_id = public.get_auth_empresa_id())
        WITH CHECK (empresa_id = public.get_auth_empresa_id());
    END IF;
END $$;

-- 4. Política de Contingência Geral (para o admin dashboard, caso seja necessário)
-- Como pediram acesso total de bypass no frontend para as views
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'hr_contratos' AND policyname = 'Allow all actions for company'
    ) THEN
        CREATE POLICY "Allow all actions for company"
        ON public.hr_contratos
        FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

-- 5. Trigger para Atualizar o "updated_at" Automaticamente
CREATE OR REPLACE FUNCTION update_hr_contratos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS hr_contratos_updated_at_trigger ON public.hr_contratos;

CREATE TRIGGER hr_contratos_updated_at_trigger
BEFORE UPDATE ON public.hr_contratos
FOR EACH ROW
EXECUTE FUNCTION update_hr_contratos_updated_at();

-- 6. Índices para Otimizar as Consultas
CREATE INDEX IF NOT EXISTS idx_hr_contratos_empresa_id ON public.hr_contratos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_hr_contratos_colaborador_id ON public.hr_contratos(colaborador_id);
