import React, { useState } from 'react';
import { 
  BookOpen, 
  Search, 
  HelpCircle, 
  ChevronRight, 
  ChevronDown, 
  Scale, 
  FileCheck, 
  ShieldCheck, 
  Info,
  Building2,
  FileText,
  Bookmark,
  ExternalLink,
  MessageCircle,
  Hash,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
}

const literacyData: FAQ[] = [
  {
    id: 'iva-1',
    category: 'IVA',
    question: 'O que é o IVA e quem deve pagar em Angola?',
    answer: 'O Imposto sobre o Valor Acrescentado (IVA) é um imposto sobre o consumo. Em Angola, aplica-se a todas as transmissões de bens e prestações de serviços. Existem três regimes: o Regime Geral (para empresas com faturação anual superior a 350 milhões Kz), o Regime Simplificado e o Regime de Exclusão.',
    tags: ['Consumo', 'Regime Geral', 'AGT']
  },
  {
    id: 'irt-1',
    category: 'IRT',
    question: 'Como funciona a tabela de retenção de IRT?',
    answer: 'O Imposto sobre o Rendimento do Trabalho (IRT) incide sobre os rendimentos dos trabalhadores. A tabela é progressiva, com uma taxa de isenção até 100.000 Kz. A partir desse valor, aplicam-se taxas que variam de 10% a 25%, conforme o escalão salarial definido pela Lei nº 28/20.',
    tags: ['Salários', 'Trabalhadores', 'Retenção']
  },
  {
    id: 'inss-1',
    category: 'Segurança Social',
    question: 'Quais as percentagens de contribuição para o INSS?',
    answer: 'A contribuição para a Segurança Social (INSS) em Angola é de 11% do salário bruto. Desse total, 3% são da responsabilidade do trabalhador (descontados no salário) e 8% são encargo da entidade empregadora (empresa).',
    tags: ['INSS', 'Trabalho', 'Contribuição']
  },
  {
    id: 'is-1',
    category: 'Imposto de Selo',
    question: 'Quando se aplica o Imposto de Selo nas faturas?',
    answer: 'O Imposto de Selo (IS) aplica-se em operações isentas de IVA, geralmente à taxa de 1% sobre o valor total da fatura ou recibo, conforme a Tabela Geral do Imposto de Selo.',
    tags: ['Selo', 'Faturação', 'AGT']
  },
  {
    id: 'nif-1',
    category: 'Fiscalidade Geral',
    question: 'Como validar um NIF de uma empresa angolana?',
    answer: 'Um NIF (Número de Identificação Fiscal) de empresa angolana geralmente começa com 5 ou outro dígito específico para entidades coletivas e possui 10 dígitos. A validação pode ser feita através do portal oficial da AGT (Administração Geral Tributária).',
    tags: ['NIF', 'AGT', 'Empresas']
  },
  {
    id: 'saft-1',
    category: 'Digitalização',
    question: 'O que é o ficheiro SAF-T (AO)?',
    answer: 'O SAF-T (AO) - Standard Audit File for Tax Purposes - é um ficheiro normalizado em formato XML que contém o registo das faturas emitidas por um software certificado. Deve ser exportado e submetido mensalmente à AGT até ao dia 15 do mês seguinte.',
    tags: ['XML', 'Software', 'Contabilidade']
  }
];

