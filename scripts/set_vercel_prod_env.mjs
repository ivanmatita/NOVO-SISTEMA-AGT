/**
 * scripts/set_vercel_prod_env.mjs
 *
 * Uses the Vercel REST API to set the correct production environment variables
 * on the novo-sistema-agt project (production deployment).
 *
 * Usage: node scripts/set_vercel_prod_env.mjs <VERCEL_TOKEN>
 */
import { execSync } from 'child_process';

const VERCEL_TOKEN = process.argv[2];
if (!VERCEL_TOKEN) {
  console.error('❌ Usage: node scripts/set_vercel_prod_env.mjs <VERCEL_TOKEN>');
  console.error('   Get your token from: https://vercel.com/account/tokens');
  process.exit(1);
}

const PROD_URL = 'https://nawqfidnawokqaheqvar.supabase.co';
const PROD_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hd3FmaWRuYXdva3FhaGVxdmFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMTgxNDYsImV4cCI6MjA5Mzc5NDE0Nn0.qFkIexxKcQDWax3pfhcgPMR3ZFIsE-gYWTS62i5Edgs';
const PROD_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hd3FmaWRuYXdva3FhaGVxdmFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODIxODE0NiwiZXhwIjoyMDkzNzk0MTQ2fQ.ToB7OlAF5FDHEKZMAZLmbvLtHb250qiVFmOUQm1VaOo';

// Variables to set in Vercel Production
const PROD_ENV_VARS = {
  'VITE_APP_ENV': 'production',
  'NODE_ENV': 'production',
  'VITE_SUPABASE_URL': PROD_URL,
  'VITE_SUPABASE_ANON_KEY': PROD_ANON_KEY,
  'SUPABASE_URL': PROD_URL,
  'SUPABASE_ANON_KEY': PROD_ANON_KEY,
  'SUPABASE_SERVICE_ROLE_KEY': PROD_SERVICE_ROLE_KEY,
  'VITE_AGT_MODE': 'LIVE',
  'AGT_USERNAME': 'PRODUCAO_USER',
  'AGT_PASSWORD': 'PRODUCAO_PASS',
  'AGT_VALIDATION_URL': 'https://sifp.minfin.gov.ao/sigt/fe/v1/validarDocumento',
  'AGT_TIMEOUT': '15000',
};

// The Vercel project name / ID for production
const PROJECT = 'novo-sistema-agt';

async function getProjects() {
  const res = await fetch('https://api.vercel.com/v9/projects', {
    headers: { 'Authorization': `Bearer ${VERCEL_TOKEN}` }
  });
  const data = await res.json();
  return data.projects || [];
}

async function getProjectEnvs(projectId) {
  const res = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env`, {
    headers: { 'Authorization': `Bearer ${VERCEL_TOKEN}` }
  });
  const data = await res.json();
  return data.envs || [];
}

async function deleteEnvVar(projectId, envId) {
  await fetch(`https://api.vercel.com/v9/projects/${projectId}/env/${envId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${VERCEL_TOKEN}` }
  });
}

async function createEnvVar(projectId, key, value, target) {
  const res = await fetch(`https://api.vercel.com/v10/projects/${projectId}/env`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VERCEL_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      key,
      value,
      type: 'plain',
      target: [target]
    })
  });
  return res.json();
}

async function run() {
  console.log('📡 Fetching Vercel projects...');
  const projects = await getProjects();
  const project = projects.find(p => p.name === PROJECT || p.name.includes('novo-sistema-agt'));
  
  if (!project) {
    console.error('❌ Project not found! Available projects:', projects.map(p => p.name));
    process.exit(1);
  }
  
  console.log(`✅ Found project: ${project.name} (ID: ${project.id})`);
  
  // Get existing env vars
  const existingEnvs = await getProjectEnvs(project.id);
  console.log(`📋 Found ${existingEnvs.length} existing env vars`);
  
  // For each env var we want to set
  for (const [key, value] of Object.entries(PROD_ENV_VARS)) {
    // Find and delete any existing production env var with this key
    const existing = existingEnvs.filter(e => e.key === key && e.target.includes('production'));
    for (const env of existing) {
      await deleteEnvVar(project.id, env.id);
      console.log(`  🗑️  Deleted old ${key} [production]`);
    }
    
    // Create new env var for production
    const result = await createEnvVar(project.id, key, value, 'production');
    if (result.error) {
      console.error(`  ❌ Failed to set ${key}: ${result.error.message}`);
    } else {
      console.log(`  ✅ Set ${key}=...${value.substring(value.length - 20)} [production]`);
    }
  }
  
  console.log('\n🎉 All production environment variables have been configured!');
  console.log('📌 Vercel will apply them on the NEXT deployment.');
  console.log('   Run: git commit --allow-empty -m "trigger: apply production env vars" && git push origin main');
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
