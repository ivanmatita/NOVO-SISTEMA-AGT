import fs from 'fs';

const content = fs.readFileSync('./server.ts', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('/api/receipts')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});

