// scripts/fix_compras_table.mjs
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
  console.log('=== VERIFICANDO E ADICIONANDO TODAS AS COLUNAS EM COMPRAS ===\n');

  await sql(`
    -- EMPRESAS: logo_size, watermark_size, footer_size
    ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS logo_size NUMERIC DEFAULT 100;
    ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS watermark_size NUMERIC DEFAULT 100;
    ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS footer_size NUMERIC DEFAULT 100;

    -- COMPRAS
    CREATE TABLE IF NOT EXISTS public.compras (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      empresa_id UUID,
      company_id UUID,
      supplier_id TEXT,
      fornecedor_id TEXT,
      supplier_name TEXT,
      fornecedor_nome TEXT,
      supplier_nif TEXT,
      nif TEXT,
      document_type TEXT,
      tipo_documento TEXT,
      invoice_number TEXT,
      numero_documento TEXT,
      purchase_number TEXT,
      date DATE DEFAULT CURRENT_DATE,
      data_compra DATE DEFAULT CURRENT_DATE,
      due_date DATE,
      data_vencimento DATE,
      service_date DATE,
      country_code TEXT DEFAULT 'AO',
      items JSONB DEFAULT '[]',
      total NUMERIC(15,2) DEFAULT 0,
      valor_total NUMERIC(15,2) DEFAULT 0,
      vat_amount NUMERIC(15,2) DEFAULT 0,
      global_discount NUMERIC(15,2) DEFAULT 0,
      payment_method TEXT,
      metodo_pagamento TEXT,
      caixa TEXT,
      caixa_id TEXT,
      status TEXT DEFAULT 'pendente',
      estado TEXT DEFAULT 'pendente',
      saldo_pendente NUMERIC(15,2) DEFAULT 0,
      valor_pago NUMERIC(15,2) DEFAULT 0,
      recibo_emitido BOOLEAN DEFAULT FALSE,
      observacoes TEXT,
      referencia TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS supplier_id TEXT;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS fornecedor_id TEXT;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS supplier_name TEXT;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS fornecedor_nome TEXT;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS supplier_nif TEXT;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS nif TEXT;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS document_type TEXT;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS tipo_documento TEXT;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS invoice_number TEXT;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS numero_documento TEXT;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS purchase_number TEXT;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS data_compra DATE DEFAULT CURRENT_DATE;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS due_date DATE;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS data_vencimento DATE;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS service_date DATE;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'AO';
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]';
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS total NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS valor_total NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS vat_amount NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS global_discount NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS payment_method TEXT;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS metodo_pagamento TEXT;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS caixa TEXT;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS caixa_id TEXT;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pendente';
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'pendente';
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS saldo_pendente NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS valor_pago NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS recibo_emitido BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS empresa_id UUID;
    ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS company_id UUID;

    -- RLS aberto
    ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "compras_all" ON public.compras;
    CREATE POLICY "compras_all" ON public.compras FOR ALL USING (true) WITH CHECK (true);
  `);

  console.log('✅ Tabela compras e empresas atualizadas com sucesso!');
  await sql("NOTIFY pgrst, 'reload schema';");
}

run().catch(e => { console.error('Erro:', e); process.exit(1); });

