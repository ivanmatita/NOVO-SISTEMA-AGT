import fs from 'fs';

const content = fs.readFileSync('./src/components/SecurityModule.tsx', 'utf8');
const lines = content.split('\n');

// Find all table names used with supabase.from()
const tableLines = lines.filter(l => l.includes('.from('));
const tables = [...new Set(tableLines.map(l => {
  const m = l.match(/\.from\(['"`]([^'"`]+)['"`]\)/);
  return m ? m[1] : null;
}).filter(Boolean))];

console.log('TABLES USED IN SecurityModule:');
tables.forEach(t => console.log(' -', t));

// Find all columns used in insert/select
console.log('\nINSERT/SELECT column references:');
lines.forEach((line, idx) => {
  if (/(bi_numero|numero_bi|nome_completo|data_nasc|local_nasc|telefone|nivel_formacao|especializacao|nota_avaliacao|data_admissao|data_demissao|posto_id|turno|categoria|estado|empresa_id|created_at)/i.test(line) && 
      (line.includes('=') || line.includes(':'))) {
    console.log(`${idx+1}: ${line.trim()}`);
  }
});

