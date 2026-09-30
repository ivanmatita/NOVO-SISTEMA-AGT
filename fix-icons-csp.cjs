#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const root = __dirname;

// ─────────────────────────────────────────────────────────────
// 1. Fix POSPage.tsx – add Save to lucide-react imports
// ─────────────────────────────────────────────────────────────
const posPath = path.join(root, 'src', 'components', 'POSPage.tsx');
let pos = fs.readFileSync(posPath, 'utf8');

if (pos.includes(', Save') || pos.includes(',Save')) {
  console.log('[POSPage] Save already present – skipping.');
} else {
  // Replace the last icon before closing brace (handles both LF and CRLF)
  const before = 'Pill, Car, Bed, Warehouse as WarehouseIcon';
  const after  = 'Pill, Car, Bed, Warehouse as WarehouseIcon, Save';
  if (pos.includes(before)) {
    pos = pos.replace(before, after);
    fs.writeFileSync(posPath, pos);
    console.log('[POSPage] ✓ Save added to lucide imports.');
  } else {
    console.error('[POSPage] ✗ Target string not found – check file manually.');
    process.exit(1);
  }
}

// ─────────────────────────────────────────────────────────────
// 2. Fix GestaoFinanceiraModule.tsx – add X to lucide-react imports
// ─────────────────────────────────────────────────────────────
const gestaoPath = path.join(root, 'src', 'components', 'GestaoFinanceiraModule.tsx');
let gestao = fs.readFileSync(gestaoPath, 'utf8');

if (/\bX\b/.test(gestao.substring(0, gestao.indexOf("} from 'lucide-react'")))) {
  console.log('[GestaoFinanceira] X already present – skipping.');
} else {
  const gBefore = '  UserCheck\n} from \'lucide-react\';';
  const gAfter  = '  UserCheck,\n  X\n} from \'lucide-react\';';
  // also try CRLF variant
  const gBeforeCR = '  UserCheck\r\n} from \'lucide-react\';';
  const gAfterCR  = '  UserCheck,\r\n  X\r\n} from \'lucide-react\';';

  if (gestao.includes(gBefore)) {
    gestao = gestao.replace(gBefore, gAfter);
    fs.writeFileSync(gestaoPath, gestao);
    console.log('[GestaoFinanceira] ✓ X added (LF variant).');
  } else if (gestao.includes(gBeforeCR)) {
    gestao = gestao.replace(gBeforeCR, gAfterCR);
    fs.writeFileSync(gestaoPath, gestao);
    console.log('[GestaoFinanceira] ✓ X added (CRLF variant).');
  } else {
    console.error('[GestaoFinanceira] ✗ Target string not found – check file manually.');
    process.exit(1);
  }
}

// ─────────────────────────────────────────────────────────────
// 3. Fix index.html – add cdn.jsdelivr.net to CSP
// ─────────────────────────────────────────────────────────────
const htmlPath = path.join(root, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

const cspLine = html.match(/content="default-src[^"]+"/);
if (!cspLine) {
  console.error('[index.html] ✗ CSP meta tag not found.');
  process.exit(1);
}

if (html.includes('cdn.jsdelivr.net')) {
  console.log('[index.html] cdn.jsdelivr.net already in CSP – skipping.');
} else {
  // Patch script-src
  html = html.replace(
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: https://*.supabase.co",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: https://*.supabase.co https://cdn.jsdelivr.net"
  );
  // Patch connect-src to also allow jsdelivr data fetches
  html = html.replace(
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co ws://localhost:* wss: https: blob:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co ws://localhost:* wss: https: blob: https://cdn.jsdelivr.net"
  );
  fs.writeFileSync(htmlPath, html);
  console.log('[index.html] ✓ cdn.jsdelivr.net added to script-src and connect-src.');
}

console.log('\nAll fixes applied successfully.');
