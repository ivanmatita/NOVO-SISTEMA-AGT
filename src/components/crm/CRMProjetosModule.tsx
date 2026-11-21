import React, { useState, useEffect } from 'react';
import { 
  FolderGit2, Plus, ArrowLeft, CheckCircle2, Clock, Calendar, 
  DollarSign, Users, ShieldCheck, AlertCircle, CheckSquare, ListTodo, BarChart3
} from 'lucide-react';
import { crmNegocioService } from '../../services/crmNegocioService';
import toast from 'react-hot-toast';

interface CRMProjetosModuleProps {
  user: any;
  companyData: any;
  onBack: () => void;
}

export const CRMProjetosModule: React.FC<CRMProjetosModuleProps> = ({ user, companyData, onBack }) => {
  const [projetos, setProjetos] = useState<any[]>([]);
  const [tarefas, setTarefas] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedProjeto, setSelectedProjeto] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'projetos' | 'tarefas' | 'relatorios'>('projetos');

  const [formProj, setFormProj] = useState({
    codigo: `PROJ-${Math.floor(1000 + Math.random() * 9000)}`,
    nome: '',
    cliente_id: '',
    descricao: '',
    gestor: user?.full_name || 'Gestor',
    orcamento: 0,
    moeda: 'AOA',
    prioridade: 'Média',
    estado: 'Planeamento',
    data_prevista: new Date().toISOString().split('T')[0]
  });

  const [formTask, setFormTask] = useState({
    codigo: `TSK-${Math.floor(1000 + Math.random() * 9000)}`,
    nome: '',
    projeto_id: '',
    descricao: '',
    responsavel: user?.full_name || 'Equipa',
    prazo: new Date().toISOString().split('T')[0],
    prioridade: 'Média',
    estado: 'pendente'
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
      const [projs, tsks, cls] = await Promise.all([
        crmNegocioService.getProjetos(empresaId),
        crmNegocioService.getTarefas(empresaId),
        crmNegocioService.getClientes(empresaId)
      ]);
      setProjetos(projs);
      setTarefas(tsks);
      setClientes(cls);
    } catch (err) {
      console.error('Erro ao carregar projetos:', err);
      toast.error('Erro ao carregar módulo de projetos.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProjeto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProj.nome) {
      toast.error('Preencha o nome do projeto.');
      return;
    }
    try {
      await crmNegocioService.createProjeto({
        ...formProj,
        empresa_id: empresaId,
        orcamento: Number(formProj.orcamento)
      });
      toast.success('Projeto criado com sucesso!');
      setShowNewModal(false);
      setFormProj({
        codigo: `PROJ-${Math.floor(1000 + Math.random() * 9000)}`,
        nome: '',
        cliente_id: '',
        descricao: '',
        gestor: user?.full_name || 'Gestor',
        orcamento: 0,
        moeda: 'AOA',
        prioridade: 'Média',
        estado: 'Planeamento',
        data_prevista: new Date().toISOString().split('T')[0]
      });
      loadData();
    } catch (err: any) {
      toast.error('Erro ao criar projeto: ' + (err.message || ''));
    }
  };

  const handleCreateTarefa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTask.nome || !formTask.projeto_id) {
      toast.error('Preencha o nome da tarefa e selecione o projeto.');
      return;
    }
    try {
      await crmNegocioService.createTarefa({
        ...formTask,
        empresa_id: empresaId
      });
      toast.success('Tarefa criada com sucesso!');
      setShowTaskModal(false);
      setFormTask({
        codigo: `TSK-${Math.floor(1000 + Math.random() * 9000)}`,
        nome: '',
        projeto_id: '',
        descricao: '',
        responsavel: user?.full_name || 'Equipa',
        prazo: new Date().toISOString().split('T')[0],
        prioridade: 'Média',
        estado: 'pendente'
      });
      loadData();
    } catch (err: any) {
      toast.error('Erro ao criar tarefa: ' + (err.message || ''));
    }
  };

  const totalOrcamento = projetos.reduce((sum, p) => sum + Number(p.orcamento || 0), 0);

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={selectedProjeto ? () => setSelectedProjeto(null) : onBack}
            className="p-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2 text-purple-700 font-black text-xs uppercase tracking-widest mb-1">
              <FolderGit2 size={16} /> CRM • Gestão de Projetos & Tarefas
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {selectedProjeto ? `Projeto: ${selectedProjeto.nome}` : 'Portfólio de Projetos Corporativos'}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => setActiveTab('projetos')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'projetos' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
            >
              Projetos ({projetos.length})
            </button>
            <button 
              onClick={() => setActiveTab('tarefas')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'tarefas' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
            >
              Tarefas ({tarefas.length})
            </button>
          </div>
          <button 
            onClick={() => setShowTaskModal(true)}
            className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-lg transition-all shadow-xs flex items-center gap-2"
          >
            <ListTodo size={16} /> Nova Tarefa
          </button>
          <button 
            onClick={() => setShowNewModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-lg transition-all shadow-md flex items-center gap-2"
          >
            <Plus size={16} /> Novo Projeto
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Orçamento Total de Projetos</p>
          <h3 className="text-xl font-black text-slate-900 mt-1">
            {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(totalOrcamento)}
          </h3>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Projetos Ativos</p>
          <h3 className="text-xl font-black text-purple-600 mt-1">{projetos.length} Projetos</h3>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Total de Tarefas</p>
          <h3 className="text-xl font-black text-slate-800 mt-1">{tarefas.length} Tarefas</h3>
        </div>
      </div>

      {activeTab === 'projetos' && !selectedProjeto && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projetos.map(proj => {
            const projTarefas = tarefas.filter(t => t.projeto_id === proj.id);
            const concluidas = projTarefas.filter(t => t.estado === 'concluida').length;
            const progresso = projTarefas.length > 0 ? Math.round((concluidas / projTarefas.length) * 100) : 0;
            return (
              <div 
                key={proj.id} 
                onClick={() => setSelectedProjeto(proj)}
                className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between border-t-4 border-t-purple-600"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-mono text-xs font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded">{proj.codigo}</span>
                    <span className="text-[10px] font-black bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full uppercase">{proj.estado}</span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900">{proj.nome}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{proj.descricao || 'Sem descrição.'}</p>
                  
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-xs font-bold text-slate-600">
                      <span>Progresso das Tarefas</span>
                      <span>{progresso}% ({concluidas}/{projTarefas.length})</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-purple-600 h-full rounded-full transition-all" style={{ width: `${progresso}%` }}></div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-500">Orçamento: <strong className="text-slate-900">{new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(proj.orcamento || 0)}</strong></span>
                  <span className="font-black text-purple-700">Ver Detalhes →</span>
                </div>
              </div>
            );
          })}
          {projetos.length === 0 && (
            <div className="col-span-full bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 font-medium text-xs">
              Nenhum projeto registado. Clique em "Novo Projeto" para começar.
            </div>
          )}
        </div>
      )}

      {activeTab === 'tarefas' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-black text-slate-900 pb-2 border-b border-slate-100">Todas as Tarefas do Sistema</h2>
          <div className="space-y-3">
            {tarefas.map(t => (
              <div key={t.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-purple-700">{t.codigo}</span>
                    <h4 className="text-xs font-black text-slate-900">{t.nome}</h4>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">{t.descricao || 'Sem descrição.'}</p>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-purple-50 text-purple-800 border border-purple-200">{t.estado}</span>
                  <div className="text-[10px] text-slate-400 mt-1">Prazo: {t.prazo || 'N/D'}</div>
                </div>
              </div>
            ))}
            {tarefas.length === 0 && (
              <p className="text-xs text-slate-400 py-12 text-center">Nenhuma tarefa registada.</p>
            )}
          </div>
        </div>
      )}

      {selectedProjeto && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
            <div>
              <span className="font-mono text-xs font-black text-purple-700">{selectedProjeto.codigo}</span>
              <h2 className="text-xl font-black text-slate-900 mt-1">{selectedProjeto.nome}</h2>
              <p className="text-xs text-slate-500 mt-1">Gestor: <strong>{selectedProjeto.gestor}</strong> • Orçamento: <strong>{new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(selectedProjeto.orcamento || 0)}</strong></p>
            </div>
            <button 
              onClick={() => setSelectedProjeto(null)}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-black uppercase hover:bg-slate-50"
            >
              Voltar aos Projetos
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">Tarefas do Projeto</h3>
            <div className="space-y-3">
              {tarefas.filter(t => t.projeto_id === selectedProjeto.id).map(t => (
                <div key={t.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-purple-700">{t.codigo}</span>
                      <h4 className="text-xs font-black text-slate-900">{t.nome}</h4>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">{t.descricao || 'Sem descrição.'}</p>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-purple-50 text-purple-800 border border-purple-200">{t.estado}</span>
                    <div className="text-[10px] text-slate-400 mt-1">Prazo: {t.prazo || 'N/D'}</div>
                  </div>
                </div>
              ))}
              {tarefas.filter(t => t.projeto_id === selectedProjeto.id).length === 0 && (
                <p className="text-xs text-slate-400 py-8 text-center">Nenhuma tarefa associada a este projeto.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Project Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <h2 className="text-lg font-black text-slate-900 pb-2 border-b border-slate-100">Criar Novo Projeto</h2>
            <form onSubmit={handleCreateProjeto} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome do Projeto *</label>
                <input 
                  type="text" 
                  required
                  value={formProj.nome}
                  onChange={(e) => setFormProj({...formProj, nome: e.target.value})}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                  placeholder="Ex: Implementação de Sistema ERP"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Cliente Associado</label>
                <select 
                  value={formProj.cliente_id}
                  onChange={(e) => setFormProj({...formProj, cliente_id: e.target.value})}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                >
                  <option value="">-- Selecionar Cliente --</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nome || c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Orçamento (AOA)</label>
                  <input 
                    type="number" 
                    value={formProj.orcamento}
                    onChange={(e) => setFormProj({...formProj, orcamento: Number(e.target.value)})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Data Prevista</label>
                  <input 
                    type="date" 
                    value={formProj.data_prevista}
                    onChange={(e) => setFormProj({...formProj, data_prevista: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Descrição</label>
                <textarea 
                  rows={2}
                  value={formProj.descricao}
                  onChange={(e) => setFormProj({...formProj, descricao: e.target.value})}
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
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg text-xs font-black uppercase shadow-md"
                >
                  Criar Projeto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <h2 className="text-lg font-black text-slate-900 pb-2 border-b border-slate-100">Criar Nova Tarefa</h2>
            <form onSubmit={handleCreateTarefa} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Projeto Associado *</label>
                <select 
                  required
                  value={formTask.projeto_id}
                  onChange={(e) => setFormTask({...formTask, projeto_id: e.target.value})}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                >
                  <option value="">-- Selecionar Projeto --</option>
                  {projetos.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome da Tarefa *</label>
                <input 
                  type="text" 
                  required
                  value={formTask.nome}
                  onChange={(e) => setFormTask({...formTask, nome: e.target.value})}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                  placeholder="Ex: Desenhar wireframes"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Prazo</label>
                  <input 
                    type="date" 
                    value={formTask.prazo}
                    onChange={(e) => setFormTask({...formTask, prazo: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Prioridade</label>
                  <select 
                    value={formTask.prioridade}
                    onChange={(e) => setFormTask({...formTask, prioridade: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                  >
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Alta">Alta</option>
                    <option value="Urgente">Urgente</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-black uppercase"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg text-xs font-black uppercase shadow-md"
                >
                  Criar Tarefa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
