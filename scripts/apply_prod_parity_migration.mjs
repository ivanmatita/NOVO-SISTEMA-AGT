import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const PROD_URL = "https://nawqfidnawokqaheqvar.supabase.co";
const PROD_SERVICE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hd3FmaWRuYXdva3FhaGVxdmFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODIxODE0NiwiZXhwIjoyMDkzNzk0MTQ2fQ.ToB7OlAF5FDHEKZMAZLmbvLtHb250qiVFmOUQm1VaOo";

const prodClient = createClient(PROD_URL, PROD_SERVICE, { auth: { persistSession: false } });

async function execSql(label, sql) {
  try {
    const { data, error } = await prodClient.rpc('query_exec', { query: sql });
    if (error) {
      console.log(`   ⚠️  AVISO [${label}]: ${error.message}`);
      return false;
    }
    console.log(`   ✅ SUCESSO [${label}]`);
    return true;
  } catch (e) {
    console.log(`   ⚠️  EXCEPÇÃO [${label}]: ${e.message}`);
    return false;
  }
}

async function run() {
  console.log("==================================================");
  console.log("🚀 APLICANDO MIGRATION 005 — SUPABASE DE PRODUÇÃO");
  console.log("   Projeto: nawqfidnawokqaheqvar");
  console.log("==================================================\n");

  // ===== 1. PERFIS =====
  console.log("\n--- [1/9] PERFIS ---");
  await execSql("perfis.user_id", `ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS user_id uuid;`);
  await execSql("perfis.cargo", `ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS cargo text;`);
  await execSql("perfis.departamento", `ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS departamento text;`);
  await execSql("perfis.ativo", `ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;`);
  await execSql("perfis.avatar_url", `ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS avatar_url text;`);
  await execSql("perfis.telefone", `ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS telefone text;`);
  await execSql("perfis.permissoes", `ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS permissoes jsonb;`);
  await execSql("perfis.foto", `ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS foto text;`);
  await execSql("perfis.permissions", `ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS permissions jsonb;`);
  await execSql("perfis.name", `ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS name text;`);

  // ===== 2. PRODUTOS =====
  console.log("\n--- [2/9] PRODUTOS ---");
  await execSql("produtos.nome", `ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS nome text;`);
  await execSql("produtos.codigo", `ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS codigo text;`);
  await execSql("produtos.descricao", `ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS descricao text;`);
  await execSql("produtos.preco", `ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS preco numeric DEFAULT 0;`);
  await execSql("produtos.preco_compra", `ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS preco_compra numeric DEFAULT 0;`);
  await execSql("produtos.stock", `ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS stock numeric DEFAULT 0;`);
  await execSql("produtos.unidade", `ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS unidade text;`);
  await execSql("produtos.categoria", `ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS categoria text;`);
  await execSql("produtos.iva_taxa", `ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS iva_taxa numeric DEFAULT 14;`);
  await execSql("produtos.imagem_url", `ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS imagem_url text;`);
  await execSql("produtos.description", `ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS description text;`);
  await execSql("produtos.preco_custo", `ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS preco_custo numeric DEFAULT 0;`);
  await execSql("produtos.code", `ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS code text;`);
  await execSql("produtos.tax_id", `ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS tax_id text;`);
  await execSql("produtos.active", `ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;`);
  await execSql("produtos.stock_atual", `ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS stock_atual numeric DEFAULT 0;`);
  await execSql("produtos.stock_minimo", `ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS stock_minimo numeric DEFAULT 0;`);
  await execSql("produtos.stock_maximo", `ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS stock_maximo numeric DEFAULT 0;`);
  await execSql("produtos.armazem_id", `ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS armazem_id text;`);
  await execSql("produtos.imagem", `ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS imagem text;`);
  await execSql("produtos.foto", `ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS foto text;`);
  await execSql("produtos.foto_url", `ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS foto_url text;`);
  await execSql("produtos.preco_venda", `ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS preco_venda numeric DEFAULT 0;`);
  // Sync name<->nome e price<->preco
  await execSql("produtos.sync nome<->name", `UPDATE public.produtos SET nome = name WHERE nome IS NULL AND name IS NOT NULL;`);
  await execSql("produtos.sync preco<->price", `UPDATE public.produtos SET preco = price WHERE preco IS NULL AND price IS NOT NULL;`);
  await execSql("produtos.sync preco_venda<->price", `UPDATE public.produtos SET preco_venda = price WHERE preco_venda IS NULL AND price IS NOT NULL;`);
  await execSql("produtos.sync stock<->stock_quantity", `UPDATE public.produtos SET stock = stock_quantity WHERE stock IS NULL AND stock_quantity IS NOT NULL;`);
  await execSql("produtos.sync stock_atual<->stock", `UPDATE public.produtos SET stock_atual = stock WHERE stock_atual IS NULL AND stock IS NOT NULL;`);

  // ===== 3. LICENCAS_EMPRESAS =====
  console.log("\n--- [3/9] LICENCAS_EMPRESAS ---");
  await execSql("licencas_empresas.plano", `ALTER TABLE public.licencas_empresas ADD COLUMN IF NOT EXISTS plano text DEFAULT 'GRATUITO';`);
  await execSql("licencas_empresas.data_inicio", `ALTER TABLE public.licencas_empresas ADD COLUMN IF NOT EXISTS data_inicio timestamptz;`);
  await execSql("licencas_empresas.data_fim", `ALTER TABLE public.licencas_empresas ADD COLUMN IF NOT EXISTS data_fim timestamptz;`);
  await execSql("licencas_empresas.modulos", `ALTER TABLE public.licencas_empresas ADD COLUMN IF NOT EXISTS modulos jsonb;`);
  // Sync tipo_licenca -> plano
  await execSql("licencas_empresas.sync plano<->tipo_licenca", `UPDATE public.licencas_empresas SET plano = COALESCE(tipo_licenca, 'GRATUITO') WHERE plano IS NULL;`);
  await execSql("licencas_empresas.sync data_inicio<->data_validade", `UPDATE public.licencas_empresas SET data_inicio = COALESCE(created_at, NOW()) WHERE data_inicio IS NULL;`);
  await execSql("licencas_empresas.sync data_fim<->data_validade", `UPDATE public.licencas_empresas SET data_fim = data_validade WHERE data_fim IS NULL AND data_validade IS NOT NULL;`);

  // ===== 4. COLABORADORES =====
  console.log("\n--- [4/9] COLABORADORES ---");
  await execSql("colaboradores.profession_name", `ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS profession_name text;`);
  await execSql("colaboradores.avatar_url", `ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS avatar_url text;`);
  await execSql("colaboradores.nome", `ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS nome text;`);
  await execSql("colaboradores.telefone", `ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS telefone text;`);
  await execSql("colaboradores.morada", `ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS morada text;`);
  await execSql("colaboradores.data_nascimento", `ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS data_nascimento date;`);
  await execSql("colaboradores.data_admissao", `ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS data_admissao date;`);
  await execSql("colaboradores.data_saida", `ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS data_saida date;`);
  await execSql("colaboradores.profession", `ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS profession text;`);
  await execSql("colaboradores.cargo", `ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS cargo text;`);
  await execSql("colaboradores.departamento", `ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS departamento text;`);
  await execSql("colaboradores.salario", `ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS salario numeric DEFAULT 0;`);
  await execSql("colaboradores.estado", `ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS estado text DEFAULT 'ativo';`);
  await execSql("colaboradores.demitido", `ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS demitido boolean DEFAULT false;`);
  await execSql("colaboradores.motivo_saida", `ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS motivo_saida text;`);
  await execSql("colaboradores.inss", `ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS inss text;`);
  await execSql("colaboradores.irt", `ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS irt text;`);
  await execSql("colaboradores.banco", `ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS banco text;`);
  await execSql("colaboradores.conta_bancaria", `ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS conta_bancaria text;`);
  await execSql("colaboradores.photo_url", `ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS photo_url text;`);
  await execSql("colaboradores.user_id", `ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS user_id uuid;`);
  await execSql("colaboradores.contrato_id", `ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS contrato_id text;`);
  await execSql("colaboradores.tipo_contrato", `ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS tipo_contrato text;`);
  await execSql("colaboradores.genero", `ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS genero text;`);
  await execSql("colaboradores.nivel_academico", `ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS nivel_academico text;`);
  await execSql("colaboradores.salario_base", `ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS salario_base numeric DEFAULT 0;`);
  // Sync name->nome e salary->salario
  await execSql("colaboradores.sync nome<->name", `UPDATE public.colaboradores SET nome = name WHERE nome IS NULL AND name IS NOT NULL;`);
  await execSql("colaboradores.sync salario<->salary", `UPDATE public.colaboradores SET salario = salary WHERE salario IS NULL AND salary IS NOT NULL;`);
  await execSql("colaboradores.sync salario_base<->salary", `UPDATE public.colaboradores SET salario_base = salary WHERE salario_base IS NULL AND salary IS NOT NULL;`);
  await execSql("colaboradores.sync estado<->status", `UPDATE public.colaboradores SET estado = status WHERE estado IS NULL AND status IS NOT NULL;`);
  await execSql("colaboradores.sync telefone<->phone", `UPDATE public.colaboradores SET telefone = phone WHERE telefone IS NULL AND phone IS NOT NULL;`);
  await execSql("colaboradores.sync data_admissao<->hired_at", `UPDATE public.colaboradores SET data_admissao = hired_at WHERE data_admissao IS NULL AND hired_at IS NOT NULL;`);
  await execSql("colaboradores.sync data_nascimento<->birth_date", `UPDATE public.colaboradores SET data_nascimento = birth_date WHERE data_nascimento IS NULL AND birth_date IS NOT NULL;`);
  await execSql("colaboradores.sync genero<->gender", `UPDATE public.colaboradores SET genero = gender WHERE genero IS NULL AND gender IS NOT NULL;`);
  await execSql("colaboradores.sync nivel_academico<->academic_level", `UPDATE public.colaboradores SET nivel_academico = academic_level WHERE nivel_academico IS NULL AND academic_level IS NOT NULL;`);
  await execSql("colaboradores.sync departamento<->department", `UPDATE public.colaboradores SET departamento = department WHERE departamento IS NULL AND department IS NOT NULL;`);
  await execSql("colaboradores.sync tipo_contrato<->contract_type", `UPDATE public.colaboradores SET tipo_contrato = contract_type WHERE tipo_contrato IS NULL AND contract_type IS NOT NULL;`);
  await execSql("colaboradores.sync photo_url<->image_url", `UPDATE public.colaboradores SET photo_url = image_url WHERE photo_url IS NULL AND image_url IS NOT NULL;`);

  // ===== 5. LOCAIS_TRABALHO =====
  console.log("\n--- [5/9] LOCAIS_TRABALHO ---");
  await execSql("locais_trabalho.morada", `ALTER TABLE public.locais_trabalho ADD COLUMN IF NOT EXISTS morada text;`);
  await execSql("locais_trabalho.ativo", `ALTER TABLE public.locais_trabalho ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;`);
  await execSql("locais_trabalho.localizacao", `ALTER TABLE public.locais_trabalho ADD COLUMN IF NOT EXISTS localizacao text;`);
  await execSql("locais_trabalho.municipio", `ALTER TABLE public.locais_trabalho ADD COLUMN IF NOT EXISTS municipio text;`);
  await execSql("locais_trabalho.status", `ALTER TABLE public.locais_trabalho ADD COLUMN IF NOT EXISTS status text DEFAULT 'ativo';`);
  await execSql("locais_trabalho.sync morada<->endereco", `UPDATE public.locais_trabalho SET morada = endereco WHERE morada IS NULL AND endereco IS NOT NULL;`);
  await execSql("locais_trabalho.sync localizacao<->cidade", `UPDATE public.locais_trabalho SET localizacao = cidade WHERE localizacao IS NULL AND cidade IS NOT NULL;`);

  // ===== 6. CAIXAS =====
  console.log("\n--- [6/9] CAIXAS ---");
  await execSql("caixas.nome", `ALTER TABLE public.caixas ADD COLUMN IF NOT EXISTS nome text;`);
  await execSql("caixas.saldo_atual", `ALTER TABLE public.caixas ADD COLUMN IF NOT EXISTS saldo_atual numeric DEFAULT 0;`);
  await execSql("caixas.estado", `ALTER TABLE public.caixas ADD COLUMN IF NOT EXISTS estado text DEFAULT 'aberto';`);
  await execSql("caixas.responsavel_id", `ALTER TABLE public.caixas ADD COLUMN IF NOT EXISTS responsavel_id text;`);
  await execSql("caixas.pos_point_id", `ALTER TABLE public.caixas ADD COLUMN IF NOT EXISTS pos_point_id text;`);
  await execSql("caixas.data_fecho", `ALTER TABLE public.caixas ADD COLUMN IF NOT EXISTS data_fecho timestamptz;`);
  await execSql("caixas.codigo", `ALTER TABLE public.caixas ADD COLUMN IF NOT EXISTS codigo text;`);
  await execSql("caixas.sync nome<->nome_caixa", `UPDATE public.caixas SET nome = nome_caixa WHERE nome IS NULL AND nome_caixa IS NOT NULL;`);
  await execSql("caixas.sync saldo_atual<->current_balance", `UPDATE public.caixas SET saldo_atual = current_balance WHERE saldo_atual IS NULL AND current_balance IS NOT NULL;`);
  await execSql("caixas.sync estado<->status", `UPDATE public.caixas SET estado = status WHERE estado IS NULL AND status IS NOT NULL;`);
  await execSql("caixas.sync codigo<->codigo_caixa", `UPDATE public.caixas SET codigo = COALESCE(codigo_caixa, 'CX-' || substring(id::text, 1, 4)) WHERE codigo IS NULL;`);
  await execSql("caixas.sync data_fecho<->data_fechamento", `UPDATE public.caixas SET data_fecho = data_fechamento WHERE data_fecho IS NULL AND data_fechamento IS NOT NULL;`);

  // ===== 7. ARMAZENS =====
  console.log("\n--- [7/9] ARMAZENS ---");
  await execSql("armazens.nome", `ALTER TABLE public.armazens ADD COLUMN IF NOT EXISTS nome text;`);
  await execSql("armazens.localizacao", `ALTER TABLE public.armazens ADD COLUMN IF NOT EXISTS localizacao text;`);
  await execSql("armazens.ativo", `ALTER TABLE public.armazens ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;`);
  await execSql("armazens.description", `ALTER TABLE public.armazens ADD COLUMN IF NOT EXISTS description text;`);
  await execSql("armazens.descricao", `ALTER TABLE public.armazens ADD COLUMN IF NOT EXISTS descricao text;`);
  await execSql("armazens.location", `ALTER TABLE public.armazens ADD COLUMN IF NOT EXISTS location text;`);
  await execSql("armazens.capacidade", `ALTER TABLE public.armazens ADD COLUMN IF NOT EXISTS capacidade numeric DEFAULT 0;`);
  await execSql("armazens.codigo", `ALTER TABLE public.armazens ADD COLUMN IF NOT EXISTS codigo text;`);
  await execSql("armazens.sync nome<->name", `UPDATE public.armazens SET nome = name WHERE nome IS NULL AND name IS NOT NULL;`);
  await execSql("armazens.sync codigo", `UPDATE public.armazens SET codigo = 'ARM-' || substring(id::text, 1, 4) WHERE codigo IS NULL;`);

  // ===== 8. CONFIG_EMPRESA =====
  console.log("\n--- [8/9] CONFIG_EMPRESA ---");
  await execSql("config_empresa.configuracoes", `ALTER TABLE public.config_empresa ADD COLUMN IF NOT EXISTS configuracoes jsonb;`);
  await execSql("config_empresa.header_image_url", `ALTER TABLE public.config_empresa ADD COLUMN IF NOT EXISTS header_image_url text;`);
  await execSql("config_empresa.texto_rodape", `ALTER TABLE public.config_empresa ADD COLUMN IF NOT EXISTS texto_rodape text;`);
  await execSql("config_empresa.cor_primaria", `ALTER TABLE public.config_empresa ADD COLUMN IF NOT EXISTS cor_primaria text;`);

  // ===== 9. EXERCICIOS_FISCAIS =====
  console.log("\n--- [9/9] EXERCICIOS_FISCAIS ---");
  await execSql("exercicios_fiscais.data_inicio", `ALTER TABLE public.exercicios_fiscais ADD COLUMN IF NOT EXISTS data_inicio date;`);
  await execSql("exercicios_fiscais.data_fim", `ALTER TABLE public.exercicios_fiscais ADD COLUMN IF NOT EXISTS data_fim date;`);
  await execSql("exercicios_fiscais.estado", `ALTER TABLE public.exercicios_fiscais ADD COLUMN IF NOT EXISTS estado text DEFAULT 'aberto';`);
  await execSql("exercicios_fiscais.sync estado<->fechado", `UPDATE public.exercicios_fiscais SET estado = CASE WHEN fechado = true THEN 'fechado' ELSE 'aberto' END WHERE estado IS NULL;`);
  await execSql("exercicios_fiscais.sync data_inicio", `UPDATE public.exercicios_fiscais SET data_inicio = data_abertura WHERE data_inicio IS NULL AND data_abertura IS NOT NULL;`);
  await execSql("exercicios_fiscais.sync data_fim", `UPDATE public.exercicios_fiscais SET data_fim = data_fecho WHERE data_fim IS NULL AND data_fecho IS NOT NULL;`);

  // ===== REGISTAR MIGRATION NA TABELA DE CONTROLO =====
  console.log("\n--- Registando migration no _schema_migrations ---");
  await execSql("register_migration_005", `
    INSERT INTO public._schema_migrations (version, name, checksum, applied_at, environment, status)
    VALUES (
      '20260819_005', 
      '20260819_005_production_schema_parity.sql', 
      'manual_parity_fix', 
      NOW(), 
      'production', 
      'SUCCESS'
    )
    ON CONFLICT (version) DO UPDATE SET status = 'SUCCESS', applied_at = NOW();
  `);

  console.log("\n==================================================");
  console.log("✅ MIGRATION 005 APLICADA COM SUCESSO EM PRODUÇÃO");
  console.log("==================================================\n");
}

run().catch(console.error);
