import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

const run = async () => {
    // Attempt to select columns from information_schema
    const { data, error } = await supabase.rpc('query_exec', { 
        query: "SELECT column_name FROM information_schema.columns WHERE table_name = 'produtos'"
    });
    console.log(data);
    console.log(error);
}

run().catch(console.error);
