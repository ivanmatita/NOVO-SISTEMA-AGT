import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';

export interface AgtItemData {
  id?: string | number;
  product_id?: string | number;
  tipo_operacao?: string;
  quantity: number;
  description: string;
  referencia?: string;
  unidade_medida?: string;
  unit_price: number;
  desconto?: number;
  preco_com_desconto?: number;
  valor_credito?: number;
  has_imposto: boolean;
  imposto_tab?: 'impostos' | 'retencoes';
  tipo_imposto?: string;
  tem_isencao: boolean;
  codigo_imposto?: string;
  taxa_imposto: number;
  valor_imposto: number;
  total: number;
  tax_applied_label?: string;
}

interface AgtItemModalProps {
  isOpen: boolean;
  initialItem?: AgtItemData | null;
  products?: any[];
  activeTaxes?: any[];
  onClose: () => void;
  onSave: (item: AgtItemData) => void;
}

export const AgtItemModal: React.FC<AgtItemModalProps> = ({
  isOpen,
  initialItem,
  products = [],
  activeTaxes = [],
  onClose,
  onSave
}) => {
  const [tipoOperacao, setTipoOperacao] = useState(initialItem?.tipo_operacao || 'IS (1%)');
  const [quantity, setQuantity] = useState<number>(initialItem?.quantity || 1);
  const [description, setDescription] = useState(initialItem?.description || '');
  const [unidadeMedida, setUnidadeMedida] = useState(initialItem?.unidade_medida || 'QUANTIDADE (Qtd)');
  const [unitPrice, setUnitPrice] = useState<number>(initialItem?.unit_price || 0);
  const [desconto, setDesconto] = useState<number>(initialItem?.desconto || 0);
  const [valorCredito, setValorCredito] = useState<number>(initialItem?.valor_credito || 0);
  const [hasImposto, setHasImposto] = useState<boolean>(initialItem?.has_imposto ?? true);
  const [activeTab, setActiveTab] = useState<'impostos' | 'retencoes'>('impostos');
  const [tipoImposto, setTipoImposto] = useState(initialItem?.tipo_imposto || 'IS');
  const [temIsencao, setTemIsencao] = useState<boolean>(initialItem?.tem_isencao || false);
  const [codigoImposto, setCodigoImposto] = useState(initialItem?.codigo_imposto || 'IS_1');
  const [taxaImposto, setTaxaImposto] = useState<number>(initialItem?.taxa_imposto ?? 1);

  useEffect(() => {
    if (initialItem) {
      setTipoOperacao(initialItem.tipo_operacao || 'IS (1%)');
      setQuantity(initialItem.quantity || 1);
      setDescription(initialItem.description || '');
      setUnidadeMedida(initialItem.unidade_medida || 'QUANTIDADE (Qtd)');
      setUnitPrice(initialItem.unit_price || 0);
      setDesconto(initialItem.desconto || 0);
      setValorCredito(initialItem.valor_credito || 0);
      setHasImposto(initialItem.has_imposto ?? true);
      setTipoImposto(initialItem.tipo_imposto || 'IS');
      setTemIsencao(initialItem.tem_isencao || false);
      setCodigoImposto(initialItem.codigo_imposto || 'IS_1');
      setTaxaImposto(initialItem.taxa_imposto ?? 1);
    } else {
      handleClear();
    }
  }, [initialItem, isOpen]);

  const handleClear = () => {
    setTipoOperacao('IS (1%)');
    setQuantity(1);
    setDescription('');
    setUnidadeMedida('QUANTIDADE (Qtd)');
    setUnitPrice(0);
    setDesconto(0);
    setValorCredito(0);
    setHasImposto(true);
    setActiveTab('impostos');
    setTipoImposto('IS');
    setTemIsencao(false);
    setCodigoImposto('IS_1');
    setTaxaImposto(1);
  };

  if (!isOpen) return null;

  // Calculos
  const precoComDesconto = Math.max(0, unitPrice * (1 - (desconto / 100)));
  const subtotalSemImposto = precoComDesconto * quantity;
  const currentTaxa = hasImposto ? (temIsencao ? 0 : taxaImposto) : 0;
  const valorImpostoCalculado = (subtotalSemImposto * currentTaxa) / 100;
  const totalItem = subtotalSemImposto + valorImpostoCalculado;

  const getTaxLabel = () => {
    if (!hasImposto) return 'Sem imposto';
    if (temIsencao) return 'Isento (0%)';
    if (tipoImposto === 'IS') return `IS (${taxaImposto}%)`;
    if (tipoImposto === 'IVA') return `IVA (${taxaImposto}%)`;
    return `${tipoImposto} (${taxaImposto}%)`;
  };

  const handleSelectTipoImposto = (tipo: string) => {
    setTipoImposto(tipo);
    if (tipo === 'IS') {
      setTaxaImposto(1);
      setCodigoImposto('IS_1');
    } else if (tipo === 'IVA') {
      setTaxaImposto(14);
      setCodigoImposto('IVA_14');
    } else {
      setTaxaImposto(0);
      setCodigoImposto('ISENTO');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      alert('Por favor insira a descrição do produto ou serviço.');
      return;
    }

    const item: AgtItemData = {
      id: initialItem?.id,
      product_id: initialItem?.product_id,
      tipo_operacao: tipoOperacao,
      quantity: Number(quantity) || 1,
      description: description.trim(),
      unidade_medida: unidadeMedida,
      unit_price: Number(unitPrice) || 0,
      desconto: Number(desconto) || 0,
      preco_com_desconto: precoComDesconto,
      valor_credito: Number(valorCredito) || 0,
      has_imposto: hasImposto,
      imposto_tab: activeTab,
      tipo_imposto: tipoImposto,
      tem_isencao: temIsencao,
      codigo_imposto: codigoImposto,
      taxa_imposto: currentTaxa,
      valor_imposto: valorImpostoCalculado,
      total: totalItem,
      tax_applied_label: getTaxLabel()
    };

    onSave(item);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[300] flex justify-end items-stretch bg-zinc-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col border-l border-zinc-200 animate-in slide-in-from-right duration-200">
        
        {/* Header matching FORM 2.PNG */}
        <div className="p-6 border-b border-zinc-200 flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="text-zinc-600 hover:text-zinc-900 transition-colors p-1"
            >
              <ArrowLeft size={22} />
            </button>
            <h2 className="text-xl font-bold text-[#0f2a4a] tracking-tight">
              {initialItem ? 'Editar Bem ou Serviço' : 'Adicionar Bem ou Serviço'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClear}
              className="px-6 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-semibold rounded-none transition-colors"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-6 py-2 bg-[#0f2a4a] hover:bg-[#001f3f] text-white text-sm font-bold rounded-none shadow-md transition-colors"
            >
              Adicionar
            </button>
          </div>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6 flex-1 overflow-y-auto text-zinc-800">
          
          {/* Row 1: Tipo de Operação & Quantidade */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-700">
                Tipo de Operação <span className="text-red-500">*</span>
              </label>
              <select
                value={tipoOperacao}
                onChange={(e) => {
                  setTipoOperacao(e.target.value);
                  if (e.target.value.includes('IVA')) {
                    handleSelectTipoImposto('IVA');
                  } else if (e.target.value.includes('IS')) {
                    handleSelectTipoImposto('IS');
                  }
                }}
                className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2.5 text-sm text-zinc-800 focus:outline-none focus:border-[#0f2a4a]"
              >
                <option value="IS (1%)">IS (1%) - Imposto de Selo</option>
                <option value="IVA (14%)">IVA (14%) - Taxa Geral</option>
                <option value="IVA (7%)">IVA (7%) - Taxa Reduzida</option>
                <option value="Isenção Artigo 12.º">Isenção Artigo 12.º (Lei do IVA)</option>
                <option value="Prestação de Serviços">Prestação de Serviços</option>
                <option value="Transmissão de Bens">Transmissão de Bens</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-700">
                Quantidade <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(0, Number(e.target.value)))}
                className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2.5 text-sm font-semibold text-zinc-800 focus:outline-none focus:border-[#0f2a4a]"
                required
              />
            </div>
          </div>

          {/* Row 2: Descrição */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-700">
              Descrição <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <textarea
                rows={3}
                maxLength={200}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Informe a descrição do produto ou serviço..."
                className="w-full bg-white border border-zinc-300 rounded-none p-4 text-sm text-zinc-800 focus:outline-none focus:border-[#0f2a4a] resize-none"
                required
              />
              <span className="absolute bottom-2 right-3 text-[11px] text-zinc-400 font-mono">
                {description.length}/200
              </span>
            </div>
          </div>

          {/* Row 3: Unidade de medida & Preço unitário */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-700">
                Unidade de medida <span className="text-red-500">*</span>
              </label>
              <select
                value={unidadeMedida}
                onChange={(e) => setUnidadeMedida(e.target.value)}
                className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2.5 text-sm text-zinc-800 focus:outline-none focus:border-[#0f2a4a]"
              >
                <option value="QUANTIDADE (Qtd)">QUANTIDADE (Qtd)</option>
                <option value="UNIDADE (Un)">UNIDADE (Un)</option>
                <option value="KILOGRAMA (Kg)">KILOGRAMA (Kg)</option>
                <option value="METRO (m)">METRO (m)</option>
                <option value="CAIXA (Cx)">CAIXA (Cx)</option>
                <option value="HORAS (h)">HORAS (h)</option>
                <option value="SERVIÇO (Serv)">SERVIÇO (Serv)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-700">
                Preço unitário (sem impostos e descontos) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                value={unitPrice || ''}
                onChange={(e) => setUnitPrice(Math.max(0, Number(e.target.value)))}
                placeholder="Informe o preço unitário (sem impostos e descon..."
                className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2.5 text-sm font-semibold text-zinc-800 focus:outline-none focus:border-[#0f2a4a]"
                required
              />
            </div>
          </div>

          {/* Row 4: Preço unitário com descontos & Valor do crédito */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-700">
                Preço unitário com descontos (sem imposto)
              </label>
              <input
                type="text"
                readOnly
                value={`${precoComDesconto.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kz`}
                className="w-full bg-zinc-100 border border-zinc-200 rounded-none px-4 py-2.5 text-sm font-semibold text-zinc-600 cursor-not-allowed"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-700">
                Valor do crédito
              </label>
              <input
                type="number"
                step="any"
                value={valorCredito || ''}
                onChange={(e) => setValorCredito(Number(e.target.value))}
                placeholder="0.00"
                className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2.5 text-sm text-zinc-800 focus:outline-none focus:border-[#0f2a4a]"
              />
            </div>
          </div>

          {/* Row 5: Toggle Imposto */}
          <div className="pt-2 flex items-center gap-4">
            <button
              type="button"
              onClick={() => setHasImposto(!hasImposto)}
              className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 flex items-center ${
                hasImposto ? 'bg-[#0f2a4a]' : 'bg-zinc-300'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                  hasImposto ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
            <div>
              <p className="text-sm font-bold text-zinc-800">Imposto</p>
              <p className="text-xs text-zinc-400">Clique aqui para remover os impostos</p>
            </div>
          </div>

          {/* Section: Impostos / Retenções Tabs */}
          {hasImposto && (
            <div className="space-y-6 pt-4 border-t border-zinc-200">
              
              {/* Tab Header */}
              <div className="flex border-b border-zinc-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('impostos')}
                  className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 transition-colors relative ${
                    activeTab === 'impostos'
                      ? 'text-[#0f2a4a] border-b-2 border-[#0f2a4a]'
                      : 'text-zinc-400 hover:text-zinc-600'
                  }`}
                >
                  Impostos
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('retencoes')}
                  className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 transition-colors relative ${
                    activeTab === 'retencoes'
                      ? 'text-[#0f2a4a] border-b-2 border-[#0f2a4a]'
                      : 'text-zinc-400 hover:text-zinc-600'
                  }`}
                >
                  Retenções
                </button>
              </div>

              {activeTab === 'impostos' && (
                <div className="space-y-6">
                  
                  {/* Tipo de Imposto & Isenção */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-700">
                        Tipo de imposto <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={tipoImposto}
                        onChange={(e) => handleSelectTipoImposto(e.target.value)}
                        className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2.5 text-sm text-zinc-800 focus:outline-none focus:border-[#0f2a4a]"
                      >
                        <option value="IS">IS - Imposto de Selo</option>
                        <option value="IVA">IVA - Imposto sobre o Valor Acrescentado</option>
                        <option value="NS">NS - Não Sujeito</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-700">Tem isenção</label>
                      <div className="flex items-center gap-6 pt-2">
                        <label className="flex items-center gap-2 text-sm text-zinc-800 cursor-pointer font-medium">
                          <input
                            type="radio"
                            name="isencao"
                            checked={!temIsencao}
                            onChange={() => setTemIsencao(false)}
                            className="w-4 h-4 text-[#0f2a4a] focus:ring-[#0f2a4a]"
                          />
                          Não
                        </label>
                        <label className="flex items-center gap-2 text-sm text-zinc-800 cursor-pointer font-medium">
                          <input
                            type="radio"
                            name="isencao"
                            checked={temIsencao}
                            onChange={() => setTemIsencao(true)}
                            className="w-4 h-4 text-[#0f2a4a] focus:ring-[#0f2a4a]"
                          />
                          Sim
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Código de imposto & Taxa fixo */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-700">
                        Código de imposto, Rubrica IS, Código Pautal <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={codigoImposto}
                        onChange={(e) => {
                          setCodigoImposto(e.target.value);
                          if (e.target.value === 'IS_1') setTaxaImposto(1);
                          if (e.target.value === 'IVA_14') setTaxaImposto(14);
                          if (e.target.value === 'IVA_7') setTaxaImposto(7);
                          if (e.target.value === 'ISENTO') setTaxaImposto(0);
                        }}
                        className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2.5 text-sm text-zinc-800 focus:outline-none focus:border-[#0f2a4a]"
                      >
                        <option value="IS_1">IS (1%) - Recibos e Facturas</option>
                        <option value="IVA_14">IVA (14%) - Taxa Geral AGT</option>
                        <option value="IVA_7">IVA (7%) - Taxa Reduzida</option>
                        <option value="M00">M00 - Registo de Isenção Artigo 12.º</option>
                        <option value="M02">M02 - Transmissão de Bens Isenta</option>
                        <option value="M04">M04 - Prestação de Serviços Isenta</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-700">Taxa/Valor fixo</label>
                      <input
                        type="number"
                        value={taxaImposto}
                        onChange={(e) => setTaxaImposto(Number(e.target.value))}
                        className="w-full bg-zinc-100 border border-zinc-200 rounded-none px-4 py-2.5 text-sm font-semibold text-zinc-700"
                        readOnly={temIsencao}
                      />
                    </div>
                  </div>

                  {/* Valor do Imposto */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-700">Valor do imposto</label>
                    <input
                      type="text"
                      readOnly
                      value={`${valorImpostoCalculado.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kz`}
                      className="w-full bg-zinc-100 border border-zinc-200 rounded-none px-4 py-2.5 text-sm font-semibold text-zinc-700 cursor-not-allowed"
                    />
                  </div>

                  {/* Botão Adicionar Imposto */}
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => alert(`Imposto ${getTaxLabel()} aplicado com sucesso.`)}
                      className="border border-[#0f2a4a] text-[#0f2a4a] hover:bg-[#0f2a4a] hover:text-white px-5 py-2 font-bold text-xs flex items-center gap-2 rounded-none transition-colors"
                    >
                      <Plus size={16} /> Adicionar imposto
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'retencoes' && (
                <div className="p-4 bg-zinc-50 border border-zinc-200 text-xs text-zinc-600 space-y-2">
                  <p className="font-bold text-[#0f2a4a]">Retenções na Fonte (IRT / II)</p>
                  <p>Sem retenção adicional configurada para este artigo.</p>
                </div>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
