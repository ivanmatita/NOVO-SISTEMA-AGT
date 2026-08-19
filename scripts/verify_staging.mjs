// scripts/verify_staging.mjs
const token = 'process.env.SUPABASE_TOKEN';
const stagingRef = 'sfnibpxfevhelaikqbiq';

async function testQuery() {
  const res = await fetch(`https://api.supabase.com/v1/projects/${stagingRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: `
        SELECT 
          (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'empresas' AND column_name = 'auth_user_id') as empresas_auth_user_id,
          (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'clientes' AND column_name = 'codigo_postal') as clientes_codigo_postal,
          (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'media_arquivos' AND column_name = 'url_publica') as media_url_publica,
          (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'produtos' AND column_name = 'name') as produtos_name,
          (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'metrics' AND column_name = 'activo') as metrics_activo,
          (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'alertas_tarefas' AND column_name = 'start_date') as alertas_start_date,
          (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'user_activities_sessions' AND column_name = 'utilizador_id') as sessions_utilizador_id;
      `
    })
  });
  const data = await res.json();
  console.log('Verificação de paridade de colunas críticas no Staging:', data);
}

testQuery();

