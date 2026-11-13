import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY is missing in your environment configuration.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function runMigration() {
  const sqlPath = path.join(process.cwd(), 'supabase_cartas_setup.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error(`❌ Migration file not found at: ${sqlPath}`);
    process.exit(1);
  }

  console.log(`📖 Reading SQL from ${sqlPath}...`);
  const query = fs.readFileSync(sqlPath, 'utf8');

  console.log('🚀 Executing SQL migration on Supabase...');
  const { data, error } = await supabase.rpc('query_exec', { query });

  if (error) {
    console.error("❌ Query execution failed via RPC:", error);
  } else {
    console.log("✅ Query execution status returned:", data);
  }
}

runMigration();
