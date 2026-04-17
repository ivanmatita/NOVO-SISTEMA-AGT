import { createClient } from '@supabase/supabase-js';

// In Vite, environment variables are exposed on import.meta.env
// In Node.js, they are on process.env
let supabaseUrl = (typeof process !== 'undefined' && process.env.VITE_SUPABASE_URL) || 
                   (import.meta as any).env?.VITE_SUPABASE_URL ||
                   (typeof process !== 'undefined' && process.env.SUPABASE_URL);

const supabaseKey = (typeof process !== 'undefined' && process.env.VITE_SUPABASE_ANON_KEY) || 
                    (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
                    (typeof process !== 'undefined' && process.env.SUPABASE_KEY);

if (supabaseUrl && !supabaseUrl.startsWith('http')) {
  supabaseUrl = `https://${supabaseUrl}`;
}

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase credentials are missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.');
} else {
  try {
    const url = new URL(supabaseUrl);
    if (!url.hostname.endsWith('.supabase.co') && !url.hostname.endsWith('.supabase.in') && url.hostname !== 'localhost') {
      console.warn(`⚠️ Supabase URL "${supabaseUrl}" might be invalid. It should typically end with .supabase.co`);
    }
  } catch (e) {
    console.error(`❌ Invalid SUPABASE_URL: "${supabaseUrl}"`);
  }
}

export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey)
  : null as any;
