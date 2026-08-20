import fs from 'fs';

const content = fs.readFileSync('server.ts', 'utf8');
const lines = content.split(/\r?\n/);

const startIdx = lines.findIndex(l => l.includes('if (!hasServiceRoleKey) {'));
const endIdx = lines.findIndex((l, i) => i > startIdx && l.includes('// Secure User Context to bypass RLS'));

console.log('Found startIdx:', startIdx, 'endIdx:', endIdx);

if (startIdx !== -1 && endIdx !== -1) {
  const newLines = [
    ...lines.slice(0, startIdx),
    'if (!hasServiceRoleKey) {',
    '  console.warn("⚠️ SUPABASE_SERVICE_ROLE_KEY não detetada nas variáveis de ambiente. A usar o token JWT do utilizador para RLS.");',
    '}',
    '',
    ...lines.slice(endIdx)
  ];
  fs.writeFileSync('server.ts', newLines.join('\n'));
  console.log('Cleaned server.ts successfully! Total lines:', newLines.length);
}
