import React, { useState, useMemo } from 'react';
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Package, 
  ShoppingBag,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart as PieChartIcon,
  Download,
  Printer,
  History,
  Activity,
  Zap,
  ShieldCheck,
  Building2,
  FileText,
  Filter,
  RefreshCw,
  Search as SearchIcon
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

const COLORS = ['#003366', '#d97706', '#059669', '#dc2626', '#7c3aed'];

const BusinessOverview: React.FC<{
  invoices: any[];
  products: any[];
  clients: any[];
  transactions: any[];
}> = ({ invoices, products, clients, transactions }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('year');

  // Aggregations
  const totalInvoiced = useMemo(() => invoices.reduce((acc, inv) => acc + (inv.total || 0), 0), [invoices]);
  const totalPaid = useMemo(() => invoices.filter(i => i.payment_status === 'paid').reduce((acc, inv) => acc + (inv.total || 0), 0), [invoices]);
  const totalDebt = useMemo(() => invoices.filter(i => i.payment_status === 'pending').reduce((acc, inv) => acc + (inv.total || 0), 0), [invoices]);
  
  const totalExpenses = useMemo(() => transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + (t.amount || 0), 0), [transactions]);
  const totalStockValue = useMemo(() => products.reduce((acc, p) => acc + ((p.stock_quantity || 0) * (p.cost_price || 0)), 0), [products]);

  const netProfit = totalPaid - totalExpenses;
  const healthScore = Math.min(100, Math.max(0, (totalPaid / (totalExpenses || 1)) * 40 + (invoices.filter(i => i.payment_status === 'paid').length / (invoices.length || 1)) * 60));

  const chartData = [
    { name: 'Facturado', value: totalInvoiced },
    { name: 'Recebido', value: totalPaid },
    { name: 'Despesas', value: totalExpenses },
    { name: 'Dívidas', value: totalDebt },
  ];

  const historicalData = [
    { date: 'Jan', revenue: totalInvoiced * 0.8, expense: totalExpenses * 0.7 },
    { date: 'Fev', revenue: totalInvoiced * 0.85, expense: totalExpenses * 0.9 },
    { date: 'Mar', revenue: totalInvoiced, expense: totalExpenses },
  ];

  const formatAOA = (val: number) => {
    return new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(val).replace('AOA', 'Kz');
  };

  // Universal Search Logic
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    
    return {
      invoices: invoices.filter(i => (i.numero_documento || '').toLowerCase().includes(q) || (i.client_name || '').toLowerCase().includes(q)).slice(0, 5),
      products: products.filter(p => (p.name || '').toLowerCase().includes(q)).slice(0, 5),
      clients: clients.filter(c => (c.name || '').toLowerCase().includes(q) || (c.nif || '').toLowerCase().includes(q)).slice(0, 5)
    };
  }, [searchQuery, invoices, products, clients]);

  const totalTaxes = useMemo(() => invoices.reduce((acc, inv) => acc + (inv.total_tax || 0), 0), [invoices]);
  const totalDeductions = useMemo(() => invoices.reduce((acc, inv) => acc + (inv.global_discount || 0), 0), [invoices]);

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-[#003366] tracking-tight uppercase">Visão Geral Control de Gestão</h2>
          <p className="text-zinc-500 text-sm font-medium">Análise holística de movimentos, fluxos e indicadores do sistema.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => window.print()}
            className="p-2.5 border border-zinc-200 text-zinc-400 hover:text-zinc-600 transition-colors bg-white"
          >
            <Printer size={18} />
          </button>
          <button className="p-2.5 border border-zinc-200 text-zinc-400 hover:text-zinc-600 transition-colors bg-white">
            <RefreshCw size={18} />
          </button>
          <button className="flex items-center gap-2 bg-[#003366] text-white px-6 py-2.5 text-xs font-black uppercase tracking-widest shadow-lg hover:bg-[#002244] transition-all">
            <Download size={16} /> Relatório Global
          </button>
        </div>
      </header>

      {/* Universal Search Bar */}
      <div className="relative group z-30">
        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
          <SearchIcon className="text-zinc-400 group-focus-within:text-[#003366] transition-colors" size={20} />
        </div>
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Busca universal: Pesquise faturas, clientes, produtos, movimentos, vigilantes..."
          className="w-full pl-14 pr-32 py-5 bg-white border-2 border-zinc-100 shadow-xl text-lg font-medium focus:outline-none focus:border-[#003366] placeholder:text-zinc-300 transition-all"
        />
        <div className="absolute right-5 top-1/2 -translate-y-1/2 flex gap-2">
          <kbd className="px-2 py-1 bg-zinc-50 border border-zinc-200 rounded text-[10px] font-bold text-zinc-400 hidden md:block">CMD + K</kbd>
          <button className="bg-[#003366] text-white px-4 py-1.5 text-[10px] font-black uppercase tracking-widest">Pesquisar</button>
        </div>

        {/* Search Results Overlay */}
        <AnimatePresence>
          {searchResults && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute left-0 right-0 top-full mt-2 bg-white border border-zinc-200 shadow-2xl p-6 z-40 max-h-[60vh] overflow-y-auto"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4 border-b border-zinc-100 pb-2">Documentos Found ({searchResults.invoices.length})</h4>
                  <div className="space-y-2">
                    {searchResults.invoices.map((inv: any) => (
                      <div key={inv.id} className="p-2 hover:bg-zinc-50 cursor-pointer border-b border-zinc-50 last:border-0">
                        <p className="text-xs font-bold text-[#003366]">{inv.numero_documento}</p>
                        <p className="text-[10px] text-zinc-500">{inv.client_name}</p>
                      </div>
                    ))}
                    {searchResults.invoices.length === 0 && <p className="text-[10px] text-zinc-400 italic">Sem resultados</p>}
                  </div>
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4 border-b border-zinc-100 pb-2">Produtos ({searchResults.products.length})</h4>
                  <div className="space-y-2">
                    {searchResults.products.map((p: any) => (
                      <div key={p.id} className="p-2 hover:bg-zinc-50 cursor-pointer border-b border-zinc-50 last:border-0">
                        <p className="text-xs font-bold text-zinc-700">{p.name}</p>
                        <p className="text-[10px] text-zinc-500">Stock: {p.stock_quantity}</p>
                      </div>
                    ))}
                    {searchResults.products.length === 0 && <p className="text-[10px] text-zinc-400 italic">Sem resultados</p>}
                  </div>
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4 border-b border-zinc-100 pb-2">Clientes ({searchResults.clients.length})</h4>
                  <div className="space-y-2">
                    {searchResults.clients.map((c: any) => (
                      <div key={c.id} className="p-2 hover:bg-zinc-50 cursor-pointer border-b border-zinc-50 last:border-0">
                        <p className="text-xs font-bold text-zinc-700">{c.name}</p>
                        <p className="text-[10px] text-zinc-500">{c.nif}</p>
                      </div>
                    ))}
                    {searchResults.clients.length === 0 && <p className="text-[10px] text-zinc-400 italic">Sem resultados</p>}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Facturado', value: totalInvoiced, trend: '+12%', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Impostos (IVA/IS)', value: totalTaxes, trend: '+5%', icon: Building2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Deduções/Descontos', value: totalDeductions, trend: '-1%', icon: TrendingDown, color: 'text-orange-500', bg: 'bg-orange-50' },
          { label: 'Total em Dívida', value: totalDebt, trend: '+250k', icon: Activity, color: 'text-red-500', bg: 'bg-red-50' },
        ].map((kpi, i) => (
          <div key={i} className="bg-white p-6 border border-zinc-100 shadow-sm relative overflow-hidden group">
            <div className={`absolute top-0 left-0 w-1 h-full ${kpi.color.replace('text', 'bg')}`}></div>
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 ${kpi.bg} rounded-none`}>
                <kpi.icon size={20} className={kpi.color} />
              </div>
              <span className={`text-[10px] font-black uppercase flex items-center gap-1 ${
                kpi.trend.startsWith('+') ? 'text-emerald-600' : 'text-red-600'
              }`}>
                {kpi.trend.startsWith('+') ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                {kpi.trend}
              </span>
            </div>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">{kpi.label}</p>
            <p className="text-xl font-black text-zinc-800 tracking-tight">{formatAOA(kpi.value)}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Charts Area */}
          <div className="bg-white border border-zinc-100 p-8 shadow-sm">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h3 className="text-lg font-black text-[#003366] uppercase tracking-tighter">Fluxo de Caixa e Proveitos</h3>
                <p className="text-zinc-400 text-xs font-medium">Histórico acumulado do exercício fiscal.</p>
              </div>
              <div className="flex bg-zinc-50 p-1 border border-zinc-200">
                {['Mês', 'Ano', 'Total'].map((p) => (
                  <button 
                    key={p} 
                    onClick={() => setSelectedPeriod(p.toLowerCase())}
                    className={`px-4 py-1 text-[10px] font-black uppercase tracking-widest transition-all ${
                      selectedPeriod === p.toLowerCase() ? 'bg-white text-[#003366] shadow-sm' : 'text-zinc-400 hover:text-zinc-600'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historicalData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#003366" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#003366" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="revenue" stroke="#003366" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                  <Area type="monotone" dataKey="expense" stroke="#dc2626" strokeWidth={2} strokeDasharray="5 5" fill="none" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white border border-zinc-100 p-8 shadow-sm">
              <h3 className="text-sm font-black text-zinc-800 uppercase tracking-widest mb-6">Estrutura de Balanço</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border border-zinc-100 p-8 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-black text-zinc-800 uppercase tracking-widest mb-6">Análise de Lucro Líquido</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-end border-b border-dashed border-zinc-200 pb-2">
                    <span className="text-xs text-zinc-400 font-bold uppercase">Receitas Totais</span>
                    <span className="text-sm font-black text-zinc-800">{formatAOA(totalPaid)}</span>
                  </div>
                  <div className="flex justify-between items-end border-b border-dashed border-zinc-200 pb-2">
                    <span className="text-xs text-zinc-400 font-bold uppercase">Custos Totais</span>
                    <span className="text-sm font-black text-red-600">({formatAOA(totalExpenses)})</span>
                  </div>
                  <div className="flex justify-between items-end pt-2">
                    <span className="text-xs text-[#003366] font-black uppercase tracking-wider">Lucro Operacional</span>
                    <span className={`text-xl font-black ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatAOA(netProfit)}
                    </span>
                  </div>
                </div>
              </div>
              <button className="w-full mt-8 py-3 bg-[#0a0e1c] text-white text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-colors">
                Análise Detalhada IRT/IS
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Business Health Score */}
          <div className="bg-[#003366] p-8 text-white relative overflow-hidden">
            <ShieldCheck className="absolute -bottom-8 -right-8 text-white/5" size={160} />
            <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-8">Business Health Score</h3>
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-white/10" />
                  <circle cx="80" cy="80" r="70" stroke="white" strokeWidth="12" fill="transparent" strokeDasharray={440} strokeDashoffset={440 - (440 * healthScore / 100)} strokeLinecap="round" className="transition-all duration-1000" />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-4xl font-black tracking-tighter">{Math.round(healthScore)}%</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Óptimo</span>
                </div>
              </div>
              <p className="text-center text-xs text-white/70 leading-relaxed font-medium">
                O seu negócio está numa trajetória saudável. A taxa de cobrança de 85% está acima da média do setor angolano (70%).
              </p>
            </div>
          </div>

          {/* AI Insights / Suggestions */}
          <div className="bg-zinc-50 border border-zinc-200 p-8 space-y-6">
            <h3 className="text-xs font-black text-zinc-800 uppercase tracking-widest flex items-center gap-2">
              <Zap size={16} className="text-[#003366]" /> Insights de Gestão AI
            </h3>
            <ul className="space-y-4">
              {[
                { title: 'Reduzir Dívidas', desc: 'Existem 12 faturas vencidas há mais de 30 dias. Sugerimos o envio de lembretes automáticos.', impact: 'Alto' },
                { title: 'Optimizar Inventário', desc: 'Cerca de 15% do seu stock (Produtos IT) está parado há 6 meses. Considere uma promoção.', impact: 'Médio' },
                { title: 'Custos com HR', desc: 'As horas extras no setor de Vigilância subiram 20% este mês. Reveja as escalas.', impact: 'Crítico' },
              ].map((insight, i) => (
                <li key={i} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black text-[#003366] uppercase tracking-tight">{insight.title}</h4>
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 ${
                      insight.impact === 'Crítico' ? 'bg-red-600 text-white' : 'bg-emerald-100 text-emerald-600'
                    }`}>{insight.impact}</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-snug">{insight.desc}</p>
                </li>
              ))}
            </ul>
            <button className="w-full py-3 border-2 border-dashed border-[#003366] text-[#003366] text-[10px] font-black uppercase tracking-widest hover:bg-white transition-colors">
              Gerar Relatório de Melhoria
            </button>
          </div>

          <div className="bg-white border border-zinc-200 p-8">
            <h3 className="text-xs font-black text-zinc-800 uppercase tracking-widest mb-6">Integrações Ativas</h3>
            <div className="flex gap-4">
              {['AGT', 'INSS', 'MAPTSS', 'SISP'].map((app) => (
                <div key={app} className="w-10 h-10 bg-zinc-100 flex items-center justify-center font-black text-[10px] text-zinc-400 hover:text-[#003366] hover:bg-blue-50 transition-colors cursor-pointer">
                  {app}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessOverview;
