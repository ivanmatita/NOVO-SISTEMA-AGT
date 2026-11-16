import React from 'react';
import { 
  ArrowLeft, 
  ShieldCheck, 
  Calculator, 
  HelpCircle,
  Building2
} from 'lucide-react';
import { LicensingPricingCalculator } from './LicensingPricingCalculator';

interface LicensingPageProps {
  onBackToHome?: () => void;
  onProceedToRegister?: (selectionData: {
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
}

export const LicensingPage: React.FC<LicensingPageProps> = ({
  onBackToHome,
  onProceedToRegister
}) => {
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col font-sans">
      
      {/* Topo Institucional IMATEC */}
      <header className="bg-[#003366] text-white py-4 px-6 lg:px-20 border-b border-[#002244] shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBackToHome && (
              <button 
                onClick={onBackToHome}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer text-white/80 hover:text-white"
                title="Voltar ao Início"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <div className="flex items-center gap-2 cursor-pointer" onClick={onBackToHome}>
              <span className="text-xl font-black tracking-tight text-white">IMATEC</span>
              <span className="text-xl font-light tracking-widest text-[#00D17F]">ERP</span>
            </div>
            <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded bg-white/10 text-white/80 border border-white/10 ml-2">
              Seleção de Licenças & Preços
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-white/70 hidden md:inline font-medium">
              14 Dias de Teste Gratuito Sem Compromisso
            </span>
            {onBackToHome && (
              <button
                onClick={onBackToHome}
                className="text-xs font-bold uppercase tracking-wider text-white/90 hover:text-[#00D17F] transition-colors cursor-pointer"
              >
                Aceder ao Login
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Conteúdo Principal: Simulador Oficial Fiel à Imagem de Referência */}
      <main className="flex-1 max-w-7xl w-full mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Banner Informativo Superior */}
        <div className="text-center space-y-2 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-[#00D17F]/10 text-[#003366] px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
            <Calculator size={14} className="text-[#00D17F]" />
            TABELA DE PREÇOS & LICENCIAMENTO OFICIAL
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#003366] tracking-tight">
            Seleccione a Licença Pretendida
          </h1>
          <p className="text-sm text-zinc-500 font-medium">
            Consulte os planos, seleccione a sua licença, escolha as modalidades de pagamento e adicione módulos especiais com total conformidade fiscal AGT de Angola.
          </p>
        </div>

        {/* Componente Fiel à Imagem do Utilizador */}
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4 sm:p-8">
          <LicensingPricingCalculator 
            onProceedToRegister={onProceedToRegister}
          />
        </div>

      </main>

      {/* Rodapé Institucional */}
      <footer className="bg-white border-t border-zinc-200 py-6 px-4 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} IMATEC SOFTWARE. Em conformidade com a Legislação Fiscal da AGT · Angola.</p>
          <div className="flex items-center gap-4 text-xs font-bold text-zinc-600">
            <span>Segurança Multi-Tenant</span>
            <span>•</span>
            <span>Isolamento por Empresa</span>
            <span>•</span>
            <span>Suporte Técnico Especializado</span>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default LicensingPage;
