import React, { useState, useMemo, useEffect } from 'react';
import { 
    LayoutDashboard, FileText, Users, Settings, Plus, CheckCircle, Clock, 
    MoreVertical, Search, Filter, AlertCircle, BarChart3, TrendingUp, DollarSign,
    Briefcase, Calendar, ChevronRight, Play, Pause, Square, Trash2, Edit3,
    CheckCircle2, Info, X, PieChart, Layers, Target, Activity, Zap, Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchWithAuth } from '../lib/fetchWithAuth';
import { useAuth } from '../contexts/AuthContext';

// --- Types & Initial Data ---

type ProjectStatus = 'Planeamento' | 'Em Progresso' | 'Em Revisão' | 'Concluído' | 'Atrasado';
type TaskStatus = 'Pendente' | 'Em Progresso' | 'Concluído';

interface Project {
    id: number;
    name: string;
    description: string;
    status: ProjectStatus;
    deadline: string;
    budgetTotal: number;
    budgetSpent: number;
    progress: number;
    manager: string;
    priority: 'Crítica' | 'Alta' | 'Normal';
    client: string;
    category: 'Infraestrutura' | 'Digital' | 'Operacional';
}

interface Task {
    id: number;
    projectId: number;
    name: string;
    status: TaskStatus;
    assignee: string;
    priority: 'Alta' | 'Média' | 'Baixa';
    estimatedHours: number;
    dueDate: string;
}

interface TeamMember {
    id: number;
    name: string;
    role: string;
    email: string;
    activeProjects: number;
    avatar: string;
    availability: number; // 0-100
}

const initialProjects: Project[] = [
  { id: 1, name: 'Expansão de Data Center', description: 'Instalação de novos racks e sistemas de climatização redundantes.', status: 'Em Progresso', deadline: '2026-06-15', budgetTotal: 12500000, budgetSpent: 4500000, progress: 36, manager: 'Telmo Vaz', priority: 'Crítica', client: 'Governo Provincial', category: 'Infraestrutura' },
  { id: 2, name: 'Portal de Auto-Atendimento', description: 'Migração do sistema legado para aplicação web moderna.', status: 'Atrasado', deadline: '2026-04-20', budgetTotal: 4500000, budgetSpent: 3800000, progress: 85, manager: 'Edna Lemos', priority: 'Alta', client: 'Interno', category: 'Digital' },
  { id: 3, name: 'Reestruturação Logística Q3', description: 'Otimização das rotas de distribuição.', status: 'Planeamento', deadline: '2026-09-01', budgetTotal: 8900000, budgetSpent: 0, progress: 0, manager: 'Fausto Costa', priority: 'Normal', client: 'Empresa Mãe', category: 'Operacional' },
  { id: 4, name: 'Auditoria Externa 2026', description: 'Conformidade com normas internacionais.', status: 'Concluído', deadline: '2026-03-31', budgetTotal: 1500000, budgetSpent: 1450000, progress: 100, manager: 'Paula Abreu', priority: 'Alta', client: 'Bancos do Estado', category: 'Operacional' },
];

const initialTasks: Task[] = [
  { id: 1, projectId: 1, name: 'Encomenda de Cablagem Óptica', status: 'Concluído', assignee: 'Telmo Vaz', priority: 'Média', estimatedHours: 4, dueDate: '2026-04-01' },
  { id: 2, projectId: 1, name: 'Montagem de Racks Piso 1', status: 'Em Progresso', assignee: 'Pedro Neto', priority: 'Alta', estimatedHours: 40, dueDate: '2026-04-30' },
  { id: 3, projectId: 2, name: 'Integração de OAuth2', status: 'Pendente', assignee: 'Tiago Dias', priority: 'Alta', estimatedHours: 16, dueDate: '2026-04-25' },
];

