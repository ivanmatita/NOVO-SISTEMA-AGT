// scripts/seed_staging_data.mjs
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

async function seed() {
  const sql = `
    -- Garantir company_id em perfis
    ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS company_id UUID;

    -- 1. PROFISSÕES
    INSERT INTO public.professions (id, empresa_id, name, nome, inss_profession, base_salary, acerto_salarial)
    VALUES 
      ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Administrador de Sistemas', 'Administrador de Sistemas', 'Direção / TI', 250000.00, 0),
      ('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'Contabilista Sénior', 'Contabilista Sénior', 'Contabilidade', 200000.00, 0),
      ('22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', 'Operador de Caixa / POS', 'Operador de Caixa / POS', 'Comercial', 120000.00, 0)
    ON CONFLICT (id) DO NOTHING;

    -- 2. SÉRIES FISCAIS
    UPDATE public.series_fiscais
    SET 
      serie = COALESCE(serie, prefixo, 'TEST-FR A/2026'),
      descricao = COALESCE(descricao, 'Série de Factura/Recibo Staging 2026'),
      tipo = COALESCE(tipo, tipo_documento, 'FR'),
      proximo_numero = COALESCE(proximo_numero, contador + 1, 1),
      ativo = TRUE
    WHERE empresa_id = '11111111-0000-0000-0000-000000000001';

    -- 3. PERFIL & SYSTEM_USERS (Garantir admin completo)
    UPDATE public.perfis
    SET 
      empresa_id = '11111111-0000-0000-0000-000000000001',
      company_id = '11111111-0000-0000-0000-000000000001',
      is_admin = TRUE,
      level = 1,
      permission_areas = ARRAY['all', 'admin', 'pos', 'rh', 'contabilidade', 'faturacao', 'relatorios'],
      ativo = TRUE
    WHERE id = '00000000-0000-0000-0000-000000000001';

    -- 4. MÉTRICAS INICIAIS
    INSERT INTO public.metrics (empresa_id, company_id, type, tipo, value, valor, activo, description, periodo)
    VALUES 
      ('11111111-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'faturacao_mensal', 'faturacao_mensal', 0, 0, TRUE, 'Faturação Mensal de Teste', '2026-08'),
      ('11111111-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'total_clientes', 'total_clientes', 4, 4, TRUE, 'Total de Clientes Staging', '2026-08')
    ON CONFLICT DO NOTHING;

    -- 5. RELOAD SCHEMA
    NOTIFY pgrst, 'reload schema';
  `;

  await queryDb(stagingRef, sql);
  console.log('✅ Dados de teste e séries/profissões/métricas populados com sucesso!');
}

seed().catch(err => console.error('Erro no seed:', err));

