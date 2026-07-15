const fs = require('fs');
const path = 'src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

// Find the saftInvoices mapping block and add due_date after the date line
const oldSnippet = `          date: (d.data_emissao || d.date || d.created_at || '').split('T')[0],\r\n          data_emissao: d.data_emissao || d.date || d.created_at,`;
const newSnippet = `          date: (d.data_emissao || d.date || d.created_at || '').split('T')[0],\r\n          due_date: d.due_date || d.data_vencimento || (d.data_emissao || d.date || d.created_at || '').split('T')[0],\r\n          data_emissao: d.data_emissao || d.date || d.created_at,`;

if (content.includes(oldSnippet)) {
  content = content.replace(oldSnippet, newSnippet);
  fs.writeFileSync(path, content, 'utf8');
  console.log('OK: due_date field added to saftInvoices mapping.');
} else {
  // Try LF only
  const oldLF = oldSnippet.replace(/\r\n/g, '\n');
  const newLF = newSnippet.replace(/\r\n/g, '\n');
  if (content.includes(oldLF)) {
    content = content.replace(oldLF, newLF);
    fs.writeFileSync(path, content, 'utf8');
    console.log('OK (LF): due_date field added.');
  } else {
    console.log('ERROR: pattern not found. Searching for partial match...');
    const idx = content.indexOf("data_emissao: d.data_emissao || d.date || d.created_at,");
    console.log('data_emissao line found at index:', idx);
    if (idx > -1) {
      // Show context around it
      console.log('Context:', JSON.stringify(content.substring(idx - 100, idx + 200)));
    }
  }
}