const LiteracyModule: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todas');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const categories = ['Todas', ...Array.from(new Set(literacyData.map(d => d.category)))];

  const filteredData = literacyData.filter(item => {
    const matchesSearch = item.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = activeCategory === 'Todas' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8 pb-20 max-w-5xl mx-auto">
      <header className="text-center space-y-4 py-8">
        <div className="inline-flex items-center justify-center p-3 bg-blue-50 text-[#003366] rounded-full mb-2">
          <BookOpen size={32} />
        </div>
        <h2 className="text-3xl font-black text-[#003366] tracking-tight uppercase">Biblioteca de Literacia Financeira & Fiscal</h2>
        <p className="text-zinc-500 max-w-2xl mx-auto text-sm">
          A sua guia definitiva sobre impostos, leis laborais e gestão financeira no contexto do mercado angolano. Atualizado de acordo com o OGE e Reforma Tributária.
        </p>
      </header>

      {/* Search and Filters */}
      <div className="sticky top-0 z-10 bg-[#f8fafc]/80 backdrop-blur-md py-4 space-y-4">
        <div className="relative group max-w-2xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#003366] transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="O que deseja aprender hoje? (ex: IRT, IVA, INSS...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border-2 border-zinc-100 shadow-lg text-lg focus:outline-none focus:border-[#003366] transition-all"
          />
        </div>
        <div className="flex justify-center gap-2 overflow-x-auto no-scrollbar pb-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-full border ${
                activeCategory === cat 
                  ? 'bg-[#003366] text-white border-[#003366] shadow-md' 
                  : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
        {/* Main Content (Q&A List) */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">Dúvidas Frequentes</h3>
          {filteredData.length > 0 ? (
            filteredData.map((item) => (
              <div 
                key={item.id} 
                className="bg-white border border-zinc-100 overflow-hidden group hover:border-[#003366] transition-all cursor-pointer"
                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
              >
                <div className="p-6 flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <span className="text-[9px] font-black uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{item.category}</span>
                    <h4 className="font-bold text-zinc-800 text-lg leading-tight group-hover:text-[#003366] transition-colors">
                      {item.question}
                    </h4>
                    <div className="flex gap-2">
                      {item.tags.map(t => <span key={t} className="text-[9px] text-zinc-400 flex items-center gap-0.5 font-bold uppercase tracking-tight"><Hash size={8} /> {t}</span>)}
                    </div>
                  </div>
                  <div className={`text-zinc-300 transition-transform duration-300 ${expandedId === item.id ? 'rotate-180' : ''}`}>
                    <ChevronDown size={24} />
                  </div>
                </div>
                <AnimatePresence>
                  {expandedId === item.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 pt-2 text-zinc-600 text-sm leading-relaxed border-t border-zinc-50">
                        {item.answer}
                        <div className="mt-4 pt-4 border-t border-zinc-50 flex gap-4">
                          <button className="flex items-center gap-1.5 text-[10px] font-black uppercase text-[#003366] hover:underline">
                            <Info size={12} /> Ler Guia Completo
                          </button>
                          <button className="flex items-center gap-1.5 text-[10px] font-black uppercase text-zinc-400 hover:text-zinc-600">
                            <Bookmark size={12} /> Guardar
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))
          ) : (
            <div className="py-20 text-center space-y-4 bg-white border-2 border-dashed border-zinc-100">
              <HelpCircle size={48} className="text-zinc-200 mx-auto" />
              <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs">Nenhum resultado encontrado para "{searchQuery}"</p>
              <button 
                onClick={() => setSearchQuery('')}
                className="text-[#003366] text-[10px] font-black uppercase tracking-widest hover:underline"
              >
                Limpar Pesquisa
              </button>
            </div>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-[#003366] p-8 text-white relative overflow-hidden group">
            <Building2 className="absolute -bottom-8 -right-8 text-white/5 group-hover:scale-110 transition-transform" size={160} />
            <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-6">Destaque Fiscal</h3>
            <div className="space-y-4 relative z-10">
              <h4 className="text-xl font-bold leading-tight">OGE 2024: Novas Regras de IRT e IVA</h4>
              <p className="text-xs text-white/70 leading-relaxed font-medium">
                Saiba como a atualização dos escalões de IRT afeta o processamento salarial da sua empresa este trimestre.
              </p>
              <button className="flex items-center gap-2 group/btn bg-white text-[#003366] px-6 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-100 transition-colors shadow-xl">
                Ver Guia AGT <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          <div className="bg-white border border-zinc-100 p-8 space-y-6">
            <h3 className="text-xs font-black text-zinc-800 uppercase tracking-widest flex items-center gap-2">
              <ExternalLink size={16} className="text-blue-600" /> Links Oficiais (ANG)
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {[
                { name: 'Portal da AGT', url: 'https://agt.minfin.gov.ao' },
                { name: 'Diário da República', url: '#' },
                { name: 'INSS Angola', url: 'https://www.inss.ao' },
                { name: 'MAPTSS', url: '#' },
              ].map(link => (
                <a key={link.name} href={link.url} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 bg-zinc-50 hover:bg-zinc-100 transition-colors text-xs font-bold text-zinc-600">
                  {link.name}
                  <ChevronRight size={14} />
                </a>
              ))}
            </div>
          </div>

          <div className="bg-white border border-zinc-100 p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-blue-50 text-[#003366] rounded-full flex items-center justify-center mx-auto">
              <MessageCircle size={28} />
            </div>
            <h4 className="font-black text-zinc-800 uppercase tracking-tight text-sm">Apoio do Consultor</h4>
            <p className="text-xs text-zinc-500 italic max-w-xs mx-auto">Tire as suas dúvidas diretamente com a nossa rede de consultores fiscais certificados.</p>
            <button className="text-[#003366] text-[10px] font-black uppercase tracking-widest hover:underline">Iniciar Chat de Consultoria</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiteracyModule;
