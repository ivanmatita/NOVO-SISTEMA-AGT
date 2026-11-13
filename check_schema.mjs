import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function run() {
  // Check tables and columns
  const { data: cols, error: cError } = await supabase
    .from('series_fiscais')
    .select('description'); // Try to select description directly
  
  console.log("Series Fiscais Columns check:", cError ? cError.message : "OK (description exists)");

  // Check faturas columns to ensure series_id exists
  const { data: fCols, error: fError } = await supabase
    .from('faturas')
    .select('series_id');
    
  console.log("Faturas series_id check:", fError ? fError.message : "OK (series_id exists)");
}

run();
