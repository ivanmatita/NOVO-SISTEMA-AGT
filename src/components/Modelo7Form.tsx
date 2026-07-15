import React, { useState, useEffect } from 'react';
import { Invoice, Purchase } from '../types';

interface Modelo7FormProps {
  invoices: Invoice[];
  purchases: Purchase[];
  companyData?: any;
  selectedYear?: string;
  selectedMonth?: string;
}

const Modelo7Form = ({ invoices, purchases, companyData, selectedYear, selectedMonth }: Modelo7FormProps) => {
  const [ano, setAno] = useState(selectedYear || '2025');
  const [mes, setMes] = useState(selectedMonth || '05');

  useEffect(() => {
    if (selectedYear) setAno(selectedYear);
    if (selectedMonth) setMes(selectedMonth);
  }, [selectedYear, selectedMonth]);

  const isSelectedPeriod = (dateString: string) => {
    if (!dateString) return false;
    const parts = dateString.split('-');
    if (parts.length < 2) return false;
    return parts[0] === ano && parts[1] === mes;
  };

  const filteredInvoices = (invoices || []).filter(
    (inv) => isSelectedPeriod(inv.date) && inv.status !== 'anulado' && !(inv as any).is_anulado
  );

  const filteredPurchases = (purchases || []).filter(
    (p) => isSelectedPeriod(p.date) && p.status !== 'anulado' && !(p as any).is_anulado
  );

  // Extract VAT from sales total. Since inv.total includes 14% VAT, the base is total - tax.
  const totalSalesTax = filteredInvoices.reduce((acc, inv) => {
    const storedTax = Number(inv.imposto || 0);
    return acc + (storedTax > 0 ? storedTax : Number(inv.total || 0) - (Number(inv.total || 0) / 1.14));
  }, 0);

  const totalSalesBase = filteredInvoices.reduce((acc, inv) => {
    const total = Number(inv.total || 0);
    const tax = Number(inv.imposto || 0) || (total - (total / 1.14));
    return acc + (total - tax);
  }, 0);

  // Extract VAT from purchases. Derive deductible VAT from purchase items or fall back to 14% division.
  const totalPurchasesTax = filteredPurchases.reduce((acc, p) => {
    const items: any[] = Array.isArray(p.items) ? p.items : [];
    if (items.length > 0) {
      return acc + items.reduce((s: number, item: any) => {
        const rate = Number(item.tax_rate ?? item.taxa ?? 14);
        return s + (Number(item.total || 0) * rate / 100);
      }, 0);
    }
    const total = Number(p.total || 0);
    return acc + (total - (total / 1.14));
  }, 0);

  const totalPurchasesBase = filteredPurchases.reduce((acc, p) => {
    const total = Number(p.total || 0);
    const items: any[] = Array.isArray(p.items) ? p.items : [];
    let tax = 0;
    if (items.length > 0) {
      tax = items.reduce((s: number, item: any) => {
        const rate = Number(item.tax_rate ?? item.taxa ?? 14);
        return s + (Number(item.total || 0) * rate / 100);
      }, 0);
    } else {
      tax = total - (total / 1.14);
    }
    return acc + (total - tax);
  }, 0);

  const nif = companyData?.nif || '';
  const companyName = companyData?.name || companyData?.nome || '';
  const monthNames = ['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];
  const monthName = monthNames[Number(mes) - 1] || '';

  const formatValue = (val: number) => new Intl.NumberFormat('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

  return (
    <div className="bg-white p-4 max-w-[1550px] w-full mx-auto border border-zinc-300 shadow-sm text-[13px] font-sans">
      {/* Header sections */}
      <div className="grid grid-cols-12 border-2 border-zinc-800 mb-2">
        <div className="col-span-3 border-r-2 border-zinc-800">
          <div className="bg-[#003366] text-white font-bold px-2 py-1">01- REGIME DO IVA</div>
          <div className="p-2 space-y-1">
            <label className="flex items-center gap-2"><input type="checkbox" checked readOnly /> 1 REGIME GERAL</label>
            <label className="flex items-center gap-2"><input type="checkbox" readOnly /> 2 REGIME DE CAIXA</label>
            <label className="flex items-center gap-2"><input type="checkbox" readOnly /> 3 REGIME TRANSITÓRIO</label>
          </div>
        </div>
        <div className="col-span-5 border-r-2 border-zinc-800">
          <div className="bg-[#003366] text-white font-bold px-2 py-1 flex justify-between items-center">
            <span>02- PERÍODO DA DECLARAÇÃO</span>
            {!selectedYear && !selectedMonth && (
              <div className="flex items-center gap-1.5 text-zinc-950 font-sans">
                <select value={mes} onChange={e => setMes(e.target.value)} className="bg-white border border-zinc-300 text-[11px] font-bold p-0.5 uppercase">
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
                <select value={ano} onChange={e => setAno(e.target.value)} className="bg-white border border-zinc-300 text-[11px] font-bold p-0.5">
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                </select>
              </div>
            )}
          </div>
          <div className="p-2 flex gap-4 items-start">
            <div>
              <span className="block mb-1">Ano:</span>
              <div className="flex border border-zinc-800">
                {String(ano).split('').map((d, i) => (
                  <div key={i} className="w-7 h-7 border-r border-zinc-800 flex items-center justify-center font-bold last:border-r-0">{d}</div>
                ))}
              </div>
            </div>
            <div>
              <span className="block mb-1">Mês:</span>
              <div className="flex border border-zinc-800">
                {String(mes).split('').map((d, i) => (
                  <div key={i} className="w-7 h-7 border-r border-zinc-800 flex items-center justify-center font-bold last:border-r-0">{d}</div>
                ))}
              </div>
            </div>
            <div className="flex-1 pt-5">
              <div className="border-b border-zinc-800 text-center font-bold">{monthName}</div>
              <div className="text-center text-[11px]">(Mês por extenso)</div>
            </div>
          </div>
        </div>
        <div className="col-span-4">
          <div className="bg-[#003366] text-white font-bold px-2 py-1">03- NÚMERO DE IDENTIFICAÇÃO FISCAL</div>
          <div className="p-4 flex justify-center">
            <div className="flex border border-zinc-800">
              {Array(14).fill('').map((_, i) => {
                const padded = String(nif).substring(0, 14).padStart(14, ' ');
                return (
                  <div key={i} className="w-6.5 h-7 border-r border-zinc-800 flex items-center justify-center font-bold last:border-r-0">
                    {padded[i] === ' ' ? '' : padded[i]}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="border-2 border-zinc-800 mb-2">
        <div className="bg-[#003366] text-white font-bold px-2 py-1">04- IDENTIFICAÇÃO DO CONTRIBUINTE</div>
        <div className="p-2 flex">
          <span className="w-48">1 - NOME OU DESIGNAÇÃO SOCIAL:</span>
          <span className="font-bold uppercase">{companyName || '—'}</span>
        </div>
      </div>

      <div className="border-2 border-zinc-800">
        <div className="bg-[#003366] text-white font-bold px-2 py-1">09- APURAMENTO DE IMPOSTO REFERENTE AO PERÍODO A QUE RESPEITA A DECLARAÇÃO</div>
        
        <div className="p-2">
          <div className="grid grid-cols-12 gap-2 mb-2 font-bold text-center">
            <div className="col-span-6"></div>
            <div className="col-span-2">BASE TRIBUTÁVEL</div>
            <div className="col-span-2">IMPOSTO A FAVOR DO PASSIVO</div>
            <div className="col-span-2">IMPOSTO A FAVOR DO ESTADO</div>
          </div>

          <div className="space-y-1">
            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6">1 - Transmissão de bens e de prestação de serviços em que liquidou imposto</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">1</span> <div className="border-b border-zinc-300 flex-1 h-5 text-right font-bold">{formatValue(totalSalesBase)}</div></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">28</span> <div className="border-b border-zinc-300 flex-1 h-5 text-right">0,00</div></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">2</span> <div className="border-b border-zinc-300 flex-1 h-5 text-right font-bold">{formatValue(totalSalesTax)}</div></div>
            </div>
            
            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6">1.1 - Transmissão de bens efectuadas na Província de Cabinda em que liquidou o imposto à taxa reduzida</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">1.1</span> <div className="border-b border-zinc-300 flex-1 h-5"></div></div>
              <div className="col-span-2"></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">2.1</span> <div className="border-b border-zinc-300 flex-1 h-5"></div></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6">1.2 - Transmissão de bens e prestações de serviços em que liquidou imposto a taxa reduzida 5%</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">1.2</span> <div className="border-b border-zinc-300 flex-1 h-5"></div></div>
              <div className="col-span-2"></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">2.2</span> <div className="border-b border-zinc-300 flex-1 h-5"></div></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6">1.3 - Transmissão de bens e prestações de serviços em que liquidou imposto a taxa reduzida 7%</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">1.3</span> <div className="border-b border-zinc-300 flex-1 h-5"></div></div>
              <div className="col-span-2"></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">2.3</span> <div className="border-b border-zinc-300 flex-1 h-5"></div></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6">2 - Transmissão de bens e serviços abrangidos pelo regime de caixa (artº 66º do CIVA)</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">3</span> <div className="border-b border-zinc-300 flex-1 h-5 text-right">NA</div></div>
              <div className="col-span-2"></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">4</span> <div className="border-b border-zinc-300 flex-1 h-5 text-right">NA</div></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6">2.1 - Transmissão de bens e serviços abrangidos pelo regime de caixa (artº 66º do CIVA) na Província de Cabinda</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">3.1</span> <div className="border-b border-zinc-300 flex-1 h-5 text-right">NA</div></div>
              <div className="col-span-2"></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">4.1</span> <div className="border-b border-zinc-300 flex-1 h-5 text-right">NA</div></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6">2.2 - Transmissão de bens e prestações de serviços em que liquidou imposto a taxa reduzida abrangidos pelo regime de caixa</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">3.2</span> <div className="border-b border-zinc-300 flex-1 h-5 text-right">NA</div></div>
              <div className="col-span-2"></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">4.2</span> <div className="border-b border-zinc-300 flex-1 h-5 text-right">NA</div></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6">3 - Operações em que o IVA foi cativo pelo declarante (artº 21 do CIVA)</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">5</span> <div className="border-b border-zinc-300 flex-1 h-5 text-right">NA</div></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">6</span> <div className="border-b border-zinc-300 flex-1 h-5 text-right">NA</div></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">7</span> <div className="border-b border-zinc-300 flex-1 h-5 text-right">NA</div></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6">4 - Operações em que o IVA foi cativo pelo cliente (artº 31 do CIVA)</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">8</span> <div className="border-b border-zinc-300 flex-1 h-5"></div></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">9</span> <div className="border-b border-zinc-300 flex-1 h-5"></div></div>
              <div className="col-span-2"></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-12 font-bold text-zinc-700 mt-2">COMPRAS (AQUISIÇÕES DE BENS E SERVIÇOS NO MERCADO NACIONAL)</div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6">15 - Aquisições de existências (bens de consumo) no mercado nacional</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">15</span> <div className="border-b border-zinc-300 flex-1 h-5 text-right font-bold">{formatValue(totalPurchasesBase)}</div></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">16</span> <div className="border-b border-zinc-300 flex-1 h-5 text-right font-bold">{formatValue(totalPurchasesTax)}</div></div>
              <div className="col-span-2"></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6">16 - Aquisições de outros bens e serviços no mercado nacional</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">17</span> <div className="border-b border-zinc-300 flex-1 h-5 text-right">0,00</div></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">18</span> <div className="border-b border-zinc-300 flex-1 h-5 text-right">0,00</div></div>
              <div className="col-span-2"></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6 font-bold">21 - Total do imposto dedutível</div>
              <div className="col-span-2"></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">28</span> <div className="border-b border-zinc-300 flex-1 h-5 text-right font-bold">{formatValue(totalPurchasesTax)}</div></div>
              <div className="col-span-2"></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-12 font-bold text-zinc-700 mt-2">APURAMENTO DO IMPOSTO</div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6">Excesso a reportar do período anterior</div>
              <div className="col-span-2"></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">90</span> <div className="border-b border-zinc-300 flex-1 h-5 text-right">0,00</div></div>
              <div className="col-span-2"></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6 font-bold text-red-700">IMPOSTO A PAGAR AO ESTADO</div>
              <div className="col-span-2"></div>
              <div className="col-span-2"></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">91</span> <div className="border-b border-zinc-300 flex-1 h-5 text-right font-bold text-red-700">{formatValue(totalSalesTax - totalPurchasesTax > 0 ? totalSalesTax - totalPurchasesTax : 0)}</div></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6 font-bold text-emerald-700">IMPOSTO A RECUPERAR / EXCESSO A REPORTAR</div>
              <div className="col-span-2"></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">92</span> <div className="border-b border-zinc-300 flex-1 h-5 text-right font-bold text-emerald-700">{formatValue(totalPurchasesTax - totalSalesTax > 0 ? totalPurchasesTax - totalSalesTax : 0)}</div></div>
              <div className="col-span-2"></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-12 mt-4 font-bold text-zinc-700">5 - Transmissões de bens e prestação de serviços em que não liquidou imposto</div>
            </div>
            
            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6 pl-4">- Isentas com direito à dedução</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">10</span> <div className="border-b border-zinc-300 flex-1 h-5 text-right">0,00</div></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6 pl-4">- Isentas sem direito a dedução (artº 12º excluindo alínea a) do CIVA)</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">11</span> <div className="border-b border-zinc-300 flex-1 h-5"></div></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6 pl-4">- Não Tributadas (artº 10º do CIVA)</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">12</span> <div className="border-b border-zinc-300 flex-1 h-5 text-right">NA</div></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6">9 - Regularizações de Imposto Cativo</div>
              <div className="col-span-2"></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">26</span> <div className="border-b border-zinc-300 flex-1 h-5 text-right">NA</div></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">27</span> <div className="border-b border-zinc-300 flex-1 h-5"></div></div>
            </div>

            <div className="bg-[#003366] text-white font-bold px-2 py-1 mt-4">12 - DESENVOLVIMENTO DO QUADRO 9</div>

            <div className="grid grid-cols-12 gap-2 items-center mt-2">
              <div className="col-span-10">Adiantamento transmissão de bens e prestação de serviços tributadas</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">41</span> <div className="border-b border-zinc-300 flex-1 h-5 text-right">NA</div></div>
            </div>
            
            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-10">Amostras e ofertas para além do limite legal</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">42</span> <div className="border-b border-zinc-300 flex-1 h-5 text-right">NA</div></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-10">Operações sujeitas a tributação da margem</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">43</span> <div className="border-b border-zinc-300 flex-1 h-5 text-right">NA</div></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-10">Operações efectuadas ao abrigo e) e f) do art. 5º e do nº 2 do art. 6º do CIVA</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">44</span> <div className="border-b border-zinc-300 flex-1 h-5 text-right">NA</div></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-12 font-bold text-zinc-700 mt-2">B - Valores de base tributável inscritos no campo 04</div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-10">Operações destinadas à exportação</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">45</span> <div className="border-b border-zinc-300 flex-1 h-5 text-right">NA</div></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-10">Bens da lista anexa (cesta básica)</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">46</span> <div className="border-b border-zinc-300 flex-1 h-5 text-right">NA</div></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-12 font-bold text-zinc-700 mt-2">C - Operações abrangidas pelo regime de IVA de caixa</div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-10">Facturas de transmissão de bens e prestação de serviços (valor Facturado)</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">47</span> <div className="border-b border-zinc-300 flex-1 h-5 text-right">NA</div></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-10">Recibos de transmissão de bens e prestação de serviços (valor Recebido)</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">48</span> <div className="border-b border-zinc-300 flex-1 h-5 text-right">NA</div></div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Modelo7Form;
