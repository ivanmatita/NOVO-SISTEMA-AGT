import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(/try {\s*throw new Error\("SQLite disabled per user request"\);\s*CREATE TABLE/g, 
`try {
  } catch(e) {}
}

const sqliteDisabledMock = () => { throw new Error("SQLite disabled") };
const dbMock = { prepare: sqliteDisabledMock, exec: sqliteDisabledMock };

// Replacing CREATE TABLEs with mock
/* CREATE TABLE`);

fs.writeFileSync('server.ts', content);
