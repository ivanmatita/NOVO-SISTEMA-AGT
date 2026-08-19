import dotenv from 'dotenv';
dotenv.config();

const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

async function runQuery(query) {
    const res = await fetch(`${url}/rest/v1/rpc/query_exec_select`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': key,
            'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({ query })
    });
    if (!res.ok) {
        console.error("Error executing query:", await res.text());
        return [];
    }
    return await res.json();
}

async function audit() {
    console.log("=== RLS AUDIT (READ ONLY) ===");
    
    // 1. ALL TABLES AND RLS STATUS
    const tablesQuery = `
        SELECT 
            c.relname as table_name,
            c.relrowsecurity as rls_enabled,
            (SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = c.relname AND column_name = 'empresa_id'
            )) as has_empresa_id
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r'
        ORDER BY c.relname
    `;
    const tables = await runQuery(tablesQuery);
    console.log("\\n--- TABLES ---");
    console.log(JSON.stringify(tables, null, 2));

    // 2. ALL POLICIES
    const policiesQuery = `
        SELECT 
            schemaname, 
            tablename, 
            policyname, 
            permissive, 
            roles, 
            cmd, 
            qual, 
            with_check 
        FROM pg_policies 
        WHERE schemaname = 'public'
        ORDER BY tablename, policyname
    `;
    const policies = await runQuery(policiesQuery);
    console.log("\\n--- POLICIES ---");
    console.log(JSON.stringify(policies, null, 2));

    // 3. ISOLATION
    const funcsQuery = `
        SELECT 
            routinename, 
            routine_definition
        FROM information_schema.routines
        WHERE routine_schema = 'public' 
        AND (routinename LIKE '%empresa%' OR routinename LIKE '%auth%')
    `;
    const funcs = await runQuery(funcsQuery);
    console.log("\\n--- ISOLATION FUNCTIONS ---");
    console.log(JSON.stringify(funcs, null, 2));
}

audit();
