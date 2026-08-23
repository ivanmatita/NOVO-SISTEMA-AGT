import { createClient } from '@supabase/supabase-js';
import { getEnvConfig } from './_env.js';

export function getAdminClient(req) {
  const config = getEnvConfig(req);
  return createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}
