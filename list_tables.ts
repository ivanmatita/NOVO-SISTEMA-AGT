import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error("SERVICE ROLE KEY MISSING");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function list() {
  console.log("=== LIST TABLES START ===");
  const query = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `;
  
  // Custom query exec can be called using a general SELECT if we use a direct postgres wrapper or an RPC if we have one.
  // Wait, let's see if we have some other tables or columns we can find. Or we can just query a random system catalog or try to fetch from information_schema via standard PostgREST API if exposed!
  // Wait, information_schema is usually not exposed via PostgREST, but we can query it using RPC. Wait, did public.query_exec function not exist? It failed with "Could not find the function public.query_exec(query) in the schema cache".
  // Let's check what functions we have! Or let's see if we can run query_exec now. Or wait, let's write a script that tries other potential rpc names, or we can just try to fetch a known table.
  // Wait, does 'perfis' have all the users?
  const { data: cols, error: colsErr } = await supabase
    .from('perfis')
    .select('*')
    .limit(1);
  console.log("perfis sample:", cols || colsErr);

  // Let's also check if tables like 'clientes', 'armazens' exist
  const { data: clients, error: clientsErr } = await supabase
    .from('clientes')
    .select('count')
    .limit(1);
  console.log("clientes exists:", !clientsErr, clientsErr);

  const { data: sysUsers, error: sysUsersErr } = await supabase
    .from('system_users')
    .select('*')
    .limit(1);
  console.log("system_users exists:", !sysUsersErr, sysUsersErr);

  console.log("=== LIST TABLES END ===");
}

list();
