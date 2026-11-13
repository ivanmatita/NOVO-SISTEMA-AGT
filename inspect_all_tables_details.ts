import 'dotenv/config';

const rawUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const url = rawUrl
  .replace(/\/rest\/v1\/?$/, "")
  .replace(/\/auth\/v1\/?$/, "")
  .replace(/\/$/, "");

const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();

async function run() {
  const swaggerUrl = `${url}/rest/v1/?apikey=${key}`;
  console.log('Retrieving table column types...');
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
    const definitions = data.definitions || {};
    
    const results: any[] = [];
    
    for (const [tableName, definition] of Object.entries(definitions)) {
      const properties = (definition as any).properties || {};
      for (const [colName, colDef] of Object.entries(properties)) {
        const colDetails = colDef as any;
        const lowercaseCol = colName.toLowerCase();
        if (
          lowercaseCol.includes('id') || 
          lowercaseCol.includes('key') || 
          lowercaseCol.includes('empresa') || 
          lowercaseCol.includes('user')
        ) {
          results.push({
            table: tableName,
            column: colName,
            format: colDetails.format,
            type: colDetails.type,
            description: colDetails.description
          });
        }
      }
    }
    
    console.log(JSON.stringify(results, null, 2));
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

run();
