import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set");
    return;
  }
  const client = new Client({ connectionString });
  try {
    await client.connect();
    
    // Query columns of perfis, system_users, and empresas
    const q1 = `
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name IN ('perfis', 'system_users', 'empresas')
      ORDER BY table_name, column_name;
    `;
    const res1 = await client.query(q1);
    console.log("=== COLUMNS ===");
    console.log(res1.rows);

    // Query active triggers on auth.users and public.perfis/system_users
    const q2 = `
      SELECT  
        trigger_name, 
        event_manipulation, 
        event_object_table, 
        action_statement 
      FROM information_schema.triggers
      ORDER BY trigger_name;
    `;
    const res2 = await client.query(q2);
    console.log("=== TRIGGERS ===");
    console.log(res2.rows);

    await client.end();
  } catch (err) {
    console.error(err);
  }
}
run();
