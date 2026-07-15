import React, { useState } from 'react';
import { Invoice, Purchase } from '../types';
import { 
  ChevronLeft, 
  Printer, 
  Calendar, 
  FileText, 
  ShoppingCart, 
  TrendingUp, 
  TrendingDown, 
  Landmark, 
  Receipt, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calculator,
  User
} from 'lucide-react';

interface CalculosImpostosFormProps {
  invoices: Invoice[];
  purchases: Purchase[];
  companyData?: any;
  onBack: () => void;
}

const CalculosImpostosForm = ({ invoices, purchases, companyData, onBack }: CalculosImpostosFormProps) => {
  const [activeTab, setActiveTab] = useState<'resumo' | 'vendas' | 'compras'>('resumo');
  const [ano, setAno] = useState('2025');
  const [mes, setMes] = useState('05'); // Default to May as in other forms

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' })
      .format(value)
      .replace('Kz', '')
      .trim();
  };

  // Helper to check if date falls in selected month and year
  const isSelectedPeriod = (dateString: string) => {
    if (!dateString) return false;
    const parts = dateString.split('-');
    if (parts.length < 3) return false;
    const year = parts[0];
    const month = parts[1];
    return year === ano && month === mes;
  };

  // 1. FILTER SALES & PURCHASES BY SELECTED PERIOD
  const filteredInvoices = (invoices || []).filter(
    (inv) => isSelectedPeriod(inv.date) && inv.status !== 'anulado' && !(inv as any).is_anulado
  );

  const filteredPurchases = (purchases || []).filter(
    (p) => isSelectedPeriod(p.date) && p.status !== 'anulado' && !(p as any).is_anulado
  );

  // 2. CALCULATE SALES TOTALS
  const totalSales = filteredInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);
  
  // Tax base and VAT for Sales
  // Priority: use stored imposto (from DB), then item-level calc, then fallback total/1.14
  const salesVatBase = filteredInvoices.reduce((sum, inv) => {
    const storedTax = Number((inv as any).imposto || 0);
    if (storedTax > 0) {
      return sum + (Number(inv.total || 0) - storedTax);
    }
    const items = inv.items || [];
    if (items.length > 0) {
      return sum + items.reduce((s: number, item: any) => s + (Number(item.quantity) * Number(item.unit_price)), 0);
    }
    return sum + (Number(inv.total || 0) / 1.14);
  }, 0);

  const salesVatAmount = totalSales - salesVatBase;

  // Withholdings on Sales (Retenções na Fonte Sofridas)
  const salesWithholding = filteredInvoices.reduce((sum, inv) => {
    return sum + Number(inv.retencao_fonte_total || (inv as any).retencao_fonte || 0);
  }, 0);

  // Stamp Tax on Sales (Imposto de Selo - 1% on receipts / invoices representing cash receipts)
  const salesStampTax = filteredInvoices.reduce((sum, inv) => {
    if (inv.document_type === 'Fatura Recibo' || inv.document_type === 'Recibo') {
      return sum + (Number(inv.total || 0) * 0.01);
    }
    return sum;
  }, 0);


  // 3. CALCULATE PURCHASES TOTALS
  const totalPurchases = filteredPurchases.reduce((sum, p) => sum + Number(p.total || 0), 0);

  // Tax base and VAT for Purchases
  // Priority: use item-level qty*price, fallback to total/1.14
  const purchasesVatBase = filteredPurchases.reduce((sum, p) => {
    const items = p.items || [];
    if (items.length > 0) {
      const itemBase = items.reduce((s: number, item: any) => {
        const qty = Number(item.quantity || item.quantidade || 1);
        const price = Number(item.unit_price || item.preco_unitario || item.price || 0);
        return s + (qty * price);
      }, 0);
      if (itemBase > 0) return sum + itemBase;
    }
    return sum + (Number(p.total || 0) / 1.14);
  }, 0);

  const purchasesVatAmount = totalPurchases - purchasesVatBase;

  // Withholdings on Purchases (Retenções Efetuadas a Pagar)
  const purchasesWithholding = filteredPurchases.reduce((sum, p) => {
    return sum + Number(
      (p as any).retencao_fonte ||
      (p as any).withholding_total ||
      (p as any).vat_withholding ||
      (p as any).taxa_retencao ||
      0
    );
  }, 0);


  // 4. SETTLEMENT CALCULATIONS
  const netVat = salesVatAmount - purchasesVatAmount;
  const advanceIndustrialTax = totalSales * 0.02; // Imposto Industrial Provisório (2% sobre Vendas)
  
  // Net VAT to pay (if positive) + Stamp Tax + Withholdings from purchases - Withholdings suffered on sales
  const netTaxToPay = (netVat > 0 ? netVat : 0) + salesStampTax + purchasesWithholding - salesWithholding;

  // NIF formatted digits
  const nifStr = String(companyData?.nif || "5000922200").trim();
  const digits = Array(19).fill(' ');
  for (let i = 0; i < nifStr.length; i++) {
    digits[19 - nifStr.length + i] = nifStr[i];
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex justify-between items-center bg-white p-4 border border-zinc-200 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-zinc-100 rounded-none text-zinc-400 transition-colors">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 className="text-2xl font-black text-[#003366] uppercase tracking-tighter">Cálculos de Impostos</h2>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
              Apuramento Mensal e Registos Contábeis de Vendas e Compras
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-zinc-50 px-3 py-1.5 border border-zinc-200">
            <Calendar size={14} className="text-[#003366]" />
            <select 
              value={mes} 
              onChange={e => setMes(e.target.value)} 
              className="bg-transparent text-xs font-bold text-[#003366] focus:outline-none uppercase"
            >
              <option value="01">Janeiro</option>
              <option value="02">Fevereiro</option>
              <option value="03">Março</option>
              <option value="04">Abril</option>
              <option value="05">Maio</option>
              <option value="06">Junho</option>
              <option value="07">Julho</option>
              <option value="08">Agosto</option>
              <option value="09">Setembro</option>
              <option value="10">Outubro</option>
              <option value="11">Novembro</option>
              <option value="12">Dezembro</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-zinc-50 px-3 py-1.5 border border-zinc-200 font-bold">
            <select 
              value={ano} 
              onChange={e => setAno(e.target.value)} 
              className="bg-transparent text-xs font-bold text-[#003366] focus:outline-none"
            >
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
            </select>
          </div>

          <button onClick={() => window.print()} className="p-2.5 bg-[#003366] hover:bg-[#002244] text-white shadow-md transition-all">
            <Printer size={16} />
          </button>
        </div>
      </div>

      {/* Main Stats Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-zinc-200 p-6 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Total Faturado (Vendas)</p>
            <p className="text-xl font-bold text-[#003366]">{formatCurrency(totalSales)}</p>
            <p className="text-[9px] text-zinc-400 uppercase mt-1">Registos: {filteredInvoices.length} faturas</p>
          </div>
          <div className="w-10 h-10 bg-blue-50 text-blue-600 flex items-center justify-center">
            <ArrowUpRight size={20} />
          </div>
        </div>

        <div className="bg-white border border-zinc-200 p-6 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Total Compras (Despesas)</p>
            <p className="text-xl font-bold text-zinc-800">{formatCurrency(totalPurchases)}</p>
            <p className="text-[9px] text-zinc-400 uppercase mt-1">Registos: {filteredPurchases.length} compras</p>
          </div>
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ArrowDownRight size={20} />
          </div>
        </div>

        <div className="bg-white border border-zinc-200 p-6 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">IVA Líquido do Período</p>
            <p className={`text-xl font-bold ${netVat > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {formatCurrency(Math.abs(netVat))}
            </p>
            <p className="text-[9px] text-zinc-500 uppercase mt-1">
              {netVat > 0 ? 'A entregar ao Estado' : 'A recuperar (Crédito)'}
            </p>
          </div>
          <div className={`w-10 h-10 flex items-center justify-center ${netVat > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
            <TrendingUp size={20} />
          </div>
        </div>

        <div className="bg-white border border-zinc-200 p-6 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Total de Impostos a Pagar</p>
            <p className="text-xl font-bold text-[#003366]">{formatCurrency(netTaxToPay > 0 ? netTaxToPay : 0)}</p>
            <p className="text-[9px] text-zinc-500 uppercase mt-1">Consolidação das Guias</p>
          </div>
          <div className="w-10 h-10 bg-zinc-50 text-[#003366] flex items-center justify-center">
            <Landmark size={20} />
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-zinc-200 bg-white">
        <button 
          onClick={() => setActiveTab('resumo')}
          className={`px-6 py-4 text-xs font-bold uppercase tracking-widest flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'resumo' 
              ? 'text-[#003366] border-[#003366] bg-zinc-50/50' 
              : 'text-zinc-400 border-transparent hover:text-zinc-600'
          }`}
        >
          <Calculator size={14} />
          Apuramento Geral
        </button>
        <button 
          onClick={() => setActiveTab('vendas')}
          className={`px-6 py-4 text-xs font-bold uppercase tracking-widest flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'vendas' 
              ? 'text-[#003366] border-[#003366] bg-zinc-50/50' 
              : 'text-zinc-400 border-transparent hover:text-zinc-600'
          }`}
        >
          <TrendingUp size={14} />
          Registos de Vendas ({filteredInvoices.length})
        </button>
        <button 
          onClick={() => setActiveTab('compras')}
          className={`px-6 py-4 text-xs font-bold uppercase tracking-widest flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'compras' 
              ? 'text-[#003366] border-[#003366] bg-zinc-50/50' 
              : 'text-zinc-400 border-transparent hover:text-zinc-600'
          }`}
        >
          <ShoppingCart size={14} />
          Registos de Compras ({filteredPurchases.length})
        </button>
      </div>

      {/* Tab Contents */}
      <div className="bg-white border border-zinc-200 shadow-sm p-8">
        
        {/* TAB 1: RESUMO & APURAMENTO GERAL */}
        {activeTab === 'resumo' && (
          <div className="space-y-8">
            
            {/* Header / Identification */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 border-b border-zinc-200 pb-6">
              <div className="lg:col-span-4 space-y-1">
                <h3 className="text-xs font-black text-[#003366] uppercase tracking-wider">Identificação do Contribuinte</h3>
                <div className="p-3 border border-zinc-200 bg-zinc-50 font-bold text-sm text-[#003366] uppercase">
                  {companyData?.name || companyData?.nome_empresa || "ROYAL CARS - PRESTAÇÃO DE SERVIÇOS, LDA"}
                </div>
              </div>

              <div className="lg:col-span-4 space-y-1">
                <h3 className="text-xs font-black text-[#003366] uppercase tracking-wider">Número de Identificação Fiscal</h3>
                <div className="flex border border-zinc-200 bg-zinc-50 divide-x divide-zinc-200">
                  {digits.map((digit, i) => (
                    <div key={i} className="flex-1 h-8 flex items-center justify-center font-mono font-bold text-zinc-700">
                      {digit}
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-4 space-y-1">
                <h3 className="text-xs font-black text-[#003366] uppercase tracking-wider">Período de Referência</h3>
                <div className="p-3 border border-zinc-200 bg-zinc-50 font-mono font-bold text-sm text-center">
                  MÊS DE {new Date(Number(ano), Number(mes) - 1).toLocaleString('pt-PT', { month: 'long' }).toUpperCase()} / {ano}
                </div>
              </div>
            </div>

            {/* Detailed Tax Calculations Section */}
            <div className="space-y-6">
              <h3 className="text-sm font-black text-[#003366] uppercase tracking-widest flex items-center gap-2 border-l-4 border-[#003366] pl-3">
                <Receipt size={16} />
                Apuramento de Impostos do Exercício
              </h3>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                
                {/* IVA Card */}
                <div className="border border-zinc-200 p-6 space-y-4">
                  <h4 className="font-bold text-sm text-[#003366] uppercase tracking-wider flex items-center justify-between border-b border-zinc-100 pb-2">
                    <span>IVA (Imposto sobre o Valor Acrescentado)</span>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5">Taxa de 14%</span>
                  </h4>
                  <div className="space-y-2 text-xs font-bold">
                    <div className="flex justify-between py-1.5 border-b border-dashed border-zinc-100">
                      <span className="text-zinc-500 uppercase">Vendas Tributadas (Base)</span>
                      <span className="font-mono text-zinc-800">{formatCurrency(salesVatBase)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-dashed border-zinc-100 text-red-600">
                      <span className="uppercase font-semibold">IVA Liquidado (a Entregar)</span>
                      <span className="font-mono">{formatCurrency(salesVatAmount)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-dashed border-zinc-100">
                      <span className="text-zinc-500 uppercase">Compras Tributadas (Base)</span>
                      <span className="font-mono text-zinc-800">{formatCurrency(purchasesVatBase)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-dashed border-zinc-100 text-emerald-600">
                      <span className="uppercase font-semibold">IVA Suportado/Dedutível (a Reter)</span>
                      <span className="font-mono">{formatCurrency(purchasesVatAmount)}</span>
                    </div>
                    <div className="flex justify-between pt-3 text-sm font-black border-t border-zinc-200">
                      <span className="text-[#003366] uppercase">Resultado do Período</span>
                      <span className={`font-mono ${netVat > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {netVat > 0 ? `IVA A PAGAR: ${formatCurrency(netVat)}` : `CRÉDITO DE IVA: ${formatCurrency(Math.abs(netVat))}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stamp Tax and Income Tax Advance */}
                <div className="border border-zinc-200 p-6 space-y-4">
                  <h4 className="font-bold text-sm text-[#003366] uppercase tracking-wider border-b border-zinc-100 pb-2">
                    Outros Tributos (Selo e Imposto Industrial)
                  </h4>
                  <div className="space-y-2 text-xs font-bold">
                    <div className="space-y-1">
                      <div className="flex justify-between py-1 border-b border-dashed border-zinc-100">
                        <span className="text-zinc-500 uppercase">Imposto de Selo (Verba 23.3 - 1% sobre Recebimentos)</span>
                        <span className="font-mono text-zinc-800">{formatCurrency(salesStampTax)}</span>
                      </div>
                      <p className="text-[9px] text-zinc-400 font-semibold italic uppercase">Incide sobre recebimentos de faturas-recibo e recibos emitidos no mês</p>
                    </div>

                    <div className="space-y-1 pt-2">
                      <div className="flex justify-between py-1 border-b border-dashed border-zinc-100">
                        <span className="text-zinc-500 uppercase">Imposto por Conta (Industrial - 2% sobre Vendas)</span>
                        <span className="font-mono text-zinc-800">{formatCurrency(advanceIndustrialTax)}</span>
                      </div>
                      <p className="text-[9px] text-zinc-400 font-semibold italic uppercase">Autoliquidação provisória de 2% do volume total de vendas efetuadas</p>
                    </div>
                  </div>
                </div>

                {/* Withholding Taxes (Retenções na Fonte) */}
                <div className="border border-zinc-200 p-6 space-y-4 xl:col-span-2">
                  <h4 className="font-bold text-sm text-[#003366] uppercase tracking-wider flex items-center justify-between border-b border-zinc-100 pb-2">
                    <span>Retenções na Fonte (IRT / Prestação de Serviços)</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-bold">
                    <div className="space-y-2">
                      <div className="flex justify-between py-1.5 border-b border-dashed border-zinc-100">
                        <span className="text-zinc-500 uppercase">Retenções Sofridas nas Vendas (a Dedução)</span>
                        <span className="font-mono text-blue-600">{formatCurrency(salesWithholding)}</span>
                      </div>
                      <p className="text-[9px] text-zinc-400 font-semibold italic uppercase">Valores que os clientes retiveram na fonte e pagaram em nome da empresa</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between py-1.5 border-b border-dashed border-zinc-100">
                        <span className="text-zinc-500 uppercase">Retenções Efetuadas aos Fornecedores (a Pagar)</span>
                        <span className="font-mono text-red-600">{formatCurrency(purchasesWithholding)}</span>
                      </div>
                      <p className="text-[9px] text-zinc-400 font-semibold italic uppercase">Valores retidos aos fornecedores de serviços a entregar ao Estado (AGT)</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Tax Table Summary */}
            <div className="border border-zinc-200 overflow-hidden shadow-sm">
              <div className="bg-[#003366] text-white p-3 text-xs font-bold uppercase tracking-wider">
                Tabela de Impostos do Período
              </div>
              <table className="w-full text-left text-xs uppercase font-bold tracking-tight">
                <thead>
                  <tr className="bg-zinc-100 border-b border-zinc-200 text-zinc-500">
                    <th className="p-3">Imposto</th>
                    <th className="p-3 text-right">Base Tributável</th>
                    <th className="p-3 text-right">Taxa Aplicada</th>
                    <th className="p-3 text-right">Valor do Imposto</th>
                    <th className="p-3 text-right">Tipo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  <tr className="hover:bg-zinc-50">
                    <td className="p-3 font-black text-[#003366]">IVA sobre Vendas (Liquidado)</td>
                    <td className="p-3 text-right font-mono">{formatCurrency(salesVatBase)}</td>
                    <td className="p-3 text-right text-red-600">14%</td>
                    <td className="p-3 text-right font-mono text-red-600">{formatCurrency(salesVatAmount)}</td>
                    <td className="p-3 text-right text-zinc-500 font-black">A Pagar</td>
                  </tr>
                  <tr className="hover:bg-zinc-50">
                    <td className="p-3 font-black text-[#003366]">IVA sobre Compras (Dedutível)</td>
                    <td className="p-3 text-right font-mono">{formatCurrency(purchasesVatBase)}</td>
                    <td className="p-3 text-right text-emerald-600">14%</td>
                    <td className="p-3 text-right font-mono text-emerald-600">{formatCurrency(purchasesVatAmount)}</td>
                    <td className="p-3 text-right text-zinc-500 font-black">A Deduzir</td>
                  </tr>
                  <tr className="hover:bg-zinc-50">
                    <td className="p-3 font-black text-[#003366]">Imposto de Selo (Vendas/Recibos)</td>
                    <td className="p-3 text-right font-mono">{formatCurrency(totalSales)}</td>
                    <td className="p-3 text-right text-[#003366]">1%</td>
                    <td className="p-3 text-right font-mono text-red-600">{formatCurrency(salesStampTax)}</td>
                    <td className="p-3 text-right text-zinc-500 font-black">A Pagar</td>
                  </tr>
                  <tr className="hover:bg-zinc-50">
                    <td className="p-3 font-black text-[#003366]">Retenções na Fonte Sofridas (Clientes)</td>
                    <td className="p-3 text-right font-mono">{formatCurrency(totalSales)}</td>
                    <td className="p-3 text-right text-blue-600">Variável</td>
                    <td className="p-3 text-right font-mono text-blue-600">{formatCurrency(salesWithholding)}</td>
                    <td className="p-3 text-right text-zinc-500 font-black">A Deduzir</td>
                  </tr>
                  <tr className="hover:bg-zinc-50">
                    <td className="p-3 font-black text-[#003366]">Retenções na Fonte Efetuadas (Fornecedores)</td>
                    <td className="p-3 text-right font-mono">{formatCurrency(totalPurchases)}</td>
                    <td className="p-3 text-right text-red-600">Variável</td>
                    <td className="p-3 text-right font-mono text-red-600">{formatCurrency(purchasesWithholding)}</td>
                    <td className="p-3 text-right text-zinc-500 font-black">A Pagar</td>
                  </tr>
                  <tr className="hover:bg-zinc-50">
                    <td className="p-3 font-black text-[#003366]">Imposto Industrial (Autoliquidação)</td>
                    <td className="p-3 text-right font-mono">{formatCurrency(totalSales)}</td>
                    <td className="p-3 text-right text-[#003366]">2%</td>
                    <td className="p-3 text-right font-mono text-[#003366]">{formatCurrency(advanceIndustrialTax)}</td>
                    <td className="p-3 text-right text-zinc-500 font-black">Provisório</td>
                  </tr>
                </tbody>
                <tfoot className="bg-zinc-50 border-t-2 border-[#003366] font-black text-sm">
                  <tr>
                    <td colSpan={3} className="p-3 text-right text-[#003366] font-black">SALDO CONTABILÍSTICO A PAGAR (AGT)</td>
                    <td className="p-3 text-right text-red-600 font-mono">{formatCurrency(netTaxToPay > 0 ? netTaxToPay : 0)}</td>
                    <td className="p-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: REGISTO DE VENDAS */}
        {activeTab === 'vendas' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-[#003366] uppercase tracking-widest flex items-center gap-2">
                <TrendingUp size={16} />
                Registo Cronológico de Vendas do Período
              </h3>
              <p className="text-[10px] text-zinc-400 font-bold uppercase">Volume de Vendas: {formatCurrency(totalSales)}</p>
            </div>

            <div className="overflow-x-auto border border-zinc-200 bg-white">
              <table className="w-full text-left text-[9px] border-collapse font-bold uppercase tracking-tight">
                <thead>
                  <tr className="bg-zinc-50 text-zinc-500 border-b border-zinc-200">
                    <th className="p-3 border-r border-zinc-200">Data</th>
                    <th className="p-3 border-r border-zinc-200">Número do Doc</th>
                    <th className="p-3 border-r border-zinc-200">Cliente</th>
                    <th className="p-3 border-r border-zinc-200">NIF</th>
                    <th className="p-3 border-r border-zinc-200">Tipo Doc</th>
                    <th className="p-3 border-r border-zinc-200 text-right">Base Tributável</th>
                    <th className="p-3 border-r border-zinc-200 text-right">Taxa IVA</th>
                    <th className="p-3 border-r border-zinc-200 text-right">IVA Liquidado</th>
                    <th className="p-3 border-r border-zinc-200 text-right">Retenção</th>
                    <th className="p-3 border-r border-zinc-200 text-right">Imp. Selo</th>
                    <th className="p-3 text-right">Total Doc</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredInvoices.map((inv, idx) => {
                    const items = inv.items || [];
                    const baseVal = items.length > 0 
                      ? items.reduce((s, i) => s + (Number(i.quantity) * Number(i.unit_price)), 0)
                      : (Number(inv.total || 0) / 1.14);
                    const vatVal = Number(inv.total || 0) - baseVal;
                    const docTypeSymbol = inv.document_type === 'Fatura' ? 'FT' 
                      : inv.document_type === 'Fatura Recibo' ? 'FR'
                      : inv.document_type === 'Recibo' ? 'RC' : 'FT';
                    
                    const isStampActive = inv.document_type === 'Fatura Recibo' || inv.document_type === 'Recibo';
                    const stampTaxVal = isStampActive ? (Number(inv.total || 0) * 0.01) : 0;

                    return (
                      <tr key={idx} className="hover:bg-zinc-50 font-medium">
                        <td className="p-3 border-r border-zinc-100 text-zinc-500 font-mono">{inv.date}</td>
                        <td className="p-3 border-r border-zinc-100 font-mono text-[#003366] font-bold">{inv.invoice_number}</td>
                        <td className="p-3 border-r border-zinc-100 text-zinc-800 max-w-[150px] truncate">{inv.client_name}</td>
                        <td className="p-3 border-r border-zinc-100 font-mono text-zinc-600">{inv.client_nif || '999999999'}</td>
                        <td className="p-3 border-r border-zinc-100 text-center font-bold text-xs">{docTypeSymbol}</td>
                        <td className="p-3 border-r border-zinc-100 text-right font-mono">{formatCurrency(baseVal)}</td>
                        <td className="p-3 border-r border-zinc-100 text-center text-red-600">14%</td>
                        <td className="p-3 border-r border-zinc-100 text-right font-mono text-red-600">{formatCurrency(vatVal)}</td>
                        <td className="p-3 border-r border-zinc-100 text-right font-mono text-blue-600">{formatCurrency(inv.retencao_fonte_total || 0)}</td>
                        <td className="p-3 border-r border-zinc-100 text-right font-mono text-zinc-500">{formatCurrency(stampTaxVal)}</td>
                        <td className="p-3 text-right font-mono font-black text-[#003366]">{formatCurrency(inv.total)}</td>
                      </tr>
                    );
                  })}
                  {filteredInvoices.length === 0 && (
                    <tr>
                      <td colSpan={11} className="py-16 text-center text-zinc-300 italic uppercase font-bold">
                        Nenhum registo de venda encontrado para o período selecionado
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-zinc-50 border-t-2 border-[#003366] font-black">
                  <tr>
                    <td colSpan={5} className="p-3 text-right text-[#003366] uppercase">Valores Totais</td>
                    <td className="p-3 text-right border-r border-zinc-200 font-mono">{formatCurrency(salesVatBase)}</td>
                    <td className="p-3 border-r border-zinc-200"></td>
                    <td className="p-3 text-right border-r border-zinc-200 font-mono text-red-600">{formatCurrency(salesVatAmount)}</td>
                    <td className="p-3 text-right border-r border-zinc-200 font-mono text-blue-600">{formatCurrency(salesWithholding)}</td>
                    <td className="p-3 text-right border-r border-zinc-200 font-mono text-zinc-500">{formatCurrency(salesStampTax)}</td>
                    <td className="p-3 text-right font-mono text-[#003366]">{formatCurrency(totalSales)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: REGISTO DE COMPRAS */}
        {activeTab === 'compras' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-[#003366] uppercase tracking-widest flex items-center gap-2">
                <ShoppingCart size={16} />
                Registo Cronológico de Compras do Período
              </h3>
              <p className="text-[10px] text-zinc-400 font-bold uppercase">Volume de Compras: {formatCurrency(totalPurchases)}</p>
            </div>

            <div className="overflow-x-auto border border-zinc-200 bg-white">
              <table className="w-full text-left text-[9px] border-collapse font-bold uppercase tracking-tight">
                <thead>
                  <tr className="bg-zinc-50 text-zinc-500 border-b border-zinc-200">
                    <th className="p-3 border-r border-zinc-200">Data</th>
                    <th className="p-3 border-r border-zinc-200">Número do Doc</th>
                    <th className="p-3 border-r border-zinc-200">Fornecedor</th>
                    <th className="p-3 border-r border-zinc-200">NIF</th>
                    <th className="p-3 border-r border-zinc-200">Tipo Doc</th>
                    <th className="p-3 border-r border-zinc-200 text-right">Base Tributável</th>
                    <th className="p-3 border-r border-zinc-200 text-right">Taxa IVA</th>
                    <th className="p-3 border-r border-zinc-200 text-right">IVA Suportado</th>
                    <th className="p-3 border-r border-zinc-200 text-right">Retenção Efetuada</th>
                    <th className="p-3 text-right">Total Doc</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredPurchases.map((p, idx) => {
                    const items = p.items || [];
                    const baseVal = items.length > 0 
                      ? items.reduce((s, i) => s + (Number(i.quantity) * Number(i.unit_price)), 0)
                      : (Number(p.total || 0) / 1.14);
                    const vatVal = Number(p.total || 0) - baseVal;
                    const docTypeSymbol = p.document_type === 'Fatura' ? 'FT' 
                      : p.document_type === 'Fatura Simplificada' ? 'FS'
                      : p.document_type === 'Recibo de Compra' ? 'RC' : 'FT';
                    
                    const wtVal = Number((p as any).retencao_fonte || (p as any).withholding_total || 0);

                    return (
                      <tr key={idx} className="hover:bg-zinc-50 font-medium">
                        <td className="p-3 border-r border-zinc-100 text-zinc-500 font-mono">{p.date}</td>
                        <td className="p-3 border-r border-zinc-100 font-mono text-zinc-800 font-bold">{p.purchase_number || `COMP-${p.id}`}</td>
                        <td className="p-3 border-r border-zinc-100 text-zinc-800 max-w-[150px] truncate">{p.supplier_name || p.client_name}</td>
                        <td className="p-3 border-r border-zinc-100 font-mono text-zinc-600">{(p as any).supplier_nif || (p as any).nif || '5000608050'}</td>
                        <td className="p-3 border-r border-zinc-100 text-center font-bold text-xs">{docTypeSymbol}</td>
                        <td className="p-3 border-r border-zinc-100 text-right font-mono">{formatCurrency(baseVal)}</td>
                        <td className="p-3 border-r border-zinc-100 text-center text-emerald-600">14%</td>
                        <td className="p-3 border-r border-zinc-100 text-right font-mono text-emerald-600">{formatCurrency(vatVal)}</td>
                        <td className="p-3 border-r border-zinc-100 text-right font-mono text-red-600">{formatCurrency(wtVal)}</td>
                        <td className="p-3 text-right font-mono font-black text-zinc-800">{formatCurrency(p.total)}</td>
                      </tr>
                    );
                  })}
                  {filteredPurchases.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-16 text-center text-zinc-300 italic uppercase font-bold">
                        Nenhum registo de compra encontrado para o período selecionado
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-zinc-50 border-t-2 border-zinc-800 font-black">
                  <tr>
                    <td colSpan={5} className="p-3 text-right text-zinc-800 uppercase">Valores Totais</td>
                    <td className="p-3 text-right border-r border-zinc-200 font-mono">{formatCurrency(purchasesVatBase)}</td>
                    <td className="p-3 border-r border-zinc-200"></td>
                    <td className="p-3 text-right border-r border-zinc-200 font-mono text-emerald-600">{formatCurrency(purchasesVatAmount)}</td>
                    <td className="p-3 text-right border-r border-zinc-200 font-mono text-red-600">{formatCurrency(purchasesWithholding)}</td>
                    <td className="p-3 text-right font-mono text-zinc-800">{formatCurrency(totalPurchases)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default CalculosImpostosForm;
