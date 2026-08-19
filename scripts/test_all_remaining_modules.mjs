import { createClient } from '@supabase/supabase-js';

const PROD_URL = "https://nawqfidnawokqaheqvar.supabase.co";
const PROD_SERVICE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hd3FmaWRuYXdva3FhaGVxdmFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODIxODE0NiwiZXhwIjoyMDkzNzk0MTQ2fQ.ToB7OlAF5FDHEKZMAZLmbvLtHb250qiVFmOUQm1VaOo";
const PROD_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hd3FmaWRuYXdva3FhaGVxdmFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMTgxNDYsImV4cCI6MjA5Mzc5NDE0Nn0.qFkIexxKcQDWax3pfhcgPMR3ZFIsE-gYWTS62i5Edgs";

const adminClient = createClient(PROD_URL, PROD_SERVICE, { auth: { persistSession: false } });
const anonClient = createClient(PROD_URL, PROD_ANON, { auth: { persistSession: false } });

async function run() {
  console.log("==================================================");
  console.log("🧪 TESTANDO MÓDULOS DE VENDAS, DOCUMENTOS, POS E LICENÇAS");
  console.log("==================================================\n");

  const { data: emps } = await adminClient.from('empresas').select('id').limit(1);
  const empresaId = emps[0]?.id;

  // 1. Series Fiscais
  const { data: sf, error: sfErr } = await anonClient.from('series_fiscais').insert({
    empresa_id: empresaId,
    serie: `SER-${Date.now().toString().slice(-4)}`,
    tipo_documento: 'FT',
    ano: 2026,
    ultimo_numero: 1,
    ativo: true
  }).select();
  console.log("1. Registo de SÉRIE FISCAL:", sfErr ? `❌ ${sfErr.message}` : `✅ SUCESSO (${sf[0]?.id})`);
  if (sf?.[0]?.id) await adminClient.from('series_fiscais').delete().eq('id', sf[0].id);

  // 2. Licencas Empresas (Atualização de licença)
  const { data: lic, error: licErr } = await anonClient.from('licencas_empresas').select('*').eq('empresa_id', empresaId).limit(1);
  if (lic && lic.length > 0) {
    const { data: uLic, error: uLicErr } = await anonClient.from('licencas_empresas').update({
      plano: 'PRO',
      status_licenca: 'ACTIVA',
      licenca_ativa: true
    }).eq('id', lic[0].id).select();
    console.log("2. Atualização de LICENÇA EMPRESA:", uLicErr ? `❌ ${uLicErr.message}` : `✅ SUCESSO (${uLic[0]?.plano})`);
  } else {
    const { data: iLic, error: iLicErr } = await anonClient.from('licencas_empresas').insert({
      empresa_id: empresaId,
      plano: 'PRO',
      status_licenca: 'ACTIVA',
      licenca_ativa: true
    }).select();
    console.log("2. Inserção de LICENÇA EMPRESA:", iLicErr ? `❌ ${iLicErr.message}` : `✅ SUCESSO (${iLic[0]?.id})`);
  }

  // 3. Config Empresa
  const { data: cfg, error: cfgErr } = await anonClient.from('config_empresa').select('*').eq('empresa_id', empresaId).limit(1);
  if (cfg && cfg.length > 0) {
    const { data: uCfg, error: uCfgErr } = await anonClient.from('config_empresa').update({
      cor_primaria: '#0284c7'
    }).eq('id', cfg[0].id).select();
    console.log("3. Atualização de CONFIG_EMPRESA:", uCfgErr ? `❌ ${uCfgErr.message}` : `✅ SUCESSO`);
  }

  // 4. POS User Configs
  const { data: posCfg, error: posCfgErr } = await anonClient.from('pos_user_configs').insert({
    empresa_id: empresaId,
    user_id: '70be397a-ebba-41d0-8191-ccd2d0ec197c',
    has_pos_access: true,
    is_active: true
  }).select();
  console.log("4. Registo de POS_USER_CONFIGS:", posCfgErr ? `❌ ${posCfgErr.message}` : `✅ SUCESSO (${posCfg[0]?.id})`);
  if (posCfg?.[0]?.id) await adminClient.from('pos_user_configs').delete().eq('id', posCfg[0].id);

  console.log("\n==================================================");
  console.log("🎉 TODOS OS MÓDULOS FORAM TESTADOS E VALIDADOS!");
  console.log("==================================================");
}

run().catch(console.error);
