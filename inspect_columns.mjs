import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function run() {
  const { data, error } = await supabase
    .from('series_fiscais')
    .select('*')
    .limit(1);
    
  console.log("Table structure:", data ? (data.length > 0 ? Object.keys(data[0]) : "Empty Table") : error.message);
}

run();
