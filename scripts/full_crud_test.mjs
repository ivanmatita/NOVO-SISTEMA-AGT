// Full CRUD verification for all Staging modules
// Uses the Supabase anon key + admin@staging.local to simulate real browser behavior
import { createClient } from '@supabase/supabase-js';

const STAGING_URL = 'https://sfnibpxfevhelaikqbiq.supabase.co';
const STAGING_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbmlicHhmZXZoZWxhaWtxYmlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNTAyODgsImV4cCI6MjEwMjYyNjI4OH0.AnxqAF-TBY556gp2oPV0I5hfTjozaCMIHaeH7OhifiM';

const supabase = createClient(STAGING_URL, STAGING_ANON);
const EMPRESA_ID = '11111111-0000-0000-0000-000000000001';

let pass = 0, fail = 0;

async function test(label, fn) {
  try {
    const result = await fn();
    if (result === false) throw new Error('returned false');
    console.log(`✅ PASS: ${label}`);
    pass++;
  } catch(e) {
    console.error(`❌ FAIL: ${label} — ${e.message}`);
    fail++;
  }
}

async function run() {
  // LOGIN FIRST
  const { data: { session }, error: loginErr } = await supabase.auth.signInWithPassword({
    email: 'admin@staging.local',
    password: 'Password@123',
  });
  if (loginErr || !session) {
    console.error('❌ LOGIN FAILED:', loginErr?.message);
    process.exit(1);
  }
  console.log('✅ LOGIN OK — user:', session.user.email, '\n');

  // ===== TEST EACH TABLE =====

  // 1. PERFIS
  await test('perfis SELECT', async () => {
    const { data, error } = await supabase.from('perfis').select('*').limit(5);
    if (error) throw new Error(error.message);
    return data;
  });

  // 2. EMPRESAS
  await test('empresas SELECT', async () => {
    const { data, error } = await supabase.from('empresas').select('*').limit(5);
    if (error) throw new Error(error.message);
    return data;
  });

  // 3. CLIENTES
  let clienteId;
  await test('clientes INSERT', async () => {
    const { data, error } = await supabase.from('clientes').insert([{
      empresa_id: EMPRESA_ID, nome: 'Cliente Teste CRUD', nif: '000000000', email: 'crud@test.local'
    }]).select('id').single();
    if (error) throw new Error(error.message);
    clienteId = data.id;
    return true;
  });
  await test('clientes SELECT', async () => {
    const { data, error } = await supabase.from('clientes').select('*').eq('empresa_id', EMPRESA_ID).limit(5);
    if (error) throw new Error(error.message);
    return data;
  });
  await test('clientes UPDATE', async () => {
    if (!clienteId) throw new Error('no clienteId');
    const { error } = await supabase.from('clientes').update({ nome: 'Cliente Teste CRUD Updated' }).eq('id', clienteId);
    if (error) throw new Error(error.message);
    return true;
  });
  await test('clientes DELETE', async () => {
    if (!clienteId) throw new Error('no clienteId');
    const { error } = await supabase.from('clientes').delete().eq('id', clienteId);
    if (error) throw new Error(error.message);
    return true;
  });

  // 4. FORNECEDORES
  let fornecedorId;
  await test('fornecedores INSERT', async () => {
    const { data, error } = await supabase.from('fornecedores').insert([{
      empresa_id: EMPRESA_ID, nome: 'Fornecedor Teste CRUD', nif: '000000001'
    }]).select('id').single();
    if (error) throw new Error(error.message);
    fornecedorId = data.id;
    return true;
  });
  await test('fornecedores SELECT', async () => {
    const { data, error } = await supabase.from('fornecedores').select('*').eq('empresa_id', EMPRESA_ID).limit(5);
    if (error) throw new Error(error.message);
    return data;
  });
  await test('fornecedores DELETE', async () => {
    if (!fornecedorId) throw new Error('no fornecedorId');
    const { error } = await supabase.from('fornecedores').delete().eq('id', fornecedorId);
    if (error) throw new Error(error.message);
    return true;
  });

  // 5. CATEGORIAS
  let categoriaId;
  await test('categorias SELECT', async () => {
    const { data, error } = await supabase.from('categorias').select('*').eq('empresa_id', EMPRESA_ID);
    if (error) throw new Error(error.message);
    console.log('  (categorias:', data?.length, 'rows)');
    return data;
  });
  await test('categorias INSERT', async () => {
    const { data, error } = await supabase.from('categorias').insert([{
      empresa_id: EMPRESA_ID, nome: 'Categoria Teste CRUD'
    }]).select('id').single();
    if (error) throw new Error(error.message);
    categoriaId = data.id;
    return true;
  });
  await test('categorias DELETE', async () => {
    if (!categoriaId) throw new Error('no categoriaId');
    const { error } = await supabase.from('categorias').delete().eq('id', categoriaId);
    if (error) throw new Error(error.message);
    return true;
  });

  // 6. PRODUTOS
  let produtoId;
  await test('produtos INSERT', async () => {
    const { data, error } = await supabase.from('produtos').insert([{
      empresa_id: EMPRESA_ID, nome: 'Produto Teste CRUD', preco: 100, preco_venda: 100, stock: 50
    }]).select('id').single();
    if (error) throw new Error(error.message);
    produtoId = data.id;
    return true;
  });
  await test('produtos SELECT', async () => {
    const { data, error } = await supabase.from('produtos').select('*').eq('empresa_id', EMPRESA_ID).limit(5);
    if (error) throw new Error(error.message);
    return data;
  });
  await test('produtos UPDATE', async () => {
    if (!produtoId) throw new Error('no produtoId');
    const { error } = await supabase.from('produtos').update({ preco: 150, preco_venda: 150 }).eq('id', produtoId);
    if (error) throw new Error(error.message);
    return true;
  });
  await test('produtos DELETE', async () => {
    if (!produtoId) throw new Error('no produtoId');
    const { error } = await supabase.from('produtos').delete().eq('id', produtoId);
    if (error) throw new Error(error.message);
    return true;
  });

  // 7. ARMAZENS
  let armazemId;
  await test('armazens INSERT', async () => {
    const { data, error } = await supabase.from('armazens').insert([{
      empresa_id: EMPRESA_ID, nome: 'Armazém Teste CRUD', codigo: 'ARM-T1', localizacao: 'Luanda'
    }]).select('id').single();
    if (error) throw new Error(error.message);
    armazemId = data.id;
    return true;
  });
  await test('armazens SELECT', async () => {
    const { data, error } = await supabase.from('armazens').select('*').eq('empresa_id', EMPRESA_ID);
    if (error) throw new Error(error.message);
    return data;
  });
  await test('armazens DELETE', async () => {
    if (!armazemId) throw new Error('no armazemId');
    const { error } = await supabase.from('armazens').delete().eq('id', armazemId);
    if (error) throw new Error(error.message);
    return true;
  });

  // 8. CAIXAS
  await test('caixas SELECT', async () => {
    const { data, error } = await supabase.from('caixas').select('*').eq('empresa_id', EMPRESA_ID);
    if (error) throw new Error(error.message);
    return data;
  });
  let caixaId;
  await test('caixas INSERT', async () => {
    const { data, error } = await supabase.from('caixas').insert([{
      empresa_id: EMPRESA_ID, nome_caixa: 'Caixa Teste CRUD', codigo_caixa: 'CX-TST', codigo: 'CX-TST', saldo_inicial: 1000
    }]).select('id').single();
    if (error) throw new Error(error.message);
    caixaId = data.id;
    return true;
  });
  await test('caixas DELETE', async () => {
    if (!caixaId) throw new Error('no caixaId');
    const { error } = await supabase.from('caixas').delete().eq('id', caixaId);
    if (error) throw new Error(error.message);
    return true;
  });

  // 9. SERIES FISCAIS
  await test('series_fiscais SELECT', async () => {
    const { data, error } = await supabase.from('series_fiscais').select('*').eq('empresa_id', EMPRESA_ID);
    if (error) throw new Error(error.message);
    return data;
  });

  // 10. DOCUMENTOS EMITIDOS
  await test('documentos_emitidos SELECT', async () => {
    const { data, error } = await supabase.from('documentos_emitidos').select('*').eq('empresa_id', EMPRESA_ID).limit(5);
    if (error) throw new Error(error.message);
    return data;
  });

  // 11. COLABORADORES
  await test('colaboradores SELECT', async () => {
    const { data, error } = await supabase.from('colaboradores').select('*').eq('empresa_id', EMPRESA_ID);
    if (error) throw new Error(error.message);
    return data;
  });
  let colaboradorId;
  await test('colaboradores INSERT', async () => {
    const { data, error } = await supabase.from('colaboradores').insert([{
      empresa_id: EMPRESA_ID, name: 'Colaborador Teste CRUD', role: 'Tester', 
      salary: 1000, salario: 1000, salario_base: 1000, status: 'active'
    }]).select('id').single();
    if (error) throw new Error(error.message);
    colaboradorId = data.id;
    return true;
  });
  await test('colaboradores DELETE', async () => {
    if (!colaboradorId) throw new Error('no colaboradorId');
    const { error } = await supabase.from('colaboradores').delete().eq('id', colaboradorId);
    if (error) throw new Error(error.message);
    return true;
  });

  // 12. HR PROCESSAMENTOS
  await test('hr_processamentos SELECT', async () => {
    const { data, error } = await supabase.from('hr_processamentos').select('*').eq('empresa_id', EMPRESA_ID).limit(5);
    if (error) throw new Error(error.message);
    return data;
  });

  // 13. LOCAIS TRABALHO
  await test('locais_trabalho SELECT', async () => {
    const { data, error } = await supabase.from('locais_trabalho').select('*').eq('empresa_id', EMPRESA_ID);
    if (error) throw new Error(error.message);
    return data;
  });

  // 14. EXERCICIOS FISCAIS
  await test('exercicios_fiscais SELECT', async () => {
    const { data, error } = await supabase.from('exercicios_fiscais').select('*').eq('empresa_id', EMPRESA_ID);
    if (error) throw new Error(error.message);
    return data;
  });

  // 15. COMPRAS
  await test('compras SELECT', async () => {
    const { data, error } = await supabase.from('compras').select('*').eq('empresa_id', EMPRESA_ID).limit(5);
    if (error) throw new Error(error.message);
    return data;
  });

  // 16. CAIXA MOVIMENTACOES
  await test('caixa_movimentacoes SELECT', async () => {
    const { data, error } = await supabase.from('caixa_movimentacoes').select('*').eq('empresa_id', EMPRESA_ID).limit(5);
    if (error) throw new Error(error.message);
    return data;
  });

  // 17. IMPOSTOS
  await test('impostos SELECT', async () => {
    const { data, error } = await supabase.from('impostos').select('*').eq('empresa_id', EMPRESA_ID);
    if (error) throw new Error(error.message);
    return data;
  });

  // 18. LICENCAS EMPRESAS
  await test('licencas_empresas SELECT', async () => {
    const { data, error } = await supabase.from('licencas_empresas').select('*').eq('empresa_id', EMPRESA_ID);
    if (error) throw new Error(error.message);
    return data;
  });

  console.log(`\n=== RESULTADO FINAL ===`);
  console.log(`✅ PASS: ${pass}`);
  console.log(`❌ FAIL: ${fail}`);
  console.log(`Total: ${pass + fail}`);
}

run().catch(console.error);

