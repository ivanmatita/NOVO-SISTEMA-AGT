-- Migration 006: Sincronização completa de triggers, restrições e políticas RLS universais
-- Ambientes: Staging e Produção
-- Data: 2026-08-19

-- 1. Relax NOT NULL constraints across all tables
ALTER TABLE IF EXISTS public.produtos ALTER COLUMN name DROP NOT NULL;
ALTER TABLE IF EXISTS public.produtos ALTER COLUMN category DROP NOT NULL;
ALTER TABLE IF EXISTS public.produtos ALTER COLUMN unit DROP NOT NULL;
ALTER TABLE IF EXISTS public.produtos ALTER COLUMN price DROP NOT NULL;
ALTER TABLE IF EXISTS public.produtos ALTER COLUMN cost_price DROP NOT NULL;

ALTER TABLE IF EXISTS public.caixas ALTER COLUMN nome_caixa DROP NOT NULL;
ALTER TABLE IF EXISTS public.caixas ALTER COLUMN codigo_caixa DROP NOT NULL;
ALTER TABLE IF EXISTS public.caixas ALTER COLUMN current_balance DROP NOT NULL;
ALTER TABLE IF EXISTS public.caixas ALTER COLUMN account DROP NOT NULL;
ALTER TABLE IF EXISTS public.caixas ALTER COLUMN moeda DROP NOT NULL;
ALTER TABLE IF EXISTS public.caixas ALTER COLUMN status DROP NOT NULL;
ALTER TABLE IF EXISTS public.caixas ALTER COLUMN valor_inicial DROP NOT NULL;

ALTER TABLE IF EXISTS public.colaboradores ALTER COLUMN name DROP NOT NULL;
ALTER TABLE IF EXISTS public.colaboradores ALTER COLUMN role DROP NOT NULL;
ALTER TABLE IF EXISTS public.colaboradores ALTER COLUMN salary DROP NOT NULL;
ALTER TABLE IF EXISTS public.colaboradores ALTER COLUMN email DROP NOT NULL;
ALTER TABLE IF EXISTS public.colaboradores ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE IF EXISTS public.colaboradores ALTER COLUMN status DROP NOT NULL;

ALTER TABLE IF EXISTS public.armazens ALTER COLUMN name DROP NOT NULL;
ALTER TABLE IF EXISTS public.armazens ALTER COLUMN localidade DROP NOT NULL;
ALTER TABLE IF EXISTS public.armazens ALTER COLUMN provincia DROP NOT NULL;

ALTER TABLE IF EXISTS public.locais_trabalho ALTER COLUMN nome DROP NOT NULL;
ALTER TABLE IF EXISTS public.locais_trabalho ALTER COLUMN endereco DROP NOT NULL;
ALTER TABLE IF EXISTS public.locais_trabalho ALTER COLUMN cidade DROP NOT NULL;
ALTER TABLE IF EXISTS public.locais_trabalho ALTER COLUMN provincia DROP NOT NULL;

ALTER TABLE IF EXISTS public.series_fiscais ALTER COLUMN tipo_documento DROP NOT NULL;
ALTER TABLE IF EXISTS public.series_fiscais ALTER COLUMN serie DROP NOT NULL;

ALTER TABLE IF EXISTS public.licencas_empresas ALTER COLUMN tipo_licenca DROP NOT NULL;
ALTER TABLE IF EXISTS public.licencas_empresas ALTER COLUMN status_licenca DROP NOT NULL;
ALTER TABLE IF EXISTS public.licencas_empresas ALTER COLUMN valor_licenca DROP NOT NULL;

ALTER TABLE IF EXISTS public.fornecedores ALTER COLUMN nome DROP NOT NULL;
ALTER TABLE IF EXISTS public.fornecedores ALTER COLUMN nif DROP NOT NULL;
ALTER TABLE IF EXISTS public.clientes ALTER COLUMN nome DROP NOT NULL;
ALTER TABLE IF EXISTS public.clientes ALTER COLUMN nif DROP NOT NULL;

