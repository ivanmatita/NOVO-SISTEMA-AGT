import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(/invoice = \(\(\) => \{ throw new Error\("SQLite disabled per user request"\); \}\)\(\);;\s*throw new Error\("SQLite disabled per user request"\)\.total \|\| 0;/g, 'invoice = (() => { throw new Error("SQLite disabled per user request"); })();');

content = content.replace(/const transaction = db\.transaction\(\(\) => \{\s*throw new Error\("SQLite disabled per user request"\)\s*stmtDelete\.run\(Number\(empId\), date\);\s*stmtInsert\.run\(Number\(empId\), date, status\);\s*\}\s*\}\s*\n\s*\}\);\s*transaction\(\);/gs, 'throw new Error("SQLite disabled");');

// Just remove all stmtDelete.run ...  and transaction();
content = content.replace(/const transaction = db\.transaction.*?transaction\(\);/gs, 'throw new Error("Local DB transaction disabled");');

content = content.replace(/if \(work_site_id\) \{\s*throw new Error\("SQLite disabled per user request"\)\s*const currentBalance =.*?newBalance\);\s*\}/gs, 'if(work_site_id) { throw new Error("SQLite disabled"); }');

content = content.replace(/app\.post\("\/api\/system-users", \(req, res\) => \{\s*const \{.*?\} = req\.body;\s*throw new Error\("SQLite disabled per user request"\) const INVALID = db\.prepare\(`/gs, 'app.post("/api/system-users", (req, res) => { const { name, profession, date, permission_area, contact, address } = req.body; throw new Error("SQLite disabled"); const INVALID = db.prepare(`');

content = content.replace(/throw new Error\("SQLite disabled per user request"\)\s*const INVALID = db\.prepare/gs, 'throw new Error("SQLite disabled"); const INVALID = db.prepare');

fs.writeFileSync('server.ts', content);
