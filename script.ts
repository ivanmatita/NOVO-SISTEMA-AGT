import fs from 'fs';

const appFile = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Replace CreatePurchase
const createInvoiceMatch = appFile.match(/const CreateInvoice = \(\{ clients, products, workSites, fiscalSeries, onBack, onSuccess \}: \{[\s\S]*?^};\n/m);
if (!createInvoiceMatch) {
  console.log("Could not find CreateInvoice");
  process.exit(1);
}

let createPurchaseCode = createInvoiceMatch[0]
  .replace(/CreateInvoice/g, 'CreatePurchase')
  .replace(/clients: Client\[\],/g, 'suppliers: Supplier[],')
  .replace(/clients/g, 'suppliers')
  .replace(/Client/g, 'Supplier')
  .replace(/clientId/g, 'supplierId')
  .replace(/setClientId/g, 'setSupplierId')
  .replace(/clientName/g, 'supplierName')
  .replace(/setClientName/g, 'setSupplierName')
  .replace(/\/api\/invoices/g, '/api/purchases')
  .replace(/Emitir Novo Documento/g, 'Registar Nova Compra')
  .replace(/Emitir Documento/g, 'Registar Compra')
  .replace(/Informações do adquirente/g, 'Informações do fornecedor')
  .replace(/Selecionar cliente/g, 'Selecionar fornecedor')
  .replace(/nome de um novo cliente/g, 'nome de um novo fornecedor')
  .replace(/client_id/g, 'supplier_id');

// Replace the existing CreatePurchase
const createPurchaseRegex = /const CreatePurchase = \(\{ suppliers, products, onBack, onSuccess \}: \{[\s\S]*?^};\n/m;
let newAppFile = appFile.replace(createPurchaseRegex, createPurchaseCode);

// 2. Replace AccountingModule
const accountingModuleCode = `const AccountingModule = ({ invoices, clients }: { invoices: Invoice[], clients: Client[] }) => {
  const [activeSubTab, setActiveSubTab] = useState<string | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [activeRegimeTab, setActiveRegimeTab] = useState<'geral' | 'fornecedores' | 'clientes'>('geral');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  useEffect(() => {
    fetch('/api/purchases').then(r => r.json()).then(setPurchases);
    fetch('/api/suppliers').then(r => r.json()).then(setSuppliers);
  }, []);

  const totalSales = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalPurchases = purchases.reduce((sum, pur) => sum + pur.total, 0);
  const vatLiquidated = invoices.reduce((sum, inv) => sum + (inv.total * 0.14), 0);
  const vatDeductible = purchases.reduce((sum, pur) => sum + (pur.total * 0.14), 0);
  const vatToPay = vatLiquidated - vatDeductible;

  const sections = [
    { id: 'daily-movements', label: 'Movimento Diário', icon: <History size={24} />, description: 'Registo cronológico de todos os movimentos contabilísticos diários.' },
    { id: 'general-regime', label: 'Regime Geral', icon: <BadgeCheck size={24} />, description: 'Contabilidade para empresas enquadradas no regime geral de tributação.' },
    { id: 'simplified-regime', label: 'Regime Simplificado', icon: <Layers size={24} />, description: 'Gestão simplificada para empresas com volume de negócios reduzido.' },
    { id: 'exclusion-regime', label: 'Regime de Exclusão', icon: <XCircle size={24} />, description: 'Controlo de entidades isentas ou excluídas do regime de IVA.' },
    { id: 'accounting-calculations', label: 'Cálculos Contabilísticos', icon: <Calculator size={24} />, description: 'Processamento de amortizações, provisões e apuramentos fiscais.' },
    { id: 'accounting-maps', label: 'Mapas Contabilísticos', icon: <FileText size={24} />, description: 'Emissão de balancetes, balanços e demonstrações de resultados.' },
    { id: 'movement-maps', label: 'Mapas de Movimento', icon: <TrendingUp size={24} />, description: 'Análise gráfica e tabular dos fluxos financeiros da empresa.' },
    { id: 'pgc', label: 'PGC', icon: <Book size={24} />, description: 'Consulta e gestão do Plano Geral de Contas angolano.' },
    { id: 'accounting-settings', label: 'Configurações Contábeis', icon: <Settings size={24} />, description: 'Definição de parâmetros fiscais, anos e moedas de relato.' },
    { id: 'annual-declarations', label: 'Declarações Anuais', icon: <Calendar size={24} />, description: 'Preparação e submissão de modelos fiscais anuais (M1, M2).' },
    { id: 'saft', label: 'Ficheiro SAFT', icon: <FileCode size={24} />, description: 'Exportação do ficheiro de auditoria tributária para a AGT.' },
  ];

  if (!activeSubTab) {
    return (
      <div className="space-y-8">
        <header>
          <Breadcrumbs paths={['Home', 'Área Reservada', 'Contabilidade']} />
          <h2 className="text-3xl font-black text-[#003366] tracking-tight uppercase">Contabilidade</h2>
          <p className="text-zinc-500 text-sm">Selecione uma secção para gerir a contabilidade da sua empresa.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSubTab(section.id)}
              className="group bg-white border border-zinc-200 p-8 text-left hover:border-[#003366] hover:shadow-xl transition-all flex flex-col items-center text-center space-y-4"
            >
              <div className="text-[#003366] group-hover:scale-110 transition-transform duration-300">
                {section.icon}
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-[#003366] uppercase tracking-tight">{section.label}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">{section.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeSubTab) {
      case 'general-regime':
        if (selectedClient) {
          return <ClientAccount client={selectedClient} documents={invoices.filter(i => i.client_id === selectedClient.id)} onBack={() => setSelectedClient(null)} />;
        }
        if (selectedSupplier) {
          // Reusing ClientAccount for SupplierAccount for simplicity, mapping fields
          const supplierDocs = purchases.filter(p => p.supplier_id === selectedSupplier.id).map(p => ({
            ...p,
            tipo_documento: 'Fatura de Compra',
            contravalor: p.total
          }));
          return <ClientAccount client={{...selectedSupplier, tipo_cliente: 'Fornecedor'} as any} documents={supplierDocs as any} onBack={() => setSelectedSupplier(null)} />;
        }
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4 mb-6">
              <button onClick={() => setActiveSubTab(null)} className="p-2 hover:bg-zinc-100 rounded-none text-zinc-400 transition-colors">
                <ChevronLeft size={24} />
              </button>
              <h2 className="text-xl font-bold text-[#003366]">Regime Geral</h2>
            </div>
            
            <div className="flex gap-4 border-b border-zinc-200 mb-6">
              <button 
                onClick={() => setActiveRegimeTab('geral')}
                className={\`px-6 py-3 text-sm font-bold uppercase tracking-widest \${activeRegimeTab === 'geral' ? 'text-[#003366] border-b-2 border-[#003366]' : 'text-zinc-400 hover:text-zinc-600'}\`}
              >
                Visão Geral
              </button>
              <button 
                onClick={() => setActiveRegimeTab('fornecedores')}
                className={\`px-6 py-3 text-sm font-bold uppercase tracking-widest flex items-center gap-2 \${activeRegimeTab === 'fornecedores' ? 'text-[#003366] border-b-2 border-[#003366]' : 'text-zinc-400 hover:text-zinc-600'}\`}
              >
                <Truck size={16} /> Anexo Fornecedores
              </button>
              <button 
                onClick={() => setActiveRegimeTab('clientes')}
                className={\`px-6 py-3 text-sm font-bold uppercase tracking-widest flex items-center gap-2 \${activeRegimeTab === 'clientes' ? 'text-[#003366] border-b-2 border-[#003366]' : 'text-zinc-400 hover:text-zinc-600'}\`}
              >
                <Users size={16} /> Regularização Clientes
              </button>
            </div>

            {activeRegimeTab === 'geral' && (
              <div className="bg-white border border-zinc-200 p-8 rounded-none shadow-sm space-y-8">
                <h3 className="text-sm font-bold text-[#003366] uppercase tracking-widest mb-6 flex items-center gap-3">
                  <BadgeCheck size={18} /> Apuramento de IVA e Totais
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 border border-zinc-100 bg-zinc-50">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Total Vendas</p>
                    <p className="text-2xl font-bold text-[#003366]">{formatCurrency(totalSales)}</p>
                  </div>
                  <div className="p-6 border border-zinc-100 bg-zinc-50">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Total Compras</p>
                    <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalPurchases)}</p>
                  </div>
                  <div className="p-6 border border-zinc-100 bg-zinc-50">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">IVA a Pagar/Recuperar</p>
                    <p className={\`text-2xl font-bold \${vatToPay > 0 ? 'text-red-600' : 'text-emerald-600'}\`}>{formatCurrency(Math.abs(vatToPay))}</p>
                    <p className="text-xs text-zinc-500 mt-1">{vatToPay > 0 ? 'A pagar' : 'A recuperar'}</p>
                  </div>
                </div>
              </div>
            )}

            {activeRegimeTab === 'fornecedores' && (
              <div className="bg-white border border-zinc-200 p-8 rounded-none shadow-sm space-y-6">
                <h3 className="text-sm font-bold text-[#003366] uppercase tracking-widest mb-6 flex items-center gap-3">
                  <Truck size={18} /> Anexo Fornecedores
                </h3>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#003366] text-white text-[11px] uppercase tracking-wider font-bold">
                      <th className="px-6 py-4">Fornecedor</th>
                      <th className="px-6 py-4">NIF</th>
                      <th className="px-6 py-4 text-right">Total Compras</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {suppliers.map(s => {
                      const supplierPurchases = purchases.filter(p => p.supplier_id === s.id);
                      const total = supplierPurchases.reduce((sum, p) => sum + p.total, 0);
                      return (
                        <tr key={s.id} className="hover:bg-zinc-50">
                          <td className="px-6 py-4 text-sm font-medium text-zinc-900">{s.name}</td>
                          <td className="px-6 py-4 text-sm text-zinc-500">{s.nif}</td>
                          <td className="px-6 py-4 text-sm text-right font-bold text-zinc-900">{formatCurrency(total)}</td>
                          <td className="px-6 py-4 text-sm text-right">
                            <button onClick={() => setSelectedSupplier(s)} className="text-[#003366] hover:underline font-bold text-xs uppercase">Conta Corrente</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {activeRegimeTab === 'clientes' && (
              <div className="bg-white border border-zinc-200 p-8 rounded-none shadow-sm space-y-6">
                <h3 className="text-sm font-bold text-[#003366] uppercase tracking-widest mb-6 flex items-center gap-3">
                  <Users size={18} /> Regularização Clientes
                </h3>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#003366] text-white text-[11px] uppercase tracking-wider font-bold">
                      <th className="px-6 py-4">Cliente</th>
                      <th className="px-6 py-4">NIF</th>
                      <th className="px-6 py-4 text-right">Total Vendas</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {clients.map(c => {
                      const clientInvoices = invoices.filter(i => i.client_id === c.id);
                      const total = clientInvoices.reduce((sum, i) => sum + i.total, 0);
                      return (
                        <tr key={c.id} className="hover:bg-zinc-50">
                          <td className="px-6 py-4 text-sm font-medium text-zinc-900">{c.name}</td>
                          <td className="px-6 py-4 text-sm text-zinc-500">{c.nif}</td>
                          <td className="px-6 py-4 text-sm text-right font-bold text-zinc-900">{formatCurrency(total)}</td>
                          <td className="px-6 py-4 text-sm text-right">
                            <button onClick={() => setSelectedClient(c)} className="text-[#003366] hover:underline font-bold text-xs uppercase">Conta Corrente</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      default:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4 mb-6">
              <button onClick={() => setActiveSubTab(null)} className="p-2 hover:bg-zinc-100 rounded-none text-zinc-400 transition-colors">
                <ChevronLeft size={24} />
              </button>
              <h2 className="text-xl font-bold text-[#003366] capitalize">{activeSubTab.replace('-', ' ')}</h2>
            </div>
            <div className="bg-white border border-zinc-200 p-8 rounded-none shadow-sm">
              <div className="p-12 text-center text-zinc-400 italic bg-zinc-50 border border-dashed border-zinc-200">
                Em desenvolvimento.
              </div>
            </div>
          </div>
        );
    }
  };

  return renderContent();
};
`;

const accountingModuleRegex = /const AccountingModule = \(\) => \{[\s\S]*?^};\n/m;
newAppFile = newAppFile.replace(accountingModuleRegex, accountingModuleCode);

// 3. Update App component to pass invoices and clients to AccountingModule
newAppFile = newAppFile.replace(/case 'accounting': return <AccountingModule \/>;/g, "case 'accounting': return <AccountingModule invoices={invoices} clients={clients} />;");

// 4. Update PurchasesModule to pass products and workSites and fiscalSeries to CreatePurchase
const purchasesModuleRegex = /<CreatePurchase[\s\S]*?\/>/m;
newAppFile = newAppFile.replace(purchasesModuleRegex, `<CreatePurchase 
        suppliers={suppliers} 
        products={products} 
        workSites={[]} 
        fiscalSeries={[]} 
        onBack={() => setIsCreating(false)} 
        onSuccess={() => {
          setIsCreating(false);
          fetchPurchases();
        }} 
      />`);

fs.writeFileSync('src/App.tsx', newAppFile);
console.log("Replaced successfully");
