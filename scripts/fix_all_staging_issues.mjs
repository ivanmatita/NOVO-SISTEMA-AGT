// scripts/fix_all_staging_issues.mjs
const token = 'process.env.SUPABASE_TOKEN';
const prodRef = 'nawqfidnawokqaheqvar';
const stagingRef = 'sfnibpxfevhelaikqbiq';

async function queryDb(ref, sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Query error on ${ref}: ${errText}`);
  }
  return await res.json();
}

async function getColsFromProd(tableName) {
  return await queryDb(prodRef, `
    SELECT column_name, data_type, udt_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = '${tableName}'
    ORDER BY ordinal_position;
  `);
}

function buildAlterSql(tableName, cols) {
  const stmts = [];
  for (const c of cols) {
    let colType = c.data_type;
    if (colType === 'USER-DEFINED') colType = c.udt_name;
    else if (colType === 'ARRAY' || (c.udt_name && c.udt_name.startsWith('_'))) colType = 'TEXT[]';
    else if (colType === 'character varying') colType = 'TEXT';
    stmts.push(`ALTER TABLE public."${tableName}" ADD COLUMN IF NOT EXISTS "${c.column_name}" ${colType};`);
  }
  return stmts.join('\n');
}

async function syncTableFromProd(tableName) {
  console.log(`\nSincronizando tabela: ${tableName}`);
  const prodCols = await getColsFromProd(tableName);
  const stagingCols = await queryDb(stagingRef, `
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = '${tableName}';
  `);
  const stagingColNames = new Set(stagingCols.map(c => c.column_name));
  const missingCols = prodCols.filter(c => !stagingColNames.has(c.column_name));

  if (missingCols.length === 0) {
    console.log(`  ✅ ${tableName}: nenhuma coluna em falta`);
    return;
  }

  console.log(`  ⚠️  ${tableName}: ${missingCols.length} colunas em falta: ${missingCols.map(c => c.column_name).join(', ')}`);
  const sql = buildAlterSql(tableName, missingCols);
  await queryDb(stagingRef, sql);
  console.log(`  ✅ ${tableName}: colunas adicionadas`);
}

async function run() {
  // 1. TABELAS COM ERROS REPORTADOS
  const tablesToSync = [
    'compras',          // caixa column missing
    'series_fiscais',   // tipo_documento NOT NULL
    'colaboradores',    // RH pages
    'hr_contratos',     // contratos
    'hr_assiduidade',   // assiduidade
    'hr_processamentos',// processamento
    'hr_pagamentos',    // pagar salário
    'hr_ordens_transferencia',
    'professions',      // profissões
    // Gestão de Segurança Privada
    'seg_guardas',
    'seg_postos',
    'seg_escalas',
    'seg_ocorrencias',
    'seg_relatorios',
    // Outros que possam ter issues
    'documentos_emitidos',
    'clientes',
    'produtos',
    'vendas',
  ];

  for (const tbl of tablesToSync) {
    try {
      await syncTableFromProd(tbl);
    } catch (e) {
      console.error(`  ❌ Erro ao sincronizar ${tbl}:`, e.message);
    }
  }

  // 2. CORRIGIR series_fiscais — tipo_documento NOT NULL -> nullable com default
  console.log('\nCorrigindo constraint NOT NULL em series_fiscais...');
  await queryDb(stagingRef, `
    ALTER TABLE public.series_fiscais ALTER COLUMN tipo_documento DROP NOT NULL;
    ALTER TABLE public.series_fiscais ALTER COLUMN tipo_documento SET DEFAULT 'FR';
    ALTER TABLE public.series_fiscais ALTER COLUMN tipo SET DEFAULT 'FR';
    
    -- Preencher registos com tipo_documento nulo
    UPDATE public.series_fiscais
    SET tipo_documento = COALESCE(tipo_documento, tipo, prefixo, 'FR')
    WHERE tipo_documento IS NULL;

    UPDATE public.series_fiscais
    SET tipo = COALESCE(tipo, tipo_documento, prefixo, 'FR')
    WHERE tipo IS NULL;
  `);
  console.log('✅ series_fiscais tipo_documento corrigido.');

  // 3. CORRIGIR compras — caixa e outros campos em falta
  console.log('\nCorrigindo tabela compras com campos essenciais...');
  await queryDb(stagingRef, `
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS caixa TEXT;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS caixa_id UUID;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS metodo_pagamento TEXT DEFAULT 'Dinheiro';
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'pendente';
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS total_geral NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS total_iva NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS total_sem_iva NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS moeda TEXT DEFAULT 'AOA';
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS itens JSONB DEFAULT '[]';
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS observacoes TEXT;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS referencia TEXT;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS local_obra TEXT;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS aprovado_por TEXT;
  `);
  console.log('✅ Tabela compras corrigida.');

  // 4. CRIAR TABELAS DE SEGURANÇA PRIVADA se não existirem
  console.log('\nCriando tabelas de Gestão de Segurança Privada...');
  await queryDb(stagingRef, `
    CREATE TABLE IF NOT EXISTS public.seg_guardas (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      empresa_id UUID,
      company_id UUID,
      nome TEXT,
      bi TEXT,
      nif TEXT,
      telefone TEXT,
      email TEXT,
      morada TEXT,
      posto TEXT,
      categoria TEXT,
      data_admissao DATE,
      salario NUMERIC(15,2) DEFAULT 0,
      ativo BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE public.seg_guardas ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "seg_guardas_all" ON public.seg_guardas;
    CREATE POLICY "seg_guardas_all" ON public.seg_guardas FOR ALL USING (true) WITH CHECK (true);

    CREATE TABLE IF NOT EXISTS public.seg_postos (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      empresa_id UUID,
      company_id UUID,
      nome TEXT,
      cliente TEXT,
      morada TEXT,
      tipo TEXT,
      responsavel TEXT,
      horario TEXT,
      guardas_necessarios INTEGER DEFAULT 1,
      ativo BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE public.seg_postos ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "seg_postos_all" ON public.seg_postos;
    CREATE POLICY "seg_postos_all" ON public.seg_postos FOR ALL USING (true) WITH CHECK (true);

    CREATE TABLE IF NOT EXISTS public.seg_escalas (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      empresa_id UUID,
      company_id UUID,
      guarda_id UUID,
      posto_id UUID,
      data_inicio DATE,
      data_fim DATE,
      turno TEXT,
      horario_entrada TIME,
      horario_saida TIME,
      horas_trabalhadas NUMERIC(5,2) DEFAULT 0,
      status TEXT DEFAULT 'ativo',
      observacoes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE public.seg_escalas ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "seg_escalas_all" ON public.seg_escalas;
    CREATE POLICY "seg_escalas_all" ON public.seg_escalas FOR ALL USING (true) WITH CHECK (true);

    CREATE TABLE IF NOT EXISTS public.seg_ocorrencias (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      empresa_id UUID,
      company_id UUID,
      posto_id UUID,
      guarda_id UUID,
      tipo TEXT,
      descricao TEXT,
      data_ocorrencia TIMESTAMPTZ DEFAULT NOW(),
      gravidade TEXT DEFAULT 'baixa',
      resolvido BOOLEAN DEFAULT FALSE,
      resolucao TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE public.seg_ocorrencias ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "seg_ocorrencias_all" ON public.seg_ocorrencias;
    CREATE POLICY "seg_ocorrencias_all" ON public.seg_ocorrencias FOR ALL USING (true) WITH CHECK (true);

    CREATE TABLE IF NOT EXISTS public.seg_relatorios (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      empresa_id UUID,
      company_id UUID,
      titulo TEXT,
      tipo TEXT,
      conteudo TEXT,
      data_relatorio DATE,
      criado_por TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE public.seg_relatorios ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "seg_relatorios_all" ON public.seg_relatorios;
    CREATE POLICY "seg_relatorios_all" ON public.seg_relatorios FOR ALL USING (true) WITH CHECK (true);
  `);
  console.log('✅ Tabelas de Segurança Privada criadas/atualizadas.');

  // 5. RH — garantir colunas críticas em hr_*
  console.log('\nCorrigindo tabelas RH...');
  await queryDb(stagingRef, `
    -- HR_ASSIDUIDADE
    ALTER TABLE public.hr_assiduidade ADD COLUMN IF NOT EXISTS colaborador_id INTEGER;
    ALTER TABLE public.hr_assiduidade ADD COLUMN IF NOT EXISTS employee_id INTEGER;
    ALTER TABLE public.hr_assiduidade ADD COLUMN IF NOT EXISTS empresa_id UUID;
    ALTER TABLE public.hr_assiduidade ADD COLUMN IF NOT EXISTS company_id UUID;
    ALTER TABLE public.hr_assiduidade ADD COLUMN IF NOT EXISTS data DATE;
    ALTER TABLE public.hr_assiduidade ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'presente';
    ALTER TABLE public.hr_assiduidade ADD COLUMN IF NOT EXISTS hora_entrada TIME;
    ALTER TABLE public.hr_assiduidade ADD COLUMN IF NOT EXISTS hora_saida TIME;
    ALTER TABLE public.hr_assiduidade ADD COLUMN IF NOT EXISTS horas_trabalhadas NUMERIC(5,2) DEFAULT 0;
    ALTER TABLE public.hr_assiduidade ADD COLUMN IF NOT EXISTS justificacao TEXT;
    ALTER TABLE public.hr_assiduidade ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'normal';

    -- COLABORADORES
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS empresa_id UUID;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS company_id UUID;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS nome TEXT;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS name TEXT;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS bi TEXT;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS nif TEXT;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS telefone TEXT;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS email TEXT;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS morada TEXT;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS data_nascimento DATE;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS data_admissao DATE;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS data_saida DATE;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS profession_id UUID;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS profession TEXT;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS cargo TEXT;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS departamento TEXT;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS salario NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo';
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'ativo';
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS demitido BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS motivo_saida TEXT;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS inss NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS irt NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS banco TEXT;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS conta_bancaria TEXT;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS iban TEXT;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS local_trabalho_id UUID;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS photo_url TEXT;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS user_id UUID;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS contrato_id UUID;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS tipo_contrato TEXT;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS genero TEXT;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS naturalidade TEXT;
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS nivel_academico TEXT;

    -- HR_CONTRATOS
    ALTER TABLE public.hr_contratos ADD COLUMN IF NOT EXISTS colaborador_id INTEGER;
    ALTER TABLE public.hr_contratos ADD COLUMN IF NOT EXISTS employee_id INTEGER;
    ALTER TABLE public.hr_contratos ADD COLUMN IF NOT EXISTS empresa_id UUID;
    ALTER TABLE public.hr_contratos ADD COLUMN IF NOT EXISTS company_id UUID;
    ALTER TABLE public.hr_contratos ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'efectivo';
    ALTER TABLE public.hr_contratos ADD COLUMN IF NOT EXISTS data_inicio DATE;
    ALTER TABLE public.hr_contratos ADD COLUMN IF NOT EXISTS data_fim DATE;
    ALTER TABLE public.hr_contratos ADD COLUMN IF NOT EXISTS salario_base NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE public.hr_contratos ADD COLUMN IF NOT EXISTS salario NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE public.hr_contratos ADD COLUMN IF NOT EXISTS cargo TEXT;
    ALTER TABLE public.hr_contratos ADD COLUMN IF NOT EXISTS departamento TEXT;
    ALTER TABLE public.hr_contratos ADD COLUMN IF NOT EXISTS funcao TEXT;
    ALTER TABLE public.hr_contratos ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'ativo';
    ALTER TABLE public.hr_contratos ADD COLUMN IF NOT EXISTS observacoes TEXT;
    ALTER TABLE public.hr_contratos ADD COLUMN IF NOT EXISTS url_documento TEXT;

    -- HR_PROCESSAMENTOS
    ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS colaborador_id INTEGER;
    ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS employee_id INTEGER;
    ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS empresa_id UUID;
    ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS company_id UUID;
    ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS mes INTEGER;
    ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS ano INTEGER;
    ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS mes_ano TEXT;
    ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS salario_base NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS salario_bruto NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS salario_liquido NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS inss_trabalhador NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS inss_entidade NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS irt NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS subsidio_alimentacao NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS subsidio_transporte NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS horas_extras NUMERIC(5,2) DEFAULT 0;
    ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS valor_horas_extras NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS faltas INTEGER DEFAULT 0;
    ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS desconto_faltas NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'pendente';
    ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS pago BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS data_pagamento DATE;
    ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS outros_descontos NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS outros_subsidios NUMERIC(15,2) DEFAULT 0;

    -- HR_PAGAMENTOS (Pagar Salário)
    ALTER TABLE public.hr_pagamentos ADD COLUMN IF NOT EXISTS colaborador_id INTEGER;
    ALTER TABLE public.hr_pagamentos ADD COLUMN IF NOT EXISTS employee_id INTEGER;
    ALTER TABLE public.hr_pagamentos ADD COLUMN IF NOT EXISTS empresa_id UUID;
    ALTER TABLE public.hr_pagamentos ADD COLUMN IF NOT EXISTS company_id UUID;
    ALTER TABLE public.hr_pagamentos ADD COLUMN IF NOT EXISTS processamento_id UUID;
    ALTER TABLE public.hr_pagamentos ADD COLUMN IF NOT EXISTS valor NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE public.hr_pagamentos ADD COLUMN IF NOT EXISTS metodo TEXT DEFAULT 'transferencia';
    ALTER TABLE public.hr_pagamentos ADD COLUMN IF NOT EXISTS banco TEXT;
    ALTER TABLE public.hr_pagamentos ADD COLUMN IF NOT EXISTS conta TEXT;
    ALTER TABLE public.hr_pagamentos ADD COLUMN IF NOT EXISTS data_pagamento DATE;
    ALTER TABLE public.hr_pagamentos ADD COLUMN IF NOT EXISTS mes INTEGER;
    ALTER TABLE public.hr_pagamentos ADD COLUMN IF NOT EXISTS ano INTEGER;
    ALTER TABLE public.hr_pagamentos ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'pago';
    ALTER TABLE public.hr_pagamentos ADD COLUMN IF NOT EXISTS referencia TEXT;
    ALTER TABLE public.hr_pagamentos ADD COLUMN IF NOT EXISTS observacoes TEXT;

    -- HR_ORDENS_TRANSFERENCIA
    ALTER TABLE public.hr_ordens_transferencia ADD COLUMN IF NOT EXISTS empresa_id UUID;
    ALTER TABLE public.hr_ordens_transferencia ADD COLUMN IF NOT EXISTS company_id UUID;
    ALTER TABLE public.hr_ordens_transferencia ADD COLUMN IF NOT EXISTS processamento_id UUID;
    ALTER TABLE public.hr_ordens_transferencia ADD COLUMN IF NOT EXISTS mes_ano TEXT;
    ALTER TABLE public.hr_ordens_transferencia ADD COLUMN IF NOT EXISTS total NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE public.hr_ordens_transferencia ADD COLUMN IF NOT EXISTS num_colaboradores INTEGER DEFAULT 0;
    ALTER TABLE public.hr_ordens_transferencia ADD COLUMN IF NOT EXISTS banco TEXT;
    ALTER TABLE public.hr_ordens_transferencia ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'pendente';
    ALTER TABLE public.hr_ordens_transferencia ADD COLUMN IF NOT EXISTS aprovado_por TEXT;
    ALTER TABLE public.hr_ordens_transferencia ADD COLUMN IF NOT EXISTS data_aprovacao TIMESTAMPTZ;
    ALTER TABLE public.hr_ordens_transferencia ADD COLUMN IF NOT EXISTS referencia TEXT;
    ALTER TABLE public.hr_ordens_transferencia ADD COLUMN IF NOT EXISTS detalhes JSONB DEFAULT '[]';
  `);
  console.log('✅ Tabelas RH corrigidas.');

  // 6. Reload schema
  await queryDb(stagingRef, "NOTIFY pgrst, 'reload schema';");
  console.log('\n✅ SCHEMA RELOAD notificado com sucesso!');
  console.log('✅ TODAS AS CORREÇÕES CONCLUÍDAS COM SUCESSO!');
}

run().catch(e => console.error('Erro global:', e));

