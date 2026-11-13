// scripts/fix_empresa_graphic_settings.mjs
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
  console.log('=== ADICIONANDO COLUNAS GRÁFICAS A EMPRESAS E CONFIG_EMPRESA ===\n');

  // 1. EMPRESAS
  console.log('[1/2] Adicionando colunas gráficas a empresas...');
  await sql(`
    ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS logo_url TEXT;
    ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS watermark_url TEXT;
    ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS footer_image_url TEXT;
    ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS header_image_url TEXT;
    ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS anexo_image_url TEXT;
    ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS sidebar_image_url TEXT;
    ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS documento_modelo TEXT DEFAULT 'A4';
    ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS layout_fatura TEXT DEFAULT 'classico';
    ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS cor_primaria TEXT DEFAULT '#003366';
    ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS cor_secundaria TEXT DEFAULT '#002244';
    ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS exibir_marca_dagua BOOLEAN DEFAULT TRUE;
    ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS exibir_rodape BOOLEAN DEFAULT TRUE;
    ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS exibir_cabecalho BOOLEAN DEFAULT TRUE;
    ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS texto_rodape TEXT;

    -- Garantir políticas abertas RLS
    ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "empresas_all" ON public.empresas;
    CREATE POLICY "empresas_all" ON public.empresas FOR ALL USING (true) WITH CHECK (true);
  `);
  console.log('  ✅ Colunas gráficas adicionadas a empresas.');

  // 2. CONFIG_EMPRESA
  console.log('[2/2] Adicionando colunas gráficas a config_empresa...');
  await sql(`
    CREATE TABLE IF NOT EXISTS public.config_empresa (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      empresa_id UUID,
      company_id UUID,
      nif TEXT,
      nome TEXT,
      email TEXT,
      telefone TEXT,
      morada TEXT,
      regime_iva TEXT,
      logo_url TEXT,
      watermark_url TEXT,
      footer_image_url TEXT,
      header_image_url TEXT,
      texto_rodape TEXT,
      cor_primaria TEXT DEFAULT '#003366',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE public.config_empresa ADD COLUMN IF NOT EXISTS logo_url TEXT;
    ALTER TABLE public.config_empresa ADD COLUMN IF NOT EXISTS watermark_url TEXT;
    ALTER TABLE public.config_empresa ADD COLUMN IF NOT EXISTS footer_image_url TEXT;
    ALTER TABLE public.config_empresa ADD COLUMN IF NOT EXISTS header_image_url TEXT;
    ALTER TABLE public.config_empresa ADD COLUMN IF NOT EXISTS texto_rodape TEXT;
    ALTER TABLE public.config_empresa ADD COLUMN IF NOT EXISTS cor_primaria TEXT DEFAULT '#003366';
    ALTER TABLE public.config_empresa ADD COLUMN IF NOT EXISTS empresa_id UUID;
    ALTER TABLE public.config_empresa ADD COLUMN IF NOT EXISTS company_id UUID;

    ALTER TABLE public.config_empresa ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "config_empresa_all" ON public.config_empresa;
    CREATE POLICY "config_empresa_all" ON public.config_empresa FOR ALL USING (true) WITH CHECK (true);
  `);
  console.log('  ✅ Colunas gráficas adicionadas a config_empresa.');

  // Reload schema
  await sql("NOTIFY pgrst, 'reload schema';");
  console.log('\n✅ SCHEMA RELOAD notificado com sucesso!');
}

run().catch(e => { console.error('Erro:', e); process.exit(1); });

