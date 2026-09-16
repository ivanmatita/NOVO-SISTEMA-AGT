/**
 * DemonstracaoResultadosModule.tsx
 * DemonstraÃ§Ã£o de Resultados por Natureza - Layout Oficial Afrogest / PGC Angolano
 * Conforme referÃªncia visual media_1789594592508.png
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText, Printer, Download, RefreshCw, Eye, ArrowLeft,
  Settings, Layers, ChevronRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DemonstracaoResultadosModuleProps {
  user?: any;
  companyData?: any;
  fiscalYear?: string;
  onBack?: () => void;
  onOpenNotasContas?: (year: string) => void;
}

export const DemonstracaoResultadosModule: React.FC<DemonstracaoResultadosModuleProps> = ({
  user,
  companyData,
  fiscalYear,
  onBack,
  onOpenNotasContas
}) => {
  const empresaId = companyData?.id || user?.empresa_id || user?.company_id;
  const companyName = companyData?.name || companyData?.nome || user?.company_name || 'EMPRESA';
  const companyNif = companyData?.nif || user?.company_nif || '0000000000';

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

      // 1. Carregar lanÃ§amentos contabilÃ­sticos do ano corrente e ano anterior
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

      const cData = Array.isArray(currRes.data) ? currRes.data : [];
      const pData = Array.isArray(prevRes.data) ? prevRes.data : [];

      setLancamentosCurr(cData);
      setLancamentosPrev(pData);
    } catch (e) {
      console.error('[DemonstracaoResultados] Erro ao carregar dados:', e);
    } finally {
      setLoading(false);
    }
  }, [empresaId, selectedYear, prevYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Helper de cÃ¡lculo de saldo por prefixos de conta PGC
  const getCreditSum = (data: any[], prefixes: string[]) => {
    return data
      .filter(l => prefixes.some(p => (l.conta_pgc || '').startsWith(p)))
      .reduce((sum, l) => {
        const v = Number(l.valor || 0);
        const deb = Number(l.debito) > 0 ? Number(l.debito) : (l.tipo_movimento === 'DEBITO' || l.tipo_movimento === 'D' ? v : 0);
        const cred = Number(l.credito) > 0 ? Number(l.credito) : (l.tipo_movimento === 'CREDITO' || l.tipo_movimento === 'C' ? v : 0);
        return sum + cred - deb;
      }, 0);
  };

  const getDebitSum = (data: any[], prefixes: string[]) => {
    return data
      .filter(l => prefixes.some(p => (l.conta_pgc || '').startsWith(p)))
      .reduce((sum, l) => {
        const v = Number(l.valor || 0);
        const deb = Number(l.debito) > 0 ? Number(l.debito) : (l.tipo_movimento === 'DEBITO' || l.tipo_movimento === 'D' ? v : 0);
        const cred = Number(l.credito) > 0 ? Number(l.credito) : (l.tipo_movimento === 'CREDITO' || l.tipo_movimento === 'C' ? v : 0);
        return sum + deb - cred;
      }, 0);
  };

  // CÃ¡lculo das Rubricas da DemonstraÃ§Ã£o de Resultados
  const calculateMetrics = (data: any[]) => {
    // 1. Vendas (Nota 22) - Contas 61
    const vendas = Math.max(0, getCreditSum(data, ['61']));
    // 2. PrestaÃ§Ã£o de ServiÃ§os (Nota 23) - Contas 62
    const prestacaoServicos = Math.max(0, getCreditSum(data, ['62']));
    // 3. Outros proveitos operacionais (Nota 24) - Contas 63, 64
    const outrosProveitos = Math.max(0, getCreditSum(data, ['63', '64']));

    // Total Proveitos Operacionais Brutos
    const totalProveitosOperacionais = vendas + prestacaoServicos + outrosProveitos;

    // 4. VariaÃ§Ãµes nos produtos acabados (Nota 25) - Conta 66
    const variacaoProdutos = getCreditSum(data, ['66']);
    // 5. Trabalhos para a prÃ³pria empresa (Nota 26) - Conta 65
    const trabalhosPropriaEmpresa = Math.max(0, getCreditSum(data, ['65']));
    // 6. Custo das existÃªncias vendidas e matÃ©rias consumidas (Nota 27) - Conta 71
    const custoExistencias = Math.max(0, getDebitSum(data, ['71']));
    // 7. Custos com o pessoal (Nota 28) - Conta 72
    const custosPessoal = Math.max(0, getDebitSum(data, ['72']));
    // 8. AmortizaÃ§Ãµes (Nota 29) - Conta 73
    const amortizacoes = Math.max(0, getDebitSum(data, ['73']));
    // 9. Outros custos e perdas operacionais (Nota 30) - Conta 75
    const outrosCustosOperacionais = Math.max(0, getDebitSum(data, ['75']));

    // Total Custos Operacionais
    const totalCustosOperacionais = custoExistencias + custosPessoal + amortizacoes + outrosCustosOperacionais;

    // Resultados Operacionais:
    const resultadosOperacionais = (totalProveitosOperacionais + variacaoProdutos + trabalhosPropriaEmpresa) - totalCustosOperacionais;

    // 10. Resultados Financeiros (Nota 31) - Proveitos 68 vs Custos 78
    const proveitosFin = Math.max(0, getCreditSum(data, ['68']));
    const custosFin = Math.max(0, getDebitSum(data, ['78']));
    const resultadosFinanceiros = proveitosFin - custosFin;

    // 11. Resultados de filiais e associadas (Nota 32)
    const resultadosFiliais = getCreditSum(data, ['67']) - getDebitSum(data, ['77']);

    // 12. Resultados nÃ£o operacionais (Nota 33) - Proveitos 69 vs Custos 79
    const proveitosNaoOp = Math.max(0, getCreditSum(data, ['69']));
    const custosNaoOp = Math.max(0, getDebitSum(data, ['79']));
    const resultadosNaoOperacionais = proveitosNaoOp - custosNaoOp;

    // Resultados antes de impostos:
    const resultadosAntesImpostos = resultadosOperacionais + resultadosFinanceiros + resultadosFiliais + resultadosNaoOperacionais;

    // 13. Imposto sobre o rendimento (Nota 35) - Conta 87
    const impostoRendimento = Math.max(0, getDebitSum(data, ['87']));

    // Resultados lÃ­quidos das actividades correntes:
    const resultadosLiquidosCorrentes = resultadosAntesImpostos - impostoRendimento;

    // 14. Resultados extraordinÃ¡rios (Nota 34)
    const resultadosExtraordinarios = getCreditSum(data, ['68.9']) - getDebitSum(data, ['78.9']);

    // Resultados lÃ­quidos do exercÃ­cio:
    const resultadosLiquidosExercicio = resultadosLiquidosCorrentes + resultadosExtraordinarios;

    return {
      vendas,
      prestacaoServicos,
      outrosProveitos,
      totalProveitosOperacionais,
      variacaoProdutos,
      trabalhosPropriaEmpresa,
      custoExistencias,
      custosPessoal,
      amortizacoes,
      outrosCustosOperacionais,
      totalCustosOperacionais,
      resultadosOperacionais,
      resultadosFinanceiros,
      resultadosFiliais,
      resultadosNaoOperacionais,
      resultadosAntesImpostos,
      impostoRendimento,
      resultadosLiquidosCorrentes,
      resultadosExtraordinarios,
      resultadosLiquidosExercicio
    };
  };

  const currMetrics = useMemo(() => calculateMetrics(lancamentosCurr), [lancamentosCurr]);
  const prevMetrics = useMemo(() => calculateMetrics(lancamentosPrev), [lancamentosPrev]);

  const fmt = (v: number) => {
    return v.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleOpenNotas = () => {
    if (onOpenNotasContas) {
      onOpenNotasContas(selectedYear);
    }
  };

  const exportExcel = () => {
    const rows = [
      ['DemonstraÃ§Ã£o de Resultados por Natureza', '', '', ''],
      ['Empresa:', companyName, 'NIF:', companyNif],
      ['PerÃ­odo:', 'Janeiro a Dezembro', 'ExercÃ­cios:', `${selectedYear} vs ${prevYear}`],
      [''],
      ['DesignaÃ§Ã£o', 'Notas', selectedYear, prevYear],
      ['Vendas', '22', currMetrics.vendas.toFixed(2), prevMetrics.vendas.toFixed(2)],
      ['PrestaÃ§Ã£o de ServiÃ§os', '23', currMetrics.prestacaoServicos.toFixed(2), prevMetrics.prestacaoServicos.toFixed(2)],
      ['Outros proveitos operacionais', '24', currMetrics.outrosProveitos.toFixed(2), prevMetrics.outrosProveitos.toFixed(2)],
      ['Total Proveitos Operacionais', '', currMetrics.totalProveitosOperacionais.toFixed(2), prevMetrics.totalProveitosOperacionais.toFixed(2)],
      ['VariaÃ§Ãµes nos produtos acabados e produtos em vias de fabrico', '25', currMetrics.variacaoProdutos.toFixed(2), prevMetrics.variacaoProdutos.toFixed(2)],
      ['Trabalhos para a prÃ³pria empresa', '26', currMetrics.trabalhosPropriaEmpresa.toFixed(2), prevMetrics.trabalhosPropriaEmpresa.toFixed(2)],
      ['Custo das mercadorias vendidas e das matÃ©rias-primas e subsidiÃ¡rias consumidas', '27', currMetrics.custoExistencias.toFixed(2), prevMetrics.custoExistencias.toFixed(2)],
      ['Custos com o pessoal', '28', currMetrics.custosPessoal.toFixed(2), prevMetrics.custosPessoal.toFixed(2)],
      ['AmortizaÃ§Ãµes', '29', currMetrics.amortizacoes.toFixed(2), prevMetrics.amortizacoes.toFixed(2)],
      ['Outros custos e perdas operacionais', '30', currMetrics.outrosCustosOperacionais.toFixed(2), prevMetrics.outrosCustosOperacionais.toFixed(2)],
      ['Total Custos Operacionais', '', currMetrics.totalCustosOperacionais.toFixed(2), prevMetrics.totalCustosOperacionais.toFixed(2)],
      ['Resultados operacionais:', '', currMetrics.resultadosOperacionais.toFixed(2), prevMetrics.resultadosOperacionais.toFixed(2)],
      ['Resultados Financeiros', '31', currMetrics.resultadosFinanceiros.toFixed(2), prevMetrics.resultadosFinanceiros.toFixed(2)],
      ['Resultados de filiais e associadas', '32', currMetrics.resultadosFiliais.toFixed(2), prevMetrics.resultadosFiliais.toFixed(2)],
      ['Resultados nÃ£o operacionais', '33', currMetrics.resultadosNaoOperacionais.toFixed(2), prevMetrics.resultadosNaoOperacionais.toFixed(2)],
      ['Resultados antes de impostos:', '', currMetrics.resultadosAntesImpostos.toFixed(2), prevMetrics.resultadosAntesImpostos.toFixed(2)],
      ['Imposto sobre o rendimento', '35', currMetrics.impostoRendimento.toFixed(2), prevMetrics.impostoRendimento.toFixed(2)],
      ['Resultados lÃ­quidos das actividades correntes:', '', currMetrics.resultadosLiquidosCorrentes.toFixed(2), prevMetrics.resultadosLiquidosCorrentes.toFixed(2)],
      ['Resultados extraordinÃ¡rios', '34', currMetrics.resultadosExtraordinarios.toFixed(2), prevMetrics.resultadosExtraordinarios.toFixed(2)],
      ['Resultados lÃ­quidos do exercÃ­cio:', '', currMetrics.resultadosLiquidosExercicio.toFixed(2), prevMetrics.resultadosLiquidosExercicio.toFixed(2)]
    ];

    const csv = rows.map(r => r.join('\t')).join('\n');
    const blob = new Blob([csv], { type: 'text/tab-separated-values;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `demonstracao_resultados_${selectedYear}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-zinc-100 print:bg-white text-zinc-900 font-sans">
      {/* Top Application Ribbon */}
      <div className="bg-white border-b border-zinc-200 px-6 py-2.5 flex items-center justify-between print:hidden shadow-sm">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-1.5 hover:bg-zinc-100 text-zinc-600 border border-zinc-300 transition-all" title="Voltar">
              <ArrowLeft size={16} />
            </button>
          )}
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-[#003366]" />
            <span className="text-xs font-black text-[#003366] uppercase tracking-wider">
              DemonstraÃ§Ã£o de Resultados por Natureza
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Seletor RÃ¡pido de MÃªs / Ano */}
          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] font-black shadow" title="PerÃ­odo">
            JAN
          </div>

          {/* BotÃ£o Ver Notas e Contas (Olho Verde 3D) */}
          <button
            onClick={handleOpenNotas}
            className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-full text-xs font-black shadow transition-all group"
            title="Ver Notas e Contas da DemonstraÃ§Ã£o de Resultados"
          >
            <Eye size={14} className="group-hover:scale-110 transition-transform" />
            <span>Ver Notas e Contas</span>
          </button>

          {/* BotÃ£o Excel */}
          <button onClick={exportExcel} className="w-8 h-8 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white flex items-center justify-center shadow transition-all" title="Exportar Excel">
            <span className="text-[9px] font-black">XLSX</span>
          </button>

          {/* BotÃ£o PDF */}
          <button onClick={() => window.print()} className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow transition-all" title="Baixar PDF">
            <span className="text-[9px] font-black">PDF</span>
          </button>

          {/* BotÃ£o Imprimir */}
          <button onClick={() => window.print()} className="w-8 h-8 rounded-full bg-zinc-600 hover:bg-zinc-700 text-white flex items-center justify-center shadow transition-all" title="Imprimir">
            <Printer size={16} />
          </button>

          {/* BotÃ£o ConfiguraÃ§Ãµes */}
          <button className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow" title="ConfiguraÃ§Ãµes">
            <Settings size={16} />
          </button>

          {/* Seletor RÃ¡pido de Ano */}
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

      {/* Main Official Document Container */}
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white border border-zinc-300 shadow-md p-6 print:p-0 print:border-none print:shadow-none">
          
          {/* Header Title Section */}
          <div className="border-b border-zinc-200 pb-2 mb-3">
            <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest">DemonstraÃ§Ã£o de Resultados (por natureza)</div>
            <div className="flex justify-between items-end mt-1">
              <div>
                <h1 className="text-sm font-black text-zinc-900 uppercase">Empresa: {companyName}</h1>
                <div className="text-xs font-bold text-zinc-700">NIF: {companyNif}</div>
              </div>
              <div className="text-[10px] text-zinc-500 font-medium italic">
                Valores expressos em AKZ
              </div>
            </div>
          </div>

          <div className="text-[11px] font-bold text-zinc-700 mb-2">
            DemonstraÃ§Ã£o de resultados de Janeiro a Dezembro
          </div>

          {/* Official Financial Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-zinc-400 text-xs">
              <thead>
                <tr className="bg-zinc-100 border-b border-zinc-400 text-[10px] font-black uppercase text-zinc-800">
                  <th rowSpan={2} className="border-r border-zinc-400 px-3 py-2 text-left">DesignaÃ§Ã£o</th>
                  <th rowSpan={2} className="border-r border-zinc-400 px-2 py-2 text-center w-16">Notas</th>
                  <th colSpan={2} className="px-3 py-1 text-center bg-zinc-200 border-b border-zinc-400">EXERCICIOS</th>
                </tr>
                <tr className="bg-zinc-100 border-b border-zinc-400 text-[10px] font-black text-zinc-800">
                  <th className="border-r border-zinc-400 px-3 py-1.5 text-right w-36 font-mono">{selectedYear}</th>
                  <th className="px-3 py-1.5 text-right w-36 font-mono text-zinc-600">{prevYear}</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-200">
                {/* 1. Proveitos Operacionais */}
                <tr className="hover:bg-blue-50/40">
                  <td className="border-r border-zinc-300 px-3 py-1.5 font-medium text-zinc-800">Vendas</td>
                  <td className="border-r border-zinc-300 px-2 py-1.5 text-center font-bold text-blue-900">22</td>
                  <td className="border-r border-zinc-300 px-3 py-1.5 text-right font-mono font-bold text-zinc-900">{fmt(currMetrics.vendas)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-zinc-500">{fmt(prevMetrics.vendas)}</td>
                </tr>
                <tr className="hover:bg-blue-50/40">
                  <td className="border-r border-zinc-300 px-3 py-1.5 font-medium text-zinc-800">PrestaÃ§Ã£o de ServiÃ§os</td>
                  <td className="border-r border-zinc-300 px-2 py-1.5 text-center font-bold text-blue-900">23</td>
                  <td className="border-r border-zinc-300 px-3 py-1.5 text-right font-mono font-bold text-zinc-900">{fmt(currMetrics.prestacaoServicos)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-zinc-500">{fmt(prevMetrics.prestacaoServicos)}</td>
                </tr>
                <tr className="hover:bg-blue-50/40">
                  <td className="border-r border-zinc-300 px-3 py-1.5 font-medium text-zinc-800">Outros proveitos operacionais</td>
                  <td className="border-r border-zinc-300 px-2 py-1.5 text-center font-bold text-blue-900">24</td>
                  <td className="border-r border-zinc-300 px-3 py-1.5 text-right font-mono font-bold text-zinc-900">{fmt(currMetrics.outrosProveitos)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-zinc-500">{fmt(prevMetrics.outrosProveitos)}</td>
                </tr>
                <tr className="bg-zinc-100 font-bold border-t border-b border-zinc-400">
                  <td colSpan={2} className="border-r border-zinc-300 px-3 py-1 text-right text-[10px] uppercase text-zinc-600">Subtotal Proveitos</td>
                  <td className="border-r border-zinc-300 px-3 py-1 text-right font-mono text-blue-950">{fmt(currMetrics.totalProveitosOperacionais)}</td>
                  <td className="px-3 py-1 text-right font-mono text-zinc-600">{fmt(prevMetrics.totalProveitosOperacionais)}</td>
                </tr>

                {/* 2. Custos Operacionais */}
                <tr className="hover:bg-blue-50/40">
                  <td className="border-r border-zinc-300 px-3 py-1.5 font-medium text-zinc-800">VariaÃ§Ãµes nos produtos acabados e produtos em vias de fabrico</td>
                  <td className="border-r border-zinc-300 px-2 py-1.5 text-center font-bold text-blue-900">25</td>
                  <td className="border-r border-zinc-300 px-3 py-1.5 text-right font-mono text-zinc-800">{fmt(currMetrics.variacaoProdutos)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-zinc-500">{fmt(prevMetrics.variacaoProdutos)}</td>
                </tr>
                <tr className="hover:bg-blue-50/40">
                  <td className="border-r border-zinc-300 px-3 py-1.5 font-medium text-zinc-800">Trabalhos para a prÃ³pria empresa</td>
                  <td className="border-r border-zinc-300 px-2 py-1.5 text-center font-bold text-blue-900">26</td>
                  <td className="border-r border-zinc-300 px-3 py-1.5 text-right font-mono text-zinc-800">{fmt(currMetrics.trabalhosPropriaEmpresa)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-zinc-500">{fmt(prevMetrics.trabalhosPropriaEmpresa)}</td>
                </tr>
                <tr className="hover:bg-blue-50/40">
                  <td className="border-r border-zinc-300 px-3 py-1.5 font-medium text-zinc-800">Custo das mercadorias vendidas e das matÃ©rias-primas e subsidiÃ¡rias consumidas</td>
                  <td className="border-r border-zinc-300 px-2 py-1.5 text-center font-bold text-blue-900">27</td>
                  <td className="border-r border-zinc-300 px-3 py-1.5 text-right font-mono text-zinc-800">{fmt(currMetrics.custoExistencias)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-zinc-500">{fmt(prevMetrics.custoExistencias)}</td>
                </tr>
                <tr className="hover:bg-blue-50/40">
                  <td className="border-r border-zinc-300 px-3 py-1.5 font-medium text-zinc-800">Custos com o pessoal</td>
                  <td className="border-r border-zinc-300 px-2 py-1.5 text-center font-bold text-blue-900">28</td>
                  <td className="border-r border-zinc-300 px-3 py-1.5 text-right font-mono text-zinc-800">{fmt(currMetrics.custosPessoal)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-zinc-500">{fmt(prevMetrics.custosPessoal)}</td>
                </tr>
                <tr className="hover:bg-blue-50/40">
                  <td className="border-r border-zinc-300 px-3 py-1.5 font-medium text-zinc-800">AmortizaÃ§Ãµes</td>
                  <td className="border-r border-zinc-300 px-2 py-1.5 text-center font-bold text-blue-900">29</td>
                  <td className="border-r border-zinc-300 px-3 py-1.5 text-right font-mono text-zinc-800">{fmt(currMetrics.amortizacoes)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-zinc-500">{fmt(prevMetrics.amortizacoes)}</td>
                </tr>
                <tr className="hover:bg-blue-50/40">
                  <td className="border-r border-zinc-300 px-3 py-1.5 font-medium text-zinc-800">Outros custos e perdas operacionais</td>
                  <td className="border-r border-zinc-300 px-2 py-1.5 text-center font-bold text-blue-900">30</td>
                  <td className="border-r border-zinc-300 px-3 py-1.5 text-right font-mono text-zinc-800">{fmt(currMetrics.outrosCustosOperacionais)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-zinc-500">{fmt(prevMetrics.outrosCustosOperacionais)}</td>
                </tr>
                <tr className="bg-zinc-100 font-bold border-t border-b border-zinc-400">
                  <td colSpan={2} className="border-r border-zinc-300 px-3 py-1 text-right text-[10px] uppercase text-zinc-600">Subtotal Custos</td>
                  <td className="border-r border-zinc-300 px-3 py-1 text-right font-mono text-red-900">{fmt(currMetrics.totalCustosOperacionais)}</td>
                  <td className="px-3 py-1 text-right font-mono text-zinc-600">{fmt(prevMetrics.totalCustosOperacionais)}</td>
                </tr>

                {/* 3. Resultados Operacionais */}
                <tr className="bg-blue-50/30 font-black border-t-2 border-b-2 border-zinc-400">
                  <td colSpan={2} className="border-r border-zinc-300 px-3 py-2 text-zinc-900 uppercase">
                    Resultados operacionais:
                  </td>
                  <td className="border-r border-zinc-300 px-3 py-2 text-right font-mono text-blue-950 font-bold text-sm">
                    {fmt(currMetrics.resultadosOperacionais)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-600 font-bold text-sm">
                    {fmt(prevMetrics.resultadosOperacionais)}
                  </td>
                </tr>

                {/* 4. Financeiros, Filiais e NÃ£o Operacionais */}
                <tr className="hover:bg-blue-50/40">
                  <td className="border-r border-zinc-300 px-3 py-1.5 font-medium text-zinc-800">Resultados Financeiros</td>
                  <td className="border-r border-zinc-300 px-2 py-1.5 text-center font-bold text-blue-900">31</td>
                  <td className="border-r border-zinc-300 px-3 py-1.5 text-right font-mono">{fmt(currMetrics.resultadosFinanceiros)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-zinc-500">{fmt(prevMetrics.resultadosFinanceiros)}</td>
                </tr>
                <tr className="hover:bg-blue-50/40">
                  <td className="border-r border-zinc-300 px-3 py-1.5 font-medium text-zinc-800">Resultados de filiais e associadas</td>
                  <td className="border-r border-zinc-300 px-2 py-1.5 text-center font-bold text-blue-900">32</td>
                  <td className="border-r border-zinc-300 px-3 py-1.5 text-right font-mono">{fmt(currMetrics.resultadosFiliais)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-zinc-500">{fmt(prevMetrics.resultadosFiliais)}</td>
                </tr>
                <tr className="hover:bg-blue-50/40">
                  <td className="border-r border-zinc-300 px-3 py-1.5 font-medium text-zinc-800">Resultados nÃ£o operacionais</td>
                  <td className="border-r border-zinc-300 px-2 py-1.5 text-center font-bold text-blue-900">33</td>
                  <td className="border-r border-zinc-300 px-3 py-1.5 text-right font-mono">{fmt(currMetrics.resultadosNaoOperacionais)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-zinc-500">{fmt(prevMetrics.resultadosNaoOperacionais)}</td>
                </tr>

                {/* 5. Resultados Antes de Impostos */}
                <tr className="bg-zinc-100 font-bold border-t border-b border-zinc-400">
                  <td colSpan={2} className="border-r border-zinc-300 px-3 py-2 text-zinc-900 uppercase">
                    Resultados antes de impostos:
                  </td>
                  <td className="border-r border-zinc-300 px-3 py-2 text-right font-mono text-blue-950 font-bold">
                    {fmt(currMetrics.resultadosAntesImpostos)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-600 font-bold">
                    {fmt(prevMetrics.resultadosAntesImpostos)}
                  </td>
                </tr>

                <tr className="hover:bg-blue-50/40">
                  <td className="border-r border-zinc-300 px-3 py-1.5 font-medium text-zinc-800">Imposto sobre o rendimento</td>
                  <td className="border-r border-zinc-300 px-2 py-1.5 text-center font-bold text-blue-900">35</td>
                  <td className="border-r border-zinc-300 px-3 py-1.5 text-right font-mono text-red-900">{fmt(currMetrics.impostoRendimento)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-zinc-500">{fmt(prevMetrics.impostoRendimento)}</td>
                </tr>

                {/* 6. Resultados LÃ­quidos Correntes */}
                <tr className="bg-zinc-50 font-bold border-t border-b border-zinc-300">
                  <td colSpan={2} className="border-r border-zinc-300 px-3 py-1.5 text-zinc-800">
                    Resultados liquidos das actividades correntes:
                  </td>
                  <td className="border-r border-zinc-300 px-3 py-1.5 text-right font-mono text-blue-950 font-bold">
                    {fmt(currMetrics.resultadosLiquidosCorrentes)}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-zinc-600">
                    {fmt(prevMetrics.resultadosLiquidosCorrentes)}
                  </td>
                </tr>

                <tr className="hover:bg-blue-50/40">
                  <td className="border-r border-zinc-300 px-3 py-1.5 font-medium text-zinc-800">Resultados extraordinÃ¡rios</td>
                  <td className="border-r border-zinc-300 px-2 py-1.5 text-center font-bold text-blue-900">34</td>
                  <td className="border-r border-zinc-300 px-3 py-1.5 text-right font-mono">{fmt(currMetrics.resultadosExtraordinarios)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-zinc-500">{fmt(prevMetrics.resultadosExtraordinarios)}</td>
                </tr>

                {/* 7. Resultados LÃ­quidos do ExercÃ­cio */}
                <tr className="bg-blue-950 text-white font-black border-t-2 border-blue-900">
                  <td colSpan={2} className="border-r border-blue-900 px-3 py-2.5 uppercase tracking-wide">
                    Resultados liquidos do exercicio:
                  </td>
                  <td className="border-r border-blue-900 px-3 py-2.5 text-right font-mono text-base text-emerald-300">
                    {fmt(currMetrics.resultadosLiquidosExercicio)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-base text-zinc-300">
                    {fmt(prevMetrics.resultadosLiquidosExercicio)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer Action to open Notas e Contas */}
          <div className="mt-6 flex items-center justify-between border-t border-zinc-200 pt-4 print:hidden">
            <div className="text-xs text-zinc-500 font-medium">
              ExercÃ­cio Selecionado: <span className="font-bold text-blue-900">{selectedYear}</span> (com comparativo a {prevYear})
            </div>
            <button
              onClick={handleOpenNotas}
              className="flex items-center gap-2 bg-[#003366] hover:bg-[#002244] text-white px-5 py-2.5 text-xs font-black uppercase tracking-wider shadow transition-all"
            >
              <span>Abrir Caderno de Notas e Contas</span>
              <ChevronRight size={16} />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default DemonstracaoResultadosModule;
