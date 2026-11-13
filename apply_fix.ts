import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// AI studio provides the required environment vars. We'll find them directly on process.env
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const sql = fs.readFileSync(path.join(process.cwd(), 'FIX_RECURSION.sql'), 'utf-8');
  console.log("Applying FIX_RECURSION...");
  const { data, error } = await supabase.rpc('query_exec', { query: sql });
  if (error) {
    console.error("RPC query_exec failed:", error);
    
    // As alternative, since execute doesn't always work if it's not setup correctly,
    // lets try other rpc methods if available.
  } else {
    console.log("Success applying FIX_RECURSION!");
  }
}
run().catch(console.error);
