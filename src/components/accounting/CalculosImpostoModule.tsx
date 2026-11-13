/**
 * CalculosImpostoModule.tsx
 * Cálculos de Imposto — Apuramento de Resultados Operacionais
 * Baseado no layout: data range picker, contas PGC, colunas Débito/Crédito,
 * cálculo de IVA, IRT, IS, totais e botão "Registar Lançamento"
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Calculator, Calendar, RefreshCw, Save, Printer,
  TrendingUp, TrendingDown, AlertCircle, CheckCircle,
  ChevronDown, ChevronUp, FileText, BarChart2, Download
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CalculosImpostoModuleProps {
  user: any;
  companyData?: any;
}

interface LancamentoFiscal {
  id: string;
  conta_codigo: string;
  conta_descricao: string;
  debito: number;
  credito: number;
  periodo: string;
  tipo_imposto: string;
  descricao: string;
  data_lancamento: string;
  referencia_doc: string | null;
  created_at: string;
}

interface ContaApuramento {
  conta: string;
  descricao: string;
  debito: number;
  credito: number;
  saldo: number;
  tipo: 'rendimento' | 'custo' | 'imposto' | 'neutro';
}

interface ResumoImpostos {
  iva_base: number;
  iva_valor: number;
  iva_taxa: number;
  irt_base: number;
  irt_valor: number;
  is_valor: number;
  resultado_bruto: number;
  resultado_liquido: number;
}

const CONTAS_PADRAO: Omit<ContaApuramento, 'debito' | 'credito' | 'saldo'>[] = [
  { conta: '71', descricao: 'Vendas de Mercadorias', tipo: 'rendimento' },
  { conta: '72', descricao: 'Prestações de Serviços', tipo: 'rendimento' },
  { conta: '75', descricao: 'Subsídios à Exploração', tipo: 'rendimento' },
  { conta: '76', descricao: 'Outros Rendimentos e Ganhos', tipo: 'rendimento' },
  { conta: '61', descricao: 'Custo das Mercadorias Vendidas', tipo: 'custo' },
  { conta: '62', descricao: 'Fornecimentos e Serviços Externos', tipo: 'custo' },
  { conta: '63', descricao: 'Gastos com Pessoal', tipo: 'custo' },
  { conta: '64', descricao: 'Gastos de Depreciação e Amortização', tipo: 'custo' },
  { conta: '65', descricao: 'Perdas por Imparidade', tipo: 'custo' },
  { conta: '66', descricao: 'Perdas em Subsidiárias', tipo: 'custo' },
  { conta: '68', descricao: 'Outros Gastos e Perdas', tipo: 'custo' },
  { conta: '24', descricao: 'Estado e Outros Entes Públicos (IVA)', tipo: 'imposto' },
  { conta: '2411', descricao: 'IVA — Imposto sobre o Valor Acrescentado', tipo: 'imposto' },
  { conta: '2413', descricao: 'IRT — Imposto sobre Rendimento do Trabalho', tipo: 'imposto' },
  { conta: '2414', descricao: 'IS — Imposto de Selo', tipo: 'imposto' },
  { conta: '8111', descricao: 'Resultado antes de Impostos', tipo: 'neutro' },
  { conta: '8121', descricao: 'Imposto sobre Lucros (IAC)', tipo: 'imposto' },
  { conta: '818', descricao: 'Resultado Líquido do Exercício', tipo: 'neutro' },
];

const TAXAS_IVA = [
  { label: 'Isento (0%)', taxa: 0 },
  { label: 'Taxa Reduzida (5%)', taxa: 5 },
  { label: 'Taxa Normal (14%)', taxa: 14 },
  { label: 'Taxa Específica (7%)', taxa: 7 },
];

const formatAOA = (v: number) =>
  `${v.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kz`;

export const CalculosImpostoModule: React.FC<CalculosImpostoModuleProps> = ({ user, companyData }) => {
  const empresaId = companyData?.id || user?.empresa_id || user?.company_id;

  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');

  const [dataInicio, setDataInicio] = useState(`${anoAtual}-${mesAtual}-01`);
  const [dataFim, setDataFim] = useState(
    `${anoAtual}-${mesAtual}-${new Date(anoAtual, hoje.getMonth() + 1, 0).getDate()}`
  );

  const [contas, setContas] = useState<ContaApuramento[]>(
    CONTAS_PADRAO.map(c => ({ ...c, debito: 0, credito: 0, saldo: 0 }))
  );
  const [lancamentos, setLancamentos] = useState<LancamentoFiscal[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>('resumo');

  const [taxaIva, setTaxaIva] = useState(14);
  const [taxaIrt, setTaxaIrt] = useState(11);
  const [taxaIs, setTaxaIs] = useState(1);

  const [form, setForm] = useState({
    conta_codigo: '',
    conta_descricao: '',
    debito: '',
    credito: '',
    tipo_imposto: 'IVA',
    descricao: '',
    data_lancamento: new Date().toISOString().split('T')[0],
    referencia_doc: '',
  });

  // ── Fetch lançamentos fiscais do período ─────────────────────────────────────
  const fetchLancamentos = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      // Try to fetch from lancamentos_fiscais table
      const { data, error } = await supabase
        .from('lancamentos_fiscais')
        .select('*')
        .eq('empresa_id', empresaId)
        .gte('data_lancamento', dataInicio)
        .lte('data_lancamento', dataFim)
        .order('data_lancamento');

      if (!error && data) {
        setLancamentos(data);
        // Aggregate by conta
        const agregado: Record<string, { debito: number; credito: number }> = {};
        data.forEach((l: LancamentoFiscal) => {
          if (!agregado[l.conta_codigo]) agregado[l.conta_codigo] = { debito: 0, credito: 0 };
          agregado[l.conta_codigo].debito += Number(l.debito) || 0;
          agregado[l.conta_codigo].credito += Number(l.credito) || 0;
        });
        setContas(prev =>
          prev.map(c => {
            const a = agregado[c.conta] || { debito: 0, credito: 0 };
            return { ...c, debito: a.debito, credito: a.credito, saldo: a.credito - a.debito };
          })
        );
      }

      // Also aggregate from documentos_fiscais
      const { data: docs } = await supabase
        .from('documentos_fiscais')
        .select('total, iva_total, subtotal, tipo, data_emissao, status')
        .eq('empresa_id', empresaId)
        .gte('data_emissao', dataInicio)
        .lte('data_emissao', dataFim);

      if (docs && docs.length > 0) {
        let totalVendas = 0;
        let totalIva = 0;
        docs.forEach((d: any) => {
          if (['fatura', 'recibo', 'venda'].includes((d.tipo || '').toLowerCase())) {
            totalVendas += Number(d.subtotal) || Number(d.total) || 0;
            totalIva += Number(d.iva_total) || 0;
          }
        });

        setContas(prev =>
          prev.map(c => {
            if (c.conta === '71') return { ...c, credito: totalVendas, saldo: totalVendas };
            if (c.conta === '2411') return { ...c, credito: totalIva, saldo: totalIva };
            return c;
          })
        );
      }
    } catch (e) {
      console.warn('[CalculosImposto] fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [empresaId, dataInicio, dataFim]);

  useEffect(() => { fetchLancamentos(); }, [fetchLancamentos]);

  // ── Cálculo do resumo de impostos ────────────────────────────────────────────
  const resumo: ResumoImpostos = React.useMemo(() => {
    const rendimentos = contas
      .filter(c => c.tipo === 'rendimento')
      .reduce((s, c) => s + c.credito - c.debito, 0);
    const custos = contas
      .filter(c => c.tipo === 'custo')
      .reduce((s, c) => s + c.debito - c.credito, 0);
    const baseIva = rendimentos;
    const ivaValor = (baseIva * taxaIva) / 100;
    const resultado_bruto = rendimentos - custos;
    const irtBase = contas.find(c => c.conta === '63')?.debito || 0;
    const irtValor = (irtBase * taxaIrt) / 100;
    const isValor = (rendimentos * taxaIs) / 100;
    const resultado_liquido = resultado_bruto - irtValor - isValor;
    return {
      iva_base: baseIva,
      iva_valor: ivaValor,
      iva_taxa: taxaIva,
      irt_base: irtBase,
      irt_valor: irtValor,
      is_valor: isValor,
      resultado_bruto,
      resultado_liquido,
    };
  }, [contas, taxaIva, taxaIrt, taxaIs]);

  // ── Registar Lançamento ──────────────────────────────────────────────────────
  const handleSaveLancamento = async () => {
    if (!form.conta_codigo || (!form.debito && !form.credito)) {
      setMsg({ type: 'err', text: 'Preencha Conta, Débito ou Crédito.' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        empresa_id: empresaId,
        conta_codigo: form.conta_codigo,
        conta_descricao: form.conta_descricao ||
          contas.find(c => c.conta === form.conta_codigo)?.descricao || form.conta_codigo,
        debito: Number(form.debito) || 0,
        credito: Number(form.credito) || 0,
        tipo_imposto: form.tipo_imposto,
        descricao: form.descricao,
        data_lancamento: form.data_lancamento,
        referencia_doc: form.referencia_doc || null,
        periodo: `${dataInicio.slice(0, 7)}`,
        created_by: user?.id,
      };

      const { error } = await supabase.from('lancamentos_fiscais').insert(payload);
      if (error) {
        // Table may not exist yet — show info
        if (error.code === '42P01') {
          setMsg({ type: 'err', text: 'Tabela lancamentos_fiscais não encontrada. Execute a migração SQL.' });
        } else {
          throw error;
        }
      } else {
        setMsg({ type: 'ok', text: 'Lançamento registado com sucesso!' });
        setShowForm(false);
        setForm(f => ({ ...f, conta_codigo: '', conta_descricao: '', debito: '', credito: '', descricao: '', referencia_doc: '' }));
        fetchLancamentos();
      }
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message || 'Erro ao registar lançamento.' });
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 5000);
    }
  };

  const handlePrint = () => window.print();

  const Section: React.FC<{ id: string; title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ id, title, icon, children }) => (
    <div className="border border-gray-200 rounded-lg overflow-hidden mb-3">
      <button
        onClick={() => setExpandedSection(expandedSection === id ? null : id)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-left"
      >
        <div className="flex items-center gap-2 font-semibold text-gray-700 text-sm">
          {icon} {title}
        </div>
        {expandedSection === id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {expandedSection === id && <div className="p-4">{children}</div>}
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header com logo da empresa */}
      <div className="bg-[#003366] text-white px-5 py-3 flex items-center gap-3 shadow">
        {companyData?.logo_url && (
          <img src={companyData.logo_url} alt="Logo" className="h-9 w-9 object-contain bg-white rounded p-0.5" />
        )}
        <div className="flex-1">
          <div className="text-[10px] opacity-60 uppercase tracking-wider">{companyData?.nome || 'Empresa'}</div>
          <div className="font-black text-sm uppercase tracking-wide flex items-center gap-2">
            <Calculator size={14} /> Cálculos de Imposto
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handlePrint} className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-xs">
            <Printer size={12} /> Imprimir
          </button>
          <button onClick={fetchLancamentos} className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-xs">
            <RefreshCw size={12} /> Atualizar
          </button>
        </div>
      </div>

      {/* Filtros de período */}
      <div className="bg-white border-b border-gray-200 px-5 py-3 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Data Início</label>
          <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1.5 text-xs" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Data Fim</label>
          <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1.5 text-xs" />
        </div>
        <div className="flex-1" />
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Taxa IVA (%)</label>
          <select value={taxaIva} onChange={e => setTaxaIva(Number(e.target.value))}
            className="border border-gray-300 rounded px-2 py-1.5 text-xs">
            {TAXAS_IVA.map(t => <option key={t.taxa} value={t.taxa}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Taxa IRT (%)</label>
          <input type="number" value={taxaIrt} onChange={e => setTaxaIrt(Number(e.target.value))}
            className="border border-gray-300 rounded px-2 py-1.5 text-xs w-20" min={0} max={100} />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Taxa IS (%)</label>
          <input type="number" value={taxaIs} onChange={e => setTaxaIs(Number(e.target.value))}
            className="border border-gray-300 rounded px-2 py-1.5 text-xs w-20" min={0} max={100} />
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#003366] text-white rounded text-xs font-bold hover:bg-[#002244]">
          <Save size={13} /> Registar Lançamento
        </button>
      </div>

      {msg && (
        <div className={`mx-5 mt-3 flex items-center gap-2 px-3 py-2 rounded text-xs border ${msg.type === 'ok' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
          {msg.type === 'ok' ? <CheckCircle size={12} /> : <AlertCircle size={12} />} {msg.text}
        </div>
      )}

      {/* Conteúdo principal */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">

        {/* Resumo rápido de impostos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Base IVA', value: resumo.iva_base, color: 'blue', icon: <BarChart2 size={14} /> },
            { label: `IVA (${resumo.iva_taxa}%)`, value: resumo.iva_valor, color: 'orange', icon: <Calculator size={14} /> },
            { label: `IRT (${taxaIrt}%)`, value: resumo.irt_valor, color: 'purple', icon: <TrendingDown size={14} /> },
            { label: 'Resultado Líquido', value: resumo.resultado_liquido, color: resumo.resultado_liquido >= 0 ? 'green' : 'red', icon: <TrendingUp size={14} /> },
          ].map(card => (
            <div key={card.label} className={`bg-white rounded-lg border border-gray-200 p-3 shadow-sm`}>
              <div className="flex items-center gap-1.5 text-gray-500 text-[10px] uppercase font-bold mb-1">
                {card.icon} {card.label}
              </div>
              <div className={`text-sm font-black ${card.color === 'red' ? 'text-red-600' : card.color === 'green' ? 'text-green-600' : card.color === 'orange' ? 'text-orange-600' : card.color === 'purple' ? 'text-purple-600' : 'text-[#003366]'}`}>
                {formatAOA(card.value)}
              </div>
            </div>
          ))}
        </div>

        {/* APURAMENTO RESULTADOS OPERACIONAIS */}
        <Section id="apuramento" title="Apuramento de Resultados Operacionais" icon={<FileText size={14} />}>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
              <RefreshCw size={16} className="animate-spin mr-2" /> Carregando...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-[#003366] text-white">
                    <th className="px-3 py-2 text-left font-bold">Conta</th>
                    <th className="px-3 py-2 text-left font-bold">Descrição</th>
                    <th className="px-3 py-2 text-right font-bold">Débito (Kz)</th>
                    <th className="px-3 py-2 text-right font-bold">Crédito (Kz)</th>
                    <th className="px-3 py-2 text-right font-bold">Saldo (Kz)</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Rendimentos */}
                  <tr className="bg-green-50">
                    <td colSpan={5} className="px-3 py-1.5 font-black text-green-800 text-[10px] uppercase">
                      ▸ Rendimentos
                    </td>
                  </tr>
                  {contas.filter(c => c.tipo === 'rendimento').map((c, i) => (
                    <tr key={c.conta} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-1.5 font-mono text-gray-500">{c.conta}</td>
                      <td className="px-3 py-1.5 text-gray-700">{c.descricao}</td>
                      <td className="px-3 py-1.5 text-right text-red-600">{c.debito > 0 ? formatAOA(c.debito) : '—'}</td>
                      <td className="px-3 py-1.5 text-right text-green-600 font-semibold">{c.credito > 0 ? formatAOA(c.credito) : '—'}</td>
                      <td className="px-3 py-1.5 text-right font-bold text-green-700">{formatAOA(c.credito - c.debito)}</td>
                    </tr>
                  ))}
                  <tr className="bg-green-100 font-black">
                    <td colSpan={4} className="px-3 py-1.5 text-green-800 text-right text-[10px] uppercase">Total Rendimentos</td>
                    <td className="px-3 py-1.5 text-right text-green-800">{formatAOA(contas.filter(c => c.tipo === 'rendimento').reduce((s, c) => s + c.credito - c.debito, 0))}</td>
                  </tr>

                  {/* Custos */}
                  <tr className="bg-red-50">
                    <td colSpan={5} className="px-3 py-1.5 font-black text-red-800 text-[10px] uppercase">
                      ▸ Gastos e Perdas
                    </td>
                  </tr>
                  {contas.filter(c => c.tipo === 'custo').map((c, i) => (
                    <tr key={c.conta} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-1.5 font-mono text-gray-500">{c.conta}</td>
                      <td className="px-3 py-1.5 text-gray-700">{c.descricao}</td>
                      <td className="px-3 py-1.5 text-right text-red-600 font-semibold">{c.debito > 0 ? formatAOA(c.debito) : '—'}</td>
                      <td className="px-3 py-1.5 text-right text-green-600">{c.credito > 0 ? formatAOA(c.credito) : '—'}</td>
                      <td className="px-3 py-1.5 text-right font-bold text-red-600">{formatAOA(c.debito - c.credito)}</td>
                    </tr>
                  ))}
                  <tr className="bg-red-100 font-black">
                    <td colSpan={4} className="px-3 py-1.5 text-red-800 text-right text-[10px] uppercase">Total Gastos</td>
                    <td className="px-3 py-1.5 text-right text-red-800">{formatAOA(contas.filter(c => c.tipo === 'custo').reduce((s, c) => s + c.debito - c.credito, 0))}</td>
                  </tr>

                  {/* Impostos */}
                  <tr className="bg-purple-50">
                    <td colSpan={5} className="px-3 py-1.5 font-black text-purple-800 text-[10px] uppercase">
                      ▸ Impostos e Contribuições
                    </td>
                  </tr>
                  {contas.filter(c => c.tipo === 'imposto').map((c, i) => (
                    <tr key={c.conta} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-1.5 font-mono text-gray-500">{c.conta}</td>
                      <td className="px-3 py-1.5 text-gray-700">{c.descricao}</td>
                      <td className="px-3 py-1.5 text-right text-red-600">{c.debito > 0 ? formatAOA(c.debito) : '—'}</td>
                      <td className="px-3 py-1.5 text-right text-purple-600 font-semibold">{c.credito > 0 ? formatAOA(c.credito) : '—'}</td>
                      <td className="px-3 py-1.5 text-right font-bold text-purple-700">{formatAOA(c.credito - c.debito)}</td>
                    </tr>
                  ))}

                  {/* Resultado */}
                  <tr className="bg-[#003366] text-white font-black">
                    <td colSpan={4} className="px-3 py-2 text-right uppercase text-xs">Resultado Bruto do Período</td>
                    <td className={`px-3 py-2 text-right text-sm ${resumo.resultado_bruto >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                      {formatAOA(resumo.resultado_bruto)}
                    </td>
                  </tr>
                  <tr className="bg-[#001a33] text-white font-black">
                    <td colSpan={4} className="px-3 py-2 text-right uppercase text-xs">Resultado Líquido (após impostos)</td>
                    <td className={`px-3 py-2 text-right text-base ${resumo.resultado_liquido >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                      {formatAOA(resumo.resultado_liquido)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* Resumo detalhado dos impostos */}
        <Section id="resumo" title="Resumo de Impostos do Período" icon={<Calculator size={14} />}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* IVA */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="font-black text-orange-800 text-sm mb-3 uppercase">IVA — Imposto s/ Valor Acrescentado</div>
              <div className="space-y-1.5 text-xs text-gray-700">
                <div className="flex justify-between">
                  <span>Base Tributável</span>
                  <span className="font-semibold">{formatAOA(resumo.iva_base)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Taxa Aplicável</span>
                  <span className="font-semibold">{resumo.iva_taxa}%</span>
                </div>
                <div className="border-t border-orange-300 pt-1.5 flex justify-between font-black text-orange-700">
                  <span>IVA a Pagar</span>
                  <span>{formatAOA(resumo.iva_valor)}</span>
                </div>
              </div>
            </div>

            {/* IRT */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="font-black text-purple-800 text-sm mb-3 uppercase">IRT — Imposto s/ Rendimento Trabalho</div>
              <div className="space-y-1.5 text-xs text-gray-700">
                <div className="flex justify-between">
                  <span>Base (Gastos c/ Pessoal)</span>
                  <span className="font-semibold">{formatAOA(resumo.irt_base)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Taxa Aplicável</span>
                  <span className="font-semibold">{taxaIrt}%</span>
                </div>
                <div className="border-t border-purple-300 pt-1.5 flex justify-between font-black text-purple-700">
                  <span>IRT Estimado</span>
                  <span>{formatAOA(resumo.irt_valor)}</span>
                </div>
              </div>
            </div>

            {/* IS */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="font-black text-blue-800 text-sm mb-3 uppercase">IS — Imposto de Selo</div>
              <div className="space-y-1.5 text-xs text-gray-700">
                <div className="flex justify-between">
                  <span>Base (Volume Negócios)</span>
                  <span className="font-semibold">{formatAOA(resumo.iva_base)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Taxa Aplicável</span>
                  <span className="font-semibold">{taxaIs}%</span>
                </div>
                <div className="border-t border-blue-300 pt-1.5 flex justify-between font-black text-blue-700">
                  <span>IS Estimado</span>
                  <span>{formatAOA(resumo.is_valor)}</span>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* Lançamentos registados */}
        <Section id="lancamentos" title={`Lançamentos do Período (${lancamentos.length})`} icon={<FileText size={14} />}>
          {lancamentos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <FileText size={28} className="mb-2 opacity-40" />
              <p className="text-sm">Nenhum lançamento registado para este período.</p>
              <button onClick={() => setShowForm(true)} className="mt-3 flex items-center gap-1.5 px-4 py-2 bg-[#003366] text-white rounded text-xs font-bold hover:bg-[#002244]">
                <Save size={12} /> Registar Lançamento
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-3 py-2 text-left">Data</th>
                    <th className="px-3 py-2 text-left">Conta</th>
                    <th className="px-3 py-2 text-left">Descrição</th>
                    <th className="px-3 py-2 text-left">Tipo</th>
                    <th className="px-3 py-2 text-right">Débito</th>
                    <th className="px-3 py-2 text-right">Crédito</th>
                    <th className="px-3 py-2 text-left">Ref. Doc</th>
                  </tr>
                </thead>
                <tbody>
                  {lancamentos.map((l, i) => (
                    <tr key={l.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-1.5">{l.data_lancamento}</td>
                      <td className="px-3 py-1.5 font-mono text-gray-500">{l.conta_codigo}</td>
                      <td className="px-3 py-1.5">{l.descricao || l.conta_descricao}</td>
                      <td className="px-3 py-1.5">
                        <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-bold">{l.tipo_imposto}</span>
                      </td>
                      <td className="px-3 py-1.5 text-right text-red-600">{l.debito > 0 ? formatAOA(l.debito) : '—'}</td>
                      <td className="px-3 py-1.5 text-right text-green-600">{l.credito > 0 ? formatAOA(l.credito) : '—'}</td>
                      <td className="px-3 py-1.5 text-gray-400">{l.referencia_doc || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>

      {/* Modal: Registar Lançamento */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="bg-[#003366] text-white px-5 py-3 rounded-t-xl flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-sm">
                <Save size={14} /> Registar Lançamento Fiscal
              </div>
              <button onClick={() => setShowForm(false)} className="hover:opacity-70 text-xl leading-none">×</button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Conta PGC *</label>
                  <select value={form.conta_codigo} onChange={e => {
                    const found = contas.find(c => c.conta === e.target.value);
                    setForm(f => ({ ...f, conta_codigo: e.target.value, conta_descricao: found?.descricao || '' }));
                  }} className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs">
                    <option value="">Selecionar conta...</option>
                    {contas.map(c => (
                      <option key={c.conta} value={c.conta}>{c.conta} — {c.descricao}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Tipo Imposto</label>
                  <select value={form.tipo_imposto} onChange={e => setForm(f => ({ ...f, tipo_imposto: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs">
                    {['IVA', 'IRT', 'IS', 'IAC', 'Outro'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Descrição</label>
                <input type="text" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs"
                  placeholder="Ex: IVA — Outubro 2025" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Débito (Kz)</label>
                  <input type="number" value={form.debito} onChange={e => setForm(f => ({ ...f, debito: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs" min={0} step={0.01} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Crédito (Kz)</label>
                  <input type="number" value={form.credito} onChange={e => setForm(f => ({ ...f, credito: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs" min={0} step={0.01} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Data</label>
                  <input type="date" value={form.data_lancamento} onChange={e => setForm(f => ({ ...f, data_lancamento: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Referência Documento</label>
                <input type="text" value={form.referencia_doc} onChange={e => setForm(f => ({ ...f, referencia_doc: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs"
                  placeholder="Nº Fatura, Recibo, etc." />
              </div>

              {msg && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded text-xs border ${msg.type === 'ok' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                  {msg.type === 'ok' ? <CheckCircle size={12} /> : <AlertCircle size={12} />} {msg.text}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded text-xs hover:bg-gray-50">
                  Cancelar
                </button>
                <button onClick={handleSaveLancamento} disabled={saving}
                  className="flex items-center gap-1.5 px-5 py-2 bg-[#003366] text-white rounded text-xs font-bold hover:bg-[#002244] disabled:opacity-50">
                  {saving ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
                  Registar Lançamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalculosImpostoModule;
