import React, { useState } from 'react';
import { Invoice, Purchase } from '../types';
import { FileText, Printer, ChevronLeft, Search, Calendar } from 'lucide-react';

const MapaFornecedor = ({ purchases, onBack }: { purchases: Purchase[], onBack: () => void }) => {
  const [mes, setMes] = useState('05');
  
  const formatValue = (val: number) => new Intl.NumberFormat('pt-AO', { minimumFractionDigits: 2 }).format(val);

  return (
    <div className="space-y-6">
      <div className="bg-[#003366] p-4 text-white flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/10 transition-colors">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 className="text-lg font-black uppercase tracking-tighter">03- OPERAÇÕES EFECTUADAS COM FORNECEDORES SUJEITAS A IVA</h2>
            <p className="text-[10px] font-bold opacity-70 uppercase tracking-[0.2em]">Mapa de Fornecedores e Deduções</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 border border-white/20">
              <Calendar size={14} />
              <select value={mes} onChange={e => setMes(e.target.value)} className="bg-transparent text-xs font-bold focus:outline-none">
                 <option value="01">JANEIRO</option>
                 <option value="02">FEVEREIRO</option>
                 <option value="03">MARÇO</option>
                 <option value="04">ABRIL</option>
                 <option value="05">MAIO</option>
                 <option value="06">JUNHO</option>
                 <option value="07">JULHO</option>
                 <option value="08">AGOSTO</option>
                 <option value="09">SETEMBRO</option>
                 <option value="10">OUTUBRO</option>
                 <option value="11">NOVEMBRO</option>
                 <option value="12">DEZEMBRO</option>
              </select>
           </div>
           <button className="bg-white text-[#003366] p-2 rounded-full shadow-xl hover:scale-110 transition-transform">
             <Printer size={18} />
           </button>
        </div>
      </div>

      <div className="border border-zinc-300 overflow-x-auto shadow-2xl bg-white">
        <table className="w-full text-left text-[9px] border-collapse font-bold uppercase">
          <thead>
            <tr className="bg-zinc-50 text-[#003366] border-b-2 border-zinc-200">
              <th className="p-2 border-r border-zinc-200 text-center">No ORDEM</th>
              <th className="p-2 border-r border-zinc-200 text-center">NIF em Angola?</th>
              <th className="p-2 border-r border-zinc-200">NUMERO DE IDENTIFICAÇÃO FISCAL</th>
              <th className="p-2 border-r border-zinc-200">NOME/FIRMA</th>
              <th className="p-2 border-r border-zinc-200 text-center">TIPO DE DOCUMENTO</th>
              <th className="p-2 border-r border-zinc-200 text-center">DATA DO DOCUMENTO</th>
              <th className="p-2 border-r border-zinc-200">NUMERO DO DOCUMENTO</th>
              <th className="p-2 border-r border-zinc-200 text-right">VALOR DA FACTURA</th>
              <th className="p-2 border-r border-zinc-200 text-right">VALOR TRIBUTAVEL</th>
              <th className="p-2 border-r border-zinc-200 text-right">IVA SUPORTADO</th>
              <th colSpan={2} className="p-2 border-r border-zinc-200 text-center bg-blue-50/50">IVA DEDUTIVEL</th>
              <th className="p-2 border-r border-zinc-200 text-right">IVA CATIVO</th>
              <th className="p-2 border-r border-zinc-200 text-center">TIPOLOGIA</th>
              <th className="p-2 border-r border-zinc-200 text-center">Campo Destino no Modelo</th>
              <th className="p-2 text-center">MovID</th>
            </tr>
            <tr className="bg-zinc-100 text-[#003366] border-b-2 border-zinc-200 uppercase">
               <th colSpan={10} className="border-r border-zinc-200"></th>
               <th className="p-1 border-r border-zinc-200 text-center">%</th>
               <th className="p-1 border-r border-zinc-200 text-center">VALOR</th>
               <th colSpan={3} className="border-r border-zinc-200"></th>
               <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {purchases.map((p, i) => {
              const valorTributavel = p.total / 1.14;
              const ivaSuportado = p.total - valorTributavel;
              // Dedução de 7% como pedido
              const ivaDedutivel = p.total * 0.07;

              return (
                <tr key={i} className="hover:bg-zinc-50 transition-colors">
                  <td className="p-2 border-r border-zinc-100 text-center">{i + 1}</td>
                  <td className="p-2 border-r border-zinc-100 text-center">S</td>
                  <td className="p-2 border-r border-zinc-100 font-mono">{(p as any).supplier_nif || (p as any).nif || '5000608050'}</td>
                  <td className="p-2 border-r border-zinc-100 text-zinc-900">{p.supplier_name}</td>
                  <td className="p-2 border-r border-zinc-100 text-center">{p.document_type === 'Fatura' ? 'FT' : 'FR'}</td>
                  <td className="p-2 border-r border-zinc-100 text-center">{p.date}</td>
                  <td className="p-2 border-r border-zinc-100 font-mono">{p.purchase_number || p.invoice_number}</td>
                  <td className="p-2 border-r border-zinc-100 text-right font-mono">{formatValue(p.total)}</td>
                  <td className="p-2 border-r border-zinc-100 text-right font-mono">{formatValue(valorTributavel)}</td>
                  <td className="p-2 border-r border-zinc-100 text-right font-mono text-zinc-600">{formatValue(ivaSuportado)}</td>
                  <td className="p-2 border-r border-zinc-100 text-center">100,00</td>
                  <td className="p-2 border-r border-zinc-100 text-right font-mono text-blue-600">{formatValue(ivaDedutivel)}</td>
                  <td className="p-2 border-r border-zinc-100 text-right">0,00</td>
                  <td className="p-2 border-r border-zinc-100 text-center text-zinc-500">OBC</td>
                  <td className="p-2 border-r border-zinc-100 text-center">20</td>
                  <td className="p-2 text-center text-zinc-400">{30 + i}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-zinc-100 font-black text-zinc-900 border-t-2 border-zinc-300">
            <tr>
              <td colSpan={7} className="p-2 text-right uppercase tracking-[0.2em] font-black text-[#003366]">Total</td>
              <td className="p-2 text-right border-l border-zinc-200 font-mono">{formatValue(purchases.reduce((s, p) => s + (p.total), 0))}</td>
              <td className="p-2 text-right border-l border-zinc-200 font-mono">{formatValue(purchases.reduce((s, p) => s + (p.total / 1.14), 0))}</td>
              <td className="p-2 text-right border-l border-zinc-200 font-mono">{formatValue(purchases.reduce((s, p) => s + (p.total - (p.total / 1.14)), 0))}</td>
              <td className="p-2 border-l border-zinc-200"></td>
              <td className="p-2 text-right border-l border-zinc-200 font-mono text-blue-700">{formatValue(purchases.reduce((s, p) => s + (p.total * 0.07), 0))}</td>
              <td colSpan={4} className="border-l border-zinc-200"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

const RegimeSimplificadoForm = ({ invoices, purchases, companyData }: { invoices: Invoice[], purchases: Purchase[], companyData?: any }) => {
  const [showMapaFornecedor, setShowMapaFornecedor] = useState(false);
  const [ano, setAno] = useState('2025');
  const [mes, setMes] = useState('05');

  const totalSales = (invoices || []).reduce((sum, inv) => sum + inv.total, 0);
  const totalTax = totalSales * 0.07;

  const formatCurrencyValue = (value: number) => {
    return new Intl.NumberFormat('pt-AO', { minimumFractionDigits: 2 }).format(value);
  };

  const nifStr = String(companyData?.nif || "5000922200").trim();
  const digits = Array(19).fill(' ');
  for (let i = 0; i < nifStr.length; i++) {
    digits[19 - nifStr.length + i] = nifStr[i];
  }

  if (showMapaFornecedor) {
    return <MapaFornecedor purchases={purchases} onBack={() => setShowMapaFornecedor(false)} />;
  }

  return (
    <div className="bg-zinc-100 p-8 space-y-4">
      <div className="bg-white border border-zinc-300 shadow-sm overflow-hidden">
        {/* Header 01 */}
        <div className="bg-[#003366] text-white p-1 flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest border-b border-white">
           <div className="bg-white text-[#003366] px-2 py-0.5">01-</div>
           <span>REGIME DO IVA E PERIODO DE DECLARAÇÃO</span>
        </div>
        
        <div className="grid grid-cols-12">
           <div className="col-span-3 border-r border-zinc-200 p-4 space-y-4">
              <div className="space-y-2">
                 <label className="flex items-center gap-3 text-[10px] font-bold group cursor-pointer grayscale opacity-50">
                    <input type="checkbox" className="rounded-none border-zinc-300" />
                    <span>REGIME GERAL</span>
                 </label>
                 <label className="flex items-center gap-3 text-[10px] font-bold group cursor-pointer grayscale opacity-50">
                    <input type="checkbox" className="rounded-none border-zinc-300" />
                    <span>REGIME DE CAIXA</span>
                 </label>
                 <label className="flex items-center gap-3 text-[10px] font-bold group cursor-pointer">
                    <input type="checkbox" checked readOnly className="rounded-none border-zinc-300 accent-blue-600" />
                    <span className="text-blue-600">REGIME SIMPLIFICADO</span>
                 </label>
              </div>
           </div>

           <div className="col-span-4 border-r border-zinc-200 p-4">
              <p className="text-[10px] font-bold text-zinc-400 uppercase mb-2">02- PERIODO DA DECLARAÇÃO</p>
              <div className="flex items-center gap-4">
                 <div className="bg-zinc-50 border border-zinc-200 p-2 text-sm font-mono font-bold flex-1 text-center">
                    DE: 01-{mes}-{ano}
                 </div>
                 <div className="bg-zinc-50 border border-zinc-200 p-2 text-sm font-mono font-bold flex-1 text-center">
                    ATÉ: 31-{mes}-{ano}
                 </div>
              </div>
           </div>

           <div className="col-span-5 p-4">
              <p className="text-[10px] font-bold text-zinc-400 uppercase mb-2">03- NÚMERO DE IDENTIFICAÇÃO FISCAL</p>
              <div className="flex border border-zinc-200 bg-zinc-50 divide-x divide-zinc-200">
                 {digits.map((digit, i) => (
                    <div key={i} className="w-full h-8 flex items-center justify-center font-mono font-bold text-zinc-700">{digit}</div>
                 ))}
              </div>
           </div>
        </div>

        {/* Header 04 */}
        <div className="bg-[#003366] text-white p-1 flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest border-t border-b border-white">
           <div className="bg-white text-[#003366] px-2 py-0.5">04-</div>
           <span>IDENTIFICAÇÃO DO CONTRIBUINTE</span>
        </div>

        <div className="p-4 bg-zinc-50/50">
           <p className="text-[9px] font-bold text-zinc-400 uppercase mb-1">1 - NOME OU DESIGNAÇÃO SOCIAL:</p>
           <p className="text-sm font-black text-[#003366] uppercase tracking-tighter">{companyData?.name || companyData?.nome_empresa || "ROYAL CARS - COMERCIO E PRESTAÇÃO DE SERVIÇOS, LDA"}</p>
        </div>

        {/* Section 06 */}
        <div className="bg-[#003366] text-white p-1 flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest border-t border-b border-white">
           <div className="bg-white text-[#003366] px-2 py-0.5">06-</div>
           <span>SECTOR DE ACTIVIDADE E APURAMENTO DO IMPOSTO DEVIDO</span>
        </div>

        <div className="overflow-hidden">
           <table className="w-full text-left text-[10px] border-collapse font-bold uppercase tracking-tight">
              <thead>
                 <tr className="text-zinc-500 border-b border-zinc-200 text-[9px]">
                    <th className="px-6 py-2"></th>
                    <th className="px-6 py-2 text-right">OPERAÇÕES SUJEITAS</th>
                    <th className="px-6 py-2 text-right">TAXA</th>
                    <th className="px-6 py-2 text-right">IMPOSTO DEVIDO</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                 {[
                    { label: '1º INDÚSTRIA', code: 'INDUSTRIA', tax: '7%', value: 0, taxDue: 0, dueCode: 'INDUSTRIAT' },
                    { label: '2º COMERCIO', code: 'COMERCIO', tax: '7%', value: 0, taxDue: 0, dueCode: 'COMERCIOT' },
                    { label: '3º PRESTAÇÃO DE SERVIÇOS', code: 'SERVICOS', tax: '7%', value: totalSales, taxDue: totalTax, dueCode: 'SERVICOST' },
                    { label: '4º SERVIÇOS CONTRATADOS A PRESTADORES NÃO RESIDENTES', code: 'ESTRANGEIROS', tax: '7%', value: 0, taxDue: 0, dueCode: 'ESTRANGEIROST' },
                    { label: '5º OUTROS', code: 'OUTROS', tax: '7%', value: 0, taxDue: 0, dueCode: 'OUTROST' }
                 ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-zinc-50/50">
                       <td className="px-6 py-3 font-black text-[#003366]">{row.label}</td>
                       <td className="px-6 py-3 text-right">
                          <div className="inline-block min-w-[200px] bg-zinc-50 border-b border-zinc-300 pb-1">{row.code}</div>
                       </td>
                       <td className="px-6 py-3 text-right text-blue-600">{row.tax}</td>
                       <td className="px-6 py-3 text-right">
                          <div className="inline-block min-w-[200px] bg-zinc-100 border-b border-zinc-400 pb-1 text-zinc-900">{row.value > 0 ? formatCurrencyValue(row.taxDue) : row.dueCode}</div>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>

        {/* Section 07.1 */}
        <div className="bg-[#003366] text-white p-1 flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest border-t border-b border-white">
           <div className="bg-white text-[#003366] px-2 py-0.5">07-</div>
           <span>IVA A PAGAR - REGIME TRANSITÓRIO</span>
        </div>

        <div className="p-6">
           <div className="flex items-center justify-between text-[10px] font-bold mb-4">
              <div className="w-1/2 pr-12 text-[#003366] leading-relaxed uppercase">
                 TOTAL DE RECEBIMENTOS DAS FACTURAS EMITIDAS ENQUANTO O SUJEITO PASSIVO ESTEVE ENQUADRADO NO REGIME TRANSITÓRIO
              </div>
              <div className="flex-1 grid grid-cols-3 gap-6 items-center">
                 <div className="text-center">
                    <p className="text-[8px] text-zinc-400 mb-1">VALOR TRIBUTAVEL</p>
                    <div className="bg-zinc-50 border-b border-zinc-300 py-1 uppercase">TRANSITORIO</div>
                 </div>
                 <div className="text-center text-blue-600">3%</div>
                 <div className="text-right">
                    <p className="text-[8px] text-zinc-400 mb-1 uppercase">IMPOSTO DEVIDO</p>
                    <div className="bg-zinc-100 border-b border-zinc-400 py-1 text-zinc-900 uppercase">TRANSITORIOT</div>
                 </div>
              </div>
           </div>
        </div>

        {/* Section 07.2 */}
        <div className="bg-[#003366] text-white p-1 flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest border-t border-b border-white">
           <div className="bg-white text-[#003366] px-2 py-0.5">07-</div>
           <span>IMPOSTO DEVIDO DAS OPERAÇÕES ISENTAS DE IVA</span>
        </div>

        <div className="p-6">
           <div className="flex items-center justify-between text-[10px] font-bold">
              <div className="w-1/2 pr-12 text-[#003366] leading-relaxed uppercase">
                 Total de Recebimentos de Operações Isentas de IVA
              </div>
              <div className="flex-1 grid grid-cols-3 gap-6 items-center">
                 <div className="text-center">
                    <p className="text-[8px] text-zinc-400 mb-1 uppercase">VALOR TRIBUTAVEL</p>
                    <div className="bg-zinc-50 border-b border-zinc-300 py-1 uppercase">ISENTAS</div>
                 </div>
                 <div className="text-center text-blue-600">7%</div>
                 <div className="text-right">
                    <p className="text-[8px] text-zinc-400 mb-1 uppercase">IMPOSTO SELO DEVIDO</p>
                    <div className="bg-zinc-100 border-b border-zinc-400 py-1 text-zinc-900 uppercase">ISENTAST</div>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button 
          onClick={() => setShowMapaFornecedor(true)}
          className="bg-[#003366] text-white px-8 py-4 text-xs font-black uppercase tracking-[0.2em] shadow-xl hover:bg-[#002244] transition-all flex items-center gap-3 animate-pulse"
        >
          <FileText size={18} /> Aceder ao Mapa Fornecedor
        </button>
      </div>
    </div>
  );
};

export default RegimeSimplificadoForm;

