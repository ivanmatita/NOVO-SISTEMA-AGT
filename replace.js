const fs = require('fs');
['server.ts', 'src/App.tsx'].forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/empresa_id/g, 'company_id');
  fs.writeFileSync(file, content);
});
console.log('Replacement done');
