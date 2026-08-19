// Fix environment variables formatting in Vercel for novo-sistema-agt-staging
import { execSync } from 'child_process';
import fs from 'fs';
import dotenv from 'dotenv';

const stagingEnv = dotenv.parse(fs.readFileSync('.env.staging', 'utf8'));

const envMap = {
  VITE_APP_ENV: 'staging',
  NODE_ENV: 'production',
  VITE_SUPABASE_URL: stagingEnv.VITE_SUPABASE_URL.trim(),
  VITE_SUPABASE_ANON_KEY: stagingEnv.VITE_SUPABASE_ANON_KEY.trim(),
  SUPABASE_URL: stagingEnv.SUPABASE_URL.trim(),
  SUPABASE_ANON_KEY: stagingEnv.SUPABASE_ANON_KEY.trim(),
  SUPABASE_SERVICE_ROLE_KEY: stagingEnv.SUPABASE_SERVICE_ROLE_KEY.trim(),
  VITE_AGT_MODE: 'SANDBOX'
};

for (const [k, v] of Object.entries(envMap)) {
  for (const env of ['production', 'preview', 'development']) {
    try {
      const child = execSync(`vercel env add ${k} ${env} --force -y`, {
        input: v,
        encoding: 'utf8'
      });
      console.log(`✅ [${env}] ${k} updated`);
    } catch (e) {
      console.warn(`⚠️ [${env}] ${k}:`, e.message);
    }
  }
}

