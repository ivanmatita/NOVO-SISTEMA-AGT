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
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) {
    console.error("Error listing buckets:", error);
  } else {
    console.log("Existing buckets:", buckets.map(b => b.id));
    const exist = buckets.some(b => b.id === 'empresa-documentos');
    if (!exist) {
      console.log("empresa-documentos bucket does NOT exist. Creating it now...");
      const { data, error: createError } = await supabase.storage.createBucket('empresa-documentos', {
        public: true
      });
      if (createError) {
        console.error("Failed to create bucket:", createError);
      } else {
        console.log("Bucket created successfully:", data);
      }
    } else {
      console.log("empresa-documentos exists!");
    }
  }
}

run();
