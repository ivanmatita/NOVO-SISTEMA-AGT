import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  console.log("Checking transactions table...");
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error("Error fetching transactions:", error);
  } else {
    console.log("Transactions table exists. Columns:", data.length > 0 ? Object.keys(data[0]) : "Empty table (cannot determine columns via select *)");
    
    // Try to get columns via rpc or just a raw query if possible, but select * on empty table doesn't help much with keys
    // However, usually we can try to insert a dummy and rollback if we had transactions, but Supabase doesn't support rollbacks via JS client easily.
  }
}

check();
