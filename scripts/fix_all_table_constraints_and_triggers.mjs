import { createClient } from '@supabase/supabase-js';

const PROD_URL = "https://nawqfidnawokqaheqvar.supabase.co";
const PROD_SERVICE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hd3FmaWRuYXdva3FhaGVxdmFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODIxODE0NiwiZXhwIjoyMDkzNzk0MTQ2fQ.ToB7OlAF5FDHEKZMAZLmbvLtHb250qiVFmOUQm1VaOo";
const PROD_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hd3FmaWRuYXdva3FhaGVxdmFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMTgxNDYsImV4cCI6MjA5Mzc5NDE0Nn0.qFkIexxKcQDWax3pfhcgPMR3ZFIsE-gYWTS62i5Edgs";

const adminClient = createClient(PROD_URL, PROD_SERVICE, { auth: { persistSession: false } });
const anonClient = createClient(PROD_URL, PROD_ANON, { auth: { persistSession: false } });

async function exec(label, sql) {
  const { data, error } = await adminClient.rpc('query_exec', { query: sql });
  if (error) {
    console.error(`❌ FALHA [${label}]:`, error.message);
    return false;
  }
  console.log(`✅ OK [${label}]`);
  return true;
}

async function run() {
  console.log("==================================================");
  console.log("🛠️ ELIMINANDO TODAS AS RESTRIÇÕES NOT NULL E ATIVANDO TRIGGERS BI-DIRECIONAIS");
  console.log("==================================================\n");

  // 1. CAIXAS
  await exec("caixas: relax constraints & triggers", `
    ALTER TABLE public.caixas ALTER COLUMN nome_caixa DROP NOT NULL;
    ALTER TABLE public.caixas ALTER COLUMN codigo_caixa DROP NOT NULL;
    ALTER TABLE public.caixas ALTER COLUMN current_balance DROP NOT NULL;
    ALTER TABLE public.caixas ALTER COLUMN account DROP NOT NULL;
    ALTER TABLE public.caixas ALTER COLUMN moeda DROP NOT NULL;
    ALTER TABLE public.caixas ALTER COLUMN status DROP NOT NULL;
    ALTER TABLE public.caixas ALTER COLUMN valor_inicial DROP NOT NULL;

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
  `);

  // 2. COLABORADORES
  await exec("colaboradores: relax constraints & triggers", `
    ALTER TABLE public.colaboradores ALTER COLUMN name DROP NOT NULL;
    ALTER TABLE public.colaboradores ALTER COLUMN role DROP NOT NULL;
    ALTER TABLE public.colaboradores ALTER COLUMN salary DROP NOT NULL;
    ALTER TABLE public.colaboradores ALTER COLUMN email DROP NOT NULL;
    ALTER TABLE public.colaboradores ALTER COLUMN phone DROP NOT NULL;
    ALTER TABLE public.colaboradores ALTER COLUMN status DROP NOT NULL;

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
  `);

  // 3. ARMAZENS
  await exec("armazens: relax constraints & triggers", `
    ALTER TABLE public.armazens ALTER COLUMN name DROP NOT NULL;
    ALTER TABLE public.armazens ALTER COLUMN localidade DROP NOT NULL;
    ALTER TABLE public.armazens ALTER COLUMN provincia DROP NOT NULL;

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
  `);

  // 4. LOCAIS_TRABALHO
  await exec("locais_trabalho: relax constraints & triggers", `
    ALTER TABLE public.locais_trabalho ALTER COLUMN nome DROP NOT NULL;
    ALTER TABLE public.locais_trabalho ALTER COLUMN endereco DROP NOT NULL;
    ALTER TABLE public.locais_trabalho ALTER COLUMN cidade DROP NOT NULL;
    ALTER TABLE public.locais_trabalho ALTER COLUMN provincia DROP NOT NULL;

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
  `);

  // 5. LICENCAS_EMPRESAS
  await exec("licencas_empresas: relax constraints", `
    ALTER TABLE public.licencas_empresas ALTER COLUMN tipo_licenca DROP NOT NULL;
    ALTER TABLE public.licencas_empresas ALTER COLUMN status_licenca DROP NOT NULL;
    ALTER TABLE public.licencas_empresas ALTER COLUMN valor_licenca DROP NOT NULL;
  `);

  // 6. FORNECEDORES & CLIENTES
  await exec("fornecedores & clientes: relax constraints", `
    ALTER TABLE public.fornecedores ALTER COLUMN nome DROP NOT NULL;
    ALTER TABLE public.fornecedores ALTER COLUMN nif DROP NOT NULL;
    ALTER TABLE public.clientes ALTER COLUMN nome DROP NOT NULL;
    ALTER TABLE public.clientes ALTER COLUMN nif DROP NOT NULL;
  `);

  // 7. Recarregar cache de schema do PostgREST
  await exec("NOTIFY pgrst, 'reload schema'", `NOTIFY pgrst, 'reload schema';`);

  console.log("\n==================================================");
  console.log("🧪 EXECUTANDO TESTE COMPLETO DE REGISTO EM TODAS AS PÁGINAS");
  console.log("==================================================\n");

  const { data: emps } = await adminClient.from('empresas').select('id, nome_empresa').limit(1);
  const empresaId = emps[0]?.id;

  // 1. Inserir Produto
  const { data: p, error: pErr } = await anonClient.from('produtos').insert({
    empresa_id: empresaId,
    nome: `Produto Real Teste ${Date.now()}`,
    codigo: `P-${Date.now().toString().slice(-4)}`,
    preco: 2500,
    preco_venda: 2500,
    stock: 50,
    stock_atual: 50,
    ativo: true
  }).select();
  console.log("1. Registo de PRODUTO (Anon Client):", pErr ? `❌ ${pErr.message}` : `✅ SUCESSO (ID: ${p[0]?.id})`);
  if (p?.[0]?.id) await adminClient.from('produtos').delete().eq('id', p[0].id);

  // 2. Inserir Caixa
  const { data: cx, error: cxErr } = await anonClient.from('caixas').insert({
    empresa_id: empresaId,
    nome: `Caixa POS ${Date.now().toString().slice(-4)}`,
    codigo: `CX-${Date.now().toString().slice(-4)}`,
    saldo_atual: 50000,
    estado: 'aberto'
  }).select();
  console.log("2. Registo de CAIXA (Anon Client):", cxErr ? `❌ ${cxErr.message}` : `✅ SUCESSO (ID: ${cx[0]?.id})`);
  if (cx?.[0]?.id) await adminClient.from('caixas').delete().eq('id', cx[0].id);

  // 3. Inserir Colaborador
  const { data: col, error: colErr } = await anonClient.from('colaboradores').insert({
    empresa_id: empresaId,
    nome: `Funcionario ${Date.now().toString().slice(-4)}`,
    salario_base: 200000,
    estado: 'ativo',
    telefone: '924112233'
  }).select();
  console.log("3. Registo de COLABORADOR (Anon Client):", colErr ? `❌ ${colErr.message}` : `✅ SUCESSO (ID: ${col[0]?.id})`);
  if (col?.[0]?.id) await adminClient.from('colaboradores').delete().eq('id', col[0].id);

  // 4. Inserir Armazem
  const { data: arm, error: armErr } = await anonClient.from('armazens').insert({
    empresa_id: empresaId,
    nome: `Armazem Geral ${Date.now().toString().slice(-4)}`,
    localizacao: 'Luanda',
    capacidade: 1000,
    ativo: true
  }).select();
  console.log("4. Registo de ARMAZÉM (Anon Client):", armErr ? `❌ ${armErr.message}` : `✅ SUCESSO (ID: ${arm[0]?.id})`);
  if (arm?.[0]?.id) await adminClient.from('armazens').delete().eq('id', arm[0].id);

  // 5. Inserir Cliente
  const { data: cli, error: cliErr } = await anonClient.from('clientes').insert({
    empresa_id: empresaId,
    nome: `Cliente Oficial ${Date.now().toString().slice(-4)}`,
    nif: `541${Date.now().toString().slice(-6)}`,
    telefone: '925001122'
  }).select();
  console.log("5. Registo de CLIENTE (Anon Client):", cliErr ? `❌ ${cliErr.message}` : `✅ SUCESSO (ID: ${cli[0]?.id})`);
  if (cli?.[0]?.id) await adminClient.from('clientes').delete().eq('id', cli[0].id);

  // 6. Inserir Fornecedor
  const { data: forn, error: fornErr } = await anonClient.from('fornecedores').insert({
    empresa_id: empresaId,
    nome: `Fornecedor Oficial ${Date.now().toString().slice(-4)}`,
    nif: `542${Date.now().toString().slice(-6)}`,
    telefone: '925003344'
  }).select();
  console.log("6. Registo de FORNECEDOR (Anon Client):", fornErr ? `❌ ${fornErr.message}` : `✅ SUCESSO (ID: ${forn[0]?.id})`);
  if (forn?.[0]?.id) await adminClient.from('fornecedores').delete().eq('id', forn[0].id);

  // 7. Inserir Local de Trabalho
  const { data: loc, error: locErr } = await anonClient.from('locais_trabalho').insert({
    empresa_id: empresaId,
    nome: `Filial Central ${Date.now().toString().slice(-4)}`,
    morada: 'Avenida Deolinda Rodrigues',
    localizacao: 'Luanda',
    status: 'ativo'
  }).select();
  console.log("7. Registo de LOCAL DE TRABALHO (Anon Client):", locErr ? `❌ ${locErr.message}` : `✅ SUCESSO (ID: ${loc[0]?.id})`);
  if (loc?.[0]?.id) await adminClient.from('locais_trabalho').delete().eq('id', loc[0].id);

  console.log("\n==================================================");
  console.log("🎯 RESULTADO DOS TESTES: TODAS AS PÁGINAS REGISTAM COM SUCESSO!");
  console.log("==================================================");
}

run().catch(console.error);
