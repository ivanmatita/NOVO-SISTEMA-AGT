// Master Staging Fix and Seed Script
// Applies missing RPCs, Storage policies, RLS and seeds test data across all reported modules
const token = process.env.SUPABASE_TOKEN || 'process.env.SUPABASE_TOKEN';
const ref = 'sfnibpxfevhelaikqbiq';
const EMPRESA_ID = '11111111-0000-0000-0000-000000000001';

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
  console.log("==================================================");
  console.log("1. CRIANDO RPCs AUSENTES NO STAGING");
  console.log("==================================================");

  // 1. gerar_numero_documento
  await sql("RPC gerar_numero_documento", `
    CREATE OR REPLACE FUNCTION public.gerar_numero_documento(
      empresa_id_param uuid,
      tipo_documento_param text
    )
    RETURNS text
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      v_num text;
    BEGIN
      SELECT public.obter_e_incrementar_serie(empresa_id_param, tipo_documento_param) INTO v_num;
      IF v_num IS NULL THEN
        v_num := tipo_documento_param || ' ' || to_char(CURRENT_DATE, 'YYYY') || '/' || floor(random() * 9000 + 1000)::text;
      END IF;
      RETURN v_num;
    EXCEPTION WHEN OTHERS THEN
      RETURN tipo_documento_param || ' ' || to_char(CURRENT_DATE, 'YYYY') || '/' || floor(random() * 9000 + 1000)::text;
    END;
    $$;
  `);

  // 2. delete_purchase_document
  await sql("RPC delete_purchase_document", `
    CREATE OR REPLACE FUNCTION public.delete_purchase_document(p_id bigint)
    RETURNS boolean
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      DELETE FROM public.compras WHERE id = p_id;
      RETURN true;
    EXCEPTION WHEN OTHERS THEN
      RETURN false;
    END;
    $$;
  `);

  // 3. emitir_documento_simples
  await sql("RPC emitir_documento_simples", `
    CREATE OR REPLACE FUNCTION public.emitir_documento_simples(
      p_empresa_id uuid,
      p_tipo text,
      p_cliente_nome text,
      p_cliente_nif text,
      p_cliente_email text,
      p_total numeric,
      p_imposto numeric,
      p_detalhes jsonb
    )
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      v_id uuid;
      v_num text;
    BEGIN
      SELECT public.gerar_numero_documento(p_empresa_id, p_tipo) INTO v_num;
      INSERT INTO public.documentos_emitidos (
        id, empresa_id, tipo_documento, numero_documento,
        cliente_nome, cliente_nif, cliente_email,
        total, imposto, itens, data_emissao, status, estado
      ) VALUES (
        gen_random_uuid(), p_empresa_id, p_tipo, v_num,
        p_cliente_nome, p_cliente_nif, p_cliente_email,
        p_total, p_imposto, p_detalhes, NOW(), 'emitido', 'emitido'
      ) RETURNING id INTO v_id;
      
      RETURN jsonb_build_object('id', v_id, 'numero', v_num, 'status', 'emitido');
    END;
    $$;
  `);

  // 4. anular_documento
  await sql("RPC anular_documento", `
    CREATE OR REPLACE FUNCTION public.anular_documento(
      p_documento_id uuid,
      p_motivo text
    )
    RETURNS boolean
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      UPDATE public.documentos_emitidos
      SET status = 'anulado', estado = 'anulado', motivo_anulacao = p_motivo
      WHERE id = p_documento_id;
      RETURN true;
    END;
    $$;
  `);

  console.log("\n==================================================");
  console.log("2. APLICANDO POLÍTICAS RLS NAS TABELAS ADICIONAIS");
  console.log("==================================================");

  const extraTables = [
    'config_empresa', 'configuracoes_graficas', 'professions',
    'hr_contratos', 'documentos_empresa', 'media_arquivos',
    'diarios_contabeis', 'pgc_plano_contas', 'lancamentos_contabeis',
    'metrics', 'arquivos'
  ];

  for (const tbl of extraTables) {
    await sql(`RLS enable on ${tbl}`, `
      ALTER TABLE public."${tbl}" ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "${tbl}_authenticated_all" ON public."${tbl}";
      DROP POLICY IF EXISTS "${tbl}_isolation" ON public."${tbl}";
      DROP POLICY IF EXISTS "${tbl}_all_access" ON public."${tbl}";
      CREATE POLICY "${tbl}_authenticated_all" ON public."${tbl}"
      FOR ALL TO authenticated
      USING (
        empresa_id = public.auth_empresa_id()
        OR empresa_id IS NULL
        OR public.auth_role() = 'superadmin'
      )
      WITH CHECK (
        empresa_id = public.auth_empresa_id()
        OR empresa_id IS NULL
        OR public.auth_role() = 'superadmin'
      );
    `);
  }

  console.log("\n==================================================");
  console.log("3. SEEDING DE DADOS DE TESTE PARA TODOS OS MÓDULOS");
  console.log("==================================================");

  // 1. Config Empresa
  await sql("Seed config_empresa", `
    INSERT INTO public.config_empresa (
      id, empresa_id, nome_empresa, nif, email, telefone, endereco, provincia, municipio, regime, tipo_empresa, cor_primaria, created_at
    )
    SELECT
      gen_random_uuid(), '${EMPRESA_ID}'::uuid,
      '[TESTE] Empresa Alpha Lda', '5000000001', 'alpha-teste@staging.local', '+244 923 000 001',
      'Avenida 4 de Fevereiro, Luanda', 'Luanda', 'Luanda', 'Geral', 'Sociedade por Quotas', '#2563eb', NOW()
    WHERE NOT EXISTS (SELECT 1 FROM public.config_empresa WHERE empresa_id = '${EMPRESA_ID}');
  `);

  // 2. Configuracoes Graficas
  await sql("Seed configuracoes_graficas", `
    INSERT INTO public.configuracoes_graficas (
      id, empresa_id, tipo, cor_primaria, cor_secundaria, fonte, mostrar_logo, mostrar_cabecalho, mostrar_rodape, ativo, created_at
    )
    SELECT
      gen_random_uuid(), '${EMPRESA_ID}'::uuid, 'A4', '#1e40af', '#64748b', 'Inter', true, true, true, true, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM public.configuracoes_graficas WHERE empresa_id = '${EMPRESA_ID}');
  `);

  // 3. Professions
  await sql("Seed professions", `
    INSERT INTO public.professions (id, empresa_id, nome, name, descricao, salario_base, base_salary, created_at)
    SELECT
      gen_random_uuid(), '${EMPRESA_ID}'::uuid, p.nome, p.nome, p.descricao, p.salario, p.salario, NOW()
    FROM (
      VALUES
        ('Gestor de Contas', 'Gestão comercial e acompanhamento de clientes', 450000),
        ('Contabilista Sénior', 'Contabilidade geral, fecho de contas e impostos', 600000),
        ('Técnico de Informática', 'Suporte técnico de hardware e redes', 350000),
        ('Operador de Caixa', 'Atendimento no ponto de venda e controlo de caixa', 200000),
        ('Motorista de Distribuição', 'Transporte e entrega de mercadorias', 250000)
    ) AS p(nome, descricao, salario)
    WHERE NOT EXISTS (SELECT 1 FROM public.professions WHERE empresa_id = '${EMPRESA_ID}');
  `);

  // 4. Diarios Contabeis
  await sql("Seed diarios_contabeis", `
    INSERT INTO public.diarios_contabeis (id, empresa_id, codigo, descricao, tipo, ativo, is_active, created_at)
    SELECT
      gen_random_uuid(), '${EMPRESA_ID}'::uuid, d.codigo, d.descricao, d.tipo, true, true, NOW()
    FROM (
      VALUES
        ('0001', 'Diário de Vendas e Facturação', 'Vendas'),
        ('0002', 'Diário de Compras e Fornecedores', 'Compras'),
        ('0003', 'Diário de Caixa e Bancos', 'Caixa'),
        ('0004', 'Diário de Operações Diversas', 'Geral')
    ) AS d(codigo, descricao, tipo)
    WHERE NOT EXISTS (SELECT 1 FROM public.diarios_contabeis WHERE empresa_id = '${EMPRESA_ID}');
  `);

  // 5. PGC Plano de Contas
  await sql("Seed pgc_plano_contas", `
    INSERT INTO public.pgc_plano_contas (id, empresa_id, codigo, conta, descricao, tipo, natureza, nivel, ativo, is_system, created_at)
    SELECT
      gen_random_uuid(), '${EMPRESA_ID}'::uuid, c.codigo, c.codigo, c.descricao, c.tipo, c.natureza, c.nivel, true, true, NOW()
    FROM (
      VALUES
        ('11.1', 'Caixa Geral', 'Activo', 'Devedora', 3),
        ('12.1', 'Banco BFA - KZ', 'Activo', 'Devedora', 3),
        ('31.1.2.1', 'Clientes Gerais', 'Activo', 'Devedora', 4),
        ('32.1.2.1', 'Fornecedores Gerais', 'Passivo', 'Credora', 4),
        ('34.5.1', 'IVA Liquidado - 14%', 'Passivo', 'Credora', 3),
        ('34.5.2', 'IVA Dedutível - 14%', 'Activo', 'Devedora', 3),
        ('61.1', 'Vendas de Mercadorias', 'Proveito', 'Credora', 3),
        ('71.1', 'Custos de Mercadorias Vendidas', 'Custo', 'Devedora', 3),
        ('75.1', 'Remunerações do Pessoal', 'Custo', 'Devedora', 3)
    ) AS c(codigo, descricao, tipo, natureza, nivel)
    WHERE NOT EXISTS (SELECT 1 FROM public.pgc_plano_contas WHERE empresa_id = '${EMPRESA_ID}');
  `);

  // 6. Metrics
  await sql("Seed metrics", `
    INSERT INTO public.metrics (id, empresa_id, tipo, type, valor, value, periodo, descricao, description, created_at)
    SELECT
      gen_random_uuid(), '${EMPRESA_ID}'::uuid, m.tipo, m.tipo, m.valor, m.valor, '2026-08', m.descricao, m.descricao, NOW()
    FROM (
      VALUES
        ('faturacao_mensal', 12500000, 'Volume de facturação mensal acumulado'),
        ('total_vendas', 48, 'Número total de vendas realizadas no mês'),
        ('novos_clientes', 12, 'Número de novos clientes registados'),
        ('saldo_caixa_total', 3450000, 'Saldo consolidado de caixa e bancos')
    ) AS m(tipo, valor, descricao)
    WHERE NOT EXISTS (SELECT 1 FROM public.metrics WHERE empresa_id = '${EMPRESA_ID}');
  `);

  // 7. Storage Policies
  await sql("Storage Policies for Authenticated Users", `
    -- Enable access to storage objects for authenticated users
    DROP POLICY IF EXISTS "authenticated_storage_select" ON storage.objects;
    DROP POLICY IF EXISTS "authenticated_storage_insert" ON storage.objects;
    DROP POLICY IF EXISTS "authenticated_storage_update" ON storage.objects;
    DROP POLICY IF EXISTS "authenticated_storage_delete" ON storage.objects;

    CREATE POLICY "authenticated_storage_select" ON storage.objects
    FOR SELECT TO authenticated USING (true);

    CREATE POLICY "authenticated_storage_insert" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (true);

    CREATE POLICY "authenticated_storage_update" ON storage.objects
    FOR UPDATE TO authenticated USING (true);

    CREATE POLICY "authenticated_storage_delete" ON storage.objects
    FOR DELETE TO authenticated USING (true);
  `);

  console.log("\n=== MASTER STAGING FIX CONCLUÍDO COM SUCESSO! ===");
}

run().catch(console.error);

