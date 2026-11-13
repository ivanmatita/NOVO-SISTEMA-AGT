const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// troca strings com ${} dentro de aspas simples para template literal
content = content.replace(/'([^']*\$\{[^}]+\}[^']*)'/g, '`$1`');

fs.writeFileSync('src/App.tsx', content);

console.log('Fix aplicado.');
