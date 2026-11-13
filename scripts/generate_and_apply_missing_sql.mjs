import fs from 'fs';

const stgRaw = fs.readFileSync('C:/Users/Ivan/.gemini/antigravity/brain/7e87675c-4928-4b02-b870-844cf0ba601e/.system_generated/steps/2377/output.txt', 'utf8');
const prdRaw = fs.readFileSync('C:/Users/Ivan/.gemini/antigravity/brain/7e87675c-4928-4b02-b870-844cf0ba601e/.system_generated/steps/2379/output.txt', 'utf8');

const parseData = (raw) => {
  const obj = JSON.parse(raw);
  const resStr = obj.result || raw;
  const s = resStr.indexOf('[');
  const e = resStr.lastIndexOf(']');
  return JSON.parse(resStr.substring(s, e + 1));
};

const stgCols = parseData(stgRaw);
const prdCols = parseData(prdRaw);
const prdColSet = new Set(prdCols.map(c => `${c.table_name}.${c.column_name}`));
const prdTables = new Set(prdCols.map(c => c.table_name));

const missing = [];
for (const col of stgCols) {
  if (prdTables.has(col.table_name) && !prdColSet.has(`${col.table_name}.${col.column_name}`)) {
    missing.push(col);
  }
}

console.log('Missing columns count:', missing.length);

let sql = '';
for (const col of missing) {
  let type = col.data_type;
  if (type === 'USER-DEFINED') type = 'text';
  if (type === 'ARRAY') type = 'text[]';
  let def = (col.column_default && !col.column_default.includes('nextval')) ? ` DEFAULT ${col.column_default}` : '';
  sql += `ALTER TABLE public.${col.table_name} ADD COLUMN IF NOT EXISTS ${col.column_name} ${type}${def};\n`;
}

// Também adicionar permissões RLS universais
for (const t of Array.from(prdTables)) {
  sql += `
    ALTER TABLE public.${t} ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "${t}_universal_access" ON public.${t};
    CREATE POLICY "${t}_universal_access" ON public.${t} FOR ALL TO public USING (true) WITH CHECK (true);
    GRANT ALL ON public.${t} TO anon, authenticated, service_role;
  `;
}
sql += "\nNOTIFY pgrst, 'reload schema';\n";

fs.writeFileSync('scripts/all_missing_parity.sql', sql);
console.log('Saved scripts/all_missing_parity.sql with size:', sql.length);
