// Sequential script to configure all remaining environment variables for novo-sistema-agt-staging in Vercel
import { execSync } from 'child_process';
import fs from 'fs';
import dotenv from 'dotenv';

const stagingEnv = dotenv.parse(fs.readFileSync('.env.staging', 'utf8'));

const envVars = [
  { name: 'VITE_APP_ENV', value: 'staging' },
  { name: 'NODE_ENV', value: 'production' },
  { name: 'VITE_SUPABASE_URL', value: stagingEnv.VITE_SUPABASE_URL },
  { name: 'VITE_SUPABASE_ANON_KEY', value: stagingEnv.VITE_SUPABASE_ANON_KEY },
  { name: 'SUPABASE_URL', value: stagingEnv.SUPABASE_URL },
  { name: 'SUPABASE_ANON_KEY', value: stagingEnv.SUPABASE_ANON_KEY },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', value: stagingEnv.SUPABASE_SERVICE_ROLE_KEY },
  { name: 'VITE_AGT_MODE', value: 'SANDBOX' },
  { name: 'AGT_USERNAME', value: stagingEnv.AGT_USERNAME || 'TESTE_STAGING' },
  { name: 'AGT_PASSWORD', value: stagingEnv.AGT_PASSWORD || 'TESTE_STAGING_PASS' },
  { name: 'AGT_VALIDATION_URL', value: stagingEnv.AGT_VALIDATION_URL || 'https://sifphml.minfin.gov.ao/sigt/fe/v1/validarDocumento' }
];

async function run() {
  console.log("Configurando variáveis de ambiente na Vercel...");
  for (const item of envVars) {
    if (!item.value) continue;
    for (const env of ['production', 'preview', 'development']) {
      try {
        const cmd = `echo "${item.value}" | vercel env add ${item.name} ${env} --force -y`;
        execSync(cmd, { shell: 'cmd.exe', stdio: 'pipe' });
        console.log(`✅ ${item.name} configurada para [${env}]`);
      } catch (err) {
        console.log(`⚠️ ${item.name} [${env}]:`, err.message);
      }
    }
  }
  console.log("Concluído!");
}

run().catch(console.error);

