// scripts/fix_metrics_columns.mjs
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
  console.log('Adicionando colunas completas à tabela metrics...');
  await sql(`
    ALTER TABLE public.metrics ADD COLUMN IF NOT EXISTS company_id UUID;
    ALTER TABLE public.metrics ADD COLUMN IF NOT EXISTS empresa_id UUID;
    ALTER TABLE public.metrics ADD COLUMN IF NOT EXISTS type TEXT;
    ALTER TABLE public.metrics ADD COLUMN IF NOT EXISTS tipo TEXT;
    ALTER TABLE public.metrics ADD COLUMN IF NOT EXISTS value NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE public.metrics ADD COLUMN IF NOT EXISTS valor NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE public.metrics ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE public.metrics ADD COLUMN IF NOT EXISTS periodo TEXT;
    ALTER TABLE public.metrics ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE;
    ALTER TABLE public.metrics ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE public.metrics ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

    -- Sincronizar trigger para type/tipo e value/valor se um vier nulo
    CREATE OR REPLACE FUNCTION public.sync_metrics_fields()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.type IS NOT NULL AND NEW.tipo IS NULL THEN
        NEW.tipo := NEW.type;
      ELSIF NEW.tipo IS NOT NULL AND NEW.type IS NULL THEN
        NEW.type := NEW.tipo;
      END IF;

      IF NEW.value IS NOT NULL AND NEW.valor IS NULL THEN
        NEW.valor := NEW.value;
      ELSIF NEW.valor IS NOT NULL AND NEW.value IS NULL THEN
        NEW.value := NEW.valor;
      END IF;

      IF NEW.empresa_id IS NOT NULL AND NEW.company_id IS NULL THEN
        NEW.company_id := NEW.empresa_id;
      ELSIF NEW.company_id IS NOT NULL AND NEW.empresa_id IS NULL THEN
        NEW.empresa_id := NEW.company_id;
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_sync_metrics_fields ON public.metrics;
    CREATE TRIGGER trg_sync_metrics_fields
    BEFORE INSERT OR UPDATE ON public.metrics
    FOR EACH ROW EXECUTE FUNCTION public.sync_metrics_fields();

    -- RLS aberto
    ALTER TABLE public.metrics ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "metrics_all" ON public.metrics;
    CREATE POLICY "metrics_all" ON public.metrics FOR ALL USING (true) WITH CHECK (true);
  `);

  console.log('✅ metrics atualizada com sucesso!');
  await sql("NOTIFY pgrst, 'reload schema';");
}

run().catch(console.error);

