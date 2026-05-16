import { supabase } from './src/lib/supabase.js';
import * as dotenv from 'dotenv';
dotenv.config();

async function check() {
    console.log("Checking clientes table policies...");
    const { data: policies, error } = await supabase.rpc('query_exec', {
        query: `SELECT * FROM pg_policies WHERE tablename = 'clientes'`
    });
    console.log(policies || error);

    const { data: cols, error: err2 } = await supabase.rpc('query_exec', {
       query: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'clientes'`
    });
    console.log(cols || err2);
}
check();
