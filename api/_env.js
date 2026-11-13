/**
 * api/_env.js
 * Utilitário seguro e dinâmico de configuração de ambiente (Staging vs Produção).
 */

const PROD_URL = "https://nawqfidnawokqaheqvar.supabase.co";
const PROD_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hd3FmaWRuYXdva3FhaGVxdmFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMTgxNDYsImV4cCI6MjA5Mzc5NDE0Nn0.qFkIexxKcQDWax3pfhcgPMR3ZFIsE-gYWTS62i5Edgs";
const PROD_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hd3FmaWRuYXdva3FhaGVxdmFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODIxODE0NiwiZXhwIjoyMDkzNzk0MTQ2fQ.ToB7OlAF5FDHEKZMAZLmbvLtHb250qiVFmOUQm1VaOo";

const STAGING_URL = "https://sfnibpxfevhelaikqbiq.supabase.co";
const STAGING_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbmlicHhmZXZoZWxhaWtxYmlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNTAyODgsImV4cCI6MjEwMjYyNjI4OH0.AnxqAF-TBY556gp2oPV0I5hfTjozaCMIHaeH7OhifiM";
const STAGING_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbmlicHhmZXZoZWxhaWtxYmlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzA1MDI4OCwiZXhwIjoyMTAyNjI2Mjg4fQ.4wVvNNMK8dUTUXsQ8LklD4OBHa-s02VPlY7H0gC0cbw";

export function getEnvConfig(req) {
  const host = (
    req?.headers?.['x-forwarded-host'] || 
    req?.headers?.host || 
    ''
  ).toLowerCase();

  const envVar = (process.env.VITE_APP_ENV || process.env.VERCEL_GIT_COMMIT_REF || process.env.NODE_ENV || '').toLowerCase();
  const supabaseUrlEnv = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').toLowerCase();

  const isStaging = host.includes('staging') || 
                    host.includes('teste') || 
                    host.includes('homologacao') || 
                    envVar.includes('staging') || 
                    envVar.includes('teste') || 
                    envVar.includes('homologacao') || 
                    supabaseUrlEnv.includes('sfnibpxfevhelaikqbiq');

  return {
    environment: isStaging ? 'staging' : 'production',
    isStaging,
    supabaseUrl: isStaging ? STAGING_URL : PROD_URL,
    anonKey: isStaging ? STAGING_ANON_KEY : PROD_ANON_KEY,
    serviceRoleKey: isStaging ? STAGING_SERVICE_ROLE_KEY : PROD_SERVICE_ROLE_KEY
  };
}

export function setCORS(res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
}
