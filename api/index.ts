/**
 * Vercel Serverless Entry Point — PRODUCTION READY
 *
 * Core issue: server.ts calls startServer() which is async. Routes are only
 * registered AFTER that async function completes. On Vercel, the module is
 * loaded, `app` is exported (with zero routes), and requests arrive before
 * startServer() finishes → 404/500 for every endpoint.
 *
 * Fix: wrap `app` in a middleware that waits for startServer() to complete
 * before forwarding any request to the real Express router.
 */

import type { Request, Response, NextFunction } from 'express';

// Ensure production mode before loading server (prevents Vite import)
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

import express from 'express';
import serverModule from '../server';

// `serverModule` is the Express `app` instance from server.ts.
// `startServer()` is called at the bottom of server.ts and returns a Promise.
// We need to wait for it before accepting traffic.

// server.ts exports the app as default AND calls startServer() internally.
// The internal promise is stored on the module so we can await it here.
const app = serverModule as any;

// Create a thin wrapper that queues requests until initialization is complete
const wrapper = express();

// Extract the initialization promise that server.ts attaches to the app
// (we'll add __initPromise to server.ts below, OR use a small timeout guard)
let initialized = false;
let initPromise: Promise<void> | null = null;

function ensureInitialized(): Promise<void> {
  if (initialized) return Promise.resolve();
  if (initPromise) return initPromise;
  
  // Check if the app has the init promise attached by server.ts
  if ((app as any).__initPromise) {
    initPromise = (app as any).__initPromise.then(() => {
      initialized = true;
    });
    return initPromise;
  }

  // Fallback: wait a short time for async initialization to complete
  initPromise = new Promise((resolve) => {
    // Poll until routes are registered (max 25 seconds for cold start)
    let attempts = 0;
    const maxAttempts = 50;
    const interval = setInterval(() => {
      attempts++;
      // Check if any routes have been registered on the app's router
      const hasRoutes = app._router && app._router.stack && app._router.stack.length > 5;
      if (hasRoutes || attempts >= maxAttempts) {
        clearInterval(interval);
        initialized = true;
        resolve();
      }
    }, 500);
  });
  
  return initPromise;
}

wrapper.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureInitialized();
    // Forward to the fully-initialized Express app
    app(req, res, next);
  } catch (err: any) {
    console.error('[Vercel] Init error:', err);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Erro de inicialização do servidor',
        message: err?.message || 'Unknown error',
        hint: 'Verifique SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY na Vercel.'
      });
    }
  }
});

export default wrapper;
