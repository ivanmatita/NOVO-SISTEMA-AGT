// scripts/ensure_company_ids.mjs
const token = 'process.env.SUPABASE_TOKEN';
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

async function run() {
  const sql = `
    -- Adicionar company_id e empresa_id em todas as tabelas multiempresa
    DO $$
    DECLARE
      r RECORD;
    BEGIN
      FOR r IN (
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ) LOOP
        EXECUTE 'ALTER TABLE public."' || r.table_name || '" ADD COLUMN IF NOT EXISTS company_id UUID;';
        EXECUTE 'ALTER TABLE public."' || r.table_name || '" ADD COLUMN IF NOT EXISTS empresa_id UUID;';
      END LOOP;
    END $$;

    -- Metrics columns & seed
    ALTER TABLE public.metrics ADD COLUMN IF NOT EXISTS type TEXT;
    ALTER TABLE public.metrics ADD COLUMN IF NOT EXISTS tipo TEXT;
    ALTER TABLE public.metrics ADD COLUMN IF NOT EXISTS value NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE public.metrics ADD COLUMN IF NOT EXISTS valor NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE public.metrics ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE;
    ALTER TABLE public.metrics ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE public.metrics ADD COLUMN IF NOT EXISTS periodo TEXT;

    INSERT INTO public.metrics (empresa_id, company_id, tipo, type, valor, value, activo, description, periodo)
    VALUES 
      ('11111111-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'faturacao_mensal', 'faturacao_mensal', 0, 0, TRUE, 'Faturação Mensal de Teste', '2026-08'),
      ('11111111-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'total_clientes', 'total_clientes', 4, 4, TRUE, 'Total de Clientes Staging', '2026-08')
    ON CONFLICT DO NOTHING;

    -- Reload schema
    NOTIFY pgrst, 'reload schema';
  `;

  await queryDb(stagingRef, sql);
  console.log('✅ company_id e empresa_id garantidos em 100% das tabelas do Staging!');
}

run().catch(e => console.error('Erro:', e));

