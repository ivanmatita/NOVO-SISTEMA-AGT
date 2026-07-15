const fs = require('fs');
const path = 'src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Sidebar scrollbar hide
const oldSidebar = `<div className="w-64 bg-[#0a0e1c] text-zinc-300 h-screen sticky top-0 flex flex-col overflow-y-auto shrink-0 z-20">`;
const newSidebar = `<div className="w-64 bg-[#0a0e1c] text-zinc-300 h-screen sticky top-0 flex flex-col overflow-y-auto shrink-0 z-20 no-scrollbar">`;

if (content.includes(oldSidebar)) {
  content = content.replace(oldSidebar, newSidebar);
  console.log('Sidebar change applied.');
} else {
  console.log('Sidebar old string not found.');
}

// 2. SAF-T invoices logic mapping (from previous successful build)
const oldSaft = `      case 'saft':
        return <SaftExportForm invoices={invoices} purchases={purchases} />;`;

const newSaft = `      case 'saft': {
        // Map issuedDocuments to Invoice shape so SAF-T gets all billing data
        const saftInvoices: Invoice[] = (issuedDocuments || []).map((d: any) => ({
          id: d.id,
          invoice_number: d.numero_documento || d.invoice_number || '',
          date: (d.data_emissao || d.date || d.created_at || '').split('T')[0],
          due_date: d.due_date || d.data_vencimento || (d.data_emissao || d.date || d.created_at || '').split('T')[0],
          data_emissao: d.data_emissao || d.date || d.created_at,
          client_id: d.cliente_id || d.client_id || '',
          client_name: d.cliente_nome || d.client_name || '',
          client_nif: d.cliente_nif || d.client_nif || '',
          total: Number(d.contravalor || d.total || d.valor_total || 0),
          imposto: Number(d.imposto || d.vat_amount || 0),
          status: d.estado_documento || d.status || 'N',
          is_anulado: d.is_anulado || d.documento_anulado || false,
          document_type: d.tipo_documento || d.document_type || 'FT',
          tipo_documento: d.tipo_documento || d.document_type || 'FT',
          items: Array.isArray(d.items) ? d.items : [],
          serie: d.serie || '',
          regime: d.regime || companyData?.regime || 'F',
        }));
        // Also include regular invoices (POS) — merge and de-duplicate by id
        const allSaftInvoices = [...saftInvoices];
        (invoices || []).forEach((inv: Invoice) => {
          if (!allSaftInvoices.find(x => x.id === inv.id)) allSaftInvoices.push(inv);
        });
        return <SaftExportForm invoices={allSaftInvoices} purchases={purchases} clients={clients} companyData={companyData} defaultYear={selectedYear} defaultMonth={selectedMonth} onBack={() => setActiveSubTab(null)} />;
      }`;

if (content.includes(oldSaft)) {
  content = content.replace(oldSaft, newSaft);
  console.log('SAF-T change applied.');
} else {
  // Try with CRLF
  const oldSaftCRLF = oldSaft.replace(/\n/g, '\r\n');
  const newSaftCRLF = newSaft.replace(/\n/g, '\r\n');
  if (content.includes(oldSaftCRLF)) {
    content = content.replace(oldSaftCRLF, newSaftCRLF);
    console.log('SAF-T change (CRLF) applied.');
  } else {
    console.log('SAF-T old string not found.');
  }
}

// 3. Documentos Recebidos filtering and green PAGO badge
const oldRecebidosStart = `            {activeSubTab === 'recebidos' && (`;

