import React, { useState } from 'react';
import { Plus, Wallet, ArrowRightLeft, ShieldCheck, Calculator, Search, Eye, Trash2, ChevronLeft, ChevronRight, ArrowUpCircle, ArrowDownCircle, History, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Caixa, CaixaMovement } from '../types';

interface CaixaModuleProps {
  caixas: Caixa[];
  setCaixas: React.Dispatch<React.SetStateAction<Caixa[]>>;
  movements: CaixaMovement[];
  setMovements: React.Dispatch<React.SetStateAction<CaixaMovement[]>>;
}

export const CaixaModule = ({ caixas, setCaixas, movements, setMovements }: CaixaModuleProps) => {
  const [showForm, setShowForm] = useState(false);
  const [newCaixa, setNewCaixa] = useState({ name: '', initialBalance: 0, obs: '', responsible: '', account: '', user: '' });
  const [activeSection, setActiveSection] = useState('list');
  const [selectedCaixaId, setSelectedCaixaId] = useState<string | null>(null);
  const [activeCurrency, setActiveCurrency] = useState('AOA');

  // Transfer form state
  const [transferData, setTransferData] = useState({ from: '', to: '', amount: 0, description: '' });
  // Payment form state
  const [paymentData, setPaymentData] = useState({ caixaId: '', amount: 0, description: '' });
  // Reconciliation state
  const [reconData, setReconData] = useState({ caixaId: '', actualBalance: 0, description: '' });

  const handleCreateCaixa = async (e: React.FormEvent) => {
    e.preventDefault();
    const caixa: Caixa = {
      id: Date.now().toString(),
      name: newCaixa.name,
      account: newCaixa.account,
      responsible: newCaixa.responsible,
      user: newCaixa.user,
      users: 1,
      initialBalance: newCaixa.initialBalance,
      currentBalance: newCaixa.initialBalance,
      obs: newCaixa.obs,
    };
    
    try {
      const res = await fetch('/api/caixas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(caixa)
      });
      if (res.ok) {
        setCaixas([...caixas, caixa]);
        setNewCaixa({ name: '', initialBalance: 0, obs: '', responsible: '', account: '', user: '' });
        setShowForm(false);
      }
    } catch (error) {
      console.error('Error creating caixa:', error);
      alert('Erro ao criar caixa');
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transferData.from === transferData.to) return alert('Selecione caixas diferentes');
    if (transferData.amount <= 0) return;

    const fromCaixa = caixas.find(c => c.id === transferData.from);
    if (!fromCaixa || fromCaixa.currentBalance < transferData.amount) return alert('Saldo insuficiente');

    const movementId = Date.now().toString();
    const newMovement: CaixaMovement = {
      id: movementId,
      caixaId: transferData.from,
      targetCaixaId: transferData.to,
      type: 'transferencia',
      amount: transferData.amount,
      description: transferData.description || `Transferência para ${caixas.find(c => c.id === transferData.to)?.name}`,
      date: new Date().toISOString(),
    };

    try {
      const res = await fetch('/api/caixa-movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMovement)
      });
      if (res.ok) {
        setMovements([...movements, newMovement]);
        setCaixas(caixas.map(c => {
          if (c.id === transferData.from) return { ...c, currentBalance: c.currentBalance - transferData.amount };
          if (c.id === transferData.to) return { ...c, currentBalance: c.currentBalance + transferData.amount };
          return c;
        }));
        setTransferData({ from: '', to: '', amount: 0, description: '' });
        setActiveSection('list');
      }
    } catch (error) {
      console.error('Error in transfer:', error);
      alert('Erro ao realizar transferência');
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentData.amount <= 0) return;

    const caixa = caixas.find(c => c.id === paymentData.caixaId);
    if (!caixa || caixa.currentBalance < paymentData.amount) return alert('Saldo insuficiente');

    const newMovement: CaixaMovement = {
      id: Date.now().toString(),
      caixaId: paymentData.caixaId,
      type: 'saida',
      amount: paymentData.amount,
      description: paymentData.description,
      date: new Date().toISOString(),
    };

    try {
      const res = await fetch('/api/caixa-movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMovement)
      });
      if (res.ok) {
        setMovements([...movements, newMovement]);
        setCaixas(caixas.map(c => c.id === paymentData.caixaId ? { ...c, currentBalance: c.currentBalance - paymentData.amount } : c));
        setPaymentData({ caixaId: '', amount: 0, description: '' });
        setActiveSection('list');
      }
    } catch (error) {
      console.error('Error in payment:', error);
      alert('Erro ao realizar pagamento');
    }
  };

  const handleReconciliation = async (e: React.FormEvent) => {
    e.preventDefault();
    const caixa = caixas.find(c => c.id === reconData.caixaId);
    if (!caixa) return;

    const diff = reconData.actualBalance - caixa.currentBalance;
    if (diff === 0) return alert('O saldo já está correto');

    const newMovement: CaixaMovement = {
      id: Date.now().toString(),
      caixaId: reconData.caixaId,
      type: diff > 0 ? 'entrada' : 'saida',
      amount: Math.abs(diff),
      description: `Conciliação: ${reconData.description}`,
      date: new Date().toISOString(),
    };

    try {
      const res = await fetch('/api/caixa-movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMovement)
      });
      if (res.ok) {
        setMovements([...movements, newMovement]);
        setCaixas(caixas.map(c => c.id === reconData.caixaId ? { ...c, currentBalance: reconData.actualBalance } : c));
        setReconData({ caixaId: '', actualBalance: 0, description: '' });
        setActiveSection('list');
      }
    } catch (error) {
      console.error('Error in reconciliation:', error);
      alert('Erro ao realizar conciliação');
    }
  };

  const sections = [
    { id: 'list', label: 'Caixas', icon: Wallet },
    { id: 'movements', label: 'Movimentos', icon: History },
    { id: 'transfer', label: 'Transferência', icon: ArrowRightLeft },
    { id: 'payment', label: 'Pagamento', icon: Calculator },
    { id: 'recon', label: 'Conciliação', icon: ShieldCheck },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center bg-white p-4 border border-zinc-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[#003366] flex items-center justify-center text-white">
            <Wallet size={20} />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#003366] uppercase tracking-tight">Gestão Financeira de Caixa</h2>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Controle de fluxos, transferências e conciliação</p>
          </div>
        </div>
        <div className="flex gap-2">
          {sections.map(s => (
            <button 
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
                activeSection === s.id ? 'bg-[#003366] text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              <s.icon size={14} /> {s.label}
            </button>
          ))}
          <button 
            onClick={() => setShowForm(true)}
            className="bg-[#F27D26] text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-[#d96a1a] transition-all shadow-lg ml-4"
          >
            <Plus size={14} /> Novo Caixa
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {activeSection === 'list' && (
          <div className="space-y-4">
            <div className="flex gap-1">
              {['AOA', 'USD', 'EUR'].map(curr => (
                <button
                  key={curr}
                  onClick={() => setActiveCurrency(curr)}
                  className={`px-6 py-2 text-xs font-black border border-zinc-200 transition-all ${
                    activeCurrency === curr ? 'bg-[#00CCFF] text-black' : 'bg-white text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  {curr}
                </button>
              ))}
            </div>

            <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
              <div className="bg-zinc-50 border-b border-zinc-200 p-2 text-center">
                <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Caixas e Bancos</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[10px]">
                  <thead>
                    <tr className="bg-zinc-100 text-zinc-600 font-black uppercase border-b border-zinc-200">
                      <th className="px-2 py-2 border-r border-zinc-200 text-center w-10">Ln</th>
                      <th className="px-4 py-2 border-r border-zinc-200">Account</th>
                      <th className="px-2 py-2 border-r border-zinc-200 text-center w-10">ID</th>
                      <th className="px-4 py-2 border-r border-zinc-200 min-w-[200px]">Caixa</th>
                      <th className="px-4 py-2 border-r border-zinc-200 min-w-[200px]">Responsavel</th>
                      <th className="px-4 py-2 border-r border-zinc-200 min-w-[200px]">Obs</th>
                      <th className="px-4 py-2 border-r border-zinc-200 text-right">Saldo Caixa</th>
                      <th className="px-2 py-2 border-r border-zinc-200 text-center">Users</th>
                      <th className="px-2 py-2 text-center">Doc</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {caixas.map((caixa, idx) => (
                      <tr key={caixa.id} className="hover:bg-zinc-50 transition-colors group">
                        <td className="px-2 py-2 border-r border-zinc-200 text-center text-zinc-500">{idx + 1}</td>
                        <td className="px-4 py-2 border-r border-zinc-200 font-mono text-zinc-600">{caixa.account || '45'}</td>
                        <td className="px-2 py-2 border-r border-zinc-200 text-center text-zinc-500">{caixa.id.slice(-1)}</td>
                        <td className="px-4 py-2 border-r border-zinc-200 font-black text-[#003366] uppercase">{caixa.name}</td>
                        <td className="px-4 py-2 border-r border-zinc-200 text-zinc-500">{caixa.responsible || '---'}</td>
                        <td className="px-4 py-2 border-r border-zinc-200 text-zinc-400 italic">{caixa.obs || '---'}</td>
                        <td className="px-4 py-2 border-r border-zinc-200 text-right font-black text-zinc-900">
                          {caixa.currentBalance.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} {activeCurrency}
                        </td>
                        <td className="px-2 py-2 border-r border-zinc-200 text-center font-bold">{caixa.users || 1}</td>
                        <td className="px-2 py-2 text-center">
                          <button className="text-zinc-400 hover:text-[#003366]">
                            <FileText size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {caixas.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-6 py-12 text-center text-zinc-400 italic">Nenhum caixa registado.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'movements' && (
          <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-[#003366] text-white flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <History size={14} /> Movimentos de Caixa
              </h3>
              <select 
                className="bg-white/10 text-white border border-white/20 px-3 py-1 text-[10px] font-bold uppercase focus:outline-none"
                value={selectedCaixaId || ''}
                onChange={e => setSelectedCaixaId(e.target.value || null)}
              >
                <option value="" className="text-zinc-800">Todos os Caixas</option>
                {caixas.map(c => <option key={c.id} value={c.id} className="text-zinc-800">{c.name}</option>)}
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 text-zinc-500 text-[9px] font-black uppercase tracking-widest border-b border-zinc-200">
                    <th className="px-6 py-4">Data</th>
                    <th className="px-6 py-4">Caixa</th>
                    <th className="px-6 py-4">Descrição</th>
                    <th className="px-6 py-4">Tipo</th>
                    <th className="px-6 py-4 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {movements
                    .filter(m => !selectedCaixaId || m.caixaId === selectedCaixaId || m.targetCaixaId === selectedCaixaId)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map(m => (
                      <tr key={m.id} className="hover:bg-zinc-50 transition-colors">
                        <td className="px-6 py-4 text-[10px] font-bold text-zinc-500">{new Date(m.date).toLocaleString()}</td>
                        <td className="px-6 py-4 text-[10px] font-black text-[#003366] uppercase">
                          {caixas.find(c => c.id === m.caixaId)?.name}
                          {m.targetCaixaId && ` → ${caixas.find(c => c.id === m.targetCaixaId)?.name}`}
                        </td>
                        <td className="px-6 py-4 text-[10px] text-zinc-600 italic">{m.description}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-[8px] font-black uppercase tracking-tighter ${
                            m.type === 'entrada' ? 'bg-emerald-100 text-emerald-700' : 
                            m.type === 'saida' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {m.type}
                          </span>
                        </td>
                        <td className={`px-6 py-4 text-[10px] font-black text-right ${
                          m.type === 'entrada' ? 'text-emerald-600' : 
                          m.type === 'saida' ? 'text-red-600' : 'text-blue-600'
                        }`}>
                          {m.type === 'saida' ? '-' : '+'}{m.amount.toLocaleString('pt-PT', { style: 'currency', currency: 'AOA' })}
                        </td>
                      </tr>
                    ))}
                  {movements.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-zinc-400 font-bold uppercase tracking-widest text-[10px]">Sem movimentos registados</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSection === 'transfer' && (
          <div className="max-w-2xl mx-auto w-full bg-white border border-zinc-200 shadow-sm">
            <div className="p-4 bg-[#003366] text-white">
              <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <ArrowRightLeft size={14} /> Transferência Intercaixa
              </h3>
            </div>
            <form onSubmit={handleTransfer} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Origem (Sairá de:)</label>
                  <select 
                    required
                    className="w-full border border-zinc-200 px-4 py-3 text-xs font-bold text-[#003366] focus:outline-none focus:border-[#003366]"
                    value={transferData.from}
                    onChange={e => setTransferData({...transferData, from: e.target.value})}
                  >
                    <option value="">Selecione o caixa</option>
                    {caixas.map(c => <option key={c.id} value={c.id}>{c.name} (Saldo: {c.currentBalance.toLocaleString()})</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Destino (Entrará em:)</label>
                  <select 
                    required
                    className="w-full border border-zinc-200 px-4 py-3 text-xs font-bold text-[#003366] focus:outline-none focus:border-[#003366]"
                    value={transferData.to}
                    onChange={e => setTransferData({...transferData, to: e.target.value})}
                  >
                    <option value="">Selecione o caixa</option>
                    {caixas.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Valor da Transferência</label>
                <div className="relative">
                  <input 
                    type="number" 
                    required
                    step="0.01"
                    className="w-full border border-zinc-200 pl-12 pr-4 py-3 text-lg font-black text-[#003366] focus:outline-none focus:border-[#003366]"
                    placeholder="0,00"
                    value={transferData.amount || ''}
                    onChange={e => setTransferData({...transferData, amount: parseFloat(e.target.value)})}
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">AOA</div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Descrição / Motivo</label>
                <input 
                  type="text"
                  className="w-full border border-zinc-200 px-4 py-3 text-xs focus:outline-none focus:border-[#003366]"
                  placeholder="Ex: Reforço de caixa operacional"
                  value={transferData.description}
                  onChange={e => setTransferData({...transferData, description: e.target.value})}
                />
              </div>
              <button type="submit" className="w-full bg-[#003366] text-white py-4 font-black uppercase tracking-widest text-xs hover:bg-[#002244] transition-all shadow-xl">
                Executar Transferência
              </button>
            </form>
          </div>
        )}

        {activeSection === 'payment' && (
          <div className="max-w-2xl mx-auto w-full bg-white border border-zinc-200 shadow-sm">
            <div className="p-4 bg-[#003366] text-white">
              <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <Calculator size={14} /> Registar Pagamento / Saída
              </h3>
            </div>
            <form onSubmit={handlePayment} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Caixa de Origem</label>
                <select 
                  required
                  className="w-full border border-zinc-200 px-4 py-3 text-xs font-bold text-[#003366] focus:outline-none focus:border-[#003366]"
                  value={paymentData.caixaId}
                  onChange={e => setPaymentData({...paymentData, caixaId: e.target.value})}
                >
                  <option value="">Selecione o caixa</option>
                  {caixas.map(c => <option key={c.id} value={c.id}>{c.name} (Saldo: {c.currentBalance.toLocaleString()})</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Valor do Pagamento</label>
                <div className="relative">
                  <input 
                    type="number" 
                    required
                    step="0.01"
                    className="w-full border border-zinc-200 pl-12 pr-4 py-3 text-lg font-black text-red-600 focus:outline-none focus:border-[#003366]"
                    placeholder="0,00"
                    value={paymentData.amount || ''}
                    onChange={e => setPaymentData({...paymentData, amount: parseFloat(e.target.value)})}
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">AOA</div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Descrição / Beneficiário</label>
                <input 
                  type="text"
                  required
                  className="w-full border border-zinc-200 px-4 py-3 text-xs focus:outline-none focus:border-[#003366]"
                  placeholder="Ex: Pagamento de Fornecedor X"
                  value={paymentData.description}
                  onChange={e => setPaymentData({...paymentData, description: e.target.value})}
                />
              </div>
              <button type="submit" className="w-full bg-red-600 text-white py-4 font-black uppercase tracking-widest text-xs hover:bg-red-700 transition-all shadow-xl">
                Confirmar Pagamento
              </button>
            </form>
          </div>
        )}

        {activeSection === 'recon' && (
          <div className="max-w-2xl mx-auto w-full bg-white border border-zinc-200 shadow-sm">
            <div className="p-4 bg-[#003366] text-white">
              <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck size={14} /> Conciliação de Caixa
              </h3>
            </div>
            <form onSubmit={handleReconciliation} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Caixa para Conciliar</label>
                <select 
                  required
                  className="w-full border border-zinc-200 px-4 py-3 text-xs font-bold text-[#003366] focus:outline-none focus:border-[#003366]"
                  value={reconData.caixaId}
                  onChange={e => setReconData({...reconData, caixaId: e.target.value})}
                >
                  <option value="">Selecione o caixa</option>
                  {caixas.map(c => <option key={c.id} value={c.id}>{c.name} (Saldo Sistema: {c.currentBalance.toLocaleString()})</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Saldo Físico (Real)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    required
                    step="0.01"
                    className="w-full border border-zinc-200 pl-12 pr-4 py-3 text-lg font-black text-[#003366] focus:outline-none focus:border-[#003366]"
                    placeholder="0,00"
                    value={reconData.actualBalance || ''}
                    onChange={e => setReconData({...reconData, actualBalance: parseFloat(e.target.value)})}
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">AOA</div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Justificativa da Diferença</label>
                <textarea 
                  required
                  className="w-full border border-zinc-200 px-4 py-3 text-xs focus:outline-none focus:border-[#003366] h-24 resize-none"
                  placeholder="Explique o motivo do ajuste de saldo..."
                  value={reconData.description}
                  onChange={e => setReconData({...reconData, description: e.target.value})}
                ></textarea>
              </div>
              <button type="submit" className="w-full bg-amber-500 text-white py-4 font-black uppercase tracking-widest text-xs hover:bg-amber-600 transition-all shadow-xl">
                Efetuar Ajuste de Conciliação
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Form Modal for New Caixa */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-zinc-200 p-8 shadow-2xl relative overflow-hidden max-w-md w-full"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-[#F27D26]" />
              <h3 className="font-black text-[#003366] mb-6 flex items-center gap-2 uppercase tracking-tight">
                <Plus size={18} /> Criar Novo Caixa
              </h3>
              <form onSubmit={handleCreateCaixa} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Nome do Caixa</label>
                    <input 
                      type="text" 
                      required 
                      className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366] transition-all" 
                      placeholder="Ex: Caixa Central" 
                      value={newCaixa.name}
                      onChange={e => setNewCaixa({...newCaixa, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Conta Contabilística</label>
                    <input 
                      type="text" 
                      className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366] transition-all" 
                      placeholder="Ex: 45.01" 
                      value={newCaixa.account}
                      onChange={e => setNewCaixa({...newCaixa, account: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Responsável</label>
                    <input 
                      type="text" 
                      className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366] transition-all" 
                      placeholder="Nome do responsável" 
                      value={newCaixa.responsible}
                      onChange={e => setNewCaixa({...newCaixa, responsible: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Utilizador</label>
                    <input 
                      type="text" 
                      className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366] transition-all" 
                      placeholder="Utilizador associado" 
                      value={newCaixa.user}
                      onChange={e => setNewCaixa({...newCaixa, user: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Saldo Inicial</label>
                  <input 
                    type="number" 
                    required 
                    step="0.01"
                    className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366] transition-all" 
                    placeholder="0,00"
                    value={newCaixa.initialBalance || ''}
                    onChange={e => setNewCaixa({...newCaixa, initialBalance: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Observações</label>
                  <textarea 
                    className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366] h-24 transition-all" 
                    placeholder="Notas adicionais..."
                    value={newCaixa.obs}
                    onChange={e => setNewCaixa({...newCaixa, obs: e.target.value})}
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-zinc-100 text-zinc-600 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all">Cancelar</button>
                  <button type="submit" className="flex-2 bg-[#003366] text-white py-3 px-8 text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-[#002244] transition-all">Registar Caixa</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
