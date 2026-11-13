import { createClient } from '@supabase/supabase-js';

const PROD_URL = "https://nawqfidnawokqaheqvar.supabase.co";
const PROD_SERVICE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hd3FmaWRuYXdva3FhaGVxdmFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODIxODE0NiwiZXhwIjoyMDkzNzk0MTQ2fQ.ToB7OlAF5FDHEKZMAZLmbvLtHb250qiVFmOUQm1VaOo";

const client = createClient(PROD_URL, PROD_SERVICE, { auth: { persistSession: false } });

async function run() {
  console.log("=== CRIANDO TABELA configuracoes_graficas EM PRODUÇÃO ===");

  const { data, error } = await client.rpc('query_exec', {
    query: `
      CREATE TABLE IF NOT EXISTS public.configuracoes_graficas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        empresa_id UUID,
        serie_id UUID,
        tipo TEXT DEFAULT 'A4',
        logo_url TEXT,
        logotipo TEXT,
        cabecalho TEXT,
        rodape TEXT,
        marca_dagua TEXT,
        cor_primaria TEXT DEFAULT '#1e40af',
        cor_secundaria TEXT DEFAULT '#64748b',
        fonte TEXT DEFAULT 'Inter',
        mostrar_logo BOOLEAN DEFAULT true,
        mostrar_cabecalho BOOLEAN DEFAULT true,
        mostrar_rodape BOOLEAN DEFAULT true,
        ativo BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );

      ALTER TABLE public.configuracoes_graficas ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "configuracoes_graficas_universal_access" ON public.configuracoes_graficas;
      CREATE POLICY "configuracoes_graficas_universal_access" ON public.configuracoes_graficas
        FOR ALL TO public USING (true) WITH CHECK (true);

      NOTIFY pgrst, 'reload schema';
    `
  });

  console.log("RPC query_exec result:", { data, error });

  // Inserir registro padrão se tabela vazia para empresas existentes
  const { data: emps } = await client.from('empresas').select('id');
  if (emps && emps.length > 0) {
    for (const emp of emps) {
      const { data: existing } = await client.from('configuracoes_graficas').select('id').eq('empresa_id', emp.id).limit(1);
      if (!existing || existing.length === 0) {
        await client.from('configuracoes_graficas').insert({
          empresa_id: emp.id,
          tipo: 'A4',
          cor_primaria: '#1e40af',
          cor_secundaria: '#64748b',
          fonte: 'Inter',
          mostrar_logo: true,
          mostrar_cabecalho: true,
          mostrar_rodape: true,
          ativo: true
        });
        console.log(`Inserido registo padrão de configurações gráficas para empresa ${emp.id}`);
      }
    }
  }

  const { data: check, error: checkErr } = await client.from('configuracoes_graficas').select('*').limit(3);
  console.log("Verificação configuracoes_graficas:", { count: check?.length, checkErr });
}

run().catch(console.error);
