import React, { useState } from 'react';
import { Plus, Wallet, ArrowRightLeft, ShieldCheck, Calculator, Search, Eye, Trash2, ChevronLeft, ChevronRight, ArrowUpCircle, ArrowDownCircle, History, FileText, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Caixa, CaixaMovement } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useCaixas } from '../hooks/useCaixas';

export const CaixaModule = () => {
  const { user } = useAuth();
  const { caixas, movements, profiles, loading, createCaixa, updateCaixa, deleteCaixa, addMovement } = useCaixas();
  
  const [showForm, setShowForm] = useState(false);
  const [newCaixa, setNewCaixa] = useState({ name: '', codigo_caixa: '', account: '', initialBalance: 0, obs: '', responsible: '', user: '' });
  const [activeSection, setActiveSection] = useState('list');
  const [selectedCaixaId, setSelectedCaixaId] = useState<string | null>(null);
  const [activeCurrency, setActiveCurrency] = useState('AOA');
  const [showOptionsMenu, setShowOptionsMenu] = useState<Caixa | null>(null);
  const [editCaixa, setEditCaixa] = useState<Caixa | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Transfer form state
  const [transferData, setTransferData] = useState({ from: '', to: '', amount: 0, description: '' });
  // Payment form state
  const [paymentData, setPaymentData] = useState({ caixaId: '', amount: 0, description: '', type: 'outros' });
  // Reconciliation state
  const [reconData, setReconData] = useState({ caixaId: '', actualBalance: 0, description: '' });

  const handleCreateCaixa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    try {
      setIsSaving(true);
      if (!user?.empresa_id) throw new Error('Empresa não identificada');

      // Generate random custom unique code if not provided
      const finalCode = newCaixa.codigo_caixa.trim() || `CX-${Math.floor(100 + Math.random() * 900)}`;

      await createCaixa({
        name: newCaixa.name,
        codigo_caixa: finalCode,
        account: newCaixa.account,
        responsible: newCaixa.responsible,
        initialBalance: Number(newCaixa.initialBalance),
        obs: newCaixa.obs,
        user: newCaixa.user,
        moeda: activeCurrency,
        status: 'aberto',
        activo: true
      });

      alert('Caixa registado com sucesso!');
      setNewCaixa({ name: '', codigo_caixa: '', account: '', initialBalance: 0, obs: '', responsible: '', user: '' });
      setShowForm(false);
    } catch (error: any) {
      console.error('Error creating caixa:', error);
      alert(`Erro ao registar caixa: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateCaixa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCaixa || !user?.empresa_id || isUpdating) return;
    try {
      setIsUpdating(true);
      await updateCaixa(editCaixa.id, {
        name: editCaixa.name,
        codigo_caixa: editCaixa.codigo_caixa || '',
        account: editCaixa.account || '',
        responsible: editCaixa.responsible || '',
        obs: editCaixa.obs || '',
        user: editCaixa.user || '',
        moeda: editCaixa.moeda || 'AOA',
        status: editCaixa.status || 'aberto',
        activo: editCaixa.activo !== false
      });
      
      alert('Caixa atualizado com sucesso!');
      setEditCaixa(null);
      setActiveSection('list');
    } catch (err: any) {
      console.error(err);
      alert(`Erro ao atualizar caixa: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCloseCaixa = async (id: string) => {
    try {
      await updateCaixa(id, { status: 'fechado' });
      alert('Caixa fechado com sucesso!');
    } catch (error: any) {
      console.error('Error closing caixa:', error);
      alert(`Erro ao fechar caixa: ${error.message}`);
    }
  };

  const handleEliminarCaixa = async (id: string) => {
    if (!confirm('Tem a certeza que deseja eliminar este caixa?')) return;
    try {
      await deleteCaixa(id);
      alert('Caixa eliminado com sucesso');
    } catch (error: any) {
      console.error('Error deleting caixa:', error);
      alert(`Erro ao eliminar caixa: ${error.message}`);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.empresa_id) return;
    if (transferData.from === transferData.to) return alert('Selecione caixas diferentes');
    if (transferData.amount <= 0) return;

    const fromCaixa = (caixas || []).find(c => c.id === transferData.from);
    if (!fromCaixa || fromCaixa.currentBalance < transferData.amount) return alert('Saldo insuficiente no caixa de origem');

    try {
      const toCaixa = caixas.find(c => c.id === transferData.to);
      await addMovement({
        caixaId: transferData.from,
        targetCaixaId: transferData.to,
        type: 'transferencia',
        amount: transferData.amount,
        moeda: activeCurrency,
        description: transferData.description || `Transferência para ${toCaixa?.name || 'outro caixa'}`,
      });

      alert('Transferência concluída com sucesso!');
      setTransferData({ from: '', to: '', amount: 0, description: '' });
      setActiveSection('list');
    } catch (error: any) {
      console.error('Error in transfer:', error);
      alert(`Erro ao realizar transferência: ${error.message}`);
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.empresa_id) return;
    if (paymentData.amount <= 0) return;

    const caixa = (caixas || []).find(c => c.id === paymentData.caixaId);
    if (!caixa || (paymentData.type !== 'entrada' && caixa.currentBalance < paymentData.amount)) {
        if (paymentData.type !== 'entrada') return alert('Saldo insuficiente no caixa selecionado');
    }

    try {
      await addMovement({
        caixaId: paymentData.caixaId,
        type: paymentData.type === 'entrada' ? 'entrada' : 'saida',
        amount: paymentData.amount,
        moeda: activeCurrency,
        description: paymentData.description,
      });

      alert('Operação registada com sucesso!');
      setPaymentData({ caixaId: '', amount: 0, description: '', type: 'outros' });
      setActiveSection('list');
    } catch (error: any) {
      console.error('Error in payment:', error);
      alert(`Erro ao realizar operação: ${error.message}`);
    }
  };

  const handleReconciliation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.empresa_id) return;
    const caixa = (caixas || []).find(c => c.id === reconData.caixaId);
    if (!caixa) return;

    const diff = reconData.actualBalance - caixa.currentBalance;
    if (diff === 0) return alert('O saldo já está correto');

    try {
      await addMovement({
        caixaId: reconData.caixaId,
        type: diff > 0 ? 'entrada' : 'saida',
        amount: Math.abs(diff),
        moeda: activeCurrency,
        description: `Conciliação: ${reconData.description}`,
      });

      alert('Conciliação efetuada com sucesso!');
      setReconData({ caixaId: '', actualBalance: 0, description: '' });
      setActiveSection('list');
    } catch (error: any) {
      console.error('Error in reconciliation:', error);
      alert(`Erro ao realizar conciliação: ${error.message}`);
    }
  };

  const sections = [
    { id: 'list', label: 'Caixas', icon: Wallet },
    { id: 'movements', label: 'Movimentos', icon: History },
    { id: 'transfer', label: 'Transferência', icon: ArrowRightLeft },
    { id: 'salary', label: 'Pagar Salário', icon: Wallet },
    { id: 'tax', label: 'Pagar Imposto', icon: Calculator },
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
            <Plus size={14} /> Registar Caixa
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {activeSection === 'list' && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
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
              <div className="relative w-full md:w-64">
                <input
                  type="text"
                  placeholder="Pesquisar por nome, código, conta..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-zinc-200 pl-10 pr-4 py-2 text-xs font-bold text-[#003366] focus:outline-none focus:border-[#003366]"
                />
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              </div>
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
                      <th className="px-2 py-2 border-r border-zinc-200 text-center w-16">Código</th>
                      <th className="px-4 py-2 border-r border-zinc-200 min-w-[180px]">Caixa/Banco</th>
                      <th className="px-4 py-2 border-r border-zinc-200 text-center">Moeda</th>
                      <th className="px-4 py-2 border-r border-zinc-200 min-w-[140px]">Nº Conta / IBAN</th>
                      <th className="px-4 py-2 border-r border-zinc-200 min-w-[130px]">Responsável</th>
                      <th className="px-4 py-2 border-r border-zinc-200 text-right">Saldo Inicial</th>
                      <th className="px-4 py-2 border-r border-zinc-200 text-right">Saldo Atual</th>
                      <th className="px-4 py-2 border-r border-zinc-200 text-center">Data Abertura</th>
                      <th className="px-2 py-2 border-r border-zinc-200 text-center">Status</th>
                      <th className="px-2 py-2 text-center">Opção</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {(caixas || [])
                      .filter(c => {
                        const matchesCurrency = !activeCurrency || 
                          c.moeda === activeCurrency || 
                          (activeCurrency === 'AOA' && (!c.moeda || c.moeda === 'Kwanza'));
                        
                        const searchLower = searchTerm.toLowerCase();
                        const matchesSearch = !searchTerm ||
                          c.name.toLowerCase().includes(searchLower) ||
                          (c.codigo_caixa || '').toLowerCase().includes(searchLower) ||
                          (c.account || '').toLowerCase().includes(searchLower) ||
                          (c.responsible || '').toLowerCase().includes(searchLower) ||
                          (c.obs || '').toLowerCase().includes(searchLower);
                          
                        return matchesCurrency && matchesSearch;
                      })
                      .map((caixa, idx) => (
                        <tr key={caixa.id} className={`hover:bg-zinc-50 transition-colors group ${!caixa.activo ? 'opacity-65' : ''}`}>
                          <td className="px-2 py-2 border-r border-zinc-200 text-center text-zinc-500">{idx + 1}</td>
                          <td className="px-2 py-2 border-r border-zinc-200 text-center font-bold font-mono text-zinc-600">{caixa.codigo_caixa || '---'}</td>
                          <td className="px-4 py-2 border-r border-zinc-200 font-black text-[#003366] uppercase">{caixa.name}</td>
                          <td className="px-4 py-2 border-r border-zinc-200 text-center font-bold text-zinc-500">{caixa.moeda || 'AOA'}</td>
                          <td className="px-4 py-2 border-r border-zinc-200 text-zinc-500 font-mono text-[9px]">{caixa.account || '---'}</td>
                          <td className="px-4 py-2 border-r border-zinc-200 text-zinc-500">{caixa.responsible || '---'}</td>
                          <td className="px-4 py-2 border-r border-zinc-200 text-right text-zinc-600 font-mono">
                            {caixa.initialBalance.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} {caixa.moeda || 'AOA'}
                          </td>
                          <td className="px-4 py-2 border-r border-zinc-200 text-right font-black text-[#003366] font-mono">
                            {caixa.currentBalance.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} {caixa.moeda || 'AOA'}
                          </td>
                          <td className="px-4 py-2 border-r border-zinc-200 text-center text-zinc-500 font-mono">
                            {caixa.data_abertura ? new Date(caixa.data_abertura).toLocaleDateString('pt-PT') : '---'}
                          </td>
                          <td className="px-2 py-2 border-r border-zinc-200 text-center">
                            <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${caixa.status === 'aberto' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                              {caixa.status || 'aberto'}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <button 
                              onClick={() => setShowOptionsMenu(caixa)}
                              className="bg-[#003366] text-white px-3 py-1 text-[9px] font-black uppercase tracking-widest hover:bg-[#002244] transition-all"
                            >
                              Opção
                            </button>
                          </td>
                        </tr>
                      ))}
                    {caixas.length === 0 && (
                      <tr>
                        <td colSpan={11} className="px-6 py-12 text-center text-zinc-400 italic">Nenhum caixa registado.</td>
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
                {(caixas || []).map(c => <option key={c.id} value={c.id} className="text-zinc-800">{c.name}</option>)}
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
                  {(movements || [])
                    .filter(m => {
                      const matchesCaixa = !selectedCaixaId || m.caixaId === selectedCaixaId || m.targetCaixaId === selectedCaixaId;
                      // Handle "Kwanza" vs "AOA" normalization
                      const movementCurrency = m.moeda === 'Kwanza' ? 'AOA' : m.moeda;
                      const matchesCurrency = !activeCurrency || movementCurrency === activeCurrency;
                      return matchesCaixa && matchesCurrency;
                    })
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map(m => (
                      <tr key={m.id} className="hover:bg-zinc-50 transition-colors">
                        <td className="px-6 py-4 text-[10px] font-bold text-zinc-500">{new Date(m.date).toLocaleString()}</td>
                        <td className="px-6 py-4 text-[10px] font-black text-[#003366] uppercase">
                          {(caixas || []).find(c => c.id === m.caixaId)?.name}
                          {m.targetCaixaId && ` → ${(caixas || []).find(c => c.id === m.targetCaixaId)?.name}`}
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
                          {m.type === 'saida' ? '-' : '+'}{m.amount.toLocaleString('pt-PT', { style: 'currency', currency: (m.moeda === 'Kwanza' || !m.moeda) ? 'AOA' : m.moeda })}
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
                    {(caixas || []).map(c => <option key={c.id} value={c.id}>{c.name} (Saldo: {c.currentBalance.toLocaleString()})</option>)}
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
                    {(caixas || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                  {(caixas || []).map(c => <option key={c.id} value={c.id}>{c.name} (Saldo: {c.currentBalance.toLocaleString()})</option>)}
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
                  {(caixas || []).map(c => <option key={c.id} value={c.id}>{c.name} (Saldo Sistema: {c.currentBalance.toLocaleString()})</option>)}
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

        {(activeSection === 'salary' || activeSection === 'tax') && (
          <div className="max-w-2xl mx-auto w-full bg-white border border-zinc-200 shadow-sm">
            <div className={`p-4 ${activeSection === 'salary' ? 'bg-indigo-600' : 'bg-red-600'} text-white`}>
              <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                {activeSection === 'salary' ? <Wallet size={14} /> : <Calculator size={14} />} 
                {activeSection === 'salary' ? 'Pagamento de Salário' : 'Pagamento de Imposto'}
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
                  {(caixas || []).map(c => <option key={c.id} value={c.id}>{c.name} (Saldo: {c.currentBalance.toLocaleString()})</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Valor do {activeSection === 'salary' ? 'Salário' : 'Imposto'}</label>
                <div className="relative">
                  <input 
                    type="number" 
                    required
                    step="0.01"
                    className={`w-full border border-zinc-200 pl-12 pr-4 py-3 text-lg font-black ${activeSection === 'salary' ? 'text-indigo-600' : 'text-red-700'} focus:outline-none focus:border-[#003366]`}
                    placeholder="0,00"
                    value={paymentData.amount || ''}
                    onChange={e => setPaymentData({...paymentData, amount: parseFloat(e.target.value)})}
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">AOA</div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Descrição / Observação</label>
                <input 
                  type="text"
                  required
                  className="w-full border border-zinc-200 px-4 py-3 text-xs focus:outline-none focus:border-[#003366]"
                  placeholder={activeSection === 'salary' ? 'Ex: Salário Ref. Mês de Maio' : 'Ex: Pagamento de IVA'}
                  value={paymentData.description}
                  onChange={e => setPaymentData({...paymentData, description: e.target.value})}
                />
              </div>
              <button type="submit" className={`w-full ${activeSection === 'salary' ? 'bg-indigo-600' : 'bg-red-600'} text-white py-4 font-black uppercase tracking-widest text-xs transition-all shadow-xl`}>
                Confirmar Pagamento
              </button>
            </form>
          </div>
        )}

        {activeSection === 'edit' && editCaixa && (
          <div className="max-w-2xl mx-auto w-full bg-white border border-zinc-200 shadow-sm">
            <div className="p-4 bg-[#003366] text-white font-bold uppercase tracking-widest">
              <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <FileText size={14} /> Editar Caixa/Banco: {editCaixa.name}
              </h3>
            </div>
            <form onSubmit={handleUpdateCaixa} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Nome do caixa</label>
                    <input 
                      type="text" 
                      required 
                      disabled={isUpdating}
                      className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366]" 
                      value={editCaixa.name}
                      onChange={e => setEditCaixa({...editCaixa, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Código do Caixa</label>
                    <input 
                      type="text" 
                      required
                      disabled={isUpdating}
                      className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366] font-mono" 
                      value={editCaixa.codigo_caixa || ''}
                      onChange={e => setEditCaixa({...editCaixa, codigo_caixa: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Número de Conta / IBAN</label>
                    <input 
                      type="text" 
                      disabled={isUpdating}
                      className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366]" 
                      value={editCaixa.account || ''}
                      onChange={e => setEditCaixa({...editCaixa, account: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Moeda</label>
                    <select
                      disabled={isUpdating}
                      className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366]" 
                      value={editCaixa.moeda || 'AOA'}
                      onChange={e => setEditCaixa({...editCaixa, moeda: e.target.value})}
                    >
                      <option value="AOA">AOA (Kwanza)</option>
                      <option value="USD">USD (Dólar)</option>
                      <option value="EUR">EUR (Euro)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Responsável</label>
                    <input 
                      type="text" 
                      required
                      disabled={isUpdating}
                      className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366]" 
                      value={editCaixa.responsible || ''}
                      onChange={e => setEditCaixa({...editCaixa, responsible: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Utilizador Associado</label>
                    <select 
                      required
                      disabled={isUpdating}
                      className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366]" 
                      value={editCaixa.user || ''}
                      onChange={e => {
                        const prof = (profiles || []).find(p => p.id === e.target.value);
                        setEditCaixa({
                          ...editCaixa,
                          user: e.target.value,
                          responsible: prof ? prof.name : editCaixa.responsible
                        });
                      }}
                    >
                      <option value="">Selecione um utilizador</option>
                      {(profiles || []).map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Status / Estado Operacional</label>
                    <select
                      disabled={isUpdating}
                      className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366]" 
                      value={editCaixa.status || 'aberto'}
                      onChange={e => setEditCaixa({...editCaixa, status: e.target.value as any})}
                    >
                      <option value="aberto">Aberto</option>
                      <option value="fechado">Fechado</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input 
                      type="checkbox" 
                      id="edit_activo_box"
                      disabled={isUpdating}
                      checked={editCaixa.activo !== false}
                      onChange={e => setEditCaixa({...editCaixa, activo: e.target.checked})}
                      className="w-4 h-4 text-[#003366] border-zinc-300 focus:ring-[#003366]"
                    />
                    <label htmlFor="edit_activo_box" className="text-xs font-black uppercase tracking-wider text-zinc-600 cursor-pointer">Caixa Ativo / Operacional</label>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Observação</label>
                  <textarea 
                    disabled={isUpdating}
                    className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366] h-24" 
                    value={editCaixa.obs || ''}
                    onChange={e => setEditCaixa({...editCaixa, obs: e.target.value})}
                  />
                </div>
                <div className="flex gap-4">
                   <button type="button" disabled={isUpdating} onClick={() => setActiveSection('list')} className="flex-1 bg-zinc-100 text-zinc-600 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200">Voltar</button>
                   <button type="submit" disabled={isUpdating} className="flex-2 bg-[#003366] text-white py-3 px-8 text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-[#002244] transition-all">
                     {isUpdating ? 'A Guardar...' : 'Guardar Alterações'}
                   </button>
                </div>
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
                <Plus size={18} /> Registar Novo Caixa/Banco
              </h3>
              <form onSubmit={handleCreateCaixa} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Nome do caixa / Banco</label>
                  <input 
                    type="text" 
                    required 
                    disabled={isSaving}
                    className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366] transition-all" 
                    placeholder="Ex: Caixa Principal, Banco BFA..." 
                    value={newCaixa.name}
                    onChange={e => setNewCaixa({...newCaixa, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Código do Caixa (ExCX01)</label>
                    <input 
                      type="text" 
                      disabled={isSaving}
                      className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366] transition-all font-mono" 
                      placeholder="Ex: CX-01, CX-02..." 
                      value={newCaixa.codigo_caixa}
                      onChange={e => setNewCaixa({...newCaixa, codigo_caixa: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Moeda</label>
                    <select
                      disabled={isSaving}
                      className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366] transition-all font-bold"
                      value={activeCurrency}
                      onChange={e => setActiveCurrency(e.target.value)}
                    >
                      <option value="AOA">AOA (Kwanza)</option>
                      <option value="USD">USD (Dólar)</option>
                      <option value="EUR">EUR (Euro)</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Número de Conta / IBAN (Se aplicável)</label>
                  <input 
                    type="text" 
                    disabled={isSaving}
                    className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366] transition-all" 
                    placeholder="Ex: AO06.0000.0000.0000.0000.0" 
                    value={newCaixa.account}
                    onChange={e => setNewCaixa({...newCaixa, account: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Saldo Inicial / Abertura</label>
                    <input 
                      type="number" 
                      required 
                      disabled={isSaving}
                      step="0.01"
                      className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366] transition-all" 
                      placeholder="0,00"
                      value={newCaixa.initialBalance || ''}
                      onChange={e => setNewCaixa({...newCaixa, initialBalance: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Responsável Caixa</label>
                    <input 
                      type="text" 
                      required
                      disabled={isSaving}
                      className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366] transition-all" 
                      placeholder="Nome do responsável" 
                      value={newCaixa.responsible}
                      onChange={e => setNewCaixa({...newCaixa, responsible: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Selecionar utilizador associado</label>
                  <select 
                    required
                    disabled={isSaving}
                    className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366] transition-all" 
                    value={newCaixa.user}
                    onChange={e => {
                      const prof = (profiles || []).find(p => p.id === e.target.value);
                      setNewCaixa({
                        ...newCaixa,
                        user: e.target.value,
                        responsible: prof ? prof.name : newCaixa.responsible
                      });
                    }}
                  >
                    <option value="">Selecione um utilizador de sistema</option>
                    {(profiles || []).map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Observação</label>
                  <textarea 
                    disabled={isSaving}
                    className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366] h-24 transition-all" 
                    placeholder="Notas adicionais..."
                    value={newCaixa.obs}
                    onChange={e => setNewCaixa({...newCaixa, obs: e.target.value})}
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" disabled={isSaving} onClick={() => setShowForm(false)} className="flex-1 bg-zinc-100 text-zinc-600 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all">Cancelar</button>
                  <button type="submit" disabled={isSaving} className="flex-2 bg-[#003366] text-white py-3 px-8 text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-[#002244] transition-all">
                    {isSaving ? 'A Registar...' : 'Registar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Central Options Menu */}
      <AnimatePresence>
        {showOptionsMenu && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white border border-zinc-200 p-8 shadow-2xl relative max-w-2xl w-full"
            >
              <button 
                onClick={() => setShowOptionsMenu(null)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600"
              >
                <X size={24} />
              </button>
              
              <div className="text-center mb-8">
                <h3 className="text-xl font-black text-[#003366] uppercase tracking-tight">Opções do Caixa: {showOptionsMenu.name}</h3>
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">Selecione uma funcionalidade para executar</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { id: 'editar', label: 'Editar', icon: FileText, color: 'bg-blue-50 text-blue-600' },
                  { id: 'associar', label: 'Associar', icon: Plus, color: 'bg-emerald-50 text-emerald-600' },
                  { id: 'pagar_salario', label: 'Pagar Salário', icon: Wallet, color: 'bg-indigo-50 text-indigo-600' },
                  { id: 'pagar_imposto', label: 'Pagar Imposto', icon: Calculator, color: 'bg-red-50 text-red-600' },
                  { id: 'transferencia', label: 'Transferência', icon: ArrowRightLeft, color: 'bg-amber-50 text-amber-600' },
                  { id: 'relatorios', label: 'Relatórios', icon: FileText, color: 'bg-zinc-50 text-zinc-600' },
                  { id: 'movimentos', label: 'Movimentos', icon: History, color: 'bg-purple-50 text-purple-600' },
                  { id: 'fechar', label: 'Fechar', icon: X, color: 'bg-zinc-50 text-zinc-600' },
                  { id: 'eliminar', label: 'Eliminar', icon: Trash2, color: 'bg-red-50 text-red-600' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      // Handle option click
                      if (opt.id === 'editar') {
                        setEditCaixa(showOptionsMenu);
                        setActiveSection('edit');
                      }
                      if (opt.id === 'pagar_salario') {
                        setPaymentData({ caixaId: showOptionsMenu.id, amount: 0, description: 'Pagamento de Salário', type: 'salario' });
                        setActiveSection('salary');
                      }
                      if (opt.id === 'pagar_imposto') {
                        setPaymentData({ caixaId: showOptionsMenu.id, amount: 0, description: 'Pagamento de Imposto', type: 'imposto' });
                        setActiveSection('tax');
                      }
                      if (opt.id === 'transferencia') {
                        setTransferData({ ...transferData, from: showOptionsMenu.id });
                        setActiveSection('transfer');
                      }
                      if (opt.id === 'relatorios' || opt.id === 'movimentos') {
                        setSelectedCaixaId(showOptionsMenu.id);
                        setActiveSection('movements');
                      }
                      if (opt.id === 'associar') {
                        setEditCaixa(showOptionsMenu);
                        setActiveSection('edit');
                      }
                      if (opt.id === 'fechar') {
                        handleCloseCaixa(showOptionsMenu.id);
                      }
                      if (opt.id === 'eliminar') {
                        handleEliminarCaixa(showOptionsMenu.id);
                      }
                      setShowOptionsMenu(null);
                    }}
                    className={`flex flex-col items-center justify-center p-6 gap-3 border border-zinc-100 hover:border-[#003366] hover:shadow-md transition-all group ${opt.color}`}
                  >
                    <opt.icon size={24} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-center">{opt.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
