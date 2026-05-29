import fs from 'fs';
import path from 'path';

async function run() {
  const sql = fs.readFileSync(path.join(process.cwd(), 'FIX_SERIES_USER.sql'), 'utf-8');
  console.log("Applying FIX_SERIES_USER via server...");
  
  const response = await fetch('http://localhost:3000/api/exec-sql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql })
  });
  
  const data = await response.json();
  console.log("Result:", data);
}
run().catch(console.error);
