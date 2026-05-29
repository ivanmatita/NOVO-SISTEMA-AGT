import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const rawUrl = process.env.SUPABASE_URL || '';
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/auth\/v1\/?$/, "").replace(/\/$/, "");
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function run() {
  console.log("=== Updating get_auth_empresa_id function ===");
  const sql = `
    CREATE OR REPLACE FUNCTION public.get_auth_empresa_id()
    RETURNS UUID AS $$
    DECLARE
        tenant_id UUID;
    BEGIN
        SELECT company_id INTO tenant_id
        FROM public.perfis
        WHERE id = auth.uid();
        
        IF tenant_id IS NULL THEN
            SELECT empresa_id INTO tenant_id
            FROM public.profiles
            WHERE id = auth.uid();
        END IF;

        RETURN tenant_id;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;
  
  const response = await fetch('http://localhost:3000/api/exec-sql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql })
  });
  const data = await response.json();
  console.log("SQL Result:", data);
}
run();
