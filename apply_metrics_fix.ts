import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  const sql = fs.readFileSync('fix_metrics_columns.sql', 'utf8');
  console.log("=== Applying SQL to fix metrics table ===");
  
  const response = await fetch('http://localhost:3000/api/exec-sql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql })
  });
  const data = await response.json();
  console.log("SQL Result:", data);
}
run();
