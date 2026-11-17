import React, { useState, useMemo, useEffect } from 'react';
import { ArrowRight, Check, ShieldCheck, Sparkles, Building2, HelpCircle } from 'lucide-react';

export interface LicensePlan {
  id: string;
  name: string;
  faturacao: string;
  funcionarios: string;
  basePriceAnual: number; // Preço base anual sem IVA
  anuidadeExibida: string; // Valor anual formatado sem IVA
  precoMensal: string; // Valor mensal formatado sem IVA
  precoTrimestral: string; // Valor trimestral formatado sem IVA
  precoMensalNum: number;
  precoTrimestralNum: number;
  precoAnualNum: number;
  desc: string;
  features: string[];
  isPopular?: boolean;
}

export interface SpecialModule {
  id: string;
  name: string;
  basePriceAnual: number;
  anuidadeExibida: string;
}

export interface PaymentOption {
  id: string;
  label: string;
  discountRate: number;
  installments: number;
}

// 4 ÚNICOS PLANOS OFICIAIS DO IMATEC ERP
// Fonte única unificada entre Login, Pacotes Rápidos, CRM e Gestão de Licenciamento
export const DEFAULT_LICENSE_PLANS: LicensePlan[] = [
  { 
    id: 'basico', 
    name: 'Básico', 
    faturacao: '10.000.000,00', 
    funcionarios: '5', 
    basePriceAnual: 300000, 
    anuidadeExibida: '270.000,00',
    precoMensal: '25.000,00',
    precoTrimestral: '75.000,00',
    precoMensalNum: 25000,
    precoTrimestralNum: 75000,
    precoAnualNum: 270000,
    desc: 'Ideal para pequenas empresas, prestadores de serviços e negócios em início de atividade.',
    features: ['Até 5 Utilizadores', 'Facturação Comercial AGT & SAF-T', 'Gestão de Clientes e Fornecedores', '14 Dias de Teste Gratuito']
  },
  { 
    id: 'standard', 
    name: 'Standard', 
    faturacao: '50.000.000,00', 
    funcionarios: '15', 
    basePriceAnual: 660000, 
    anuidadeExibida: '594.000,00',
    precoMensal: '55.000,00',
    precoTrimestral: '165.000,00',
    precoMensalNum: 55000,
    precoTrimestralNum: 165000,
    precoAnualNum: 594000,
    desc: 'Equilíbrio ideal para empresas em expansão que necessitam de controlo comercial e recursos humanos.',
    features: ['Até 15 Utilizadores', 'Facturação AGT & SAF-T Completo', 'Gestão de Stocks & Inventários', 'Recursos Humanos & Salários']
  },
  { 
    id: 'profissional', 
    name: 'Profissional', 
    faturacao: '200.000.000,00', 
    funcionarios: '50', 
    basePriceAnual: 780000, 
    anuidadeExibida: '702.000,00',
    precoMensal: '65.000,00',
    precoTrimestral: '195.000,00',
    precoMensalNum: 65000,
    precoTrimestralNum: 195000,
    precoAnualNum: 702000,
    desc: 'Potência total para médias e grandes empresas com múltiplos departamentos e requisitos avançados da AGT.',
    features: ['Até 50 Utilizadores', 'Todos os Módulos Base', 'Gestão Multi-Armazém e Stocks', 'Contabilidade e PGC Angola', 'Auditoria Fiscal AGT Avançada'],
    isPopular: true
  },
  { 
    id: 'enterprise', 
    name: 'Enterprise', 
    faturacao: 'Ilimitado', 
    funcionarios: 'Ilimitado', 
    basePriceAnual: 1800000, 
    anuidadeExibida: '1.620.000,00',
    precoMensal: '150.000,00',
    precoTrimestral: '450.000,00',
    precoMensalNum: 150000,
    precoTrimestralNum: 450000,
    precoAnualNum: 1620000,
    desc: 'A solução definitiva para grandes corporações, grupos empresariais e operações com alto volume de dados.',
    features: ['Utilizadores Ilimitados', 'Facturação & Funcionários Ilimitados', 'Todos os 12 Módulos Base Incluídos', 'Integração API Dedicada', 'SLA de Atendimento Garantido']
  },
];

export const LICENSE_PLANS = DEFAULT_LICENSE_PLANS;

