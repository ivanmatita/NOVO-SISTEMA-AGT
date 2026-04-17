import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

// The replacement was: `const <var> = throw new Error(..);;` which is a syntax error.
// We should replace that.
content = content.replace(/const\s+[\w]+\s*=\s*throw\s+new\s+Error\("SQLite\s+disabled\s+per\s+user\s+request"\);;/g, 'throw new Error("SQLite disabled per user request");');
content = content.replace(/const\s+[\w]+\s*=\s*throw\s+new\s+Error\("SQLite\s+disabled\s+per\s+user\s+request"\);/g, 'throw new Error("SQLite disabled per user request");');

// Fix `db.prepare(` usages that weren't captured properly and might have assignment.
content = content.replace(/const\s+[\w]+\s*=\s*db.prepare/g, 'throw new Error("SQLite disabled per user request"); const INVALID = db.prepare');

fs.writeFileSync('server.ts', content);
