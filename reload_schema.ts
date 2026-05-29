import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  console.log("=== Reloading Schema Cache ===");
  const response = await fetch('http://localhost:3000/api/admin/reload-schema', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  const data = await response.json();
  console.log("Schema Reload Result:", data);
}
run();