const initialTeam: TeamMember[] = [
    { id: 1, name: 'Telmo Vaz', role: 'Gestor Sénior', email: 'tvaz@corporacao.co.ao', activeProjects: 2, avatar: 'TV', availability: 40 },
    { id: 2, name: 'Edna Lemos', role: 'Lead Developer', email: 'elemos@corporacao.co.ao', activeProjects: 3, avatar: 'EL', availability: 15 },
    { id: 3, name: 'Fausto Costa', role: 'COO / Operações', email: 'fcosta@corporacao.co.ao', activeProjects: 1, avatar: 'FC', availability: 80 },
    { id: 4, name: 'Paula Abreu', role: 'Compliance Officer', email: 'pabreu@corporacao.co.ao', activeProjects: 4, avatar: 'PA', availability: 10 },
];

// --- Sub-Renders ---

const ProjectManagementModule = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'projects' | 'kanban' | 'team' | 'reports'>('dashboard');
    const [projects, setProjects] = useState<Project[]>(initialProjects);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [team, setTeam] = useState<TeamMember[]>(initialTeam);
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);

    const fetchData = async () => {
        try {
            const res = await fetchWithAuth(`/api/projects/tasks?company_id=${user?.company_id}`);
            if (res.ok) setTasks(await res.json());
        } catch (err) {
            console.error('Error fetching project tasks:', err);
        }
    };

    useEffect(() => {
        fetchData();
        setTasks(initialTasks);
    }, [user?.company_id]);

    const handleAddTask = async (projectId: number, name: string) => {
        try {
            const res = await fetchWithAuth('/api/projects/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    name,
                    status: 'Pendente',
                    assignee: user?.email,
                    priority: 'Média',
                    estimatedHours: 8,
                    dueDate: new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0],
                    company_id: user?.company_id
                })
            });
            if (res.ok) fetchData();
        } catch (err) {
            console.error('Error adding task:', err);
        }
    };

    const metrics = useMemo(() => {
        const total = projects.length;
        const active = projects.filter(p => ['Em Progresso', 'Atrasado', 'Em Revisão'].includes(p.status)).length;
        const delayed = projects.filter(p => p.status === 'Atrasado').length;
        const budget = projects.reduce((acc, p) => acc + p.budgetTotal, 0);
        const spent = projects.reduce((acc, p) => acc + p.budgetSpent, 0);
        const avgProgress = total ? Math.round(projects.reduce((acc, p) => acc + p.progress, 0) / total) : 0;
        return { total, active, delayed, budget, spent, avgProgress };
    }, [projects]);

    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(val);

    const renderProjectDetail = (project: Project) => (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="bg-white p-6 border border-zinc-200 shadow-sm flex flex-col md:flex-row gap-6 items-center">
                <div className="w-24 h-24 bg-zinc-900 text-white flex items-center justify-center font-bold text-3xl shadow-sm">
                    {project.name.charAt(0)}
                </div>
                <div className="flex-1 text-center md:text-left">
                    <div className="flex flex-wrap items-center gap-3 mb-2 justify-center md:justify-start">
                        <h3 className="text-2xl font-bold text-[#003366] uppercase tracking-tight">{project.name}</h3>
                        <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest border ${
                            project.status === 'Concluído' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-blue-50 border-blue-200 text-blue-700'
                        }`}>
                            {project.status}
                        </span>
                    </div>
                    <p className="text-zinc-500 text-sm font-medium">{project.description}</p>
                </div>
                <button onClick={() => setSelectedProject(null)} className="px-6 py-2 bg-zinc-100 border border-zinc-200 text-zinc-600 text-xs font-bold uppercase tracking-widest hover:bg-zinc-200 transition-all flex items-center gap-2">
                    Voltar ao Monitor
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    {/* Progress Chart Section */}
                    <div className="bg-white p-6 border border-zinc-200 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h4 className="text-lg font-bold text-[#003366] uppercase tracking-tight">Timeline de Execução</h4>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                <Clock size={14}/> {project.deadline}
                            </div>
                        </div>
                        <div className="relative h-2 w-full bg-zinc-100 overflow-hidden border border-zinc-200">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${project.progress}%` }}
                                className="h-full bg-[#003366]"
                            />
                        </div>
                        <div className="flex justify-between mt-4">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Início: 01-01-2026</span>
                            <span className="text-lg font-bold text-zinc-900">{project.progress}% Completo</span>
                        </div>
                    </div>

                    {/* Tasks */}
                    <div className="bg-white p-6 border border-zinc-200 shadow-sm">
                         <h4 className="text-lg font-bold text-[#003366] uppercase tracking-tight mb-6">Próximos Milestones</h4>
                         <div className="space-y-4">
                            {tasks.filter(t => t.projectId === project.id).map(task => (
                                <div key={task.id} className="p-4 border border-zinc-100 flex items-center justify-between hover:bg-zinc-50 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-3 h-3 ${task.status === 'Concluído' ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                                        <div>
                                            <p className="font-bold text-zinc-800 uppercase text-sm mb-1">{task.name}</p>
                                            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{task.assignee} • {task.dueDate}</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{task.estimatedHours}h Est.</span>
                                </div>
                            ))}
                            <button className="w-full py-4 border border-dashed border-zinc-300 text-zinc-500 text-xs font-bold uppercase tracking-widest hover:border-blue-500 hover:text-blue-600 transition-all flex items-center justify-center gap-2">
                                <Plus size={16}/> Adicionar Milestone Técnico
                            </button>
                         </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Financial Summary */}
                    <div className="bg-[#003366] text-white p-6 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5"></div>
                        <h4 className="text-[10px] font-bold uppercase tracking-widest mb-6 opacity-80">Budget Operation</h4>
                        <div className="space-y-1 mb-8">
                            <p className="text-3xl font-bold tracking-tight">{formatCurrency(project.budgetTotal)}</p>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-50">Dotação Inicial</p>
                        </div>
                        <div className="space-y-1 mb-8">
                            <p className="text-xl font-bold tracking-tight">{formatCurrency(project.budgetSpent)}</p>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-50">Total Liquidado ({Math.round((project.budgetSpent/project.budgetTotal)*100)}%)</p>
                        </div>
                        <button className="w-full py-3 bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold uppercase tracking-widest transition-all">Ver Facturação Associada</button>
                    </div>

                    {/* Team */}
                    <div className="bg-white p-6 border border-zinc-200 shadow-sm">
                        <h4 className="text-lg font-bold text-[#003366] uppercase tracking-tight mb-6">Equipa Alocada</h4>
                        <div className="flex -space-x-3 mb-6">
                            {team.slice(0, 3).map(m => (
                                <div key={m.id} title={m.name} className="w-10 h-10 border-2 border-white bg-zinc-900 text-white flex items-center justify-center font-bold text-xs shadow-sm cursor-pointer hover:scale-110 transition-transform">
                                    {m.avatar}
                                </div>
                            ))}
                            <div className="w-10 h-10 border-2 border-white bg-zinc-100 text-zinc-500 flex items-center justify-center font-bold text-xs shadow-sm">
                                +{team.length - 3}
                            </div>
                        </div>
                        <button className="w-full py-2 bg-zinc-50 border border-zinc-200 text-zinc-600 text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-100 transition-all">Gerir Recursos</button>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderDashboard = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { title: 'Portfolio Ativo', val: metrics.active, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', sub: `Total: ${metrics.total} Projetos` },
                    { title: 'Progresso Médio', val: `${metrics.avgProgress}%`, icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', sub: 'Calculado em tempo real' },
                    { title: 'Orçamento Total', val: formatCurrency(metrics.budget), icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', sub: `Consumido: ${Math.round((metrics.spent/metrics.budget)*100)}%` },
                    { title: 'Criticos/Atrasados', val: metrics.delayed, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', sub: 'Ação necessária imediata' },
                ].map((c, i) => (
                    <div key={i} className="bg-white p-6 border border-zinc-200 shadow-sm flex items-start justify-between group">
                        <div>
                            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">{c.title}</p>
                            <p className="text-2xl font-bold text-[#003366]">{c.val}</p>
                            <p className="text-xs text-zinc-400 mt-1">{c.sub}</p>
                        </div>
                        <div className={`p-3 border ${c.bg} ${c.color} ${c.border}`}>
                            <c.icon size={20} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Middle Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white border border-zinc-200 p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-sm font-bold text-[#003366] uppercase tracking-widest">Projetos em Destaque</h3>
                        </div>
                        <button onClick={() => setActiveTab('projects')} className="bg-zinc-100 text-zinc-600 px-4 py-2 border border-zinc-200 text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-200 transition-all">Explorar Portfolio</button>
                    </div>
                    <div className="space-y-4">
                        {projects.slice(0, 3).map(p => (
                            <div key={p.id} className="p-4 border border-zinc-100 hover:border-blue-100 transition-all group flex flex-col md:flex-row gap-6 items-center">
                                <div className="flex-1 w-full cursor-pointer" onClick={() => setSelectedProject(p)}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h4 className="font-bold text-zinc-800 uppercase text-sm">{p.name}</h4>
                                        <span className={`px-2 py-0.5 border text-[10px] font-bold uppercase tracking-widest ${
                                            p.priority === 'Crítica' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-zinc-50 text-zinc-600 border-zinc-200'
                                        }`}>{p.priority}</span>
                                    </div>
                                    <p className="text-zinc-500 text-xs line-clamp-2 leading-relaxed mb-4">{p.description}</p>
                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                            <Calendar size={14} className="text-[#003366]"/> {p.deadline}
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                            <Users size={14} className="text-[#003366]"/> {p.manager}
                                        </div>
                                    </div>
                                </div>
                                <div className="w-full md:w-48 space-y-2">
                                    <div className="flex justify-between items-end mb-1">
                                        <span className="text-[10px] font-bold text-[#003366] uppercase tracking-widest">Conclusão</span>
                                        <span className="text-lg font-bold text-zinc-900 tracking-tight leading-none">{p.progress}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-zinc-100 overflow-hidden border border-zinc-200">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${p.progress}%` }}
                                            className={`h-full ${p.progress === 100 ? 'bg-emerald-500' : p.status === 'Atrasado' ? 'bg-red-500' : 'bg-[#003366]'}`}
                                        />
                                    </div>
                                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest text-right">{p.status}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white border border-zinc-200 p-6 shadow-sm flex flex-col">
                    <h3 className="text-sm font-bold text-[#003366] uppercase tracking-widest mb-6">Performance Equipa</h3>
                    <div className="space-y-4 flex-1">
                        {team.map(m => (
                            <div key={m.id} className="flex items-center gap-3 group">
                                <div className="w-10 h-10 border border-zinc-200 bg-zinc-50 flex items-center justify-center font-bold text-[#003366] text-sm">
                                     {m.avatar}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-zinc-800 text-sm truncate leading-none mb-1">{m.name}</p>
                                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest truncate">{m.role}</p>
                                    <div className="mt-2 flex items-center gap-2">
                                        <div className="flex-1 h-1.5 bg-zinc-100 overflow-hidden">
                                            <div className="h-full bg-blue-500" style={{ width: `${m.availability}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => setActiveTab('team')} className="mt-6 w-full py-2 bg-zinc-50 border border-zinc-200 text-zinc-600 text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-100 transition-all">Ver Alocação</button>
                </div>
            </div>
        </div>
    );

    const renderProjectsList = () => (
        <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="p-4 border-b border-zinc-200 bg-white flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                    <input type="text" placeholder="Filtrar projetos..." className="w-full pl-10 pr-4 py-2 border border-zinc-300 bg-zinc-50 outline-none focus:border-[#003366] transition-all text-sm" />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <button className="flex-1 md:flex-none p-2 bg-white border border-zinc-300 text-zinc-500 hover:bg-zinc-50 transition-all"><Filter size={18}/></button>
                    <button onClick={() => setIsProjectModalOpen(true)} className="flex-[2] md:flex-none bg-[#003366] text-white px-6 py-2.5 text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-[#002244] active:scale-95 transition-all flex items-center justify-center gap-2">
                        <Plus size={16} /> Novo Projeto
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead>
                        <tr className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 bg-white border-b border-zinc-200">
                            <th className="px-6 py-4">Detalhes do Projeto</th>
                            <th className="px-6 py-4">Propriedades</th>
                            <th className="px-6 py-4">Orçamento Consumido</th>
                            <th className="px-6 py-4">Fase/Status</th>
                            <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                        {projects.map(p => (
                            <tr key={p.id} className="hover:bg-zinc-50/50 transition-colors group cursor-pointer" onClick={() => setSelectedProject(p)}>
                                <td className="px-6 py-4">
                                    <div className="font-bold text-[#003366] uppercase text-sm mb-1">{p.name}</div>
                                    <div className="text-zinc-500 text-xs font-medium">{p.client}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-xs font-bold text-zinc-800 uppercase tracking-widest mb-1">{p.category}</div>
                                    <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                                        <CheckCircle2 size={12} className="text-[#003366]"/> Prazo: {p.deadline}
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-mono">
                                    <div className="text-sm font-bold text-zinc-900">{formatCurrency(p.budgetSpent)}</div>
                                    <div className="w-full bg-zinc-100 h-1 mt-1.5 overflow-hidden">
                                        <div className="h-full bg-amber-500" style={{ width: `${(p.budgetSpent/p.budgetTotal)*100}%` }}></div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                   <div className={`inline-flex items-center gap-2 px-3 py-1 border text-[10px] font-bold uppercase tracking-widest
                                        ${p.status==='Concluído' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                                          p.status==='Atrasado' ? 'bg-red-50 text-red-700 border-red-200' : 
                                          p.status==='Planeamento' ? 'bg-zinc-50 text-zinc-600 border-zinc-200' : 
                                          'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                        {p.status}
                                    </div>
                                    <div className="mt-2 flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-[#003366]">{p.progress}%</span>
                                        <div className="flex-1 h-1.5 bg-zinc-100 overflow-hidden">
                                            <div className="h-full bg-[#003366]" style={{ width: `${p.progress}%` }}></div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="p-2 bg-zinc-50 border border-zinc-200 text-zinc-500 hover:text-[#003366] transition-all"><Edit3 size={14}/></button>
                                        <button className="p-2 bg-zinc-50 border border-zinc-200 text-zinc-500 hover:text-red-600 transition-all"><Trash2 size={14}/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
             {/* Header Section */}
             <div className="flex justify-between items-center bg-white p-6 border border-zinc-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#003366] text-white flex items-center justify-center shadow-sm">
                        <Layers size={24} />
                    </div>
                    <div>
                         <h2 className="text-2xl font-bold text-[#003366] tracking-tight">Gestão de Projetos</h2>
                         <p className="text-zinc-500 max-w-2xl text-xs font-medium uppercase tracking-widest">Controlo integrado sobre o ciclo de vida dos projetos.</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setActiveTab('reports')} className="px-6 py-2.5 bg-white border border-zinc-300 text-zinc-700 text-xs font-bold uppercase tracking-widest hover:bg-zinc-50 transition-all flex items-center gap-2">
                        <PieChart size={16} /> Relatórios
                    </button>
                    <button onClick={() => setIsProjectModalOpen(true)} className="px-6 py-2.5 bg-[#003366] text-white text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-[#002244] transition-all flex items-center gap-2">
                        <Plus size={16}/> Novo Empreendimento
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-zinc-200 bg-white">
                {[
                    { id: 'dashboard', label: 'Monitorização', icon: <LayoutDashboard size={16}/> },
                    { id: 'projects', label: 'Lista de Projetos', icon: <Target size={16}/> },
                    { id: 'kanban', label: 'Quadro Kanban', icon: <TrendingUp size={16}/> },
                    { id: 'team', label: 'Matriz de Equipa', icon: <Users size={16}/> },
                    { id: 'reports', label: 'Analytics', icon: <PieChart size={16}/> }
                ].map(tab => (
                    <button 
                        key={tab.id} 
                        onClick={() => setActiveTab(tab.id as any)} 
                        className={`flex items-center gap-2 px-6 py-4 text-xs font-bold tracking-widest transition-all uppercase whitespace-nowrap
                        ${activeTab === tab.id ? 'text-[#003366] border-b-2 border-[#003366] bg-white' : 'text-zinc-500 hover:text-[#003366] bg-transparent'}`}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            <div>
                {selectedProject ? (
                    renderProjectDetail(selectedProject)
                ) : (
                    <>
                        {activeTab === 'dashboard' && renderDashboard()}
                        {activeTab === 'projects' && renderProjectsList()}
                        {activeTab === 'team' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in zoom-in-95 duration-500">
                                {team.map(member => (
                                    <div key={member.id} className="bg-white p-6 border border-zinc-200 shadow-sm flex flex-col items-center">
                                        <div className="w-20 h-20 bg-zinc-900 border border-zinc-200 text-white flex items-center justify-center font-bold text-2xl mb-4">
                                            {member.avatar}
                                        </div>
                                        <h4 className="text-sm font-bold text-zinc-800 uppercase mb-1">{member.name}</h4>
                                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-6">{member.role}</p>
                                        
                                        <div className="w-full space-y-4 pt-4 border-t border-zinc-100">
                                            <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                                <span>Projetos Ativos</span>
                                                <span className="text-zinc-800">{member.activeProjects}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                                <span>Disponibilidade</span>
                                                <span className="text-emerald-600">{member.availability}%</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-zinc-100 overflow-hidden">
                                                <div className="h-full bg-blue-500" style={{ width: `${100 - member.availability}%` }}></div>
                                            </div>
                                        </div>
                                        <button className="mt-6 w-full py-2 bg-zinc-50 border border-zinc-200 text-zinc-600 text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-100 transition-all">Ver Ficha Técnica</button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {activeTab === 'reports' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
                                {[
                                    { title: 'Status Financeiro Total', desc: 'Cruzamento de orçamentos previstos vs liquidados em todo o portfolio.', icon: DollarSign, trend: '+12.5%' },
                                    { title: 'Ocorrências e Riscos', desc: 'Relatório detalhado de imprevistos e mitigation plans ativos.', icon: AlertCircle, trend: 'Monitorizado' },
                                    { title: 'Curva de Produtividade', desc: 'Análise de horas consumidas por tarefa vs estimativa técnica.', icon: TrendingUp, trend: '92% Eficiência' },
                                    { title: 'Audit Compliance', desc: 'Verificações de normas de qualidade e segurança ocupacional.', icon: Shield, trend: 'OK' },
                                    { title: 'Forecast Milestone', desc: 'Previsão algorítmica de conclusão baseada no ritmo atual.', icon: Clock, trend: 'Próx. Q3' },
                                    { title: 'Matriz de Responsabilidade', desc: 'Tabela RACI automatizada de todos os stakeholders.', icon: Layers, trend: 'Atualizado' },
                                ].map((r, i) => (
                                    <div key={i} className="bg-white p-6 border border-zinc-200 shadow-sm flex flex-col group hover:border-blue-300 transition-all cursor-pointer">
                                        <div className="w-12 h-12 bg-blue-50 border border-blue-100 flex items-center justify-center text-[#003366] mb-4">
                                            <r.icon size={20} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="text-sm font-bold text-[#003366] uppercase">{r.title}</h4>
                                                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{r.trend}</span>
                                            </div>
                                            <p className="text-xs text-zinc-500 leading-relaxed">{r.desc}</p>
                                        </div>
                                        <button className="mt-6 self-start text-[10px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all">Extrair Relatório <FileText size={14}/></button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {activeTab === 'kanban' && (
                            <div className="bg-white border border-zinc-200 p-16 text-center shadow-sm flex flex-col items-center justify-center animate-in fade-in zoom-in-95">
                                <div className="w-16 h-16 bg-blue-50 text-[#003366] flex items-center justify-center mb-6 border border-blue-100"><Activity size={32}/></div>
                                <h3 className="text-xl font-bold text-[#003366] uppercase mb-4 tracking-tight">Quadro Kanban Interativo</h3>
                                <p className="text-zinc-500 max-w-lg mx-auto text-sm">
                                    O quadro de tarefas está a ser renderizado com base nos cartões de prioridade do sistema. Arraste e solte tarefas para actualizar o estado.
                                </p>
                                <div className="mt-8 flex gap-4">
                                    <button className="px-6 py-2.5 bg-[#003366] text-white text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-[#002244] transition-all">Visualizar Quadro</button>
                                    <button className="px-6 py-2.5 bg-white border border-zinc-300 text-zinc-700 text-xs font-bold uppercase tracking-widest hover:bg-zinc-50 transition-all">Configurar</button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            <AnimatePresence>
                {isProjectModalOpen && (
                    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" onClick={() => setIsProjectModalOpen(false)}></div>
                         <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="bg-white shadow-xl w-full max-w-3xl border border-zinc-200 relative z-10"
                        >
                            <div className="flex justify-between items-center p-6 border-b border-zinc-200 bg-zinc-50">
                                <h3 className="font-bold text-[#003366] uppercase text-sm tracking-widest flex items-center gap-2"><Plus size={18}/> Novo Empreendimento</h3>
                                <button onClick={() => setIsProjectModalOpen(false)} className="text-zinc-400 hover:text-red-500 transition-colors"><X size={24}/></button>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Designação Oficial</label>
                                            <input type="text" className="w-full bg-white border border-zinc-300 px-4 py-2.5 text-sm outline-none focus:border-[#003366] transition-all" placeholder="Nome do Projecto" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Cliente / Beneficiário</label>
                                            <input type="text" className="w-full bg-white border border-zinc-300 px-4 py-2.5 text-sm outline-none focus:border-[#003366] transition-all" placeholder="Entidade Contratante" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Prioridade</label>
                                                <select className="w-full bg-white border border-zinc-300 px-4 py-2.5 text-sm outline-none focus:border-[#003366]">
                                                    <option>Normal</option>
                                                    <option>Alta</option>
                                                    <option>Crítica</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Categoria</label>
                                                <select className="w-full bg-white border border-zinc-300 px-4 py-2.5 text-sm outline-none focus:border-[#003366]">
                                                    <option>Digital</option>
                                                    <option>Infraestrutura</option>
                                                    <option>Operacional</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Resumo Executivo</label>
                                            <textarea rows={4} className="w-full bg-white border border-zinc-300 px-4 py-2.5 text-sm outline-none focus:border-[#003366]" placeholder="Objectivos e entregas esperadas..."></textarea>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Deadline</label>
                                                <input type="date" className="w-full bg-white border border-zinc-300 px-4 py-2.5 text-sm focus:border-[#003366]" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Budget (Kz)</label>
                                                <input type="number" className="w-full bg-white border border-zinc-300 px-4 py-2.5 text-sm focus:border-[#003366]" placeholder="0.00" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-zinc-100">
                                    <button onClick={() => setIsProjectModalOpen(false)} className="px-6 py-2 bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-bold uppercase tracking-widest hover:bg-zinc-200 transition-all">Cancelar</button>
                                    <button className="px-6 py-2 bg-[#003366] text-white text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-[#002244] transition-all outline-none">Salvar Projeto</button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ProjectManagementModule;