-- 2. Triggers de sincronização
CREATE OR REPLACE FUNCTION public.sync_produtos_fields()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.name IS NOT NULL AND (NEW.nome IS NULL OR NEW.nome = '') THEN NEW.nome := NEW.name;
  ELSIF NEW.nome IS NOT NULL AND (NEW.name IS NULL OR NEW.name = '') THEN NEW.name := NEW.nome; END IF;

  IF NEW.description IS NOT NULL AND (NEW.descricao IS NULL OR NEW.descricao = '') THEN NEW.descricao := NEW.description;
  ELSIF NEW.descricao IS NOT NULL AND (NEW.description IS NULL OR NEW.description = '') THEN NEW.description := NEW.descricao; END IF;

  IF NEW.price IS NOT NULL AND (NEW.preco IS NULL OR NEW.preco = 0) THEN NEW.preco := NEW.price;
  ELSIF NEW.preco IS NOT NULL AND (NEW.price IS NULL OR NEW.price = 0) THEN NEW.price := NEW.preco; END IF;

  IF NEW.cost_price IS NOT NULL AND (NEW.preco_custo IS NULL OR NEW.preco_custo = 0) THEN NEW.preco_custo := NEW.cost_price;
  ELSIF NEW.preco_custo IS NOT NULL AND (NEW.cost_price IS NULL OR NEW.cost_price = 0) THEN NEW.cost_price := NEW.preco_custo; END IF;

  IF NEW.code IS NOT NULL AND (NEW.codigo IS NULL OR NEW.codigo = '') THEN NEW.codigo := NEW.code;
  ELSIF NEW.codigo IS NOT NULL AND (NEW.code IS NULL OR NEW.code = '') THEN NEW.code := NEW.codigo; END IF;

  IF NEW.category IS NOT NULL AND (NEW.categoria IS NULL OR NEW.categoria = '') THEN NEW.categoria := NEW.category;
  ELSIF NEW.categoria IS NOT NULL AND (NEW.category IS NULL OR NEW.category = '') THEN NEW.category := NEW.categoria; END IF;

  IF NEW.stock_quantity IS NOT NULL AND (NEW.stock IS NULL OR NEW.stock = 0) THEN NEW.stock := NEW.stock_quantity;
  ELSIF NEW.stock IS NOT NULL AND (NEW.stock_quantity IS NULL OR NEW.stock_quantity = 0) THEN NEW.stock_quantity := NEW.stock; END IF;

  IF NEW.stock IS NOT NULL AND (NEW.stock_atual IS NULL OR NEW.stock_atual = 0) THEN NEW.stock_atual := NEW.stock;
  ELSIF NEW.stock_atual IS NOT NULL AND (NEW.stock IS NULL OR NEW.stock = 0) THEN NEW.stock := NEW.stock_atual; END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_produtos_fields ON public.produtos;
CREATE TRIGGER trg_sync_produtos_fields
  BEFORE INSERT OR UPDATE ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION public.sync_produtos_fields();

CREATE OR REPLACE FUNCTION public.sync_caixas_fields()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.nome IS NOT NULL AND (NEW.nome_caixa IS NULL OR NEW.nome_caixa = '') THEN NEW.nome_caixa := NEW.nome;
  ELSIF NEW.nome_caixa IS NOT NULL AND (NEW.nome IS NULL OR NEW.nome = '') THEN NEW.nome := NEW.nome_caixa; END IF;

  IF NEW.codigo IS NOT NULL AND (NEW.codigo_caixa IS NULL OR NEW.codigo_caixa = '') THEN NEW.codigo_caixa := NEW.codigo;
  ELSIF NEW.codigo_caixa IS NOT NULL AND (NEW.codigo IS NULL OR NEW.codigo = '') THEN NEW.codigo := NEW.codigo_caixa; END IF;

  IF NEW.saldo_atual IS NOT NULL AND NEW.current_balance IS NULL THEN NEW.current_balance := NEW.saldo_atual;
  ELSIF NEW.current_balance IS NOT NULL AND NEW.saldo_atual IS NULL THEN NEW.saldo_atual := NEW.current_balance; END IF;

  IF NEW.estado IS NOT NULL AND (NEW.status IS NULL OR NEW.status = '') THEN NEW.status := NEW.estado;
  ELSIF NEW.status IS NOT NULL AND (NEW.estado IS NULL OR NEW.estado = '') THEN NEW.estado := NEW.status; END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_caixas_fields ON public.caixas;
CREATE TRIGGER trg_sync_caixas_fields
  BEFORE INSERT OR UPDATE ON public.caixas
  FOR EACH ROW EXECUTE FUNCTION public.sync_caixas_fields();

