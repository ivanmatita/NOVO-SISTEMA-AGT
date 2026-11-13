// scripts/refine_produtos_trigger.mjs
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
  await sql(`
    CREATE OR REPLACE FUNCTION public.sync_produtos_fields()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Sincronizar nome
      IF NEW.name IS NOT NULL AND (NEW.nome IS NULL OR NEW.nome = '') THEN NEW.nome := NEW.name;
      ELSIF NEW.nome IS NOT NULL AND (NEW.name IS NULL OR NEW.name = '') THEN NEW.name := NEW.nome; END IF;

      -- Sincronizar descricao
      IF NEW.description IS NOT NULL AND (NEW.descricao IS NULL OR NEW.descricao = '') THEN NEW.descricao := NEW.description;
      ELSIF NEW.descricao IS NOT NULL AND (NEW.description IS NULL OR NEW.description = '') THEN NEW.description := NEW.descricao; END IF;

      -- Sincronizar preco / price
      IF NEW.price IS NOT NULL AND (NEW.preco IS NULL OR NEW.preco = 0) THEN NEW.preco := NEW.price;
      ELSIF NEW.preco IS NOT NULL AND (NEW.price IS NULL OR NEW.price = 0) THEN NEW.price := NEW.preco; END IF;

      -- Sincronizar preco_custo / cost_price
      IF NEW.cost_price IS NOT NULL AND (NEW.preco_custo IS NULL OR NEW.preco_custo = 0) THEN NEW.preco_custo := NEW.cost_price;
      ELSIF NEW.preco_custo IS NOT NULL AND (NEW.cost_price IS NULL OR NEW.cost_price = 0) THEN NEW.cost_price := NEW.preco_custo; END IF;

      -- Sincronizar codigo / code
      IF NEW.code IS NOT NULL AND (NEW.codigo IS NULL OR NEW.codigo = '') THEN NEW.codigo := NEW.code;
      ELSIF NEW.codigo IS NOT NULL AND (NEW.code IS NULL OR NEW.code = '') THEN NEW.code := NEW.codigo; END IF;

      -- Sincronizar categoria / category
      IF NEW.category IS NOT NULL AND (NEW.categoria IS NULL OR NEW.categoria = '') THEN NEW.categoria := NEW.category;
      ELSIF NEW.categoria IS NOT NULL AND (NEW.category IS NULL OR NEW.category = '') THEN NEW.category := NEW.categoria; END IF;

      -- Sincronizar imagem_url / image_url
      IF NEW.image_url IS NOT NULL AND (NEW.imagem_url IS NULL OR NEW.imagem_url = '') THEN NEW.imagem_url := NEW.image_url;
      ELSIF NEW.imagem_url IS NOT NULL AND (NEW.image_url IS NULL OR NEW.image_url = '') THEN NEW.image_url := NEW.imagem_url; END IF;

      -- Sincronizar empresa_id / company_id
      IF NEW.empresa_id IS NOT NULL AND NEW.company_id IS NULL THEN NEW.company_id := NEW.empresa_id;
      ELSIF NEW.company_id IS NOT NULL AND NEW.empresa_id IS NULL THEN NEW.empresa_id := NEW.company_id; END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_sync_produtos_fields ON public.produtos;
    CREATE TRIGGER trg_sync_produtos_fields
    BEFORE INSERT OR UPDATE ON public.produtos
    FOR EACH ROW EXECUTE FUNCTION public.sync_produtos_fields();
  `);
  console.log('✅ Trigger de produtos refinado com sucesso!');
}

run().catch(console.error);

