// scripts/fix_sessions_table.mjs
const token = 'process.env.SUPABASE_TOKEN';
const stagingRef = 'sfnibpxfevhelaikqbiq';

async function fixSessions() {
  const sql = `
    -- Recriar ou adicionar colunas completas para user_activities_sessions
    ALTER TABLE public.user_activities_sessions ADD COLUMN IF NOT EXISTS utilizador_id UUID;
    ALTER TABLE public.user_activities_sessions ADD COLUMN IF NOT EXISTS email TEXT;
    ALTER TABLE public.user_activities_sessions ADD COLUMN IF NOT EXISTS data_entrada TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE public.user_activities_sessions ADD COLUMN IF NOT EXISTS data_saida TIMESTAMPTZ;
    ALTER TABLE public.user_activities_sessions ADD COLUMN IF NOT EXISTS tempo_ativo_segundos INTEGER DEFAULT 0;
    ALTER TABLE public.user_activities_sessions ADD COLUMN IF NOT EXISTS movimentos INTEGER DEFAULT 0;
    ALTER TABLE public.user_activities_sessions ADD COLUMN IF NOT EXISTS insercoes INTEGER DEFAULT 0;
    ALTER TABLE public.user_activities_sessions ADD COLUMN IF NOT EXISTS tarefas_concluidas INTEGER DEFAULT 0;
    ALTER TABLE public.user_activities_sessions ADD COLUMN IF NOT EXISTS ip TEXT;
    ALTER TABLE public.user_activities_sessions ADD COLUMN IF NOT EXISTS navegador TEXT;
    ALTER TABLE public.user_activities_sessions ADD COLUMN IF NOT EXISTS ultimo_clique TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE public.user_activities_sessions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo';

    -- Notificar reload schema
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
  console.log('Resultado da actualização de user_activities_sessions:', data);
}

fixSessions();

