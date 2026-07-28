-- ============================================================================
-- SCRIPT MESTRE DEFINITIVO: RECURSOS HUMANOS (SaaS MULTI-TENANT COM RLS & ISOLAMENTO)
-- SISTEMA AGT REPUBLICA DE ANGOLA
-- ============================================================================

-- 0. Garantir existência de função auxiliar get_auth_empresa_id()
CREATE OR REPLACE FUNCTION public.get_auth_empresa_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT empresa_id 
        FROM public.perfis 
        WHERE id = auth.uid() 
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ----------------------------------------------------------------------------
-- 1. TABELA MESTRE DE COLABORADORES (colaboradores)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.colaboradores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    
    -- Dados Identificativos e Pessoais
    name TEXT NOT NULL,
    role TEXT,
    profession_id UUID REFERENCES public.professions(id) ON DELETE SET NULL,
    salary NUMERIC(15,2) DEFAULT 0.00,
    email TEXT,
    phone TEXT,
    hired_at TEXT,
    nif TEXT,
    bi TEXT,
    image_url TEXT,
    gender TEXT,
    birth_date TEXT,
    marital_status TEXT,
    academic_level TEXT,
    department TEXT,
    contract_type TEXT,
    dependents INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active', -- active, inactive, dismissed

    -- Dados Financeiros, Bancários e Fiscais (Angola AGT & INSS)
    iban TEXT,
    bank_name TEXT,
    bank_account TEXT,
    inss_number TEXT,
    inss_number_antigo TEXT,
    subject_to_irt BOOLEAN DEFAULT TRUE,
    subject_to_inss BOOLEAN DEFAULT TRUE,
    grupo_irt TEXT DEFAULT 'Grupo A',
    reparticao_fiscal TEXT,

    -- Endereço / Morada
    address TEXT,
    casa_no TEXT,
    rua TEXT,
    zona TEXT,
    bairro TEXT,
    provincia_morada TEXT,
    municipio_morada TEXT,
    codigo_postal TEXT DEFAULT '0000-00',
    pais TEXT DEFAULT 'AO',

    -- Carga Horária Semanal
    seg_hours TEXT DEFAULT '8',
    ter_hours TEXT DEFAULT '8',
    qua_hours TEXT DEFAULT '8',
    qui_hours TEXT DEFAULT '8',
    sex_hours TEXT DEFAULT '8',
    sab_hours TEXT DEFAULT '4',
    dom_hours TEXT DEFAULT '0',

    -- Admissão e Outros Registos
    complemento_salarial NUMERIC(15,2) DEFAULT 0.00,
    local_trabalho_id TEXT,
    solicitante_admissao TEXT,
    motivo_admissao TEXT,
    provincia_trabalho TEXT,
    municipio_trabalho TEXT,
    agente_no TEXT,
    document_type TEXT,
    entidade_emissora TEXT,
    data_emissao_doc TEXT,
    data_validade_doc TEXT,
    naturalidade TEXT,
    provincia_nascimento TEXT,
    nacionalidade TEXT DEFAULT 'Angolana',
    nome_pai TEXT,
    nome_mae TEXT,

    -- Demissão / Rescisão
    dismissed_at TEXT,
    dismissal_reason TEXT,
    dismissal_ordered_by TEXT,
    dismissal_observations TEXT,

    -- Auditoria
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS iso_colaboradores ON public.colaboradores;
CREATE POLICY iso_colaboradores ON public.colaboradores
FOR ALL TO authenticated
USING (empresa_id = public.get_auth_empresa_id())
WITH CHECK (empresa_id = public.get_auth_empresa_id());

CREATE INDEX IF NOT EXISTS idx_colaboradores_empresa ON public.colaboradores(empresa_id);
CREATE INDEX IF NOT EXISTS idx_colaboradores_status ON public.colaboradores(status);

-- ----------------------------------------------------------------------------
-- 2. TABELA DE ASSIDUIDADE (hr_assiduidade)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hr_assiduidade (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
    mes_referencia TEXT NOT NULL, -- Exemplo: '2026-07'
    mapa JSONB NOT NULL DEFAULT '{}'::jsonb, -- Mapeamento de dias: { '1': 'P', '2': 'FJ', '3': 'FI', ... }
    is_processed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(empresa_id, colaborador_id, mes_referencia)
);

ALTER TABLE public.hr_assiduidade ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS iso_hr_assiduidade ON public.hr_assiduidade;
CREATE POLICY iso_hr_assiduidade ON public.hr_assiduidade
FOR ALL TO authenticated
USING (empresa_id = public.get_auth_empresa_id())
WITH CHECK (empresa_id = public.get_auth_empresa_id());

