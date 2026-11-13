// scripts/complete_parity_sync.mjs
const token = 'process.env.SUPABASE_TOKEN';
const stagingRef = 'sfnibpxfevhelaikqbiq';

async function queryDb(ref, sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Query error on ${ref}: ${errText}`);
  }
  return await res.json();
}

async function runFixes() {
  console.log('Aplicando tabelas e colunas específicas no Staging...');

  const sql = `
    -- 1. EMPLOYEE_PENALTIES (Multas e Penalizações de Funcionários)
    CREATE TABLE IF NOT EXISTS public.employee_penalties (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      empresa_id UUID,
      employee_id INTEGER,
      colaborador_id INTEGER,
      tipo TEXT,
      motivo TEXT,
      valor NUMERIC(15,2) DEFAULT 0,
      data DATE DEFAULT CURRENT_DATE,
      aplicado_por TEXT,
      observacoes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE public.employee_penalties ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "employee_penalties_all" ON public.employee_penalties;
    CREATE POLICY "employee_penalties_all" ON public.employee_penalties FOR ALL USING (true) WITH CHECK (true);

    -- 2. EMPLOYEE_DOCUMENTS
    CREATE TABLE IF NOT EXISTS public.employee_documents (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      empresa_id UUID,
      employee_id INTEGER,
      colaborador_id INTEGER,
      nome TEXT,
      tipo TEXT,
      url TEXT,
      path TEXT,
      tamanho BIGINT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "employee_documents_all" ON public.employee_documents;
    CREATE POLICY "employee_documents_all" ON public.employee_documents FOR ALL USING (true) WITH CHECK (true);

    -- 3. PROFESSIONS
    ALTER TABLE public.professions ADD COLUMN IF NOT EXISTS name TEXT;
    ALTER TABLE public.professions ADD COLUMN IF NOT EXISTS inss_profession TEXT;
    ALTER TABLE public.professions ADD COLUMN IF NOT EXISTS base_salary NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE public.professions ADD COLUMN IF NOT EXISTS acerto_salarial NUMERIC(15,2) DEFAULT 0;
    ALTER TABLE public.professions ADD COLUMN IF NOT EXISTS empresa_id UUID;

    -- Atualizar professions com name se nulo
    UPDATE public.professions SET name = COALESCE(name, nome);

    -- 4. SERIES_FISCAIS
    ALTER TABLE public.series_fiscais ADD COLUMN IF NOT EXISTS serie TEXT;
    ALTER TABLE public.series_fiscais ADD COLUMN IF NOT EXISTS descricao TEXT;
    ALTER TABLE public.series_fiscais ADD COLUMN IF NOT EXISTS tipo TEXT;
    ALTER TABLE public.series_fiscais ADD COLUMN IF NOT EXISTS utilizador_id UUID;
    ALTER TABLE public.series_fiscais ADD COLUMN IF NOT EXISTS proximo_numero INTEGER DEFAULT 1;

    UPDATE public.series_fiscais
    SET 
      serie = COALESCE(serie, prefixo, 'TEST-FR A/2026'),
      descricao = COALESCE(descricao, 'Série de Facturas Simplificadas de Teste'),
      tipo = COALESCE(tipo, tipo_documento, 'FR'),
      proximo_numero = COALESCE(proximo_numero, contador + 1, 1);

    -- 5. PERFIS
    ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS permission_areas TEXT[] DEFAULT ARRAY['all', 'admin', 'pos', 'rh', 'contabilidade', 'faturacao', 'relatorios'];
    ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT TRUE;
    ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;

    UPDATE public.perfis
    SET 
      is_admin = TRUE,
      level = 1,
      permission_areas = ARRAY['all', 'admin', 'pos', 'rh', 'contabilidade', 'faturacao', 'relatorios']
    WHERE user_id = '00000000-0000-0000-0000-000000000001';

    -- 6. STORAGE BUCKETS & POLICIES
    INSERT INTO storage.buckets (id, name, public) VALUES ('empresa-documentos', 'empresa-documentos', true) ON CONFLICT (id) DO NOTHING;
    INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', true) ON CONFLICT (id) DO NOTHING;
    INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
    INSERT INTO storage.buckets (id, name, public) VALUES ('documentos', 'documentos', true) ON CONFLICT (id) DO NOTHING;
    INSERT INTO storage.buckets (id, name, public) VALUES ('system-data', 'system-data', true) ON CONFLICT (id) DO NOTHING;

    DROP POLICY IF EXISTS "Public access empresa-documentos" ON storage.objects;
    CREATE POLICY "Public access empresa-documentos" ON storage.objects FOR ALL USING (bucket_id = 'empresa-documentos') WITH CHECK (bucket_id = 'empresa-documentos');

    DROP POLICY IF EXISTS "Public access media" ON storage.objects;
    CREATE POLICY "Public access media" ON storage.objects FOR ALL USING (bucket_id = 'media') WITH CHECK (bucket_id = 'media');

    DROP POLICY IF EXISTS "Public access avatars" ON storage.objects;
    CREATE POLICY "Public access avatars" ON storage.objects FOR ALL USING (bucket_id = 'avatars') WITH CHECK (bucket_id = 'avatars');

    DROP POLICY IF EXISTS "Public access documentos" ON storage.objects;
    CREATE POLICY "Public access documentos" ON storage.objects FOR ALL USING (bucket_id = 'documentos') WITH CHECK (bucket_id = 'documentos');

    DROP POLICY IF EXISTS "Public access system-data" ON storage.objects;
    CREATE POLICY "Public access system-data" ON storage.objects FOR ALL USING (bucket_id = 'system-data') WITH CHECK (bucket_id = 'system-data');

    -- NOTIFY SCHEMA RELOAD
    NOTIFY pgrst, 'reload schema';
  `;

  await queryDb(stagingRef, sql);
  console.log('✅ TODAS as tabelas, colunas e storage buckets criados e atualizados no Staging com SUCESSO!');
}

runFixes().catch(e => console.error('Erro na execução:', e));

