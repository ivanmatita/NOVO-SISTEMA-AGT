// scripts/final_touch_staging.mjs
const token = 'process.env.SUPABASE_TOKEN';
const stagingRef = 'sfnibpxfevhelaikqbiq';

async function finalTouch() {
  const sql = `
    -- PERFIS
    ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS username TEXT;
    ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS company_id UUID;
    ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS foto TEXT;

    -- LOGS_AUDITORIA
    ALTER TABLE public.logs_auditoria ADD COLUMN IF NOT EXISTS email TEXT;
    ALTER TABLE public.logs_auditoria ADD COLUMN IF NOT EXISTS username TEXT;
    ALTER TABLE public.logs_auditoria ADD COLUMN IF NOT EXISTS company_id UUID;
    ALTER TABLE public.logs_auditoria ADD COLUMN IF NOT EXISTS modulo TEXT;
    ALTER TABLE public.logs_auditoria ADD COLUMN IF NOT EXISTS tipo TEXT;

    -- Reload schema
    NOTIFY pgrst, 'reload schema';
  `;

  const res = await fetch(`https://api.supabase.com/v1/projects/${stagingRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });

  const data = await res.json();
  console.log('Final touch schema result:', data);
}

finalTouch();

