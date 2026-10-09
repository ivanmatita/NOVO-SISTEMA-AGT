import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, AlertCircle, Percent } from 'lucide-react';

export interface PurchaseLineItem {
  uid: string;
  descricao: string;
  serial_number: string;
  data_validade: string;
  quantidade: number;
  unidade: string;
  valor_unitario: number;
  tipo_artigo: string; // 'Produto' | 'Serviço' | 'Outros'
  desconto_linha: number;
  tipologia_custo: string;
  armazem_id: string;
  local_trabalho_id: string;
  centro_custo_id: string;
  rubrica_id: string;
  rubrica_label: string;
  sujeito_imposto_selo: string;
  tax_id: string;
  tax_rate: number;
  retencao_fonte_taxa?: number;
  retencao_fonte_valor?: number;
  subtotal: number;
  total_linha: number;
}

interface Armazem {
  id: string;
  name?: string;
  nome?: string;
}

interface LocalTrabalho {
  id: string;
  nome?: string;
  name?: string;
}

interface PgcConta {
  id: string;
  codigo?: string;
  conta?: string;
  descricao?: string;
}

interface Metric {
  id: string;
  sigla?: string;
  descricao?: string;
}

interface PurchaseItemModalProps {
  isOpen: boolean;
  initialItem?: PurchaseLineItem | null;
  armazens: Armazem[];
  locais: LocalTrabalho[];
  pgcContas: PgcConta[];
  metrics?: Metric[];
  onClose: () => void;
  onSave: (item: PurchaseLineItem) => void;
}

const TIPOS_ARTIGO = ['Produto', 'Serviço', 'Outros'];

const TIPOLOGIAS = [
  'Serviços',
  'Existência de Inventário',
  'Importação',
  'Outros',
  'Serviços Contratados no Estrangeiro',
  'Outros Bens de Consumo',
];

const TAXAS_IVA = [
  { label: 'IVA 14% (Taxa Normal)', rate: 14 },
  { label: 'IVA 7% (Taxa Reduzida)', rate: 7 },
  { label: 'IVA 5% (Regime Simplificado)', rate: 5 },
  { label: 'IVA 0% (Isento)', rate: 0 },
];

const UNIDADES_PADRAO = ['UN', 'KG', 'LT', 'CX', 'M', 'M2', 'M3', 'PAR', 'HR', 'SV', 'PCT'];

const round2 = (n: number) => Math.round(n * 100) / 100;

