/**
 * Patch api/index.js para adicionar a rota /api/stock e handler stockSyncHandler
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'api', 'index.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Adicionar import do stockSyncHandler após os outros imports
const importTarget = `import userActivitiesHandler from './_handlers/user-activities.js';`;
const importReplacement = `import userActivitiesHandler from './_handlers/user-activities.js';
import stockSyncHandler from './_handlers/stock-sync.js';`;

if (!content.includes("import stockSyncHandler from")) {
  content = content.replace(importTarget, importReplacement);
  console.log('[PATCH] Import do stockSyncHandler adicionado.');
} else {
  console.log('[PATCH] Import já existe, ignorando.');
}

// 2. Adicionar rota /api/stock antes do bloco de Relatórios
const routeTarget = `  // 13. Relatórios Fiscais e de Gestão (Profit & Loss / Proveitos e Custos)`;
const routeReplacement = `  // 12.5. Stock — Sincronização Automática Compras → Stock (Idempotente)
  if (pathname.startsWith('/api/stock')) {
    return stockSyncHandler(req, res);
  }

  // 13. Relatórios Fiscais e de Gestão (Profit & Loss / Proveitos e Custos)`;

if (!content.includes("pathname.startsWith('/api/stock')")) {
  content = content.replace(routeTarget, routeReplacement);
  console.log('[PATCH] Rota /api/stock adicionada.');
} else {
  console.log('[PATCH] Rota já existe, ignorando.');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('[PATCH] api/index.js atualizado com sucesso!');
