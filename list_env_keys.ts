import * as dotenv from 'dotenv';
dotenv.config();

console.log("=== ENVIRONMENT VARIABLES KEYS ===");
for (const key of Object.keys(process.env)) {
  const val = process.env[key] || '';
  let preview = '';
  if (val.length > 0) {
    preview = val.startsWith('postgres') ? 'postgres://...' : val.substring(0, 8) + '...';
  }
  console.log(`- ${key}: length=${val.length}, preview=${preview}`);
}
