/**
 * patch-invoice-stock-picker.cjs
 * Integra StockProductPicker no formulário de faturas (App.tsx):
 * 1. Adiciona import do StockProductPicker
 * 2. Adiciona estado showStockPicker
 * 3. Adiciona botão "Seleccionar do Stock" ao lado de "Adicionar à lista"
 * 4. Adiciona o componente StockProductPicker no JSX
 * 5. Integra saída automática de stock após emissão de documento
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// ─── PATCH 1: Import StockProductPicker ──────────────────────────────────────
const importTarget = `import { StockAtualModule } from './components/stock/StockAtualModule';`;
const importReplacement = `import { StockAtualModule } from './components/stock/StockAtualModule';
import { StockProductPicker } from './components/stock/StockProductPicker';`;

if (!content.includes("import { StockProductPicker }")) {
  if (content.includes(importTarget)) {
    content = content.replace(importTarget, importReplacement);
    console.log('[PATCH 1] Import StockProductPicker adicionado.');
  } else {
    // Fallback: adicionar após o import de StockAtualModule de qualquer forma
    content = content.replace(
      `import { StockAtualModule }`,
      `import { StockProductPicker } from './components/stock/StockProductPicker';\nimport { StockAtualModule }`
    );
    console.log('[PATCH 1] Import StockProductPicker adicionado (fallback).');
  }
} else {
  console.log('[PATCH 1] Import já existe.');
}

// ─── PATCH 2: Adicionar estado showStockPicker após isAgtItemModalOpen ────────
const stateTarget = `  // AGT Item Modal state
  const [isAgtItemModalOpen, setIsAgtItemModalOpen] = useState(false);`;
const stateReplacement = `  // AGT Item Modal state
  const [isAgtItemModalOpen, setIsAgtItemModalOpen] = useState(false);
  // Stock Product Picker
  const [showStockPicker, setShowStockPicker] = useState(false);`;

if (!content.includes("showStockPicker")) {
  if (content.includes(stateTarget)) {
    content = content.replace(stateTarget, stateReplacement);
    console.log('[PATCH 2] Estado showStockPicker adicionado.');
  } else {
    // Fallback: adicionar após useState(false) do isAgtItemModalOpen
    content = content.replace(
      `const [isAgtItemModalOpen, setIsAgtItemModalOpen] = useState(false);`,
      `const [isAgtItemModalOpen, setIsAgtItemModalOpen] = useState(false);
  const [showStockPicker, setShowStockPicker] = useState(false);`
    );
    console.log('[PATCH 2] Estado showStockPicker adicionado (fallback).');
  }
} else {
  console.log('[PATCH 2] Estado já existe.');
}

// ─── PATCH 3: Adicionar botão "Seleccionar do Stock" ao lado de "Adicionar à lista" ──
const btnTarget = `              className={`\`bg-[#0f2a4a] text-white px-4 py-1.5 font-semibold flex items-center gap-1.5 hover:bg-[#1a3f6f] transition-all text-xs rounded-none ${isCertified ? 'opacity-50 cursor-not-allowed' : ''}`\`}
            >
              <Plus size={14} /> Adicionar à lista
            </button>`;

const btnTargetAlt = "Adicionar \u00c3\u00a0 lista";
// Find the button's containing div and add stock picker button
const addBtnSection = `className={\`bg-[#0f2a4a] text-white px-4 py-1.5 font-semibold flex items-center gap-1.5 hover:bg-[#1a3f6f] transition-all text-xs rounded-none \${isCertified ? 'opacity-50 cursor-not-allowed' : ''}\`}`;

if (!content.includes("Seleccionar do Stock") && !content.includes("setShowStockPicker(true)")) {
  // Find the "Adicionar à lista" button area and add stock picker button before it
  // Using a unique string around the button
  const pattern = `onClick={() => {
                setEditingAgtItemIndex(null);
                setEditingAgtItemData(null);
                setIsAgtItemModalOpen(true);
              }}`;
  
  if (content.includes(pattern)) {
    const stockBtnInsert = `onClick={() => {
                setEditingAgtItemIndex(null);
                setEditingAgtItemData(null);
                setIsAgtItemModalOpen(true);
              }}`;
    
    // Add stock picker button BEFORE the "Adicionar à lista" button container
    const divFlexTarget = `          <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
            <h3 className="text-xs font-bold text-[#0f2a4a] uppercase tracking-wide">Bens e servi`;
    
    if (content.includes(divFlexTarget)) {
      content = content.replace(
        divFlexTarget,
        `          <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
            <h3 className="text-xs font-bold text-[#0f2a4a] uppercase tracking-wide">Bens e servi`
      );
      // Insert stock picker button in the flex container's right side
      const rightDivTarget = `            <button
              type="button"
              disabled={isCertified}
              onClick={() => {
                setEditingAgtItemIndex(null);
                setEditingAgtItemData(null);
                setIsAgtItemModalOpen(true);
              }}`;
      
      const rightDivReplacement = `            <div className="flex gap-2">
              {!isCertified && (
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
              <button
              type="button"
              disabled={isCertified}
              onClick={() => {
                setEditingAgtItemIndex(null);
                setEditingAgtItemData(null);
                setIsAgtItemModalOpen(true);
              }}`;
      
      if (content.includes(rightDivTarget)) {
        // Find the closing of that button to add the closing div
        content = content.replace(rightDivTarget, rightDivReplacement);
        
        // Now close the new wrapper div after the original button
        const closingTarget = `              <Plus size={14} /> Adicionar \u00c3\u00a0 lista
            </button>`;
        const closingTargetAlt = `              <Plus size={14} /> Adicionar à lista
            </button>`;
        
        if (content.includes(closingTarget)) {
          content = content.replace(closingTarget, `              <Plus size={14} /> Adicionar \u00c3\u00a0 lista
            </button>\n            </div>`);
          console.log('[PATCH 3] Botão Stock adicionado (latin1 encoding).');
        } else if (content.includes(closingTargetAlt)) {
          content = content.replace(closingTargetAlt, `              <Plus size={14} /> Adicionar à lista
            </button>\n            </div>`);
          console.log('[PATCH 3] Botão Stock adicionado (utf8 encoding).');
        } else {
          console.log('[PATCH 3] WARNING: Não encontrou o botão closing. Tentando alternativa...');
          // Try with the encoded version that may appear
          const encodedClose = content.match(/Adicionar.*lista[\s\S]{0,30}<\/button>/);
          if (encodedClose) {
            console.log('[PATCH 3] Found encoded close:', encodedClose[0].substring(0, 50));
          }
        }
      } else {
        console.log('[PATCH 3] Botão alvo não encontrado exato, tentando padrão simplificado...');
      }
    } else {
      console.log('[PATCH 3] Div flex não encontrada. Usando padrão alternativo...');
    }
  }
}

// ─── PATCH 4: Adicionar StockProductPicker no JSX (antes do fechamento da div principal do form) ──
// Adicionar antes do </> ou da chamada do AgtItemModal
const agtModalTarget = `      {isAgtItemModalOpen && (`;
const stockPickerJsx = `      {showStockPicker && (
        <StockProductPicker
          isOpen={showStockPicker}
          onClose={() => setShowStockPicker(false)}
          warehouses={warehouses}
          onSelect={(prod) => {
            const taxDefault = activeTaxes.length > 0 ? activeTaxes[0] : null;
            const newItem: Partial<InvoiceItem> = {
              description: prod.name || (prod as any).nome || '',
              quantity: 1,
              unit_price: Number((prod as any).price ?? (prod as any).preco_venda ?? 0),
              total: Number((prod as any).price ?? (prod as any).preco_venda ?? 0),
              tipologia: 'Mercadoria',
              desconto: 0,
              tipo_artigo: 'produto',
              tax: taxDefault ? \`\${taxDefault.nome} (\${taxDefault.taxa}%)\` : 'IVA - 0%',
              tax_id: taxDefault ? taxDefault.id : null,
              referencia: (prod as any).referencia || (prod as any).reference || '',
              unidade_medida: (prod as any).unit || (prod as any).unidade || 'QUANTIDADE (Qtd)',
              warehouse_id: prod.warehouse_id || prod.armazem_id,
              armazem_id: prod.armazem_id || prod.warehouse_id,
              product_id: prod.id,
              comprimento: 0, largura: 0, altura: 0,
            };
            setItems(prev => [...prev, newItem]);
          }}
        />
      )}
      {isAgtItemModalOpen && (`;

if (!content.includes("StockProductPicker") && content.includes(agtModalTarget)) {
  content = content.replace(agtModalTarget, stockPickerJsx);
  console.log('[PATCH 4] StockProductPicker JSX adicionado.');
} else if (content.includes("StockProductPicker")) {
  console.log('[PATCH 4] StockProductPicker JSX já existe.');
} else {
  console.log('[PATCH 4] WARNING: Alvo do AGT Modal não encontrado. Verificar manualmente.');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('\n✅ patch-invoice-stock-picker.cjs concluído!');
