import React from 'react';
import { Invoice, Purchase } from '../types';

const Modelo7Form = ({ invoices, purchases }: { invoices: Invoice[], purchases: Purchase[] }) => {
  const totalSalesBase = invoices.reduce((acc, inv) => acc + (inv.total || 0), 0);
  const totalSalesTax = 0; // Calculate from items if needed
  
  const totalPurchasesBase = purchases.reduce((acc, p) => acc + (p.total || 0), 0);
  const totalPurchasesTax = 0; // Calculate from items if needed

  const formatValue = (val: number) => new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(val).replace('Kz', '').trim();

  return (
    <div className="bg-white p-4 max-w-5xl mx-auto border border-zinc-300 shadow-sm text-[11px] font-sans">
      {/* Header sections */}
      <div className="grid grid-cols-12 border-2 border-zinc-800 mb-2">
        <div className="col-span-3 border-r-2 border-zinc-800">
          <div className="bg-[#003366] text-white font-bold px-2 py-1">01- REGIME DO IVA</div>
          <div className="p-2 space-y-1">
            <label className="flex items-center gap-2"><input type="checkbox" checked readOnly /> 1 REGIME GERAL</label>
            <label className="flex items-center gap-2"><input type="checkbox" readOnly /> 2 REGIME DE CAIXA</label>
            <label className="flex items-center gap-2"><input type="checkbox" readOnly /> 3 REGIME TRANSITORIO</label>
          </div>
        </div>
        <div className="col-span-5 border-r-2 border-zinc-800">
          <div className="bg-[#003366] text-white font-bold px-2 py-1">02- PERIODO DA DECLARAÇÃO</div>
          <div className="p-2 flex gap-4 items-start">
            <div>
              <span className="block mb-1">Ano:</span>
              <div className="flex border border-zinc-800">
                <div className="w-6 h-6 border-r border-zinc-800 flex items-center justify-center font-bold">2</div>
                <div className="w-6 h-6 border-r border-zinc-800 flex items-center justify-center font-bold">0</div>
                <div className="w-6 h-6 border-r border-zinc-800 flex items-center justify-center font-bold">2</div>
                <div className="w-6 h-6 flex items-center justify-center font-bold">6</div>
              </div>
            </div>
            <div>
              <span className="block mb-1">Mês:</span>
              <div className="flex border border-zinc-800">
                <div className="w-6 h-6 border-r border-zinc-800 flex items-center justify-center font-bold">1</div>
                <div className="w-6 h-6 flex items-center justify-center font-bold">4</div>
              </div>
            </div>
            <div className="flex-1 pt-5">
              <div className="border-b border-zinc-800 text-center font-bold">AGUARDA</div>
              <div className="text-center text-[9px]">(Mês por extenso)</div>
            </div>
          </div>
        </div>
        <div className="col-span-4">
          <div className="bg-[#003366] text-white font-bold px-2 py-1">03- NÚMERO DE IDENTIFICAÇÃO FISCAL</div>
          <div className="p-4 flex justify-center">
            <div className="flex border border-zinc-800">
              {Array(14).fill(0).map((_, i) => (
                <div key={i} className="w-5 h-6 border-r border-zinc-800 flex items-center justify-center font-bold last:border-r-0">
                  {[5,0,0,0,5,0,9,3,2,9][i - 4] || ''}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border-2 border-zinc-800 mb-2">
        <div className="bg-[#003366] text-white font-bold px-2 py-1">04- IDENTIFICAÇÃO DO CONTRIBUINTE</div>
        <div className="p-2 flex">
          <span className="w-48">1 - NOME OU DESIGNAÇÃO SOCIAL:</span>
          <span className="font-bold">COGE-FOCUS - PRESTAÇÃO DE SERVIÇOS, LDA</span>
        </div>
      </div>

      <div className="border-2 border-zinc-800">
        <div className="bg-[#003366] text-white font-bold px-2 py-1">9- APURAMENTO DE IMPOSTO REFERENTE AO PERIODO A QUE RESPEITA A DECLARAÇÃO</div>
        
        <div className="p-2">
          <div className="grid grid-cols-12 gap-2 mb-2 font-bold text-center">
            <div className="col-span-6"></div>
            <div className="col-span-2">BASE TRIBUTAVEL</div>
            <div className="col-span-2">IMPOSTO A FAVOR DO SUJEITO PASSIVO</div>
            <div className="col-span-2">IMPOSTO A FAVOR DO ESTADO</div>
          </div>

          <div className="space-y-1">
            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6">1 - Transmissão de bens e de prestação de serviços em que liquidou imposto</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">1</span> <div className="border-b border-zinc-300 flex-1 h-4 text-right font-bold">{formatValue(totalSalesBase)}</div></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">28</span> <div className="border-b border-zinc-300 flex-1 h-4 text-right font-bold">{formatValue(totalPurchasesTax)}</div></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">2</span> <div className="border-b border-zinc-300 flex-1 h-4 text-right font-bold">{formatValue(totalSalesTax)}</div></div>
            </div>
            
            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6">1.1 - Transmissão de bens efectuadas na Provincia de Cabinda em que liquidou o imposto à taxa reduzida</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">1.1</span> <div className="border-b border-zinc-300 flex-1 h-4"></div></div>
              <div className="col-span-2"></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">2.1</span> <div className="border-b border-zinc-300 flex-1 h-4"></div></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6">1.2 - Transmissão de bens e prestações de serviços em que liquidou imposto a taxa reduzida 5%</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">1.2</span> <div className="border-b border-zinc-300 flex-1 h-4"></div></div>
              <div className="col-span-2"></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">2.2</span> <div className="border-b border-zinc-300 flex-1 h-4"></div></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6">1.2 - Transmissão de bens e prestações de serviços em que liquidou imposto a taxa reduzida 7%</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">1.2</span> <div className="border-b border-zinc-300 flex-1 h-4"></div></div>
              <div className="col-span-2"></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">2.3</span> <div className="border-b border-zinc-300 flex-1 h-4"></div></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6">2 - Transmissão de bens e serviços abrangidos pelo regime de caixa (artº 66º do CIVA)</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">3</span> <div className="border-b border-zinc-300 flex-1 h-4 text-right">NA</div></div>
              <div className="col-span-2"></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">4</span> <div className="border-b border-zinc-300 flex-1 h-4 text-right">NA</div></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6">2.1 - Transmissão de bens e serviços abrangidos pelo regime de caixa (artº 66º do CIVA efectuadas na Provincia de Cabinda</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">3.1</span> <div className="border-b border-zinc-300 flex-1 h-4 text-right">NA</div></div>
              <div className="col-span-2"></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">4.1</span> <div className="border-b border-zinc-300 flex-1 h-4 text-right">NA</div></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6">2.2 - Transmissão de bens e prestações de serviços em que liquidou imposto a taxa reduzida abrangidos pelo regime de caixa</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">3.2</span> <div className="border-b border-zinc-300 flex-1 h-4 text-right">NA</div></div>
              <div className="col-span-2"></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">4.2</span> <div className="border-b border-zinc-300 flex-1 h-4 text-right">NA</div></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6">3 - Operações em que o IVA foi cativo pelo declarante (artº21 do CIVA)</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">5</span> <div className="border-b border-zinc-300 flex-1 h-4 text-right">NA</div></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">6</span> <div className="border-b border-zinc-300 flex-1 h-4 text-right">NA</div></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">7</span> <div className="border-b border-zinc-300 flex-1 h-4 text-right">NA</div></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6">4 - Operações em que o IVA foi cativo pelo cliente (artº31 do CIVA)</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">8</span> <div className="border-b border-zinc-300 flex-1 h-4"></div></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">9</span> <div className="border-b border-zinc-300 flex-1 h-4"></div></div>
              <div className="col-span-2"></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-12">5 - Transmissões de bens e prestação de serviços em que não liquidou imposto</div>
            </div>
            
            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6 pl-4">- Isentas com direito à dedução</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">10</span> <div className="border-b border-zinc-300 flex-1 h-4 text-right">0,00</div></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6 pl-4">- Isentas sem direito a dedução (art12º excluindo alínea a) do CIVA</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">11</span> <div className="border-b border-zinc-300 flex-1 h-4"></div></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6 pl-4">- Não Tributadas (artº 10º do CIVA)</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">12</span> <div className="border-b border-zinc-300 flex-1 h-4 text-right">NA</div></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6">9 - Regularizações de Imposto Cativo</div>
              <div className="col-span-2"></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">26</span> <div className="border-b border-zinc-300 flex-1 h-4 text-right">NA</div></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">27</span> <div className="border-b border-zinc-300 flex-1 h-4"></div></div>
            </div>

            <div className="bg-[#003366] text-white font-bold px-2 py-1 mt-4">12 - DESENVOLVIMENTO DO QUADRO 9</div>

            <div className="grid grid-cols-12 gap-2 items-center mt-2">
              <div className="col-span-10">Adiantamento transmissão de bens e prestação de serviços tributadas</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">41</span> <div className="border-b border-zinc-300 flex-1 h-4 text-right">NA</div></div>
            </div>
            
            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-10">Amostras e ofertas para além do limite legal</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">42</span> <div className="border-b border-zinc-300 flex-1 h-4 text-right">NA</div></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-10">Operações sujeitas a tributação da margem</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">43</span> <div className="border-b border-zinc-300 flex-1 h-4 text-right">NA</div></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-10">Operações efectuadas ao abrigo e) e f) do art. 5º e do nº 2 do art. 6º do CIVA</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">44</span> <div className="border-b border-zinc-300 flex-1 h-4 text-right">NA</div></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-12">B - Valores de base tributável inscritos no campo 04</div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-10">Operações destinadas à exportação</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">45</span> <div className="border-b border-zinc-300 flex-1 h-4 text-right">NA</div></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-10">Bens da lista anexa (cesta básica)</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">46</span> <div className="border-b border-zinc-300 flex-1 h-4 text-right">NA</div></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-12">C - Operações abrangidas pelo regime de IVA de caixa</div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-10">Facturas de transmissão de bens e prestação de serviços (valor Facturado)</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">47</span> <div className="border-b border-zinc-300 flex-1 h-4 text-right">NA</div></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-10">Recibos de transmissão de bens e prestação de serviços (valor Recebido)</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">48</span> <div className="border-b border-zinc-300 flex-1 h-4 text-right">NA</div></div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Modelo7Form;
