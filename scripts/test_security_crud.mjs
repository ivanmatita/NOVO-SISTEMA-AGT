// scripts/test_security_crud.mjs
const token = 'process.env.SUPABASE_TOKEN';
const stagingRef = 'sfnibpxfevhelaikqbiq';

async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${stagingRef}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || JSON.stringify(json));
  return json;
}

async function run() {
  console.log('--- TESTANDO INSERÇÃO NAS 5 TABELAS DE SEGURANÇA PRIVADA ---');
  const empresaId = '11111111-0000-0000-0000-000000000001';

  // 1. Vigilante
  const v = await sql(`
    INSERT INTO public.seg_vigilantes (empresa_id, nome, bi_numero, telefone, categoria, status)
    VALUES ('${empresaId}', 'João Manuel Vigilante', '001234567LA045', '+244923000111', 'Vigilante Operacional', 'ativo')
    RETURNING id, nome, bi_numero;
  `);
  console.log('✅ 1. seg_vigilantes:', v[0]);

  // 2. Posto
  const p = await sql(`
    INSERT INTO public.seg_postos (empresa_id, nome, localizacao, cliente_nome, status)
    VALUES ('${empresaId}', 'Posto Banco BFA Talatona', 'Talatona', 'Banco BFA', 'ativo')
    RETURNING id, nome, localizacao;
  `);
  console.log('✅ 2. seg_postos:', p[0]);

  // 3. Escala
  const e = await sql(`
    INSERT INTO public.seg_escalas (empresa_id, turno, data_servico, posto_id, vigilante_id, status)
    VALUES ('${empresaId}', 'Dia (07h-19h)', CURRENT_DATE, '${p[0].id}', '${v[0].id}', 'escalado')
    RETURNING id, turno, data_servico;
  `);
  console.log('✅ 3. seg_escalas:', e[0]);

  // 4. Armaria
  const a = await sql(`
    INSERT INTO public.seg_armaria (empresa_id, modelo, numero_serie, tipo, status)
    VALUES ('${empresaId}', 'Pistola Glock 17', 'GLK-99214', 'Arma de Fogo', 'disponivel')
    RETURNING id, modelo, numero_serie;
  `);
  console.log('✅ 4. seg_armaria:', a[0]);

  // 5. Ocorrência
  const o = await sql(`
    INSERT INTO public.seg_ocorrencias (empresa_id, titulo, tipo_ocorrencia, severidade, status, descricao)
    VALUES ('${empresaId}', 'Ronda Preventiva Concluída', 'Outro', 'Baixa', 'resolvido', 'Ronda efectuada sem alterações no perímetro.')
    RETURNING id, titulo, tipo_ocorrencia;
  `);
  console.log('✅ 5. seg_ocorrencias:', o[0]);

  console.log('\n🎉 TODAS AS 5 TABELAS DE SEGURANÇA PRIVADA FUNCIONAM PERFEITAMENTE!');
}

run().catch(err => {
  console.error('❌ Erro no teste de segurança:', err);
  process.exit(1);
});

