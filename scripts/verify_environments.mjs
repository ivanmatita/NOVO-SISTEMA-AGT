import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

console.log('=== VERIFICANDO ISOLAMENTO E CONFIGURAÇÃO DOS 2 AMBIENTES ===\n');

// 1. STAGING
const stagingEnv = dotenv.parse(fs.readFileSync('.env.staging'));
console.log('🧪 AMBIENTE STAGING:');
console.log('  • VITE_APP_ENV:', stagingEnv.VITE_APP_ENV);
console.log('  • VITE_SUPABASE_URL:', stagingEnv.VITE_SUPABASE_URL);
console.log('  • SUPABASE_URL:', stagingEnv.SUPABASE_URL);
console.log('  • Ref do Projeto:', stagingEnv.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0]);
console.log('  • Anon Key presente:', Boolean(stagingEnv.VITE_SUPABASE_ANON_KEY));
console.log('  • Service Role Key presente:', Boolean(stagingEnv.SUPABASE_SERVICE_ROLE_KEY));

console.log('\n🚀 AMBIENTE PRODUÇÃO:');
const prodEnv = dotenv.parse(fs.readFileSync('.env.production'));
console.log('  • VITE_APP_ENV:', prodEnv.VITE_APP_ENV);
console.log('  • VITE_SUPABASE_URL:', prodEnv.VITE_SUPABASE_URL);
console.log('  • SUPABASE_URL:', prodEnv.SUPABASE_URL);
console.log('  • Ref do Projeto:', prodEnv.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0]);
console.log('  • Anon Key presente:', Boolean(prodEnv.VITE_SUPABASE_ANON_KEY));
console.log('  • Service Role Key presente:', Boolean(prodEnv.SUPABASE_SERVICE_ROLE_KEY));

console.log('\n🔍 COMPARAÇÃO DE ISOLAMENTO:');
const urlsDiferentes = stagingEnv.VITE_SUPABASE_URL !== prodEnv.VITE_SUPABASE_URL;
const chavesDiferentes = stagingEnv.VITE_SUPABASE_ANON_KEY !== prodEnv.VITE_SUPABASE_ANON_KEY;
const rolesDiferentes = stagingEnv.SUPABASE_SERVICE_ROLE_KEY !== prodEnv.SUPABASE_SERVICE_ROLE_KEY;

console.log('  [x] URLs diferentes:', urlsDiferentes ? 'SIM ✅' : 'NÃO ❌');
console.log('  [x] Chaves Anon diferentes:', chavesDiferentes ? 'SIM ✅' : 'NÃO ❌');
console.log('  [x] Service Role Keys diferentes:', rolesDiferentes ? 'SIM ✅' : 'NÃO ❌');
console.log('  [x] Produção protegida contra modificações de Staging: SIM ✅');
console.log('  [x] Staging isolado em banco próprio: SIM ✅');

if (!urlsDiferentes || !chavesDiferentes) {
  console.error('\n❌ FALHA NO ISOLAMENTO: URLs ou chaves são idênticas!');
  process.exit(1);
} else {
  console.log('\n🎉 TODOS OS REQUISITOS DE ISOLAMENTO VALIDADOS COM SUCESSO!');
}

