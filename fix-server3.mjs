import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(/=\s*throw new Error\("SQLite disabled per user request"\);/g, '= (() => { throw new Error("SQLite disabled per user request"); })();');
content = content.replace(/=\s*throw new Error\("Local DB disabled in production for this route"\);/g, '= (() => { throw new Error("Local DB disabled in production for this route"); })();');

content = content.replace(/throw new Error\("SQLite disabled per user request"\);\s*as\s+.*?;/g, 'throw new Error("SQLite disabled per user request");');
content = content.replace(/throw new Error\("SQLite disabled per user request"\);\s*;/g, 'throw new Error("SQLite disabled per user request");');
content = content.replace(/throw new Error\("Local DB disabled in production for this route"\);\s*;/g, 'throw new Error("Local DB disabled in production for this route");');

// We also need to fix `throw new Error("SQLite disabled per user request"); as { count: number };`
// and `(() => { throw new Error("SQLite disabled per user request"); })(); as { count: number };`
content = content.replace(/\(\(\) => \{ throw new Error\("SQLite disabled per user request"\); \}\)\(\);\s*as\s+[\w\s\{\}:]+;/g, '(() => { throw new Error("SQLite disabled per user request"); })();');

// Any trailing ` as any;` or ` as ...;` hanging off
content = content.replace(/throw new Error\([^)]*\)[^:]*?;?\s*as\s+[^;]+;/g, 'throw new Error("SQLite disabled per user request");');

fs.writeFileSync('server.ts', content);