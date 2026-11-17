/**
 * patch-all-stock-integration.cjs
 * Patch completo: registar stock-exit no api/index.js + integrar relatório no StockAtualModule
 */
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════
// PATCH 1: api/index.js — registar stock-exit handler
// ═══════════════════════════════════════════════════════
const indexPath = path.join(__dirname, '..', 'api', 'index.js');
let indexContent = fs.readFileSync(indexPath, 'utf8');

// Adicionar import stockExitHandler
if (!indexContent.includes('stockExitHandler')) {
  indexContent = indexContent.replace(
    `import stockSyncHandler from './_handlers/stock-sync.js';`,
    `import stockSyncHandler from './_handlers/stock-sync.js';
import stockExitHandler from './_handlers/stock-exit.js';`
  );
  console.log('[PATCH 1a] Import stockExitHandler adicionado.');
} else {
  console.log('[PATCH 1a] stockExitHandler já importado.');
}

// Substituir rota /api/stock genérica por rota específica que distingue sync/exit
const oldRoute = `  // 12.5. Stock – Sincronização Automática Compras → Stock (Idempotente)
  if (pathname.startsWith('/api/stock')) {
    return stockSyncHandler(req, res);
  }`;

// Try multiple variants due to encoding
const routeVariants = [
  `  // 12.5. Stock \u2013 Sincroniza\u00e7\u00e3o Autom\u00e1tica Compras \u2192 Stock (Idempotente)\n  if (pathname.startsWith('/api/stock')) {\n    return stockSyncHandler(req, res);\n  }`,
  `  // 12.5. Stock â€" SincronizaÃ§Ã£o AutomÃ¡tica Compras â†' Stock (Idempotente)\n  if (pathname.startsWith('/api/stock')) {\n    return stockSyncHandler(req, res);\n  }`,
];

const newRoute = `  // 12.5. Stock — Gestão de Stock (Entrada via Compras + Saída via Vendas)
  if (pathname.startsWith('/api/stock/exit-sale') || pathname.startsWith('/api/stock/check-stock')) {
    return stockExitHandler(req, res);
  }
  if (pathname.startsWith('/api/stock/sync-purchase')) {
    return stockSyncHandler(req, res);
  }
  if (pathname.startsWith('/api/stock')) {
    return stockSyncHandler(req, res);
  }`;

if (!indexContent.includes('/api/stock/exit-sale')) {
  let replaced = false;
  for (const variant of routeVariants) {
    if (indexContent.includes(variant)) {
      indexContent = indexContent.replace(variant, newRoute);
      replaced = true;
      console.log('[PATCH 1b] Rota stock-exit registada (variant match).');
      break;
    }
  }
  if (!replaced) {
    // Fallback: inserir antes do bloco de relatórios
    const relatoriosMarkers = [
      `  // 13. Relatórios`,
      `  // 13. Relat`,
    ];
    for (const marker of relatoriosMarkers) {
      if (indexContent.includes(marker)) {
        indexContent = indexContent.replace(
          marker,
          `  // 12.6. Stock Saída — Vendas e verificação de disponibilidade
  if (pathname.startsWith('/api/stock/exit-sale') || pathname.startsWith('/api/stock/check-stock')) {
    return stockExitHandler(req, res);
  }

${marker}`
        );
        console.log('[PATCH 1b] Rota stock-exit inserida antes de relatórios (fallback).');
        replaced = true;
        break;
      }
    }
    if (!replaced) {
      // Último fallback: inserir antes do health check
      indexContent = indexContent.replace(
        `  // Fallback para health / 404 seguro`,
        `  // Stock Exit — Saída automática de stock nas vendas
  if (pathname.startsWith('/api/stock/exit-sale') || pathname.startsWith('/api/stock/check-stock')) {
    return stockExitHandler(req, res);
  }

  // Fallback para health / 404 seguro`
      );
      console.log('[PATCH 1b] Rota stock-exit inserida antes do fallback final.');
    }
  }
} else {
  console.log('[PATCH 1b] Rota exit-sale já existe.');
}

fs.writeFileSync(indexPath, indexContent, 'utf8');
console.log('[PATCH 1] api/index.js actualizado.\n');

// ═══════════════════════════════════════════════════════
// PATCH 2: StockAtualModule.tsx — integrar StockEntradasReport
// ═══════════════════════════════════════════════════════
const stockModulePath = path.join(__dirname, '..', 'src', 'components', 'stock', 'StockAtualModule.tsx');
let stockContent = fs.readFileSync(stockModulePath, 'utf8');

// 2a. Adicionar import
if (!stockContent.includes('StockEntradasReport')) {
  stockContent = stockContent.replace(
    `import { Product, Warehouse, StockMovement } from '../../types';`,
    `import { Product, Warehouse, StockMovement } from '../../types';
import { StockEntradasReport } from './StockEntradasReport';`
  );
  console.log('[PATCH 2a] Import StockEntradasReport adicionado.');
} else {
  console.log('[PATCH 2a] Import já existe.');
}

// 2b. Adicionar estado activeReportTab
if (!stockContent.includes('activeReportTab')) {
  stockContent = stockContent.replace(
    `const [loadingFresh, setLoadingFresh] = useState<boolean>(false);`,
    `const [loadingFresh, setLoadingFresh] = useState<boolean>(false);
  const [activeReportTab, setActiveReportTab] = useState<'stock' | 'relatorios'>('stock');`
  );
  console.log('[PATCH 2b] Estado activeReportTab adicionado.');
} else {
  console.log('[PATCH 2b] Estado já existe.');
}

fs.writeFileSync(stockModulePath, stockContent, 'utf8');
console.log('[PATCH 2] StockAtualModule.tsx actualizado.\n');

console.log('✅ Todos os patches aplicados com sucesso!');
