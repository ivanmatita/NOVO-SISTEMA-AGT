#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const root = __dirname;
const srcDir = path.join(root, 'src');

function readFile(p) { return fs.readFileSync(p, 'utf8'); }
function writeFile(p, c) { fs.writeFileSync(p, c, 'utf8'); console.log('  ✓ Saved:', path.relative(root, p)); }

// ─────────────────────────────────────────────────────────────
// 1. Remove AFROGEST branding from all files → replace with IMATEC Software
// ─────────────────────────────────────────────────────────────
console.log('\n[1] Removing AFROGEST branding...');

const afrogestFiles = [
  'src/components/MapaAmortizacaoModule.tsx',
  'src/components/NotasContasModule.tsx',
  'src/components/PrintA4.tsx',
  'src/components/DemonstracaoResultadosModule.tsx',
];

afrogestFiles.forEach(relPath => {
  const fullPath = path.join(root, relPath);
  if (!fs.existsSync(fullPath)) { console.warn('  ! File not found:', relPath); return; }
  let content = readFile(fullPath);
  const before = content;
  // Replace all variants
  content = content.replace(/Powered By AFROGEST[^<"']*/gi, 'IMATEC Software');
  content = content.replace(/Powered By Afrogest[^<"']*/g, 'IMATEC Software');
  content = content.replace(/\bAFROGEST\b/g, 'IMATEC Software');
  content = content.replace(/\bAfrogest\b/g, 'IMATEC Software');
  // Also fix comment-level references
  content = content.replace(/Afrogest\s*\/\s*PGC/gi, 'IMATEC Software / PGC');
  content = content.replace(/Afrogest\s*\/\s*AGT/gi, 'IMATEC Software / AGT');
  if (content !== before) {
    writeFile(fullPath, content);
  } else {
    console.log('  ~ No changes needed:', relPath);
  }
});

// ─────────────────────────────────────────────────────────────
// 2. PriceTableModule.tsx — restrict to SERVICES ONLY
//    - Rename title to "Catálogo de Preços de Serviços"
//    - Filter `produtos` list to tipo === 'servico' (or unset)
//    - Label changes: "produto" → "serviço" where appropriate
//    - Form default tipo = 'servico', remove 'produto' option, only keep servico/outro
//    - Validation: must select a service
// ─────────────────────────────────────────────────────────────
console.log('\n[2] Restricting PriceTableModule to Services only...');
const priceTablePath = path.join(root, 'src/components/PriceTableModule.tsx');
let pt = readFile(priceTablePath);

// Header title: "Tabelas de Produtos" → "Catálogo de Preços de Serviços"
pt = pt.replace(
  /Tabelas de Produtos/g,
  'Catálogo de Preços de Serviços'
);

// Column header: "Informacao dos Produtos" → "Informacao do Serviço"
pt = pt.replace(
  /Informacao dos Produtos/g,
  'Informacao do Serviço'
);

// Modal title: "Editar Preco" / "Novo Registo de Preco" → include Serviço
pt = pt.replace(
  /'Editar Preco'/g,
  "'Editar Serviço'"
);
pt = pt.replace(
  /'Novo Registo de Preco'/g,
  "'Novo Serviço'"
);

// Label: "Descricao do Artigo" → "Descrição do Serviço"
pt = pt.replace(
  /Descricao do Artigo/g,
  'Descrição do Serviço'
);

// Validation message
pt = pt.replace(
  /'Seleccione um produto\.'/g,
  "'Seleccione um serviço.'"
);

// Label: "option value=produto>Produto" → remove, make servico default & only real option
// Replace the Tipo de Artigo select options to remove 'produto'
pt = pt.replace(
  /<option value="produto">Produto<\/option>\s*\n\s*<option value="servico">Servico<\/option>/,
  '<option value="servico">Serviço</option>'
);

// Change form default tipo from 'produto' to 'servico'
pt = pt.replace(
  /tipo: 'produto',/g,
  "tipo: 'servico',"
);

// Filter the products dropdown to only show services (tipo === 'servico' || !tipo)
// Currently: {produtos.map(p => <option ...
// We need to filter before mapping
pt = pt.replace(
  /\{produtos\.map\(p =>/g,
  "{produtos.filter(p => !p.tipo || p.tipo === 'servico' || p.tipo === 'service').map(p =>"
);

// Toolbar subtitle: show "serviços" count label
pt = pt.replace(
  /\(filteredRows\.length\) registos\)/g,
  '(filteredRows.length) serviços)'
);

// Empty state message
pt = pt.replace(
  /Sem registos\. Clique em Novo para adicionar\./g,
  'Sem serviços registados. Clique em Novo para adicionar um serviço.'
);

// "Seleccionar produto" placeholder in select
pt = pt.replace(
  />Seleccionar produto</g,
  '>Seleccionar serviço<'
);

writeFile(priceTablePath, pt);

// ─────────────────────────────────────────────────────────────
// 3. IPModule.tsx — remove hardcoded fake demo data
//    - Remove the two initial ImovelIP[] hardcoded entries
//    - Replace with empty array [] when Supabase returns nothing
//    - Remove 'YGSUNAC INDUSTRIA' hardcoded fallbacks → use companyData only
//    - Ensure empresa_id filter is applied on Supabase query
// ─────────────────────────────────────────────────────────────
console.log('\n[3] Fixing IPModule.tsx — removing fake demo data and hardcoded company names...');
const ipPath = path.join(root, 'src/components/accounting/IPModule.tsx');
if (!fs.existsSync(ipPath)) {
  console.warn('  ! IPModule.tsx not found at accounting subfolder, skipping.');
} else {
  let ip = readFile(ipPath);

  // Replace the fallback demo data block entirely
  // The block starts at: } else { // Initialize with demo data
  // and ends with: }
  ip = ip.replace(
    /\/\/ Initialize with demo data compliant with Angola standard[\s\S]*?localStorage\.setItem\('agt_imoveis_ip', JSON\.stringify\(initial\)\);\s*}/,
    `// No demo data - only show real company data
          setImoveis([]);`
  );

  // Fix Supabase query to filter by empresa_id
  ip = ip.replace(
    /\.from\('imoveis_ip'\)\s*\.select\('\*'\)\s*\.order\('created_at', \{ ascending: false \}\)/,
    `.from('imoveis_ip')
        .select('*')
        .eq('empresa_id', companyData?.empresa_id || companyData?.id || '')
        .order('created_at', { ascending: false })`
  );

  // Fix the insert to include empresa_id
  ip = ip.replace(
    /await supabase\.from\('imoveis_ip'\)\.insert\(\[novo\]\)/,
    `await supabase.from('imoveis_ip').insert([{ ...novo, empresa_id: companyData?.empresa_id || companyData?.id || '' }])`
  );

  // Remove hardcoded YGSUNAC INDUSTRIA fallbacks — replace with empty string
  ip = ip.replace(/'YGSUNAC INDUSTRIA - PRESTAÇÃO DE SERVIÇO E COMERCIO GERAL, LDA'/g, "''");
  ip = ip.replace(/'YGSUNAC INDUSTRIA'/g, "''");
  ip = ip.replace(/'5000732028'/g, "''");

  // Fix form defaults to use companyData properly (proprietario_nif / proprietario_nome)
  ip = ip.replace(
    /proprietario_nif: companyData\?\.nif \|\| ''/g,
    "proprietario_nif: companyData?.nif || ''"
  );
  ip = ip.replace(
    /proprietario_nome: companyData\?\.name \|\| ''/g,
    "proprietario_nome: companyData?.name || ''"
  );

  // Fix the header to show company name from real data only
  ip = ip.replace(
    /\{companyData\?\.name \|\| ''\}/g,
    "{companyData?.name || companyData?.nome_empresa || '—'}"
  );
  ip = ip.replace(
    /\{companyData\?\.nif \|\| ''\}/g,
    "{companyData?.nif || '—'}"
  );

  // Fix DUC PDF - remove hardcoded company name fallback
  ip = ip.replace(
    /Emitido automaticamente pelo Sistema AGT - \$\{companyData\?\.name \|\| 'YGSUNAC INDUSTRIA'\}/,
    "Emitido automaticamente pelo Sistema IMATEC - ${companyData?.name || companyData?.nome_empresa || ''}"
  );

  writeFile(ipPath, ip);
}

// ─────────────────────────────────────────────────────────────
// 4. GestaoFinanceiraModule.tsx — PriceTableModule title in sidebar
//    Update sidebar label to match new service-only page name
// ─────────────────────────────────────────────────────────────
console.log('\n[4] Updating GestaoFinanceiraModule sidebar label...');
const gestaoPath = path.join(root, 'src/components/GestaoFinanceiraModule.tsx');
if (fs.existsSync(gestaoPath)) {
  let g = readFile(gestaoPath);
  // Fix any labels that say "Tabela de Preços" or "Tabela de Produtos" → "Catálogo de Preços de Serviços"
  g = g.replace(/Catálogo de Preços para Serviços/g, 'Catálogo de Preços de Serviços');
  g = g.replace(/Tabela de Preços de Produtos/g, 'Catálogo de Preços de Serviços');
  writeFile(gestaoPath, g);
}

// ─────────────────────────────────────────────────────────────
// 5. Remove AFROGEST from comment headers inside files
// ─────────────────────────────────────────────────────────────
console.log('\n[5] Final scan and remove remaining AFROGEST...');
const allTsxFiles = [];
function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    const fp = path.join(dir, f);
    if (fs.statSync(fp).isDirectory()) walkDir(fp);
    else if (f.endsWith('.tsx') || f.endsWith('.ts')) allTsxFiles.push(fp);
  });
}
walkDir(srcDir);

let totalFixed = 0;
allTsxFiles.forEach(fp => {
  let c = readFile(fp);
  if (c.match(/afrogest|AFROGEST|Afrogest/i)) {
    const fixed = c
      .replace(/Powered By AFROGEST[^\n<"']*/gi, 'IMATEC Software')
      .replace(/\bAFROGEST\b/g, 'IMATEC Software')
      .replace(/\bAfrogest\b/g, 'IMATEC Software')
      .replace(/\bafrogest\b/gi, 'imatec-software');
    if (fixed !== c) {
      writeFile(fp, fixed);
      totalFixed++;
    }
  }
});
console.log(`  ✓ Fixed AFROGEST in ${totalFixed} additional files.`);

console.log('\n✅ All fixes applied successfully!\n');
