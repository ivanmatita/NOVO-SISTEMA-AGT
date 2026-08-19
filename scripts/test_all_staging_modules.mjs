// End-to-End functional audit simulating authenticated user in Staging
import { createClient } from '@supabase/supabase-js';

const STAGING_URL = 'https://sfnibpxfevhelaikqbiq.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbmlicHhmZXZoZWxhaWtxYmlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNTAyODgsImV4cCI6MjEwMjYyNjI4OH0.AnxqAF-TBY556gp2oPV0I5hfTjozaCMIHaeH7OhifiM';

const client = createClient(STAGING_URL, ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  console.log("=== 1. LOGIN NO SUPABASE STAGING ===");
  const { data: authData, error: authErr } = await client.auth.signInWithPassword({
    email: 'admin@staging.local',
    password: 'Password@123'
  });

  if (authErr) {
    console.error("❌ Erro fatal de login:", authErr);
    return;
  }
  console.log("✅ Login OK! User ID:", authData.user?.id);

  // 2. Perfil do utilizador
  console.log("\n=== 2. AUDITANDO PERFIL E EMPRESA ===");
  const { data: profile, error: profErr } = await client
    .from('perfis')
    .select('*, empresa:empresas(*)')
    .eq('id', authData.user.id)
    .single();

  console.log("Perfil:", profile, "Erro:", profErr);
  const empresaId = profile?.empresa_id || '11111111-0000-0000-0000-000000000002';

  // 3. Test CRUD for each key module
  const modulesToTest = [
    {
      name: 'Empresas',
      table: 'empresas',
      select: () => client.from('empresas').select('*').limit(5),
      insert: () => client.from('empresas').insert({
        id: '22222222-0000-0000-0000-' + Date.now().toString().slice(-12),
        nome_empresa: 'Empresa Teste Staging ' + Date.now(),
        nif: '5412345678',
        email: 'empresa_teste@staging.local',
        ativo: true
      }).select().single(),
      update: (id) => client.from('empresas').update({ telefone: '923456789' }).eq('id', id).select().single(),
      delete: (id) => client.from('empresas').delete().eq('id', id)
    },
    {
      name: 'Clientes',
      table: 'clientes',
      select: () => client.from('clientes').select('*').limit(5),
      insert: () => client.from('clientes').insert({
        nome: 'Cliente Teste ' + Date.now(),
        nif: '999888777',
        email: 'cliente@teste.com',
        empresa_id: empresaId
      }).select().single(),
      update: (id) => client.from('clientes').update({ telefone: '912345678' }).eq('id', id).select().single(),
      delete: (id) => client.from('clientes').delete().eq('id', id)
    },
    {
      name: 'Fornecedores',
      table: 'fornecedores',
      select: () => client.from('fornecedores').select('*').limit(5),
      insert: () => client.from('fornecedores').insert({
        nome: 'Fornecedor Teste ' + Date.now(),
        nif: '888777666',
        email: 'fornecedor@teste.com',
        empresa_id: empresaId
      }).select().single(),
      update: (id) => client.from('fornecedores').update({ telefone: '933445566' }).eq('id', id).select().single(),
      delete: (id) => client.from('fornecedores').delete().eq('id', id)
    },
    {
      name: 'Produtos / Stock',
      table: 'produtos',
      select: () => client.from('produtos').select('*').limit(5),
      insert: () => client.from('produtos').insert({
        nome: 'Produto Teste ' + Date.now(),
        codigo: 'PRD-' + Date.now(),
        preco_venda: 1500,
        preco_custo: 1000,
        stock_atual: 50,
        empresa_id: empresaId
      }).select().single(),
      update: (id) => client.from('produtos').update({ preco_venda: 1600 }).eq('id', id).select().single(),
      delete: (id) => client.from('produtos').delete().eq('id', id)
    },
    {
      name: 'Categorias',
      table: 'categorias',
      select: () => client.from('categorias').select('*').limit(5),
      insert: () => client.from('categorias').insert({
        nome: 'Categoria Teste ' + Date.now(),
        empresa_id: empresaId
      }).select().single(),
      update: (id) => client.from('categorias').update({ nome: 'Categoria Atualizada' }).eq('id', id).select().single(),
      delete: (id) => client.from('categorias').delete().eq('id', id)
    },
    {
      name: 'Armazéns',
      table: 'armazens',
      select: () => client.from('armazens').select('*').limit(5),
      insert: () => client.from('armazens').insert({
        nome: 'Armazém Teste ' + Date.now(),
        codigo: 'ARM-' + Date.now(),
        empresa_id: empresaId
      }).select().single(),
      update: (id) => client.from('armazens').update({ localizacao: 'Luanda' }).eq('id', id).select().single(),
      delete: (id) => client.from('armazens').delete().eq('id', id)
    },
    {
      name: 'Caixas',
      table: 'caixas',
      select: () => client.from('caixas').select('*').limit(5),
      insert: () => client.from('caixas').insert({
        nome: 'Caixa Teste ' + Date.now(),
        codigo: 'CX-' + Date.now(),
        empresa_id: empresaId,
        saldo_inicial: 10000,
        saldo_atual: 10000,
        status: 'aberto'
      }).select().single(),
      update: (id) => client.from('caixas').update({ saldo_atual: 12000 }).eq('id', id).select().single(),
      delete: (id) => client.from('caixas').delete().eq('id', id)
    },
    {
      name: 'Séries Fiscais',
      table: 'series_fiscais',
      select: () => client.from('series_fiscais').select('*').limit(5),
      insert: () => client.from('series_fiscais').insert({
        serie: 'TESTE-' + Date.now().toString().slice(-4),
        tipo_documento: 'FT',
        empresa_id: empresaId,
        ano: 2026,
        ultimo_numero: 0,
        ativo: true
      }).select().single(),
      update: (id) => client.from('series_fiscais').update({ ultimo_numero: 1 }).eq('id', id).select().single(),
      delete: (id) => client.from('series_fiscais').delete().eq('id', id)
    },
    {
      name: 'Documentos Emitidos / Faturação',
      table: 'documentos_emitidos',
      select: () => client.from('documentos_emitidos').select('*').limit(5),
      insert: () => client.from('documentos_emitidos').insert({
        numero_documento: 'FT TESTE/' + Date.now(),
        tipo_documento: 'FT',
        empresa_id: empresaId,
        cliente_nome: 'Consumidor Final',
        cliente_nif: '999999999',
        total_liquido: 5000,
        total_imposto: 700,
        total_documento: 5700,
        estado_documento: 'N',
        hash: 'test-hash-' + Date.now()
      }).select().single(),
      update: (id) => client.from('documentos_emitidos').update({ observacoes: 'Observação teste' }).eq('id', id).select().single(),
      delete: (id) => client.from('documentos_emitidos').delete().eq('id', id)
    },
    {
      name: 'Colaboradores / Funcionários',
      table: 'colaboradores',
      select: () => client.from('colaboradores').select('*').limit(5),
      insert: () => client.from('colaboradores').insert({
        nome: 'Funcionário Teste ' + Date.now(),
        nif: '123456789BA042',
        cargo: 'Técnico',
        salario_base: 150000,
        empresa_id: empresaId
      }).select().single(),
      update: (id) => client.from('colaboradores').update({ cargo: 'Especialista' }).eq('id', id).select().single(),
      delete: (id) => client.from('colaboradores').delete().eq('id', id)
    },
    {
      name: 'Recursos Humanos - Processamentos',
      table: 'hr_processamentos',
      select: () => client.from('hr_processamentos').select('*').limit(5),
      insert: () => client.from('hr_processamentos').insert({
        empresa_id: empresaId,
        mes: 8,
        ano: 2026,
        total_liquido: 120000,
        total_bruto: 150000,
        status: 'rascunho'
      }).select().single(),
      update: (id) => client.from('hr_processamentos').update({ status: 'processado' }).eq('id', id).select().single(),
      delete: (id) => client.from('hr_processamentos').delete().eq('id', id)
    },
    {
      name: 'Locais de Trabalho',
      table: 'locais_trabalho',
      select: () => client.from('locais_trabalho').select('*').limit(5),
      insert: () => client.from('locais_trabalho').insert({
        nome: 'Escritório Central ' + Date.now(),
        empresa_id: empresaId,
        endereco: 'Luanda, Angola'
      }).select().single(),
      update: (id) => client.from('locais_trabalho').update({ endereco: 'Talatona, Luanda' }).eq('id', id).select().single(),
      delete: (id) => client.from('locais_trabalho').delete().eq('id', id)
    },
    {
      name: 'Exercícios Fiscais',
      table: 'exercicios_fiscais',
      select: () => client.from('exercicios_fiscais').select('*').limit(5),
      insert: () => client.from('exercicios_fiscais').insert({
        ano: 2027,
        empresa_id: empresaId,
        estado: 'aberto'
      }).select().single(),
      update: (id) => client.from('exercicios_fiscais').update({ estado: 'fechado' }).eq('id', id).select().single(),
      delete: (id) => client.from('exercicios_fiscais').delete().eq('id', id)
    }
  ];

  console.log("\n=== 4. EXECUTANDO TESTES CRUD EM TODOS OS MÓDULOS ===");
  for (const m of modulesToTest) {
    console.log(`\n--- Testando Módulo: ${m.name} (Tabela: ${m.table}) ---`);
    
    // SELECT
    const sRes = await m.select();
    if (sRes.error) {
      console.error(`  ❌ SELECT Error:`, sRes.error.message, `[Code: ${sRes.error.code}]`);
    } else {
      console.log(`  ✅ SELECT OK (${sRes.data?.length ?? 0} registos)`);
    }

    // INSERT
    let insertedId = null;
    const iRes = await m.insert();
    if (iRes.error) {
      console.error(`  ❌ INSERT Error:`, iRes.error.message, `[Code: ${iRes.error.code}]`, iRes.error.details || '');
    } else {
      insertedId = iRes.data?.id;
      console.log(`  ✅ INSERT OK (ID: ${insertedId})`);
    }

    // UPDATE
    if (insertedId) {
      const uRes = await m.update(insertedId);
      if (uRes.error) {
        console.error(`  ❌ UPDATE Error:`, uRes.error.message, `[Code: ${uRes.error.code}]`);
      } else {
        console.log(`  ✅ UPDATE OK`);
      }

      // DELETE
      const dRes = await m.delete(insertedId);
      if (dRes.error) {
        console.error(`  ❌ DELETE Error:`, dRes.error.message, `[Code: ${dRes.error.code}]`);
      } else {
        console.log(`  ✅ DELETE OK`);
      }
    }
  }
}

run().catch(console.error);

