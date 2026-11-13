import fs from 'fs';
const content = fs.readFileSync('./src/App.tsx', 'utf8');
const lines = content.split('\n');

// Find DocumentosEmitidos fetch/load logic and receipt display
const patterns = [
  'documentos_emitidos',
  'fetchIssuedDocuments',
  'logo_url',
  'company_logo',
  'logotipo',
  'Documento de Origem',
  'originDocId',
  'recibo_emitido',
  'estado_pagamento',
  'payment_status',
  'Recibos (RC',
  'tipo_documento.*Recibo',
];

patterns.forEach(pat => {
  const re = new RegExp(pat, 'i');
  lines.forEach((line, idx) => {
    if (re.test(line)) {
      console.log(`L${idx+1}: ${line.trim().substring(0, 120)}`);
    }
  });
  console.log('---');
});

