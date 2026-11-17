/**
 * patch-invoice-stock-simple.cjs
 * Integração simplificada do StockProductPicker no App.tsx
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// PATCH 1: Import
if (!content.includes('StockProductPicker')) {
  content = content.replace(
    "import { StockAtualModule } from './components/stock/StockAtualModule';",
    "import { StockAtualModule } from './components/stock/StockAtualModule';\nimport { StockProductPicker } from './components/stock/StockProductPicker';"
  );
  console.log('[1] Import StockProductPicker adicionado.');
} else {
  console.log('[1] Import já existe.');
}

// PATCH 2: Estado showStockPicker
if (!content.includes('showStockPicker')) {
  content = content.replace(
    "const [isAgtItemModalOpen, setIsAgtItemModalOpen] = useState(false);",
    "const [isAgtItemModalOpen, setIsAgtItemModalOpen] = useState(false);\n  const [showStockPicker, setShowStockPicker] = useState(false);"
  );
  console.log('[2] Estado showStockPicker adicionado.');
} else {
  console.log('[2] Estado já existe.');
}

// PATCH 3: Botão "Stock" no header da secção "Bens e serviços"
// Encontrar a área do header da secção e adicionar o botão antes do "Adicionar à lista"
const headerMarker = 'Bens e servi';
const addBtnMarker = 'setIsAgtItemModalOpen(true);\n              }}\n              className={`bg-[#0f2a4a]';

// Estratégia: procurar pelo div flex que contém o botão "Adicionar à lista"
// e substituir para incluir também o botão "Seleccionar do Stock"
const flexTarget = 'className="flex justify-between items-center border-b border-zinc-100 pb-2">';
const occurrences = [];
let searchPos = 0;
while (true) {
  const idx = content.indexOf(flexTarget, searchPos);
  if (idx === -1) break;
  occurrences.push(idx);
  searchPos = idx + 1;
}
console.log(`[3] Encontrados ${occurrences.length} divs flex com esse padrão.`);

// Encontrar o que está perto de "Bens e serviços" e "isAgtItemModalOpen"
let targetIdx = -1;
for (const occ of occurrences) {
  const context = content.substring(occ, occ + 600);
  if (context.includes('isAgtItemModalOpen') || context.includes('Adicionar')) {
    targetIdx = occ;
    break;
  }
}

if (targetIdx !== -1 && !content.includes('setShowStockPicker(true)')) {
  // Encontrar o botão dentro deste contexto e modificar para envolver em div
  const contextStart = targetIdx;
  const contextEnd = contextStart + 800;
  const context = content.substring(contextStart, contextEnd);
  
  // Substituir a estrutura do flex container para adicionar botão stock
  const oldStructure = '<div className="flex justify-between items-center border-b border-zinc-100 pb-2">';
  const newStructure = '<div className="flex justify-between items-center border-b border-zinc-100 pb-2">';
  
  // Localizar o botão "Adicionar à lista" e adicionar botão stock antes
  const addListBtnIdx = content.indexOf('setIsAgtItemModalOpen(true);\n              }}', targetIdx);
  
  if (addListBtnIdx !== -1 && addListBtnIdx < contextEnd + 400) {
    // Verificar que estamos no contexto certo
    const preContext = content.substring(addListBtnIdx - 200, addListBtnIdx);
    if (preContext.includes('disabled={isCertified}')) {
      // Encontrar o início do button tag
      const btnStart = preContext.lastIndexOf('<button');
      const absoluteBtnStart = addListBtnIdx - 200 + btnStart;
      
      // Inserir o botão Stock antes deste button
      const stockBtn = `{!isCertified && (
                <button
                  type="button"
                  onClick={() => setShowStockPicker(true)}
                  className="bg-emerald-600 text-white px-3 py-1.5 font-semibold flex items-center gap-1.5 hover:bg-emerald-700 transition-all text-xs rounded-none"
                  title="Seleccionar produto do stock"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12"/></svg>
                  Stock
                </button>
              )}
              `;
      
      content = content.substring(0, absoluteBtnStart) + stockBtn + content.substring(absoluteBtnStart);
      console.log('[3] Botão Stock inserido antes de "Adicionar à lista".');
    } else {
      console.log('[3] Contexto do botão não confirmado, skipping.');
    }
  } else {
    console.log('[3] Botão "Adicionar à lista" não encontrado perto do flex container.');
  }
} else if (content.includes('setShowStockPicker(true)')) {
  console.log('[3] Botão Stock já existe.');
} else {
  console.log('[3] Flex container alvo não encontrado.');
}

// PATCH 4: JSX do StockProductPicker — adicionar antes do {isAgtItemModalOpen && (
const modalTarget = '{isAgtItemModalOpen && (';
const stockPickerJsx = `{showStockPicker && (
        <StockProductPicker
          isOpen={showStockPicker}
          onClose={() => setShowStockPicker(false)}
          warehouses={warehouses}
          onSelect={(prod) => {
            const taxDefault = activeTaxes.length > 0 ? activeTaxes[0] : null;
            const newItem = {
              description: prod.name || (prod as any).nome || '',
              quantity: 1,
              unit_price: Number((prod as any).price ?? (prod as any).preco_venda ?? 0),
              total: Number((prod as any).price ?? (prod as any).preco_venda ?? 0),
              tipologia: 'Mercadoria',
              desconto: 0,
              tipo_artigo: 'produto',
              tax: taxDefault ? taxDefault.nome + ' (' + taxDefault.taxa + '%)' : 'IVA - 0%',
              tax_id: taxDefault ? taxDefault.id : null,
              referencia: (prod as any).referencia || (prod as any).reference || '',
              unidade_medida: (prod as any).unit || (prod as any).unidade || 'QUANTIDADE (Qtd)',
              warehouse_id: prod.warehouse_id || (prod as any).armazem_id,
              armazem_id: (prod as any).armazem_id || prod.warehouse_id,
              product_id: prod.id,
              comprimento: 0, largura: 0, altura: 0,
            };
            setItems(prev => [...prev, newItem]);
          }}
        />
      )}
      {isAgtItemModalOpen && (`;

if (!content.includes('showStockPicker && (') && content.includes(modalTarget)) {
  // Substituir apenas a primeira ocorrência próxima do formulário de fatura
  const modalIdx = content.indexOf(modalTarget);
  if (modalIdx !== -1) {
    content = content.substring(0, modalIdx) + stockPickerJsx + content.substring(modalIdx + modalTarget.length);
    console.log('[4] StockProductPicker JSX adicionado.');
  }
} else if (content.includes('showStockPicker && (')) {
  console.log('[4] StockProductPicker JSX já existe.');
} else {
  console.log('[4] Modal alvo não encontrado. Verificar manualmente.');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('\nDone!');
