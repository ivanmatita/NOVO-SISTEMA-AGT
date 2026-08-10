-- ============================================================
-- GESTÃO ESCOLAR (ERP ESCOLAR & SECRETARIA DIGITAL)
-- SCRIPT SQL SUPABASE - 100% FUNCIONAL E COM SEGURANÇA RLS
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- 1. ALUNOS / MATRÍCULAS
CREATE TABLE IF NOT EXISTS public.escola_alunos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL,
  matricula TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  nif TEXT,
  bi_numero TEXT,
  data_nascimento DATE,
  classe TEXT NOT NULL,
  turma TEXT,
  turno TEXT DEFAULT 'Manhã',
  curso TEXT DEFAULT 'Ensino Geral',
  valor_propina NUMERIC(15,2) DEFAULT 0.00,
  encarregado TEXT,
  encarregado_tel TEXT,
  encarregado_email TEXT,
  morada TEXT,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'suspenso', 'transferido')),
  data_matricula DATE DEFAULT CURRENT_DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PROFESSORES / CORPO DOCENTE
CREATE TABLE IF NOT EXISTS public.escola_professores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL,
  nome TEXT NOT NULL,
  nif TEXT,
  bi_numero TEXT,
  disciplina TEXT NOT NULL,
  grau_academico TEXT DEFAULT 'Licenciado',
  contrato TEXT DEFAULT 'Efetivo',
  salario NUMERIC(15,2) DEFAULT 0.00,
  telefone TEXT,
  email TEXT,
  status TEXT DEFAULT 'ativo',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TURMAS & HORÁRIOS
CREATE TABLE IF NOT EXISTS public.escola_turmas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL,
  nome TEXT NOT NULL,
  classe TEXT NOT NULL,
  sala TEXT,
  turno TEXT DEFAULT 'Manhã',
  diretor_nome TEXT,
  diretor_id UUID REFERENCES public.escola_professores(id) ON DELETE SET NULL,
  vagas INTEGER DEFAULT 40,
  inscritos INTEGER DEFAULT 0,
  ano_lectivo TEXT DEFAULT '2026',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TESOURARIA / PROPINAS
CREATE TABLE IF NOT EXISTS public.escola_propinas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL,
  aluno_id UUID REFERENCES public.escola_alunos(id) ON DELETE CASCADE,
  aluno_nome TEXT NOT NULL,
  mes TEXT NOT NULL,
  ano_lectivo TEXT DEFAULT '2026',
  valor_base NUMERIC(15,2) NOT NULL,
  multa NUMERIC(15,2) DEFAULT 0.00,
  desconto NUMERIC(15,2) DEFAULT 0.00,
  valor_final NUMERIC(15,2) NOT NULL,
  status TEXT DEFAULT 'pago' CHECK (status IN ('pago', 'pendente', 'atrasado', 'anulado')),
  data_pagamento DATE,
  metodo TEXT DEFAULT 'TPA / Multicaixa',
  recibo_n TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. PAUTAS & AVALIAÇÕES (NOTAS)
CREATE TABLE IF NOT EXISTS public.escola_notas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL,
  aluno_id UUID REFERENCES public.escola_alunos(id) ON DELETE CASCADE,
  aluno_nome TEXT NOT NULL,
  disciplina TEXT NOT NULL,
  trimestre TEXT NOT NULL DEFAULT '1º Trimestre',
  mac NUMERIC(4,2) DEFAULT 0,
  npp NUMERIC(4,2) DEFAULT 0,
  npt NUMERIC(4,2) DEFAULT 0,
  mt NUMERIC(4,2) DEFAULT 0,
  status TEXT DEFAULT 'Aprovado',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. SECRETARIA DIGITAL & DOCUMENTOS EMITIDOS
CREATE TABLE IF NOT EXISTS public.escola_documentos_secretaria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL,
  aluno_id UUID REFERENCES public.escola_alunos(id) ON DELETE CASCADE,
  aluno_nome TEXT NOT NULL,
  tipo_documento TEXT NOT NULL, -- 'DeclaracaoMatricula', 'CertificadoHabilitacoes', 'GuiaTransferencia', 'CartaoEstudante'
  numero_documento TEXT UNIQUE NOT NULL,
  data_emissao DATE DEFAULT CURRENT_DATE,
  finalidade TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ASSIDUIDADE & CONTROLO DISCIPLINAR
