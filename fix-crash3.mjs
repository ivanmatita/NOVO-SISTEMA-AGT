import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

// I will just completely replace the section from the require/imports until startServer()
// First let's remove everything that comes before startServer() except imports.
// To do this safely, let's just make `tableInfo` available
content = content.replace(/console\.log\("Employees table info:", tableInfo\);/g, '/* console.log suppressed */');

fs.writeFileSync('server.ts', content);
