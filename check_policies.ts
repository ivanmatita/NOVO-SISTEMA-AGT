import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

const checkPolicies = async () => {
    const { data, error } = await supabase.rpc('query_exec', { query: "SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'perfis';" });
    console.log("Policies:", JSON.stringify(data, null, 2));
    console.log("Error:", error);
}

checkPolicies();
