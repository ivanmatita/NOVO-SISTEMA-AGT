import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import 'dotenv/config';

// Normalizar URL do Supabase removendo sufixo REST v1 se presente
const rawUrl = process.env.VITE_SUPABASE_URL || '';
const url = rawUrl.replace(/\/rest\/v1\/?$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

console.log("Conectando ao Supabase:", url);

if (!url || !key) {
    console.error("Erro: VITE_SUPABASE_URL ou chaves de autenticação em falta no .env.");
    process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
    try {
        console.log("Lendo arquivo UPDATE_EMITIR_DOCUMENTO.sql...");
        const sql = fs.readFileSync('UPDATE_EMITIR_DOCUMENTO.sql', 'utf8');
        
        console.log("Executando a função remota query_exec no Supabase...");
        const { data, error } = await supabase.rpc('query_exec', { query: sql });
        
        if (error) {
            console.error("Erro ao executar SQL:", error);
        } else {
            console.log("Update SQL executado com sucesso no Supabase!");
            console.log("Resposta:", data);
        }
    } catch (err) {
        console.error("Erro crítico ao correr migration:", err);
    }
}

run();
