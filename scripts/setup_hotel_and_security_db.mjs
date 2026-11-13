// Check and create hotel & security tables in Supabase staging
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
  console.log('--- VERIFICANDO E CORRIGINDO TABELAS HOTEL & SEGURANÇA ---');

  await sql(`
    -- Tabela hotel_quartos
    CREATE TABLE IF NOT EXISTS public.hotel_quartos (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      empresa_id UUID NOT NULL,
      numero TEXT NOT NULL,
      tipo TEXT DEFAULT 'Standard',
      piso INTEGER DEFAULT 1,
      capacidade INTEGER DEFAULT 2,
      preco_noite NUMERIC DEFAULT 0,
      preco_final_semana NUMERIC DEFAULT 0,
      status TEXT DEFAULT 'Disponível',
      tem_ar_condicionado BOOLEAN DEFAULT TRUE,
      tem_tv BOOLEAN DEFAULT TRUE,
      tem_wifi BOOLEAN DEFAULT TRUE,
      tem_minibar BOOLEAN DEFAULT FALSE,
      tem_cofre BOOLEAN DEFAULT FALSE,
      tem_varanda BOOLEAN DEFAULT FALSE,
      tem_vista_mar BOOLEAN DEFAULT FALSE,
      tem_banheira BOOLEAN DEFAULT FALSE,
      observacoes TEXT,
      deleted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE public.hotel_quartos ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "hotel_quartos_all" ON public.hotel_quartos;
    CREATE POLICY "hotel_quartos_all" ON public.hotel_quartos FOR ALL USING (true) WITH CHECK (true);

    -- Tabela hotel_reservas
    CREATE TABLE IF NOT EXISTS public.hotel_reservas (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      empresa_id UUID NOT NULL,
      quarto_id UUID,
      quarto_numero TEXT,
      hospede_nome TEXT NOT NULL,
      hospede_email TEXT,
      hospede_telefone TEXT,
      hospede_bi TEXT,
      hospede_nacionalidade TEXT DEFAULT 'Angolana',
      num_adultos INTEGER DEFAULT 1,
      num_criancas INTEGER DEFAULT 0,
      data_checkin DATE,
      data_checkout DATE,
      hora_checkin_prevista TEXT DEFAULT '14:00',
      canal_reserva TEXT DEFAULT 'Direto',
      status TEXT DEFAULT 'Confirmada',
      valor_total NUMERIC DEFAULT 0,
      valor_pago NUMERIC DEFAULT 0,
      metodo_pagamento TEXT DEFAULT 'Numerário',
      regime_alimentacao TEXT DEFAULT 'Sem Regime',
      pedidos_especiais TEXT,
      observacoes TEXT,
      deleted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE public.hotel_reservas ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "hotel_reservas_all" ON public.hotel_reservas;
    CREATE POLICY "hotel_reservas_all" ON public.hotel_reservas FOR ALL USING (true) WITH CHECK (true);

    -- Tabela hotel_housekeeping
    CREATE TABLE IF NOT EXISTS public.hotel_housekeeping (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      empresa_id UUID NOT NULL,
      quarto_id UUID,
      quarto_numero TEXT,
      tipo_tarefa TEXT DEFAULT 'Limpeza Diária',
      responsavel TEXT,
      data_tarefa DATE DEFAULT CURRENT_DATE,
      hora_inicio TEXT,
      hora_fim TEXT,
      prioridade TEXT DEFAULT 'Normal',
      status TEXT DEFAULT 'Pendente',
      observacoes TEXT,
      deleted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE public.hotel_housekeeping ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "hotel_housekeeping_all" ON public.hotel_housekeeping;
    CREATE POLICY "hotel_housekeeping_all" ON public.hotel_housekeeping FOR ALL USING (true) WITH CHECK (true);

    -- Tabela hotel_servicos / consumos
    CREATE TABLE IF NOT EXISTS public.hotel_servicos (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      empresa_id UUID NOT NULL,
      quarto_id UUID,
      quarto_numero TEXT,
      reserva_id UUID,
      hospede_nome TEXT,
      tipo TEXT DEFAULT 'Restaurante / Bar',
      descricao TEXT NOT NULL,
      quantidade NUMERIC DEFAULT 1,
      preco_unitario NUMERIC DEFAULT 0,
      total NUMERIC DEFAULT 0,
      faturado BOOLEAN DEFAULT FALSE,
      fatura_id UUID,
      data_servico DATE DEFAULT CURRENT_DATE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE public.hotel_servicos ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "hotel_servicos_all" ON public.hotel_servicos;
    CREATE POLICY "hotel_servicos_all" ON public.hotel_servicos FOR ALL USING (true) WITH CHECK (true);

    -- Garantir tabelas de segurança com RLS aberto
    ALTER TABLE IF EXISTS public.seg_vigilantes ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "seg_vigilantes_all" ON public.seg_vigilantes;
    CREATE POLICY "seg_vigilantes_all" ON public.seg_vigilantes FOR ALL USING (true) WITH CHECK (true);

    ALTER TABLE IF EXISTS public.seg_postos ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "seg_postos_all" ON public.seg_postos;
    CREATE POLICY "seg_postos_all" ON public.seg_postos FOR ALL USING (true) WITH CHECK (true);

    ALTER TABLE IF EXISTS public.seg_escalas ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "seg_escalas_all" ON public.seg_escalas;
    CREATE POLICY "seg_escalas_all" ON public.seg_escalas FOR ALL USING (true) WITH CHECK (true);

    ALTER TABLE IF EXISTS public.seg_armaria ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "seg_armaria_all" ON public.seg_armaria;
    CREATE POLICY "seg_armaria_all" ON public.seg_armaria FOR ALL USING (true) WITH CHECK (true);

    ALTER TABLE IF EXISTS public.seg_ocorrencias ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "seg_ocorrencias_all" ON public.seg_ocorrencias;
    CREATE POLICY "seg_ocorrencias_all" ON public.seg_ocorrencias FOR ALL USING (true) WITH CHECK (true);

    NOTIFY pgrst, 'reload schema';
  `);

  console.log('✅ Tabelas e RLS de Hotel & Segurança verificadas e configuradas com sucesso!');
}

run().catch(e => { console.error('❌ Erro:', e); process.exit(1); });

