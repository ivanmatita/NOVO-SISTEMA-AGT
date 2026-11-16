import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const url = (process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(url, serviceKey);

async function run() {
  // 1. Verificar colunas de perfis
  const { data: cols } = await supabase.rpc('query_exec_select', {
    query: `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='perfis' ORDER BY ordinal_position`
  });
  const colNames = Array.isArray(cols) ? cols.map((c: any) => c.column_name) : Object.values(cols || {}).map((c: any) => c.column_name);
  console.log("Colunas de perfis:", colNames);

  const hasCompanyId = colNames.includes('company_id');
  const hasEmpresaId = colNames.includes('empresa_id');

  if (hasCompanyId && hasEmpresaId) {
    console.log("⚠️  Ambas existem - a remover company_id de perfis...");
    await supabase.rpc('query_exec', {
      query: `
        UPDATE public.perfis SET empresa_id = company_id WHERE empresa_id IS NULL AND company_id IS NOT NULL;
        ALTER TABLE public.perfis DROP COLUMN IF EXISTS company_id;
        NOTIFY pgrst, 'reload schema';
      `
    });
    console.log("✓ company_id removido de perfis");
  } else if (hasCompanyId && !hasEmpresaId) {
    console.log("⚠️  Só tem company_id - a renomear para empresa_id...");
    await supabase.rpc('query_exec', {
      query: `ALTER TABLE public.perfis RENAME COLUMN company_id TO empresa_id; NOTIFY pgrst, 'reload schema';`
    });
    console.log("✓ Renomeado company_id para empresa_id em perfis");
  } else if (hasEmpresaId && !hasCompanyId) {
    console.log("✓ perfis está correcto: só tem empresa_id");
  } else {
    console.log("❌ CRÍTICO: nem company_id nem empresa_id em perfis!");
  }

  // 2. Verificar trigger
  const { data: trig } = await supabase.rpc('query_exec_select', {
    query: `SELECT pg_get_functiondef(oid) as def FROM pg_proc WHERE proname='handle_new_user' AND pronamespace=(SELECT oid FROM pg_namespace WHERE nspname='public')`
  });
  const def = Array.isArray(trig) ? trig[0]?.def : Object.values(trig || {})[0]?.def;
  if (def) {
    if (def.includes('empresa_id') && !def.includes('company_id')) {
      console.log("✓ Trigger handle_new_user usa empresa_id correctamente");
    } else if (def.includes('company_id')) {
      console.error("❌ Trigger ainda usa company_id! Definição:", def.substring(0, 300));
    }
  }

  console.log("\n✅ Verificação concluída!");
}

run().catch(console.error);
