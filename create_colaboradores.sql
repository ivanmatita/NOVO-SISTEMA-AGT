-- ========================================================
-- SCRIPT ÚNICO PARA CRIAR A TABELA 'colaboradores'
-- E CONFIGURAR O ISOLAMENTO DE DADOS POR EMPRESA (MULTITENANT SaaS)
-- ========================================================

-- 1. CRIAR A TABELA DE RECURSOS HUMANOS: colaboradores (se não existir)
CREATE TABLE IF NOT EXISTS public.colaboradores (
    -- Chave Primária UUID autogerada
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Controle de isolamento multitenant de empresas (SaaS)
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE, 

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

    -- Dados da Morada do Funcionário
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

-- 2. HABILITAR ROW LEVEL SECURITY (RLS) PARA A TABELA
ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;

-- 3. REMOVER POLÍTICAS DE ACESSO EXISTENTES PARA EVITAR DUPLICIDADES OU CONFLITOS
DROP POLICY IF EXISTS colaboradores_isolation_policy ON public.colaboradores;

-- 4. CRIAR POLÍTICA DE ISOLAMENTO INQUEBRÁVEL POR TIPO DE EMPRESA (SaaS)
-- Usando a função inteligente public.get_auth_empresa_id() nativa do sistema
CREATE POLICY colaboradores_isolation_policy
ON public.colaboradores
FOR ALL
TO authenticated
USING (
  empresa_id = public.get_auth_empresa_id()
)
WITH CHECK (
  empresa_id = public.get_auth_empresa_id()
);

-- 5. CRIAR ÍNDICES DE PERFORMANCE DE ISOLAMENTO MULTI-TENANT
CREATE INDEX IF NOT EXISTS idx_colaboradores_empresa_id ON public.colaboradores(empresa_id);
CREATE INDEX IF NOT EXISTS idx_colaboradores_company_id ON public.colaboradores(company_id);

-- 6. RECARREGAR CONFIGURAÇÃO DA API DO SUPABASE (POSTGREST SCHEMA RELOAD)
NOTIFY pgrst, 'reload schema';
