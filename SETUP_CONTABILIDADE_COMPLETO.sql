-- =============================================================================
-- SCRIPT UNICO - CONTABILIDADE AGT SISTEMA
-- Modulos: Pagamento de Impostos | Contas Pag Impostos
--          Gestao de Diarios | Apagar Movimentos
-- Versao: 1.0.0
-- Seguranca: RLS multinivel, isolamento por empresa_id, auditoria completa
-- =============================================================================

BEGIN;

-- EXTENSOES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- FUNCAO: get_current_empresa_id()
-- Retorna o empresa_id do utilizador autenticado via JWT claims
-- =============================================================================
CREATE OR REPLACE FUNCTION get_current_empresa_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'empresa_id')::uuid,
    (auth.jwt() -> 'app_metadata'  ->> 'empresa_id')::uuid
  );
$$;

-- =============================================================================
-- FUNCAO: is_admin_or_owner()
-- Verifica se o utilizador e admin ou dono da empresa
-- =============================================================================
CREATE OR REPLACE FUNCTION is_admin_or_owner(p_empresa_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM perfis
    WHERE id = auth.uid()
      AND empresa_id = p_empresa_id
      AND role IN ('admin', 'owner', 'super_admin')
  );
$$;

-- =============================================================================
-- FUNCAO TRIGGER: set_audit_fields()
-- Preenche created_by / updated_by automaticamente
-- =============================================================================
CREATE OR REPLACE FUNCTION set_audit_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by = auth.uid();
    NEW.updated_by = auth.uid();
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.updated_by = auth.uid();
  END IF;
  RETURN NEW;
END; $$;

-- =============================================================================
-- FUNCAO TRIGGER: update_updated_at_column()
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

