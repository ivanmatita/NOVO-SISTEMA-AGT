import { createClient } from '@supabase/supabase-js';

const PROD_URL = "https://nawqfidnawokqaheqvar.supabase.co";
const PROD_SERVICE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hd3FmaWRuYXdva3FhaGVxdmFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODIxODE0NiwiZXhwIjoyMDkzNzk0MTQ2fQ.ToB7OlAF5FDHEKZMAZLmbvLtHb250qiVFmOUQm1VaOo";

const client = createClient(PROD_URL, PROD_SERVICE, { auth: { persistSession: false } });

async function run() {
  console.log("=== INSPECIONANDO POLICIES E PERFIS EM PRODUÇÃO ===");

  // 1. Inspecionar RLS policies
  const { data: policies, error: polErr } = await client.rpc('query_exec', {
    query: `
      SELECT tablename, policyname, roles, cmd, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public';
    `
  });
  console.log("RLS Policies:", policies);

  // 2. Inspecionar RLS status por tabela
  const { data: rlsStatus, error: rlsStatusErr } = await client.rpc('query_exec', {
    query: `
      SELECT relname, relrowsecurity
      FROM pg_class
      JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
      WHERE pg_namespace.nspname = 'public' AND relkind = 'r';
    `
  });
  console.log("RLS Status:", rlsStatus);

  // 3. Inspecionar perfis e auth.users
  const { data: perfis, error: perfErr } = await client.from('perfis').select('*').limit(5);
  console.log("Perfis sample (5):", perfis);

  // 4. Inspecionar triggers em produtos, clientes, etc.
  const { data: triggers, error: trgErr } = await client.rpc('query_exec', {
    query: `
      SELECT event_object_table, trigger_name, action_timing, event_manipulation
      FROM information_schema.triggers
      WHERE trigger_schema = 'public';
    `
  });
  console.log("Triggers:", triggers);
}

run().catch(console.error);
