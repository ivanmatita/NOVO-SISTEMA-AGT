import fs from 'fs';

const content = fs.readFileSync('./src/App.tsx', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('series_fiscais') || line.includes('Erro ao criar série')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});