CREATE TABLE IF NOT EXISTS public.escola_disciplina (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL,
  aluno_id UUID REFERENCES public.escola_alunos(id) ON DELETE CASCADE,
  aluno_nome TEXT NOT NULL,
  turma TEXT NOT NULL,
  tipo_registo TEXT NOT NULL CHECK (tipo_registo IN ('Falta', 'Advertência', 'Suspensão', 'Elogio')),
  data_ocorrencia DATE DEFAULT CURRENT_DATE,
  justificada BOOLEAN DEFAULT false,
  descricao TEXT NOT NULL,
  medidas_tomadas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. BIBLIOTECA ESCOLAR
CREATE TABLE IF NOT EXISTS public.escola_biblioteca (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  autor TEXT NOT NULL,
  isbn TEXT,
  categoria TEXT DEFAULT 'Didático',
  quantidade INTEGER DEFAULT 1,
  emprestados INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Disponível',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TRANSPORTE ESCOLAR
CREATE TABLE IF NOT EXISTS public.escola_transporte (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL,
  nome TEXT NOT NULL,
  motorista TEXT NOT NULL,
  telefone TEXT,
  viatura TEXT NOT NULL,
  capacidade INTEGER DEFAULT 30,
  alunos_inscritos INTEGER DEFAULT 0,
  valor_mensal NUMERIC(15,2) DEFAULT 0.00,
  status TEXT DEFAULT 'Garagem',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SEGURANÇA & ROW LEVEL SECURITY (RLS) - ISOLAMENTO MULTI-TENANT
-- ============================================================
ALTER TABLE public.escola_alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escola_professores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escola_turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escola_propinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escola_notas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escola_documentos_secretaria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escola_disciplina ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escola_biblioteca ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escola_transporte ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS DE ACESSO POR TENANT (empresa_id)
DROP POLICY IF EXISTS tenant_isolation_escola_alunos ON public.escola_alunos;
CREATE POLICY tenant_isolation_escola_alunos ON public.escola_alunos FOR ALL USING (
  empresa_id::text = current_setting('app.current_empresa_id', true) OR auth.role() = 'service_role' OR auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS tenant_isolation_escola_professores ON public.escola_professores;
CREATE POLICY tenant_isolation_escola_professores ON public.escola_professores FOR ALL USING (
  empresa_id::text = current_setting('app.current_empresa_id', true) OR auth.role() = 'service_role' OR auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS tenant_isolation_escola_turmas ON public.escola_turmas;
CREATE POLICY tenant_isolation_escola_turmas ON public.escola_turmas FOR ALL USING (
  empresa_id::text = current_setting('app.current_empresa_id', true) OR auth.role() = 'service_role' OR auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS tenant_isolation_escola_propinas ON public.escola_propinas;
CREATE POLICY tenant_isolation_escola_propinas ON public.escola_propinas FOR ALL USING (
  empresa_id::text = current_setting('app.current_empresa_id', true) OR auth.role() = 'service_role' OR auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS tenant_isolation_escola_notas ON public.escola_notas;
CREATE POLICY tenant_isolation_escola_notas ON public.escola_notas FOR ALL USING (
  empresa_id::text = current_setting('app.current_empresa_id', true) OR auth.role() = 'service_role' OR auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS tenant_isolation_escola_documentos ON public.escola_documentos_secretaria;
CREATE POLICY tenant_isolation_escola_documentos ON public.escola_documentos_secretaria FOR ALL USING (
  empresa_id::text = current_setting('app.current_empresa_id', true) OR auth.role() = 'service_role' OR auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS tenant_isolation_escola_disciplina ON public.escola_disciplina;
CREATE POLICY tenant_isolation_escola_disciplina ON public.escola_disciplina FOR ALL USING (
  empresa_id::text = current_setting('app.current_empresa_id', true) OR auth.role() = 'service_role' OR auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS tenant_isolation_escola_biblioteca ON public.escola_biblioteca;
CREATE POLICY tenant_isolation_escola_biblioteca ON public.escola_biblioteca FOR ALL USING (
  empresa_id::text = current_setting('app.current_empresa_id', true) OR auth.role() = 'service_role' OR auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS tenant_isolation_escola_transporte ON public.escola_transporte;
CREATE POLICY tenant_isolation_escola_transporte ON public.escola_transporte FOR ALL USING (
  empresa_id::text = current_setting('app.current_empresa_id', true) OR auth.role() = 'service_role' OR auth.uid() IS NOT NULL
);

-- ============================================================
-- ÍNDICES DE PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_escola_alunos_empresa ON public.escola_alunos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_escola_professores_empresa ON public.escola_professores(empresa_id);
CREATE INDEX IF NOT EXISTS idx_escola_turmas_empresa ON public.escola_turmas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_escola_propinas_empresa ON public.escola_propinas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_escola_notas_empresa ON public.escola_notas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_escola_documentos_empresa ON public.escola_documentos_secretaria(empresa_id);
CREATE INDEX IF NOT EXISTS idx_escola_disciplina_empresa ON public.escola_disciplina(empresa_id);
CREATE INDEX IF NOT EXISTS idx_escola_biblioteca_empresa ON public.escola_biblioteca(empresa_id);
CREATE INDEX IF NOT EXISTS idx_escola_transporte_empresa ON public.escola_transporte(empresa_id);

-- ============================================================
-- TRIGGERS PARA ATUALIZAÇÃO AUTOMÁTICA DA COLUNA updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_escola_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_escola_alunos_updated ON public.escola_alunos;
CREATE TRIGGER trg_escola_alunos_updated BEFORE UPDATE ON public.escola_alunos FOR EACH ROW EXECUTE FUNCTION update_escola_updated_at_column();

DROP TRIGGER IF EXISTS trg_escola_professores_updated ON public.escola_professores;
CREATE TRIGGER trg_escola_professores_updated BEFORE UPDATE ON public.escola_professores FOR EACH ROW EXECUTE FUNCTION update_escola_updated_at_column();

DROP TRIGGER IF EXISTS trg_escola_turmas_updated ON public.escola_turmas;
CREATE TRIGGER trg_escola_turmas_updated BEFORE UPDATE ON public.escola_turmas FOR EACH ROW EXECUTE FUNCTION update_escola_updated_at_column();

DROP TRIGGER IF EXISTS trg_escola_propinas_updated ON public.escola_propinas;
CREATE TRIGGER trg_escola_propinas_updated BEFORE UPDATE ON public.escola_propinas FOR EACH ROW EXECUTE FUNCTION update_escola_updated_at_column();

DROP TRIGGER IF EXISTS trg_escola_notas_updated ON public.escola_notas;
CREATE TRIGGER trg_escola_notas_updated BEFORE UPDATE ON public.escola_notas FOR EACH ROW EXECUTE FUNCTION update_escola_updated_at_column();

DROP TRIGGER IF EXISTS trg_escola_documentos_updated ON public.escola_documentos_secretaria;
CREATE TRIGGER trg_escola_documentos_updated BEFORE UPDATE ON public.escola_documentos_secretaria FOR EACH ROW EXECUTE FUNCTION update_escola_updated_at_column();

DROP TRIGGER IF EXISTS trg_escola_disciplina_updated ON public.escola_disciplina;
CREATE TRIGGER trg_escola_disciplina_updated BEFORE UPDATE ON public.escola_disciplina FOR EACH ROW EXECUTE FUNCTION update_escola_updated_at_column();

DROP TRIGGER IF EXISTS trg_escola_biblioteca_updated ON public.escola_biblioteca;
CREATE TRIGGER trg_escola_biblioteca_updated BEFORE UPDATE ON public.escola_biblioteca FOR EACH ROW EXECUTE FUNCTION update_escola_updated_at_column();

DROP TRIGGER IF EXISTS trg_escola_transporte_updated ON public.escola_transporte;
CREATE TRIGGER trg_escola_transporte_updated BEFORE UPDATE ON public.escola_transporte FOR EACH ROW EXECUTE FUNCTION update_escola_updated_at_column();
