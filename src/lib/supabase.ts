import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '';
// Robust cleaning: remove common trailing paths and ensure protocol
let supabaseUrl = rawUrl.trim();
if (supabaseUrl) {
  // Remove any instance of rest/v1 and trailing slashes
  supabaseUrl = supabaseUrl.replace(/\/rest\/v1\/?/g, '').replace(/\/$/, '');
  // Add protocol if missing and it looks like a supabase domain
  if (!supabaseUrl.startsWith('http') && (supabaseUrl.includes('.supabase.co') || supabaseUrl.includes('.supabase.net'))) {
    supabaseUrl = `https://${supabaseUrl}`;
  }
}

const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials are missing. Make sure SUPABASE_URL and SUPABASE_ANON_KEY are set in your environment.');
}

export const supabase =
  (globalThis as any).__supabase ??
  createClient(
    supabaseUrl || '',
    supabaseAnonKey || '',
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );

if (typeof window !== 'undefined') {
  (globalThis as any).__supabase = supabase;
}
