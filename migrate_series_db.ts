import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(url, key);

async function run() {
    console.log("Running migration...");
    const { data, error } = await supabase.rpc("query_exec", { query: "ALTER TABLE public.series_fiscais ADD COLUMN IF NOT EXISTS utilizador_id UUID REFERENCES public.perfis(id);" });
    console.log("Result:", data, error);
}
run();
