// scripts/fix_security_and_compras_full.mjs
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
  console.log('=== 1. CRIANDO / ATUALIZANDO TABELAS DE SEGURANÇA PRIVADA ===\n');

  // seg_vigilantes
  await sql(`
    CREATE TABLE IF NOT EXISTS public.seg_vigilantes (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      empresa_id UUID,
      nome TEXT NOT NULL,
      matricula TEXT,
      nif TEXT,
      bi_numero TEXT,
      data_nascimento DATE,
      telefone TEXT,
      email TEXT,
      morada TEXT,
      categoria TEXT DEFAULT 'Vigilante Operacional',
      numero_cartao_profissional TEXT,
      validade_cartao DATE,
      porte_arma BOOLEAN DEFAULT FALSE,
      posto_id TEXT,
      salario_base NUMERIC(15,2),
      data_admissao DATE DEFAULT CURRENT_DATE,
      status TEXT DEFAULT 'ativo',
      observacoes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE public.seg_vigilantes ADD COLUMN IF NOT EXISTS bi_numero TEXT;
    ALTER TABLE public.seg_vigilantes ADD COLUMN IF NOT EXISTS matricula TEXT;
    ALTER TABLE public.seg_vigilantes ADD COLUMN IF NOT EXISTS nif TEXT;
    ALTER TABLE public.seg_vigilantes ADD COLUMN IF NOT EXISTS data_nascimento DATE;
    ALTER TABLE public.seg_vigilantes ADD COLUMN IF NOT EXISTS telefone TEXT;
    ALTER TABLE public.seg_vigilantes ADD COLUMN IF NOT EXISTS email TEXT;
    ALTER TABLE public.seg_vigilantes ADD COLUMN IF NOT EXISTS morada TEXT;
    ALTER TABLE public.seg_vigilantes ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'Vigilante Operacional';
    ALTER TABLE public.seg_vigilantes ADD COLUMN IF NOT EXISTS numero_cartao_profissional TEXT;
    ALTER TABLE public.seg_vigilantes ADD COLUMN IF NOT EXISTS validade_cartao DATE;
    ALTER TABLE public.seg_vigilantes ADD COLUMN IF NOT EXISTS porte_arma BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.seg_vigilantes ADD COLUMN IF NOT EXISTS posto_id TEXT;
    ALTER TABLE public.seg_vigilantes ADD COLUMN IF NOT EXISTS salario_base NUMERIC(15,2);
    ALTER TABLE public.seg_vigilantes ADD COLUMN IF NOT EXISTS data_admissao DATE;
    ALTER TABLE public.seg_vigilantes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo';
    ALTER TABLE public.seg_vigilantes ADD COLUMN IF NOT EXISTS observacoes TEXT;
    ALTER TABLE public.seg_vigilantes ADD COLUMN IF NOT EXISTS empresa_id UUID;

    ALTER TABLE public.seg_vigilantes ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "seg_vigilantes_all" ON public.seg_vigilantes;
    CREATE POLICY "seg_vigilantes_all" ON public.seg_vigilantes FOR ALL USING (true) WITH CHECK (true);
  `);
  console.log('  ✅ seg_vigilantes OK');

  // seg_postos
  await sql(`
    CREATE TABLE IF NOT EXISTS public.seg_postos (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      empresa_id UUID,
      nome TEXT NOT NULL,
      localizacao TEXT,
      morada_completa TEXT,
      cliente_nome TEXT,
      cliente_nif TEXT,
      cliente_telefone TEXT,
      tipo_posto TEXT DEFAULT 'Institucional',
      efetivo_minimo INTEGER DEFAULT 1,
      turno_servico TEXT DEFAULT 'Diurno',
      valor_mensal NUMERIC(15,2),
      responsavel_id TEXT,
      status TEXT DEFAULT 'ativo',
      instrucoes_especiais TEXT,
      data_inicio_contrato DATE,
      data_fim_contrato DATE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE public.seg_postos ADD COLUMN IF NOT EXISTS localizacao TEXT;
    ALTER TABLE public.seg_postos ADD COLUMN IF NOT EXISTS morada_completa TEXT;
    ALTER TABLE public.seg_postos ADD COLUMN IF NOT EXISTS cliente_nome TEXT;
    ALTER TABLE public.seg_postos ADD COLUMN IF NOT EXISTS cliente_nif TEXT;
    ALTER TABLE public.seg_postos ADD COLUMN IF NOT EXISTS cliente_telefone TEXT;
    ALTER TABLE public.seg_postos ADD COLUMN IF NOT EXISTS tipo_posto TEXT DEFAULT 'Institucional';
    ALTER TABLE public.seg_postos ADD COLUMN IF NOT EXISTS efetivo_minimo INTEGER DEFAULT 1;
    ALTER TABLE public.seg_postos ADD COLUMN IF NOT EXISTS turno_servico TEXT DEFAULT 'Diurno';
    ALTER TABLE public.seg_postos ADD COLUMN IF NOT EXISTS valor_mensal NUMERIC(15,2);
    ALTER TABLE public.seg_postos ADD COLUMN IF NOT EXISTS responsavel_id TEXT;
    ALTER TABLE public.seg_postos ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo';
    ALTER TABLE public.seg_postos ADD COLUMN IF NOT EXISTS instrucoes_especiais TEXT;
    ALTER TABLE public.seg_postos ADD COLUMN IF NOT EXISTS data_inicio_contrato DATE;
    ALTER TABLE public.seg_postos ADD COLUMN IF NOT EXISTS data_fim_contrato DATE;
    ALTER TABLE public.seg_postos ADD COLUMN IF NOT EXISTS empresa_id UUID;

    ALTER TABLE public.seg_postos ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "seg_postos_all" ON public.seg_postos;
    CREATE POLICY "seg_postos_all" ON public.seg_postos FOR ALL USING (true) WITH CHECK (true);
  `);
  console.log('  ✅ seg_postos OK');

  // seg_escalas
  await sql(`
    CREATE TABLE IF NOT EXISTS public.seg_escalas (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      empresa_id UUID,
      turno TEXT DEFAULT 'Dia (07h-19h)',
      data_servico DATE DEFAULT CURRENT_DATE,
      hora_entrada TIME DEFAULT '07:00',
      hora_saida TIME DEFAULT '19:00',
      posto_id TEXT,
      posto_nome TEXT,
      vigilante_id TEXT,
      vigilante_nome TEXT,
      status TEXT DEFAULT 'escalado',
      substituicao BOOLEAN DEFAULT FALSE,
      observacoes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE public.seg_escalas ADD COLUMN IF NOT EXISTS turno TEXT;
    ALTER TABLE public.seg_escalas ADD COLUMN IF NOT EXISTS data_servico DATE;
    ALTER TABLE public.seg_escalas ADD COLUMN IF NOT EXISTS hora_entrada TIME;
    ALTER TABLE public.seg_escalas ADD COLUMN IF NOT EXISTS hora_saida TIME;
    ALTER TABLE public.seg_escalas ADD COLUMN IF NOT EXISTS posto_id TEXT;
    ALTER TABLE public.seg_escalas ADD COLUMN IF NOT EXISTS posto_nome TEXT;
    ALTER TABLE public.seg_escalas ADD COLUMN IF NOT EXISTS vigilante_id TEXT;
    ALTER TABLE public.seg_escalas ADD COLUMN IF NOT EXISTS vigilante_nome TEXT;
    ALTER TABLE public.seg_escalas ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'escalado';
    ALTER TABLE public.seg_escalas ADD COLUMN IF NOT EXISTS substituicao BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.seg_escalas ADD COLUMN IF NOT EXISTS observacoes TEXT;
    ALTER TABLE public.seg_escalas ADD COLUMN IF NOT EXISTS empresa_id UUID;

    ALTER TABLE public.seg_escalas ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "seg_escalas_all" ON public.seg_escalas;
    CREATE POLICY "seg_escalas_all" ON public.seg_escalas FOR ALL USING (true) WITH CHECK (true);
  `);
  console.log('  ✅ seg_escalas OK');

  // seg_armaria
  await sql(`
    CREATE TABLE IF NOT EXISTS public.seg_armaria (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      empresa_id UUID,
      modelo TEXT,
      numero_serie TEXT,
      tipo TEXT DEFAULT 'Arma de Fogo',
      calibre TEXT,
      fabricante TEXT,
      ano_fabricacao TEXT,
      estado_conservacao TEXT DEFAULT 'Bom',
      licenca_numero TEXT,
      licenca_validade DATE,
      quantidade_municao INTEGER DEFAULT 0,
      status TEXT DEFAULT 'disponivel',
      localizacao_armaria TEXT,
      observacoes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE public.seg_armaria ADD COLUMN IF NOT EXISTS modelo TEXT;
    ALTER TABLE public.seg_armaria ADD COLUMN IF NOT EXISTS numero_serie TEXT;
    ALTER TABLE public.seg_armaria ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'Arma de Fogo';
    ALTER TABLE public.seg_armaria ADD COLUMN IF NOT EXISTS calibre TEXT;
    ALTER TABLE public.seg_armaria ADD COLUMN IF NOT EXISTS fabricante TEXT;
    ALTER TABLE public.seg_armaria ADD COLUMN IF NOT EXISTS ano_fabricacao TEXT;
    ALTER TABLE public.seg_armaria ADD COLUMN IF NOT EXISTS estado_conservacao TEXT DEFAULT 'Bom';
    ALTER TABLE public.seg_armaria ADD COLUMN IF NOT EXISTS licenca_numero TEXT;
    ALTER TABLE public.seg_armaria ADD COLUMN IF NOT EXISTS licenca_validade DATE;
    ALTER TABLE public.seg_armaria ADD COLUMN IF NOT EXISTS quantidade_municao INTEGER DEFAULT 0;
    ALTER TABLE public.seg_armaria ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'disponivel';
    ALTER TABLE public.seg_armaria ADD COLUMN IF NOT EXISTS localizacao_armaria TEXT;
    ALTER TABLE public.seg_armaria ADD COLUMN IF NOT EXISTS observacoes TEXT;
    ALTER TABLE public.seg_armaria ADD COLUMN IF NOT EXISTS empresa_id UUID;

    ALTER TABLE public.seg_armaria ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "seg_armaria_all" ON public.seg_armaria;
    CREATE POLICY "seg_armaria_all" ON public.seg_armaria FOR ALL USING (true) WITH CHECK (true);
  `);
  console.log('  ✅ seg_armaria OK');

  // seg_ocorrencias
  await sql(`
    CREATE TABLE IF NOT EXISTS public.seg_ocorrencias (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      empresa_id UUID,
      titulo TEXT,
      tipo_ocorrencia TEXT DEFAULT 'Intrusão',
      severidade TEXT DEFAULT 'Média',
      site_id TEXT,
      guard_id TEXT,
      vigilante_nome TEXT,
      posto_nome TEXT,
      data_ocorrencia DATE DEFAULT CURRENT_DATE,
      hora_ocorrencia TIME,
      descricao TEXT,
      medidas_tomadas TEXT,
      envolveu_policia BOOLEAN DEFAULT FALSE,
      envolveu_feridos BOOLEAN DEFAULT FALSE,
      status TEXT DEFAULT 'aberto',
      danos_estimados NUMERIC(15,2) DEFAULT 0,
      numero_relatorio TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE public.seg_ocorrencias ADD COLUMN IF NOT EXISTS titulo TEXT;
    ALTER TABLE public.seg_ocorrencias ADD COLUMN IF NOT EXISTS tipo_ocorrencia TEXT DEFAULT 'Intrusão';
    ALTER TABLE public.seg_ocorrencias ADD COLUMN IF NOT EXISTS severidade TEXT DEFAULT 'Média';
    ALTER TABLE public.seg_ocorrencias ADD COLUMN IF NOT EXISTS site_id TEXT;
    ALTER TABLE public.seg_ocorrencias ADD COLUMN IF NOT EXISTS guard_id TEXT;
    ALTER TABLE public.seg_ocorrencias ADD COLUMN IF NOT EXISTS vigilante_nome TEXT;
    ALTER TABLE public.seg_ocorrencias ADD COLUMN IF NOT EXISTS posto_nome TEXT;
    ALTER TABLE public.seg_ocorrencias ADD COLUMN IF NOT EXISTS data_ocorrencia DATE;
    ALTER TABLE public.seg_ocorrencias ADD COLUMN IF NOT EXISTS hora_ocorrencia TIME;
    ALTER TABLE public.seg_ocorrencias ADD COLUMN IF NOT EXISTS descricao TEXT;
    ALTER TABLE public.seg_ocorrencias ADD COLUMN IF NOT EXISTS medidas_tomadas TEXT;
    ALTER TABLE public.seg_ocorrencias ADD COLUMN IF NOT EXISTS envolveu_policia BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.seg_ocorrencias ADD COLUMN IF NOT EXISTS envolveu_feridos BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.seg_ocorrencias ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'aberto';
    ALTER TABLE public.seg_ocorrencias ADD COLUMN IF NOT EXISTS danos_estimados NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE public.seg_ocorrencias ADD COLUMN IF NOT EXISTS numero_relatorio TEXT;
    ALTER TABLE public.seg_ocorrencias ADD COLUMN IF NOT EXISTS empresa_id UUID;

    ALTER TABLE public.seg_ocorrencias ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "seg_ocorrencias_all" ON public.seg_ocorrencias;
    CREATE POLICY "seg_ocorrencias_all" ON public.seg_ocorrencias FOR ALL USING (true) WITH CHECK (true);
  `);
  console.log('  ✅ seg_ocorrencias OK');

  console.log('\n=== 2. ADICIONANDO COLUNAS FALTANTES NA TABELA COMPRAS ===\n');
  await sql(`
    -- Colunas para recibo e atualização
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS numero_recibo TEXT;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS numero_compra TEXT;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS data_recibo TIMESTAMPTZ;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS forma_pagamento TEXT;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS atualizado_por TEXT;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS criado_por TEXT;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS created_by TEXT;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS hash TEXT;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS hash_documento TEXT;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS numero_fatura TEXT;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS itens JSONB DEFAULT '[]';
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS detalhes JSONB DEFAULT '{}';
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS descricao TEXT;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS observacoes TEXT;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS ano INTEGER;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS data DATE;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS taxa_retencao NUMERIC(10,4) DEFAULT 0;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS taxa_cambio NUMERIC(10,4) DEFAULT 1;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS moeda TEXT DEFAULT 'Kwanza';
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS valor_contravalor NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS desconto_global NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS data_servico DATE;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS metodo_pagamento TEXT;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS created_by_nome TEXT;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS created_by_username TEXT;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS reference_purchase_number TEXT;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS reference_document TEXT;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS work_site TEXT;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS work_site_name TEXT;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS codigo TEXT;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'AOA';
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS tem_recibo BOOLEAN DEFAULT FALSE;
  `);
  console.log('  ✅ Colunas de compras adicionadas');

  console.log('\n=== 3. ADICIONANDO COLUNAS DE RECIBO EM DOCUMENTOS_EMITIDOS ===\n');
  await sql(`
    ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS valor_pago NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS saldo_pendente NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS recibo_emitido BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS numero_recibo TEXT;
    ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS data_recibo TIMESTAMPTZ;
    ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS forma_pagamento TEXT;
    ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS hash TEXT;
    ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS hash_documento TEXT;
    ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS estado TEXT;
    ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS status TEXT;
    ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ;
    ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS atualizado_por TEXT;
    ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS document_type TEXT;
    ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS tipo_documento_codigo TEXT;
  `);
  console.log('  ✅ Colunas de documentos_emitidos adicionadas');

  // Reload schema
  await sql("NOTIFY pgrst, 'reload schema';");
  console.log('\n✅ SCHEMA RELOAD notificado. Tudo pronto!');
}

run().catch(e => { console.error('❌ Erro:', e.message); process.exit(1); });

