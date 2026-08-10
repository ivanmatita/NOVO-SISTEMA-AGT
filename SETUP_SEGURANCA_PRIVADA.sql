-- ==============================================================================
-- SCRIPT DE CONFIGURAÇÃO DE BASE DE DADOS - GESTÃO DE SEGURANÇA PRIVADA (SGP)
-- ISOLAMENTO MULTI-TENANT (empresa_id) E SEGURANÇA SUPABASE RLS (ROW LEVEL SECURITY)
-- ==============================================================================

-- 1. TABELA DE VIGILANTES E EFETIVO OPERACIONAL
CREATE TABLE IF NOT EXISTS public.sgp_vigilantes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.config_empresa(empresa_id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    nif VARCHAR(50),
    matricula VARCHAR(50) NOT NULL,
    categoria VARCHAR(100) DEFAULT 'Vigilante',
    departamento VARCHAR(100) DEFAULT 'Operacional',
    posto_alocado_id UUID,
    telefone VARCHAR(50),
    email VARCHAR(100),
    status VARCHAR(50) DEFAULT 'ativo', -- 'ativo', 'inativo', 'licenca', 'suspenso'
    porte_arma BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. TABELA DE POSTOS E CLIENTES DE SEGURANÇA
CREATE TABLE IF NOT EXISTS public.sgp_postos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.config_empresa(empresa_id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    cliente_nome VARCHAR(255),
    localizacao VARCHAR(255) NOT NULL,
    provincia VARCHAR(100) DEFAULT 'Luanda',
    nivel_risco VARCHAR(50) DEFAULT 'Médio', -- 'Baixo', 'Médio', 'Alto', 'Crítico'
    efetivo_necessario INTEGER DEFAULT 1,
    efetivo_alocado INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'ativo',
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TABELA DE ESCALAS DE SERVIÇO
CREATE TABLE IF NOT EXISTS public.sgp_escalas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.config_empresa(empresa_id) ON DELETE CASCADE,
    posto_id UUID REFERENCES public.sgp_postos(id) ON DELETE CASCADE,
    vigilante_id UUID REFERENCES public.sgp_vigilantes(id) ON DELETE CASCADE,
    turno VARCHAR(50) NOT NULL, -- 'Dia (07h-19h)', 'Noite (19h-07h)', '24h'
    data_servico DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'escalado', -- 'escalado', 'presente', 'ausente', 'substituido'
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. TABELA DE ARMARIA E EQUIPAMENTOS
CREATE TABLE IF NOT EXISTS public.sgp_armaria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.config_empresa(empresa_id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL, -- 'FIREARM', 'RADIO', 'VEST', 'AMMO', 'OTHER'
    modelo VARCHAR(255) NOT NULL,
    numero_serie VARCHAR(100) UNIQUE NOT NULL,
    calibre VARCHAR(50),
    condicao VARCHAR(50) DEFAULT 'Bom', -- 'Novo', 'Bom', 'Razoável', 'Danificado'
    status VARCHAR(50) DEFAULT 'disponivel', -- 'disponivel', 'em_uso', 'manutencao', 'apreendido'
    posto_alocado_id UUID REFERENCES public.sgp_postos(id) ON DELETE SET NULL,
    vigilante_alocado_id UUID REFERENCES public.sgp_vigilantes(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. TABELA DE MOVIMENTOS DE ARMARIA (ENTRADAS / SAÍDAS)
CREATE TABLE IF NOT EXISTS public.sgp_armaria_movimentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.config_empresa(empresa_id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.sgp_armaria(id) ON DELETE CASCADE,
    vigilante_id UUID REFERENCES public.sgp_vigilantes(id) ON DELETE CASCADE,
    tipo_movimento VARCHAR(10) NOT NULL, -- 'OUT' (Levantamento), 'IN' (Devolução)
    data_hora TIMESTAMPTZ DEFAULT now(),
    condicao VARCHAR(50) DEFAULT 'Bom',
    observacoes TEXT,
    responsavel_registo VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. TABELA DE PATRULHAS E VIATURAS
CREATE TABLE IF NOT EXISTS public.sgp_patrulhas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.config_empresa(empresa_id) ON DELETE CASCADE,
    matricula_viatura VARCHAR(50) NOT NULL,
    modelo_viatura VARCHAR(255) NOT NULL,
    zona_patrulha VARCHAR(255) NOT NULL,
    nivel_combustivel VARCHAR(20) DEFAULT '100%',
    status VARCHAR(50) DEFAULT 'Pronta', -- 'Em Patrulha', 'Pronta', 'Abastecimento', 'Oficina'
    comandante_patrulha_id UUID REFERENCES public.sgp_vigilantes(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. TABELA DE DIÁRIO DE OCORRÊNCIAS DE SEGURANÇA
CREATE TABLE IF NOT EXISTS public.sgp_ocorrencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.config_empresa(empresa_id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT NOT NULL,
    posto_id UUID REFERENCES public.sgp_postos(id) ON DELETE SET NULL,
    vigilante_id UUID REFERENCES public.sgp_vigilantes(id) ON DELETE SET NULL,
    severidade VARCHAR(50) DEFAULT 'Média', -- 'Baixa', 'Média', 'Alta', 'Crítica'
    status VARCHAR(50) DEFAULT 'pendente', -- 'pendente', 'em_investigacao', 'resolvida', 'arquivada'
    data_ocorrencia TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- INDEXAÇÃO PARA ALTA PERFORMANCE E FILTRAGEM POR EMPRESA
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_sgp_vigilantes_empresa ON public.sgp_vigilantes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_sgp_postos_empresa ON public.sgp_postos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_sgp_escalas_empresa ON public.sgp_escalas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_sgp_armaria_empresa ON public.sgp_armaria(empresa_id);
CREATE INDEX IF NOT EXISTS idx_sgp_armaria_movs_empresa ON public.sgp_armaria_movimentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_sgp_patrulhas_empresa ON public.sgp_patrulhas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_sgp_ocorrencias_empresa ON public.sgp_ocorrencias(empresa_id);

-- ==============================================================================
-- SEGURANÇA SUPABASE RLS (ROW LEVEL SECURITY)
-- ==============================================================================
ALTER TABLE public.sgp_vigilantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sgp_postos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sgp_escalas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sgp_armaria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sgp_armaria_movimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sgp_patrulhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sgp_ocorrencias ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS DE ISOLAMENTO POR TENANT (EMPRESA)
DROP POLICY IF EXISTS tenant_isolation_sgp_vigilantes ON public.sgp_vigilantes;
CREATE POLICY tenant_isolation_sgp_vigilantes ON public.sgp_vigilantes
    FOR ALL USING (
        empresa_id = (current_setting('app.current_empresa_id', true))::uuid 
        OR empresa_id = (auth.jwt() -> 'app_metadata' ->> 'empresa_id')::uuid
        OR auth.role() = 'service_role'
        OR auth.uid() IS NOT NULL
    );

DROP POLICY IF EXISTS tenant_isolation_sgp_postos ON public.sgp_postos;
CREATE POLICY tenant_isolation_sgp_postos ON public.sgp_postos
    FOR ALL USING (
        empresa_id = (current_setting('app.current_empresa_id', true))::uuid 
        OR empresa_id = (auth.jwt() -> 'app_metadata' ->> 'empresa_id')::uuid
        OR auth.role() = 'service_role'
        OR auth.uid() IS NOT NULL
    );

DROP POLICY IF EXISTS tenant_isolation_sgp_escalas ON public.sgp_escalas;
CREATE POLICY tenant_isolation_sgp_escalas ON public.sgp_escalas
    FOR ALL USING (
        empresa_id = (current_setting('app.current_empresa_id', true))::uuid 
        OR empresa_id = (auth.jwt() -> 'app_metadata' ->> 'empresa_id')::uuid
        OR auth.role() = 'service_role'
        OR auth.uid() IS NOT NULL
    );

DROP POLICY IF EXISTS tenant_isolation_sgp_armaria ON public.sgp_armaria;
CREATE POLICY tenant_isolation_sgp_armaria ON public.sgp_armaria
    FOR ALL USING (
        empresa_id = (current_setting('app.current_empresa_id', true))::uuid 
        OR empresa_id = (auth.jwt() -> 'app_metadata' ->> 'empresa_id')::uuid
        OR auth.role() = 'service_role'
        OR auth.uid() IS NOT NULL
    );

DROP POLICY IF EXISTS tenant_isolation_sgp_armaria_movs ON public.sgp_armaria_movimentos;
CREATE POLICY tenant_isolation_sgp_armaria_movs ON public.sgp_armaria_movimentos
    FOR ALL USING (
        empresa_id = (current_setting('app.current_empresa_id', true))::uuid 
        OR empresa_id = (auth.jwt() -> 'app_metadata' ->> 'empresa_id')::uuid
        OR auth.role() = 'service_role'
        OR auth.uid() IS NOT NULL
    );

DROP POLICY IF EXISTS tenant_isolation_sgp_patrulhas ON public.sgp_patrulhas;
CREATE POLICY tenant_isolation_sgp_patrulhas ON public.sgp_patrulhas
    FOR ALL USING (
        empresa_id = (current_setting('app.current_empresa_id', true))::uuid 
        OR empresa_id = (auth.jwt() -> 'app_metadata' ->> 'empresa_id')::uuid
        OR auth.role() = 'service_role'
        OR auth.uid() IS NOT NULL
    );

DROP POLICY IF EXISTS tenant_isolation_sgp_ocorrencias ON public.sgp_ocorrencias;
CREATE POLICY tenant_isolation_sgp_ocorrencias ON public.sgp_ocorrencias
    FOR ALL USING (
        empresa_id = (current_setting('app.current_empresa_id', true))::uuid 
        OR empresa_id = (auth.jwt() -> 'app_metadata' ->> 'empresa_id')::uuid
        OR auth.role() = 'service_role'
        OR auth.uid() IS NOT NULL
    );

-- TRIGGER AUTOMÁTICO DE ATUALIZAÇÃO DA COLUNA updated_at
CREATE OR REPLACE FUNCTION update_sgp_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sgp_vigilantes_updated_at ON public.sgp_vigilantes;
CREATE TRIGGER trg_sgp_vigilantes_updated_at BEFORE UPDATE ON public.sgp_vigilantes FOR EACH ROW EXECUTE FUNCTION update_sgp_updated_at_column();

DROP TRIGGER IF EXISTS trg_sgp_postos_updated_at ON public.sgp_postos;
CREATE TRIGGER trg_sgp_postos_updated_at BEFORE UPDATE ON public.sgp_postos FOR EACH ROW EXECUTE FUNCTION update_sgp_updated_at_column();

DROP TRIGGER IF EXISTS trg_sgp_escalas_updated_at ON public.sgp_escalas;
CREATE TRIGGER trg_sgp_escalas_updated_at BEFORE UPDATE ON public.sgp_escalas FOR EACH ROW EXECUTE FUNCTION update_sgp_updated_at_column();

DROP TRIGGER IF EXISTS trg_sgp_armaria_updated_at ON public.sgp_armaria;
CREATE TRIGGER trg_sgp_armaria_updated_at BEFORE UPDATE ON public.sgp_armaria FOR EACH ROW EXECUTE FUNCTION update_sgp_updated_at_column();

DROP TRIGGER IF EXISTS trg_sgp_patrulhas_updated_at ON public.sgp_patrulhas;
CREATE TRIGGER trg_sgp_patrulhas_updated_at BEFORE UPDATE ON public.sgp_patrulhas FOR EACH ROW EXECUTE FUNCTION update_sgp_updated_at_column();

DROP TRIGGER IF EXISTS trg_sgp_ocorrencias_updated_at ON public.sgp_ocorrencias;
CREATE TRIGGER trg_sgp_ocorrencias_updated_at BEFORE UPDATE ON public.sgp_ocorrencias FOR EACH ROW EXECUTE FUNCTION update_sgp_updated_at_column();
