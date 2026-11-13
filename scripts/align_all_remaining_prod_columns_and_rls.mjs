import { createClient } from '@supabase/supabase-js';

const STAGING_URL = "https://sfnibpxfevhelaikqbiq.supabase.co";
const STAGING_SERVICE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbmlicHhmZXZoZWxhaWtxYmlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzA1MDI4OCwiZXhwIjoyMTAyNjI2Mjg4fQ.4wVvNNMK8dUTUXsQ8LklD4OBHa-s02VPlY7H0gC0cbw";

const PROD_URL = "https://nawqfidnawokqaheqvar.supabase.co";
const PROD_SERVICE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hd3FmaWRuYXdva3FhaGVxdmFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODIxODE0NiwiZXhwIjoyMDkzNzk0MTQ2fQ.ToB7OlAF5FDHEKZMAZLmbvLtHb250qiVFmOUQm1VaOo";

const staging = createClient(STAGING_URL, STAGING_SERVICE, { auth: { persistSession: false } });
const prod = createClient(PROD_URL, PROD_SERVICE, { auth: { persistSession: false } });

async function alignDatabase() {
  console.log("==================================================");
  console.log("🔄 SINCRONIZAÇÃO COMPLETA DE ESQUEMA STAGING -> PRODUÇÃO");
  console.log("==================================================");

  // 1. Obter todas as colunas de todas as tabelas em Staging
  const { data: stgCols, error: stgErr } = await staging.rpc('query_exec', {
    query: "SELECT table_name, column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public';"
  });

  if (stgErr) throw new Error("Erro ao listar colunas staging: " + stgErr.message);

  // 2. Obter todas as colunas de todas as tabelas em Produção
  const { data: prdCols, error: prdErr } = await prod.rpc('query_exec', {
    query: "SELECT table_name, column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public';"
  });

  if (prdErr) throw new Error("Erro ao listar colunas prod: " + prdErr.message);

  const prdColSet = new Set(prdCols.map(c => `${c.table_name}.${c.column_name}`));
  const prdTables = new Set(prdCols.map(c => c.table_name));

  const missingColumns = [];
  for (const col of stgCols) {
    if (prdTables.has(col.table_name) && !prdColSet.has(`${col.table_name}.${col.column_name}`)) {
      missingColumns.push(col);
    }
  }

  console.log(`\nColunas em falta em Produção encontradas: ${missingColumns.length}`);
  
  if (missingColumns.length > 0) {
    let sqlAlter = "";
    for (const col of missingColumns) {
      let typeDef = col.data_type;
      if (col.data_type === 'USER-DEFINED') typeDef = 'text';
      if (col.data_type === 'ARRAY') typeDef = 'text[]';
      
      let def = col.column_default ? ` DEFAULT ${col.column_default}` : '';
      sqlAlter += `ALTER TABLE public.${col.table_name} ADD COLUMN IF NOT EXISTS ${col.column_name} ${typeDef}${def};\n`;
    }

    console.log(`\nAplicando ${missingColumns.length} alterações de colunas em Produção...`);
    const { error: alterErr } = await prod.rpc('query_exec', { query: sqlAlter });
    if (alterErr) {
      console.error("❌ Erro ao adicionar colunas:", alterErr.message);
    } else {
      console.log("✅ Todas as colunas em falta foram adicionadas com sucesso!");
    }
  }

  // 3. Garantir RLS universal em todas as tabelas públicas de Produção
  console.log("\n3. Aplicando políticas RLS universais em todas as tabelas...");
  let rlsSql = "";
  for (const table of Array.from(prdTables)) {
    rlsSql += `
      ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "${table}_universal_access" ON public.${table};
      CREATE POLICY "${table}_universal_access" ON public.${table}
        FOR ALL TO public USING (true) WITH CHECK (true);
    `;
  }
  rlsSql += "NOTIFY pgrst, 'reload schema';";

  const { error: rlsErr } = await prod.rpc('query_exec', { query: rlsSql });
  if (rlsErr) {
    console.error("❌ Erro ao aplicar RLS:", rlsErr.message);
  } else {
    console.log("✅ Políticas RLS universais aplicadas com sucesso em todas as tabelas!");
  }

  // 4. Triggers de sincronização adicionais (clientes, colaboradores)
  console.log("\n4. Criando triggers de sincronização para clientes e colaboradores...");
  const triggersSql = `
    -- Sincronização de campos de clientes (nome / name, telefone / phone, etc.)
    CREATE OR REPLACE FUNCTION public.sync_clientes_fields()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.nome IS NULL AND NEW.name IS NOT NULL THEN
        NEW.nome := NEW.name;
      ELSIF NEW.name IS NULL AND NEW.nome IS NOT NULL THEN
        NEW.name := NEW.nome;
      END IF;

      IF NEW.telefone IS NULL AND NEW.phone IS NOT NULL THEN
        NEW.telefone := NEW.phone;
      ELSIF NEW.phone IS NULL AND NEW.telefone IS NOT NULL THEN
        NEW.phone := NEW.telefone;
      END IF;

      IF NEW.endereco IS NULL AND NEW.address IS NOT NULL THEN
        NEW.endereco := NEW.address;
      ELSIF NEW.address IS NULL AND NEW.endereco IS NOT NULL THEN
        NEW.address := NEW.endereco;
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_sync_clientes_fields ON public.clientes;
    CREATE TRIGGER trg_sync_clientes_fields
      BEFORE INSERT OR UPDATE ON public.clientes
      FOR EACH ROW EXECUTE FUNCTION public.sync_clientes_fields();

    -- Sincronização de campos de colaboradores (nome_completo / name, funcao / role, etc.)
    CREATE OR REPLACE FUNCTION public.sync_colaboradores_fields_extended()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.nome_completo IS NULL AND NEW.name IS NOT NULL THEN
        NEW.nome_completo := NEW.name;
      ELSIF NEW.name IS NULL AND NEW.nome_completo IS NOT NULL THEN
        NEW.name := NEW.nome_completo;
      END IF;

      IF NEW.funcao IS NULL AND NEW.role IS NOT NULL THEN
        NEW.funcao := NEW.role;
      ELSIF NEW.role IS NULL AND NEW.funcao IS NOT NULL THEN
        NEW.role := NEW.funcao;
      END IF;

      IF NEW.salario_base IS NULL AND NEW.salary IS NOT NULL THEN
        NEW.salario_base := NEW.salary;
      ELSIF NEW.salary IS NULL AND NEW.salario_base IS NOT NULL THEN
        NEW.salary := NEW.salario_base;
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_sync_colaboradores_fields_extended ON public.colaboradores;
    CREATE TRIGGER trg_sync_colaboradores_fields_extended
      BEFORE INSERT OR UPDATE ON public.colaboradores
      FOR EACH ROW EXECUTE FUNCTION public.sync_colaboradores_fields_extended();

    NOTIFY pgrst, 'reload schema';
  `;

  await prod.rpc('query_exec', { query: triggersSql });
  console.log("✅ Triggers de sincronização adicionais criados!");
}

alignDatabase().catch(console.error);
