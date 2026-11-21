import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, Plus, ArrowLeft, DollarSign, FileText, 
  CheckCircle, Clock, Award, Users, TrendingUp, Package, BarChart3
} from 'lucide-react';
import { crmNegocioService } from '../../services/crmNegocioService';
import toast from 'react-hot-toast';

interface CRMVendasModuleProps {
  user: any;
  companyData: any;
  onBack: () => void;
}

export const CRMVendasModule: React.FC<CRMVendasModuleProps> = ({ user, companyData, onBack }) => {
  const [vendas, setVendas] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'vendas' | 'relatorios'>('vendas');

  const [formVenda, setFormVenda] = useState({
    numero: `VD-${Math.floor(1000 + Math.random() * 9000)}`,
    cliente_id: '',
    vendedor: user?.full_name || 'Comercial',
    metodo_pagamento: 'Multicaixa',
    condicoes_pagamento: 'Pronto Pagamento',
    estado: 'Orçamento',
    total: 0,
    observacoes: ''
  });

  const empresaId = user?.empresa_id || companyData?.id;

  useEffect(() => {
    if (empresaId) {
      loadData();
    }
  }, [empresaId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [vds, cls] = await Promise.all([
        crmNegocioService.getVendasCrm(empresaId),
        crmNegocioService.getClientes(empresaId)
      ]);
      setVendas(vds);
      setClientes(cls);
    } catch (err) {
      console.error('Erro ao carregar vendas:', err);
      toast.error('Erro ao carregar módulo de vendas CRM.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVenda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formVenda.cliente_id || !formVenda.total) {
      toast.error('Selecione o cliente e o valor total da venda.');
      return;
    }
    try {
      await crmNegocioService.createVendaCrm({
        ...formVenda,
        empresa_id: empresaId,
        subtotal: Number(formVenda.total),
        total: Number(formVenda.total)
      });
      toast.success('Registo de venda criado e sincronizado com Supabase!');
      setShowNewModal(false);
      setFormVenda({
        numero: `VD-${Math.floor(1000 + Math.random() * 9000)}`,
        cliente_id: '',
        vendedor: user?.full_name || 'Comercial',
        metodo_pagamento: 'Multicaixa',
        condicoes_pagamento: 'Pronto Pagamento',
        estado: 'Orçamento',
        total: 0,
        observacoes: ''
      });
      loadData();
    } catch (err: any) {
      toast.error('Erro ao criar venda: ' + (err.message || ''));
    }
  };

  const totalVendasGeral = vendas.reduce((sum, v) => sum + Number(v.total || 0), 0);
  const totalOrcamentos = vendas.filter(v => v.estado === 'Orçamento').reduce((sum, v) => sum + Number(v.total || 0), 0);

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2 text-emerald-700 font-black text-xs uppercase tracking-widest mb-1">
              <ShoppingCart size={16} /> CRM • Gestão de Vendas & Propostas Comerciais
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Processo Comercial & Faturação CRM</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => setActiveTab('vendas')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'vendas' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
            >
              Vendas & Orçamentos ({vendas.length})
            </button>
            <button 
              onClick={() => setActiveTab('relatorios')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'relatorios' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
            >
              Relatórios & Metas
            </button>
          </div>
          <button 
            onClick={() => setShowNewModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-lg transition-all shadow-md flex items-center gap-2"
          >
            <Plus size={16} /> Nova Venda / Orçamento
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Volume Total de Vendas</p>
          <h3 className="text-xl font-black text-slate-900 mt-1">
            {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(totalVendasGeral)}
          </h3>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Orçamentos Pendentes</p>
          <h3 className="text-xl font-black text-emerald-600 mt-1">
            {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(totalOrcamentos)}
          </h3>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Ticket Médio</p>
          <h3 className="text-xl font-black text-slate-800 mt-1">
            {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(vendas.length > 0 ? totalVendasGeral / vendas.length : 0)}
          </h3>
        </div>
      </div>

      {activeTab === 'vendas' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-600 border-b border-slate-200">
                  <th className="p-4">Número</th>
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Vendedor</th>
                  <th className="p-4">Data</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {vendas.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-mono font-black text-emerald-700">{v.numero}</td>
                    <td className="p-4 font-bold text-slate-900">{v.clientes?.nome || v.clientes?.name || 'Cliente Geral'}</td>
                    <td className="p-4 text-slate-600">{v.vendedor || 'Comercial'}</td>
                    <td className="p-4">{new Date(v.created_at).toLocaleDateString()}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">{v.estado}</span>
                    </td>
                    <td className="p-4 text-right font-black text-slate-900">
                      {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(v.total || 0)}
                    </td>
                  </tr>
                ))}
                {vendas.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400 font-medium text-xs">
                      Nenhuma venda ou orçamento registado no CRM.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'relatorios' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <h2 className="text-lg font-black text-slate-900">Relatórios Comerciais e Metas de Vendas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase">Desempenho Comercial</h3>
              <p className="text-xs text-slate-600">Total de transações registadas: <strong>{vendas.length}</strong></p>
              <p className="text-xs text-slate-600">Volume global faturado / orçamentado: <strong>{new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(totalVendasGeral)}</strong></p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase">Metas e Comissões</h3>
              <p className="text-xs text-slate-600">Meta mensal estimada: <strong>15.000.000 AOA</strong></p>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${Math.min(100, (totalVendasGeral / 15000000) * 100)}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Sale Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <h2 className="text-lg font-black text-slate-900 pb-2 border-b border-slate-100">Criar Novo Orçamento / Venda</h2>
            <form onSubmit={handleCreateVenda} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Cliente *</label>
                <select 
                  required
                  value={formVenda.cliente_id}
                  onChange={(e) => setFormVenda({...formVenda, cliente_id: e.target.value})}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                >
                  <option value="">-- Selecionar Cliente --</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nome || c.name} (NIF: {c.nif || c.contribuinte})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Valor Total (AOA) *</label>
                  <input 
                    type="number" 
                    required
                    value={formVenda.total}
                    onChange={(e) => setFormVenda({...formVenda, total: Number(e.target.value)})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Estado</label>
                  <select 
                    value={formVenda.estado}
                    onChange={(e) => setFormVenda({...formVenda, estado: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                  >
                    <option value="Orçamento">Orçamento</option>
                    <option value="Proposta">Proposta Comercial</option>
                    <option value="Encomenda">Encomenda</option>
                    <option value="Aprovada">Aprovada</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Método de Pagamento</label>
                <input 
                  type="text" 
                  value={formVenda.metodo_pagamento}
                  onChange={(e) => setFormVenda({...formVenda, metodo_pagamento: e.target.value})}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Observações</label>
                <textarea 
                  rows={2}
                  value={formVenda.observacoes}
                  onChange={(e) => setFormVenda({...formVenda, observacoes: e.target.value})}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-black uppercase"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg text-xs font-black uppercase shadow-md"
                >
                  Guardar Venda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
