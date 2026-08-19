// scripts/fix_rh_schema_complete.mjs
// Corrige EXACTAMENTE os campos que os services do frontend usam
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
  console.log('=== CORRIGINDO SCHEMA RH COMPLETO ===\n');

  // ─── 1. HR_ASSIDUIDADE ─────────────────────────────────────────────────────
  // attendanceService.ts usa: empresa_id, colaborador_id, mes_referencia, mapa(JSONB), is_processed, updated_at
  // upsert onConflict: 'colaborador_id,mes_referencia' → precisa UNIQUE constraint
  console.log('[1/7] Corrigindo hr_assiduidade...');
  await sql(`
    ALTER TABLE public.hr_assiduidade ADD COLUMN IF NOT EXISTS empresa_id UUID;
    ALTER TABLE public.hr_assiduidade ADD COLUMN IF NOT EXISTS colaborador_id TEXT;
    ALTER TABLE public.hr_assiduidade ADD COLUMN IF NOT EXISTS mes_referencia TEXT;
    ALTER TABLE public.hr_assiduidade ADD COLUMN IF NOT EXISTS mapa JSONB DEFAULT '{}';
    ALTER TABLE public.hr_assiduidade ADD COLUMN IF NOT EXISTS is_processed BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.hr_assiduidade ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  `);
  // Criar UNIQUE constraint (necessário para upsert onConflict)
  try {
    await sql(`
      ALTER TABLE public.hr_assiduidade 
      ADD CONSTRAINT hr_assiduidade_colaborador_mes_unique 
      UNIQUE (colaborador_id, mes_referencia);
    `);
    console.log('  ✅ UNIQUE (colaborador_id, mes_referencia) criado');
  } catch(e) {
    if (e.message.includes('already exists')) console.log('  ✅ UNIQUE constraint já existe');
    else console.log('  ⚠️  UNIQUE constraint:', e.message);
  }
  console.log('  ✅ hr_assiduidade OK\n');

  // ─── 2. HR_PROCESSAMENTOS ──────────────────────────────────────────────────
  // payrollService.ts usa: empresa_id, colaborador_id, mes_referencia, dados_processamento(JSONB), is_processed, updated_at
  // upsert onConflict: 'empresa_id,colaborador_id,mes_referencia' → precisa UNIQUE constraint
  console.log('[2/7] Corrigindo hr_processamentos...');
  await sql(`
    ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS empresa_id UUID;
    ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS colaborador_id TEXT;
    ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS mes_referencia TEXT;
    ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS dados_processamento JSONB DEFAULT '{}';
    ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS is_processed BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  `);
  try {
    await sql(`
      ALTER TABLE public.hr_processamentos 
      ADD CONSTRAINT hr_processamentos_empresa_colab_mes_unique 
      UNIQUE (empresa_id, colaborador_id, mes_referencia);
    `);
    console.log('  ✅ UNIQUE (empresa_id, colaborador_id, mes_referencia) criado');
  } catch(e) {
    if (e.message.includes('already exists')) console.log('  ✅ UNIQUE constraint já existe');
    else console.log('  ⚠️  UNIQUE constraint:', e.message);
  }
  console.log('  ✅ hr_processamentos OK\n');

  // ─── 3. HR_CONTRATOS ──────────────────────────────────────────────────────
  // contractService.ts usa: empresa_id, colaborador_id, tipo_contrato, data_inicio, fim_contrato,
  //   salario_base, content, status, representative_name, representative_role,
  //   duration_months, experimental_days, notice_days, metadata(JSONB)
  console.log('[3/7] Corrigindo hr_contratos...');
  await sql(`
    ALTER TABLE public.hr_contratos ADD COLUMN IF NOT EXISTS empresa_id UUID;
    ALTER TABLE public.hr_contratos ADD COLUMN IF NOT EXISTS colaborador_id TEXT;
    ALTER TABLE public.hr_contratos ADD COLUMN IF NOT EXISTS tipo_contrato TEXT DEFAULT 'efetivo';
    ALTER TABLE public.hr_contratos ADD COLUMN IF NOT EXISTS data_inicio DATE;
    ALTER TABLE public.hr_contratos ADD COLUMN IF NOT EXISTS fim_contrato DATE;
    ALTER TABLE public.hr_contratos ADD COLUMN IF NOT EXISTS salario_base NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE public.hr_contratos ADD COLUMN IF NOT EXISTS content TEXT;
    ALTER TABLE public.hr_contratos ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo';
    ALTER TABLE public.hr_contratos ADD COLUMN IF NOT EXISTS representative_name TEXT;
    ALTER TABLE public.hr_contratos ADD COLUMN IF NOT EXISTS representative_role TEXT;
    ALTER TABLE public.hr_contratos ADD COLUMN IF NOT EXISTS duration_months INTEGER DEFAULT 0;
    ALTER TABLE public.hr_contratos ADD COLUMN IF NOT EXISTS experimental_days INTEGER DEFAULT 0;
    ALTER TABLE public.hr_contratos ADD COLUMN IF NOT EXISTS notice_days INTEGER DEFAULT 0;
    ALTER TABLE public.hr_contratos ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
    ALTER TABLE public.hr_contratos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  `);
  console.log('  ✅ hr_contratos OK\n');

  // ─── 4. HR_ORDENS_TRANSFERENCIA ───────────────────────────────────────────
  // pagamentoService.ts usa: empresa_id, ordem_ref, mes_referencia, data_pagamento,
  //   caixa_id, caixa_name, employee_count, total_paid, dados_ordem(JSONB), updated_at
  console.log('[4/7] Corrigindo hr_ordens_transferencia...');
  await sql(`
    ALTER TABLE public.hr_ordens_transferencia ADD COLUMN IF NOT EXISTS empresa_id UUID;
    ALTER TABLE public.hr_ordens_transferencia ADD COLUMN IF NOT EXISTS ordem_ref TEXT;
    ALTER TABLE public.hr_ordens_transferencia ADD COLUMN IF NOT EXISTS mes_referencia TEXT;
    ALTER TABLE public.hr_ordens_transferencia ADD COLUMN IF NOT EXISTS data_pagamento DATE;
    ALTER TABLE public.hr_ordens_transferencia ADD COLUMN IF NOT EXISTS caixa_id UUID;
    ALTER TABLE public.hr_ordens_transferencia ADD COLUMN IF NOT EXISTS caixa_name TEXT;
    ALTER TABLE public.hr_ordens_transferencia ADD COLUMN IF NOT EXISTS employee_count INTEGER DEFAULT 0;
    ALTER TABLE public.hr_ordens_transferencia ADD COLUMN IF NOT EXISTS total_paid NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE public.hr_ordens_transferencia ADD COLUMN IF NOT EXISTS dados_ordem JSONB DEFAULT '{}';
    ALTER TABLE public.hr_ordens_transferencia ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  `);
  console.log('  ✅ hr_ordens_transferencia OK\n');

  // ─── 5. COLABORADORES ─────────────────────────────────────────────────────
  // employeeService.ts usa: empresa_id, name (NÃO "nome")
  // Também garante que a coluna name existe (não só "nome")
  console.log('[5/7] Corrigindo colaboradores...');
  await sql(`
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS empresa_id UUID;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS name TEXT;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS nome TEXT;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS bi TEXT;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS nif TEXT;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS telefone TEXT;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS email TEXT;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS morada TEXT;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS data_nascimento DATE;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS data_admissao DATE;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS data_saida DATE;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS profession_id UUID;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS cargo TEXT;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS departamento TEXT;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS salario NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo';
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS demitido BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS motivo_saida TEXT;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS inss NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS irt NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS banco TEXT;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS conta_bancaria TEXT;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS iban TEXT;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS photo_url TEXT;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS local_trabalho_id UUID;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS tipo_contrato TEXT;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS genero TEXT;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS naturalidade TEXT;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS nivel_academico TEXT;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  `);
  console.log('  ✅ colaboradores OK\n');

  // ─── 6. RLS: Garantir políticas abertas em todas as tabelas RH ──────────
  console.log('[6/7] Garantindo RLS aberto em todas tabelas RH...');
  const rhTables = [
    'hr_assiduidade', 'hr_processamentos', 'hr_contratos',
    'hr_ordens_transferencia', 'colaboradores', 'professions',
    'hr_pagamentos', 'employee_penalties', 'employee_documents'
  ];
  for (const tbl of rhTables) {
    try {
      await sql(`
        ALTER TABLE public.${tbl} ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "${tbl}_open_all" ON public.${tbl};
        CREATE POLICY "${tbl}_open_all" ON public.${tbl}
          FOR ALL USING (true) WITH CHECK (true);
      `);
      console.log(`  ✅ RLS aberto: ${tbl}`);
    } catch(e) {
      console.log(`  ⚠️  ${tbl}: ${e.message.substring(0,80)}`);
    }
  }
  console.log('');

  // ─── 7. Verificação final: listar colunas críticas ───────────────────────
  console.log('[7/7] Verificando colunas críticas...');
  const checks = [
    { table: 'hr_assiduidade', cols: ['empresa_id','colaborador_id','mes_referencia','mapa','is_processed'] },
    { table: 'hr_processamentos', cols: ['empresa_id','colaborador_id','mes_referencia','dados_processamento','is_processed'] },
    { table: 'hr_contratos', cols: ['empresa_id','colaborador_id','tipo_contrato','content','metadata'] },
    { table: 'hr_ordens_transferencia', cols: ['empresa_id','mes_referencia','dados_ordem','caixa_id'] },
    { table: 'colaboradores', cols: ['empresa_id','name','cargo','salario','demitido'] },
  ];

  let allOk = true;
  for (const check of checks) {
    const result = await sql(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name='${check.table}'
      AND column_name = ANY(ARRAY[${check.cols.map(c => `'${c}'`).join(',')}]);
    `);
    const found = result.map(r => r.column_name);
    const missing = check.cols.filter(c => !found.includes(c));
    if (missing.length > 0) {
      console.log(`  ❌ ${check.table}: AINDA FALTA: ${missing.join(', ')}`);
      allOk = false;
    } else {
      console.log(`  ✅ ${check.table}: todas as colunas presentes`);
    }
  }

  // ─── Reload schema cache ──────────────────────────────────────────────────
  await sql("NOTIFY pgrst, 'reload schema';");
  console.log('\n✅ Schema cache recarregado (PostgREST)');

  if (allOk) {
    console.log('\n🎉 TODAS AS CORREÇÕES CONCLUÍDAS! Sistema RH pronto para usar.');
  } else {
    console.log('\n⚠️  Algumas colunas ainda em falta. Verifique acima.');
  }
}

run().catch(e => { console.error('Erro global:', e); process.exit(1); });

