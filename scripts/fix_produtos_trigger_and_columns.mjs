// scripts/fix_produtos_trigger_and_columns.mjs
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
  console.log('--- 1. ATUALIZANDO TABELA produtos E TRIGGER sync_produtos_fields ---');

  await sql(`
    -- Adicionar colunas company_id e variações de imagem em produtos
    ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS company_id UUID;
    ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS imagem_url TEXT;
    ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS image_url TEXT;
    ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS image TEXT;
    ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS imagem TEXT;
    ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS foto TEXT;
    ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS foto_url TEXT;
    ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS image_path TEXT;
    ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS nome TEXT;
    ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS name TEXT;
    ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS barcode TEXT;
    ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS referente TEXT;
    ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS armazem_id UUID;
    ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS warehouse_id INTEGER;

    -- Redefinir sync_produtos_fields() de forma 100% segura
    CREATE OR REPLACE FUNCTION public.sync_produtos_fields()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      -- Sincronizar nome / name
      IF NEW.name IS NOT NULL AND (NEW.nome IS NULL OR NEW.nome = '') THEN NEW.nome := NEW.name;
      ELSIF NEW.nome IS NOT NULL AND (NEW.name IS NULL OR NEW.name = '') THEN NEW.name := NEW.nome; END IF;

      -- Sincronizar descricao / description
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

      -- Sincronizar imagem_url / image_url / image / foto
      IF NEW.image_url IS NOT NULL AND (NEW.imagem_url IS NULL OR NEW.imagem_url = '') THEN NEW.imagem_url := NEW.image_url;
      ELSIF NEW.imagem_url IS NOT NULL AND (NEW.image_url IS NULL OR NEW.image_url = '') THEN NEW.image_url := NEW.imagem_url; END IF;

      IF NEW.imagem_url IS NOT NULL THEN
        NEW.image := NEW.imagem_url;
        NEW.foto := NEW.imagem_url;
        NEW.foto_url := NEW.imagem_url;
      END IF;

      -- Sincronizar empresa_id / company_id
      IF NEW.empresa_id IS NOT NULL THEN NEW.company_id := NEW.empresa_id;
      ELSIF NEW.company_id IS NOT NULL THEN NEW.empresa_id := NEW.company_id; END IF;

      RETURN NEW;
    END;
    $$;

    -- Tabela media_arquivos para rastrear uploads de produtos
    CREATE TABLE IF NOT EXISTS public.media_arquivos (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      empresa_id UUID,
      utilizador_id TEXT,
      tipo TEXT DEFAULT 'produto',
      nome_arquivo TEXT,
      nome_original TEXT,
      bucket TEXT DEFAULT 'produtos-imagens',
      caminho_arquivo TEXT,
      url_publica TEXT,
      mime_type TEXT,
      tamanho_bytes BIGINT,
      extensao TEXT,
      entidade TEXT DEFAULT 'produto',
      entidade_id TEXT,
      observacao TEXT,
      ativo BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE public.media_arquivos ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "media_arquivos_all" ON public.media_arquivos;
    CREATE POLICY "media_arquivos_all" ON public.media_arquivos FOR ALL USING (true) WITH CHECK (true);

    -- Recarregar cache schema
    NOTIFY pgrst, 'reload schema';
  `);

  console.log('✅ Trigger e colunas da tabela produtos atualizadas com sucesso!');

  // Testar inserção de produto com imagem
  const empresaTestId = '11111111-0000-0000-0000-000000000001';
  const prod = await sql(`
    INSERT INTO public.produtos (
      empresa_id,
      name,
      nome,
      price,
      cost_price,
      stock_quantity,
      category,
      unit,
      image_url,
      imagem_url
    ) VALUES (
      '${empresaTestId}',
      'Produto Teste Com Imagem',
      'Produto Teste Com Imagem',
      12500,
      8000,
      50,
      'Geral',
      'UN',
      'https://sfnibpxfevhelaikqbiq.supabase.co/storage/v1/object/public/produtos-imagens/test.png',
      'https://sfnibpxfevhelaikqbiq.supabase.co/storage/v1/object/public/produtos-imagens/test.png'
    ) RETURNING id, name, price, image_url, company_id;
  `);

  console.log('✅ Inserção de produto testada com sucesso:', prod[0]);
}

run().catch(e => {
  console.error('❌ Erro:', e);
  process.exit(1);
});

