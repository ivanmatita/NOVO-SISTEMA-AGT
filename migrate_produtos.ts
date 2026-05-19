
import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });
    await client.connect();
    
    console.log("Adding column ativo to produtos...");
    try {
        await client.query("ALTER TABLE produtos ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;");
        console.log("Column added successfully!");
    } catch (e) {
        console.error("Error:", e);
    }
    await client.end();
}
run();