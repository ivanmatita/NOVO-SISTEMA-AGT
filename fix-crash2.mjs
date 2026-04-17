import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

// I will just redefine these variables.
content = content.replace(/const columns = tableInfo\.map/g, 'const columns = []; // tableInfo.map');
content = content.replace(/const posSalesCols = posSalesInfo\.map/g, 'const posSalesCols = []; // posSalesInfo.map');
content = content.replace(/const cashSessionsCols = cashSessionsInfo\.map/g, 'const cashSessionsCols = []; // ');
content = content.replace(/const clientColumns = clientTableInfo\.map/g, 'const clientColumns = []; // ');
content = content.replace(/const productColumns = productTableInfo\.map/g, 'const productColumns = []; // ');
content = content.replace(/const purchasesColumns = purchasesTableInfo\.map/g, 'const purchasesColumns = []; // ');
content = content.replace(/const invoiceColumns = invoiceTableInfo\.map/g, 'const invoiceColumns = []; // ');

fs.writeFileSync('server.ts', content);
