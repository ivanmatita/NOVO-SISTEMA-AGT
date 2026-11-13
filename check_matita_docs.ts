import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const rawUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const url = rawUrl
  .replace(/\/rest\/v1\/?$/, "")
  .replace(/\/auth\/v1\/?$/, "")
  .replace(/\/$/, "");
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

const supabase = createClient(url, serviceKey);

async function run() {
  const { data, error } = await supabase.from('documentos_empresa').select('*');
  if (error) {
    console.error("Error querying docs:", error);
  } else {
    console.log("Total Documents in DB:", data.length);
    console.log("Documents List:", JSON.stringify(data, null, 2));
  }
}

run();