CREATE INDEX IF NOT EXISTS idx_hr_assiduidade_empresa ON public.hr_assiduidade(empresa_id);
CREATE INDEX IF NOT EXISTS idx_hr_assiduidade_lookup ON public.hr_assiduidade(empresa_id, colaborador_id, mes_referencia);

-- ----------------------------------------------------------------------------
-- 3. TABELA DE PROCESSAMENTO DE SALÁRIOS (hr_processamentos)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hr_processamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
    mes_referencia TEXT NOT NULL, -- Exemplo: '2026-07'
    dados_processamento JSONB NOT NULL DEFAULT '{}'::jsonb, -- Objeto com salário base, IRT, INSS, descontos, salário líquido
    is_processed BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(empresa_id, colaborador_id, mes_referencia)
);

ALTER TABLE public.hr_processamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS iso_hr_processamentos ON public.hr_processamentos;
CREATE POLICY iso_hr_processamentos ON public.hr_processamentos
FOR ALL TO authenticated
USING (empresa_id = public.get_auth_empresa_id())
WITH CHECK (empresa_id = public.get_auth_empresa_id());

CREATE INDEX IF NOT EXISTS idx_hr_proc_empresa ON public.hr_processamentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_hr_proc_lookup ON public.hr_processamentos(empresa_id, colaborador_id, mes_referencia);

-- ----------------------------------------------------------------------------
-- 4. TABELA DE CONTRATOS DE TRABALHO (hr_contratos)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hr_contratos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
    tipo_contrato TEXT NOT NULL DEFAULT 'Determinado', -- Determinado, Indeterminado, Estágio
    data_inicio DATE NOT NULL,
    data_fim DATE,
    funcao TEXT,
    salario_base NUMERIC(15,2) DEFAULT 0.00,
    clausulas JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'Ativo',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.hr_contratos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS iso_hr_contratos ON public.hr_contratos;
CREATE POLICY iso_hr_contratos ON public.hr_contratos
FOR ALL TO authenticated
USING (empresa_id = public.get_auth_empresa_id())
WITH CHECK (empresa_id = public.get_auth_empresa_id());

CREATE INDEX IF NOT EXISTS idx_hr_contratos_empresa ON public.hr_contratos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_hr_contratos_colaborador ON public.hr_contratos(colaborador_id);

-- ----------------------------------------------------------------------------
-- 5. TABELA DE ORDENS DE PAGAMENTO / TRANSFERÊNCIA (hr_pagamentos)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hr_pagamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    mes_referencia TEXT NOT NULL,
    banco_origem TEXT,
    iban_origem TEXT,
    total_processado NUMERIC(15,2) DEFAULT 0.00,
    total_colaboradores INTEGER DEFAULT 0,
    status TEXT DEFAULT 'EMITIDO', -- DRAFT, EMITIDO, CONFIRMADO, CANCELADO
    detalhes JSONB DEFAULT '{}'::jsonb, -- Lista com colaboradores, IBANs e Salários Líquidos
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.hr_pagamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS iso_hr_pagamentos ON public.hr_pagamentos;
CREATE POLICY iso_hr_pagamentos ON public.hr_pagamentos
FOR ALL TO authenticated
USING (empresa_id = public.get_auth_empresa_id())
WITH CHECK (empresa_id = public.get_auth_empresa_id());

CREATE INDEX IF NOT EXISTS idx_hr_pagamentos_empresa ON public.hr_pagamentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_hr_pagamentos_mes ON public.hr_pagamentos(empresa_id, mes_referencia);

-- ----------------------------------------------------------------------------
-- 6. TABELA DE ESTRUTURA ORGANIZACIONAL (hr_estrutura)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hr_estrutura (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL, -- 'departamento', 'cargo', 'nivel_academico'
    nome TEXT NOT NULL,
    descricao TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.hr_estrutura ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS iso_hr_estrutura ON public.hr_estrutura;
CREATE POLICY iso_hr_estrutura ON public.hr_estrutura
FOR ALL TO authenticated
USING (empresa_id = public.get_auth_empresa_id())
WITH CHECK (empresa_id = public.get_auth_empresa_id());

CREATE INDEX IF NOT EXISTS idx_hr_estrutura_empresa ON public.hr_estrutura(empresa_id);

-- ----------------------------------------------------------------------------
-- 7. NOTIFICAR RECARREGAMENTO DO SCHEMA NO POSTGREST
-- ----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
