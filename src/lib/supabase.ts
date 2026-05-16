import { createClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
// Robust cleaning: remove /rest/v1, /auth/v1, and trailing slashes
const supabaseUrl = rawUrl
  .replace(/\/rest\/v1\/?$/, "")
  .replace(/\/auth\/v1\/?$/, "")
  .replace(/\/$/, "");
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials are missing. Check VITE_SUPABASE_URL/ANON_KEY.');
}

export const supabase =
  (globalThis as any).__supabase ??
  createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      },
      global: {
        headers: {
          'x-client-info': 'erp-imatec-v3'
        }
      }
    }
  );

if (typeof window !== 'undefined') {
  (globalThis as any).__supabase = supabase;
}
