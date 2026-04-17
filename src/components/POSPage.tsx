import React, { useState, useEffect } from 'react';
import { Product, POSArea, FiscalSeries, CostCenter, POSPoint, CashSession } from '../types';
import { ShoppingBag, Store, Utensils, Wine, CheckCircle, TrendingUp, PlusCircle, ArrowRightLeft, XCircle, Package, ClipboardList, UserCheck, Wallet, AlertTriangle, X, BarChart3, Tag, ChevronLeft, LayoutDashboard } from 'lucide-react';

const fetchJson = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}`);
  return response.json();
};

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);

const POSPage = ({ products = [], onRefresh = () => {}, onNavigate = () => {} }: { products?: Product[], onRefresh?: () => void, onNavigate?: (page: string) => void }) => {
  const [activeArea, setActiveArea] = useState<POSArea | 'dashboard'>('dashboard');
  const [cart, setCart] = useState<{product: Product, qty: number, discount: number}[]>([]);
  const [search, setSearch] = useState('');
  const [series, setSeries] = useState<FiscalSeries[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [posPoints, setPosPoints] = useState<POSPoint[]>([]);
  const [sessions, setSessions] = useState<CashSession[]>([]);
  
  const [selectedSeries, setSelectedSeries] = useState('');
  const [selectedCostCenter, setSelectedCostCenter] = useState('');
  const [selectedPOS, setSelectedPOS] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [globalDiscount, setGlobalDiscount] = useState(0);
  
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showPOSModal, setShowPOSModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState<{index: number} | null>(null);
  const [initialBalance, setInitialBalance] = useState('');
  const [printingSale, setPrintingSale] = useState<any>(null);

  const safeProducts = Array.isArray(products) ? products : [];
  const activeSession = (sessions || []).find(s => s.status === 'open');

  const fetchData = async () => {
    const [s, cc, pp, sess] = await Promise.all([
      fetchJson('/api/fiscal-series'),
      fetchJson('/api/cost-centers'),
      fetchJson('/api/pos-points'),
      fetchJson('/api/cash/sessions')
    ]);
    setSeries(s);
    setCostCenters(cc);
    setPosPoints(pp);
    setSessions(sess);
    if (pp.length > 0 && !selectedPOS) setSelectedPOS(pp[0].id.toString());
    if (s.length > 0 && !selectedSeries) setSelectedSeries(s[0].id.toString());
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addToCart = (product: Product) => {
    const existing = (cart || []).find(item => item.product.id === product.id);
    if (existing) {
      setCart((cart || []).map(item => item.product.id === product.id ? {...item, qty: item.qty + 1} : item));
    } else {
      setCart([...cart, { product, qty: 1, discount: 0 }]);
    }
  };

  const subtotal = (cart || []).reduce((sum, item) => sum + (item.product.price * item.qty), 0);
  const itemDiscounts = (cart || []).reduce((sum, item) => sum + (item.discount), 0);
  const total = subtotal - itemDiscounts - globalDiscount;
  const change = parseFloat(amountPaid) > total ? parseFloat(amountPaid) - total : 0;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!activeSession) {
      alert('Por favor, abra o caixa primeiro.');
      return;
    }
    
    // First, create the POS sale
    const posRes = await fetch('/api/pos/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        total, 
        items: cart,
        series_id: selectedSeries,
        cost_center_id: selectedCostCenter,
        pos_point_id: selectedPOS,
        session_id: activeSession.id,
        discount: globalDiscount + itemDiscounts,
        payment_method: paymentMethod
      })
    });
    
    if (posRes.ok) {
      const saleData = await posRes.json();
      
      // Also create an invoice for the invoice list
      await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: 1, // Default Consumidor Final
          date: new Date().toISOString().split('T')[0],
          items: (cart || []).map(c => ({
            product_id: c.product.id,
            description: c.product.name,
            quantity: c.qty,
            unit_price: c.product.price,
            total: (c.qty * c.product.price) - c.discount
          })),
          document_type: 'Fatura Recibo',
          series_id: selectedSeries,
          payment_method: paymentMethod,
          cash_box: selectedPOS
        })
      });

      setPrintingSale({
        id: saleData.id,
        total,
        items: cart,
        date: new Date().toLocaleString(),
        payment_method: paymentMethod,
        change
      });

      setCart([]);
      setAmountPaid('');
      setGlobalDiscount(0);
      onRefresh();
      fetchData();
    }
  };

  const handleOpenSession = async () => {
    const res = await fetch('/api/cash/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        initial_balance: parseFloat(initialBalance) || 0,
        pos_point_id: selectedPOS
      })
    });
    if (res.ok) {
      setShowSessionModal(false);
      fetchData();
    }
  };

  const handleCloseSession = async () => {
    if (!activeSession) return;
    const res = await fetch(`/api/cash/close/${activeSession.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ final_balance: total }) // Simplified
    });
    if (res.ok) {
      fetchData();
      alert('Caixa fechado com sucesso!');
    }
  };

  const handleAddPOS = async (name: string, location: string) => {
    const res = await fetch('/api/pos-points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, location })
    });
    if (res.ok) {
      setShowPOSModal(false);
      fetchData();
    }
  };

  if (activeArea === 'dashboard') {
    return (
      <div className="p-8 bg-zinc-50 min-h-screen">
        <header className="mb-8">
          <h2 className="text-2xl font-bold text-[#003366]">Gestão de Ponto de Venda</h2>
          <p className="text-zinc-500 text-sm">Selecione uma área ou operação para continuar.</p>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          <button
            onClick={() => onNavigate('dashboard')}
            className="bg-white border border-zinc-200 p-6 flex flex-col items-center justify-center gap-4 hover:shadow-lg transition-all group hover:border-[#003366]"
          >
            <div className="w-12 h-12 bg-zinc-500 text-white flex items-center justify-center rounded-none group-hover:scale-110 transition-transform">
              <ChevronLeft size={24} />
            </div>
            <span className="text-xs font-bold text-zinc-700 uppercase tracking-tight text-center">Voltar ao Menu</span>
          </button>
          {[
            { id: 'normal', label: 'Vendas Normal', icon: ShoppingBag, color: 'bg-blue-500' },
            { id: 'lojas', label: 'Lojas', icon: Store, color: 'bg-indigo-500' },
            { id: 'restaurante', label: 'Restaurante', icon: Utensils, color: 'bg-orange-500' },
            { id: 'bar', label: 'Bar', icon: Wine, color: 'bg-purple-500' },
            { id: 'abertura', label: 'Abertura de Caixa', icon: CheckCircle, color: 'bg-emerald-500', action: () => setShowSessionModal(true) },
            { id: 'movimento', label: 'Movimento Diário', icon: TrendingUp, color: 'bg-blue-600', action: () => setShowReportModal(true) },
            { id: 'add_pos', label: 'Adicionar POS', icon: PlusCircle, color: 'bg-zinc-600', action: () => setShowPOSModal(true) },
            { id: 'transfer', label: 'Transferir Vendas', icon: ArrowRightLeft, color: 'bg-amber-500', action: () => alert('Funcionalidade em desenvolvimento') },
            { id: 'fecho', label: 'Fecho de Caixa', icon: XCircle, color: 'bg-red-500', action: handleCloseSession },
            { id: 'stock', label: 'Ver Stock', icon: Package, color: 'bg-zinc-800', action: () => alert('Funcionalidade em desenvolvimento') },
            { id: 'fechos_view', label: 'Ver Fechos', icon: ClipboardList, color: 'bg-zinc-700', action: () => alert('Funcionalidade em desenvolvimento') },
            { id: 'permissions', label: 'Pertir Utilizador', icon: UserCheck, color: 'bg-blue-800', action: () => alert('Funcionalidade em desenvolvimento') },
            { id: 'cash_move', label: 'Caixas Movimento', icon: Wallet, color: 'bg-emerald-700', action: () => alert('Funcionalidade em desenvolvimento') },
            { id: 'occurrence', label: 'Adicionar Ocorrência', icon: AlertTriangle, color: 'bg-red-600', action: () => alert('Funcionalidade em desenvolvimento') },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.action) item.action();
                else if (['normal', 'lojas', 'restaurante', 'bar'].includes(item.id)) setActiveArea(item.id as POSArea);
              }}
              className="bg-white border border-zinc-200 p-6 flex flex-col items-center justify-center gap-4 hover:shadow-lg transition-all group hover:border-[#003366]"
            >
              <div className={`w-12 h-12 ${item.color} text-white flex items-center justify-center rounded-none group-hover:scale-110 transition-transform`}>
                <item.icon size={24} />
              </div>
              <span className="text-xs font-bold text-zinc-700 uppercase tracking-tight text-center">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Modals from POSModule */}
        {showSessionModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-zinc-900/80 backdrop-blur-sm">
            <div className="bg-white rounded-none shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="p-6 border-b border-zinc-100 bg-zinc-50 flex justify-between items-center">
                <h3 className="font-bold text-[#003366]">Abertura de Caixa</h3>
                <button onClick={() => setShowSessionModal(false)}><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Fundo de Maneio Inicial</label>
                  <input 
                    type="number" 
                    value={initialBalance}
                    onChange={e => setInitialBalance(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 px-4 py-3 text-lg font-bold text-[#003366] focus:outline-none focus:border-[#003366]"
                    placeholder="0.00"
                  />
                </div>
                <button 
                  onClick={handleOpenSession}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 shadow-lg"
                >
                  Confirmar Abertura
                </button>
              </div>
            </div>
          </div>
        )}

        {showPOSModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-zinc-900/80 backdrop-blur-sm">
            <div className="bg-white rounded-none shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="p-6 border-b border-zinc-100 bg-zinc-50 flex justify-between items-center">
                <h3 className="font-bold text-[#003366]">Novo Ponto de Venda</h3>
                <button onClick={() => setShowPOSModal(false)}><X size={20} /></button>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                const target = e.target as any;
                handleAddPOS(target.name.value, target.location.value);
              }} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Nome do Terminal</label>
                  <input name="name" required className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2 text-sm focus:outline-none focus:border-[#003366]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Localização</label>
                  <input name="location" required className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2 text-sm focus:outline-none focus:border-[#003366]" />
                </div>
                <button type="submit" className="w-full bg-[#003366] text-white font-bold py-3 shadow-lg">Registar Terminal</button>
              </form>
            </div>
          </div>
        )}

        {showReportModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-zinc-900/80 backdrop-blur-sm">
            <div className="bg-white rounded-none shadow-2xl w-full max-w-2xl overflow-hidden">
              <div className="p-6 border-b border-zinc-100 bg-zinc-50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#003366] text-white flex items-center justify-center">
                    <BarChart3 size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#003366]">Relatório de Vendas POS</h3>
                    <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Sessão: {activeSession?.id || 'N/A'}</p>
                  </div>
                </div>
                <button onClick={() => setShowReportModal(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-8">
                <div className="grid grid-cols-3 gap-6">
                  <div className="bg-zinc-50 p-5 border border-zinc-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                      <TrendingUp size={48} />
                    </div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Total Vendas</p>
                    <p className="text-2xl font-black text-[#003366]">{formatCurrency(activeSession?.total_sales || 0)}</p>
                  </div>
                  <div className="bg-zinc-50 p-5 border border-zinc-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Tag size={48} />
                    </div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Total Descontos</p>
                    <p className="text-2xl font-black text-red-500">{formatCurrency(activeSession?.total_discounts || 0)}</p>
                  </div>
                  <div className="bg-zinc-50 p-5 border border-zinc-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Wallet size={48} />
                    </div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Saldo Atual</p>
                    <p className="text-2xl font-black text-emerald-600">{formatCurrency((activeSession?.initial_balance || 0) + (activeSession?.total_sales || 0))}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Histórico de Sessões</p>
                    <span className="text-[10px] font-bold text-[#003366] bg-[#003366]/5 px-2 py-0.5">Últimas 5 sessões</span>
                  </div>
                  <div className="border border-zinc-100 divide-y divide-zinc-100">
                    {(sessions || []).slice(0, 5).map(s => (
                      <div key={s.id} className="p-4 flex justify-between items-center hover:bg-zinc-50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`w-2 h-2 rounded-full ${s.status === 'open' ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-300'}`} />
                          <div>
                            <p className="font-bold text-zinc-700 text-sm">{new Date(s.opened_at).toLocaleString('pt-PT')}</p>
                            <p className="text-[10px] text-zinc-400 font-medium">
                              Status: <span className={s.status === 'open' ? 'text-emerald-600 font-bold' : 'text-zinc-500'}>
                                {s.status === 'open' ? 'Aberta' : 'Fechada'}
                              </span>
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-[#003366]">{formatCurrency(s.total_sales)}</p>
                          <p className="text-[9px] text-zinc-400 font-bold uppercase">Total Bruto</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] -mt-12 -mx-12">
      {/* POS Header/Toolbar */}
      <div className="bg-[#003366] text-white p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-6">
          <button onClick={() => activeArea === 'dashboard' ? onNavigate('dashboard') : setActiveArea('dashboard')} className="flex items-center gap-2 hover:text-blue-300 transition-colors">
            <ChevronLeft size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">Voltar</span>
          </button>
          
          <div className="h-6 w-px bg-white/10" />
          
          <div className="flex items-center gap-2">
            <LayoutDashboard size={18} className="text-blue-300" />
            <h2 className="font-bold tracking-tight uppercase text-sm">Terminal POS - {activeArea}</h2>
          </div>
          
          <div className="h-6 w-px bg-white/10" />
          
          <div className="flex items-center gap-4 text-xs">
            <div className="flex flex-col">
              <span className="text-blue-300 font-bold uppercase text-[9px]">Série</span>
              <select 
                value={selectedSeries} 
                onChange={e => setSelectedSeries(e.target.value)}
                className="bg-transparent border-none focus:ring-0 font-bold p-0 cursor-pointer"
              >
                {(series || []).map(s => <option key={s.id} value={s.id} className="text-zinc-800">{s.description}</option>)}
              </select>
            </div>
            
            <div className="flex flex-col">
              <span className="text-blue-300 font-bold uppercase text-[9px]">Ponto de Venda</span>
              <div className="flex items-center gap-2">
                <select 
                  value={selectedPOS} 
                  onChange={e => setSelectedPOS(e.target.value)}
                  className="bg-transparent border-none focus:ring-0 font-bold p-0 cursor-pointer"
                >
                  {(posPoints || []).map(p => <option key={p.id} value={p.id} className="text-zinc-800">{p.name}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end mr-4">
            <span className="text-[9px] font-bold text-blue-300 uppercase">Sessão Ativa</span>
            <span className="text-xs font-black">{activeSession ? `ID: ${activeSession.id}` : 'NENHUMA'}</span>
          </div>
          {activeSession && (
            <button 
              onClick={handleCloseSession}
              className="bg-red-500 hover:bg-red-600 px-4 py-1.5 text-xs font-bold flex items-center gap-2 transition-all shadow-lg"
            >
              <X size={14} /> Fechar Caixa
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default POSPage;
