import React, { useState, useEffect } from 'react';
import { 
  Briefcase, Plus, Search, ArrowLeft, DollarSign, TrendingUp, 
  Clock, CheckCircle, XCircle, AlertCircle, Building2, User, ChevronRight, Edit, Trash2, ShieldCheck, BarChart3, Filter
} from 'lucide-react';
import { crmNegocioService } from '../../services/crmNegocioService';
import toast from 'react-hot-toast';

interface CRMNegociosModuleProps {
  user: any;
  companyData: any;
  onBack: () => void;
}

const ETAPAS_KANBAN = [
  { id: 'novo_contacto', label: 'Novo Contacto', color: 'border-blue-300 bg-blue-50/60' },
  { id: 'qualificacao', label: 'Qualificação', color: 'border-indigo-300 bg-indigo-50/60' },
  { id: 'oportunidade', label: 'Oportunidade', color: 'border-amber-300 bg-amber-50/60' },
  { id: 'proposta', label: 'Proposta Comercial', color: 'border-purple-300 bg-purple-50/60' },
  { id: 'negociacao', label: 'Em Negociação', color: 'border-orange-300 bg-orange-50/60' },
  { id: 'ganho', label: 'Ganho 🎉', color: 'border-emerald-300 bg-emerald-50/60' },
  { id: 'perdido', label: 'Perdido ❌', color: 'border-rose-300 bg-rose-50/60' }
];

