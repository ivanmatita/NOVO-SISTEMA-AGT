import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const rawUrl = process.env.SUPABASE_URL || '';
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/auth\/v1\/?$/, "").replace(/\/$/, "");
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const { data, error } = await supabase
    .from('compras')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error("Error fetching compras:", error);
  } else {
    if (data && data.length > 0) {
        console.log("compras Columns:", Object.keys(data[0]));
    } else {
        console.log("No data in compras table or table is empty");
    }
  }
}
run();
