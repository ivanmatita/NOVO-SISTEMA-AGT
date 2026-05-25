
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

async function checkTables() {
    const { data, error } = await supabaseAdmin.rpc('query_exec', {
        query: `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('hr_contratos', 'employees');
        `
    });
    
    if (error) {
        console.log("Error running query (maybe query_exec missing):", error);
        
        // Alternative approach if query_exec fails: try creating tables directly if we had a way
        // But for now, let's just confirm the failure.
    } else {
        console.log("Tables found:", data);
    }
}

checkTables();
