// Script to configure environment variables for novo-sistema-agt-staging in Vercel
import { spawn } from 'child_process';
import fs from 'fs';
import dotenv from 'dotenv';

const stagingEnv = dotenv.parse(fs.readFileSync('.env.staging', 'utf8'));

const envVars = [
  { name: 'VITE_APP_ENV', value: stagingEnv.VITE_APP_ENV || 'staging' },
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

async function addEnvVar(name, value, targets) {
  return new Promise((resolve, reject) => {
    for (const target of targets) {
      const child = spawn('vercel', ['env', 'add', name, target, '--force', '-y'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });

      child.stdin.write(value + '\n');
      child.stdin.end();

      let output = '';
      child.stdout.on('data', (d) => { output += d.toString(); });
      child.stderr.on('data', (d) => { output += d.toString(); });

      child.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ ${name} adicionada para [${target}]`);
        } else {
          console.log(`⚠️ ${name} [${target}]: ${output.trim()}`);
        }
        resolve();
      });
    }
  });
}

async function run() {
  console.log("A configurar variáveis de ambiente para novo-sistema-agt-staging...");
  for (const item of envVars) {
    if (!item.value) continue;
    await addEnvVar(item.name, item.value, ['production', 'preview', 'development']);
  }
  console.log("Configuração de variáveis concluída com sucesso!");
}

run().catch(console.error);

