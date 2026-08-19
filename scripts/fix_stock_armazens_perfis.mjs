// scripts/fix_stock_armazens_perfis.mjs
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
  console.log('=== CORRIGINDO STOCK, ARMAZÉNS, PRODUTOS, PERFIS E UTILIZADORES ===\n');

  // 1. PRODUTOS
  console.log('[1/4] Corrigindo tabela produtos...');
  await sql(`
    ALTER TABLE public.produtos ALTER COLUMN nome DROP NOT NULL;
    ALTER TABLE public.produtos ALTER COLUMN preco DROP NOT NULL;
    
    ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS name TEXT;
    ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS descricao TEXT;
    ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS price NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS cost_price NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS preco_custo NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS code TEXT;
    ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS codigo TEXT;
    ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS category TEXT;
    ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS categoria TEXT;
    ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'un';
    ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS tax_id TEXT;
    ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;
    ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS image_url TEXT;
    ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS imagem_url TEXT;
    ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS empresa_id UUID;
    ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS company_id UUID;
    ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS stock_atual NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS stock_minimo NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS stock_maximo NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS armazem_id UUID;

    -- Trigger de auto-sincronização de campos produtos (PT <-> EN)
    CREATE OR REPLACE FUNCTION public.sync_produtos_fields()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.name IS NOT NULL AND NEW.nome IS NULL THEN NEW.nome := NEW.name;
      ELSIF NEW.nome IS NOT NULL AND NEW.name IS NULL THEN NEW.name := NEW.nome; END IF;

      IF NEW.description IS NOT NULL AND NEW.descricao IS NULL THEN NEW.descricao := NEW.description;
      ELSIF NEW.descricao IS NOT NULL AND NEW.description IS NULL THEN NEW.description := NEW.descricao; END IF;

      IF NEW.price IS NOT NULL AND NEW.preco IS NULL THEN NEW.preco := NEW.price;
      ELSIF NEW.preco IS NOT NULL AND NEW.price IS NULL THEN NEW.price := NEW.preco; END IF;

      IF NEW.cost_price IS NOT NULL AND NEW.preco_custo IS NULL THEN NEW.preco_custo := NEW.cost_price;
      ELSIF NEW.preco_custo IS NOT NULL AND NEW.cost_price IS NULL THEN NEW.cost_price := NEW.preco_custo; END IF;

      IF NEW.code IS NOT NULL AND NEW.codigo IS NULL THEN NEW.codigo := NEW.code;
      ELSIF NEW.codigo IS NOT NULL AND NEW.code IS NULL THEN NEW.code := NEW.codigo; END IF;

      IF NEW.category IS NOT NULL AND NEW.categoria IS NULL THEN NEW.categoria := NEW.category;
      ELSIF NEW.categoria IS NOT NULL AND NEW.category IS NULL THEN NEW.category := NEW.categoria; END IF;

      IF NEW.image_url IS NOT NULL AND NEW.imagem_url IS NULL THEN NEW.imagem_url := NEW.image_url;
      ELSIF NEW.imagem_url IS NOT NULL AND NEW.image_url IS NULL THEN NEW.image_url := NEW.imagem_url; END IF;

      IF NEW.empresa_id IS NOT NULL AND NEW.company_id IS NULL THEN NEW.company_id := NEW.empresa_id;
      ELSIF NEW.company_id IS NOT NULL AND NEW.empresa_id IS NULL THEN NEW.empresa_id := NEW.company_id; END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_sync_produtos_fields ON public.produtos;
    CREATE TRIGGER trg_sync_produtos_fields
    BEFORE INSERT OR UPDATE ON public.produtos
    FOR EACH ROW EXECUTE FUNCTION public.sync_produtos_fields();

    ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "produtos_all" ON public.produtos;
    CREATE POLICY "produtos_all" ON public.produtos FOR ALL USING (true) WITH CHECK (true);
  `);
  console.log('  ✅ Tabela produtos corrigida com auto-sincronização PT/EN.');

  // 2. ARMAZENS
  console.log('[2/4] Corrigindo tabela armazens...');
  await sql(`
    ALTER TABLE public.armazens ALTER COLUMN nome DROP NOT NULL;
    
    ALTER TABLE public.armazens ADD COLUMN IF NOT EXISTS name TEXT;
    ALTER TABLE public.armazens ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE public.armazens ADD COLUMN IF NOT EXISTS descricao TEXT;
    ALTER TABLE public.armazens ADD COLUMN IF NOT EXISTS location TEXT;
    ALTER TABLE public.armazens ADD COLUMN IF NOT EXISTS localizacao TEXT;
    ALTER TABLE public.armazens ADD COLUMN IF NOT EXISTS responsavel TEXT;
    ALTER TABLE public.armazens ADD COLUMN IF NOT EXISTS capacidade NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE public.armazens ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE;
    ALTER TABLE public.armazens ADD COLUMN IF NOT EXISTS empresa_id UUID;
    ALTER TABLE public.armazens ADD COLUMN IF NOT EXISTS company_id UUID;

    -- Trigger de auto-sincronização armazens (PT <-> EN)
    CREATE OR REPLACE FUNCTION public.sync_armazens_fields()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.name IS NOT NULL AND NEW.nome IS NULL THEN NEW.nome := NEW.name;
      ELSIF NEW.nome IS NOT NULL AND NEW.name IS NULL THEN NEW.name := NEW.nome; END IF;

      IF NEW.description IS NOT NULL AND NEW.descricao IS NULL THEN NEW.descricao := NEW.description;
      ELSIF NEW.descricao IS NOT NULL AND NEW.description IS NULL THEN NEW.description := NEW.descricao; END IF;

      IF NEW.location IS NOT NULL AND NEW.localizacao IS NULL THEN NEW.localizacao := NEW.location;
      ELSIF NEW.localizacao IS NOT NULL AND NEW.location IS NULL THEN NEW.location := NEW.localizacao; END IF;

      IF NEW.empresa_id IS NOT NULL AND NEW.company_id IS NULL THEN NEW.company_id := NEW.empresa_id;
      ELSIF NEW.company_id IS NOT NULL AND NEW.empresa_id IS NULL THEN NEW.empresa_id := NEW.company_id; END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_sync_armazens_fields ON public.armazens;
    CREATE TRIGGER trg_sync_armazens_fields
    BEFORE INSERT OR UPDATE ON public.armazens
    FOR EACH ROW EXECUTE FUNCTION public.sync_armazens_fields();

    ALTER TABLE public.armazens ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "armazens_all" ON public.armazens;
    CREATE POLICY "armazens_all" ON public.armazens FOR ALL USING (true) WITH CHECK (true);
  `);
  console.log('  ✅ Tabela armazens corrigida com auto-sincronização PT/EN.');

  // 3. CATEGORIAS, FORNECEDORES, CLIENTES, IMPOSTOS
  console.log('[3/4] Corrigindo categorias, fornecedores, clientes, impostos...');
  await sql(`
    -- CATEGORIAS
    CREATE TABLE IF NOT EXISTS public.categorias (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      empresa_id UUID,
      company_id UUID,
      name TEXT,
      nome TEXT,
      description TEXT,
      descricao TEXT,
      ativo BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE public.categorias ALTER COLUMN nome DROP NOT NULL;
    ALTER TABLE public.categorias ADD COLUMN IF NOT EXISTS name TEXT;
    ALTER TABLE public.categorias ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE public.categorias ADD COLUMN IF NOT EXISTS descricao TEXT;
    ALTER TABLE public.categorias ADD COLUMN IF NOT EXISTS empresa_id UUID;
    ALTER TABLE public.categorias ADD COLUMN IF NOT EXISTS company_id UUID;
    ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "categorias_all" ON public.categorias;
    CREATE POLICY "categorias_all" ON public.categorias FOR ALL USING (true) WITH CHECK (true);

    -- FORNECEDORES
    CREATE TABLE IF NOT EXISTS public.fornecedores (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      empresa_id UUID,
      company_id UUID,
      name TEXT,
      nome TEXT,
      nif TEXT,
      telefone TEXT,
      email TEXT,
      morada TEXT,
      ativo BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE public.fornecedores ALTER COLUMN nome DROP NOT NULL;
    ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS name TEXT;
    ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS empresa_id UUID;
    ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS company_id UUID;
    ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "fornecedores_all" ON public.fornecedores;
    CREATE POLICY "fornecedores_all" ON public.fornecedores FOR ALL USING (true) WITH CHECK (true);

    -- IMPOSTOS
    CREATE TABLE IF NOT EXISTS public.impostos (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      empresa_id UUID,
      company_id UUID,
      name TEXT,
      nome TEXT,
      taxa NUMERIC(5,2) DEFAULT 14,
      codigo TEXT,
      motivo_isencao TEXT,
      ativo BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE public.impostos ALTER COLUMN nome DROP NOT NULL;
    ALTER TABLE public.impostos ADD COLUMN IF NOT EXISTS name TEXT;
    ALTER TABLE public.impostos ADD COLUMN IF NOT EXISTS empresa_id UUID;
    ALTER TABLE public.impostos ADD COLUMN IF NOT EXISTS company_id UUID;
    ALTER TABLE public.impostos ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "impostos_all" ON public.impostos;
    CREATE POLICY "impostos_all" ON public.impostos FOR ALL USING (true) WITH CHECK (true);
  `);
  console.log('  ✅ Tabelas categorias, fornecedores, impostos corrigidas.');

  // 4. PERFIS E UTILIZADORES DO SISTEMA
  console.log('[4/4] Atualizando perfis e permissões dos administradores...');
  await sql(`
    ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS company_id UUID;
    ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS empresa_id UUID;
    ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT TRUE;
    ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
    ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS permission_areas TEXT[] DEFAULT ARRAY['all', 'admin', 'pos', 'rh', 'contabilidade', 'faturacao', 'relatorios', 'stock', 'configuracoes'];
    ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{"all": true}'::jsonb;
    ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS username TEXT;
    ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS nome TEXT;
    ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS name TEXT;
    ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS email TEXT;
    ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE;

    -- Atualizar perfil admin principal para ter empresa_id e company_id consistentes
    UPDATE public.perfis
    SET 
      company_id = '11111111-0000-0000-0000-000000000001',
      empresa_id = '11111111-0000-0000-0000-000000000001',
      is_admin = TRUE,
      level = 1,
      permission_areas = ARRAY['all', 'admin', 'pos', 'rh', 'contabilidade', 'faturacao', 'relatorios', 'stock', 'configuracoes'],
      ativo = TRUE
    WHERE id = '00000000-0000-0000-0000-000000000001';

    -- Trigger para manter empresa_id e company_id sincronizados em perfis
    CREATE OR REPLACE FUNCTION public.sync_perfis_fields()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.empresa_id IS NOT NULL AND NEW.company_id IS NULL THEN NEW.company_id := NEW.empresa_id;
      ELSIF NEW.company_id IS NOT NULL AND NEW.empresa_id IS NULL THEN NEW.empresa_id := NEW.company_id; END IF;

      IF NEW.name IS NOT NULL AND NEW.nome IS NULL THEN NEW.nome := NEW.name;
      ELSIF NEW.nome IS NOT NULL AND NEW.name IS NULL THEN NEW.name := NEW.nome; END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_sync_perfis_fields ON public.perfis;
    CREATE TRIGGER trg_sync_perfis_fields
    BEFORE INSERT OR UPDATE ON public.perfis
    FOR EACH ROW EXECUTE FUNCTION public.sync_perfis_fields();

    ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "perfis_all" ON public.perfis;
    CREATE POLICY "perfis_all" ON public.perfis FOR ALL USING (true) WITH CHECK (true);
  `);
  console.log('  ✅ Perfis e permissões atualizadas.');

  await sql("NOTIFY pgrst, 'reload schema';");
  console.log('\n✅ SCHEMA RELOAD notificado com sucesso!');
}

run().catch(e => { console.error('Erro:', e); process.exit(1); });

