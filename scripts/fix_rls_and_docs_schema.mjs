// Fix RLS on produtos, fix documents loading, and verify issued documents schema
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
  console.log('--- CORRIGINDO RLS E SCHEMA PARA PRODUTOS E DOCUMENTOS ---');

  // Fix RLS on produtos 
  await sql(`
    ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "produtos_all_access" ON public.produtos;
    CREATE POLICY "produtos_all_access" ON public.produtos 
      FOR ALL USING (true) WITH CHECK (true);
  `);
  console.log('✅ RLS de produtos corrigido');

  // Fix RLS on media_arquivos
  await sql(`
    ALTER TABLE public.media_arquivos ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "media_arquivos_all" ON public.media_arquivos;
    CREATE POLICY "media_arquivos_all" ON public.media_arquivos 
      FOR ALL USING (true) WITH CHECK (true);
  `);
  console.log('✅ RLS de media_arquivos corrigido');

  // Check documentos_emitidos columns
  const docCols = await sql(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'documentos_emitidos'
    ORDER BY column_name;
  `);
  console.log('\nColunas em documentos_emitidos:');
  docCols.forEach(c => console.log(` - ${c.column_name} (${c.data_type})`));

  // Fix documentos_emitidos - add missing columns
  await sql(`
    -- Garantir colunas de pagamento e status nos documentos emitidos
    ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS paid_amount NUMERIC DEFAULT 0;
    ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pendente';
    ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'ativo';
    ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo';
    ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS is_certified BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS documento_origem_id UUID;
    ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS tipo_documento_origem TEXT;
    ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS numero_documento_origem TEXT;
    ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS referencia_documento TEXT;
    ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS reference_document TEXT;
    ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS document_type TEXT;
    ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS invoice_number TEXT;
    ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS client_name TEXT;
    ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS client_nif TEXT;
    ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS client_address TEXT;
    ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS cash_box UUID;
    ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS payment_method TEXT;
    ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS total NUMERIC DEFAULT 0;
    ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS valor_total NUMERIC DEFAULT 0;
    ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS counter_value NUMERIC DEFAULT 0;
    ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS moeda TEXT DEFAULT 'AOA';
    ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS itens JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS detalhes JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS logo_url TEXT;
    ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS logotipo TEXT;
    ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS company_logo TEXT;
    ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS ano INTEGER;

    -- Ensure RLS is open on documentos_emitidos
    ALTER TABLE public.documentos_emitidos ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "docs_emitidos_all" ON public.documentos_emitidos;
    CREATE POLICY "docs_emitidos_all" ON public.documentos_emitidos 
      FOR ALL USING (true) WITH CHECK (true);

    NOTIFY pgrst, 'reload schema';
  `);
  console.log('✅ documentos_emitidos corrigido e RLS aberto');

  // Fix graphic_configs / configuracoes_graficas table for logo storage
  await sql(`
    CREATE TABLE IF NOT EXISTS public.configuracoes_graficas (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      empresa_id UUID NOT NULL,
      serie_id UUID,
      tipo TEXT DEFAULT 'geral',
      logo_url TEXT,
      logotipo TEXT,
      cabecalho TEXT,
      rodape TEXT,
      marca_dagua TEXT,
      cor_primaria TEXT DEFAULT '#003366',
      cor_secundaria TEXT DEFAULT '#ffffff',
      fonte TEXT DEFAULT 'Arial',
      mostrar_logo BOOLEAN DEFAULT TRUE,
      mostrar_cabecalho BOOLEAN DEFAULT TRUE,
      mostrar_rodape BOOLEAN DEFAULT TRUE,
      ativo BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE public.configuracoes_graficas ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "conf_graficas_all" ON public.configuracoes_graficas;
    CREATE POLICY "conf_graficas_all" ON public.configuracoes_graficas 
      FOR ALL USING (true) WITH CHECK (true);
  `);
  console.log('✅ configuracoes_graficas criada/verificada');
}

run().catch(e => { console.error('❌ Erro:', e); process.exit(1); });

