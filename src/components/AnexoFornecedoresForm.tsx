import React from 'react';
import { Purchase, Supplier } from '../types';

const AnexoFornecedoresForm = ({ purchases, suppliers }: { purchases: Purchase[], suppliers: Supplier[] }) => {
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
        <div className="bg-[#003366] text-white font-bold px-2 py-1">10- APURAMENTO DE IMPOSTO REFERENTE AO PERIODO A QUE RESPEITA A DECLARAÇÃO</div>
        
        <div className="p-2">
          <div className="grid grid-cols-12 gap-2 mb-2 font-bold text-center">
            <div className="col-span-6"></div>
            <div className="col-span-2">BASE TRIBUTAVEL</div>
            <div className="col-span-2">IMPOSTO A FAVOR DO SUJEITO PASSIVO</div>
            <div className="col-span-2">IMPOSTO A FAVOR DO ESTADO</div>
          </div>

          <div className="space-y-1">
            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6">10 - Transmissão de bens e de prestação de serviços em que liquidou imposto</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">13</span> <div className="border-b border-zinc-300 flex-1 h-4 text-right font-bold">{formatValue(totalPurchasesBase)}</div></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">NA</span> <div className="border-b border-zinc-300 flex-1 h-4 text-right">NA</div></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">14</span> <div className="border-b border-zinc-300 flex-1 h-4 text-right font-bold">{formatValue(totalPurchasesTax)}</div></div>
            </div>
            
            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6">10.1 - Transmissão de bens e de prestação de serviços em que liquidou imposto a taxa reduzida</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">13.1</span> <div className="border-b border-zinc-300 flex-1 h-4"></div></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">NA</span> <div className="border-b border-zinc-300 flex-1 h-4 text-right">NA</div></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">14.1</span> <div className="border-b border-zinc-300 flex-1 h-4"></div></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6">11 - Importação de bens</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">15</span> <div className="border-b border-zinc-300 flex-1 h-4"></div></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">NA</span> <div className="border-b border-zinc-300 flex-1 h-4 text-right">NA</div></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">16</span> <div className="border-b border-zinc-300 flex-1 h-4"></div></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6">12 - Importação de bens a taxa reduzida 5%</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">15.1</span> <div className="border-b border-zinc-300 flex-1 h-4"></div></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">NA</span> <div className="border-b border-zinc-300 flex-1 h-4 text-right">NA</div></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">16.1</span> <div className="border-b border-zinc-300 flex-1 h-4"></div></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6">12 - Importação de bens a taxa reduzida 7%</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">15.2</span> <div className="border-b border-zinc-300 flex-1 h-4"></div></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">NA</span> <div className="border-b border-zinc-300 flex-1 h-4 text-right">NA</div></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">16.2</span> <div className="border-b border-zinc-300 flex-1 h-4"></div></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6">13 - Transmissão de bens e prestações de serviços abrangidos pelo regime de caixa (artº 66º do CIVA)</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">17</span> <div className="border-b border-zinc-300 flex-1 h-4"></div></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">NA</span> <div className="border-b border-zinc-300 flex-1 h-4 text-right">NA</div></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">18</span> <div className="border-b border-zinc-300 flex-1 h-4"></div></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6">13.1 - Transmissão de bens e prestações de serviços abrangidos pelo regime de caixa a taxa reduzida</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">17.1</span> <div className="border-b border-zinc-300 flex-1 h-4"></div></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">NA</span> <div className="border-b border-zinc-300 flex-1 h-4 text-right">NA</div></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">18.1</span> <div className="border-b border-zinc-300 flex-1 h-4"></div></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6">14 - Operações em que o IVA foi cativo pelo declarante (artº21 do CIVA)</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">19</span> <div className="border-b border-zinc-300 flex-1 h-4"></div></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">NA</span> <div className="border-b border-zinc-300 flex-1 h-4 text-right">NA</div></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">20</span> <div className="border-b border-zinc-300 flex-1 h-4"></div></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6">15 - Operações em que o IVA foi cativo pelo cliente (artº31 do CIVA)</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">21</span> <div className="border-b border-zinc-300 flex-1 h-4"></div></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">22</span> <div className="border-b border-zinc-300 flex-1 h-4"></div></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">NA</span> <div className="border-b border-zinc-300 flex-1 h-4 text-right">NA</div></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6">16 - Regularizações a favor do sujeito passivo</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">NA</span> <div className="border-b border-zinc-300 flex-1 h-4 text-right">NA</div></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">23</span> <div className="border-b border-zinc-300 flex-1 h-4"></div></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">NA</span> <div className="border-b border-zinc-300 flex-1 h-4 text-right">NA</div></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6">17 - Regularizações a favor do Estado</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">NA</span> <div className="border-b border-zinc-300 flex-1 h-4 text-right">NA</div></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">NA</span> <div className="border-b border-zinc-300 flex-1 h-4 text-right">NA</div></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">24</span> <div className="border-b border-zinc-300 flex-1 h-4"></div></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6">18 - Excesso a reportar do período anterior</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">NA</span> <div className="border-b border-zinc-300 flex-1 h-4 text-right">NA</div></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">25</span> <div className="border-b border-zinc-300 flex-1 h-4"></div></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">NA</span> <div className="border-b border-zinc-300 flex-1 h-4 text-right">NA</div></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6">19 - Total do imposto a favor do sujeito passivo</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">NA</span> <div className="border-b border-zinc-300 flex-1 h-4 text-right">NA</div></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">29</span> <div className="border-b border-zinc-300 flex-1 h-4"></div></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">NA</span> <div className="border-b border-zinc-300 flex-1 h-4 text-right">NA</div></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6">20 - Total do imposto a favor do Estado</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">NA</span> <div className="border-b border-zinc-300 flex-1 h-4 text-right">NA</div></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">NA</span> <div className="border-b border-zinc-300 flex-1 h-4 text-right">NA</div></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">30</span> <div className="border-b border-zinc-300 flex-1 h-4"></div></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6">21 - Imposto a Entregar ao Estado</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">NA</span> <div className="border-b border-zinc-300 flex-1 h-4 text-right">NA</div></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">NA</span> <div className="border-b border-zinc-300 flex-1 h-4 text-right">NA</div></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">31</span> <div className="border-b border-zinc-300 flex-1 h-4"></div></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6">22 - Excesso a reportar para o período seguinte</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">NA</span> <div className="border-b border-zinc-300 flex-1 h-4 text-right">NA</div></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">32</span> <div className="border-b border-zinc-300 flex-1 h-4"></div></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">NA</span> <div className="border-b border-zinc-300 flex-1 h-4 text-right">NA</div></div>
            </div>

            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6">23 - Pedido de Reembolso</div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">NA</span> <div className="border-b border-zinc-300 flex-1 h-4 text-right">NA</div></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">33</span> <div className="border-b border-zinc-300 flex-1 h-4"></div></div>
              <div className="col-span-2 flex items-center gap-1"><span className="bg-[#003366] text-white px-1">NA</span> <div className="border-b border-zinc-300 flex-1 h-4 text-right">NA</div></div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default AnexoFornecedoresForm;
