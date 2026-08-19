import fs from 'fs';

const content = fs.readFileSync('./src/App.tsx', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('Emitir Recibo') || line.includes('emitir recibo') || line.includes('Emitir recibo') || line.includes('Recibo de Fatura')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});

