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

    console.log("\n--- Exposed tables in Supabase definitions ---");
    console.log(Object.keys(schema.definitions || {}));

    const perfisDef = schema.definitions?.perfis;
    if (perfisDef) {
       console.log("\n--- 'perfis' columns in database ---");
       console.log(JSON.stringify(perfisDef.properties, null, 2));
    } else {
       console.log("\n'perfis' table not found in definitions!");
    }

    const profilesDef = schema.definitions?.profiles;
    if (profilesDef) {
       console.log("\n--- 'profiles' columns in database ---");
       console.log(JSON.stringify(profilesDef.properties, null, 2));
    } else {
       console.log("\n'profiles' table not found in definitions!");
    }

    const caixasDef = schema.definitions?.caixas;
    if (caixasDef) {
      console.log("\n--- 'caixas' columns in database ---");
      console.log(JSON.stringify(caixasDef.properties, null, 2));
    } else {
      console.log("\n'caixas' table not found in definitions!");
    }

    const metricsDef = schema.definitions?.metrics;
    if (metricsDef) {
       console.log("\n--- 'metrics' columns in database ---");
       console.log(JSON.stringify(metricsDef.properties, null, 2));
    } else {
       console.log("\n'metrics' table not found in definitions!");
    }
  } catch (err) {
    console.error("Failed to query schema:", err);
  }
}

getSchema().catch(console.error);
