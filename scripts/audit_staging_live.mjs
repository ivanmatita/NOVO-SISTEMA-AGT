/**
 * scripts/audit_staging_live.mjs
 * Script de Auditoria em Tempo Real de todas as rotas no Vercel Staging
 */

const STAGING_BASE = 'https://novo-sistema-agt-staging.vercel.app';
const endpoints = [
  '/api/health',
  '/api/health/supabase',
  '/api/auth/me',
  '/api/secure-clientes',
  '/api/secure-clientes/check-nif?nif=5002123665',
  '/api/secure-locais-trabalho',
  '/api/exercicios-fiscais',
  '/api/invoices',
  '/api/system-users',
  '/api/config-empresa',
  '/api/stats',
  '/api/transactions',
  '/api/employees',
  '/api/cost-centers',
  '/api/pos-points',
  '/api/cash/sessions',
  '/api/work-site-movements',
  '/api/security/occurrences',
  '/api/security/armory',
  '/api/security/roster',
  '/api/user-activities/heartbeat'
];

async function runAudit() {
  console.log('================================================================================');
  console.log(`📡 AUDITORIA AO VIVO DO AMBIENTE STAGING: ${STAGING_BASE}`);
  console.log(`🕒 Data/Hora: ${new Date().toISOString()}`);
  console.log('================================================================================\n');

  const results = [];

  for (const ep of endpoints) {
    const url = `${STAGING_BASE}${ep}${ep.includes('?') ? '&' : '?'}_t=${Date.now()}`;
    try {
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      });
      const text = await res.text();
      let preview = text.replace(/\s+/g, ' ').trim();
      if (preview.length > 100) preview = preview.substring(0, 100) + '...';
      
      const is500 = res.status === 500;
      const is404 = res.status === 404;
      const is200 = res.status >= 200 && res.status < 300;
      const is401 = res.status === 401 || res.status === 403;
      
      const tag = is200 ? '✅ 200' : is401 ? '🔒 ' + res.status : is500 ? '💥 500' : is404 ? '❓ 404' : `⚠️ ${res.status}`;
      
      console.log(`${tag.padEnd(8)} ${ep.padEnd(42)} -> ${preview}`);
      results.push({ ep, status: res.status, preview, is500 });
    } catch (err) {
      console.log(`❌ ERR  ${ep.padEnd(42)} -> ${err.message}`);
      results.push({ ep, status: 'FETCH_ERROR', preview: err.message, is500: true });
    }
  }

  console.log('\n================================================================================');
  const count500 = results.filter(r => r.is500).length;
  console.log(`📊 TOTAL DE ROTAS TESTADAS: ${results.length} | COM ERRO 500/FALHA: ${count500}`);
  console.log('================================================================================');
}

runAudit();
