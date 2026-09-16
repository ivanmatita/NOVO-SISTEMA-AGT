/**
 * NotasContasModule.tsx
 * Notas Ã  DemonstraÃ§Ã£o de Resultados (Notas 22 a 35) - Layout Oficial Afrogest / AGT
 * Conforme imagens de referÃªncia media_1789594592507.png (PÃ¡ginas 1 a 5)
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText, Printer, Download, RefreshCw, ArrowLeft,
  FileSpreadsheet, ChevronLeft
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface NotasContasModuleProps {
  user?: any;
  companyData?: any;
  fiscalYear?: string;
  onBack?: () => void;
}

export const NotasContasModule: React.FC<NotasContasModuleProps> = ({
  user,
  companyData,
  fiscalYear,
  onBack
}) => {
  const empresaId = companyData?.id || user?.empresa_id || user?.company_id;
  const companyName = companyData?.name || companyData?.nome || user?.company_name || 'IVAN JOSÃ‰ LUCAS MATITA';
  const companyNif = companyData?.nif || user?.company_nif || '004972225NE040';

  const [selectedYear, setSelectedYear] = useState<string>(fiscalYear || String(new Date().getFullYear()));
  const [lancamentosCurr, setLancamentosCurr] = useState<any[]>([]);
  const [lancamentosPrev, setLancamentosPrev] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (fiscalYear) setSelectedYear(fiscalYear);
  }, [fiscalYear]);

  const prevYear = String(Number(selectedYear) - 1);

  const fetchData = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const yearNum = Number(selectedYear);
      const prevYearNum = Number(prevYear);

      const [currRes, prevRes] = await Promise.all([
        supabase
          .from('lancamentos_contabeis')
          .select('*')
          .eq('empresa_id', empresaId)
          .or(`ano.eq.${yearNum},data_lancamento.gte.${yearNum}-01-01T00:00:00,data_lancamento.lte.${yearNum}-12-31T23:59:59`),
        supabase
          .from('lancamentos_contabeis')
          .select('*')
          .eq('empresa_id', empresaId)
          .or(`ano.eq.${prevYearNum},data_lancamento.gte.${prevYearNum}-01-01T00:00:00,data_lancamento.lte.${prevYearNum}-12-31T23:59:59`)
      ]);

      setLancamentosCurr(Array.isArray(currRes.data) ? currRes.data : []);
      setLancamentosPrev(Array.isArray(prevRes.data) ? prevRes.data : []);
    } catch (e) {
      console.error('[NotasContas] Erro ao carregar dados:', e);
    } finally {
      setLoading(false);
    }
  }, [empresaId, selectedYear, prevYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Helpers de somatÃ³rio por prefixo de conta
  const getCredit = (data: any[], prefixes: string[]) => {
    return data
      .filter(l => prefixes.some(p => (l.conta_pgc || '').startsWith(p)))
      .reduce((sum, l) => {
        const v = Number(l.valor || 0);
        const deb = Number(l.debito) > 0 ? Number(l.debito) : (l.tipo_movimento === 'DEBITO' || l.tipo_movimento === 'D' ? v : 0);
        const cred = Number(l.credito) > 0 ? Number(l.credito) : (l.tipo_movimento === 'CREDITO' || l.tipo_movimento === 'C' ? v : 0);
        return sum + cred - deb;
      }, 0);
  };

  const getDebit = (data: any[], prefixes: string[]) => {
    return data
      .filter(l => prefixes.some(p => (l.conta_pgc || '').startsWith(p)))
      .reduce((sum, l) => {
        const v = Number(l.valor || 0);
        const deb = Number(l.debito) > 0 ? Number(l.debito) : (l.tipo_movimento === 'DEBITO' || l.tipo_movimento === 'D' ? v : 0);
        const cred = Number(l.credito) > 0 ? Number(l.credito) : (l.tipo_movimento === 'CREDITO' || l.tipo_movimento === 'C' ? v : 0);
        return sum + deb - cred;
      }, 0);
  };

  // CÃ¡lculo das 14 Notas com base em dados reais
  const calculateNotas = (data: any[]) => {
    // Nota 22 - Vendas
    const vendasMercadoInterno = Math.max(0, getCredit(data, ['61.1']));
    const vendasOutras = Math.max(0, getCredit(data, ['61.2', '61.3', '61.4', '61.8']));
    const vendasTotal = Math.max(0, getCredit(data, ['61']));

    // Nota 23 - PrestaÃ§Ã£o de ServiÃ§os
    const servicosMercadoInterno = Math.max(0, getCredit(data, ['62.1']));
    const servicosMercadoExterno = Math.max(0, getCredit(data, ['62.2']));
    const servicosTotal = Math.max(0, getCredit(data, ['62']));

    // Nota 24 - Outros proveitos operacionais
    const outrosProveitos = Math.max(0, getCredit(data, ['63', '64']));

    // Nota 25 - VariaÃ§Ã£o nos produtos acabados
    const varProdutos = getCredit(data, ['66']);

    // Nota 26 - Trabalhos para a prÃ³pria empresa
    const trabPropria = Math.max(0, getCredit(data, ['65']));

    // Nota 27 - Custos das existÃªncias vendidas e matÃ©rias consumidas
    const custoExistencias = Math.max(0, getDebit(data, ['71']));

    // Nota 28 - Custos com o pessoal
    const remuneracoes = Math.max(0, getDebit(data, ['72.1', '72.2']));
    const pensoes = Math.max(0, getDebit(data, ['72.3']));
    const outrasRemuneracoes = Math.max(0, getDebit(data, ['72.4', '72.5', '72.6', '72.8']));
    const custosPessoalTotal = Math.max(0, getDebit(data, ['72']));

    // Nota 29 - AmortizaÃ§Ãµes
    const amortCorporeas = Math.max(0, getDebit(data, ['73.1']));
    const amortIncorporeas = Math.max(0, getDebit(data, ['73.2']));
    const amortizacoesTotal = Math.max(0, getDebit(data, ['73']));

    // Nota 30 - Outros custos e perdas operacionais
    const fse = Math.max(0, getDebit(data, ['75.1']));
    const conservacao = Math.max(0, getDebit(data, ['75.2']));
    const impostosCustos = Math.max(0, getDebit(data, ['75.3']));
    const outrosCustosTotal = Math.max(0, getDebit(data, ['75']));

    // Nota 31 - Resultados Financeiros
    const jurosProveitos = Math.max(0, getCredit(data, ['68.1']));
    const diferencasCambioFav = Math.max(0, getCredit(data, ['68.4']));
    const proveitosFinTotal = Math.max(0, getCredit(data, ['68']));
    const jurosCustos = Math.max(0, getDebit(data, ['78.1']));
    const diferencasCambioDesfav = Math.max(0, getDebit(data, ['78.4']));
    const custosFinTotal = Math.max(0, getDebit(data, ['78']));
    const resultadosFinTotal = proveitosFinTotal - custosFinTotal;

    // Nota 32 - Resultados de Filiais
    const filiaisTotal = getCredit(data, ['67']) - getDebit(data, ['77']);

    // Nota 33 - Resultados NÃ£o Operacionais
    const proveitosNaoOp = Math.max(0, getCredit(data, ['69']));
    const custosNaoOp = Math.max(0, getDebit(data, ['79']));
    const resultadosNaoOpTotal = proveitosNaoOp - custosNaoOp;

    // Nota 34 - Resultados ExtraordinÃ¡rios
    const extraTotal = getCredit(data, ['68.9']) - getDebit(data, ['78.9']);

    // Nota 35 - Imposto sobre o Rendimento
    const resultadoContabilistico = (vendasTotal + servicosTotal + outrosProveitos + varProdutos + trabPropria) -
      (custoExistencias + custosPessoalTotal + amortizacoesTotal + outrosCustosTotal) +
      resultadosFinTotal + filiaisTotal + resultadosNaoOpTotal + extraTotal;
    const lucroTributavel = Math.max(0, resultadoContabilistico);
    const impostoEstimado = Math.max(0, getDebit(data, ['87']));

    return {
      vendasMercadoInterno,
      vendasOutras,
      vendasTotal,
      servicosMercadoInterno,
      servicosMercadoExterno,
      servicosTotal,
      outrosProveitos,
      varProdutos,
      trabPropria,
      custoExistencias,
      remuneracoes,
      pensoes,
      outrasRemuneracoes,
      custosPessoalTotal,
      amortCorporeas,
      amortIncorporeas,
      amortizacoesTotal,
      fse,
      conservacao,
      impostosCustos,
      outrosCustosTotal,
      jurosProveitos,
      diferencasCambioFav,
      proveitosFinTotal,
      jurosCustos,
      diferencasCambioDesfav,
      custosFinTotal,
      resultadosFinTotal,
      filiaisTotal,
      proveitosNaoOp,
      custosNaoOp,
      resultadosNaoOpTotal,
      extraTotal,
      resultadoContabilistico,
      lucroTributavel,
      impostoEstimado
    };
  };

  const curr = useMemo(() => calculateNotas(lancamentosCurr), [lancamentosCurr]);
  const prev = useMemo(() => calculateNotas(lancamentosPrev), [lancamentosPrev]);

  const fmt = (v: number) => {
    return v.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const PageHeader = () => (
    <div className="border-b-2 border-blue-900 pb-3 mb-4">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="border border-zinc-400 px-3 py-1 text-center bg-zinc-50">
            <div className="text-[10px] font-black text-zinc-800 uppercase">V.1</div>
            <div className="text-[8px] font-bold text-zinc-500 uppercase">AFROGEST</div>
          </div>
          <div>
            <h2 className="text-xs font-black text-blue-950 uppercase tracking-wider">NOTAS Ã€</h2>
            <h1 className="text-xs font-black text-blue-950 uppercase tracking-wider">DEMONSTRAÃ‡ÃƒO DE RESULTADOS</h1>
          </div>
        </div>
        <div className="border border-zinc-400 px-4 py-1.5 text-center bg-zinc-50">
          <div className="text-[9px] font-bold text-zinc-500 uppercase">EXERCÃCIO</div>
          <div className="text-sm font-black text-blue-950 font-mono">{selectedYear}</div>
        </div>
      </div>
      <div className="flex justify-between items-end mt-3 text-[10px]">
        <div>
          <span className="font-bold text-zinc-700">Empresa: </span>
          <span className="font-black text-zinc-900 uppercase">{companyName}</span>
          <div className="font-bold text-zinc-700">NIF: <span className="font-mono">{companyNif}</span></div>
        </div>
        <div className="text-zinc-500 italic">Valores expressos em kwanzas</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-100 print:bg-white text-zinc-900 font-sans">
      {/* Ribbon Toolbar */}
      <div className="bg-white border-b border-zinc-200 px-6 py-2.5 flex items-center justify-between print:hidden shadow-sm">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="flex items-center gap-1 p-1.5 px-3 hover:bg-zinc-100 text-zinc-700 border border-zinc-300 font-bold text-xs uppercase transition-all" title="Voltar Ã  DemonstraÃ§Ã£o de Resultados">
              <ChevronLeft size={16} />
              <span>Voltar</span>
            </button>
          )}
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-[#003366]" />
            <span className="text-xs font-black text-[#003366] uppercase tracking-wider">
              Notas Ã  DemonstraÃ§Ã£o de Resultados
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => window.print()} className="flex items-center gap-1.5 bg-[#003366] hover:bg-[#002244] text-white px-4 py-1.5 text-xs font-black uppercase tracking-wider shadow transition-all">
            <Printer size={14} /> Imprimir RelatÃ³rio
          </button>
          <div className="flex items-center bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-full text-emerald-800 font-black text-xs shadow-sm ml-2">
            <RefreshCw size={12} className="mr-1.5 cursor-pointer hover:rotate-180 transition-transform" onClick={fetchData} />
            <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="bg-transparent font-black focus:outline-none cursor-pointer text-xs">
              {[2023, 2024, 2025, 2026, 2027, 2028].map(y => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Caderno de Notas */}
      <div className="max-w-5xl mx-auto p-6 space-y-8">
        
        {/* ================= PÃGINA 1 ================= */}
        <div className="bg-white border border-zinc-300 shadow-md p-8 print:p-0 print:border-none print:shadow-none space-y-6">
          <PageHeader />

          {/* Nota 22 - Vendas */}
          <div className="space-y-2">
            <h3 className="text-xs font-black text-blue-950 uppercase border-b border-blue-900 pb-1 italic">
              Nota 22 - Vendas
            </h3>
            <div className="text-[10px] font-bold text-zinc-700 italic">Nota 22.1 - ComposiÃ§Ã£o das vendas por mercados</div>
            <table className="w-full border-collapse border border-zinc-400 text-[10px]">
              <thead>
                <tr className="bg-zinc-100 text-left border-b border-zinc-400 font-bold">
                  <th className="border-r border-zinc-400 px-2 py-1">Rubricas</th>
                  <th className="border-r border-zinc-400 px-2 py-1 text-right w-28 font-mono">{selectedYear}</th>
                  <th className="px-2 py-1 text-right w-28 font-mono text-zinc-600">{prevYear}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border-r border-zinc-300 px-2 py-0.5 font-bold">Mercado Interno:</td>
                  <td className="border-r border-zinc-300 px-2 py-0.5 text-right font-mono">0,00</td>
                  <td className="px-2 py-0.5 text-right font-mono text-zinc-500">0,00</td>
                </tr>
                <tr>
                  <td className="border-r border-zinc-300 px-4 py-0.5">Vendas</td>
                  <td className="border-r border-zinc-300 px-2 py-0.5 text-right font-mono font-bold">{fmt(curr.vendasTotal)}</td>
                  <td className="px-2 py-0.5 text-right font-mono text-zinc-500">{fmt(prev.vendasTotal)}</td>
                </tr>
                <tr>
                  <td className="border-r border-zinc-300 px-4 py-0.5">SubsÃ­dios a preÃ§os</td>
                  <td className="border-r border-zinc-300 px-2 py-0.5 text-right font-mono">0,00</td>
                  <td className="px-2 py-0.5 text-right font-mono text-zinc-500">0,00</td>
                </tr>
                <tr>
                  <td className="border-r border-zinc-300 px-2 py-0.5 font-bold">Mercado externo</td>
                  <td className="border-r border-zinc-300 px-2 py-0.5 text-right font-mono">0,00</td>
                  <td className="px-2 py-0.5 text-right font-mono text-zinc-500">0,00</td>
                </tr>
                <tr className="bg-zinc-50 font-bold border-t border-zinc-400">
                  <td className="border-r border-zinc-300 px-2 py-1 uppercase">Totais</td>
                  <td className="border-r border-zinc-300 px-2 py-1 text-right font-mono text-blue-950">{fmt(curr.vendasTotal)}</td>
                  <td className="px-2 py-1 text-right font-mono text-zinc-600">{fmt(prev.vendasTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Nota 23 - PrestaÃ§Ã£o de ServiÃ§os */}
          <div className="space-y-2">
            <h3 className="text-xs font-black text-blue-950 uppercase border-b border-blue-900 pb-1 italic">
              Nota 23 - PrestaÃ§Ã£o de ServiÃ§os
            </h3>
            <div className="text-[10px] font-bold text-zinc-700 italic">NOTAS 23.1 â€” ComposiÃ§Ã£o das prestaÃ§Ãµes de serviÃ§o por mercados</div>
            <table className="w-full border-collapse border border-zinc-400 text-[10px]">
              <thead>
                <tr className="bg-zinc-100 text-left border-b border-zinc-400 font-bold">
                  <th className="border-r border-zinc-400 px-2 py-1">Rubricas</th>
                  <th className="border-r border-zinc-400 px-2 py-1 text-right w-28 font-mono">{selectedYear}</th>
                  <th className="px-2 py-1 text-right w-28 font-mono text-zinc-600">{prevYear}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border-r border-zinc-300 px-2 py-0.5">Mercado Interno</td>
                  <td className="border-r border-zinc-300 px-2 py-0.5 text-right font-mono font-bold">{fmt(curr.servicosMercadoInterno)}</td>
                  <td className="px-2 py-0.5 text-right font-mono text-zinc-500">{fmt(prev.servicosMercadoInterno)}</td>
                </tr>
                <tr>
                  <td className="border-r border-zinc-300 px-2 py-0.5">Mercado Externo</td>
                  <td className="border-r border-zinc-300 px-2 py-0.5 text-right font-mono font-bold">{fmt(curr.servicosMercadoExterno)}</td>
                  <td className="px-2 py-0.5 text-right font-mono text-zinc-500">{fmt(prev.servicosMercadoExterno)}</td>
                </tr>
                <tr className="bg-zinc-50 font-bold border-t border-zinc-400">
                  <td className="border-r border-zinc-300 px-2 py-1 uppercase">Totais</td>
                  <td className="border-r border-zinc-300 px-2 py-1 text-right font-mono text-blue-950">{fmt(curr.servicosTotal)}</td>
                  <td className="px-2 py-1 text-right font-mono text-zinc-600">{fmt(prev.servicosTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Nota 24 - Outros proveitos operacionais */}
          <div className="space-y-2">
            <h3 className="text-xs font-black text-blue-950 uppercase border-b border-blue-900 pb-1 italic">
              Nota 24 - Outros proveitos operacionais
            </h3>
            <div className="text-[10px] font-bold text-zinc-700 italic">NOTAS 24.1 â€” ComposiÃ§Ã£o</div>
            <table className="w-full border-collapse border border-zinc-400 text-[10px]">
              <thead>
                <tr className="bg-zinc-100 text-left border-b border-zinc-400 font-bold">
                  <th className="border-r border-zinc-400 px-2 py-1">Rubricas</th>
                  <th className="border-r border-zinc-400 px-2 py-1 text-right w-28 font-mono">{selectedYear}</th>
                  <th className="px-2 py-1 text-right w-28 font-mono text-zinc-600">{prevYear}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border-r border-zinc-300 px-2 py-0.5">ServiÃ§os complementares</td>
                  <td className="border-r border-zinc-300 px-2 py-0.5 text-right font-mono">0,00</td>
                  <td className="px-2 py-0.5 text-right font-mono text-zinc-500">0,00</td>
                </tr>
                <tr>
                  <td className="border-r border-zinc-300 px-2 py-0.5">Outros proveitos e ganhos operacionais</td>
                  <td className="border-r border-zinc-300 px-2 py-0.5 text-right font-mono font-bold">{fmt(curr.outrosProveitos)}</td>
                  <td className="px-2 py-0.5 text-right font-mono text-zinc-500">{fmt(prev.outrosProveitos)}</td>
                </tr>
                <tr className="bg-zinc-50 font-bold border-t border-zinc-400">
                  <td className="border-r border-zinc-300 px-2 py-1 uppercase">Totais</td>
                  <td className="border-r border-zinc-300 px-2 py-1 text-right font-mono text-blue-950">{fmt(curr.outrosProveitos)}</td>
                  <td className="px-2 py-1 text-right font-mono text-zinc-600">{fmt(prev.outrosProveitos)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Nota 25 - VariaÃ§Ã£o nos produtos acabados */}
          <div className="space-y-2">
            <h3 className="text-xs font-black text-blue-950 uppercase border-b border-blue-900 pb-1 italic">
              Nota 25 â€“ VariaÃ§Ã£o nos produtos acabados e em vias de fabrico
            </h3>
            <table className="w-full border-collapse border border-zinc-400 text-[10px]">
              <thead>
                <tr className="bg-zinc-100 text-left border-b border-zinc-400 font-bold">
                  <th className="border-r border-zinc-400 px-2 py-1">Rubricas</th>
                  <th className="border-r border-zinc-400 px-2 py-1 text-right w-24">ExistÃªncias Iniciais</th>
                  <th className="border-r border-zinc-400 px-2 py-1 text-right w-24">Ofertas e perdas</th>
                  <th className="border-r border-zinc-400 px-2 py-1 text-right w-24">ExistÃªncias finais</th>
                  <th className="px-2 py-1 text-right w-24 font-mono">VariaÃ§Ã£o no ano</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border-r border-zinc-300 px-2 py-0.5">Produtos acabados e intermÃ©dios</td>
                  <td className="border-r border-zinc-300 px-2 py-0.5 text-right font-mono">0,00</td>
                  <td className="border-r border-zinc-300 px-2 py-0.5 text-right font-mono">0,00</td>
                  <td className="border-r border-zinc-300 px-2 py-0.5 text-right font-mono">0,00</td>
                  <td className="px-2 py-0.5 text-right font-mono font-bold">{fmt(curr.varProdutos)}</td>
                </tr>
                <tr className="bg-zinc-50 font-bold border-t border-zinc-400">
                  <td className="border-r border-zinc-300 px-2 py-1 uppercase">Totais</td>
                  <td className="border-r border-zinc-300 px-2 py-1 text-right font-mono">0,00</td>
                  <td className="border-r border-zinc-300 px-2 py-1 text-right font-mono">0,00</td>
                  <td className="border-r border-zinc-300 px-2 py-1 text-right font-mono">0,00</td>
                  <td className="px-2 py-1 text-right font-mono text-blue-950 font-bold">{fmt(curr.varProdutos)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="text-right text-[9px] text-zinc-400 font-mono italic">Pag 1/5</div>
        </div>

        {/* ================= PÃGINA 2 ================= */}
        <div className="bg-white border border-zinc-300 shadow-md p-8 print:p-0 print:border-none print:shadow-none space-y-6">
          <PageHeader />

          {/* Nota 26 - Trabalhos para a prÃ³pria empresa */}
          <div className="space-y-2">
            <h3 className="text-xs font-black text-blue-950 uppercase border-b border-blue-900 pb-1 italic">
              Nota 26 â€“ Trabalhos para a prÃ³pria empresa
            </h3>
            <table className="w-full border-collapse border border-zinc-400 text-[10px]">
              <thead>
                <tr className="bg-zinc-100 text-left border-b border-zinc-400 font-bold">
                  <th className="border-r border-zinc-400 px-2 py-1">Rubricas</th>
                  <th className="border-r border-zinc-400 px-2 py-1 text-right w-28 font-mono">{selectedYear}</th>
                  <th className="px-2 py-1 text-right w-28 font-mono text-zinc-600">{prevYear}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border-r border-zinc-300 px-2 py-0.5">Trabalhos para imobilizado</td>
                  <td className="border-r border-zinc-300 px-2 py-0.5 text-right font-mono font-bold">{fmt(curr.trabPropria)}</td>
                  <td className="px-2 py-0.5 text-right font-mono text-zinc-500">{fmt(prev.trabPropria)}</td>
                </tr>
                <tr className="bg-zinc-50 font-bold border-t border-zinc-400">
                  <td className="border-r border-zinc-300 px-2 py-1 uppercase">Totais</td>
                  <td className="border-r border-zinc-300 px-2 py-1 text-right font-mono text-blue-950">{fmt(curr.trabPropria)}</td>
                  <td className="px-2 py-1 text-right font-mono text-zinc-600">{fmt(prev.trabPropria)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Nota 27 - Custos das existÃªncias */}
          <div className="space-y-2">
            <h3 className="text-xs font-black text-blue-950 uppercase border-b border-blue-900 pb-1 italic">
              Nota 27 â€“ Custos das existÃªncias vendidas e das matÃ©rias-primas e subsidiÃ¡rias consumidas
            </h3>
            <table className="w-full border-collapse border border-zinc-400 text-[10px]">
              <thead>
                <tr className="bg-zinc-100 text-left border-b border-zinc-400 font-bold">
                  <th className="border-r border-zinc-400 px-2 py-1">Rubricas</th>
                  <th className="border-r border-zinc-400 px-2 py-1 text-right w-28 font-mono">{selectedYear}</th>
                  <th className="px-2 py-1 text-right w-28 font-mono text-zinc-600">{prevYear}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border-r border-zinc-300 px-2 py-0.5">Mercadorias / MatÃ©rias-Primas</td>
                  <td className="border-r border-zinc-300 px-2 py-0.5 text-right font-mono font-bold">{fmt(curr.custoExistencias)}</td>
                  <td className="px-2 py-0.5 text-right font-mono text-zinc-500">{fmt(prev.custoExistencias)}</td>
                </tr>
                <tr className="bg-zinc-50 font-bold border-t border-zinc-400">
                  <td className="border-r border-zinc-300 px-2 py-1 uppercase">Totais</td>
                  <td className="border-r border-zinc-300 px-2 py-1 text-right font-mono text-blue-950">{fmt(curr.custoExistencias)}</td>
                  <td className="px-2 py-1 text-right font-mono text-zinc-600">{fmt(prev.custoExistencias)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Nota 28 - Custos com o pessoal */}
          <div className="space-y-2">
            <h3 className="text-xs font-black text-blue-950 uppercase border-b border-blue-900 pb-1 italic">
              Nota 28 â€“ Custos com o pessoal
            </h3>
            <table className="w-full border-collapse border border-zinc-400 text-[10px]">
              <thead>
                <tr className="bg-zinc-100 text-left border-b border-zinc-400 font-bold">
                  <th className="border-r border-zinc-400 px-2 py-1">Rubricas</th>
                  <th className="border-r border-zinc-400 px-2 py-1 text-right w-28 font-mono">{selectedYear}</th>
                  <th className="px-2 py-1 text-right w-28 font-mono text-zinc-600">{prevYear}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border-r border-zinc-300 px-2 py-0.5">RemuneraÃ§Ãµes dos corpos sociais e pessoal</td>
                  <td className="border-r border-zinc-300 px-2 py-0.5 text-right font-mono font-bold">{fmt(curr.remuneracoes)}</td>
                  <td className="px-2 py-0.5 text-right font-mono text-zinc-500">{fmt(prev.remuneracoes)}</td>
                </tr>
                <tr>
                  <td className="border-r border-zinc-300 px-2 py-0.5">PensÃµes e Encargos Sociais</td>
                  <td className="border-r border-zinc-300 px-2 py-0.5 text-right font-mono">{fmt(curr.pensoes)}</td>
                  <td className="px-2 py-0.5 text-right font-mono text-zinc-500">{fmt(prev.pensoes)}</td>
                </tr>
                <tr className="bg-zinc-50 font-bold border-t border-zinc-400">
                  <td className="border-r border-zinc-300 px-2 py-1 uppercase">Totais</td>
                  <td className="border-r border-zinc-300 px-2 py-1 text-right font-mono text-blue-950">{fmt(curr.custosPessoalTotal)}</td>
                  <td className="px-2 py-1 text-right font-mono text-zinc-600">{fmt(prev.custosPessoalTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Nota 29 - AmortizaÃ§Ãµes */}
          <div className="space-y-2">
            <h3 className="text-xs font-black text-blue-950 uppercase border-b border-blue-900 pb-1 italic">
              Nota 29 â€“ AmortizaÃ§Ãµes
            </h3>
            <table className="w-full border-collapse border border-zinc-400 text-[10px]">
              <thead>
                <tr className="bg-zinc-100 text-left border-b border-zinc-400 font-bold">
                  <th className="border-r border-zinc-400 px-2 py-1">Rubricas</th>
                  <th className="border-r border-zinc-400 px-2 py-1 text-right w-28 font-mono">{selectedYear}</th>
                  <th className="px-2 py-1 text-right w-28 font-mono text-zinc-600">{prevYear}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border-r border-zinc-300 px-2 py-0.5">ImobilizaÃ§Ãµes corpÃ³reas (Nota 4)</td>
                  <td className="border-r border-zinc-300 px-2 py-0.5 text-right font-mono font-bold">{fmt(curr.amortCorporeas)}</td>
                  <td className="px-2 py-0.5 text-right font-mono text-zinc-500">{fmt(prev.amortCorporeas)}</td>
                </tr>
                <tr>
                  <td className="border-r border-zinc-300 px-2 py-0.5">ImobilizaÃ§Ãµes incorpÃ³reas (Nota 5)</td>
                  <td className="border-r border-zinc-300 px-2 py-0.5 text-right font-mono font-bold">{fmt(curr.amortIncorporeas)}</td>
                  <td className="px-2 py-0.5 text-right font-mono text-zinc-500">{fmt(prev.amortIncorporeas)}</td>
                </tr>
                <tr className="bg-zinc-50 font-bold border-t border-zinc-400">
                  <td className="border-r border-zinc-300 px-2 py-1 uppercase">Totais</td>
                  <td className="border-r border-zinc-300 px-2 py-1 text-right font-mono text-blue-950">{fmt(curr.amortizacoesTotal)}</td>
                  <td className="px-2 py-1 text-right font-mono text-zinc-600">{fmt(prev.amortizacoesTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Nota 30 - Outros custos e perdas operacionais */}
          <div className="space-y-2">
            <h3 className="text-xs font-black text-blue-950 uppercase border-b border-blue-900 pb-1 italic">
              Nota 30 â€“ Outros custos e perdas operacionais
            </h3>
            <table className="w-full border-collapse border border-zinc-400 text-[10px]">
              <thead>
                <tr className="bg-zinc-100 text-left border-b border-zinc-400 font-bold">
                  <th className="border-r border-zinc-400 px-2 py-1">Rubricas</th>
                  <th className="border-r border-zinc-400 px-2 py-1 text-right w-28 font-mono">{selectedYear}</th>
                  <th className="px-2 py-1 text-right w-28 font-mono text-zinc-600">{prevYear}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border-r border-zinc-300 px-2 py-0.5">Fornecimentos e serviÃ§os de terceiros</td>
                  <td className="border-r border-zinc-300 px-2 py-0.5 text-right font-mono font-bold">{fmt(curr.fse)}</td>
                  <td className="px-2 py-0.5 text-right font-mono text-zinc-500">{fmt(prev.fse)}</td>
                </tr>
                <tr>
                  <td className="border-r border-zinc-300 px-2 py-0.5">ConservaÃ§Ã£o e reparaÃ§Ã£o</td>
                  <td className="border-r border-zinc-300 px-2 py-0.5 text-right font-mono">{fmt(curr.conservacao)}</td>
                  <td className="px-2 py-0.5 text-right font-mono text-zinc-500">{fmt(prev.conservacao)}</td>
                </tr>
                <tr>
                  <td className="border-r border-zinc-300 px-2 py-0.5">Impostos</td>
                  <td className="border-r border-zinc-300 px-2 py-0.5 text-right font-mono">{fmt(curr.impostosCustos)}</td>
                  <td className="px-2 py-0.5 text-right font-mono text-zinc-500">{fmt(prev.impostosCustos)}</td>
                </tr>
                <tr className="bg-zinc-50 font-bold border-t border-zinc-400">
                  <td className="border-r border-zinc-300 px-2 py-1 uppercase">Totais</td>
                  <td className="border-r border-zinc-300 px-2 py-1 text-right font-mono text-blue-950">{fmt(curr.outrosCustosTotal)}</td>
                  <td className="px-2 py-1 text-right font-mono text-zinc-600">{fmt(prev.outrosCustosTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="text-right text-[9px] text-zinc-400 font-mono italic">Pag 2/5</div>
        </div>

        {/* ================= PÃGINA 3 ================= */}
        <div className="bg-white border border-zinc-300 shadow-md p-8 print:p-0 print:border-none print:shadow-none space-y-6">
          <PageHeader />

          {/* Nota 31 - Resultados Financeiros */}
          <div className="space-y-2">
            <h3 className="text-xs font-black text-blue-950 uppercase border-b border-blue-900 pb-1 italic">
              Nota 31 â€“ Resultados financeiros
            </h3>
            <table className="w-full border-collapse border border-zinc-400 text-[10px]">
              <thead>
                <tr className="bg-zinc-100 text-left border-b border-zinc-400 font-bold">
                  <th className="border-r border-zinc-400 px-2 py-1">Rubricas</th>
                  <th className="border-r border-zinc-400 px-2 py-1 text-right w-28 font-mono">{selectedYear}</th>
                  <th className="px-2 py-1 text-right w-28 font-mono text-zinc-600">{prevYear}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-zinc-50 font-bold">
                  <td colSpan={3} className="px-2 py-0.5 text-blue-950">Proveitos e ganhos financeiros:</td>
                </tr>
                <tr>
                  <td className="border-r border-zinc-300 px-4 py-0.5">Juros e rendimentos de investimentos</td>
                  <td className="border-r border-zinc-300 px-2 py-0.5 text-right font-mono">{fmt(curr.jurosProveitos)}</td>
                  <td className="px-2 py-0.5 text-right font-mono text-zinc-500">{fmt(prev.jurosProveitos)}</td>
                </tr>
                <tr>
                  <td className="border-r border-zinc-300 px-4 py-0.5">DiferenÃ§as de cÃ¢mbio favorÃ¡veis</td>
                  <td className="border-r border-zinc-300 px-2 py-0.5 text-right font-mono">{fmt(curr.diferencasCambioFav)}</td>
                  <td className="px-2 py-0.5 text-right font-mono text-zinc-500">{fmt(prev.diferencasCambioFav)}</td>
                </tr>
                <tr className="bg-zinc-50 font-bold">
                  <td colSpan={3} className="px-2 py-0.5 text-red-950">Custos e perdas financeiras:</td>
                </tr>
                <tr>
                  <td className="border-r border-zinc-300 px-4 py-0.5">Juros e encargos suportados</td>
                  <td className="border-r border-zinc-300 px-2 py-0.5 text-right font-mono">{fmt(curr.jurosCustos)}</td>
                  <td className="px-2 py-0.5 text-right font-mono text-zinc-500">{fmt(prev.jurosCustos)}</td>
                </tr>
                <tr>
                  <td className="border-r border-zinc-300 px-4 py-0.5">DiferenÃ§as de cÃ¢mbio desfavorÃ¡veis</td>
                  <td className="border-r border-zinc-300 px-2 py-0.5 text-right font-mono">{fmt(curr.diferencasCambioDesfav)}</td>
                  <td className="px-2 py-0.5 text-right font-mono text-zinc-500">{fmt(prev.diferencasCambioDesfav)}</td>
                </tr>
                <tr className="bg-zinc-100 font-bold border-t border-zinc-400">
                  <td className="border-r border-zinc-300 px-2 py-1 uppercase">Totais Resultados Financeiros</td>
                  <td className="border-r border-zinc-300 px-2 py-1 text-right font-mono text-blue-950 font-bold">{fmt(curr.resultadosFinTotal)}</td>
                  <td className="px-2 py-1 text-right font-mono text-zinc-600 font-bold">{fmt(prev.resultadosFinTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Nota 32 - Resultados de Filiais e Associadas */}
          <div className="space-y-2">
            <h3 className="text-xs font-black text-blue-950 uppercase border-b border-blue-900 pb-1 italic">
              Nota 32 â€“ Resultados de Filiais e Associadas
            </h3>
            <table className="w-full border-collapse border border-zinc-400 text-[10px]">
              <thead>
                <tr className="bg-zinc-100 text-left border-b border-zinc-400 font-bold">
                  <th className="border-r border-zinc-400 px-2 py-1">Rubricas</th>
                  <th className="border-r border-zinc-400 px-2 py-1 text-right w-28 font-mono">{selectedYear}</th>
                  <th className="px-2 py-1 text-right w-28 font-mono text-zinc-600">{prevYear}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border-r border-zinc-300 px-2 py-0.5">SubsidiÃ¡rias e Associadas (Dividendos e Lucros)</td>
                  <td className="border-r border-zinc-300 px-2 py-0.5 text-right font-mono">{fmt(curr.filiaisTotal)}</td>
                  <td className="px-2 py-0.5 text-right font-mono text-zinc-500">{fmt(prev.filiaisTotal)}</td>
                </tr>
                <tr className="bg-zinc-50 font-bold border-t border-zinc-400">
                  <td className="border-r border-zinc-300 px-2 py-1 uppercase">Totais</td>
                  <td className="border-r border-zinc-300 px-2 py-1 text-right font-mono text-blue-950 font-bold">{fmt(curr.filiaisTotal)}</td>
                  <td className="px-2 py-1 text-right font-mono text-zinc-600 font-bold">{fmt(prev.filiaisTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="text-right text-[9px] text-zinc-400 font-mono italic">Pag 3/5</div>
        </div>

        {/* ================= PÃGINA 4 ================= */}
        <div className="bg-white border border-zinc-300 shadow-md p-8 print:p-0 print:border-none print:shadow-none space-y-6">
          <PageHeader />

          {/* Nota 33 - Resultados NÃ£o Operacionais */}
          <div className="space-y-2">
            <h3 className="text-xs font-black text-blue-950 uppercase border-b border-blue-900 pb-1 italic">
              Nota 33 â€“ Resultados nÃ£o operacionais
            </h3>
            <table className="w-full border-collapse border border-zinc-400 text-[10px]">
              <thead>
                <tr className="bg-zinc-100 text-left border-b border-zinc-400 font-bold">
                  <th className="border-r border-zinc-400 px-2 py-1">Rubricas</th>
                  <th className="border-r border-zinc-400 px-2 py-1 text-right w-28 font-mono">{selectedYear}</th>
                  <th className="px-2 py-1 text-right w-28 font-mono text-zinc-600">{prevYear}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border-r border-zinc-300 px-2 py-0.5">Proveitos e ganhos nÃ£o operacionais</td>
                  <td className="border-r border-zinc-300 px-2 py-0.5 text-right font-mono">{fmt(curr.proveitosNaoOp)}</td>
                  <td className="px-2 py-0.5 text-right font-mono text-zinc-500">{fmt(prev.proveitosNaoOp)}</td>
                </tr>
                <tr>
                  <td className="border-r border-zinc-300 px-2 py-0.5">Custos e perdas nÃ£o operacionais</td>
                  <td className="border-r border-zinc-300 px-2 py-0.5 text-right font-mono">{fmt(curr.custosNaoOp)}</td>
                  <td className="px-2 py-0.5 text-right font-mono text-zinc-500">{fmt(prev.custosNaoOp)}</td>
                </tr>
                <tr className="bg-zinc-50 font-bold border-t border-zinc-400">
                  <td className="border-r border-zinc-300 px-2 py-1 uppercase">Totais</td>
                  <td className="border-r border-zinc-300 px-2 py-1 text-right font-mono text-blue-950 font-bold">{fmt(curr.resultadosNaoOpTotal)}</td>
                  <td className="px-2 py-1 text-right font-mono text-zinc-600 font-bold">{fmt(prev.resultadosNaoOpTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Nota 34 - Resultados ExtraordinÃ¡rios */}
          <div className="space-y-2">
            <h3 className="text-xs font-black text-blue-950 uppercase border-b border-blue-900 pb-1 italic">
              Nota 34 â€“ Resultados extraordinÃ¡rios
            </h3>
            <table className="w-full border-collapse border border-zinc-400 text-[10px]">
              <thead>
                <tr className="bg-zinc-100 text-left border-b border-zinc-400 font-bold">
                  <th className="border-r border-zinc-400 px-2 py-1">Rubricas</th>
                  <th className="border-r border-zinc-400 px-2 py-1 text-right w-28 font-mono">{selectedYear}</th>
                  <th className="px-2 py-1 text-right w-28 font-mono text-zinc-600">{prevYear}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border-r border-zinc-300 px-2 py-0.5">Sinistros, CatÃ¡strofes e Outros</td>
                  <td className="border-r border-zinc-300 px-2 py-0.5 text-right font-mono">{fmt(curr.extraTotal)}</td>
                  <td className="px-2 py-0.5 text-right font-mono text-zinc-500">{fmt(prev.extraTotal)}</td>
                </tr>
                <tr className="bg-zinc-50 font-bold border-t border-zinc-400">
                  <td className="border-r border-zinc-300 px-2 py-1 uppercase">Totais</td>
                  <td className="border-r border-zinc-300 px-2 py-1 text-right font-mono text-blue-950 font-bold">{fmt(curr.extraTotal)}</td>
                  <td className="px-2 py-1 text-right font-mono text-zinc-600 font-bold">{fmt(prev.extraTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="text-right text-[9px] text-zinc-400 font-mono italic">Pag 4/5</div>
        </div>

        {/* ================= PÃGINA 5 ================= */}
        <div className="bg-white border border-zinc-300 shadow-md p-8 print:p-0 print:border-none print:shadow-none space-y-6">
          <PageHeader />

          {/* Nota 35 - Imposto sobre o Rendimento */}
          <div className="space-y-2">
            <h3 className="text-xs font-black text-blue-950 uppercase border-b border-blue-900 pb-1 italic">
              Nota 35 â€“ Imposto sobre o rendimento (ReconciliaÃ§Ã£o Fiscal)
            </h3>
            <table className="w-full border-collapse border border-zinc-400 text-[10px]">
              <thead>
                <tr className="bg-zinc-100 text-left border-b border-zinc-400 font-bold">
                  <th className="border-r border-zinc-400 px-2 py-1">Rubricas</th>
                  <th className="border-r border-zinc-400 px-2 py-1 text-right w-28 font-mono">{selectedYear}</th>
                  <th className="px-2 py-1 text-right w-28 font-mono text-zinc-600">{prevYear}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-blue-50/40 font-bold">
                  <td className="border-r border-zinc-300 px-2 py-1">Resultado ContabilÃ­stico</td>
                  <td className="border-r border-zinc-300 px-2 py-1 text-right font-mono text-blue-950">{fmt(curr.resultadoContabilistico)}</td>
                  <td className="px-2 py-1 text-right font-mono text-zinc-600">{fmt(prev.resultadoContabilistico)}</td>
                </tr>
                <tr>
                  <td className="border-r border-zinc-300 px-2 py-0.5 font-bold">CorrecÃ§Ãµes para efeitos fiscais</td>
                  <td className="border-r border-zinc-300 px-2 py-0.5 text-right font-mono">0,00</td>
                  <td className="px-2 py-0.5 text-right font-mono text-zinc-500">0,00</td>
                </tr>
                <tr>
                  <td className="border-r border-zinc-300 px-4 py-0.5">A somar: VariaÃ§Ãµes patrimoniais positivas</td>
                  <td className="border-r border-zinc-300 px-2 py-0.5 text-right font-mono">0,00</td>
                  <td className="px-2 py-0.5 text-right font-mono text-zinc-500">0,00</td>
                </tr>
                <tr>
                  <td className="border-r border-zinc-300 px-4 py-0.5">Custos e perdas nÃ£o aceites para efeitos fiscais</td>
                  <td className="border-r border-zinc-300 px-2 py-0.5 text-right font-mono">0,00</td>
                  <td className="px-2 py-0.5 text-right font-mono text-zinc-500">0,00</td>
                </tr>
                <tr>
                  <td className="border-r border-zinc-300 px-4 py-0.5">A deduzir: VariaÃ§Ãµes patrimoniais negativas / BenefÃ­cios</td>
                  <td className="border-r border-zinc-300 px-2 py-0.5 text-right font-mono">0,00</td>
                  <td className="px-2 py-0.5 text-right font-mono text-zinc-500">0,00</td>
                </tr>
                <tr className="bg-zinc-100 font-bold border-t border-b border-zinc-400">
                  <td className="border-r border-zinc-300 px-2 py-1 uppercase text-blue-950">Lucro TributÃ¡vel (prejuÃ­zo fiscal)</td>
                  <td className="border-r border-zinc-300 px-2 py-1 text-right font-mono text-blue-950 font-bold">{fmt(curr.lucroTributavel)}</td>
                  <td className="px-2 py-1 text-right font-mono text-zinc-600 font-bold">{fmt(prev.lucroTributavel)}</td>
                </tr>
                <tr>
                  <td className="border-r border-zinc-300 px-2 py-0.5">Taxa nominal de imposto</td>
                  <td className="border-r border-zinc-300 px-2 py-0.5 text-right font-mono">25%</td>
                  <td className="px-2 py-0.5 text-right font-mono text-zinc-500">25%</td>
                </tr>
                <tr>
                  <td className="border-r border-zinc-300 px-2 py-0.5">Imposto sobre lucros estimado</td>
                  <td className="border-r border-zinc-300 px-2 py-0.5 text-right font-mono font-bold text-red-900">{fmt(curr.impostoEstimado)}</td>
                  <td className="px-2 py-0.5 text-right font-mono text-zinc-500">{fmt(prev.impostoEstimado)}</td>
                </tr>
                <tr className="bg-zinc-50 font-bold border-t border-zinc-400">
                  <td className="border-r border-zinc-300 px-2 py-1 uppercase">Taxa efectiva de imposto</td>
                  <td className="border-r border-zinc-300 px-2 py-1 text-right font-mono">{curr.lucroTributavel > 0 ? ((curr.impostoEstimado / curr.lucroTributavel) * 100).toFixed(2) + '%' : '0,00%'}</td>
                  <td className="px-2 py-1 text-right font-mono text-zinc-600">{prev.lucroTributavel > 0 ? ((prev.impostoEstimado / prev.lucroTributavel) * 100).toFixed(2) + '%' : '0,00%'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="text-right text-[9px] text-zinc-400 font-mono italic">Pag 5/5</div>
        </div>

      </div>
    </div>
  );
};

export default NotasContasModule;
