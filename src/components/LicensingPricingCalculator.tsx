import React, { useState, useMemo } from 'react';
import { ArrowRight, Check, ShieldCheck, Sparkles, Building2, HelpCircle } from 'lucide-react';

export interface LicensePlan {
  id: string;
  name: string;
  faturacao: string;
  funcionarios: string;
  basePriceAnual: number; // Preço base bruto sem desconto (com redução de 10.000 Kz)
  anuidadeExibida: string; // Valor final anual com desconto 40% e IVA 14%
  precoMensal: string; // Valor mensal
  precoTrimestral: string; // Valor trimestral (em 2 ou 4 parcelas)
  desc: string;
  features: string[];
  isPopular?: boolean;
}

export interface SpecialModule {
  id: string;
  name: string;
  basePriceAnual: number; // Preço base bruto
  anuidadeExibida: string; // Valor final anual exibido na tabela
}

export interface PaymentOption {
  id: string;
  label: string;
  discountRate: number; // 0.40 para 40%, 0.03 para 3%, etc.
  installments: number; // 1, 2, 4, 12
}

// Planos Oficiais Únicos do Sistema:
// - Apenas a licença Light tem 10 funcionários; todas as restantes têm funcionários Ilimitados
// - Preço Base Anual Bruto reduzido em 10.000 Kz em cada licença
// - Fonte única que alimenta tanto a página de Licenciamento quanto os Pacotes Rápidos
export const LICENSE_PLANS: LicensePlan[] = [
  { 
    id: 'light', 
    name: 'Light', 
    faturacao: '10.000.000,00', 
    funcionarios: '10', 
    basePriceAnual: 50000, 
    anuidadeExibida: '30.000,00',
    precoMensal: '5.000,00',
    precoTrimestral: '14.500,00',
    desc: 'Ideal para pequenos negócios, startups e profissionais liberais.',
    features: ['Até 10 Funcionários', 'Facturação Comercial AGT & SAF-T', 'Gestão de Clientes e Fornecedores', '14 Dias de Teste Gratuito']
  },
  { 
    id: 'soft', 
    name: 'Soft', 
    faturacao: '30.000.000,00', 
    funcionarios: 'Ilimitado', 
    basePriceAnual: 110000, 
    anuidadeExibida: '66.000,00',
    precoMensal: '11.000,00',
    precoTrimestral: '31.900,00',
    desc: 'Equilíbrio ideal para empresas em fase de expansão no mercado angolano.',
    features: ['Funcionários Ilimitados', 'Facturação AGT & SAF-T Completo', 'Gestão de Stocks & Inventários', 'Recursos Humanos & Salários'],
    isPopular: true
  },
  { 
    id: 'silver', 
    name: 'Silver', 
    faturacao: '100.000.000,00', 
    funcionarios: 'Ilimitado', 
    basePriceAnual: 290000, 
    anuidadeExibida: '174.000,00',
    precoMensal: '29.000,00',
    precoTrimestral: '84.100,00',
    desc: 'Controlo financeiro rigoroso e gestão multi-armazém para médias empresas.',
    features: ['Funcionários Ilimitados', 'Gestão Multi-Armazém e Stocks', 'Contabilidade e PGC Angola', 'Gestão Financeira e Tesouraria']
  },
  { 
    id: 'gold', 
    name: 'Gold', 
    faturacao: '200.000.000,00', 
    funcionarios: 'Ilimitado', 
    basePriceAnual: 590000, 
    anuidadeExibida: '354.000,00',
    precoMensal: '59.000,00',
    precoTrimestral: '171.100,00',
    desc: 'Potência máxima e conformidade fiscal robusta para empresas consolidadas.',
    features: ['Funcionários Ilimitados', 'Todas as Funcionalidades Base', 'Gestão de Frotas & Viaturas', 'Auditoria Fiscal AGT Avançada']
  },
  { 
    id: 'platine', 
    name: 'Platine', 
    faturacao: '350.000.000,00', 
    funcionarios: 'Ilimitado', 
    basePriceAnual: 890000, 
    anuidadeExibida: '534.000,00',
    precoMensal: '89.000,00',
    precoTrimestral: '258.100,00',
    desc: 'Solução completa para médias e grandes operações empresariais.',
    features: ['Funcionários Ilimitados', 'Ecossistema ERP Completo', 'Acesso Multi-Utilizador', 'Suporte Prioritário Especializado']
  },
  { 
    id: 'corporative', 
    name: 'Corporative', 
    faturacao: 'Ilimitado', 
    funcionarios: 'Ilimitado', 
    basePriceAnual: 1190000, 
    anuidadeExibida: '714.000,00',
    precoMensal: '119.000,00',
    precoTrimestral: '345.100,00',
    desc: 'A solução definitiva sem limites de faturação para grandes corporações.',
    features: ['Facturação & Funcionários Ilimitados', 'Todos os 12 Módulos Base Incluídos', 'Relatórios Fiscais & SAF-T Ilimitados', 'SLA de Atendimento Garantido']
  },
];

