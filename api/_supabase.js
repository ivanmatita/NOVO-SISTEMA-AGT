import { createClient } from '@supabase/supabase-js';

const PROD_URL = "https://nawqfidnawokqaheqvar.supabase.co";
const PROD_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hd3FmaWRuYXdva3FhaGVxdmFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMTgxNDYsImV4cCI6MjA5Mzc5NDE0Nn0.qFkIexxKcQDWax3pfhcgPMR3ZFIsE-gYWTS62i5Edgs';
const PROD_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hd3FmaWRuYXdva3FhaGVxdmFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODIxODE0NiwiZXhwIjoyMDkzNzk0MTQ2fQ.ToB7OlAF5FDHEKZMAZLmbvLtHb250qiVFmOUQm1VaOo';

const STAGING_URL = "https://sfnibpxfevhelaikqbiq.supabase.co";
const STAGING_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbmlicHhmZXZoZWxhaWtxYmlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNTAyODgsImV4cCI6MjEwMjYyNjI4OH0.AnxqAF-TBY556gp2oPV0I5hfTjozaCMIHaeH7OhifiM';
const STAGING_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbmlicHhmZXZoZWxhaWtxYmlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzA1MDI4OCwiZXhwIjoyMTAyNjI2Mjg4fQ.4wVvNNMK8dUTUXsQ8LklD4OBHa-s02VPlY7H0gC0cbw';

export function getSupabaseConfig(req) {
  const host = (req?.headers?.['x-forwarded-host'] || req?.headers?.host || '').toLowerCase();
  const isStaging = host.includes('staging') || process.env.VITE_APP_ENV === 'staging';

  return {
    url: isStaging ? STAGING_URL : PROD_URL,
    anonKey: isStaging ? STAGING_ANON_KEY : PROD_ANON_KEY,
    serviceRoleKey: isStaging ? STAGING_SERVICE_ROLE_KEY : PROD_SERVICE_ROLE_KEY,
    isStaging
  };
}

export function getAdminClient(req) {
  const config = getSupabaseConfig(req);
  return createClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export function getClientForUser(req) {
  const config = getSupabaseConfig(req);
  const authHeader = req?.headers?.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (token) {
    return createClient(config.url, config.anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  return getAdminClient(req);
}

export async function getUserFromRequest(req) {
  const authHeader = req?.headers?.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  const config = getSupabaseConfig(req);
  const anon = createClient(config.url, config.anonKey, { auth: { persistSession: false } });
  const { data: { user }, error } = await anon.auth.getUser(token);
  if (error || !user) return null;
  return user;
}
