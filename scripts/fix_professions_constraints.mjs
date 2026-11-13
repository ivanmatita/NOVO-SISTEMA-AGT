// scripts/fix_professions_constraints.mjs
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

async function fixProfessions() {
  console.log('Ajustando constraints em professions...');
  await sql(`
    -- Remover NOT NULL de nome e name
    ALTER TABLE public.professions ALTER COLUMN nome DROP NOT NULL;
    ALTER TABLE public.professions ALTER COLUMN name DROP NOT NULL;
    
    -- Criar trigger para manter nome e name sincronizados caso um deles venha nulo
    CREATE OR REPLACE FUNCTION public.sync_profession_names()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.name IS NOT NULL AND NEW.nome IS NULL THEN
        NEW.nome := NEW.name;
      ELSIF NEW.nome IS NOT NULL AND NEW.name IS NULL THEN
        NEW.name := NEW.nome;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_sync_profession_names ON public.professions;
    CREATE TRIGGER trg_sync_profession_names
    BEFORE INSERT OR UPDATE ON public.professions
    FOR EACH ROW EXECUTE FUNCTION public.sync_profession_names();
  `);

  console.log('✅ Trigger e constraints atualizados com sucesso!');
  await sql("NOTIFY pgrst, 'reload schema';");
}

fixProfessions().catch(console.error);

