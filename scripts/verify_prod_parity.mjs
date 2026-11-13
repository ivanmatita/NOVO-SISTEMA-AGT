import { createClient } from '@supabase/supabase-js';

const PROD_URL = "https://nawqfidnawokqaheqvar.supabase.co";
const PROD_SERVICE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hd3FmaWRuYXdva3FhaGVxdmFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODIxODE0NiwiZXhwIjoyMDkzNzk0MTQ2fQ.ToB7OlAF5FDHEKZMAZLmbvLtHb250qiVFmOUQm1VaOo";

const client = createClient(PROD_URL, PROD_SERVICE, { auth: { persistSession: false } });

async function rpc(q) {
  const { data, error } = await client.rpc('query_exec', { query: q });
  return error ? `AVISO: ${error.message}` : 'SUCESSO';
}

async function run() {
  // Fix 1: perfis.user_id retry
  console.log('perfis.user_id:', await rpc('ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS user_id uuid;'));
  
  // Fix 2: colaboradores date syncs with proper cast
  console.log('colaboradores.data_admissao sync:', await rpc(
    "UPDATE public.colaboradores SET data_admissao = to_date(hired_at, 'YYYY-MM-DD') WHERE data_admissao IS NULL AND hired_at IS NOT NULL AND hired_at <> ''"
  ));
  console.log('colaboradores.data_nascimento sync:', await rpc(
    "UPDATE public.colaboradores SET data_nascimento = to_date(birth_date, 'YYYY-MM-DD') WHERE data_nascimento IS NULL AND birth_date IS NOT NULL AND birth_date <> ''"
  ));

  // === VERIFICAÇÃO PÓS-MIGRAÇÃO ===
  console.log('\n=== VERIFICAÇÃO PÓS-MIGRAÇÃO ===\n');

  const checks = [
    { name: 'Empresas', query: client.from('empresas').select('id, nome_empresa, nif').limit(3) },
    { name: 'Produtos (schema v2)', query: client.from('produtos').select('id, nome, codigo, preco, armazem_id, stock_atual, preco_venda').limit(3) },
    { name: 'Perfis (schema v2)', query: client.from('perfis').select('id, empresa_id, role, user_id, cargo, ativo, telefone').limit(3) },
    { name: 'Licencas_empresas (schema v2)', query: client.from('licencas_empresas').select('id, empresa_id, plano, data_inicio, data_fim, status_licenca').limit(3) },
    { name: 'Caixas (schema v2)', query: client.from('caixas').select('id, nome, saldo_atual, estado').limit(3) },
    { name: 'Armazens (schema v2)', query: client.from('armazens').select('id, nome, localizacao, ativo, codigo').limit(3) },
    { name: 'Colaboradores (schema v2)', query: client.from('colaboradores').select('id, nome, salario_base, estado, genero').limit(3) },
    { name: 'Locais_trabalho (schema v2)', query: client.from('locais_trabalho').select('id, nome, localizacao, ativo, status').limit(3) },
    { name: 'Config_empresa (schema v2)', query: client.from('config_empresa').select('id, empresa_id, nome_empresa, cor_primaria, texto_rodape').limit(3) },
    { name: 'Exercicios_fiscais (schema v2)', query: client.from('exercicios_fiscais').select('id, empresa_id, ano, estado, data_inicio, data_fim').limit(3) },
    { name: 'Caixas count', query: client.from('caixas').select('*', { count: 'exact', head: true }) },
    { name: 'Produtos count', query: client.from('produtos').select('*', { count: 'exact', head: true }) },
    { name: 'Colaboradores count', query: client.from('colaboradores').select('*', { count: 'exact', head: true }) },
  ];

  for (const check of checks) {
    const { data, error, count } = await check.query;
    if (error) {
      console.log(`❌ ${check.name}: FALHA — ${error.message}`);
    } else {
      const info = count !== undefined ? `${count} registos totais` : `${data?.length ?? 0} registos na amostra`;
      console.log(`✅ ${check.name}: OK — ${info}`);
    }
  }

  console.log('\n=== VERIFICAÇÃO CONCLUÍDA ===');
}

run().catch(console.error);
