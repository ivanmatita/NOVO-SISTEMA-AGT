/**
 * patch-stock-exit-sales.cjs
 * 1. Adiciona botão "Stock" na secção Bens e Serviços do formulário de faturas
 * 2. Integra saída automática de stock após salvar/emitir documento de venda
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// PATCH A: Adicionar botão Stock na UI
// Localiza a área onde está o botão "Adicionar à lista" usando string única
const marker1 = "setIsAgtItemModalOpen(true);\n              }}\n              className={`bg-[#0f2a4a]";

if (content.includes(marker1) && !content.includes('setShowStockPicker(true)')) {
  const idx = content.indexOf(marker1);
  // Inserir antes deste botão
  const stockBtnStr = `onClick={() => setShowStockPicker(true)}
                className="bg-emerald-700 text-white px-3 py-1.5 font-semibold flex items-center gap-1.5 hover:bg-emerald-800 transition-all text-xs rounded-none"
                title="Seleccionar produto do stock disponivel"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12"/></svg>
                Stock
              </button>
              <button
              type="button"
              disabled={isCertified}
              `;
  
  const insertion = `{!isCertified && <button
              type="button"
              ` + stockBtnStr;
  
  content = content.substring(0, idx - "              <button\n              type=\"button\"\n              disabled={isCertified}\n              ".length) 
    + insertion 
    + content.substring(idx);
  console.log('[A] Botão Stock tentativa 1 - precisará verificação manual.');
}

// ABORDAGEM MAIS SIMPLES: Substituir o texto do botão "Adicionar à lista"
// para incluir um botão Stock antes dele via inline JSX
// Localizar o h3 "Bens e serviços" e substituir a div de controlo adjacente

const h3Target = 'className="text-xs font-bold text-[#0f2a4a] uppercase tracking-wide">Bens e servi';
if (content.includes(h3Target) && !content.includes('setShowStockPicker(true)')) {
  // Encontrar o div pai e adicionar botão stock no lado direito
  // A estrutura é: div.flex > h3 + button
  // Queremos: div.flex > h3 + div.flex.gap-2 > (button stock + button adicionar)
  
  const h3Idx = content.indexOf(h3Target);
  // Encontrar o próximo button após o h3
  const btnIdx = content.indexOf('<button', h3Idx);
  
  if (btnIdx !== -1 && btnIdx - h3Idx < 400) {
    // Inserir botão stock antes do button "Adicionar à lista"
    const stockBtnHtml = `{!isCertified && (
                <button
                  type="button"
                  onClick={() => setShowStockPicker(true)}
                  className="bg-emerald-700 text-white px-3 py-1.5 font-semibold flex items-center gap-1.5 hover:bg-emerald-800 transition-all text-xs rounded-none"
                  title="Seleccionar produto do stock"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12"/></svg>
                  Stock
                </button>
              )}
              `;
    content = content.substring(0, btnIdx) + stockBtnHtml + content.substring(btnIdx);
    console.log('[A] Botão Stock inserido antes de "Adicionar à lista". ✅');
  } else {
    console.log('[A] button não encontrado perto do h3.');
  }
} else if (content.includes('setShowStockPicker(true)')) {
  console.log('[A] Botão Stock já existe.');
} else {
  console.log('[A] h3 target não encontrado. Pulando.');
}

// PATCH B: Saída automática de stock após salvar documento de venda
// Encontrar onde os documentos são salvos com sucesso (setIssuedDocuments)
// e adicionar chamada à API /api/stock/exit-sale

const saveDocTarget = "setIssuedDocuments(docs);";
if (content.includes(saveDocTarget) && !content.includes('/api/stock/exit-sale')) {
  // Adicionar função dispatchStockExit perto do início do componente InvoiceForm
  // Procura o local após o estado showStockPicker
  const fnTarget = "const [showStockPicker, setShowStockPicker] = useState(false);";
  if (content.includes(fnTarget)) {
    content = content.replace(
      fnTarget,
      fnTarget + `

  // Saída automática de stock após emissão de venda
  const dispatchStockExit = async (savedDoc: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const docItems = savedDoc?.items || savedDoc?.itens || [];
      if (!docItems.length) return;
      const empresaId = user?.empresa_id || (user as any)?.company_id;
      if (!empresaId) return;
      
      const payload = {
        empresa_id: empresaId,
        documentId: savedDoc?.id,
        numeroDocumento: savedDoc?.invoice_number || savedDoc?.numero_documento,
        tipoDocumento: savedDoc?.document_type || savedDoc?.tipo_documento,
        clienteNome: savedDoc?.client_name || savedDoc?.cliente_nome,
        dataDocumento: savedDoc?.date || savedDoc?.data_emissao || new Date().toISOString().slice(0,10),
        itens: docItems.map((it: any) => ({
          descricao: it.description || it.descricao || '',
          product_id: it.product_id || it.produto_id || null,
          quantidade: Number(it.quantity || it.quantidade || 1),
          valor_unitario: Number(it.unit_price || it.valor_unitario || 0),
          armazem_id: it.warehouse_id || it.armazem_id || null,
          tipo: it.tipologia || it.tipo_artigo || 'Produto',
        })),
      };

      await fetch('/api/stock/exit-sale', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + (session?.access_token || ''),
        },
        body: JSON.stringify(payload),
      });
      window.dispatchEvent(new CustomEvent('refresh_stock'));
    } catch (e) {
      console.warn('[InvoiceForm] Stock exit (non-critical):', e);
    }
  };`
    );
    console.log('[B] Função dispatchStockExit adicionada.');
  }
}

// Localizar onde o documento é guardado com sucesso e chamar dispatchStockExit
// Procurar pelo padrão "onSuccess" ou "setIssuedDocuments" no contexto do formulário
const onSuccessPatterns = [
  "if (onSuccess) onSuccess(savedDoc);",
  "onSuccess(savedDoc);",
  "onSuccess(data);",
  "onSuccess(newDoc);",
];

let patchedOnSuccess = false;
for (const pat of onSuccessPatterns) {
  if (content.includes(pat) && !content.includes('dispatchStockExit(savedDoc)') && !content.includes('dispatchStockExit(data)')) {
    // Verificar se está perto do formulário de faturas (não compras)
    const occIdx = content.indexOf(pat);
    // Substituir para chamar dispatchStockExit antes
    const varName = pat.includes('savedDoc') ? 'savedDoc' : (pat.includes('data') ? 'data' : 'newDoc');
    content = content.replace(pat, `dispatchStockExit(${varName}).catch(() => {});\n      ${pat}`);
    console.log(`[B] dispatchStockExit chamado após "${pat}".`);
    patchedOnSuccess = true;
    break;
  }
}
if (!patchedOnSuccess) {
  console.log('[B] Padrão onSuccess não encontrado ou já patchado.');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('\n✅ patch-stock-exit-sales.cjs concluído!');