CREATE OR REPLACE FUNCTION public.sync_colaboradores_fields()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.nome IS NOT NULL AND (NEW.name IS NULL OR NEW.name = '') THEN NEW.name := NEW.nome;
  ELSIF NEW.name IS NOT NULL AND (NEW.nome IS NULL OR NEW.nome = '') THEN NEW.nome := NEW.name; END IF;

  IF NEW.cargo IS NOT NULL AND (NEW.role IS NULL OR NEW.role = '') THEN NEW.role := NEW.cargo;
  ELSIF NEW.role IS NOT NULL AND (NEW.cargo IS NULL OR NEW.cargo = '') THEN NEW.cargo := NEW.role; END IF;

  IF NEW.departamento IS NOT NULL AND (NEW.department IS NULL OR NEW.department = '') THEN NEW.department := NEW.departamento;
  ELSIF NEW.department IS NOT NULL AND (NEW.departamento IS NULL OR NEW.departamento = '') THEN NEW.departamento := NEW.department; END IF;

  IF NEW.salario_base IS NOT NULL AND (NEW.salary IS NULL OR NEW.salary = 0) THEN NEW.salary := NEW.salario_base;
  ELSIF NEW.salario IS NOT NULL AND (NEW.salary IS NULL OR NEW.salary = 0) THEN NEW.salary := NEW.salario;
  ELSIF NEW.salary IS NOT NULL AND (NEW.salario_base IS NULL OR NEW.salario_base = 0) THEN NEW.salario_base := NEW.salary; END IF;

  IF NEW.telefone IS NOT NULL AND (NEW.phone IS NULL OR NEW.phone = '') THEN NEW.phone := NEW.telefone;
  ELSIF NEW.phone IS NOT NULL AND (NEW.telefone IS NULL OR NEW.telefone = '') THEN NEW.telefone := NEW.phone; END IF;

  IF NEW.estado IS NOT NULL AND (NEW.status IS NULL OR NEW.status = '') THEN NEW.status := NEW.estado;
  ELSIF NEW.status IS NOT NULL AND (NEW.estado IS NULL OR NEW.estado = '') THEN NEW.estado := NEW.status; END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_colaboradores_fields ON public.colaboradores;
CREATE TRIGGER trg_sync_colaboradores_fields
  BEFORE INSERT OR UPDATE ON public.colaboradores
  FOR EACH ROW EXECUTE FUNCTION public.sync_colaboradores_fields();

CREATE OR REPLACE FUNCTION public.sync_armazens_fields()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.nome IS NOT NULL AND (NEW.name IS NULL OR NEW.name = '') THEN NEW.name := NEW.nome;
  ELSIF NEW.name IS NOT NULL AND (NEW.nome IS NULL OR NEW.nome = '') THEN NEW.nome := NEW.name; END IF;

  IF NEW.descricao IS NOT NULL AND (NEW.description IS NULL OR NEW.description = '') THEN NEW.description := NEW.descricao;
  ELSIF NEW.description IS NOT NULL AND (NEW.descricao IS NULL OR NEW.descricao = '') THEN NEW.descricao := NEW.description; END IF;

  IF NEW.localizacao IS NOT NULL AND (NEW.location IS NULL OR NEW.location = '') THEN NEW.location := NEW.localizacao;
  ELSIF NEW.location IS NOT NULL AND (NEW.localizacao IS NULL OR NEW.localizacao = '') THEN NEW.localizacao := NEW.location; END IF;

  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := 'ARM-' || substring(COALESCE(NEW.id::text, gen_random_uuid()::text), 1, 4);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_armazens_fields ON public.armazens;
CREATE TRIGGER trg_sync_armazens_fields
  BEFORE INSERT OR UPDATE ON public.armazens
  FOR EACH ROW EXECUTE FUNCTION public.sync_armazens_fields();

CREATE OR REPLACE FUNCTION public.sync_locais_trabalho_fields()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.morada IS NOT NULL AND (NEW.endereco IS NULL OR NEW.endereco = '') THEN NEW.endereco := NEW.morada;
  ELSIF NEW.endereco IS NOT NULL AND (NEW.morada IS NULL OR NEW.morada = '') THEN NEW.morada := NEW.endereco; END IF;

  IF NEW.localizacao IS NOT NULL AND (NEW.cidade IS NULL OR NEW.cidade = '') THEN NEW.cidade := NEW.localizacao;
  ELSIF NEW.cidade IS NOT NULL AND (NEW.localizacao IS NULL OR NEW.localizacao = '') THEN NEW.localizacao := NEW.cidade; END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_locais_trabalho_fields ON public.locais_trabalho;
CREATE TRIGGER trg_sync_locais_trabalho_fields
  BEFORE INSERT OR UPDATE ON public.locais_trabalho
  FOR EACH ROW EXECUTE FUNCTION public.sync_locais_trabalho_fields();

-- 3. Tabela pos_user_configs
CREATE TABLE IF NOT EXISTS public.pos_user_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID,
  user_id UUID,
  allow_pos BOOLEAN DEFAULT true,
  can_access_pos BOOLEAN DEFAULT true,
  has_pos_access BOOLEAN DEFAULT true,
  serie_id TEXT,
  series_id TEXT,
  caixa_id TEXT,
  printer_type TEXT DEFAULT 'P80',
  workplace TEXT,
  workplace_id TEXT,
  initial_balance NUMERIC DEFAULT 0,
  armazem_id TEXT,
  warehouse_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recarregar cache de schema
NOTIFY pgrst, 'reload schema';
