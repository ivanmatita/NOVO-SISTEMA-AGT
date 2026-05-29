import 'dotenv/config';

async function getSchema() {
  const rawUrl = process.env.VITE_SUPABASE_URL || '';
  const url = rawUrl.replace(/\/rest\/v1\/?$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

  const schemaUrl = `${url}/rest/v1/?apikey=${key}`;
  console.log("Fetching schema from:", url);

  try {
    const response = await fetch(schemaUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const schema: any = await response.json();

    const perfisDef = schema.definitions?.perfis;
    if (perfisDef) {
      console.log("\n--- 'perfis' columns in database ---");
      console.log(JSON.stringify(perfisDef.properties, null, 2));
    } else {
      console.log("\n'perfis' table not found in definitions!");
    }
  } catch (err) {
    console.error("Failed to query schema:", err);
  }
}

getSchema().catch(console.error);
