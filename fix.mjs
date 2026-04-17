import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

// Replace import
content = content.replace(
  'import { supabase } from "./src/services/supabaseClient.js";',
  `import { supabase as globalSupabase } from "./src/services/supabaseClient.js";
import { createClient } from "@supabase/supabase-js";`
);

// Add middleware
content = content.replace(
  'const app = express();',
  `const app = express();

app.use((req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
  
  if (supabaseUrl && supabaseKey) {
    if (token) {
      req.supabase = createClient(supabaseUrl, supabaseKey, {
        global: {
          headers: {
            Authorization: \`Bearer \$\{token\}\`
          }
        }
      });
    } else {
      req.supabase = globalSupabase;
    }
  }
  next();
});
`
);

// Replace supabase references ONLY in request handlers
// We can just define a proxy at the top of route initialization that shadows globalSupabase, 
// OR we can replace `if (supabaseEnabled)` with `const supabase = req.supabase || globalSupabase; if (supabaseEnabled)` inside endpoints.

content = content.split('app.get(').join('app.get('); // just structural thinking

// Actually, to make replacing easy:
// Let's replace 'if (supabaseEnabled) {' with 'const supabase = req.supabase || globalSupabase; if (supabaseEnabled) {'
content = content.replace(/if \(supabaseEnabled\) \{/g, 'const supabase = req.supabase || globalSupabase;\n      if (supabaseEnabled) {');
// Wait, someone might already have that indent, it's fine.

// What about `db.prepare(` falling back? The user says "Eliminar completamente SQLite".
// So let's disable SQLite inside API calls to guarantee NO SQLite fallback!
content = content.replace(/const info = db\.prepare/g, 'throw new Error("Local DB disabled in production for this route");\n      const info = db.prepare');
content = content.replace(/db\.prepare\(.*(?:\.run|\.all|\.get)\(.*\)/g, 'throw new Error("SQLite disabled per user request");');

fs.writeFileSync('server.ts', content);
console.log('Fixed server.ts');
