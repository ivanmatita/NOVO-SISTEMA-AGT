import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  console.log("=== Testing Direct PG connection ===");
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set in the environment!");
    return;
  }
  console.log("DATABASE_URL found, length:", connectionString.length);
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log("Successfully connected to PG!");
    const res = await client.query("SELECT 1 + 1 as result;");
    console.log("Query Result:", res.rows);
    await client.end();
  } catch (err) {
    console.error("Connection failed:", err);
  }
}

run();