// Mapeamento de compatibilidade para registos antigos sem quebrar dados existentes
export function normalizePlanName(raw: string | null | undefined): 'Básico' | 'Standard' | 'Profissional' | 'Enterprise' {
  if (!raw) return 'Profissional';
  const s = String(raw).trim().toLowerCase();
  if (s.includes('basic') || s.includes('básic') || s.includes('light') || s.includes('start')) return 'Básico';
  if (s.includes('stand') || s.includes('soft') || s.includes('med')) return 'Standard';
  if (s.includes('enter') || s.includes('plat') || s.includes('corp')) return 'Enterprise';
  if (s.includes('prof') || s.includes('silv') || s.includes('gold') || s.includes('pro') || s.includes('avanc')) return 'Profissional';
  if (s === 'trial') return 'Básico';
  return 'Profissional';
}

export const SPECIAL_MODULES: SpecialModule[] = [
  { id: 'seguranca_privada', name: 'Módulo Segurança Privada', basePriceAnual: 6000, anuidadeExibida: '3.600,00' },
  { id: 'eventos', name: 'Módulo Eventos', basePriceAnual: 6000, anuidadeExibida: '3.600,00' },
  { id: 'orcamentos', name: 'Módulo Orçamentos', basePriceAnual: 6000, anuidadeExibida: '3.600,00' },
  { id: 'pos', name: 'POS (Posto de Vendas)', basePriceAnual: 6000, anuidadeExibida: '3.600,00' },
  { id: 'transitarios', name: 'Módulo Transitários e Navegação', basePriceAnual: 6000, anuidadeExibida: '3.600,00' },
  { id: 'agencia_viagens', name: 'Módulo Agência de Viagens', basePriceAnual: 12000, anuidadeExibida: '7.200,00' },
  { id: 'mini_site', name: 'Mini Site Comercial', basePriceAnual: 6000, anuidadeExibida: '3.600,00' },
  { id: 'stand_automovel', name: 'Stand Automóvel', basePriceAnual: 6000, anuidadeExibida: '3.600,00' },
  { id: 'gestao_igreja', name: 'Gestão de Igreja', basePriceAnual: 6000, anuidadeExibida: '3.600,00' },
  { id: 'agronegocio', name: 'Agronegócio', basePriceAnual: 6000, anuidadeExibida: '3.600,00' },
  { id: 'farmacia', name: 'Farmácia', basePriceAnual: 6000, anuidadeExibida: '3.600,00' },
];

export const PAYMENT_OPTIONS: PaymentOption[] = [
  { id: 'mensal', label: 'Pagamento Mensal', discountRate: 0.00, installments: 1 },
  { id: 'trimestral', label: 'Pagamento Trimestral', discountRate: 0.00, installments: 3 },
  { id: 'anual', label: 'Pagamento Anual [ 10% Desconto ]', discountRate: 0.10, installments: 12 },
];

