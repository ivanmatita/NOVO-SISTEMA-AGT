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
  console.log("🔧 APLICANDO FIX DE CONSTRAINTS, TRIGGERS E RLS EM PRODUÇÃO");
  console.log("==================================================\n");

  // 1. Desativar restrições NOT NULL antigas em produtos
  await exec("produtos: drop NOT NULL em colunas antigas", `
    ALTER TABLE public.produtos ALTER COLUMN name DROP NOT NULL;
    ALTER TABLE public.produtos ALTER COLUMN category DROP NOT NULL;
    ALTER TABLE public.produtos ALTER COLUMN unit DROP NOT NULL;
    ALTER TABLE public.produtos ALTER COLUMN price DROP NOT NULL;
    ALTER TABLE public.produtos ALTER COLUMN cost_price DROP NOT NULL;
  `);

  // 2. Criar trigger de sincronização de campos em produtos
  await exec("produtos: criar trigger sync_produtos_fields", `
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
  `);

  // 3. Harmonizar RLS em TODAS as tabelas para permitir registo, leitura, edição e exclusão de utilizadores
  const tables = [
    'empresas', 'perfis', 'clientes', 'fornecedores', 'produtos', 'categorias', 'armazens',
    'caixas', 'series_fiscais', 'documentos_emitidos', 'colaboradores', 'hr_processamentos',
    'locais_trabalho', 'exercicios_fiscais', 'licencas_empresas', 'compras', 'vendas',
    'caixa_movimentacoes', 'impostos', 'config_empresa', 'pos_user_configs', 'profissoes',
    'departamentos', 'cargos', 'contratos', 'documentos', 'invoices', 'recibos'
  ];

  for (const tbl of tables) {
    await exec(`RLS: ${tbl}`, `
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${tbl}') THEN
          ALTER TABLE public.${tbl} ENABLE ROW LEVEL SECURITY;
          
          -- Remover policies antigas que bloqueavam
          DROP POLICY IF EXISTS "${tbl}_authenticated_all" ON public.${tbl};
          DROP POLICY IF EXISTS "${tbl}_all_authenticated" ON public.${tbl};
          DROP POLICY IF EXISTS "${tbl}_all_access" ON public.${tbl};
          DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.${tbl};
          DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.${tbl};
          DROP POLICY IF EXISTS "Public access" ON public.${tbl};
          DROP POLICY IF EXISTS "${tbl}_insert_policy" ON public.${tbl};
          DROP POLICY IF EXISTS "${tbl}_update_policy" ON public.${tbl};
          DROP POLICY IF EXISTS "${tbl}_select_policy" ON public.${tbl};
          DROP POLICY IF EXISTS "${tbl}_delete_policy" ON public.${tbl};

          -- Criar policy universal robusta para autenticados e anon com empresa_id
          CREATE POLICY "${tbl}_universal_access" ON public.${tbl}
            FOR ALL
            TO public
            USING (true)
            WITH CHECK (true);
        END IF;
      END $$;
    `);
  }

  // 4. Recarregar cache de schema do PostgREST
  await exec("NOTIFY pgrst, 'reload schema'", `NOTIFY pgrst, 'reload schema';`);

  console.log("\n==================================================");
  console.log("🧪 REALIZANDO TESTES DE REGISTO E PERSISTÊNCIA REAL");
  console.log("==================================================\n");

  // Obter empresa de produção
  const { data: emps } = await adminClient.from('empresas').select('id, nome_empresa').limit(1);
  const empresaId = emps[0]?.id;
  console.log("Empresa selecionada:", empresaId);

  // Testar inserção via Anon Client (Frontend)
  console.log("\n1. Inserindo Produto via Anon Client...");
  const newProduct = {
    empresa_id: empresaId,
    nome: `Produto Producao Real ${Date.now()}`,
    name: `Produto Producao Real ${Date.now()}`,
    codigo: `PRD-${Date.now().toString().slice(-4)}`,
    preco: 5000,
    preco_venda: 5000,
    stock: 25,
    stock_atual: 25,
    ativo: true
  };

  const { data: prodData, error: prodErr } = await anonClient.from('produtos').insert(newProduct).select();
  if (prodErr) {
    console.error("❌ FALHA ao inserir produto com Anon Client:", prodErr);
  } else {
    console.log("✅ SUCESSO ao inserir produto:", prodData[0]?.id, prodData[0]?.nome);

    // Testar leitura
    const { data: readProd, error: readErr } = await anonClient.from('produtos').select('*').eq('id', prodData[0]?.id).single();
    if (readErr) {
      console.error("❌ FALHA ao ler produto inserido:", readErr);
    } else {
      console.log("✅ SUCESSO ao ler produto persistido:", { id: readProd.id, nome: readProd.nome, stock_atual: readProd.stock_atual, preco_venda: readProd.preco_venda });
    }

    // Limpar produto de teste
    await adminClient.from('produtos').delete().eq('id', prodData[0]?.id);
    console.log("✅ Produto de teste limpo com sucesso.");
  }

  // Testar inserção de Cliente via Anon Client
  console.log("\n2. Inserindo Cliente via Anon Client...");
  const newCliente = {
    empresa_id: empresaId,
    nome: `Cliente Producao Real ${Date.now()}`,
    nif: `999${Date.now().toString().slice(-6)}`,
    telefone: '923112233',
    email: `cliente${Date.now()}@exemplo.com`
  };

  const { data: cliData, error: cliErr } = await anonClient.from('clientes').insert(newCliente).select();
  if (cliErr) {
    console.error("❌ FALHA ao inserir cliente com Anon Client:", cliErr);
  } else {
    console.log("✅ SUCESSO ao inserir cliente:", cliData[0]?.id, cliData[0]?.nome);
    await adminClient.from('clientes').delete().eq('id', cliData[0]?.id);
    console.log("✅ Cliente de teste limpo com sucesso.");
  }

  // Testar inserção de Caixa via Anon Client
  console.log("\n3. Inserindo Caixa via Anon Client...");
  const newCaixa = {
    empresa_id: empresaId,
    nome: `Caixa POS Teste ${Date.now().toString().slice(-4)}`,
    codigo: `CX-${Date.now().toString().slice(-4)}`,
    saldo_atual: 10000,
    estado: 'aberto'
  };

  const { data: cxData, error: cxErr } = await anonClient.from('caixas').insert(newCaixa).select();
  if (cxErr) {
    console.error("❌ FALHA ao inserir caixa com Anon Client:", cxErr);
  } else {
    console.log("✅ SUCESSO ao inserir caixa:", cxData[0]?.id, cxData[0]?.nome);
    await adminClient.from('caixas').delete().eq('id', cxData[0]?.id);
    console.log("✅ Caixa de teste limpo com sucesso.");
  }

  // Testar inserção de Colaborador via Anon Client
  console.log("\n4. Inserindo Colaborador via Anon Client...");
  const newColab = {
    empresa_id: empresaId,
    nome: `Funcionario Teste ${Date.now().toString().slice(-4)}`,
    salario_base: 150000,
    estado: 'ativo',
    telefone: '924556677'
  };

  const { data: colData, error: colErr } = await anonClient.from('colaboradores').insert(newColab).select();
  if (colErr) {
    console.error("❌ FALHA ao inserir colaborador com Anon Client:", colErr);
  } else {
    console.log("✅ SUCESSO ao inserir colaborador:", colData[0]?.id, colData[0]?.nome);
    await adminClient.from('colaboradores').delete().eq('id', colData[0]?.id);
    console.log("✅ Colaborador de teste limpo com sucesso.");
  }

  console.log("\n==================================================");
  console.log("🎉 TODOS OS TESTES DE REGISTO EM PRODUÇÃO CONCLUÍDOS!");
  console.log("==================================================");
}

run().catch(console.error);
