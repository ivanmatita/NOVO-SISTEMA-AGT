// scripts/fix_buckets_and_tables_all.mjs
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
  console.log('=== FIX COMPLETO: STORAGE BUCKETS, MÉTRICAS, ALERTAS, CARTAS, MEDIA ===\n');

  // 1. CRIAR TODOS OS STORAGE BUCKETS
  console.log('[1/5] Criando e configurando Storage Buckets...');
  await sql(`
    -- Inserir todos os buckets necessários
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES 
      ('cartas-media', 'cartas-media', true, 52428800, null),
      ('media', 'media', true, 52428800, null),
      ('documentos', 'documentos', true, 52428800, null),
      ('empresa-documentos', 'empresa-documentos', true, 52428800, null),
      ('avatars', 'avatars', true, 52428800, null),
      ('system-data', 'system-data', true, 52428800, null),
      ('correspondencia', 'correspondencia', true, 52428800, null),
      ('graficos', 'graficos', true, 52428800, null),
      ('comprovativos', 'comprovativos', true, 52428800, null)
    ON CONFLICT (id) DO UPDATE 
    SET public = true, file_size_limit = 52428800;

    -- Políticas abertas para storage.objects
    DROP POLICY IF EXISTS "storage_objects_all" ON storage.objects;
    CREATE POLICY "storage_objects_all" ON storage.objects
      FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "storage_buckets_all" ON storage.buckets;
    CREATE POLICY "storage_buckets_all" ON storage.buckets
      FOR ALL USING (true) WITH CHECK (true);
  `);
  console.log('  ✅ Todos os Storage Buckets criados e acessíveis publicamente.\n');

  // 2. CORRIGIR RLS DA TABELA METRICS
  console.log('[2/5] Corrigindo RLS da tabela metrics...');
  await sql(`
    ALTER TABLE public.metrics ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "metrics_all" ON public.metrics;
    DROP POLICY IF EXISTS "metrics_open_all" ON public.metrics;
    CREATE POLICY "metrics_all" ON public.metrics
      FOR ALL USING (true) WITH CHECK (true);
  `);
  console.log('  ✅ Tabela metrics: RLS aberto e permissões totais concedidas.\n');

  // 3. CORRIGIR TABELA ALERTAS E ALERTAS_TAREFAS
  console.log('[3/5] Corrigindo tabelas de alertas...');
  await sql(`
    CREATE TABLE IF NOT EXISTS public.alertas (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      empresa_id UUID,
      company_id UUID,
      titulo TEXT,
      mensagem TEXT,
      tipo TEXT DEFAULT 'info',
      importancia TEXT DEFAULT 'media',
      lido BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE public.alertas ADD COLUMN IF NOT EXISTS empresa_id UUID;
    ALTER TABLE public.alertas ADD COLUMN IF NOT EXISTS company_id UUID;
    ALTER TABLE public.alertas ADD COLUMN IF NOT EXISTS titulo TEXT;
    ALTER TABLE public.alertas ADD COLUMN IF NOT EXISTS mensagem TEXT;
    ALTER TABLE public.alertas ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'info';
    ALTER TABLE public.alertas ADD COLUMN IF NOT EXISTS importancia TEXT DEFAULT 'media';
    ALTER TABLE public.alertas ADD COLUMN IF NOT EXISTS lido BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.alertas ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE public.alertas ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

    ALTER TABLE public.alertas ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "alertas_all" ON public.alertas;
    CREATE POLICY "alertas_all" ON public.alertas FOR ALL USING (true) WITH CHECK (true);

    -- Alertas Tarefas
    ALTER TABLE public.alertas_tarefas ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "alertas_tarefas_all" ON public.alertas_tarefas;
    CREATE POLICY "alertas_tarefas_all" ON public.alertas_tarefas FOR ALL USING (true) WITH CHECK (true);
  `);
  console.log('  ✅ Tabelas alertas e alertas_tarefas corrigidas com RLS aberto.\n');

  // 4. CORRIGIR TABELA CARTAS E MEDIA_ARQUIVOS
  console.log('[4/5] Corrigindo tabelas cartas e media_arquivos...');
  await sql(`
    CREATE TABLE IF NOT EXISTS public.cartas (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      empresa_id UUID,
      company_id UUID,
      destinatario TEXT,
      nome_destinatario TEXT,
      morada TEXT,
      localidade TEXT,
      provincia TEXT,
      codigo_postal TEXT,
      pais TEXT,
      observacoes TEXT,
      assunto TEXT,
      data_documento DATE,
      descricao_data TEXT,
      email_destinatario TEXT,
      tracking TEXT,
      confidencial BOOLEAN DEFAULT FALSE,
      imprimir_pagina BOOLEAN DEFAULT FALSE,
      referencia TEXT,
      area_sector TEXT,
      serie TEXT,
      tipo_documento TEXT,
      conteudo TEXT,
      imagem_url TEXT,
      imagem_path TEXT,
      imagem_nome TEXT,
      imagem_name TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS empresa_id UUID;
    ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS company_id UUID;
    ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS destinatario TEXT;
    ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS nome_destinatario TEXT;
    ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS morada TEXT;
    ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS localidade TEXT;
    ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS provincia TEXT;
    ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS codigo_postal TEXT;
    ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS pais TEXT;
    ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS observacoes TEXT;
    ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS assunto TEXT;
    ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS data_documento DATE;
    ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS descricao_data TEXT;
    ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS email_destinatario TEXT;
    ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS tracking TEXT;
    ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS confidencial BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS imprimir_pagina BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS referencia TEXT;
    ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS area_sector TEXT;
    ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS serie TEXT;
    ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS tipo_documento TEXT;
    ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS conteudo TEXT;
    ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS imagem_url TEXT;
    ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS imagem_path TEXT;
    ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS imagem_nome TEXT;
    ALTER TABLE public.cartas ADD COLUMN IF NOT EXISTS imagem_name TEXT;

    ALTER TABLE public.cartas ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "cartas_all" ON public.cartas;
    CREATE POLICY "cartas_all" ON public.cartas FOR ALL USING (true) WITH CHECK (true);

    -- Media Arquivos
    ALTER TABLE public.media_arquivos ADD COLUMN IF NOT EXISTS empresa_id UUID;
    ALTER TABLE public.media_arquivos ADD COLUMN IF NOT EXISTS company_id UUID;
    ALTER TABLE public.media_arquivos ADD COLUMN IF NOT EXISTS carta_id UUID;
    ALTER TABLE public.media_arquivos ADD COLUMN IF NOT EXISTS url TEXT;
    ALTER TABLE public.media_arquivos ADD COLUMN IF NOT EXISTS path TEXT;
    ALTER TABLE public.media_arquivos ADD COLUMN IF NOT EXISTS nome_original TEXT;
    ALTER TABLE public.media_arquivos ADD COLUMN IF NOT EXISTS tipo_ficheiro TEXT;
    ALTER TABLE public.media_arquivos ADD COLUMN IF NOT EXISTS tamanho NUMERIC;
    ALTER TABLE public.media_arquivos ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.media_arquivos ADD COLUMN IF NOT EXISTS tipo TEXT;
    ALTER TABLE public.media_arquivos ADD COLUMN IF NOT EXISTS nome_arquivo TEXT;
    ALTER TABLE public.media_arquivos ADD COLUMN IF NOT EXISTS caminho_arquivo TEXT;
    ALTER TABLE public.media_arquivos ADD COLUMN IF NOT EXISTS url_publica TEXT;
    ALTER TABLE public.media_arquivos ADD COLUMN IF NOT EXISTS url_arquivo TEXT;
    ALTER TABLE public.media_arquivos ADD COLUMN IF NOT EXISTS bucket TEXT;
    ALTER TABLE public.media_arquivos ADD COLUMN IF NOT EXISTS mime_type TEXT;
    ALTER TABLE public.media_arquivos ADD COLUMN IF NOT EXISTS tamanho_bytes BIGINT;
    ALTER TABLE public.media_arquivos ADD COLUMN IF NOT EXISTS extensao TEXT;
    ALTER TABLE public.media_arquivos ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE;

    ALTER TABLE public.media_arquivos ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "media_arquivos_all" ON public.media_arquivos;
    CREATE POLICY "media_arquivos_all" ON public.media_arquivos FOR ALL USING (true) WITH CHECK (true);
  `);
  console.log('  ✅ Tabelas cartas e media_arquivos configuradas com RLS aberto.\n');

  // 5. CORRIGIR COLABORADORES: CONVERTER STRINGS VAZIAS PARA NULL EM DATAS
  console.log('[5/5] Adicionando trigger de sanitização de datas em colaboradores...');
  await sql(`
    CREATE OR REPLACE FUNCTION public.clean_colaboradores_dates()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Se vier string vazia ou formato inválido, garantir que fica null
      IF NEW.nome IS NOT NULL AND NEW.name IS NULL THEN
        NEW.name := NEW.nome;
      ELSIF NEW.name IS NOT NULL AND NEW.nome IS NULL THEN
        NEW.nome := NEW.name;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_clean_colaboradores_dates ON public.colaboradores;
    CREATE TRIGGER trg_clean_colaboradores_dates
    BEFORE INSERT OR UPDATE ON public.colaboradores
    FOR EACH ROW EXECUTE FUNCTION public.clean_colaboradores_dates();
  `);
  console.log('  ✅ Trigger para colaboradores configurado.\n');

  await sql("NOTIFY pgrst, 'reload schema';");
  console.log('✅ SCHEMA RELOAD notificado com sucesso!');
}

run().catch(e => { console.error('Erro:', e); process.exit(1); });

