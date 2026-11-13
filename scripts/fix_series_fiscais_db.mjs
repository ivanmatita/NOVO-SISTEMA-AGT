// scripts/fix_series_fiscais_db.mjs
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
  console.log('--- CORRIGINDO CONSTRAINTS E COLUNAS NA TABELA series_fiscais ---');

  await sql(`
    -- Alterar prefixo para nullable com default
    ALTER TABLE public.series_fiscais ALTER COLUMN prefixo DROP NOT NULL;
    ALTER TABLE public.series_fiscais ALTER COLUMN prefixo SET DEFAULT 'A';

    -- Adicionar colunas se não existirem
    ALTER TABLE public.series_fiscais ADD COLUMN IF NOT EXISTS codigo TEXT;
    ALTER TABLE public.series_fiscais ADD COLUMN IF NOT EXISTS nome TEXT;
    ALTER TABLE public.series_fiscais ADD COLUMN IF NOT EXISTS serie TEXT;
    ALTER TABLE public.series_fiscais ADD COLUMN IF NOT EXISTS descricao TEXT;
    ALTER TABLE public.series_fiscais ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'normal';
    ALTER TABLE public.series_fiscais ADD COLUMN IF NOT EXISTS ano INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE);
    ALTER TABLE public.series_fiscais ADD COLUMN IF NOT EXISTS proximo_numero INTEGER DEFAULT 1;
    ALTER TABLE public.series_fiscais ADD COLUMN IF NOT EXISTS ultimo_numero INTEGER DEFAULT 0;
    ALTER TABLE public.series_fiscais ADD COLUMN IF NOT EXISTS numero_inicial INTEGER DEFAULT 1;
    ALTER TABLE public.series_fiscais ADD COLUMN IF NOT EXISTS numero_final INTEGER DEFAULT 999999;
    ALTER TABLE public.series_fiscais ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE;
    ALTER TABLE public.series_fiscais ADD COLUMN IF NOT EXISTS utilizador_id TEXT;
    ALTER TABLE public.series_fiscais ADD COLUMN IF NOT EXISTS empresa_id UUID;

    -- RLS
    ALTER TABLE public.series_fiscais ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "series_fiscais_all" ON public.series_fiscais;
    CREATE POLICY "series_fiscais_all" ON public.series_fiscais FOR ALL USING (true) WITH CHECK (true);

    -- Recarregar cache PostgREST
    NOTIFY pgrst, 'reload schema';
  `);

  console.log('✅ Tabela series_fiscais atualizada com sucesso no STAGING!');

  // Testar inserção de uma série
  const testSerie = await sql(`
    INSERT INTO public.series_fiscais (empresa_id, serie, prefixo, codigo, descricao, tipo, proximo_numero, ativo)
    VALUES ('11111111-0000-0000-0000-000000000001', 'TEST2026', 'TEST', 'TEST2026', 'Série Geral Teste 2026', 'normal', 1, true)
    RETURNING id, serie, prefixo, descricao;
  `);

  console.log('✅ Inserção de série fiscal testada com sucesso:', testSerie[0]);
}

run().catch(e => {
  console.error('❌ Erro:', e);
  process.exit(1);
});

