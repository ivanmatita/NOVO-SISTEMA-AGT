import { supabase } from './src/lib/supabase.js';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  const { data, error } = await supabase.from('clientes').select('id, nome, empresa_id');
  console.log("Error:", error);
  console.log("Data total files:", data?.length);
  const groups: any = {};
  data?.forEach(d => {
      groups[d.empresa_id] = (groups[d.empresa_id] || 0) + 1;
  });
  console.log("By empresa_id:", groups);
}
main();
