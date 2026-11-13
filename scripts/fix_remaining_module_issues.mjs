// Fix the 3 remaining module issues
const token = process.env.SUPABASE_TOKEN || 'process.env.SUPABASE_TOKEN';
const ref = 'sfnibpxfevhelaikqbiq';

async function sql(label, query) {
  console.log(`\n--- ${label} ---`);
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  const json = await res.json();
  if (!res.ok || (json.message && !Array.isArray(json))) {
    console.error(`❌ FAIL [${label}]:`, json.message || json);
    return false;
  }
  console.log(`✅ OK [${label}]`);
  return true;
}

async function run() {
  // 1. Fix locais_trabalho columns
  await sql("Fix locais_trabalho columns", `
    ALTER TABLE public.locais_trabalho ADD COLUMN IF NOT EXISTS localizacao text;
    ALTER TABLE public.locais_trabalho ADD COLUMN IF NOT EXISTS endereco text;
    ALTER TABLE public.locais_trabalho ADD COLUMN IF NOT EXISTS provincia text;
    ALTER TABLE public.locais_trabalho ADD COLUMN IF NOT EXISTS municipio text;
    ALTER TABLE public.locais_trabalho ADD COLUMN IF NOT EXISTS telefone text;
    ALTER TABLE public.locais_trabalho ADD COLUMN IF NOT EXISTS responsavel text;
    ALTER TABLE public.locais_trabalho ADD COLUMN IF NOT EXISTS status text DEFAULT 'ativo';
  `);

  // 2. Fix sync_perfis_fields trigger function (removes company_id error)
  await sql("Fix sync_perfis_fields function", `
    CREATE OR REPLACE FUNCTION public.sync_perfis_fields()
    RETURNS TRIGGER LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.nome IS NOT NULL AND NEW.name IS NULL THEN NEW.name := NEW.nome;
      ELSIF NEW.name IS NOT NULL AND NEW.nome IS NULL THEN NEW.nome := NEW.name; END IF;

      IF NEW.cargo IS NOT NULL AND NEW.profession IS NULL THEN NEW.profession := NEW.cargo;
      ELSIF NEW.profession IS NOT NULL AND NEW.cargo IS NULL THEN NEW.cargo := NEW.profession; END IF;

      IF NEW.telefone IS NOT NULL AND NEW.contact IS NULL THEN NEW.contact := NEW.telefone;
      ELSIF NEW.contact IS NOT NULL AND NEW.telefone IS NULL THEN NEW.telefone := NEW.contact; END IF;

      IF NEW.ativo IS NOT NULL AND NEW.is_active IS NULL THEN NEW.is_active := NEW.ativo;
      ELSIF NEW.is_active IS NOT NULL AND NEW.ativo IS NULL THEN NEW.ativo := NEW.is_active; END IF;

      RETURN NEW;
    END;
    $$;
  `);

  // 3. Fix delete_purchase_document RPC to handle text / uuid / bigint
  await sql("Fix delete_purchase_document RPC", `
    DROP FUNCTION IF EXISTS public.delete_purchase_document(bigint);
    DROP FUNCTION IF EXISTS public.delete_purchase_document(uuid);
    DROP FUNCTION IF EXISTS public.delete_purchase_document(text);

    CREATE OR REPLACE FUNCTION public.delete_purchase_document(p_id text)
    RETURNS boolean
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      DELETE FROM public.compras WHERE id::text = p_id;
      RETURN true;
    EXCEPTION WHEN OTHERS THEN
      RETURN false;
    END;
    $$;
  `);

  console.log("\n=== CORREÇÃO DAS 3 TABELAS/FUNÇÕES CONCLUÍDA ===");
}

run().catch(console.error);

