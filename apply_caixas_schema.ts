import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// AI studio provides the required environment vars. We'll find them directly on process.env
const rawUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const sqlFile = path.join(process.cwd(), 'caixas_updated_schema.sql');
  if (!fs.existsSync(sqlFile)) {
    console.error("SQL description file of caixas not found!");
    return;
  }
  const sql = fs.readFileSync(sqlFile, 'utf-8');
  console.log("Applying caixas_updated_schema.sql to Supabase via RPC 'query_exec'...");
  const { data, error } = await supabase.rpc('query_exec', { query: sql });
  if (error) {
    console.error("❌ RPC query_exec failed:", error);
  } else {
    console.log("✅ Successfully executed caixas schema in Supabase!");
    console.log("Output data:", data);
  }
}

run().catch(console.error);
