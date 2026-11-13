import fs from 'fs';

const content = fs.readFileSync('./src/App.tsx', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('Erro ao salvar produto') || line.includes('handleAddProduct') || line.includes('handleUpdateProduct') || line.includes('saveProduct')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});

