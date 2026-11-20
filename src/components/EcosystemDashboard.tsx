import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import {
  Landmark,
  PieChart as PieChartIcon,
  Activity,
  Truck,
  FolderKanban,
  ExternalLink,
  ChevronRight,
  MessageSquare,
  ArrowRight,
  FileText,
  ShieldCheck,
} from 'lucide-react';

const ECOSYSTEM_ITEMS = [
  {
    id: 'management',
    title: 'GESTÃO EMPRESARIAL',
    subtitle: 'CONTROLE TOTAL',
    imgUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800',
    icon: <Activity size={18} />,
  },
  {
    id: 'pos',
    title: 'SOFTWARE POS',
    subtitle: 'VENDAS ÁGEIS',
    imgUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=800',
    icon: <ShoppingCartIcon />,
  },
  {
    id: 'financial',
    title: 'FINANÇAS & CAIXA',
    subtitle: 'FLUXO SEGURO',
    imgUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=800',
    icon: <DollarSignIcon />,
  },
  {
    id: 'fleet',
    title: 'GESTÃO DE FROTAS',
    subtitle: 'CONTROLE VEÍCULOS',
    imgUrl: 'https://images.unsplash.com/photo-1510903117032-f1596c327647?auto=format&fit=crop&q=80&w=800',
    icon: <Truck size={18} />,
  },
  {
    id: 'projects',
    title: 'GESTÃO DE PROJETOS',
    subtitle: 'PLANEAMENTO',
    imgUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=800',
    icon: <FolderKanban size={18} />,
  },
];

function ShoppingCartIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  );
}

function DollarSignIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" x2="12" y1="2" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

const OFFICIAL_LINKS = [
  { name: 'Portal da AGT', url: 'https://portaldocontribuinte.minfin.gov.ao/' },
  { name: 'Diário da República', url: 'https://imprensanacional.gov.ao/' },
  { name: 'INSS Angola', url: 'https://www.inss.ao/' },
  { name: 'MAPTSS', url: 'https://maptss.gov.ao/' },
];

