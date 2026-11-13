-- Migration 005: Sincronia total de colunas e paridade de schema entre Staging e Produção
-- Data: 2026-08-19
-- Transação Idempotente com ADD COLUMN IF NOT EXISTS sem perda de dados

-- 1. Tabela PERFIS
ALTER TABLE IF EXISTS public.perfis
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS cargo text,
  ADD COLUMN IF NOT EXISTS departamento text,
  ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS telefone text,
  ADD COLUMN IF NOT EXISTS permissoes jsonb,
  ADD COLUMN IF NOT EXISTS foto text,
  ADD COLUMN IF NOT EXISTS permissions jsonb,
  ADD COLUMN IF NOT EXISTS name text;

-- 2. Tabela PRODUTOS
ALTER TABLE IF EXISTS public.produtos
  ADD COLUMN IF NOT EXISTS nome text,
  ADD COLUMN IF NOT EXISTS codigo text,
  ADD COLUMN IF NOT EXISTS descricao text,
  ADD COLUMN IF NOT EXISTS preco numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preco_compra numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unidade text,
  ADD COLUMN IF NOT EXISTS categoria text,
  ADD COLUMN IF NOT EXISTS iva_taxa numeric DEFAULT 14,
  ADD COLUMN IF NOT EXISTS imagem_url text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS preco_custo numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS tax_id text,
  ADD COLUMN IF NOT EXISTS active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS stock_atual numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_minimo numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_maximo numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS armazem_id text,
  ADD COLUMN IF NOT EXISTS imagem text,
  ADD COLUMN IF NOT EXISTS foto text,
  ADD COLUMN IF NOT EXISTS foto_url text,
  ADD COLUMN IF NOT EXISTS preco_venda numeric DEFAULT 0;

-- 3. Tabela LICENCAS_EMPRESAS
ALTER TABLE IF EXISTS public.licencas_empresas
  ADD COLUMN IF NOT EXISTS plano text DEFAULT 'GRATUITO',
  ADD COLUMN IF NOT EXISTS data_inicio timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS data_fim timestamptz,
  ADD COLUMN IF NOT EXISTS modulos jsonb;

-- 4. Tabela COLABORADORES
ALTER TABLE IF EXISTS public.colaboradores
  ADD COLUMN IF NOT EXISTS profession_name text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS nome text,
  ADD COLUMN IF NOT EXISTS telefone text,
  ADD COLUMN IF NOT EXISTS morada text,
  ADD COLUMN IF NOT EXISTS data_nascimento date,
  ADD COLUMN IF NOT EXISTS data_admissao date,
  ADD COLUMN IF NOT EXISTS data_saida date,
  ADD COLUMN IF NOT EXISTS profession text,
  ADD COLUMN IF NOT EXISTS cargo text,
  ADD COLUMN IF NOT EXISTS departamento text,
  ADD COLUMN IF NOT EXISTS salario numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estado text DEFAULT 'ativo',
  ADD COLUMN IF NOT EXISTS demitido boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS motivo_saida text,
  ADD COLUMN IF NOT EXISTS inss text,
  ADD COLUMN IF NOT EXISTS irt text,
  ADD COLUMN IF NOT EXISTS banco text,
  ADD COLUMN IF NOT EXISTS conta_bancaria text,
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS contrato_id text,
  ADD COLUMN IF NOT EXISTS tipo_contrato text,
  ADD COLUMN IF NOT EXISTS genero text,
  ADD COLUMN IF NOT EXISTS nivel_academico text,
  ADD COLUMN IF NOT EXISTS salario_base numeric DEFAULT 0;

-- 5. Tabela LOCAIS_TRABALHO
ALTER TABLE IF EXISTS public.locais_trabalho
  ADD COLUMN IF NOT EXISTS morada text,
  ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS localizacao text,
  ADD COLUMN IF NOT EXISTS municipio text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'ativo';

-- 6. Tabela CAIXAS
ALTER TABLE IF EXISTS public.caixas
  ADD COLUMN IF NOT EXISTS nome text,
  ADD COLUMN IF NOT EXISTS saldo_atual numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estado text DEFAULT 'aberto',
  ADD COLUMN IF NOT EXISTS responsavel_id text,
  ADD COLUMN IF NOT EXISTS pos_point_id text,
  ADD COLUMN IF NOT EXISTS data_fecho timestamptz,
  ADD COLUMN IF NOT EXISTS codigo text;

-- 7. Tabela ARMAZENS
ALTER TABLE IF EXISTS public.armazens
  ADD COLUMN IF NOT EXISTS nome text,
  ADD COLUMN IF NOT EXISTS localizacao text,
  ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS descricao text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS capacidade numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS codigo text;

-- 8. Tabela CONFIG_EMPRESA
ALTER TABLE IF EXISTS public.config_empresa
  ADD COLUMN IF NOT EXISTS configuracoes jsonb,
  ADD COLUMN IF NOT EXISTS header_image_url text,
  ADD COLUMN IF NOT EXISTS texto_rodape text,
  ADD COLUMN IF NOT EXISTS cor_primaria text;

-- 9. Tabela EXERCICIOS_FISCAIS
ALTER TABLE IF EXISTS public.exercicios_fiscais
  ADD COLUMN IF NOT EXISTS data_inicio date,
  ADD COLUMN IF NOT EXISTS data_fim date,
  ADD COLUMN IF NOT EXISTS estado text DEFAULT 'aberto';
