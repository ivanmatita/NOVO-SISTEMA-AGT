import fs from 'fs';
const content = fs.readFileSync('./server.ts', 'utf8');
const lines = content.split('\n');

// Find /api/invoices GET handler
lines.forEach((line, idx) => {
  if ((line.includes('api/invoices') && (line.includes('GET') || line.includes('app.get'))) || 
      line.includes('loadDocumentosEmitidos') ||
      (line.includes('documentos_emitidos') && line.includes('select'))) {
    console.log(`L${idx+1}: ${line.trim().substring(0,130)}`);
  }
});