const fmtNum = (v?: number | string | null): string => {
  const n = typeof v === 'string' ? parseFloat(v) : (v ?? 0);
  if (isNaN(n)) return '0,00';
  return n.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const PurchaseItemModal: React.FC<PurchaseItemModalProps> = ({
  isOpen,
  initialItem,
  armazens,
  locais,
  pgcContas,
  metrics = [],
  onClose,
  onSave,
}) => {
  const [descricao, setDescricao] = useState('');
  const [tipoArtigo, setTipoArtigo] = useState('Produto');
  const [tipologiaCusto, setTipologiaCusto] = useState('Outros Bens de Consumo');
  const [armazemId, setArmazemId] = useState('');
  const [localTrabalhoId, setLocalTrabalhoId] = useState('');
  const [dataValidade, setDataValidade] = useState('');
  const [quantidade, setQuantidade] = useState<number>(1);
  const [unidade, setUnidade] = useState('UN');
  const [valorUnitario, setValorUnitario] = useState<number>(0);
  const [descontoLinha, setDescontoLinha] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(14);
  const [rubricaId, setRubricaId] = useState('');
  const [rubricaLabel, setRubricaLabel] = useState('');
  const [pgcSearch, setPgcSearch] = useState('');
  const [showPgcDropdown, setShowPgcDropdown] = useState(false);
  const [error, setError] = useState('');

  // Sincronizar dados ao abrir ou editar
  useEffect(() => {
    if (initialItem) {
      setDescricao(initialItem.descricao || '');
      setTipoArtigo(initialItem.tipo_artigo || 'Produto');
      setTipologiaCusto(initialItem.tipologia_custo || 'Outros Bens de Consumo');
      setArmazemId(initialItem.armazem_id || '');
      setLocalTrabalhoId(initialItem.local_trabalho_id || '');
      setDataValidade(initialItem.data_validade || '');
      setQuantidade(initialItem.quantidade || 1);
      setUnidade(initialItem.unidade || 'UN');
      setValorUnitario(initialItem.valor_unitario || 0);
      setDescontoLinha(initialItem.desconto_linha || 0);
      setTaxRate(initialItem.tax_rate ?? 14);
      setRubricaId(initialItem.rubrica_id || '');
      setRubricaLabel(initialItem.rubrica_label || '');
      setPgcSearch(initialItem.rubrica_label || '');
    } else {
      setDescricao('');
      setTipoArtigo('Produto');
      setTipologiaCusto('Outros Bens de Consumo');
      setArmazemId(armazens.length > 0 ? armazens[0].id : '');
      setLocalTrabalhoId(locais.length > 0 ? locais[0].id : '');
      setDataValidade('');
      setQuantidade(1);
      setUnidade('UN');
      setValorUnitario(0);
      setDescontoLinha(0);
      setTaxRate(14);
      setRubricaId('');
      setRubricaLabel('');
      setPgcSearch('');
    }
    setError('');
    setShowPgcDropdown(false);
  }, [initialItem, isOpen, armazens, locais]);

  // Se o tipo mudar para Serviço, ajustar tipologia padrão para Serviços
  const handleTipoArtigoChange = (novoTipo: string) => {
    setTipoArtigo(novoTipo);
    if (novoTipo === 'Serviço') {
      setTipologiaCusto('Serviços');
      setDataValidade('');
    } else if (novoTipo === 'Produto') {
      if (tipologiaCusto === 'Serviços') {
        setTipologiaCusto('Existência de Inventário');
      }
    }
  };

  // Cálculos em tempo real
  const calculations = useMemo(() => {
    const q = Math.max(0, Number(quantidade) || 0);
    const vu = Math.max(0, Number(valorUnitario) || 0);
    const descPct = Math.min(100, Math.max(0, Number(descontoLinha) || 0));
    const base = round2(q * vu);
    const descVal = round2(base * (descPct / 100));
    const subtotal = round2(base - descVal);
    const ivaVal = round2(subtotal * (Number(taxRate || 0) / 100));

    // Retenção na fonte 6,5% obrigatória para Serviços
    const isServico = tipoArtigo === 'Serviço';
    const retencaoTaxa = isServico ? 6.5 : 0;
    const retencaoValor = isServico ? round2(subtotal * 0.065) : 0;
    const totalLinha = round2(subtotal + ivaVal);

    return {
      base,
      descVal,
      subtotal,
      ivaVal,
      retencaoTaxa,
      retencaoValor,
      totalLinha,
    };
  }, [quantidade, valorUnitario, descontoLinha, taxRate, tipoArtigo]);

  // Filtragem de contas PGC da contabilidade
  const filteredPgcContas = useMemo(() => {
    if (!pgcSearch.trim()) return pgcContas.slice(0, 40);
    const t = pgcSearch.toLowerCase().trim();
    return pgcContas
      .filter(c => {
        const cod = (c.codigo || c.conta || '').toLowerCase();
        const desc = (c.descricao || '').toLowerCase();
        return cod.includes(t) || desc.includes(t);
      })
      .slice(0, 40);
  }, [pgcContas, pgcSearch]);

  const handleSave = () => {
    if (!descricao.trim()) {
      setError('Por favor, informe a descrição do artigo ou serviço.');
      return;
    }
    if (quantidade <= 0) {
      setError('A quantidade deve ser maior que zero.');
      return;
    }
    if (valorUnitario < 0) {
      setError('O preço unitário não pode ser negativo.');
      return;
    }

    const item: PurchaseLineItem = {
      uid: initialItem?.uid || Math.random().toString(36).substring(2, 10),
      descricao: descricao.trim(),
      serial_number: initialItem?.serial_number || '',
      data_validade: tipoArtigo === 'Produto' ? dataValidade : '',
      quantidade: Number(quantidade),
      unidade: unidade || 'UN',
      valor_unitario: Number(valorUnitario),
      tipo_artigo: tipoArtigo,
      desconto_linha: Number(descontoLinha) || 0,
      tipologia_custo: tipologiaCusto,
      armazem_id: armazemId,
      local_trabalho_id: localTrabalhoId,
      centro_custo_id: localTrabalhoId,
      rubrica_id: rubricaId,
      rubrica_label: rubricaLabel,
      sujeito_imposto_selo: 'Não sujeita',
      tax_id: String(taxRate),
      tax_rate: Number(taxRate),
      retencao_fonte_taxa: calculations.retencaoTaxa,
      retencao_fonte_valor: calculations.retencaoValor,
      subtotal: calculations.subtotal,
      total_linha: calculations.totalLinha,
    };

    onSave(item);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3">
      {/* Modal Dialog ajustado sem barra de rolagem */}
      <div className="bg-white border border-[#d1d5db] shadow-2xl w-full max-w-4xl rounded-none flex flex-col overflow-visible">
        {/* Top Header */}
        <div className="px-5 py-3 bg-[#0f2a4a] text-white flex items-center justify-between border-b border-[#001f3f]">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-wide uppercase">
              {initialItem ? 'Editar Bem ou Serviço' : 'Adicionar Bem ou Serviço'}
            </span>
            <span className="text-[10px] bg-blue-900/60 text-blue-200 px-2 py-0.5 font-semibold">
              Gestão de Compras
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/10 p-1 transition-colors"
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mensagem de Erro se houver */}
        {error && (
          <div className="px-5 py-2 bg-red-50 border-b border-red-200 text-xs text-red-600 font-semibold flex items-center gap-1.5">
            <AlertCircle size={14} className="text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body - Compacto e perfeitamente ajustado sem rolagem vertical */}
        <div className="p-5 space-y-3.5 bg-white text-xs">
          {/* LINHA 1: Descrição (col-span-2) + Tipo de artigo + Tipologia */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2 space-y-1">
              <label className="block text-[11px] font-bold text-[#374151]">
                Descrição do Bem ou Serviço <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                autoFocus
                placeholder="Escreva a descrição do artigo ou serviço (ex: Resma Papel A4, Consultoria)..."
                value={descricao}
                onChange={e => {
                  setDescricao(e.target.value);
                  if (error) setError('');
                }}
                className="w-full bg-white border border-[#d1d5db] px-3 py-1.5 text-xs text-[#111827] focus:outline-none focus:border-[#0f2a4a] rounded-none font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-[#374151]">
                Tipo de Artigo <span className="text-red-500">*</span>
              </label>
              <select
                value={tipoArtigo}
                onChange={e => handleTipoArtigoChange(e.target.value)}
                className="w-full bg-white border border-[#d1d5db] px-3 py-1.5 text-xs text-[#111827] focus:outline-none focus:border-[#0f2a4a] rounded-none appearance-none cursor-pointer font-medium"
              >
                {TIPOS_ARTIGO.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-[#374151]">
                Tipologia <span className="text-red-500">*</span>
              </label>
              <select
                value={tipologiaCusto}
                onChange={e => setTipologiaCusto(e.target.value)}
                className="w-full bg-white border border-[#d1d5db] px-3 py-1.5 text-xs text-[#111827] focus:outline-none focus:border-[#0f2a4a] rounded-none appearance-none cursor-pointer font-medium"
              >
                {TIPOLOGIAS.map(tip => (
                  <option key={tip} value={tip}>{tip}</option>
                ))}
              </select>
            </div>
          </div>

          {/* LINHA 2: Armazém + Local de Trabalho + Validade (se Produto) + Taxa IVA */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-[#374151]">
                Armazém (Entrada em Stock)
              </label>
              <select
                value={armazemId}
                onChange={e => setArmazemId(e.target.value)}
                className="w-full bg-white border border-[#d1d5db] px-3 py-1.5 text-xs text-[#111827] focus:outline-none focus:border-[#0f2a4a] rounded-none appearance-none cursor-pointer"
              >
                <option value="">— Selecione o armazém —</option>
                {armazens.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name || a.nome || String(a.id)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-[#374151]">
                Local de Trabalho
              </label>
              <select
                value={localTrabalhoId}
                onChange={e => setLocalTrabalhoId(e.target.value)}
                className="w-full bg-white border border-[#d1d5db] px-3 py-1.5 text-xs text-[#111827] focus:outline-none focus:border-[#0f2a4a] rounded-none appearance-none cursor-pointer"
              >
                <option value="">— Selecione o local —</option>
                {locais.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.nome || l.name || String(l.id)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-[#374151]">
                Data de Validade {tipoArtigo === 'Produto' ? <span className="text-zinc-500 font-normal">(Produto)</span> : <span className="text-zinc-400 font-normal">(N/A)</span>}
              </label>
              <input
                type="date"
                disabled={tipoArtigo !== 'Produto'}
                value={dataValidade}
                onChange={e => setDataValidade(e.target.value)}
                className={`w-full border px-3 py-1.5 text-xs rounded-none ${
                  tipoArtigo === 'Produto'
                    ? 'bg-white border-[#d1d5db] text-[#111827] focus:outline-none focus:border-[#0f2a4a]'
                    : 'bg-zinc-100 border-zinc-200 text-zinc-400 cursor-not-allowed'
                }`}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-[#374151]">
                Taxa de IVA
              </label>
              <select
                value={taxRate}
                onChange={e => setTaxRate(Number(e.target.value))}
                className="w-full bg-white border border-[#d1d5db] px-3 py-1.5 text-xs text-[#111827] focus:outline-none focus:border-[#0f2a4a] rounded-none appearance-none cursor-pointer font-medium"
              >
                {TAXAS_IVA.map(t => (
                  <option key={t.rate} value={t.rate}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* LINHA 3: Quantidade + Unidade + Preço Unitário + Desconto (%) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-[#374151]">
                Quantidade <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={0.001}
                step="any"
                value={quantidade}
                onChange={e => setQuantidade(parseFloat(e.target.value) || 0)}
                className="w-full bg-white border border-[#d1d5db] px-3 py-1.5 text-xs text-[#111827] focus:outline-none focus:border-[#0f2a4a] rounded-none font-semibold text-right"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-[#374151]">
                Unidade
              </label>
              <div className="relative">
                <input
                  type="text"
                  list="unidades-list"
                  value={unidade}
                  onChange={e => setUnidade(e.target.value.toUpperCase())}
                  placeholder="UN"
                  className="w-full bg-white border border-[#d1d5db] px-3 py-1.5 text-xs text-[#111827] focus:outline-none focus:border-[#0f2a4a] rounded-none font-medium"
                />
                <datalist id="unidades-list">
                  {UNIDADES_PADRAO.map(u => (
                    <option key={u} value={u} />
                  ))}
                  {metrics.map(m => (
                    <option key={m.id} value={m.sigla || m.descricao} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-[#374151]">
                Preço Unitário (Kz) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={valorUnitario}
                onChange={e => setValorUnitario(parseFloat(e.target.value) || 0)}
                className="w-full bg-white border border-[#d1d5db] px-3 py-1.5 text-xs text-[#111827] focus:outline-none focus:border-[#0f2a4a] rounded-none font-mono font-semibold text-right"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-[#374151]">
                Desconto Linha (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  value={descontoLinha}
                  onChange={e => setDescontoLinha(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                  className="w-full bg-white border border-[#d1d5db] px-3 py-1.5 pr-6 text-xs text-[#111827] focus:outline-none focus:border-[#0f2a4a] rounded-none font-semibold text-right"
                />
                <Percent size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* LINHA 4: Rubrica / Plano de Contas PGC da Contabilidade */}
          <div className="space-y-1 relative">
            <label className="block text-[11px] font-bold text-[#374151]">
              Rubrica Contabilística (Conta PGC)
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Pesquise por código ou descrição da conta PGC (ex: 21 Compras, 62 Serviços)..."
                value={pgcSearch}
                onChange={e => {
                  setPgcSearch(e.target.value);
                  setShowPgcDropdown(true);
                  if (!e.target.value) {
                    setRubricaId('');
                    setRubricaLabel('');
                  }
                }}
                onFocus={() => setShowPgcDropdown(true)}
                className="w-full bg-white border border-[#d1d5db] px-3 py-1.5 text-xs text-[#111827] focus:outline-none focus:border-[#0f2a4a] rounded-none font-medium"
              />
              {showPgcDropdown && filteredPgcContas.length > 0 && (
                <div className="absolute z-50 bottom-full mb-1 left-0 right-0 bg-white border border-[#d1d5db] shadow-xl max-h-48 overflow-y-auto">
                  {filteredPgcContas.map(c => {
                    const cod = c.codigo || c.conta || '';
                    const label = `${cod} — ${c.descricao || ''}`;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        className="w-full text-left px-3 py-1.5 hover:bg-blue-50 text-xs border-b border-zinc-100 last:border-0"
                        onMouseDown={() => {
                          setRubricaId(c.id);
                          setRubricaLabel(label);
                          setPgcSearch(label);
                          setShowPgcDropdown(false);
                        }}
                      >
                        <span className="font-bold text-[#0f2a4a] mr-2">{cod}</span>
                        <span className="text-zinc-700">{c.descricao}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* LINHA 5: Aviso de Retenção na Fonte de Serviços (6,5%) */}
          {tipoArtigo === 'Serviço' && (
            <div className="bg-amber-50 border border-amber-300 px-3.5 py-2 flex items-center justify-between text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-800">
                  ⚖️ Retenção na Fonte (6,5% sobre Serviços):
                </span>
                <span className="font-mono font-black text-amber-900 text-sm">
                  {fmtNum(calculations.retencaoValor)} Kz
                </span>
              </div>
              <span className="text-[10px] text-amber-700 uppercase font-bold tracking-wider">
                Obrigatório por Lei Geral Tributária
              </span>
            </div>
          )}

          {/* Resumo Financeiro da Linha */}
          <div className="bg-[#f8fafc] border border-[#e2e8f0] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-zinc-500 text-[10px] uppercase font-bold block">Subtotal</span>
                <span className="font-mono font-bold text-zinc-800">{fmtNum(calculations.subtotal)} Kz</span>
              </div>
              <div>
                <span className="text-zinc-500 text-[10px] uppercase font-bold block">IVA ({taxRate}%)</span>
                <span className="font-mono font-bold text-zinc-800">{fmtNum(calculations.ivaVal)} Kz</span>
              </div>
              {tipoArtigo === 'Serviço' && (
                <div>
                  <span className="text-amber-600 text-[10px] uppercase font-bold block">Retenção (6,5%)</span>
                  <span className="font-mono font-bold text-amber-700">-{fmtNum(calculations.retencaoValor)} Kz</span>
                </div>
              )}
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-[#0f2a4a] block">Total da Linha</span>
              <span className="font-mono text-base font-black text-[#0f2a4a]">
                {fmtNum(calculations.totalLinha)} Kz
              </span>
            </div>
          </div>
        </div>

        {/* Rodapé com botões de acção */}
        <div className="px-5 py-3 bg-[#fafafa] border-t border-[#e5e7eb] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-zinc-600 hover:text-zinc-900 uppercase tracking-wider transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2 bg-[#0f2a4a] hover:bg-[#001f3f] text-white text-xs font-bold uppercase tracking-wider rounded-none shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Check size={14} />
            {initialItem ? 'Guardar Alterações' : 'Adicionar à Lista'}
          </button>
        </div>
      </div>
    </div>
  );
};
