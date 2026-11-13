import React, { useState } from 'react';
import { 
  Pill, 
  FileText, 
  Calendar, 
  Clock, 
  ShieldAlert, 
  Thermometer, 
  Search, 
  ArrowRight, 
  Building2, 
  Package, 
  Activity, 
  CheckCircle2, 
  AlertTriangle,
  FileCheck,
  Stethoscope,
  ClipboardList
} from 'lucide-react';

interface PharmacyServicesCardsProps {
  onSelectService?: (serviceKey: string) => void;
  activeService?: string;
}

export interface PharmacyServiceItem {
  id: string;
  code: string;
  title: string;
  category: 'balcao' | 'medicamentos' | 'receitas' | 'conformidade';
  description: string;
  badge?: string;
  requiresSpecialAuth?: boolean;
}

export const PharmacyServicesCards: React.FC<PharmacyServicesCardsProps> = ({
  onSelectService,
  activeService
}) => {
  const [activeCategory, setActiveCategory] = useState<
    'balcao' | 'medicamentos' | 'receitas' | 'conformidade'
  >('balcao');

  const services: PharmacyServiceItem[] = [
    // Categoria 1: Balcão & Atendimento
    {
      id: 'dispensacao',
      code: 'DISP',
      title: 'Dispensação de Medicamentos',
      category: 'balcao',
      description: 'Atendimento e dispensa orientada ao utente com validação farmacêutica.'
    },
    {
      id: 'pos_farmacia',
      code: 'POS-F',
      title: 'Terminal de Venda / Caixa',
      category: 'balcao',
      description: 'Facturação rápida de medicamentos e produtos de parafarmácia.'
    },
    {
      id: 'triagem_rapida',
      code: 'PARAM',
      title: 'Parâmetros Clínicos & Triagem',
      category: 'balcao',
      description: 'Medição de tensão arterial, glicémia e registo de cuidados no balcão.'
    },
    {
      id: 'consulta_stock_precos',
      code: 'PRECOS',
      title: 'Consulta Rápida de Stock e Preço',
      category: 'balcao',
      description: 'Verificação instantânea de disponibilidade, genéricos e equivalentes.'
    },

    // Categoria 2: Medicamentos & Lotes
    {
      id: 'lotes_validades',
      code: 'LOTES',
      title: 'Gestão de Lotes & Validades',
      category: 'medicamentos',
      description: 'Monitorização rigorosa de prazos de validade com alertas FEFO preventivos.'
    },
    {
      id: 'termolabeis',
      code: 'FRIO',
      title: 'Medicamentos Termolábeis',
      category: 'medicamentos',
      description: 'Cadeia de frio (2°C a 8°C), vacinas, insulinas e registo de temperaturas.'
    },
    {
      id: 'psicotropicos',
      code: 'PSICO',
      title: 'Substâncias Psicotrópicas & Estupefacientes',
      category: 'medicamentos',
      description: 'Livro oficial de registo de psicotrópicos com controlo de saldo estrito.'
    },
    {
      id: 'recolhas_alertas',
      code: 'RECOLHA',
      title: 'Alertas de Qualidade & Retiradas',
      category: 'medicamentos',
      description: 'Comunicações urgentes da ARMED para bloqueio e quarentena de lotes.'
    },

    // Categoria 3: Receitas & Farmacopeia
    {
      id: 'receitas_medicas',
      code: 'RECEITA',
      title: 'Validação de Receitas Médicas',
      category: 'receitas',
      description: 'Conferência de posologia, médico prescritor e assinatura electrónica.'
    },
    {
      id: 'genericos_dci',
      code: 'DCI',
      title: 'Guia de Genéricos & DCI',
      category: 'receitas',
      description: 'Equivalências terapêuticas e consulta à Denominação Comum Internacional.'
    },
    {
      id: 'preparacao_magistrais',
      code: 'MAGIS',
      title: 'Fórmulas Magistrais & Oficinais',
      category: 'receitas',
      description: 'Preparação laboratorial de manipulados e registo de matérias-primas.'
    },
    {
      id: 'interacoes_medicamentosas',
      code: 'INTERAC',
      title: 'Guia de Interacções Farmacológicas',
      category: 'receitas',
      description: 'Verificação automática de incompatibilidades e contra-indicações.'
    },

    // Categoria 4: Conformidade & Relatórios ARMED
    {
      id: 'relatorio_armed',
      code: 'ARMED',
      title: 'Comunicação Oficial à ARMED',
      category: 'conformidade',
      description: 'Envio de mapas periódicos de consumo de psicotrópicos e antibióticos.'
    },
    {
      id: 'farmacovigilancia',
      code: 'RAM',
      title: 'Notificação de Reacções Adversas (RAM)',
      category: 'conformidade',
      description: 'Ficha amarela de farmacovigilância e reporte de efeitos secundários.'
    },
    {
      id: 'inventario_farmacia',
      code: 'INVENT',
      title: 'Inventário Físico & Quebras',
      category: 'conformidade',
      description: 'Contagem cíclica de medicamentos, registo de avarias e caducidades.'
    },
    {
      id: 'auditoria_boas_praticas',
      code: 'BPF',
      title: 'Auditoria de Boas Práticas Farmacêuticas',
      category: 'conformidade',
      description: 'Checklist de conformidade regulamentar das instalações e acondicionamento.'
    }
  ];

  const filteredServices = services.filter(s => s.category === activeCategory);

  return (
    <div className="w-full bg-[#f8fafc] text-slate-800 p-4 md:p-6 rounded-2xl mb-8">
      {/* TÍTULO E SUBTÍTULO - EXACTOS AO MODELO DA IMAGEM icones de modelo de seccao.PNG */}
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
          Nossos serviços
        </h2>
        <p className="text-slate-500 text-sm md:text-base mt-1">
          Explore os nossos serviços, organizados por categorias.
        </p>
      </div>

      {/* ABAS COM ÍCONES - EXACTAS À IMAGEM */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-4 md:gap-8 mb-6 pb-0.5 no-scrollbar">
        <button
          onClick={() => setActiveCategory('balcao')}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold whitespace-nowrap transition-all relative ${
            activeCategory === 'balcao'
              ? 'text-teal-900 border-b-2 border-teal-800 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Pill className="w-4 h-4 text-teal-700" />
          <span>Serviços de Balcão</span>
        </button>

        <button
          onClick={() => setActiveCategory('medicamentos')}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold whitespace-nowrap transition-all relative ${
            activeCategory === 'medicamentos'
              ? 'text-teal-900 border-b-2 border-teal-800 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-4 h-4 text-teal-700" />
          <span>Gestão de Medicamentos & Lotes</span>
        </button>

        <button
          onClick={() => setActiveCategory('receitas')}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold whitespace-nowrap transition-all relative ${
            activeCategory === 'receitas'
              ? 'text-teal-900 border-b-2 border-teal-800 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileCheck className="w-4 h-4 text-teal-700" />
          <span>Receitas & Farmacopeia</span>
        </button>

        <button
          onClick={() => setActiveCategory('conformidade')}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold whitespace-nowrap transition-all relative ${
            activeCategory === 'conformidade'
              ? 'text-teal-900 border-b-2 border-teal-800 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4 text-teal-700" />
          <span>Conformidade & Calendário ARMED</span>
        </button>
      </div>

      {/* GRID DE CARTÕES - MODELO IDÊNTICO À IMAGEM icones de modelo de seccao.PNG */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServices.map(service => (
          <div
            key={service.id}
            className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden relative group"
          >
            {/* Padrão circular decorativo no fundo do cartão (idêntico à imagem) */}
            <div className="absolute right-3 top-3 w-28 h-28 pointer-events-none opacity-[0.07] group-hover:opacity-[0.14] transition-opacity">
              <svg viewBox="0 0 100 100" fill="none" className="w-full h-full stroke-teal-900">
                <circle cx="50" cy="50" r="45" strokeDasharray="3 3" strokeWidth="1" />
                <circle cx="50" cy="50" r="35" strokeDasharray="2 2" strokeWidth="1" />
                <circle cx="50" cy="50" r="25" strokeDasharray="2 2" strokeWidth="1" />
                <circle cx="50" cy="50" r="15" strokeWidth="1" />
              </svg>
            </div>

            {/* Conteúdo do Cartão */}
            <div className="p-6">
              <span className="text-sm font-bold text-slate-900 block tracking-tight">
                {service.code}
              </span>
              <h3 className="text-xs text-slate-500 font-medium mt-1 leading-snug">
                {service.title}
              </h3>
              <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                {service.description}
              </p>
            </div>

            {/* Rodapé do Cartão com "Acessar ->" */}
            <div className="border-t border-slate-100 px-6 py-3 bg-slate-50/50 flex items-center justify-between">
              <button
                onClick={() => onSelectService && onSelectService(service.id)}
                className="w-full flex items-center justify-between text-slate-800 group-hover:text-teal-900 text-xs font-semibold"
              >
                <span>Acessar</span>
                <div className="w-6 h-6 rounded-full border border-slate-300 group-hover:border-teal-800 flex items-center justify-center transition-colors">
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-teal-900" />
                </div>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PharmacyServicesCards;
