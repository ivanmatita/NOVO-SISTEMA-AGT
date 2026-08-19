-- Migration 001: Alinhamento de colunas e estruturas base
-- Data: 2026-08-19
-- Ambientes: Staging e Producao

-- 1. Locais de trabalho: garantir colunas essenciais
ALTER TABLE IF EXISTS locais_trabalho 
  ADD COLUMN IF NOT EXISTS localizacao text,
  ADD COLUMN IF NOT EXISTS endereco text,
  ADD COLUMN IF NOT EXISTS provincia text,
  ADD COLUMN IF NOT EXISTS municipio text,
  ADD COLUMN IF NOT EXISTS telefone text,
  ADD COLUMN IF NOT EXISTS responsavel text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'ativo';

-- 2. Colaboradores: sincronia de colunas
ALTER TABLE IF EXISTS colaboradores
  ADD COLUMN IF NOT EXISTS salario_base numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'ativo';

-- 3. Armazens e Caixas: garantir codigo
ALTER TABLE IF EXISTS armazens
  ADD COLUMN IF NOT EXISTS codigo text;

ALTER TABLE IF EXISTS caixas
  ADD COLUMN IF NOT EXISTS codigo text;

-- 4. Exercicios Fiscais: garantir coluna estado
ALTER TABLE IF EXISTS exercicios_fiscais
  ADD COLUMN IF NOT EXISTS estado text DEFAULT 'aberto';