export const BASE_MODULES_LIST: string[] = [
  'Módulo de Configuração',
  'Módulo de Administração',
  'Módulo Facturação/Clientes',
  'Módulo de Fornecedores',
  'Módulo de Contabilidade',
  'Módulo de Gestão Financeira',
  'Módulo de Recursos Humanos',
  'Módulo de Secretaria',
  'Módulo de Tesouraria',
  'Módulo de Stock & Armazéns',
  'Módulo de Gestão de Viaturas',
  'Módulo de Salários e INSS',
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
  const [plans, setPlans] = useState<LicensePlan[]>(DEFAULT_LICENSE_PLANS);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('profissional');
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>('mensal');

  // Buscar planos atualizados da base de dados Supabase via API
  useEffect(() => {
    let isMounted = true;
    fetch('/api/planos')
      .then(res => {
        if (!res.ok) throw new Error('Falha ao carregar planos');
        return res.json();
      })
      .then(data => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          const mapped: LicensePlan[] = data.map((p: any) => ({
            id: p.id || p.codigo?.toLowerCase() || 'profissional',
            name: p.nome || 'Profissional',
            faturacao: p.limite_faturacao || 'Ilimitado',
            funcionarios: p.limite_usuarios || 'Ilimitado',
            basePriceAnual: Number(p.preco_anual) || 702000,
            anuidadeExibida: Number(p.preco_anual || 0).toLocaleString('pt-AO', { minimumFractionDigits: 2 }),
            precoMensal: Number(p.preco_mensal || 0).toLocaleString('pt-AO', { minimumFractionDigits: 2 }),
            precoTrimestral: Number(p.preco_trimestral || 0).toLocaleString('pt-AO', { minimumFractionDigits: 2 }),
            precoMensalNum: Number(p.preco_mensal) || 0,
            precoTrimestralNum: Number(p.preco_trimestral) || 0,
            precoAnualNum: Number(p.preco_anual) || 0,
            desc: p.descricao || '',
            features: Array.isArray(p.funcionalidades) ? p.funcionalidades : (Array.isArray(p.modulos) ? p.modulos : []),
            isPopular: p.destaque ?? false
          }));
          setPlans(mapped);
        }
      })
      .catch(() => {
        // Fallback robusto para os 4 planos oficiais padrão
        if (isMounted) setPlans(DEFAULT_LICENSE_PLANS);
      });

    return () => { isMounted = false; };
  }, []);

  const selectedPlan = useMemo(() => {
    return plans.find(p => p.id === selectedPlanId) || plans.find(p => p.id === 'profissional') || plans[0];
  }, [plans, selectedPlanId]);

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

  // Cálculos financeiros com precisão SEM IVA
  const calculations = useMemo(() => {
    // 1. Determina preço da licença base consoante a modalidade de pagamento selecionada
    let baseLicenca = selectedPlan.precoMensalNum;
    if (selectedPayment.id === 'trimestral') {
      baseLicenca = selectedPlan.precoTrimestralNum;
    } else if (selectedPayment.id === 'anual') {
      baseLicenca = selectedPlan.precoAnualNum;
    }

    // 2. Preço dos módulos especiais (proporcional à modalidade)
    const baseModulos = selectedModules.reduce((acc, modId) => {
      const mod = SPECIAL_MODULES.find(m => m.id === modId);
      const anualPrice = mod ? mod.basePriceAnual : 0;
      if (selectedPayment.id === 'mensal') return acc + Math.round(anualPrice / 12);
      if (selectedPayment.id === 'trimestral') return acc + Math.round(anualPrice / 4);
      return acc + anualPrice;
    }, 0);

    const totalBaseBruto = baseLicenca + baseModulos;

    // 3. Desconto de periodicidade
    const valorDesconto = 0; // Já embutido nos preços oficiais da base de dados

    // 4. Total Líquido
    const totalLiquido = totalBaseBruto;

    // 5. IVA: RIGOROSAMENTE SEM IVA (0,00 AOA)
    const iva14 = 0;

    // 6. Total a Pagar
    const totalAPagar = totalLiquido;

    // 7. Prestações
    const installments = selectedPayment.installments;
    const valorPorPrestacao = totalAPagar / installments;

    return {
      baseLicenca,
      baseModulos,
      totalBaseBruto,
      valorDesconto,
      discountPercent: selectedPayment.id === 'anual' ? 10 : 0,
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
            Escolha o pacote ideal para a sua empresa entre os 4 planos comerciais oficiais: Básico, Standard, Profissional e Enterprise.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-[#003366] text-white px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-sm">
            AOA (Kz)
          </div>
          <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-md border border-emerald-200">
            Valores Sem IVA
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* COLUNA DA ESQUERDA: Seleção de Licença, Modalidade e Módulos */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Tabela dos 4 Planos Oficiais */}
          <div>
            <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex justify-between mb-1.5 px-2">
              <span>Planos Oficiais do Sistema</span>
              <span>Preço Conforme Modalidade</span>
            </div>
            <div className="overflow-x-auto border border-zinc-200 rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-100 text-zinc-700 border-b border-zinc-200">
                    <th className="py-2.5 px-3 font-bold">Licença</th>
                    <th className="py-2.5 px-3 font-bold text-right">Facturação</th>
                    <th className="py-2.5 px-3 font-bold text-center">Utilizadores</th>
                    <th className="py-2.5 px-3 font-bold text-right">
                      {selectedPayment.id === 'mensal' ? 'Preço Mensal' : selectedPayment.id === 'trimestral' ? 'Preço Trimestral' : 'Preço Anual'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {plans.map((plan) => {
                    const isSelected = selectedPlanId === plan.id;
                    const priceToShow = selectedPayment.id === 'mensal' 
                      ? plan.precoMensal 
                      : (selectedPayment.id === 'trimestral' ? plan.precoTrimestral : plan.anuidadeExibida);

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
                          {plan.isPopular && (
                            <span className="text-[9px] font-black uppercase bg-[#003366] text-white px-2 py-0.5 rounded">
                              Recomendado
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap text-zinc-600">
                          {plan.faturacao} AOA
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
                        <td className="py-2.5 px-3 text-right font-black whitespace-nowrap text-[#003366]">
                          {priceToShow} AOA
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-zinc-400 font-medium mt-1 text-right italic">
              * Valores comerciais sem IVA. Dados obtidos da base de dados central IMATEC.
            </p>
          </div>

          {/* Sub-secção: Modalidades de Pagamento (Mensal, Trimestral, Anual) */}
          <div className="pt-2 border-t border-zinc-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black text-zinc-800 uppercase tracking-wider">
                Modalidade de Pagamento
              </h3>
              <span className="text-[10px] text-zinc-400 font-bold">
                Selecione o ciclo de faturação
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {PAYMENT_OPTIONS.map((opt) => {
                const isSelected = selectedPaymentId === opt.id;
                let valorExemplo = selectedPlan.precoMensal;
                if (opt.id === 'trimestral') valorExemplo = selectedPlan.precoTrimestral;
                if (opt.id === 'anual') valorExemplo = selectedPlan.anuidadeExibida;

                return (
                  <label 
                    key={opt.id}
                    className={`flex flex-col p-3 rounded-lg cursor-pointer border transition-all ${
                      isSelected 
                        ? 'border-[#003366] bg-blue-50/60 shadow-sm' 
                        : 'border-zinc-200 hover:bg-zinc-50 bg-white text-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <input 
                        type="radio" 
                        name="payment_option"
                        checked={isSelected}
                        onChange={() => setSelectedPaymentId(opt.id)}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="font-black text-[#003366] text-xs uppercase">{opt.label}</span>
                    </div>
                    <span className="text-[11px] font-bold text-zinc-800 mt-1 pl-6">
                      {valorExemplo} AOA
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Sub-secção: Módulos Especiais */}
          <div className="pt-2 border-t border-zinc-200">
            <h3 className="text-sm font-black text-zinc-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              Módulos Especiais Opcionais
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
                      {mod.anuidadeExibida} AOA
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

        </div>

        {/* COLUNA DA DIREITA: Resultado e Módulos Incluídos */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Caixa de Resultado Financeiro */}
          <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-xl font-black text-[#003366] tracking-tight">
                Resumo da Subscrição
              </h3>
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                Moeda: AOA
              </span>
            </div>

            <div className="space-y-3 text-xs">
              
              {/* Linha Licença Base */}
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-black text-zinc-800 block text-sm">
                    Licença {selectedPlan.name} ({selectedPayment.label})
                  </span>
                  <span className="text-[10px] text-zinc-400 font-medium">
                    Inclui todos os módulos base do ERP
                  </span>
                </div>
                <span className="font-black text-zinc-800 text-sm">
                  {formatKz(calculations.baseLicenca)} AOA
                </span>
              </div>

              {/* Módulos especiais adicionados */}
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
                    {formatKz(calculations.baseModulos)} AOA
                  </span>
                </div>
              )}

              {/* Total Líquido */}
              <div className="flex justify-between items-center text-zinc-700 font-medium pt-1 border-t border-zinc-100">
                <span>Total Líquido</span>
                <span className="font-bold">{formatKz(calculations.totalLiquido)} AOA</span>
              </div>

              {/* IVA: Sem IVA */}
              <div className="flex justify-between items-center text-zinc-700 font-medium">
                <span>IVA (Sem Incidência / Isento)</span>
                <span className="font-bold text-emerald-600">0,00 AOA</span>
              </div>

              {/* Total a Pagar */}
              <div className="flex justify-between items-center text-[#003366] text-base font-black pt-3 border-t-2 border-zinc-200">
                <span>Total a pagar</span>
                <span className="text-xl font-black text-[#003366]">{formatKz(calculations.totalAPagar)} AOA</span>
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
              Módulos Incluídos na Licença {selectedPlan.name}:
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
