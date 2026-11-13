// scripts/sync_staging_schema.mjs
const token = 'process.env.SUPABASE_TOKEN';
const prodRef = 'nawqfidnawokqaheqvar';
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

async function alignSchema() {
  console.log('1. Obtendo colunas da Produção...');
  const prodCols = await queryDb(prodRef, `
    SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `);
  console.log(`Colunas encontradas na Produção: ${prodCols.length}`);

  console.log('2. Obtendo colunas do Staging...');
  const stagingCols = await queryDb(stagingRef, `
    SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `);
  console.log(`Colunas encontradas no Staging: ${stagingCols.length}`);

  const stagingColMap = new Set(stagingCols.map(c => `${c.table_name}.${c.column_name}`));
  const missingCols = prodCols.filter(c => !stagingColMap.has(`${c.table_name}.${c.column_name}`));

  console.log(`Colunas em falta no Staging: ${missingCols.length}`);

  const alterStatements = [];

  // 1. Criar query_exec RPC no Staging para o servidor
  alterStatements.push(`
    CREATE OR REPLACE FUNCTION public.query_exec(query text)
    RETURNS json
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      v_ret json;
    BEGIN
      EXECUTE query;
      RETURN json_build_object('status', 'ok');
    EXCEPTION WHEN OTHERS THEN
      RETURN json_build_object('error', SQLERRM);
    END;
    $$;
  `);

  // 2. Adicionar cada coluna em falta
  for (const col of missingCols) {
    let colType = col.data_type;
    if (colType === 'USER-DEFINED') {
      colType = col.udt_name;
    } else if (colType === 'ARRAY') {
      colType = 'TEXT[]';
    } else if (colType === 'character varying') {
      colType = 'TEXT';
    } else if (col.udt_name && col.udt_name.startsWith('_')) {
      colType = 'TEXT[]';
    }

    let defaultClause = '';
    if (col.column_default && !col.column_default.includes('nextval')) {
      // Usar default se simples
      if (col.column_default.includes('now()') || col.column_default.includes('CURRENT_TIMESTAMP')) {
        defaultClause = ' DEFAULT NOW()';
      } else if (col.column_default === 'true' || col.column_default === 'false') {
        defaultClause = ` DEFAULT ${col.column_default}`;
      } else if (col.column_default === '0' || col.column_default === "'ativo'::text") {
        defaultClause = ` DEFAULT ${col.column_default}`;
      }
    }

    alterStatements.push(`ALTER TABLE public."${col.table_name}" ADD COLUMN IF NOT EXISTS "${col.column_name}" ${colType}${defaultClause};`);
  }

  // 3. Garantir colunas essenciais reportadas pelo usuário
  alterStatements.push(`
    -- EMPRESAS
    ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS auth_user_id UUID;
    ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS nome_empresa TEXT;
    ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS endereco TEXT;
    ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS provincia TEXT;
    ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS municipio TEXT;
    ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS pais TEXT DEFAULT 'Angola';
    ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS codigo_postal TEXT;
    ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS inss TEXT;
    ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS contacto TEXT;
    ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS responsavel TEXT;
    ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS regime TEXT;
    ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS tipo_empresa TEXT;
    ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS coordenadas_bancarias TEXT;
    ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS logo_size NUMERIC DEFAULT 100;
    ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS watermark_url TEXT;
    ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS watermark_size NUMERIC DEFAULT 100;
    ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS footer_image_url TEXT;
    ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS footer_size NUMERIC DEFAULT 100;
    ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS matricula TEXT;
    ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS alvara TEXT;
    ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS localizacao TEXT;

    -- CLIENTES
    ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS company_id UUID;
    ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS contribuinte TEXT;
    ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS codigo_postal TEXT;
    ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS localidade TEXT;
    ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS provincia TEXT;
    ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS municipio TEXT;
    ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS pais TEXT DEFAULT 'Angola';
    ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS estado_nif TEXT DEFAULT 'ativo';
    ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS webpage TEXT;
    ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS tipo_cliente TEXT DEFAULT 'normal';
    ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS saldo_inicial NUMERIC DEFAULT 0;

    -- MEDIA_ARQUIVOS
    ALTER TABLE public.media_arquivos ADD COLUMN IF NOT EXISTS url_publica TEXT;
    ALTER TABLE public.media_arquivos ADD COLUMN IF NOT EXISTS utilizador_id UUID;
    ALTER TABLE public.media_arquivos ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE;
    ALTER TABLE public.media_arquivos ADD COLUMN IF NOT EXISTS company_id UUID;

    -- PRODUTOS
    ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS name TEXT;
    ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS price NUMERIC(15,2);
    ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS cost_price NUMERIC(15,2);
    ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS code TEXT;
    ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS category TEXT;
    ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'UN';
    ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS tax_id TEXT;
    ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;
    ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS company_id UUID;
    ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS image_url TEXT;

    -- METRICS
    ALTER TABLE public.metrics ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE;
    ALTER TABLE public.metrics ADD COLUMN IF NOT EXISTS company_id UUID;
    ALTER TABLE public.metrics ADD COLUMN IF NOT EXISTS type TEXT;
    ALTER TABLE public.metrics ADD COLUMN IF NOT EXISTS value NUMERIC(15,2);
    ALTER TABLE public.metrics ADD COLUMN IF NOT EXISTS description TEXT;

    -- ALERTAS_TAREFAS
    ALTER TABLE public.alertas_tarefas ADD COLUMN IF NOT EXISTS start_date DATE;
    ALTER TABLE public.alertas_tarefas ADD COLUMN IF NOT EXISTS end_date DATE;
    ALTER TABLE public.alertas_tarefas ADD COLUMN IF NOT EXISTS responsible TEXT;
    ALTER TABLE public.alertas_tarefas ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo';
    ALTER TABLE public.alertas_tarefas ADD COLUMN IF NOT EXISTS company_id UUID;

    -- USER_ACTIVITIES_SESSIONS
    ALTER TABLE public.user_activities_sessions ADD COLUMN IF NOT EXISTS utilizador_id UUID;
    ALTER TABLE public.user_activities_sessions ADD COLUMN IF NOT EXISTS email TEXT;
    ALTER TABLE public.user_activities_sessions ADD COLUMN IF NOT EXISTS data_entrada TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE public.user_activities_sessions ADD COLUMN IF NOT EXISTS data_saida TIMESTAMPTZ;
    ALTER TABLE public.user_activities_sessions ADD COLUMN IF NOT EXISTS tempo_ativo_segundos INTEGER DEFAULT 0;
    ALTER TABLE public.user_activities_sessions ADD COLUMN IF NOT EXISTS movimentos INTEGER DEFAULT 0;
    ALTER TABLE public.user_activities_sessions ADD COLUMN IF NOT EXISTS insercoes INTEGER DEFAULT 0;
    ALTER TABLE public.user_activities_sessions ADD COLUMN IF NOT EXISTS tarefas_concluidas INTEGER DEFAULT 0;
    ALTER TABLE public.user_activities_sessions ADD COLUMN IF NOT EXISTS ip TEXT;
    ALTER TABLE public.user_activities_sessions ADD COLUMN IF NOT EXISTS navegador TEXT;
    ALTER TABLE public.user_activities_sessions ADD COLUMN IF NOT EXISTS ultimo_clique TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE public.user_activities_sessions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo';

    -- CONFIG_EMPRESA
    ALTER TABLE public.config_empresa ADD COLUMN IF NOT EXISTS nif TEXT;
    ALTER TABLE public.config_empresa ADD COLUMN IF NOT EXISTS nome TEXT;
    ALTER TABLE public.config_empresa ADD COLUMN IF NOT EXISTS email TEXT;
    ALTER TABLE public.config_empresa ADD COLUMN IF NOT EXISTS regime_iva TEXT;
    ALTER TABLE public.config_empresa ADD COLUMN IF NOT EXISTS telefone TEXT;
    ALTER TABLE public.config_empresa ADD COLUMN IF NOT EXISTS morada TEXT;
    ALTER TABLE public.config_empresa ADD COLUMN IF NOT EXISTS logo_url TEXT;

    -- Preencher auth_user_id e nome_empresa para a empresa de teste
    UPDATE public.empresas
    SET 
      auth_user_id = '00000000-0000-0000-0000-000000000001',
      nome_empresa = COALESCE(nome, '[TESTE] Empresa Alpha Lda'),
      codigo_postal = '0000'
    WHERE id = '11111111-0000-0000-0000-000000000001';

    -- Atualizar produtos de teste com colunas name, price, etc
    UPDATE public.produtos
    SET 
      name = COALESCE(name, nome),
      price = COALESCE(price, preco),
      cost_price = COALESCE(cost_price, preco_compra),
      code = COALESCE(code, codigo),
      description = COALESCE(description, descricao),
      unit = COALESCE(unit, unidade),
      category = COALESCE(category, categoria),
      active = COALESCE(active, ativo, TRUE)
    WHERE empresa_id = '11111111-0000-0000-0000-000000000001';

    -- Atualizar clientes de teste com company_id e campos
    UPDATE public.clientes
    SET 
      company_id = COALESCE(company_id, empresa_id),
      contribuinte = COALESCE(contribuinte, nif),
      codigo_postal = '0000',
      pais = 'Angola'
    WHERE empresa_id = '11111111-0000-0000-0000-000000000001';
  `);

  console.log(`3. Executando ${alterStatements.length} blocos SQL no Staging...`);
  
  // Executar em chunks
  const chunkSize = 25;
  for (let i = 0; i < alterStatements.length; i += chunkSize) {
    const chunk = alterStatements.slice(i, i + chunkSize).join('\n');
    console.log(`Aplicando lote ${i + 1} a ${Math.min(i + chunkSize, alterStatements.length)}...`);
    try {
      await queryDb(stagingRef, chunk);
    } catch (err) {
      console.error(`Erro no lote ${i + 1}:`, err.message);
    }
  }

  // Notificar reload schema
  await queryDb(stagingRef, "NOTIFY pgrst, 'reload schema';");
  console.log('✅ 4. SUCESSO! Todas as colunas sincronizadas e schema cache atualizado no Staging.');
}

alignSchema().catch(e => console.error('Erro geral:', e));

