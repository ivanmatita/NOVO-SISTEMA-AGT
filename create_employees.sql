-- ========================================================
-- SCRIPT ÚNICO PARA CRIAR A TABELA EMPLOYEES (COLABORADORES)
-- E CONFIGURAR O ISOLAMENTO DE DADOS CATA-EMPRESA (MULTITENANT SaaS)
-- Execute este script no SQL Editor do seu Supabase Dashboard
-- ========================================================

-- 1. CRIAR A TABELA DE RECURSOS HUMANOS: employees (se não existir)
CREATE TABLE IF NOT EXISTS public.employees (
    -- Chave Primária UUID autogerada
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Controle de isolamento multitenant de empresas (SaaS)
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE, -- Alinhamento de colunas legado/inglês

    -- Informações Principais do Colaborador
    name TEXT NOT NULL,
    role TEXT,
    profession_id UUID REFERENCES public.professions(id) ON DELETE SET NULL,
    salary NUMERIC DEFAULT 0,
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
    status TEXT DEFAULT 'active', -- ACTIVE, INACTIVE, DISMISSED

    -- Informações Financeiras e Fiscais
    iban TEXT,
    bank_name TEXT,
    bank_account TEXT,
    inss_number TEXT,
    inss_number_antigo TEXT,
    subject_to_irt BOOLEAN DEFAULT TRUE,
    subject_to_inss BOOLEAN DEFAULT TRUE,
    grupo_irt TEXT,
    reparticao_fiscal TEXT,

    -- Dados da Morada no Funcionário
    address TEXT,
    casa_no TEXT,
    rua TEXT,
    zona TEXT,
    bairro TEXT,
    provincia_morada TEXT,
    municipio_morada TEXT,
    codigo_postal TEXT DEFAULT '0000-00',
    pais TEXT DEFAULT 'AO',

    -- Indicação de Carga Semanal em Horas
    seg_hours TEXT DEFAULT '8',
    ter_hours TEXT DEFAULT '8',
    qua_hours TEXT DEFAULT '8',
    qui_hours TEXT DEFAULT '8',
    sex_hours TEXT DEFAULT '8',
    sab_hours TEXT DEFAULT '4',
    dom_hours TEXT DEFAULT '0',

    -- Admissão e Outros Registros
    complemento_salarial NUMERIC DEFAULT 0,
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
    nacionalidade TEXT,
    nome_pai TEXT,
    nome_mae TEXT,

    -- Demissão (se aplicável)
    dismissed_at TEXT,
    dismissal_reason TEXT,
    dismissal_ordered_by TEXT,
    dismissal_observations TEXT,

    -- Controle de auditoria de registros
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. CRIAR TABELA ALTERNATIVA FUNCIONARIOS (Para dupla compatibilidade se necessário)
CREATE TABLE IF NOT EXISTS public.funcionarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT,
    profession_id UUID,
    salary NUMERIC DEFAULT 0,
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
    status TEXT DEFAULT 'active',
    iban TEXT,
    bank_name TEXT,
    bank_account TEXT,
    inss_number TEXT,
    inss_number_antigo TEXT,
    subject_to_irt BOOLEAN DEFAULT TRUE,
    subject_to_inss BOOLEAN DEFAULT TRUE,
    grupo_irt TEXT,
    reparticao_fiscal TEXT,
    address TEXT,
    casa_no TEXT,
    rua TEXT,
    zona TEXT,
    bairro TEXT,
    provincia_morada TEXT,
    municipio_morada TEXT,
    codigo_postal TEXT DEFAULT '0000-00',
    pais TEXT DEFAULT 'AO',
    seg_hours TEXT DEFAULT '8',
    ter_hours TEXT DEFAULT '8',
    qua_hours TEXT DEFAULT '8',
    qui_hours TEXT DEFAULT '8',
    sex_hours TEXT DEFAULT '8',
    sab_hours TEXT DEFAULT '4',
    dom_hours TEXT DEFAULT '0',
    complemento_salarial NUMERIC DEFAULT 0,
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
    nacionalidade TEXT,
    nome_pai TEXT,
    nome_mae TEXT,
    dismissed_at TEXT,
    dismissal_reason TEXT,
    dismissal_ordered_by TEXT,
    dismissal_observations TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. HABILITAR ROW LEVEL SECURITY (RLS) PARA AMBAS AS TABELAS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;

-- 4. REMOVER POLÍTICAS DE ACESSO EXISTENTES PARA EVITAR DUPLICIDADES OU CONFLITOS
DROP POLICY IF EXISTS employees_isolation ON public.employees;
DROP POLICY IF EXISTS employees_isolation_policy ON public.employees;
DROP POLICY IF EXISTS funcionarios_isolation ON public.funcionarios;
DROP POLICY IF EXISTS funcionarios_isolation_policy ON public.funcionarios;

-- 5. CRIAR POLÍTICA DE ISOLAMENTO INQUEBRÁVEL POR TIPO DE EMPRESA (SaaS)
-- Usando a função inteligente public.get_auth_empresa_id() nativa do sistema
CREATE POLICY employees_isolation_policy
ON public.employees
FOR ALL
TO authenticated
USING (
  empresa_id = public.get_auth_empresa_id()
)
WITH CHECK (
  empresa_id = public.get_auth_empresa_id()
);

CREATE POLICY funcionarios_isolation_policy
ON public.funcionarios
FOR ALL
TO authenticated
USING (
  empresa_id = public.get_auth_empresa_id()
)
WITH CHECK (
  empresa_id = public.get_auth_empresa_id()
);

-- 6. CRIAR ÍNDICES DE PERFORMANCE DE ISOLAMENTO MULTI-TENANT
CREATE INDEX IF NOT EXISTS idx_employees_empresa_id ON public.employees(empresa_id);
CREATE INDEX IF NOT EXISTS idx_employees_company_id ON public.employees(company_id);
CREATE INDEX IF NOT EXISTS idx_funcionarios_empresa_id ON public.funcionarios(empresa_id);

-- 7. RECARREGAR CONFIGURAÇÃO DA API DO SUPABASE (POSTGREST SCHEMA RELOAD)
NOTIFY pgrst, 'reload schema';

-- Pronto! Suas tabelas de colaboradores estão perfeitamente criadas, seguras e isoladas.