const idxStart = content.indexOf(oldRecebidosStart);
if (idxStart !== -1) {
  const nextSegment = content.substring(idxStart);
  const idxAdesao = nextSegment.indexOf(`{activeSubTab === 'adesao'`);
  if (idxAdesao !== -1) {
    const fullRecebidosBlock = nextSegment.substring(0, idxAdesao).trim();
    
    // Construct the replacement string using single quotes to avoid backtick conflicts
    const newRecebidosBlock = '            {activeSubTab === \'recebidos\' && (\n' +
      '              <div className="bg-white border border-zinc-200 rounded-none overflow-hidden shadow-sm">\n' +
      '                <table className="w-full text-left border-collapse">\n' +
      '                  <thead>\n' +
      '                    <tr className="bg-[#003366] text-white text-[11px] uppercase tracking-wider font-bold">\n' +
      '                      <th className="px-6 py-4">Data</th>\n' +
      '                      <th className="px-6 py-4">Vencimento</th>\n' +
      '                      <th className="px-6 py-4">Tipo</th>\n' +
      '                      <th className="px-6 py-4">Número</th>\n' +
      '                      <th className="px-6 py-4">Fornecedor/Cliente</th>\n' +
      '                      <th className="px-6 py-4">Pagamento</th>\n' +
      '                      <th className="px-6 py-4 text-right">Valor</th>\n' +
      '                      <th className="px-6 py-4 text-center">Ações</th>\n' +
      '                    </tr>\n' +
      '                  </thead>\n' +
      '                  <tbody className="divide-y divide-zinc-100">\n' +
      '                    {(() => {\n' +
      '                      const receivedDocs = filteredIssuedDocuments.filter(doc => {\n' +
      '                        const tp = String(doc.document_type || doc.tipo_documento || \'\').trim().toUpperCase();\n' +
      '                        return (\n' +
      '                          tp === \'FR\' || \n' +
      '                          tp === \'RC\' || \n' +
      '                          tp.includes(\'FATURA RECIBO\') || \n' +
      '                          tp.includes(\'FATURA-RECIBO\') || \n' +
      '                          tp.includes(\'FACTURA RECIBO\') || \n' +
      '                          tp.includes(\'FACTURA-RECIBO\') || \n' +
      '                          tp.includes(\'RECIBO\')\n' +
      '                        );\n' +
      '                      });\n' +
      '\n' +
      '                      if (receivedDocs.length === 0) {\n' +
      '                        return (\n' +
      '                          <tr>\n' +
      '                            <td colSpan={8} className="p-12 text-center text-zinc-400 text-sm">\n' +
      '                              Nenhum documento recebido encontrado.\n' +
      '                            </td>\n' +
      '                          </tr>\n' +
      '                        );\n' +
      '                      }\n' +
      '\n' +
      '                      return receivedDocs.map((doc) => {\n' +
      '                        const tp = String(doc.tipo_documento || doc.document_type || \'\').toUpperCase();\n' +
      '                        const displayType = tp === \'FR\' || tp.includes(\'FATURA RECIBO\') || tp.includes(\'FATURA-RECIBO\') || tp.includes(\'FACTURA RECIBO\') || tp.includes(\'FACTURA-RECIBO\')\n' +
      '                          ? \'Fatura Recibo\'\n' +
      '                          : tp === \'RC\' || tp.includes(\'RECIBO\')\n' +
      '                            ? \'Recibo\'\n' +
      '                            : doc.tipo_documento || doc.document_type;\n' +
      '                        \n' +
      '                        const dateStr = doc.data_emissao || doc.date || doc.created_at;\n' +
      '                        const formattedDate = dateStr ? new Date(dateStr).toLocaleDateString() : \'N/A\';\n' +
      '                        const dueDateStr = doc.due_date || doc.data_vencimento || dateStr;\n' +
      '                        const formattedDueDate = dueDateStr ? new Date(dueDateStr).toLocaleDateString() : \'N/A\';\n' +
      '\n' +
      '                        return (\n' +
      '                          <tr key={doc.id} className="hover:bg-zinc-50 text-sm border-b border-zinc-50">\n' +
      '                            <td className="px-6 py-4 text-zinc-900 font-medium whitespace-nowrap">{formattedDate}</td>\n' +
      '                            <td className="px-6 py-4 text-zinc-700 whitespace-nowrap">{formattedDueDate}</td>\n' +
      '                            <td className="px-6 py-4 font-bold text-zinc-900 whitespace-nowrap">\n' +
      '                              <span className={"inline-block text-[9px] font-black border px-1.5 py-0.5 mr-2 uppercase " + (\n' +
      '                                displayType.toLowerCase().includes("recibo") && !displayType.toLowerCase().includes("fatura")\n' +
      '                                  ? "bg-emerald-100 text-emerald-700 border-emerald-200" \n' +
      '                                  : "bg-purple-100 text-purple-700 border-purple-200"\n' +
      '                              )}>\n' +
      '                                {displayType.toLowerCase().includes("recibo") && !displayType.toLowerCase().includes("fatura") ? "RC" : "FR"}\n' +
      '                              </span>\n' +
      '                              {displayType}\n' +
      '                            </td>\n' +
      '                            <td className="px-6 py-4 font-mono text-xs text-zinc-600 font-bold whitespace-nowrap">{doc.numero_documento || doc.invoice_number}</td>\n' +
      '                            <td className="px-6 py-4 text-zinc-900 font-bold">{doc.client_name || doc.cliente_nome || doc.cliente_id || doc.client_id}</td>\n' +
      '                            <td className="px-6 py-4 whitespace-nowrap">\n' +
      '                              <span className="inline-flex items-center bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded border border-emerald-200 uppercase tracking-widest">\n' +
      '                                PAGO\n' +
      '                              </span>\n' +
      '                            </td>\n' +
      '                            <td className="px-6 py-4 text-right font-black text-[#003366] text-base whitespace-nowrap">{formatCurrency(doc.contravalor || doc.total || doc.counter_value || 0)}</td>\n' +
      '                            <td className="px-6 py-4 text-center">\n' +
      '                              <button \n' +
      '                                onClick={() => onViewDetail?.(doc)}\n' +
      '                                className="p-1.5 text-zinc-400 hover:text-[#003366] hover:bg-zinc-100 transition-colors inline-block"\n' +
      '                                title="Ver Relatório"\n' +
      '                              >\n' +
      '                                <Eye size={18} />\n' +
      '                              </button>\n' +
      '                            </td>\n' +
      '                          </tr>\n' +
      '                        );\n' +
      '                      });\n' +
      '                    })()}\n' +
      '                  </tbody>\n' +
      '                </table>\n' +
      '              </div>\n' +
      '            )}';

    content = content.replace(fullRecebidosBlock, newRecebidosBlock);
    console.log('Documentos Recebidos change applied.');
  } else {
    console.log('activeSubTab === adesao not found.');
  }
} else {
  console.log('activeSubTab === recebidos not found.');
}

fs.writeFileSync(path, content, 'utf8');
console.log('All changes written successfully!');