export const SPECIAL_MODULES: SpecialModule[] = [
  { id: 'seguranca_privada', name: 'Modulo Segurança Privada', basePriceAnual: 6000, anuidadeExibida: '3.600,00' },
  { id: 'eventos', name: 'Modulo Eventos', basePriceAnual: 6000, anuidadeExibida: '3.600,00' },
  { id: 'orcamentos', name: 'Modulo Orçamentos', basePriceAnual: 6000, anuidadeExibida: '3.600,00' },
  { id: 'pos', name: 'POS (Posto vendas)', basePriceAnual: 6000, anuidadeExibida: '3.600,00' },
  { id: 'transitarios', name: 'Modulo Transitarios e Navegação', basePriceAnual: 6000, anuidadeExibida: '3.600,00' },
  { id: 'agencia_viagens', name: 'Modulo Agencia de Viagens', basePriceAnual: 12000, anuidadeExibida: '7.200,00' },
  { id: 'mini_site', name: 'Mini Site', basePriceAnual: 6000, anuidadeExibida: '3.600,00' },
  { id: 'stand_automovel', name: 'Stand Automóvel', basePriceAnual: 6000, anuidadeExibida: '3.600,00' },
  { id: 'gestao_igreja', name: 'Gestão de Igreja', basePriceAnual: 6000, anuidadeExibida: '3.600,00' },
  { id: 'agronegocio', name: 'Agronegócio', basePriceAnual: 6000, anuidadeExibida: '3.600,00' },
  { id: 'farmacia', name: 'Farmácia', basePriceAnual: 6000, anuidadeExibida: '3.600,00' },
];

export const PAYMENT_OPTIONS: PaymentOption[] = [
  { id: 'anual', label: 'Pagamento Anual [ 40% Desconto ]', discountRate: 0.40, installments: 1 },
  { id: '2_vezes', label: 'Pagamento em 2 vezes [ 3% Desconto ]', discountRate: 0.03, installments: 2 },
  { id: '4_vezes', label: 'Pagamento em 4 vezes [ 1% Desconto ]', discountRate: 0.01, installments: 4 },
  { id: '12_vezes', label: 'Pagamento em 12 vezes', discountRate: 0.00, installments: 12 },
];

export const BASE_MODULES_LIST: string[] = [
  'Modulo de Configuração',
  'Modulo de Administração',
  'Modulo Facturação/Clientes',
  'Modulo de Fornecedores',
  'Modulo de Contabilidade',
  'Modulo de Gestão Financeira',
  'Modulo de Recursos Humanos',
  'Modulo de Secretaria',
  'Modulo de Tesouraria',
  'Modulo de Stock',
  'Modulo de Gestão de Viaturas',
  'Modulo de Salários e INSS',
];