export const CRMNegociosModule: React.FC<CRMNegociosModuleProps> = ({ user, companyData, onBack }) => {
  const [oportunidades, setOportunidades] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'lista' | 'relatorios'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEtapa, setFilterEtapa] = useState('todos');

  const [form, setForm] = useState({
    codigo: `NEG-${Math.floor(1000 + Math.random() * 9000)}`,
    nome: '',
    cliente_id: '',
    descricao: '',
    tipo_negocio: 'Serviço / Consultoria',
    origem: 'Prospecção Direta',
    valor_estimado: 0,
    moeda: 'AOA',
    responsavel: user?.full_name || 'Comercial',
    probabilidade: 50,
    etapa: 'novo_contacto',
    concorrentes: '',
    data_prevista: new Date().toISOString().split('T')[0]
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
      const [ops, cls] = await Promise.all([
        crmNegocioService.getOportunidades(empresaId),
        crmNegocioService.getClientes(empresaId)
      ]);
      setOportunidades(ops);
      setClientes(cls);
    } catch (err) {
      console.error('Erro ao carregar oportunidades:', err);
      toast.error('Erro ao carregar pipeline de negócios.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.valor_estimado) {
      toast.error('Preencha o nome do negócio e o valor estimado.');
      return;
    }
    try {
      await crmNegocioService.createOportunidade({
        ...form,
        empresa_id: empresaId,
        valor_estimado: Number(form.valor_estimado),
        probabilidade: Number(form.probabilidade)
      });
      toast.success('Oportunidade de negócio criada e sincronizada com Supabase!');
      setShowNewModal(false);
      setForm({
        codigo: `NEG-${Math.floor(1000 + Math.random() * 9000)}`,
        nome: '',
        cliente_id: '',
        descricao: '',
        tipo_negocio: 'Serviço / Consultoria',
        origem: 'Prospecção Direta',
        valor_estimado: 0,
        moeda: 'AOA',
        responsavel: user?.full_name || 'Comercial',
        probabilidade: 50,
        etapa: 'novo_contacto',
        concorrentes: '',
        data_prevista: new Date().toISOString().split('T')[0]
      });
      loadData();
    } catch (err: any) {
      console.error('Erro ao criar oportunidade:', err);
      toast.error('Erro ao criar oportunidade: ' + (err.message || ''));
    }
  };

  const updateEtapa = async (id: string, novaEtapa: string) => {
    try {
      await crmNegocioService.updateOportunidade(id, { etapa: novaEtapa });
      toast.success('Etapa do negócio atualizada no pipeline!');
      loadData();
    } catch (err) {
      toast.error('Erro ao atualizar etapa.');
    }
  };

  const totalPipeline = oportunidades
    .filter(o => o.etapa !== 'ganho' && o.etapa !== 'perdido')
    .reduce((sum, o) => sum + Number(o.valor_estimado || 0), 0);

  const valorPonderado = oportunidades
    .filter(o => o.etapa !== 'ganho' && o.etapa !== 'perdido')
    .reduce((sum, o) => sum + (Number(o.valor_estimado || 0) * Number(o.probabilidade || 0)) / 100, 0);

  const totalGanhos = oportunidades
    .filter(o => o.etapa === 'ganho')
    .reduce((sum, o) => sum + Number(o.valor_estimado || 0), 0);

  const filteredOportunidades = oportunidades.filter(o => {
    const matchSearch = o.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || o.codigo?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchEtapa = filterEtapa === 'todos' || o.etapa === filterEtapa;
    return matchSearch && matchEtapa;
  });

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
            <div className="flex items-center gap-2 text-amber-700 font-black text-xs uppercase tracking-widest mb-1">
              <Briefcase size={16} /> CRM • Gestão de Negócios & Oportunidades
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Pipeline Comercial Avançado</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
            >
              Kanban
            </button>
            <button 
              onClick={() => setViewMode('lista')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'lista' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
            >
              Lista Detalhada
            </button>
            <button 
              onClick={() => setViewMode('relatorios')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'relatorios' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
            >
              Previsão & Relatórios
            </button>
          </div>
          <button 
            onClick={() => setShowNewModal(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-lg transition-all shadow-md flex items-center gap-2"
          >
            <Plus size={16} /> Novo Negócio
          </button>
        </div>
      </div>

      {/* Analytics Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Valor Total em Pipeline</p>
          <h3 className="text-xl font-black text-slate-900 mt-1">
            {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(totalPipeline)}
          </h3>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Valor Ponderado (Sucesso)</p>
          <h3 className="text-xl font-black text-emerald-600 mt-1">
            {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(valorPonderado)}
          </h3>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Negócios Ganhos</p>
          <h3 className="text-xl font-black text-blue-600 mt-1">
            {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(totalGanhos)}
          </h3>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Taxa de Conversão</p>
          <h3 className="text-xl font-black text-purple-600 mt-1">
            {oportunidades.length > 0 ? Math.round((oportunidades.filter(o => o.etapa === 'ganho').length / oportunidades.length) * 100) : 0}%
          </h3>
        </div>
      </div>

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4 overflow-x-auto pb-6">
          {ETAPAS_KANBAN.map(etapa => {
            const opsEtapa = filteredOportunidades.filter(o => o.etapa === etapa.id);
            const totalEtapa = opsEtapa.reduce((sum, o) => sum + Number(o.valor_estimado || 0), 0);
            return (
              <div key={etapa.id} className={`bg-white rounded-xl border ${etapa.color} p-4 flex flex-col min-w-[240px]`}>
                <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-200">
                  <h3 className="text-xs font-black text-slate-800 uppercase">{etapa.label}</h3>
                  <span className="bg-white text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200">{opsEtapa.length}</span>
                </div>
                <div className="text-[10px] font-bold text-slate-500 mb-3">
                  {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 }).format(totalEtapa)}
                </div>

                <div className="space-y-3 flex-1">
                  {opsEtapa.map(op => (
                    <div key={op.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs space-y-2 hover:shadow-md transition-all">
                      <div className="flex justify-between items-start">
                        <span className="font-mono text-[9px] font-black text-amber-700">{op.codigo}</span>
                        <span className="text-[9px] font-black bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{op.probabilidade}% prob.</span>
                      </div>
                      <h4 className="text-xs font-black text-slate-900 leading-tight">{op.nome}</h4>
                      <p className="text-[11px] font-black text-emerald-600">
                        {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(op.valor_estimado || 0)}
                      </p>
                      {op.clientes?.nome && (
                        <div className="text-[10px] text-slate-500 truncate">👤 {op.clientes.nome}</div>
                      )}
                      <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-[10px]">
                        <span className="text-slate-400">{op.responsavel}</span>
                        <select 
                          value={op.etapa}
                          onChange={(e) => updateEtapa(op.id, e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded text-[10px] font-bold p-1 focus:outline-none"
                        >
                          {ETAPAS_KANBAN.map(e => (
                            <option key={e.id} value={e.id}>{e.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'lista' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex gap-4">
            <input 
              type="text"
              placeholder="Pesquisar negócios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="p-2 border border-slate-200 rounded-lg text-xs w-80 font-medium"
            />
            <select 
              value={filterEtapa}
              onChange={(e) => setFilterEtapa(e.target.value)}
              className="p-2 border border-slate-200 rounded-lg text-xs font-medium"
            >
              <option value="todos">Todas as Etapas</option>
              {ETAPAS_KANBAN.map(e => (
                <option key={e.id} value={e.id}>{e.label}</option>
              ))}
            </select>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-600 border-b border-slate-200">
                <th className="p-4">Código / Nome</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">Tipo</th>
                <th className="p-4">Valor Estimado</th>
                <th className="p-4">Probabilidade</th>
                <th className="p-4">Etapa</th>
                <th className="p-4 text-center">Responsável</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {filteredOportunidades.map(op => (
                <tr key={op.id} className="hover:bg-slate-50">
                  <td className="p-4">
                    <span className="font-mono font-bold text-amber-700">{op.codigo}</span>
                    <div className="font-bold text-slate-900">{op.nome}</div>
                  </td>
                  <td className="p-4 font-bold">{op.clientes?.nome || 'Cliente Geral'}</td>
                  <td className="p-4"><span className="bg-slate-100 px-2 py-1 rounded text-[10px]">{op.tipo_negocio}</span></td>
                  <td className="p-4 font-black text-emerald-600">
                    {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(op.valor_estimado || 0)}
                  </td>
                  <td className="p-4 font-bold">{op.probabilidade}%</td>
                  <td className="p-4"><span className="bg-amber-50 text-amber-800 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">{op.etapa}</span></td>
                  <td className="p-4 text-center text-slate-600">{op.responsavel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reports View */}
      {viewMode === 'relatorios' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <h2 className="text-lg font-black text-slate-900">Previsão de Receitas e Análise Comercial</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <h3 className="text-xs font-bold text-slate-700 uppercase mb-3">Distribuição por Etapa</h3>
              <div className="space-y-2">
                {ETAPAS_KANBAN.map(etapa => {
                  const count = oportunidades.filter(o => o.etapa === etapa.id).length;
                  const val = oportunidades.filter(o => o.etapa === etapa.id).reduce((s, o) => s + Number(o.valor_estimado || 0), 0);
                  return (
                    <div key={etapa.id} className="flex justify-between items-center text-xs p-2 bg-white rounded border border-slate-100">
                      <span className="font-bold text-slate-800">{etapa.label} ({count})</span>
                      <span className="font-black text-amber-700">{new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(val)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase">Resumo Executivo</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                O pipeline comercial possui atualmente <strong>{oportunidades.length}</strong> oportunidades registadas, representando um volume total estimado em <strong>{new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(totalPipeline)}</strong>.
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Com base na probabilidade de fecho atribuída a cada etapa, o valor ponderado projetado para conversão é de <strong>{new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(valorPonderado)}</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* New Deal Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <h2 className="text-lg font-black text-slate-900 pb-2 border-b border-slate-100">Registar Nova Oportunidade Comercial</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome do Negócio *</label>
                <input 
                  type="text" 
                  required
                  value={form.nome}
                  onChange={(e) => setForm({...form, nome: e.target.value})}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                  placeholder="Ex: Fornecimento de Equipamentos"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Cliente Associado</label>
                <select 
                  value={form.cliente_id}
                  onChange={(e) => setForm({...form, cliente_id: e.target.value})}
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
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Valor Estimado (AOA) *</label>
                  <input 
                    type="number" 
                    required
                    value={form.valor_estimado}
                    onChange={(e) => setForm({...form, valor_estimado: Number(e.target.value)})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Probabilidade (%)</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="100"
                    value={form.probabilidade}
                    onChange={(e) => setForm({...form, probabilidade: Number(e.target.value)})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Etapa Comercial</label>
                  <select 
                    value={form.etapa}
                    onChange={(e) => setForm({...form, etapa: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                  >
                    {ETAPAS_KANBAN.map(e => (
                      <option key={e.id} value={e.id}>{e.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Data Prevista</label>
                  <input 
                    type="date"
                    value={form.data_prevista}
                    onChange={(e) => setForm({...form, data_prevista: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Descrição</label>
                <textarea 
                  rows={2}
                  value={form.descricao}
                  onChange={(e) => setForm({...form, descricao: e.target.value})}
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
                  className="px-6 py-2 bg-amber-600 text-white rounded-lg text-xs font-black uppercase shadow-md"
                >
                  Criar Negócio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
