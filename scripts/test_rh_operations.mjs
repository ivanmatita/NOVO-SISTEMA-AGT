// scripts/test_rh_operations.mjs
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

async function testRH() {
  console.log('--- TESTANDO OPERAÇÕES DE RECURSOS HUMANOS ---');
  const empresaId = '11111111-0000-0000-0000-000000000001';

  // 1. Colaborador
  console.log('1. Testando inserção em colaboradores...');
  const colab = await sql(`
    INSERT INTO public.colaboradores (empresa_id, name, nome, cargo, salario, status, demitido)
    VALUES ('${empresaId}', 'Colaborador Teste', 'Colaborador Teste', 'Técnico TI', 250000, 'ativo', false)
    RETURNING id, name;
  `);
  console.log('   ✅ Colaborador criado com ID:', colab[0]?.id);
  const colabId = colab[0]?.id;

  // 2. Assiduidade Upsert
  console.log('2. Testando upsert em hr_assiduidade...');
  const assid = await sql(`
    INSERT INTO public.hr_assiduidade (empresa_id, colaborador_id, mes_referencia, mapa, is_processed)
    VALUES ('${empresaId}', '${colabId}', '2026-08', '{"1": "P", "2": "P", "3": "F"}'::jsonb, false)
    ON CONFLICT (colaborador_id, mes_referencia)
    DO UPDATE SET mapa = EXCLUDED.mapa, updated_at = NOW()
    RETURNING id, colaborador_id, mes_referencia;
  `);
  console.log('   ✅ Assiduidade inserida/atualizada com sucesso:', assid[0]?.id);

  // 3. Contratos
  console.log('3. Testando inserção em hr_contratos...');
  const contrato = await sql(`
    INSERT INTO public.hr_contratos (empresa_id, colaborador_id, tipo_contrato, salario_base, status, metadata)
    VALUES ('${empresaId}', '${colabId}', 'efetivo', 250000, 'ativo', '{"employee_name": "Colaborador Teste"}'::jsonb)
    RETURNING id, tipo_contrato;
  `);
  console.log('   ✅ Contrato criado com ID:', contrato[0]?.id);

  // 4. Processamento de Salários
  console.log('4. Testando upsert em hr_processamentos...');
  const proc = await sql(`
    INSERT INTO public.hr_processamentos (empresa_id, colaborador_id, mes_referencia, dados_processamento, is_processed)
    VALUES ('${empresaId}', '${colabId}', '2026-08', '{"salario_base": 250000, "inss": 7500, "liquido": 242500}'::jsonb, true)
    ON CONFLICT (empresa_id, colaborador_id, mes_referencia)
    DO UPDATE SET dados_processamento = EXCLUDED.dados_processamento
    RETURNING id, mes_referencia;
  `);
  console.log('   ✅ Processamento criado/atualizado com ID:', proc[0]?.id);

  // 5. Ordens de Transferência / Pagamento
  console.log('5. Testando inserção em hr_ordens_transferencia...');
  const ordem = await sql(`
    INSERT INTO public.hr_ordens_transferencia (empresa_id, mes_referencia, employee_count, total_paid, dados_ordem)
    VALUES ('${empresaId}', '2026-08', 1, 242500, '{"banco": "BAI", "metodo": "transferencia"}'::jsonb)
    RETURNING id, total_paid;
  `);
  console.log('   ✅ Ordem de transferência criada com ID:', ordem[0]?.id);

  // 6. Profissões
  console.log('6. Testando inserção em professions...');
  const prof = await sql(`
    INSERT INTO public.professions (empresa_id, name, inss_profession, base_salary, acerto_salarial)
    VALUES ('${empresaId}', 'Engenheiro de Software', 'Técnico Superior', 350000, 0)
    RETURNING id, name;
  `);
  console.log('   ✅ Profissão criada com ID:', prof[0]?.id);

  // Limpeza dos registos de teste
  console.log('7. Limpando dados de teste...');
  await sql(`DELETE FROM public.hr_ordens_transferencia WHERE id = '${ordem[0]?.id}';`);
  await sql(`DELETE FROM public.hr_processamentos WHERE id = '${proc[0]?.id}';`);
  await sql(`DELETE FROM public.hr_contratos WHERE id = '${contrato[0]?.id}';`);
  await sql(`DELETE FROM public.hr_assiduidade WHERE id = '${assid[0]?.id}';`);
  await sql(`DELETE FROM public.professions WHERE id = '${prof[0]?.id}';`);
  await sql(`DELETE FROM public.colaboradores WHERE id = '${colabId}';`);
  console.log('   ✅ Testes finalizados com sucesso total!');
}

testRH().catch(e => {
  console.error('❌ Erro no teste:', e);
  process.exit(1);
});