interface LicensingPricingCalculatorProps {
  onProceedToRegister?: (selection: {
    planId: string;
    planName: string;
    selectedModules: string[];
    paymentOptionId: string;
    paymentOptionLabel: string;
    totalAPagar: number;
    totalLiquido: number;
    iva: number;
    installments: number;
    valorPrestacao: number;
  }) => void;
  compact?: boolean;
}

export const LicensingPricingCalculator: React.FC<LicensingPricingCalculatorProps> = ({
  onProceedToRegister,
  compact = false
}) => {
  const [selectedPlanId, setSelectedPlanId] = useState<string>('light');
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>('anual');

  const selectedPlan = useMemo(() => {
    return LICENSE_PLANS.find(p => p.id === selectedPlanId) || LICENSE_PLANS[0];
  }, [selectedPlanId]);

  const selectedPayment = useMemo(() => {
    return PAYMENT_OPTIONS.find(p => p.id === selectedPaymentId) || PAYMENT_OPTIONS[0];
  }, [selectedPaymentId]);

  const toggleModule = (moduleId: string) => {
    setSelectedModules(prev =>
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  // Cálculos financeiros com precisão
  const calculations = useMemo(() => {
    // 1. Preço base da licença
    const baseLicenca = selectedPlan.basePriceAnual;

    // 2. Preço base dos módulos especiais selecionados
    const baseModulos = selectedModules.reduce((acc, modId) => {
      const mod = SPECIAL_MODULES.find(m => m.id === modId);
      return acc + (mod ? mod.basePriceAnual : 0);
    }, 0);

    const totalBaseBruto = baseLicenca + baseModulos;

    // 3. Desconto de periodicidade
    const discountRate = selectedPayment.discountRate;
    const valorDesconto = totalBaseBruto * discountRate;

    // 4. Total Líquido
    const totalLiquido = totalBaseBruto - valorDesconto;

    // 5. IVA (Isento / Sem incidência de IVA conforme regra comercial)
    const iva14 = 0;

    // 6. Total a Pagar (Sem IVA)
    const totalAPagar = totalLiquido;

    // 7. Valor por Prestação
    const installments = selectedPayment.installments;
    const valorPorPrestacao = totalAPagar / installments;

    return {
      baseLicenca,
      baseModulos,
      totalBaseBruto,
      valorDesconto,
      discountPercent: Math.round(discountRate * 100),
      totalLiquido,
      iva14,
      totalAPagar,
      installments,
      valorPorPrestacao
    };
  }, [selectedPlan, selectedModules, selectedPayment]);

  const formatKz = (val: number): string => {
    return val.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleProceed = () => {
    if (onProceedToRegister) {
      onProceedToRegister({
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        selectedModules,
        paymentOptionId: selectedPayment.id,
        paymentOptionLabel: selectedPayment.label,
        totalAPagar: calculations.totalAPagar,
        totalLiquido: calculations.totalLiquido,
        iva: calculations.iva14,
        installments: calculations.installments,
        valorPrestacao: calculations.valorPorPrestacao
      });
    }
  };

  return (
    <div className={`w-full max-w-6xl mx-auto bg-white border border-zinc-200 shadow-xl rounded-xl overflow-hidden font-sans ${compact ? 'p-4' : 'p-6 sm:p-8'}`}>
      
      {/* Topo / Header do Painel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-zinc-200 gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#003366] tracking-tight flex items-center gap-2">
            Seleccione a Licença Pretendida
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 font-medium mt-1">
            Escolha o pacote ideal para a sua empresa. Apenas o plano Light é limitado a 10 colaboradores; todos os restantes possuem colaboradores ilimitados.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-[#0066cc] text-white px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-sm">
            AOA
          </div>
          <div className="text-[11px] font-bold text-zinc-600 uppercase tracking-widest bg-zinc-100 px-3 py-1 rounded-md border border-zinc-200">
            Sem Incidência de IVA (Isento)
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* COLUNA DA ESQUERDA: Seleção de Licença, Módulos e Pagamento (7 colunas) */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Tabela de Licenças */}
          <div>
            <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex justify-between mb-1.5 px-2">
              <span>Limites Máximos Anuais</span>
              <span>Valores em AOA</span>
            </div>
            <div className="overflow-x-auto border border-zinc-200 rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-100 text-zinc-700 border-b border-zinc-200">
                    <th className="py-2.5 px-3 font-bold">Licença</th>
                    <th className="py-2.5 px-3 font-bold text-right">Facturação</th>
                    <th className="py-2.5 px-3 font-bold text-center">Funcionários</th>
                    <th className="py-2.5 px-3 font-bold text-right">Anuidade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {LICENSE_PLANS.map((plan) => {
                    const isSelected = selectedPlanId === plan.id;
                    return (
                      <tr 
                        key={plan.id}
                        onClick={() => setSelectedPlanId(plan.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected 
                            ? 'bg-blue-50/80 text-[#003366] font-semibold' 
                            : 'hover:bg-zinc-50 text-zinc-700'
                        }`}
                      >
                        <td className="py-2.5 px-3 flex items-center gap-2.5 whitespace-nowrap">
                          <input 
                            type="radio" 
                            name="license_plan" 
                            checked={isSelected}
                            onChange={() => setSelectedPlanId(plan.id)}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="font-bold text-sm text-[#003366]">{plan.name}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap text-zinc-600">
                          {plan.faturacao}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap font-medium">
                          {plan.funcionarios === 'Ilimitado' ? (
                            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                              Ilimitado
                            </span>
                          ) : (
                            <span className="text-zinc-700 font-bold">
                              {plan.funcionarios}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold whitespace-nowrap text-zinc-800">
                          {plan.anuidadeExibida}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-zinc-400 font-medium mt-1 text-right italic">
              * Valores de anuidade incluem 40% de desconto e 14% de IVA.
            </p>
          </div>

          {/* Sub-secção: Seleccione Modulos Especiais */}
          <div className="pt-2 border-t border-zinc-200">
            <h3 className="text-sm font-black text-zinc-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              Seleccione Modulos Especiais
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {SPECIAL_MODULES.map((mod) => {
                const isChecked = selectedModules.includes(mod.id);
                return (
                  <label 
                    key={mod.id}
                    className={`flex items-center justify-between p-2.5 border rounded-lg cursor-pointer transition-all ${
                      isChecked 
                        ? 'border-blue-500 bg-blue-50/50 shadow-sm' 
                        : 'border-zinc-200 hover:border-zinc-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input 
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleModule(mod.id)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className={`font-semibold ${isChecked ? 'text-blue-900' : 'text-zinc-700'}`}>
                        {mod.name}
                      </span>
                    </div>
                    <span className="font-bold text-zinc-800 text-[11px] ml-2 shrink-0">
                      {mod.anuidadeExibida}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Sub-secção: Pagamento */}
          <div className="pt-2 border-t border-zinc-200">
            <h3 className="text-base font-black text-zinc-800 mb-4">
              Pagamento
            </h3>
            <div className="space-y-2.5 text-xs">
              {PAYMENT_OPTIONS.map((opt) => {
                const isSelected = selectedPaymentId === opt.id;
                return (
                  <label 
                    key={opt.id}
                    className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer border transition-all ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50/60 font-bold text-blue-900 shadow-sm' 
                        : 'border-zinc-100 hover:bg-zinc-50 text-zinc-700'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="payment_option"
                      checked={isSelected}
                      onChange={() => setSelectedPaymentId(opt.id)}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>{opt.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

        </div>

        {/* COLUNA DA DIREITA: Resultado e Módulos Incluídos (5 colunas) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Caixa de Resultado Financeiro */}
          <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-xl font-black text-blue-600 tracking-tight">
                Resultado
              </h3>
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                Moeda: AOA (Kz)
              </span>
            </div>

            <div className="space-y-3 text-xs">
              
              {/* Linha Licença Base */}
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-bold text-zinc-800 block text-sm">
                    Licença Base {selectedPlan.name}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-medium">
                    Inclui todos os módulos normais
                  </span>
                </div>
                <span className="font-bold text-zinc-800 text-sm">
                  {formatKz(calculations.baseLicenca)}
                </span>
              </div>

              {/* Módulos especiais adicionados (se houver) */}
              {calculations.baseModulos > 0 && (
                <div className="flex justify-between items-start pt-1 text-zinc-600">
                  <div>
                    <span className="font-semibold block">
                      Módulos Especiais ({selectedModules.length})
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      Adicionais selecionados
                    </span>
                  </div>
                  <span className="font-bold text-zinc-800">
                    {formatKz(calculations.baseModulos)}
                  </span>
                </div>
              )}

              {/* Linha Desconto */}
              {calculations.valorDesconto > 0 && (
                <div className="flex justify-between items-center text-emerald-600 font-bold border-t border-dashed border-zinc-100 pt-2">
                  <span>
                    Desconto Anuidade ({selectedPayment.installments === 1 ? 'Anual' : `${selectedPayment.installments}x`} {calculations.discountPercent}%)
                  </span>
                  <span>
                    - {formatKz(calculations.valorDesconto)}
                  </span>
                </div>
              )}

              {/* Total Líquido */}
              <div className="flex justify-between items-center text-zinc-700 font-medium pt-1 border-t border-zinc-100">
                <span>Total Líquido</span>
                <span className="font-bold">{formatKz(calculations.totalLiquido)}</span>
              </div>

              {/* IVA (Isento / Sem IVA) */}
              <div className="flex justify-between items-center text-zinc-700 font-medium">
                <span>IVA (Isento / Sem IVA)</span>
                <span className="font-bold text-emerald-600">0,00 AOA</span>
              </div>

              {/* Total a Pagar */}
              <div className="flex justify-between items-center text-[#003366] text-base font-black pt-3 border-t-2 border-zinc-200">
                <span>Total a pagar</span>
                <span className="text-lg">{formatKz(calculations.totalAPagar)}</span>
              </div>

              {/* Total Prestações */}
              <div className="flex justify-between items-center text-zinc-900 font-black text-xs pt-1">
                <span>Total ({calculations.installments} prestações x )</span>
                <span className="text-sm text-blue-700">{formatKz(calculations.valorPorPrestacao)}</span>
              </div>

            </div>

            {/* Botão de Prosseguir */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleProceed}
                className="w-full py-4 px-4 bg-[#00D17F] hover:bg-[#00B36B] text-white font-black text-xs uppercase tracking-widest rounded-lg shadow-lg shadow-[#00D17F]/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>REGISTE A SUA EMPRESA</span>
                <ArrowRight size={16} />
              </button>
              <p className="text-[10px] text-zinc-400 text-center font-bold uppercase tracking-tight mt-2">
                14 Dias de Teste Gratuito Sem Compromisso
              </p>
            </div>
          </div>

          {/* Caixa: Licença Base inclui */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-5 text-xs">
            <h4 className="font-black text-zinc-800 text-sm mb-3 pb-2 border-b border-zinc-200 flex items-center gap-2">
              <ShieldCheck size={16} className="text-[#00D17F]" />
              Licença Base inclui:
            </h4>
            <div className="grid grid-cols-1 gap-1.5 text-zinc-600 font-medium">
              {BASE_MODULES_LIST.map((modName) => (
                <div key={modName} className="flex items-center gap-2">
                  <span className="text-[#00D17F] font-bold">•</span>
                  <span>{modName}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-200/60 text-[10px] text-zinc-400 flex items-center gap-1.5">
              <Sparkles size={12} className="text-amber-500" />
              <span>Conforme especificações técnicas da AGT (SAF-T AO & Faturação Eletrónica).</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
export default LicensingPricingCalculator;
