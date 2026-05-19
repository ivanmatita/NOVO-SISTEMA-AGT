import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);
const uid = "39d2a844-2666-4368-9440-d3c731182ac2";

const run = async () => {
    console.log("Starting query...");
    const start = Date.now();
    const { data: perfil, error } = await supabase.from('perfis').select(`
        empresa_id,
        role,
        empresas (
            id,
            nome_empresa,
            email,
            created_at
        )
    `).eq('id', uid).maybeSingle();
    const end = Date.now();
    console.log(`Took ${end - start}ms`);
    console.log(error ? "Error: " + error.message : "Data: ", perfil);
}

run().catch(console.error);
