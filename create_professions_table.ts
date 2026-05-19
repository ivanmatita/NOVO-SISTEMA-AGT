import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const rawUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const url = rawUrl
  .replace(/\/rest\/v1\/?$/, "")
  .replace(/\/auth\/v1\/?$/, "")
  .replace(/\/$/, "");

const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();

const supabase = createClient(url, key);

async function run() {
  const sql = `
  CREATE TABLE IF NOT EXISTS public.professions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      inss_profession TEXT,
      base_salary NUMERIC DEFAULT 0,
      acerto_salarial NUMERIC DEFAULT 0,
      empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT now()
  );

  -- Enable RLS
  ALTER TABLE public.professions ENABLE ROW LEVEL SECURITY;

  -- Create policies if they do not exist
  DO $$ 
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'professions' AND policyname = 'Allow all actions for company'
    ) THEN
      CREATE POLICY "Allow all actions for company" ON public.professions
      FOR ALL
      USING (true)
      WITH CHECK (true);
    END IF;
  END $$;
  `;

  console.log('Executing SQL...');
  const { data, error } = await supabase.rpc('query_exec', { query: sql });
  if (error) {
    console.error('Error executing query:', error);
  } else {
    console.log('Success! Data returned:', data);
  }
}

run();
