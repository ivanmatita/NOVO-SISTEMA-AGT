import { createClient } from '@supabase/supabase-js';

let supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (supabaseUrl && !supabaseUrl.startsWith('http')) {
  supabaseUrl = `https://${supabaseUrl}`;
}

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase credentials are missing. Please set SUPABASE_URL and SUPABASE_KEY in your environment variables.');
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
