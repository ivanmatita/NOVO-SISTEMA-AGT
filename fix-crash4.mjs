import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

// The best way to do this is string replacement with regex covering the whole migration block
// from // Migration: Add missing columns to employees table
// down to async function startServer()

content = content.replace(/\/\/ Migration: Add missing columns to employees table.*?async function startServer\(\) \{/s, 'async function startServer() {');

fs.writeFileSync('server.ts', content);