-- =============================================================================
-- TABELA: agt_logs — Auditoria global de todas as operacoes
-- =============================================================================
CREATE TABLE IF NOT EXISTS agt_logs (
  id               uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  empresa_id       uuid,
  tabela           text        NOT NULL,
  operacao         text        NOT NULL CHECK (operacao IN ('INSERT','UPDATE','DELETE','SELECT')),
  registro_id      text,
  dados_anteriores jsonb,
  dados_novos      jsonb,
  ip_address       text,
  created_at       timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agt_logs_empresa_id ON agt_logs(empresa_id);
CREATE INDEX IF NOT EXISTS idx_agt_logs_user_id    ON agt_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_agt_logs_tabela     ON agt_logs(tabela);
CREATE INDEX IF NOT EXISTS idx_agt_logs_created_at ON agt_logs(created_at DESC);

ALTER TABLE agt_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "agt_logs: admins podem ler logs" ON agt_logs;
CREATE POLICY "agt_logs: admins podem ler logs"
  ON agt_logs FOR SELECT
  USING (empresa_id = get_current_empresa_id() AND is_admin_or_owner(empresa_id));
DROP POLICY IF EXISTS "agt_logs: sistema pode inserir" ON agt_logs;
CREATE POLICY "agt_logs: sistema pode inserir"
  ON agt_logs FOR INSERT WITH CHECK (true);

-- =============================================================================
-- TABELA: contas_pag_impostos
-- Contas de pagamento de impostos associadas ao PGC
-- =============================================================================
CREATE TABLE IF NOT EXISTS contas_pag_impostos (
  id         uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id uuid        NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  cod        text        NOT NULL,
  descricao  text        NOT NULL,
  conta_pgc  text        NOT NULL DEFAULT '34.1',
  ativo      boolean     NOT NULL DEFAULT true,
  created_by uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (empresa_id, cod)
);
CREATE INDEX IF NOT EXISTS idx_cpi_empresa ON contas_pag_impostos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_cpi_cod     ON contas_pag_impostos(empresa_id, cod);
CREATE INDEX IF NOT EXISTS idx_cpi_ativo   ON contas_pag_impostos(empresa_id, ativo);

DROP TRIGGER IF EXISTS trg_cpi_updated_at ON contas_pag_impostos;
CREATE TRIGGER trg_cpi_updated_at BEFORE UPDATE ON contas_pag_impostos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_cpi_audit ON contas_pag_impostos;
CREATE TRIGGER trg_cpi_audit BEFORE INSERT OR UPDATE ON contas_pag_impostos
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

ALTER TABLE contas_pag_impostos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cpi: SELECT" ON contas_pag_impostos;
CREATE POLICY "cpi: SELECT" ON contas_pag_impostos FOR SELECT
  USING (empresa_id = get_current_empresa_id());
DROP POLICY IF EXISTS "cpi: INSERT" ON contas_pag_impostos;
CREATE POLICY "cpi: INSERT" ON contas_pag_impostos FOR INSERT
  WITH CHECK (empresa_id = get_current_empresa_id());
DROP POLICY IF EXISTS "cpi: UPDATE" ON contas_pag_impostos;
CREATE POLICY "cpi: UPDATE" ON contas_pag_impostos FOR UPDATE
  USING  (empresa_id = get_current_empresa_id())
  WITH CHECK (empresa_id = get_current_empresa_id());
DROP POLICY IF EXISTS "cpi: DELETE apenas admins" ON contas_pag_impostos;
CREATE POLICY "cpi: DELETE apenas admins" ON contas_pag_impostos FOR DELETE
  USING (empresa_id = get_current_empresa_id() AND is_admin_or_owner(empresa_id));

-- =============================================================================
-- TABELA: pagamentos_impostos
-- Registo de guias/comprovativos de pagamento de impostos
-- =============================================================================
CREATE TABLE IF NOT EXISTS pagamentos_impostos (
  id               uuid          PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id       uuid          NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  conta_imposto_id uuid          REFERENCES contas_pag_impostos(id) ON DELETE SET NULL,
  cod              text          NOT NULL,
  data             date          NOT NULL DEFAULT CURRENT_DATE,
  data_valor       date          NOT NULL DEFAULT CURRENT_DATE,
  descricao        text          NOT NULL,
  caixa_nome       text          NOT NULL,
  caixa_id         uuid,
  doc_suporte      text,
  moeda            text          NOT NULL DEFAULT 'AOA',
  valor            numeric(18,2) NOT NULL DEFAULT 0,
  estado           text          NOT NULL DEFAULT 'pendente'
                   CHECK (estado IN ('pendente','pago','anulado','em_processamento')),
  created_by       uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by       uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  anulado_by       uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  anulado_at       timestamptz,
  motivo_anulacao  text,
  created_at       timestamptz   NOT NULL DEFAULT NOW(),
  updated_at       timestamptz   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pi_empresa ON pagamentos_impostos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pi_data    ON pagamentos_impostos(empresa_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_pi_estado  ON pagamentos_impostos(empresa_id, estado);
CREATE INDEX IF NOT EXISTS idx_pi_cod     ON pagamentos_impostos(empresa_id, cod);
CREATE INDEX IF NOT EXISTS idx_pi_conta   ON pagamentos_impostos(conta_imposto_id);

DROP TRIGGER IF EXISTS trg_pi_updated_at ON pagamentos_impostos;
CREATE TRIGGER trg_pi_updated_at BEFORE UPDATE ON pagamentos_impostos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_pi_audit ON pagamentos_impostos;
CREATE TRIGGER trg_pi_audit BEFORE INSERT OR UPDATE ON pagamentos_impostos
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

ALTER TABLE pagamentos_impostos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pi: SELECT" ON pagamentos_impostos;
CREATE POLICY "pi: SELECT" ON pagamentos_impostos FOR SELECT
  USING (empresa_id = get_current_empresa_id());
DROP POLICY IF EXISTS "pi: INSERT" ON pagamentos_impostos;
CREATE POLICY "pi: INSERT" ON pagamentos_impostos FOR INSERT
  WITH CHECK (empresa_id = get_current_empresa_id());
DROP POLICY IF EXISTS "pi: UPDATE" ON pagamentos_impostos;
CREATE POLICY "pi: UPDATE" ON pagamentos_impostos FOR UPDATE
  USING  (empresa_id = get_current_empresa_id())
  WITH CHECK (empresa_id = get_current_empresa_id());
DROP POLICY IF EXISTS "pi: DELETE apenas admins" ON pagamentos_impostos;
CREATE POLICY "pi: DELETE apenas admins" ON pagamentos_impostos FOR DELETE
  USING (empresa_id = get_current_empresa_id() AND is_admin_or_owner(empresa_id));

-- =============================================================================
-- TABELA: diarios_contabilisticos
-- Diarios contabilisticos com tipos pre-definidos
-- =============================================================================
CREATE TABLE IF NOT EXISTS diarios_contabilisticos (
  id         uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id uuid        NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  codigo     text        NOT NULL,
  descricao  text        NOT NULL,
  tipo       text        NOT NULL DEFAULT 'Geral'
             CHECK (tipo IN ('Vendas','Compras','Caixa','Bancos','Salarios','Geral','Apuramentos')),
  is_active  boolean     NOT NULL DEFAULT true,
  created_by uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (empresa_id, codigo)
);
CREATE INDEX IF NOT EXISTS idx_dc_empresa ON diarios_contabilisticos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_dc_codigo  ON diarios_contabilisticos(empresa_id, codigo);
CREATE INDEX IF NOT EXISTS idx_dc_ativo   ON diarios_contabilisticos(empresa_id, is_active);

DROP TRIGGER IF EXISTS trg_dc_updated_at ON diarios_contabilisticos;
CREATE TRIGGER trg_dc_updated_at BEFORE UPDATE ON diarios_contabilisticos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_dc_audit ON diarios_contabilisticos;
CREATE TRIGGER trg_dc_audit BEFORE INSERT OR UPDATE ON diarios_contabilisticos
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

ALTER TABLE diarios_contabilisticos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dc: SELECT" ON diarios_contabilisticos;
CREATE POLICY "dc: SELECT" ON diarios_contabilisticos FOR SELECT
  USING (empresa_id = get_current_empresa_id());
DROP POLICY IF EXISTS "dc: INSERT" ON diarios_contabilisticos;
CREATE POLICY "dc: INSERT" ON diarios_contabilisticos FOR INSERT
  WITH CHECK (empresa_id = get_current_empresa_id());
DROP POLICY IF EXISTS "dc: UPDATE" ON diarios_contabilisticos;
CREATE POLICY "dc: UPDATE" ON diarios_contabilisticos FOR UPDATE
  USING  (empresa_id = get_current_empresa_id())
  WITH CHECK (empresa_id = get_current_empresa_id());
DROP POLICY IF EXISTS "dc: DELETE apenas admins" ON diarios_contabilisticos;
CREATE POLICY "dc: DELETE apenas admins" ON diarios_contabilisticos FOR DELETE
  USING (empresa_id = get_current_empresa_id() AND is_admin_or_owner(empresa_id));

-- =============================================================================
-- TABELA: movimentos_contabilisticos
-- Lancamentos nos diarios - base do modulo Apagar Movimentos
-- =============================================================================
CREATE TABLE IF NOT EXISTS movimentos_contabilisticos (
  id              uuid          PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id      uuid          NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  diario_id       uuid          REFERENCES diarios_contabilisticos(id) ON DELETE SET NULL,
  diario_codigo   text          NOT NULL,
  data            date          NOT NULL DEFAULT CURRENT_DATE,
  conta_debito    text,
  conta_credito   text,
  descricao       text          NOT NULL,
  valor           numeric(18,2) NOT NULL DEFAULT 0,
  referencia      text,
  doc_tipo        text,
  estado          text          NOT NULL DEFAULT 'ativo'
                  CHECK (estado IN ('ativo','anulado','apurado')),
  created_by      uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by      uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_by      uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at      timestamptz,
  motivo_exclusao text,
  created_at      timestamptz   NOT NULL DEFAULT NOW(),
  updated_at      timestamptz   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mc_empresa ON movimentos_contabilisticos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_mc_diario  ON movimentos_contabilisticos(empresa_id, diario_codigo);
CREATE INDEX IF NOT EXISTS idx_mc_data    ON movimentos_contabilisticos(empresa_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_mc_estado  ON movimentos_contabilisticos(empresa_id, estado);
CREATE INDEX IF NOT EXISTS idx_mc_ref     ON movimentos_contabilisticos(empresa_id, referencia);

DROP TRIGGER IF EXISTS trg_mc_updated_at ON movimentos_contabilisticos;
CREATE TRIGGER trg_mc_updated_at BEFORE UPDATE ON movimentos_contabilisticos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_mc_audit ON movimentos_contabilisticos;
CREATE TRIGGER trg_mc_audit BEFORE INSERT OR UPDATE ON movimentos_contabilisticos
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

ALTER TABLE movimentos_contabilisticos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mc: SELECT" ON movimentos_contabilisticos;
CREATE POLICY "mc: SELECT" ON movimentos_contabilisticos FOR SELECT
  USING (empresa_id = get_current_empresa_id());
DROP POLICY IF EXISTS "mc: INSERT" ON movimentos_contabilisticos;
CREATE POLICY "mc: INSERT" ON movimentos_contabilisticos FOR INSERT
  WITH CHECK (empresa_id = get_current_empresa_id());
DROP POLICY IF EXISTS "mc: UPDATE" ON movimentos_contabilisticos;
CREATE POLICY "mc: UPDATE" ON movimentos_contabilisticos FOR UPDATE
  USING  (empresa_id = get_current_empresa_id())
  WITH CHECK (empresa_id = get_current_empresa_id());
DROP POLICY IF EXISTS "mc: DELETE apenas admins" ON movimentos_contabilisticos;
CREATE POLICY "mc: DELETE apenas admins" ON movimentos_contabilisticos FOR DELETE
  USING (empresa_id = get_current_empresa_id() AND is_admin_or_owner(empresa_id));

-- =============================================================================
-- FUNCAO RPC: delete_movements_batch()
-- Apaga movimentos em lote com verificacao de empresa e auditoria
-- =============================================================================
CREATE OR REPLACE FUNCTION delete_movements_batch(
  p_empresa_id uuid,
  p_ids        uuid[],
  p_motivo     text DEFAULT 'Exclusao em lote via sistema'
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_deleted_count  integer := 0;
  v_current_empresa uuid;
BEGIN
  v_current_empresa := get_current_empresa_id();
  IF v_current_empresa IS NULL OR v_current_empresa != p_empresa_id THEN
    RAISE EXCEPTION 'ACESSO NEGADO: empresa_id invalido.';
  END IF;
  IF NOT is_admin_or_owner(p_empresa_id) THEN
    RAISE EXCEPTION 'PERMISSAO NEGADA: apenas administradores podem apagar movimentos.';
  END IF;
  INSERT INTO agt_logs (user_id, empresa_id, tabela, operacao, dados_novos, created_at)
  VALUES (auth.uid(), p_empresa_id, 'movimentos_contabilisticos', 'DELETE',
    jsonb_build_object('ids', p_ids, 'motivo', p_motivo, 'total', array_length(p_ids,1)), NOW());
  WITH deleted AS (
    DELETE FROM movimentos_contabilisticos
    WHERE id = ANY(p_ids) AND empresa_id = p_empresa_id
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;
  RETURN jsonb_build_object('sucesso', true, 'apagados', v_deleted_count,
    'total_solicitado', array_length(p_ids,1));
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('sucesso', false, 'erro', SQLERRM, 'apagados', 0);
END; $$;

-- =============================================================================
-- FUNCAO RPC: get_accounting_summary()
-- Resumo financeiro por ano fiscal
-- =============================================================================
CREATE OR REPLACE FUNCTION get_accounting_summary(p_empresa_id uuid, p_ano text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ano text;
BEGIN
  IF get_current_empresa_id() != p_empresa_id THEN RAISE EXCEPTION 'Acesso negado.'; END IF;
  v_ano := COALESCE(p_ano, to_char(NOW(),'YYYY'));
  RETURN jsonb_build_object(
    'total_movimentos',
      (SELECT COUNT(*) FROM movimentos_contabilisticos WHERE empresa_id=p_empresa_id AND to_char(data,'YYYY')=v_ano AND estado='ativo'),
    'total_debito',
      (SELECT COALESCE(SUM(valor),0) FROM movimentos_contabilisticos WHERE empresa_id=p_empresa_id AND to_char(data,'YYYY')=v_ano AND conta_debito IS NOT NULL AND estado='ativo'),
    'total_credito',
      (SELECT COALESCE(SUM(valor),0) FROM movimentos_contabilisticos WHERE empresa_id=p_empresa_id AND to_char(data,'YYYY')=v_ano AND conta_credito IS NOT NULL AND estado='ativo'),
    'total_impostos_pagos',
      (SELECT COALESCE(SUM(valor),0) FROM pagamentos_impostos WHERE empresa_id=p_empresa_id AND to_char(data,'YYYY')=v_ano AND estado='pago'),
    'total_diarios',
      (SELECT COUNT(*) FROM diarios_contabilisticos WHERE empresa_id=p_empresa_id AND is_active=true),
    'ano', v_ano
  );
END; $$;

-- =============================================================================
-- FUNCAO: create_default_diarios()
-- Cria os 7 diarios padrao para uma nova empresa
-- =============================================================================
CREATE OR REPLACE FUNCTION create_default_diarios(p_empresa_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO diarios_contabilisticos (empresa_id, codigo, descricao, tipo) VALUES
    (p_empresa_id,'VD','Diario de Vendas','Vendas'),
    (p_empresa_id,'CP','Diario de Compras','Compras'),
    (p_empresa_id,'CX','Diario de Caixa','Caixa'),
    (p_empresa_id,'BK','Diario de Banco','Bancos'),
    (p_empresa_id,'SL','Diario de Salarios','Salarios'),
    (p_empresa_id,'OD','Diario de Operacoes Diversas','Geral'),
    (p_empresa_id,'AP','Diario de Apuramentos','Apuramentos')
  ON CONFLICT (empresa_id, codigo) DO NOTHING;
END; $$;

-- =============================================================================
-- FUNCAO: create_default_contas_impostos()
-- Cria as 8 contas de impostos padrao
-- =============================================================================
CREATE OR REPLACE FUNCTION create_default_contas_impostos(p_empresa_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO contas_pag_impostos (empresa_id, cod, descricao, conta_pgc) VALUES
    (p_empresa_id,'IVA',  'Imposto sobre o Valor Acrescentado',              '34.1.1'),
    (p_empresa_id,'II',   'Imposto Industrial',                               '34.1.2'),
    (p_empresa_id,'IRPS', 'Imposto sobre Rendimento das Pessoas Singulares', '34.1.3'),
    (p_empresa_id,'F71',  'Imposto de Selo',                                  '34.1.4'),
    (p_empresa_id,'IPC',  'Imposto por Conta - Autoliquidacao 2%',            '34.1.5'),
    (p_empresa_id,'IRT',  'Imposto sobre Rendimento do Trabalho',             '34.1.6'),
    (p_empresa_id,'SISA', 'Imposto Municipal sobre Transmissoes',             '34.1.7'),
    (p_empresa_id,'IPU',  'Imposto Predial Urbano',                           '34.1.8')
  ON CONFLICT (empresa_id, cod) DO NOTHING;
END; $$;

-- =============================================================================
-- VIEWS
-- =============================================================================
CREATE OR REPLACE VIEW v_movimentos_completo AS
SELECT
  m.id, m.empresa_id, m.diario_id, m.diario_codigo,
  d.descricao AS diario_descricao, d.tipo AS diario_tipo,
  m.data, m.conta_debito, m.conta_credito,
  m.descricao, m.valor, m.referencia, m.doc_tipo, m.estado,
  m.created_at, m.updated_at,
  p.nome AS criado_por_nome
FROM movimentos_contabilisticos m
LEFT JOIN diarios_contabilisticos d ON d.id = m.diario_id
LEFT JOIN perfis p ON p.id = m.created_by
WHERE m.estado = 'ativo';

CREATE OR REPLACE VIEW v_pagamentos_impostos_completo AS
SELECT
  pi.id, pi.empresa_id, pi.conta_imposto_id,
  pi.cod, pi.data, pi.data_valor, pi.descricao,
  pi.caixa_nome, pi.doc_suporte, pi.moeda, pi.valor, pi.estado,
  ci.conta_pgc, ci.descricao AS conta_descricao,
  p.nome AS criado_por_nome,
  pi.created_at, pi.updated_at, pi.anulado_at, pi.motivo_anulacao,
  pa.nome AS anulado_por_nome
FROM pagamentos_impostos pi
LEFT JOIN contas_pag_impostos ci ON ci.id = pi.conta_imposto_id
LEFT JOIN perfis p  ON p.id  = pi.created_by
LEFT JOIN perfis pa ON pa.id = pi.anulado_by;

-- =============================================================================
-- PERMISSOES FINAIS
-- =============================================================================
REVOKE ALL ON TABLE contas_pag_impostos        FROM anon;
REVOKE ALL ON TABLE pagamentos_impostos        FROM anon;
REVOKE ALL ON TABLE diarios_contabilisticos    FROM anon;
REVOKE ALL ON TABLE movimentos_contabilisticos FROM anon;
REVOKE ALL ON TABLE agt_logs                   FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE contas_pag_impostos        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE pagamentos_impostos         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE diarios_contabilisticos     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE movimentos_contabilisticos  TO authenticated;
GRANT SELECT, INSERT                 ON TABLE agt_logs                    TO authenticated;

REVOKE ALL ON FUNCTION delete_movements_batch(uuid, uuid[], text) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_accounting_summary(uuid, text)         FROM PUBLIC;
GRANT EXECUTE ON FUNCTION delete_movements_batch(uuid, uuid[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_accounting_summary(uuid, text)         TO authenticated;
GRANT SELECT  ON v_movimentos_completo               TO authenticated;
GRANT SELECT  ON v_pagamentos_impostos_completo      TO authenticated;

COMMIT;

-- =============================================================================
-- POS-SETUP: Execute separadamente para cada empresa
-- =============================================================================
-- SELECT create_default_diarios('SEU-EMPRESA-UUID');
-- SELECT create_default_contas_impostos('SEU-EMPRESA-UUID');
-- SELECT get_accounting_summary('SEU-EMPRESA-UUID', '2026');
-- SELECT delete_movements_batch('SEU-EMPRESA-UUID', ARRAY['uuid-1','uuid-2']::uuid[], 'Motivo');