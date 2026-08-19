import fs from 'fs';

const content = fs.readFileSync('./src/App.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (/SecurityModule|PrivateSecurity|GestaoSeguranca|seg_vigilant|seg_postos|seg_ocorrencias|seg_rondas|seg_clientes_seg/i.test(line)) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});

