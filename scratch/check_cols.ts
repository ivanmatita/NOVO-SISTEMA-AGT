import 'dotenv/config';

const rawUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const url = rawUrl
  .replace(/\/rest\/v1\/?$/, "")
  .replace(/\/auth\/v1\/?$/, "")
  .replace(/\/$/, "");

const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '').trim();

async function run() {
  const swaggerUrl = `${url}/rest/v1/?apikey=${key}`;
  try {
    const response = await fetch(swaggerUrl, {
      headers: {
        'Accept': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: any = await response.json();
    const definition = data.definitions?.['documentos_emitidos'] || {};
    console.log("=== COLUMNS FOR documentos_emitidos ===");
    console.log(JSON.stringify(definition.properties, null, 2));
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

run();
