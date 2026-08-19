// scripts/find_security_and_compras.mjs
import fs from 'fs';
import path from 'path';

function searchInDir(dir, pattern) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory() && file !== 'node_modules' && file !== '.git') {
      searchInDir(fullPath, pattern);
    } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js'))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (pattern.test(line)) {
          console.log(`${fullPath}:${idx + 1}: ${line.trim()}`);
        }
      });
    }
  }
}

console.log('--- BUSCANDO TABELAS seg_ ---');
searchInDir('./src', /seg_/);

console.log('\n--- BUSCANDO REGISTAR COMPRA / CREATEPURCHASE ---');
searchInDir('./src', /handleSubmit.*purchase|handleStartCreate|compras/i);

