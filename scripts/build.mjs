import { execSync } from 'child_process';
import fs from 'fs';

const rawEnv = (process.env.VITE_APP_ENV || process.env.VERCEL_GIT_COMMIT_REF || '').toLowerCase();
const isStaging = rawEnv.includes('staging') || rawEnv.includes('teste');
const mode = isStaging ? 'staging' : 'production';

console.log(`[BUILD-SCRIPT] Starting build for MODE: [${mode.toUpperCase()}]`);

process.env.VITE_APP_ENV = mode;
process.env.NODE_ENV = 'production';

// 1. Vite frontend build
console.log(`[BUILD-SCRIPT] Running: npx vite build --mode ${mode}`);
execSync(`npx vite build --mode ${mode}`, { stdio: 'inherit', env: process.env });

// 2. esbuild server for dist/server.mjs
console.log(`[BUILD-SCRIPT] Bundling dist/server.mjs...`);
execSync(`npx esbuild server.ts --bundle --platform=node --format=esm --packages=external --sourcemap --outfile=dist/server.mjs`, { stdio: 'inherit', env: process.env });

// 3. esbuild serverless entry for api/index.js (self-contained bundle)
console.log(`[BUILD-SCRIPT] Bundling api/index.js for Vercel...`);
execSync(`npx esbuild server.ts --bundle --platform=node --format=cjs --target=node18 --external:pg --outfile=api/index.js`, { stdio: 'inherit', env: process.env });

// Ensure module.exports is directly the handler function for Vercel Serverless Function loader
const footer = '\nif (typeof module !== "undefined" && module.exports) { module.exports = module.exports.default || module.exports; }\n';
fs.appendFileSync('api/index.js', footer);



console.log(`✅ [BUILD-SCRIPT] Build completed successfully for [${mode.toUpperCase()}]!`);
