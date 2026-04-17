import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

const helper = `
const fetchWithAuth = async (url: string, options?: RequestInit) => {
  const session = await supabase?.auth?.getSession();
  const token = session?.data?.session?.access_token;
  
  const headers = new Headers(options?.headers || {});
  if (token) {
    headers.set('Authorization', \`Bearer \${token}\`);
  }

  return fetch(url, { ...options, headers });
};
`;

if (!content.includes('fetchWithAuth')) {
    content = content.replace(/const fetchJson = async \(/, helper + '\nconst fetchJson = async (');
    
    // Now replace calls to `await fetch(` with `await fetchWithAuth(`
    // Need to avoid replacing standard browser fetch? No, all internal API calls start with '/api'
    content = content.replace(/await fetch\(\s*['"`]\/api/g, 'await fetchWithAuth(\'/api');
    content = content.replace(/await fetch\([^)]*\)/g, match => {
        if (match.includes('/api')) {
            return match.replace(/await fetch\(/, 'await fetchWithAuth(');
        }
        return match;
    });
    
    fs.writeFileSync('src/App.tsx', content);
    console.log("Updated App.tsx to use fetchWithAuth on /api endpoints.");
} else {
    console.log("Already has fetchWithAuth");
}
