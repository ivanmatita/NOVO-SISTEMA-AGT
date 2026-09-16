/**
 * MapaAmortizacaoModule.tsx
 * Mapa de AmortizaÃ§Ãµes e ReintegraÃ§Ãµes - Layout Oficial AGT / Afrogest
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus, Printer, HelpCircle, RefreshCw, X, Save,
  AlertCircle, CheckCircle, Trash2, Edit, FileCheck, Layers, ArrowLeft
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface MapaAmortizacaoModuleProps {
  user?: any;
  companyData?: any;
  fiscalYear?: string;
  onBack?: () => void;
}

interface AtivoImobilizado {
  id: string;
  empresa_id: string;
  conta: string;
  serial_number: string | null;
  descricao: string;
  data_aquisicao: string;
  ano_aquisicao: number;
  quantidade: number;
  valor_unitario: number;
  valor_aquisicao: number;
  taxa_amortizacao: number;
  vida_util: number;
  metodo: string;
  valor_residual: number;
  status: string;
  observacoes?: string | null;
}

export const MapaAmortizacaoModule: React.FC<MapaAmortizacaoModuleProps> = ({
  user,
  companyData,
  fiscalYear,
  onBack,
}) => {
  const empresaId = companyData?.id || user?.empresa_id || user?.company_id;
  const companyName = companyData?.name || companyData?.nome || user?.company_name || 'EMPRESA';
  const companyNif = companyData?.nif || user?.company_nif || '0000000000';
  const regimeIva = companyData?.regime_iva || 'REGIME SIMPLIFICADO';

  const [selectedYear, setSelectedYear] = useState<string>(fiscalYear || String(new Date().getFullYear()));
  const [ativos, setAtivos] = useState<AtivoImobilizado[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingAtivo, setEditingAtivo] = useState<AtivoImobilizado | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (fiscalYear) setSelectedYear(fiscalYear);
  }, [fiscalYear]);

  // Form state
  const [form, setForm] = useState({
    conta: '11.1',
    serial_number: '',
    descricao: '',
    data_aquisicao: new Date().toISOString().slice(0, 10),
    quantidade: '1',
    valor_unitario: '',
    taxa_amortizacao: '20',
    vida_util: '5',
    metodo: 'Linhas Rectas',
    valor_residual: '0',
    observacoes: ''
  });

  const fetchAtivos = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ativos_imobilizados')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('data_aquisicao', { ascending: true });

      if (!error && Array.isArray(data)) {
        setAtivos(data);
      } else {
        setAtivos([]);
      }
    } catch (e) {
      console.error('[MapaAmortizacao] Erro ao carregar ativos:', e);
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    fetchAtivos();
  }, [fetchAtivos]);

  const resetForm = () => {
    setForm({
      conta: '11.1',
      serial_number: '',
      descricao: '',
      data_aquisicao: new Date().toISOString().slice(0, 10),
      quantidade: '1',
      valor_unitario: '',
      taxa_amortizacao: '20',
      vida_util: '5',
      metodo: 'Linhas Rectas',
      valor_residual: '0',
      observacoes: ''
    });
    setEditingAtivo(null);
    setMsg(null);
  };

  const openNew = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (ativo: AtivoImobilizado) => {
    setEditingAtivo(ativo);
    setForm({
      conta: ativo.conta || '11.1',
      serial_number: ativo.serial_number || '',
      descricao: ativo.descricao || '',
      data_aquisicao: ativo.data_aquisicao || new Date().toISOString().slice(0, 10),
      quantidade: String(ativo.quantidade || 1),
      valor_unitario: String(ativo.valor_unitario || ''),
      taxa_amortizacao: String(ativo.taxa_amortizacao || 20),
      vida_util: String(ativo.vida_util || 5),
      metodo: ativo.metodo || 'Linhas Rectas',
      valor_residual: String(ativo.valor_residual || 0),
      observacoes: ativo.observacoes || ''
    });
    setMsg(null);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem a certeza que deseja eliminar este ativo?')) return;
    try {
      const { error } = await supabase.from('ativos_imobilizados').delete().eq('id', id);
      if (!error) {
        setAtivos(prev => prev.filter(a => a.id !== id));
      }
    } catch (e) {
      console.error('Erro ao eliminar ativo:', e);
    }
  };

  const handleSave = async () => {
    if (!form.descricao.trim()) {
      setMsg({ type: 'err', text: 'Informe a descriÃ§Ã£o do ativo.' });
      return;
    }
    const vu = Number(form.valor_unitario);
    if (!vu || vu <= 0) {
      setMsg({ type: 'err', text: 'Informe um valor unitÃ¡rio vÃ¡lido.' });
      return;
    }
    const qtd = Number(form.quantidade) || 1;
    const taxa = Number(form.taxa_amortizacao) || 0;
    const vidaUtil = Number(form.vida_util) || (taxa > 0 ? 100 / taxa : 5);
    const anoAq = new Date(form.data_aquisicao).getFullYear();
    const valAquisicao = vu * qtd;

    setSaving(true);
    setMsg(null);

    const payload: any = {
      empresa_id: empresaId,
      conta: form.conta,
      serial_number: form.serial_number || null,
      descricao: form.descricao.trim(),
      data_aquisicao: form.data_aquisicao,
      ano_aquisicao: isNaN(anoAq) ? Number(selectedYear) : anoAq,
      quantidade: qtd,
      valor_unitario: vu,
      valor_aquisicao: valAquisicao,
      taxa_amortizacao: taxa,
      vida_util: vidaUtil,
      metodo: form.metodo,
      valor_residual: Number(form.valor_residual) || 0,
      observacoes: form.observacoes || null,
      status: 'activo'
    };

    try {
      if (editingAtivo) {
        const { error } = await supabase
          .from('ativos_imobilizados')
          .update(payload)
          .eq('id', editingAtivo.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ativos_imobilizados').insert(payload);
        if (error) throw error;
      }
      setMsg({ type: 'ok', text: 'Ativo guardado com sucesso.' });
      await fetchAtivos();
      setTimeout(() => {
        setShowModal(false);
        resetForm();
      }, 1000);
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message || 'Erro ao guardar ativo.' });
    } finally {
      setSaving(false);
    }
  };

  // CÃ¡lculos Reais de AmortizaÃ§Ã£o para o Ano Selecionado
  const currentYearNum = Number(selectedYear);

  const calculatedRows = useMemo(() => {
    return ativos.map(ativo => {
      const anoAq = ativo.ano_aquisicao || new Date(ativo.data_aquisicao).getFullYear();
      const valAq = Number(ativo.valor_aquisicao || 0);
      const valRes = Number(ativo.valor_residual || 0);
      const baseAmortizavel = Math.max(0, valAq - valRes);
      const taxa = Number(ativo.taxa_amortizacao || 0);
      const amortAnual = baseAmortizavel * (taxa / 100);

      // Anos anteriores completos antes do exercÃ­cio corrente
      const anosAnteriores = Math.max(0, currentYearNum - anoAq);
      const acAnterior = Math.min(baseAmortizavel, amortAnual * anosAnteriores);

      // AmortizaÃ§Ã£o do exercÃ­cio
      let doExercicio = 0;
      if (currentYearNum >= anoAq && acAnterior < baseAmortizavel) {
        doExercicio = Math.min(baseAmortizavel - acAnterior, amortAnual);
      }

      // AmortizaÃ§Ã£o Acumulada Final
      const acFinal = acAnterior + doExercicio;

      // Valor LÃ­quido ContabilÃ­stico Actual
      const valorLiquido = Math.max(valRes, valAq - acFinal);

      return {
        ...ativo,
        anoAq,
        valAq,
        acAnterior,
        taxa,
        doExercicio,
        acFinal,
        valorLiquido
      };
    });
  }, [ativos, currentYearNum]);

  // Totais Acumulados
  const totais = useMemo(() => {
    return calculatedRows.reduce((acc, r) => ({
      valAq: acc.valAq + r.valAq,
      acAnterior: acc.acAnterior + r.acAnterior,
      doExercicio: acc.doExercicio + r.doExercicio,
      acFinal: acc.acFinal + r.acFinal,
      valorLiquido: acc.valorLiquido + r.valorLiquido
    }), {
      valAq: 0,
      acAnterior: 0,
      doExercicio: 0,
      acFinal: 0,
      valorLiquido: 0
    });
  }, [calculatedRows]);

  const fmt = (v: number) => {
    return v.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const exportExcel = () => {
    const header = [
      'Conta', 'Serial Number', 'DescriÃ§Ã£o', 'Data AquisiÃ§Ã£o', 'Ano AquisiÃ§Ã£o',
      'Qtd', 'Valor UnitÃ¡rio', 'Valor AquisiÃ§Ã£o', 'Ac. Anterior', 'Taxa %',
      'Vida Ãštil', 'Do ExercÃ­cio', 'Ac. Final', 'Valor LÃ­quido Actual'
    ];
    const data = calculatedRows.map(r => [
      r.conta, r.serial_number || '', r.descricao, r.data_aquisicao, r.anoAq,
      r.quantidade, r.valor_unitario.toFixed(2), r.valAq.toFixed(2), r.acAnterior.toFixed(2),
      r.taxa + '%', r.vida_util, r.doExercicio.toFixed(2), r.acFinal.toFixed(2), r.valorLiquido.toFixed(2)
    ]);
    const totalRow = [
      'Totais Acumulados', '', '', '', '', '', '',
      totais.valAq.toFixed(2), totais.acAnterior.toFixed(2), '', '',
      totais.doExercicio.toFixed(2), totais.acFinal.toFixed(2), totais.valorLiquido.toFixed(2)
    ];
    const csv = [header, ...data, totalRow].map(row => row.join('\t')).join('\n');
    const blob = new Blob([csv], { type: 'text/tab-separated-values;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mapa_amortizacoes_${selectedYear}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Caixa de caracteres para NIF e Ano
  const yearDigits = selectedYear.padStart(4, '0').split('');
  const nifDigits = companyNif.padEnd(14, ' ').split('');

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
              Mapa de AmortizaÃ§Ãµes e ReintegraÃ§Ãµes
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* BotÃ£o Novo */}
          <button onClick={openNew} className="w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow transition-all" title="Adicionar Activo">
            <Plus size={18} />
          </button>
          {/* BotÃ£o Excel */}
          <button onClick={exportExcel} className="w-8 h-8 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white flex items-center justify-center shadow transition-all" title="Exportar Excel">
            <span className="text-[9px] font-black">XLSX</span>
          </button>
          {/* BotÃ£o AGT */}
          <button className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center text-[9px] font-black shadow" title="Validado AGT">
            AGT
          </button>
          {/* BotÃ£o Imprimir */}
          <button onClick={() => window.print()} className="w-8 h-8 rounded-full bg-zinc-600 hover:bg-zinc-700 text-white flex items-center justify-center shadow transition-all" title="Imprimir">
            <Printer size={16} />
          </button>
          {/* BotÃ£o Ajuda */}
          <button className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center shadow" title="InstruÃ§Ãµes do Modelo">
            <HelpCircle size={16} />
          </button>
          {/* Seletor RÃ¡pido de Ano */}
          <div className="flex items-center bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-full text-emerald-800 font-black text-xs shadow-sm ml-2">
            <RefreshCw size={12} className="mr-1.5 cursor-pointer hover:rotate-180 transition-transform" onClick={fetchAtivos} />
            <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="bg-transparent font-black focus:outline-none cursor-pointer text-xs">
              {[2023, 2024, 2025, 2026, 2027, 2028].map(y => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Official Document Container */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white border-2 border-blue-900 shadow-md p-4 print:p-0 print:border-none print:shadow-none">
          
          {/* Super Header Banner */}
          <div className="grid grid-cols-12 border-b-2 border-blue-900 pb-3 mb-2">
            <div className="col-span-3 flex flex-col items-center justify-center border-r border-blue-900 pr-3">
              <div className="text-[#003366] font-black text-lg tracking-wider flex items-center gap-1">
                <span className="text-blue-600 text-2xl">ðŸ“Š</span> Afrogestâ„¢
              </div>
              <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">Powered By Afrogestâ„¢</span>
            </div>

            <div className="col-span-6 flex flex-col items-center justify-center text-center px-4">
              <h1 className="text-sm font-black text-blue-950 uppercase tracking-wider">
                MAPA DE AMORTIZAÃ‡Ã•ES
              </h1>
              <h2 className="text-sm font-black text-blue-950 uppercase tracking-wider">
                E REINTEGRAÃ‡Ã•ES
              </h2>
            </div>

            <div className="col-span-3 flex flex-col items-center justify-center border-l border-blue-900 pl-3">
              <div className="border border-zinc-400 px-3 py-1 text-center bg-zinc-50">
                <div className="text-[10px] font-black text-zinc-800 uppercase">V.1</div>
                <div className="text-[8px] font-bold text-zinc-500 uppercase tracking-tight">AFROGEST</div>
              </div>
            </div>
          </div>

          {/* Section 01, 02, 03 Header Box */}
          <div className="grid grid-cols-12 border border-blue-900 text-[10px] mb-2 bg-blue-50/20">
            {/* 01 - REGIME DO IVA */}
            <div className="col-span-4 border-r border-blue-900 p-2">
              <div className="bg-blue-950 text-white font-black px-1.5 py-0.5 text-[9px] uppercase tracking-wider inline-block mb-1.5">
                01 - REGIME DO IVA
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-bold">1</span>
                <input type="checkbox" checked readOnly className="w-3.5 h-3.5 text-blue-900 accent-blue-900" />
                <span className="font-black text-blue-950 uppercase text-[9.5px]">{regimeIva}</span>
              </div>
            </div>

            {/* 02 - PERÃODO DA DECLARAÃ‡ÃƒO */}
            <div className="col-span-4 border-r border-blue-900 p-2">
              <div className="bg-blue-950 text-white font-black px-1.5 py-0.5 text-[9px] uppercase tracking-wider inline-block mb-1">
                02 - PERÃODO DA DECLARAÃ‡ÃƒO
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[9px] font-bold text-zinc-600">Ano:</span>
                <div className="flex border border-zinc-700 bg-white">
                  {yearDigits.map((d, i) => (
                    <span key={i} className="w-5 h-5 flex items-center justify-center font-mono font-black text-xs border-r border-zinc-400 last:border-r-0">
                      {d}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-[8px] text-zinc-500 font-bold mt-1 text-right">
                Emitido em {new Date().toLocaleDateString('pt-AO')}
              </div>
            </div>

            {/* 03 - NÃšMERO DE IDENTIFICAÃ‡ÃƒO FISCAL */}
            <div className="col-span-4 p-2">
              <div className="bg-blue-950 text-white font-black px-1.5 py-0.5 text-[9px] uppercase tracking-wider inline-block mb-1">
                03 - NÃšMERO DE IDENTIFICAÃ‡ÃƒO FISCAL
              </div>
              <div className="flex border border-zinc-700 bg-white mt-1 overflow-x-auto">
                {nifDigits.map((d, i) => (
                  <span key={i} className="w-4 h-5 flex items-center justify-center font-mono font-black text-[10px] border-r border-zinc-400 last:border-r-0">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Section 04 - IDENTIFICAÃ‡ÃƒO DO CONTRIBUINTE */}
          <div className="border border-blue-900 text-[10px] mb-3 bg-zinc-50">
            <div className="bg-blue-950 text-white font-black px-2 py-0.5 text-[9px] uppercase tracking-wider">
              04 - IDENTIFICAÃ‡ÃƒO DO CONTRIBUINTE
            </div>
            <div className="p-2 flex items-center gap-4">
              <span className="text-zinc-600 font-bold text-[9px]">1 - NOME OU DESIGNAÃ‡ÃƒO SOCIAL:</span>
              <span className="font-black text-zinc-900 text-xs uppercase tracking-tight">{companyName}</span>
            </div>
          </div>

          {/* Section 05 - QUADRO DE AMORTIZAÃ‡Ã•ES E REINTEGRAÃ‡Ã•ES */}
          <div className="border border-blue-900 text-[9px]">
            <div className="bg-blue-950 text-white font-black px-2 py-0.5 text-[9px] uppercase tracking-wider">
              05 - Quadro de AmortizaÃ§Ãµes e ReintegraÃ§Ãµes
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-zinc-100 border-b border-zinc-300 text-[8.5px] font-black uppercase text-zinc-800">
                    <th rowSpan={2} className="border-r border-zinc-300 px-1.5 py-1 text-center w-12">Conta</th>
                    <th rowSpan={2} className="border-r border-zinc-300 px-1.5 py-1 text-center w-20">SerialNumber</th>
                    <th rowSpan={2} className="border-r border-zinc-300 px-2 py-1">DescriÃ§Ã£o</th>
                    <th rowSpan={2} className="border-r border-zinc-300 px-1.5 py-1 text-center w-16">Data AquisiÃ§Ã£o</th>
                    <th rowSpan={2} className="border-r border-zinc-300 px-1.5 py-1 text-center w-14">ANO AQUISIÃ‡ÃƒO</th>
                    <th rowSpan={2} className="border-r border-zinc-300 px-1.5 py-1 text-center w-10">Qtd</th>
                    <th rowSpan={2} className="border-r border-zinc-300 px-2 py-1 text-right w-20">Valor UnitÃ¡rio</th>
                    <th rowSpan={2} className="border-r border-zinc-300 px-2 py-1 text-right w-24">Valor AquisiÃ§Ã£o</th>
                    <th colSpan={5} className="border-r border-zinc-300 px-1.5 py-0.5 text-center bg-zinc-200">FUNDO DE AMORTIZAÃ‡ÃƒO</th>
                    <th rowSpan={2} className="px-2 py-1 text-right w-24">VALOR LIQUIDO ACTUAL</th>
                    <th rowSpan={2} className="px-1.5 py-1 text-center w-12 print:hidden">AÃ§Ãµes</th>
                  </tr>
                  <tr className="bg-zinc-100 border-b border-zinc-300 text-[8px] font-black uppercase text-zinc-700">
                    <th className="border-r border-zinc-300 px-1.5 py-0.5 text-right w-20">AC. ANTERIOR</th>
                    <th className="border-r border-zinc-300 px-1 py-0.5 text-center w-12">TAXA</th>
                    <th className="border-r border-zinc-300 px-1 py-0.5 text-center w-12">Vida Util</th>
                    <th className="border-r border-zinc-300 px-1.5 py-0.5 text-right w-20">DO EXERCICIO</th>
                    <th className="border-r border-zinc-300 px-1.5 py-0.5 text-right w-20">AC. FINAL</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-200">
                  {loading ? (
                    <tr>
                      <td colSpan={15} className="p-8 text-center text-zinc-400 text-xs italic">
                        A carregar mapa de amortizaÃ§Ãµes...
                      </td>
                    </tr>
                  ) : calculatedRows.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="p-8 text-center text-zinc-400 text-xs italic">
                        Sem ativos registados. Clique no botÃ£o (+) para registar um novo ativo.
                      </td>
                    </tr>
                  ) : (
                    calculatedRows.map((r, idx) => (
                      <tr key={r.id} className={`text-[9px] hover:bg-blue-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50/30'}`}>
                        <td className="border-r border-zinc-200 px-1.5 py-1 text-center font-mono font-bold text-zinc-700">{r.conta}</td>
                        <td className="border-r border-zinc-200 px-1.5 py-1 text-center font-mono text-zinc-500">{r.serial_number || 'â€”'}</td>
                        <td className="border-r border-zinc-200 px-2 py-1 font-semibold text-zinc-800">{r.descricao}</td>
                        <td className="border-r border-zinc-200 px-1.5 py-1 text-center font-mono text-zinc-600">{r.data_aquisicao}</td>
                        <td className="border-r border-zinc-200 px-1.5 py-1 text-center font-mono font-bold text-blue-900">{r.anoAq}</td>
                        <td className="border-r border-zinc-200 px-1.5 py-1 text-center font-mono">{r.quantidade}</td>
                        <td className="border-r border-zinc-200 px-2 py-1 text-right font-mono">{fmt(r.valor_unitario)}</td>
                        <td className="border-r border-zinc-200 px-2 py-1 text-right font-mono font-bold text-zinc-900">{fmt(r.valAq)}</td>
                        <td className="border-r border-zinc-200 px-1.5 py-1 text-right font-mono text-zinc-600">{fmt(r.acAnterior)}</td>
                        <td className="border-r border-zinc-200 px-1 py-1 text-center font-mono">{r.taxa}%</td>
                        <td className="border-r border-zinc-200 px-1 py-1 text-center font-mono">{r.vida_util} anos</td>
                        <td className="border-r border-zinc-200 px-1.5 py-1 text-right font-mono font-bold text-emerald-800">{fmt(r.doExercicio)}</td>
                        <td className="border-r border-zinc-200 px-1.5 py-1 text-right font-mono font-bold text-blue-950">{fmt(r.acFinal)}</td>
                        <td className="px-2 py-1 text-right font-mono font-black text-[#003366]">{fmt(r.valorLiquido)}</td>
                        <td className="px-1.5 py-1 text-center print:hidden">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => openEdit(r)} className="text-blue-600 hover:text-blue-800 p-0.5" title="Editar">
                              <Edit size={12} />
                            </button>
                            <button onClick={() => handleDelete(r.id)} className="text-red-500 hover:text-red-700 p-0.5" title="Eliminar">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>

                <tfoot>
                  <tr className="bg-zinc-200 font-black text-[9px] border-t-2 border-blue-900">
                    <td colSpan={7} className="border-r border-zinc-300 px-3 py-1.5 text-right uppercase tracking-wider text-blue-950">
                      Totais Acumulados
                    </td>
                    <td className="border-r border-zinc-300 px-2 py-1.5 text-right font-mono text-blue-950 font-bold">
                      {fmt(totais.valAq)}
                    </td>
                    <td className="border-r border-zinc-300 px-1.5 py-1.5 text-right font-mono text-zinc-700">
                      {fmt(totais.acAnterior)}
                    </td>
                    <td colSpan={2} className="border-r border-zinc-300"></td>
                    <td className="border-r border-zinc-300 px-1.5 py-1.5 text-right font-mono text-emerald-900 font-bold">
                      {fmt(totais.doExercicio)}
                    </td>
                    <td className="border-r border-zinc-300 px-1.5 py-1.5 text-right font-mono text-blue-950 font-bold">
                      {fmt(totais.acFinal)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono font-black text-[#003366] text-[9.5px]">
                      {fmt(totais.valorLiquido)}
                    </td>
                    <td className="print:hidden"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="bg-zinc-100 px-3 py-1 text-right text-[8px] text-zinc-500 font-bold uppercase tracking-widest border-t border-zinc-300">
              Fim de listagem
            </div>
          </div>

        </div>
      </div>

      {/* Modal Novo / Editar Activo */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white border border-zinc-300 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#003366] text-white">
              <div className="flex items-center gap-2">
                <FileCheck size={16} />
                <span className="text-xs font-black uppercase tracking-wider">
                  {editingAtivo ? 'Editar Activo Imobilizado' : 'Novo Activo Imobilizado'}
                </span>
              </div>
              <button onClick={() => setShowModal(false)} className="text-white/70 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider text-zinc-500 mb-1">
                    Conta PGC <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.conta}
                    onChange={e => setForm(f => ({ ...f, conta: e.target.value }))}
                    className="w-full border border-zinc-300 bg-zinc-50 px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-[#003366]"
                  >
                    <option value="11.1">11.1 - Terrenos e Recursos Naturais</option>
                    <option value="11.2">11.2 - EdifÃ­cios e Outras ConstruÃ§Ãµes</option>
                    <option value="11.3">11.3 - Equipamento BÃ¡sico</option>
                    <option value="11.4">11.4 - Equipamento de Transporte</option>
                    <option value="11.5">11.5 - Equipamento Administrativo</option>
                    <option value="11.6">11.6 - Taras e Vasilhame</option>
                    <option value="11.8">11.8 - Outras ImobilizaÃ§Ãµes CorpÃ³reas</option>
                    <option value="12.1">12.1 - Trespasse</option>
                    <option value="12.2">12.2 - Projectos de Desenvolvimento</option>
                    <option value="12.3">12.3 - Propriedade Industrial</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider text-zinc-500 mb-1">
                    Serial Number / ReferÃªncia
                  </label>
                  <input
                    value={form.serial_number}
                    onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))}
                    placeholder="Ex: SN-2026-001"
                    className="w-full border border-zinc-300 bg-zinc-50 px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#003366]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase tracking-wider text-zinc-500 mb-1">
                  DescriÃ§Ã£o do Activo <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.descricao}
                  onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  placeholder="Ex: Computador Dell XPS 15 / VeÃ­culo Toyota Hilux"
                  className="w-full border border-zinc-300 bg-zinc-50 px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#003366]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider text-zinc-500 mb-1">
                    Data AquisiÃ§Ã£o <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.data_aquisicao}
                    onChange={e => setForm(f => ({ ...f, data_aquisicao: e.target.value }))}
                    className="w-full border border-zinc-300 bg-zinc-50 px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#003366]"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider text-zinc-500 mb-1">
                    Quantidade
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.quantidade}
                    onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))}
                    className="w-full border border-zinc-300 bg-zinc-50 px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#003366]"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider text-zinc-500 mb-1">
                    Valor UnitÃ¡rio (AOA) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.valor_unitario}
                    onChange={e => setForm(f => ({ ...f, valor_unitario: e.target.value }))}
                    placeholder="0.00"
                    className="w-full border border-zinc-300 bg-zinc-50 px-2.5 py-1.5 text-xs font-mono font-bold focus:outline-none focus:border-[#003366]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider text-zinc-500 mb-1">
                    Taxa AmortizaÃ§Ã£o (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.taxa_amortizacao}
                    onChange={e => {
                      const t = Number(e.target.value);
                      setForm(f => ({
                        ...f,
                        taxa_amortizacao: e.target.value,
                        vida_util: t > 0 ? String(Math.round(100 / t)) : f.vida_util
                      }));
                    }}
                    className="w-full border border-zinc-300 bg-zinc-50 px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-[#003366]"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider text-zinc-500 mb-1">
                    Vida Ãštil (Anos)
                  </label>
                  <input
                    type="number"
                    value={form.vida_util}
                    onChange={e => {
                      const vu = Number(e.target.value);
                      setForm(f => ({
                        ...f,
                        vida_util: e.target.value,
                        taxa_amortizacao: vu > 0 ? String(Number((100 / vu).toFixed(2))) : f.taxa_amortizacao
                      }));
                    }}
                    className="w-full border border-zinc-300 bg-zinc-50 px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-[#003366]"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider text-zinc-500 mb-1">
                    Valor Residual (AOA)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.valor_residual}
                    onChange={e => setForm(f => ({ ...f, valor_residual: e.target.value }))}
                    placeholder="0.00"
                    className="w-full border border-zinc-300 bg-zinc-50 px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-[#003366]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase tracking-wider text-zinc-500 mb-1">
                  ObservaÃ§Ãµes / LocalizaÃ§Ã£o
                </label>
                <textarea
                  rows={2}
                  value={form.observacoes}
                  onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                  placeholder="Detalhes do imobilizado..."
                  className="w-full border border-zinc-300 bg-zinc-50 px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#003366]"
                />
              </div>

              {msg && (
                <div className={`flex items-center gap-2 p-2.5 text-xs font-bold ${msg.type === 'ok' ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' : 'bg-red-50 text-red-800 border border-red-300'}`}>
                  {msg.type === 'ok' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                  <span>{msg.text}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 border border-zinc-300 uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 bg-[#003366] hover:bg-[#002244] text-white px-5 py-2 text-xs font-black uppercase tracking-wider shadow disabled:opacity-50"
                >
                  <Save size={14} />
                  {saving ? 'A guardar...' : 'Registar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapaAmortizacaoModule;
