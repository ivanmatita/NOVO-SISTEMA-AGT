import fs from 'fs';

const content = fs.readFileSync('./src/App.tsx', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('StagingBadge') || line.includes('AMBIENTE DE TESTE') || line.includes('PRODUÇÃO')) {
    if (idx > 30000 || line.includes('function') || line.includes('const StagingBadge')) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  }
});

