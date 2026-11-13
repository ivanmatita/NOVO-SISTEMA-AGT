/**
 * scripts/diagnose_prod_crash.mjs
 * This script mimics exactly what Vercel does when loading api/index.js:
 * - imports the module
 * - creates a mock req/res and calls the default export
 * - reports any crash with the full error
 */

import { createServer } from 'http';

console.log('[DIAG] Importing api/index.js...');
let appModule;
try {
  appModule = await import('../api/index.js');
  console.log('[DIAG] Import SUCCESS. Default export type:', typeof appModule.default);
} catch (err) {
  console.error('[DIAG] IMPORT CRASH:', err.message);
  console.error(err.stack);
  process.exit(1);
}

// Simulate a GET /api/health request
const app = appModule.default;
if (!app || typeof app !== 'function') {
  console.error('[DIAG] default export is not a function!', typeof app);
  process.exit(1);
}

const server = createServer((req, res) => {
  app(req, res);
});

server.listen(0, () => {
  const { port } = server.address();
  console.log(`[DIAG] Test server listening on port ${port}`);
  
  // Hit /api/health
  fetch(`http://localhost:${port}/api/health`)
    .then(async r => {
      console.log('[DIAG] /api/health status:', r.status);
      console.log('[DIAG] /api/health body:', await r.text());
      server.close();
      process.exit(0);
    })
    .catch(err => {
      console.error('[DIAG] Fetch error:', err.message);
      server.close();
      process.exit(1);
    });
});

// Timeout safety
setTimeout(() => {
  console.error('[DIAG] TIMEOUT after 10s');
  process.exit(1);
}, 10000);
