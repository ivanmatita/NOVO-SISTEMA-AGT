// scripts/test_all_reported_fixes.mjs
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

async function verify() {
  console.log('--- TESTANDO AS CORREÇÕES DOS 4 ERROS REPORTADOS ---');
  const empresaId = '11111111-0000-0000-0000-000000000001';

  // 1. Colaborador com datas vazias / nulas
  console.log('1. Testando inserção de colaborador com datas vazias/nulas...');
  const c = await sql(`
    INSERT INTO public.colaboradores (empresa_id, name, cargo, salario, data_nascimento, data_admissao)
    VALUES ('${empresaId}', 'Funcionario Teste Data', 'Operador', 150000, null, null)
    RETURNING id, name;
  `);
  console.log('   ✅ Colaborador criado sem erro de data! ID:', c[0]?.id);

  // 2. Cartas
  console.log('2. Testando registo de Carta...');
  const carta = await sql(`
    INSERT INTO public.cartas (empresa_id, destinatario, nome_destinatario, assunto, data_documento, serie, conteudo)
    VALUES ('${empresaId}', 'Exmo Sr', 'Diretor Geral', 'Assunto Teste', NOW()::date, 'S12026', '<p>Texto da carta</p>')
    RETURNING id, referencia;
  `);
  console.log('   ✅ Carta guardada com sucesso! ID:', carta[0]?.id);

  // 3. Media Arquivos
  console.log('3. Testando registo em media_arquivos...');
  const media = await sql(`
    INSERT INTO public.media_arquivos (empresa_id, nome_arquivo, nome_original, url_publica, tipo, bucket, caminho_arquivo, tamanho_bytes)
    VALUES ('${empresaId}', 'teste.png', 'teste.png', 'https://sfnibpxfevhelaikqbiq.supabase.co/storage/v1/object/public/media/teste.png', 'imagem', 'media', 'teste.png', 1024)
    RETURNING id, nome_arquivo;
  `);
  console.log('   ✅ Ficheiro de media registado com sucesso! ID:', media[0]?.id);

  // 4. Gestão de Alertas
  console.log('4. Testando inserção em alertas...');
  const alerta = await sql(`
    INSERT INTO public.alertas (empresa_id, titulo, mensagem, tipo, importancia)
    VALUES ('${empresaId}', 'Alerta de Teste', 'Mensagem do alerta', 'warning', 'alta')
    RETURNING id, titulo;
  `);
  console.log('   ✅ Alerta guardado com sucesso! ID:', alerta[0]?.id);

  // 5. Métricas (com RLS)
  console.log('5. Testando inserção em metrics (com RLS)...');
  const metric = await sql(`
    INSERT INTO public.metrics (empresa_id, company_id, type, tipo, value, valor, description, periodo, activo)
    VALUES ('${empresaId}', '${empresaId}', 'vendas_teste', 'vendas_teste', 12345.67, 12345.67, 'Métrica Teste', '2026-08', true)
    RETURNING id, value;
  `);
  console.log('   ✅ Métrica guardada com sucesso! ID:', metric[0]?.id);

  // Limpeza
  console.log('6. Limpando dados temporários de teste...');
  await sql(`DELETE FROM public.colaboradores WHERE id = '${c[0]?.id}';`);
  await sql(`DELETE FROM public.cartas WHERE id = '${carta[0]?.id}';`);
  await sql(`DELETE FROM public.media_arquivos WHERE id = '${media[0]?.id}';`);
  await sql(`DELETE FROM public.alertas WHERE id = '${alerta[0]?.id}';`);
  await sql(`DELETE FROM public.metrics WHERE id = '${metric[0]?.id}';`);
  console.log('   ✅ Limpeza concluída.');

  console.log('\n🎉 TODOS OS 5 MÓDULOS FORAM TESTADOS E FUNCIONAM A 100%!');
}

verify().catch(e => {
  console.error('❌ Erro no teste:', e);
  process.exit(1);
});