const EcosystemDashboard = ({
  stats,
  issuedDocuments,
  setActiveTab,
}: {
  stats: any;
  issuedDocuments: any[];
  setActiveTab: (tab: string) => void;
}) => {
  const volumeData = [
    { month: 'Jan', amount: 0 },
    { month: 'Fev', amount: 800000000 },
    { month: 'Mar', amount: 0 },
    { month: 'Abr', amount: 0 },
    { month: 'Mai', amount: 0 },
    { month: 'Jun', amount: 0 },
    { month: 'Jul', amount: 0 },
    { month: 'Ago', amount: 0 },
    { month: 'Set', amount: 0 },
    { month: 'Out', amount: 0 },
    { month: 'Nov', amount: 0 },
    { month: 'Dez', amount: 0 },
  ];

  const docStatesData = [
    { name: 'Emitidos', value: 70 },
    { name: 'Pendentes', value: 20 },
    { name: 'Anulados', value: 10 },
  ];
  const COLORS = ['#3b82f6', '#10b981', '#f43f5e'];

  const handleOpenConsultoria = () => {
    const msg = encodeURIComponent('Olá, preciso de apoio com consultoria fiscal e gestão no IMATEC ERP.');
    window.open(`https://wa.me/244923000000?text=${msg}`, '_blank');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <h2 className="text-xl font-bold text-zinc-800 flex items-center gap-2 mb-4">
        <Landmark className="text-blue-700" size={20} /> ECOSSISTEMA DE GESTÃO IMATEC
      </h2>

      {/* Grade com os módulos principais + Bloco Lateral Direito Oficial */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Item 1: Gestão Empresarial */}
        <button
          onClick={() => setActiveTab(ECOSYSTEM_ITEMS[0].id)}
          className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden relative pb-16 text-left w-full hover:shadow-md transition-all cursor-pointer"
        >
          <div className="h-48 relative">
            <img src={ECOSYSTEM_ITEMS[0].imgUrl} alt={ECOSYSTEM_ITEMS[0].title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            <div className="absolute left-4 bottom-4 w-10 h-10 bg-[#0d6efd] rounded-full flex items-center justify-center text-white shadow-lg">
              {ECOSYSTEM_ITEMS[0].icon}
            </div>
          </div>
          <div className="absolute bottom-0 inset-x-0 p-4 text-center bg-white">
            <h3 className="font-extrabold text-zinc-900 text-[13px]">{ECOSYSTEM_ITEMS[0].title}</h3>
            <p className="text-[10px] text-blue-500 font-bold tracking-widest mt-0.5">{ECOSYSTEM_ITEMS[0].subtitle}</p>
          </div>
        </button>

        {/* Item 2: Software POS */}
        <button
          onClick={() => setActiveTab(ECOSYSTEM_ITEMS[1].id)}
          className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden relative pb-16 text-left w-full hover:shadow-md transition-all cursor-pointer"
        >
          <div className="h-48 relative">
            <img src={ECOSYSTEM_ITEMS[1].imgUrl} alt={ECOSYSTEM_ITEMS[1].title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            <div className="absolute left-4 bottom-4 w-10 h-10 bg-[#0d6efd] rounded-full flex items-center justify-center text-white shadow-lg">
              {ECOSYSTEM_ITEMS[1].icon}
            </div>
          </div>
          <div className="absolute bottom-0 inset-x-0 p-4 text-center bg-white">
            <h3 className="font-extrabold text-zinc-900 text-[13px]">{ECOSYSTEM_ITEMS[1].title}</h3>
            <p className="text-[10px] text-blue-500 font-bold tracking-widest mt-0.5">{ECOSYSTEM_ITEMS[1].subtitle}</p>
          </div>
        </button>

        {/* Item 3: FINANÇAS & CAIXA (Topo Direito) */}
        <button
          onClick={() => setActiveTab(ECOSYSTEM_ITEMS[2].id)}
          className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden relative pb-16 text-left w-full hover:shadow-md transition-all cursor-pointer"
        >
          <div className="h-48 relative">
            <img src={ECOSYSTEM_ITEMS[2].imgUrl} alt={ECOSYSTEM_ITEMS[2].title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            <div className="absolute left-4 bottom-4 w-10 h-10 bg-[#0d6efd] rounded-full flex items-center justify-center text-white shadow-lg">
              {ECOSYSTEM_ITEMS[2].icon}
            </div>
          </div>
          <div className="absolute bottom-0 inset-x-0 p-4 text-center bg-white">
            <h3 className="font-extrabold text-zinc-900 text-[13px]">{ECOSYSTEM_ITEMS[2].title}</h3>
            <p className="text-[10px] text-blue-500 font-bold tracking-widest mt-0.5">{ECOSYSTEM_ITEMS[2].subtitle}</p>
          </div>
        </button>

        {/* Item 4: Gestão de Frotas */}
        <button
          onClick={() => setActiveTab(ECOSYSTEM_ITEMS[3].id)}
          className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden relative pb-16 text-left w-full hover:shadow-md transition-all cursor-pointer"
        >
          <div className="h-48 relative">
            <img src={ECOSYSTEM_ITEMS[3].imgUrl} alt={ECOSYSTEM_ITEMS[3].title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            <div className="absolute left-4 bottom-4 w-10 h-10 bg-[#0d6efd] rounded-full flex items-center justify-center text-white shadow-lg">
              {ECOSYSTEM_ITEMS[3].icon}
            </div>
          </div>
          <div className="absolute bottom-0 inset-x-0 p-4 text-center bg-white">
            <h3 className="font-extrabold text-zinc-900 text-[13px]">{ECOSYSTEM_ITEMS[3].title}</h3>
            <p className="text-[10px] text-blue-500 font-bold tracking-widest mt-0.5">{ECOSYSTEM_ITEMS[3].subtitle}</p>
          </div>
        </button>

        {/* Item 5: Gestão de Projetos */}
        <button
          onClick={() => setActiveTab(ECOSYSTEM_ITEMS[4].id)}
          className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden relative pb-16 text-left w-full hover:shadow-md transition-all cursor-pointer"
        >
          <div className="h-48 relative">
            <img src={ECOSYSTEM_ITEMS[4].imgUrl} alt={ECOSYSTEM_ITEMS[4].title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            <div className="absolute left-4 bottom-4 w-10 h-10 bg-[#0d6efd] rounded-full flex items-center justify-center text-white shadow-lg">
              {ECOSYSTEM_ITEMS[4].icon}
            </div>
          </div>
          <div className="absolute bottom-0 inset-x-0 p-4 text-center bg-white">
            <h3 className="font-extrabold text-zinc-900 text-[13px]">{ECOSYSTEM_ITEMS[4].title}</h3>
            <p className="text-[10px] text-blue-500 font-bold tracking-widest mt-0.5">{ECOSYSTEM_ITEMS[4].subtitle}</p>
          </div>
        </button>

        {/* COLUNA DIREITA EM BAIXO DA SECÇÃO FINANÇAS & CAIXA FLUXO SEGURO (CONFORME IMAGEM EM ANEXO) */}
        <div className="space-y-4 flex flex-col justify-between">
          {/* 1. DESTAQUE FISCAL */}
          <div className="bg-[#002b49] rounded-xl p-5 text-white shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[200px]">
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#38bdf8] block">
                DESTAQUE FISCAL
              </span>
              <h4 className="text-base font-black leading-snug">
                OGE 2024: Novas Regras de IRT e IVA
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed font-normal">
                Saiba como a atualização dos escalões de IRT afeta o processamento salarial da sua empresa este trimestre.
              </p>
            </div>
            <div className="pt-3">
              <a
                href="https://portaldocontribuinte.minfin.gov.ao/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-[#002b49] text-xs font-black uppercase tracking-wider rounded-md hover:bg-slate-100 transition-colors shadow-sm"
              >
                <span>VER GUIA AGT</span>
                <ArrowRight size={13} />
              </a>
            </div>
          </div>

          {/* 2. LINKS OFICIAIS (ANG) */}
          <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3 text-[#002b49] font-black text-xs uppercase tracking-wider">
              <ExternalLink size={14} className="text-blue-600" />
              <span>LINKS OFICIAIS (ANG)</span>
            </div>
            <div className="divide-y divide-zinc-100">
              {OFFICIAL_LINKS.map((link) => (
                <a
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between py-2.5 px-2 hover:bg-zinc-50 rounded text-xs font-bold text-zinc-700 hover:text-[#002b49] transition-colors"
                >
                  <span>{link.name}</span>
                  <ChevronRight size={14} className="text-zinc-400" />
                </a>
              ))}
            </div>
          </div>

          {/* 3. APOIO DO CONSULTOR */}
          <div className="bg-white rounded-xl border border-zinc-200 p-5 text-center shadow-sm flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2.5">
              <MessageSquare size={22} />
            </div>
            <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900 mb-1">
              APOIO DO CONSULTOR
            </h4>
            <p className="text-[11px] text-zinc-500 leading-relaxed max-w-xs mb-3 italic">
              Tire as suas dúvidas diretamente com a nossa rede de consultores fiscais certificados.
            </p>
            <button
              type="button"
              onClick={handleOpenConsultoria}
              className="text-xs font-black uppercase tracking-wider text-[#002b49] hover:underline cursor-pointer"
            >
              INICIAR CHAT DE CONSULTORIA
            </button>
          </div>
        </div>
      </div>

      {/* Tendência de Volume */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 mt-8">
        <h3 className="text-sm font-bold text-zinc-800 flex items-center gap-2 mb-8">
          <Activity className="text-blue-600" size={18} /> TENDÊNCIA DE VOLUME
        </h3>
        <div className="w-full min-w-[100px] h-[300px]" style={{ minHeight: 300 }}>
          <ResponsiveContainer width="100%" height={280} minWidth={100} debounce={50}>
            <AreaChart data={volumeData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorVolume)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Estados Documentais */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 mt-6">
        <h3 className="text-sm font-bold text-zinc-800 flex items-center gap-2 mb-6">
          <PieChartIcon className="text-blue-600" size={18} /> ESTADOS DOCUMENTAIS
        </h3>
        <div className="h-64 w-full min-w-[100px] flex justify-center" style={{ minHeight: 240 }}>
          <ResponsiveContainer width="100%" height={240} minWidth={100} debounce={50}>
            <PieChart>
              <Pie data={docStatesData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                {docStatesData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default EcosystemDashboard;
