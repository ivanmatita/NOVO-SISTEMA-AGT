/**
 * PurchaseItemModal.tsx
 * Painel lateral deslizante da direita para adicionar/editar bens e serviços
 * em documentos de compra — ajustado para visualização limpa e compacta sem rolagem.
 * Inclui:
 *  - Modal com largura expandida (max-w-[620px]);
 *  - Espaçamentos verticais compactos e confortáveis;
 *  - Seleção de Local de Trabalho com todas as descrições da BD;
 *  - Pesquisa completa de Rubrica PGC (todas as contas do PGC) com vínculo à contabilidade;
 *  - Calculadora de IVA flutuante e elegante na frente do formulário com botão de aplicação;
 *  - Remoção dos campos redundantes "Subtotal (sem IVA)" e "Valor IVA (0%)";
 *  - Retenção na Fonte 6,5% automática para Serviços.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Plus, Calculator, X, AlertCircle, Check } from 'lucide-react';

export interface PurchaseLineItem {
  uid: string;
  descricao: string;
  serial_number: string;
  data_validade: string;
  quantidade: number;
  unidade: string;
  valor_unitario: number;
  tipo_artigo: string;
  desconto_linha: number;
  tipologia_custo: string;
  armazem_id: string;
  local_trabalho_id: string;
  centro_custo_id: string;
  rubrica_id: string;
  rubrica_label: string;
  conta_pgc?: string;
  sujeito_imposto_selo: string;
  tax_id: string;
  tax_rate: number;
  tax_nome?: string;
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

interface ActiveTax {
  id: string | number;
  nome?: string;
  name?: string;
  taxa?: number | string;
  tipo?: string;
  codigo?: string;
}

interface PurchaseItemModalProps {
  isOpen: boolean;
  initialItem?: PurchaseLineItem | null;
  armazens: Armazem[];
  locais: LocalTrabalho[];
  pgcContas: PgcConta[];
  metrics?: Metric[];
  activeTaxes?: ActiveTax[];
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

const UNIDADES_PADRAO = [
  'QUANTIDADE (Qtd)',
  'UNIDADE (Un)',
  'KILOGRAMA (Kg)',
  'LITRO (Lt)',
  'METRO (m)',
  'METRO QUADRADO (m²)',
  'CAIXA (Cx)',
  'HORA (h)',
  'SERVIÇO (Serv)',
  'PACOTE (Pct)',
  'PAR (Par)',
  'TONELADA (t)',
];

const round2 = (n: number) => Math.round(n * 100) / 100;

const fmtKz = (v: number) =>
  v.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Kz';

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
  activeTaxes = [],
  onClose,
  onSave,
}) => {
  const [descricao, setDescricao] = useState('');
  const [tipoArtigo, setTipoArtigo] = useState('Produto');
  const [tipologiaCusto, setTipologiaCusto] = useState('Outros Bens de Consumo');
  const [armazemId, setArmazemId] = useState('');
  const [localTrabalhoId, setLocalTrabalhoId] = useState('');
  const [dataValidade, setDataValidade] = useState('');

  // Imposto
  const [taxId, setTaxId] = useState('');
  const [taxRate, setTaxRate] = useState<number>(14);
  const [taxNome, setTaxNome] = useState('IVA 14%');
  const [temIsencao, setTemIsencao] = useState(false);

  // Quantidade / Unidade / Preço / Desconto
  const [quantidade, setQuantidade] = useState<number>(1);
  const [unidade, setUnidade] = useState('QUANTIDADE (Qtd)');
  const [valorUnitario, setValorUnitario] = useState<number>(0);
  const [descontoLinha, setDescontoLinha] = useState<number>(0);

  // Rubrica PGC
  const [rubricaId, setRubricaId] = useState('');
  const [rubricaLabel, setRubricaLabel] = useState('');
  const [contaPgc, setContaPgc] = useState('');
  const [pgcSearch, setPgcSearch] = useState('');
  const [showPgcDropdown, setShowPgcDropdown] = useState(false);

  // Calculadora de IVA elegante
  const [showCalculadora, setShowCalculadora] = useState(false);
  const [calcComIva, setCalcComIva] = useState<string>('');
  const [calcSemIva, setCalcSemIva] = useState<string>('');

  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    if (initialItem) {
      setDescricao(initialItem.descricao || '');
      setTipoArtigo(initialItem.tipo_artigo || 'Produto');
      setTipologiaCusto(initialItem.tipologia_custo || 'Outros Bens de Consumo');
      setArmazemId(initialItem.armazem_id || '');
      setLocalTrabalhoId(initialItem.local_trabalho_id || '');
      setDataValidade(initialItem.data_validade || '');
      setTaxId(initialItem.tax_id || '');
      setTaxRate(initialItem.tax_rate ?? 14);
      setTaxNome(initialItem.tax_nome || 'IVA 14%');
      setTemIsencao(initialItem.tax_rate === 0);
      setQuantidade(initialItem.quantidade || 1);
      setUnidade(initialItem.unidade || 'QUANTIDADE (Qtd)');
      setValorUnitario(initialItem.valor_unitario || 0);
      setDescontoLinha(initialItem.desconto_linha || 0);
      setRubricaId(initialItem.rubrica_id || '');
      setRubricaLabel(initialItem.rubrica_label || '');
      setContaPgc(initialItem.conta_pgc || (initialItem.rubrica_label?.split('—')[0]?.trim() || ''));
      setPgcSearch(initialItem.rubrica_label || '');
    } else {
      setDescricao('');
      setTipoArtigo('Produto');
      setTipologiaCusto('Outros Bens de Consumo');
      setArmazemId(armazens.length > 0 ? armazens[0].id : '');
      setLocalTrabalhoId(locais.length > 0 ? locais[0].id : '');
      setDataValidade('');
      const defTax = activeTaxes.length > 0 ? activeTaxes[0] : null;
      setTaxId(defTax ? String(defTax.id) : '');
      setTaxRate(defTax ? Number(defTax.taxa) : 14);
      setTaxNome(defTax ? `${defTax.nome || defTax.name} (${defTax.taxa}%)` : 'IVA 14%');
      setTemIsencao(false);
      setQuantidade(1);
      setUnidade('QUANTIDADE (Qtd)');
      setValorUnitario(0);
      setDescontoLinha(0);
      setRubricaId('');
      setRubricaLabel('');
      setContaPgc('');
      setPgcSearch('');
    }
    setError('');
    setShowPgcDropdown(false);
    setShowCalculadora(false);
    setCalcComIva('');
    setCalcSemIva('');
  }, [isOpen, initialItem]);

  const handleTipoArtigoChange = (tipo: string) => {
    setTipoArtigo(tipo);
    if (tipo === 'Serviço') {
      setTipologiaCusto('Serviços');
      setDataValidade('');
    } else if (tipo === 'Produto' && tipologiaCusto === 'Serviços') {
      setTipologiaCusto('Existência de Inventário');
    }
  };

  const handleSelectTax = (tax: ActiveTax) => {
    const taxa = Number(tax.taxa ?? 0);
    setTaxId(String(tax.id));
    setTaxRate(taxa);
    setTaxNome(`${tax.nome || tax.name} (${taxa}%)`);
    setTemIsencao(taxa === 0);
  };

  const calcs = useMemo(() => {
    const q = Math.max(0, Number(quantidade) || 0);
    const vu = Math.max(0, Number(valorUnitario) || 0);
    const descPct = Math.min(100, Math.max(0, Number(descontoLinha) || 0));
    const taxaPct = temIsencao ? 0 : Number(taxRate || 0);

    const base = round2(q * vu);
    const descVal = round2(base * (descPct / 100));
    const subtotal = round2(base - descVal);
    const iva = round2(subtotal * (taxaPct / 100));
    const totalLinha = round2(subtotal + iva);

    const isServico = tipoArtigo === 'Serviço';
    const retencaoTaxa = isServico ? 6.5 : 0;
    const retencaoValor = isServico ? round2(subtotal * 0.065) : 0;

    return { base, descVal, subtotal, iva, totalLinha, retencaoTaxa, retencaoValor, taxaPct };
  }, [quantidade, valorUnitario, descontoLinha, taxRate, temIsencao, tipoArtigo]);

  // Calculadora
  const handleCalcComIva = (val: string) => {
    setCalcComIva(val);
    const vCom = parseFloat(val.replace(/\./g, '').replace(',', '.')) || 0;
    const vSem = calcs.taxaPct > 0 ? round2(vCom / (1 + calcs.taxaPct / 100)) : vCom;
    setCalcSemIva(vSem > 0 ? fmtNum(vSem) : '');
  };

  const handleCalcSemIva = (val: string) => {
    setCalcSemIva(val);
    const vSem = parseFloat(val.replace(/\./g, '').replace(',', '.')) || 0;
    const vCom = round2(vSem * (1 + calcs.taxaPct / 100));
    setCalcComIva(vCom > 0 ? fmtNum(vCom) : '');
  };

  const handleAplicarCalc = () => {
    const vSem = parseFloat(calcSemIva.replace(/\./g, '').replace(',', '.')) || 0;
    if (vSem > 0) {
      setValorUnitario(vSem);
      setShowCalculadora(false);
      setCalcComIva('');
      setCalcSemIva('');
    }
  };

  const filteredPgc = useMemo(() => {
    const t = pgcSearch.trim().toLowerCase();
    if (!t) return pgcContas.slice(0, 50);
    return pgcContas
      .filter(c => {
        const cod = (c.codigo || c.conta || '').toLowerCase();
        const desc = (c.descricao || '').toLowerCase();
        return cod.includes(t) || desc.includes(t);
      })
      .slice(0, 50);
  }, [pgcContas, pgcSearch]);

  const unidadesDisponiveis = useMemo(() => {
    const dbUnidades = metrics.map(m => {
      const sigla = m.sigla || '';
      const desc = m.descricao || '';
      return sigla ? `${desc.toUpperCase()} (${sigla})` : desc.toUpperCase();
    }).filter(Boolean);
    const combined = [...UNIDADES_PADRAO];
    dbUnidades.forEach(u => {
      if (!combined.includes(u)) combined.push(u);
    });
    return combined;
  }, [metrics]);

  const handleSave = () => {
    if (!descricao.trim()) {
      setError('A descrição do bem ou serviço é obrigatória.');
      return;
    }
    if (!tipoArtigo) {
      setError('Selecione o tipo de artigo.');
      return;
    }
    if (!localTrabalhoId && locais.length > 0) {
      setError('Selecione o local de trabalho.');
      return;
    }
    if (quantidade <= 0) {
      setError('A quantidade deve ser maior que zero.');
      return;
    }

    const item: PurchaseLineItem = {
      uid: initialItem?.uid || Math.random().toString(36).substring(2, 10),
      descricao: descricao.trim(),
      serial_number: initialItem?.serial_number || '',
      data_validade: tipoArtigo === 'Produto' ? dataValidade : '',
      quantidade: Number(quantidade),
      unidade: unidade || 'UN',
      valor_unitario: round2(Number(valorUnitario)),
      tipo_artigo: tipoArtigo,
      desconto_linha: round2(Number(descontoLinha) || 0),
      tipologia_custo: tipologiaCusto,
      armazem_id: armazemId,
      local_trabalho_id: localTrabalhoId,
      centro_custo_id: localTrabalhoId,
      rubrica_id: rubricaId,
      rubrica_label: rubricaLabel,
      conta_pgc: contaPgc || (rubricaLabel.split('—')[0]?.trim() || ''),
      sujeito_imposto_selo: 'Não sujeita',
      tax_id: taxId,
      tax_rate: calcs.taxaPct,
      tax_nome: taxNome,
      retencao_fonte_taxa: calcs.retencaoTaxa,
      retencao_fonte_valor: calcs.retencaoValor,
      subtotal: calcs.subtotal,
      total_linha: calcs.totalLinha,
    };

    onSave(item);
    onClose();
  };

  const handleClear = () => {
    setDescricao('');
    setTipoArtigo('Produto');
    setTipologiaCusto('Outros Bens de Consumo');
    setArmazemId('');
    setLocalTrabalhoId('');
    setDataValidade('');
    setQuantidade(1);
    setUnidade('QUANTIDADE (Qtd)');
    setValorUnitario(0);
    setDescontoLinha(0);
    setRubricaId('');
    setRubricaLabel('');
    setContaPgc('');
    setPgcSearch('');
    setError('');
    setShowCalculadora(false);
    setCalcComIva('');
    setCalcSemIva('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex justify-end items-stretch">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-zinc-900/50 backdrop-blur-xs"
        onClick={onClose}
      />

      {/* Painel lateral com largura aumentada para acomodar todos os campos de forma equilibrada */}
      <div className="relative bg-white w-full max-w-[620px] h-full shadow-2xl flex flex-col border-l border-zinc-200">

        {/* ── CABEÇALHO ── */}
        <div className="px-5 py-3 border-b border-zinc-200 flex items-center justify-between bg-white flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="text-zinc-600 hover:text-zinc-900 transition-colors p-1"
              title="Voltar"
            >
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-[16px] font-bold text-[#0f2a4a] tracking-tight">
              {initialItem ? 'Editar Bem ou Serviço' : 'Adicionar Bem ou Serviço'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold rounded-none transition-colors"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-1.5 bg-[#0f2a4a] hover:bg-[#001f3f] text-white text-xs font-bold rounded-none shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Check size={14} />
              <span>{initialItem ? 'Atualizar' : 'Adicionar'}</span>
            </button>
          </div>
        </div>

        {/* Alerta de erro */}
        {error && (
          <div className="px-5 py-1.5 bg-red-50 border-b border-red-200 flex items-center gap-2 flex-shrink-0">
            <AlertCircle size={13} className="text-red-500 shrink-0" />
            <span className="text-[11px] text-red-700 font-semibold">{error}</span>
          </div>
        )}

        {/* ── MODAL CALCULADORA DE IVA FLUTUANTE NA FRENTE DO FORMULÁRIO ── */}
        {showCalculadora && (
          <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border-2 border-[#0f2a4a] shadow-2xl w-full max-w-sm rounded-none p-4 space-y-3 animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2 text-[#0f2a4a]">
                  <Calculator size={16} />
                  <h3 className="text-xs font-bold uppercase tracking-wider">
                    Calculadora de IVA ({calcs.taxaPct}%)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCalculadora(false)}
                  className="text-zinc-400 hover:text-zinc-700"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-2.5">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-zinc-700 uppercase">
                    Valor Com IVA (Kz)
                  </label>
                  <input
                    type="text"
                    autoFocus
                    value={calcComIva}
                    onChange={e => handleCalcComIva(e.target.value)}
                    placeholder="Ex: 114,00"
                    className="w-full border border-zinc-300 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-800 focus:outline-none focus:border-[#0f2a4a] rounded-none text-right font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-zinc-700 uppercase">
                    Valor Sem IVA (Kz)
                  </label>
                  <input
                    type="text"
                    value={calcSemIva}
                    onChange={e => handleCalcSemIva(e.target.value)}
                    placeholder="Ex: 100,00"
                    className="w-full border border-zinc-300 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-800 focus:outline-none focus:border-[#0f2a4a] rounded-none text-right font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowCalculadora(false)}
                  className="px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-900 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAplicarCalc}
                  className="px-4 py-1.5 bg-[#0f2a4a] hover:bg-[#001f3f] text-white text-xs font-bold uppercase tracking-wider rounded-none transition-colors"
                >
                  Aplicar ao Preço
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── CORPO COM ESPAÇAMENTO VERTICAL OTIMIZADO E SEM SCROLLBAR VISÍVEL ── */}
        <div
          className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5 text-zinc-800"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >

          {/* LINHA 1: Tipo de Artigo + Quantidade */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-700">
                Tipo de Artigo <span className="text-red-500">*</span>
              </label>
              <select
                value={tipoArtigo}
                onChange={e => handleTipoArtigoChange(e.target.value)}
                className="w-full bg-white border border-zinc-300 px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-[#0f2a4a] rounded-none font-medium"
              >
                {TIPOS_ARTIGO.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-700">
                Quantidade <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0.001"
                step="any"
                value={quantidade}
                onChange={e => setQuantidade(parseFloat(e.target.value) || 0)}
                className="w-full bg-white border border-zinc-300 px-2.5 py-1.5 text-xs font-semibold text-zinc-800 focus:outline-none focus:border-[#0f2a4a] rounded-none text-right"
              />
            </div>
          </div>

          {/* LINHA 2: Descrição */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-zinc-700">
              Descrição do Bem ou Serviço <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <textarea
                rows={2}
                maxLength={300}
                autoFocus
                value={descricao}
                onChange={e => { setDescricao(e.target.value); if (error) setError(''); }}
                placeholder="Informe a descrição detalhada do produto ou serviço..."
                className="w-full bg-white border border-zinc-300 rounded-none p-2.5 text-xs text-zinc-800 focus:outline-none focus:border-[#0f2a4a] resize-none"
              />
              <span className="absolute bottom-1.5 right-2 text-[9px] text-zinc-400 font-mono">
                {descricao.length}/300
              </span>
            </div>
          </div>

          {/* LINHA 3: Unidade de medida (largura compacta) + Preço Unitário */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-700">
                Unidade de medida <span className="text-red-500">*</span>
              </label>
              <select
                value={unidade}
                onChange={e => setUnidade(e.target.value)}
                className="w-full bg-white border border-zinc-300 px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-[#0f2a4a] rounded-none"
              >
                {unidadesDisponiveis.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-700">
                Preço Unitário (sem impostos) <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-1">
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={valorUnitario || ''}
                  onChange={e => setValorUnitario(parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                  className="flex-1 bg-white border border-zinc-300 px-2.5 py-1.5 text-xs font-semibold text-zinc-800 focus:outline-none focus:border-[#0f2a4a] rounded-none text-right font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowCalculadora(v => !v)}
                  title="Abrir Calculadora de IVA"
                  className={`px-2 border transition-colors flex items-center justify-center ${
                    showCalculadora
                      ? 'bg-[#0f2a4a] text-white border-[#0f2a4a]'
                      : 'bg-zinc-100 text-zinc-700 border-zinc-300 hover:bg-zinc-200'
                  }`}
                >
                  <Calculator size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* LINHA 4: Desconto Linha (%) (largura compacta) + Preço com desconto */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-700">Desconto Linha (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={descontoLinha || ''}
                onChange={e => setDescontoLinha(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                placeholder="0"
                className="w-full bg-white border border-zinc-300 px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-[#0f2a4a] rounded-none text-right"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-700">Preço com Desconto (Kz)</label>
              <input
                type="text"
                readOnly
                value={fmtKz(calcs.subtotal / Math.max(1, quantidade))}
                className="w-full bg-zinc-100 border border-zinc-200 px-2.5 py-1.5 text-xs font-semibold text-zinc-600 rounded-none cursor-default font-mono"
              />
            </div>
          </div>

          {/* LINHA 5: Tipologia + Armazém */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-700">
                Tipologia <span className="text-red-500">*</span>
              </label>
              <select
                value={tipologiaCusto}
                onChange={e => setTipologiaCusto(e.target.value)}
                className="w-full bg-white border border-zinc-300 px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-[#0f2a4a] rounded-none"
              >
                {TIPOLOGIAS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-700">Armazém (Entrada em Stock)</label>
              <select
                value={armazemId}
                onChange={e => setArmazemId(e.target.value)}
                className="w-full bg-white border border-zinc-300 px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-[#0f2a4a] rounded-none"
              >
                <option value="">— Sem armazém —</option>
                {armazens.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name || a.nome || String(a.id)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* LINHA 6: Local de Trabalho + Data Validade */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-700">
                Local de Trabalho <span className="text-red-500">*</span>
              </label>
              <select
                value={localTrabalhoId}
                onChange={e => setLocalTrabalhoId(e.target.value)}
                className="w-full bg-white border border-zinc-300 px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-[#0f2a4a] rounded-none"
              >
                <option value="">— Selecione o local de trabalho —</option>
                {locais.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.nome || l.name || String(l.id)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-700">
                Data de Validade {tipoArtigo !== 'Produto' && <span className="text-zinc-400 font-normal text-[10px]">(apenas Produto)</span>}
              </label>
              <input
                type="date"
                disabled={tipoArtigo !== 'Produto'}
                value={dataValidade}
                onChange={e => setDataValidade(e.target.value)}
                className={`w-full border px-2.5 py-1.5 text-xs rounded-none ${
                  tipoArtigo === 'Produto'
                    ? 'bg-white border-zinc-300 text-zinc-800 focus:outline-none focus:border-[#0f2a4a]'
                    : 'bg-zinc-100 border-zinc-200 text-zinc-400 cursor-not-allowed'
                }`}
              />
            </div>
          </div>

          {/* LINHA 7: Taxa de Imposto (Taxas e Impostos da Base de Dados) - Compacta */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-zinc-700">
              Taxa de Imposto <span className="text-red-500">*</span>
            </label>
            {activeTaxes.length > 0 ? (
              <select
                value={taxId}
                onChange={e => {
                  const t = activeTaxes.find(tax => String(tax.id) === e.target.value);
                  if (t) handleSelectTax(t);
                }}
                className="w-full bg-white border border-zinc-300 px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-[#0f2a4a] rounded-none"
              >
                <option value="">— Selecione a taxa de imposto —</option>
                {activeTaxes.map(tax => (
                  <option key={tax.id} value={String(tax.id)}>
                    {tax.nome || tax.name} ({tax.taxa}%) {tax.tipo ? `— ${tax.tipo}` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={taxRate}
                onChange={e => {
                  const r = Number(e.target.value);
                  setTaxRate(r);
                  setTemIsencao(r === 0);
                  setTaxNome(r === 14 ? 'IVA 14%' : r === 7 ? 'IVA 7%' : r === 0 ? 'Isento (0%)' : `IVA ${r}%`);
                }}
                className="w-full bg-white border border-zinc-300 px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-[#0f2a4a] rounded-none"
              >
                <option value={14}>IVA (14%) — Taxa Normal</option>
                <option value={7}>IVA (7%) — Taxa Reduzida</option>
                <option value={5}>IVA (5%) — Regime Simplificado</option>
                <option value={0}>Isento (0%)</option>
                <option value={1}>IS (1%) — Imposto de Selo</option>
              </select>
            )}
          </div>

          {/* LINHA 8: Rubrica PGC (todas contas da página PGC - Plano Geral de Contas) */}
          <div className="space-y-1 relative">
            <label className="text-[11px] font-bold text-zinc-700">
              Rubrica Contabilística (Conta PGC)
            </label>
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
                  setContaPgc('');
                }
              }}
              onFocus={() => setShowPgcDropdown(true)}
              onBlur={() => setTimeout(() => setShowPgcDropdown(false), 200)}
              className="w-full bg-white border border-zinc-300 px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-[#0f2a4a] rounded-none"
            />
            {showPgcDropdown && filteredPgc.length > 0 && (
              <div className="absolute z-50 bottom-full mb-1 left-0 right-0 bg-white border border-zinc-300 shadow-xl max-h-48 overflow-y-auto">
                {filteredPgc.map(c => {
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
                        setContaPgc(cod);
                        setPgcSearch(label);
                        setShowPgcDropdown(false);
                      }}
                    >
                      <span className="font-bold text-[#0f2a4a] mr-2">{cod}</span>
                      <span className="text-zinc-600">{c.descricao}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* RETENÇÃO NA FONTE 6,5% AUTOMÁTICA PARA SERVIÇOS */}
          {tipoArtigo === 'Serviço' && (
            <div className="bg-amber-50 border border-amber-300 p-2.5 space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-800">
                  ⚖️ Retenção na Fonte (6,5% sobre Serviços)
                </span>
                <span className="text-xs font-black text-amber-900 font-mono">
                  -{fmtKz(calcs.retencaoValor)}
                </span>
              </div>
              <p className="text-[10px] text-amber-700">
                Obrigatório por Lei Geral Tributária — calculado sobre a base sem IVA.
              </p>
            </div>
          )}

          {/* TOTAL DA LINHA EM DESTAQUE */}
          <div className="bg-[#0f2a4a] text-white px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider">Total da Linha</span>
            <span className="text-base font-black font-mono">{fmtKz(calcs.totalLinha)}</span>
          </div>

          {/* BOTÃO ADICIONAR AO DOCUMENTO */}
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleSave}
              className="w-full py-2 bg-[#0f2a4a] hover:bg-[#001f3f] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 rounded-none shadow-sm transition-colors"
            >
              <Plus size={14} /> Adicionar à lista de compras
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PurchaseItemModal;
