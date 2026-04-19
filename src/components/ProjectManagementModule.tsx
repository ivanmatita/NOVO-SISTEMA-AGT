import React, { useState, useMemo } from 'react';
import { 
    LayoutDashboard, FileText, Users, Settings, Plus, CheckCircle, Clock, 
    MoreVertical, Search, Filter, AlertCircle, BarChart3, TrendingUp, DollarSign,
    Briefcase, Calendar, ChevronRight, Play, Pause, Square, Trash2, Edit3
} from 'lucide-react';

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
}

interface Task {
    id: number;
    projectId: number;
    name: string;
    status: TaskStatus;
    assignee: string;
    priority: 'Alta' | 'Média' | 'Baixa';
    estimatedHours: number;
}

interface TeamMember {
    id: number;
    name: string;
    role: string;
    email: string;
    activeProjects: number;
    avatar: string;
}

const initialProjects: Project[] = [
  { id: 1, name: 'Renovação Escritório Sede', description: 'Remodelação completa do piso 3 com novo layout open space.', status: 'Em Progresso', deadline: '2026-05-30', budgetTotal: 50000, budgetSpent: 22500, progress: 45, manager: 'Rui Silva' },
  { id: 2, name: 'Website Institucional', description: 'Desenvolvimento do novo site empresarial com e-commerce B2B integrado.', status: 'Atrasado', deadline: '2026-04-15', budgetTotal: 15000, budgetSpent: 12000, progress: 70, manager: 'Ana Costa' },
  { id: 3, name: 'Auditoria de Segurança Q1', description: 'Auditoria externa de conformidade ISO 27001.', status: 'Planeamento', deadline: '2026-07-01', budgetTotal: 8000, budgetSpent: 0, progress: 0, manager: 'Pedro Martins' },
  { id: 4, name: 'Campanha Marketing de Verão', description: 'Preparação dos media e outdoors para campanha nacional.', status: 'Concluído', deadline: '2026-03-10', budgetTotal: 25000, budgetSpent: 24500, progress: 100, manager: 'Sofia Mendes' },
];

const initialTasks: Task[] = [
  { id: 1, projectId: 1, name: 'Aprovação de Orçamentos de Hardware', status: 'Concluído', assignee: 'Rui Silva', priority: 'Alta', estimatedHours: 8 },
  { id: 2, projectId: 1, name: 'Compra Mobiliário (Cadeiras)', status: 'Em Progresso', assignee: 'Carlos Pires', priority: 'Média', estimatedHours: 12 },
  { id: 3, projectId: 1, name: 'Instalação de Rede', status: 'Pendente', assignee: 'Pedro Martins', priority: 'Alta', estimatedHours: 40 },
  { id: 4, projectId: 2, name: 'Design de Interface (UI)', status: 'Concluído', assignee: 'Ana Costa', priority: 'Média', estimatedHours: 60 },
  { id: 5, projectId: 2, name: 'Implementação Carrinho Compras', status: 'Em Progresso', assignee: 'Nuno Alves', priority: 'Alta', estimatedHours: 120 },
];

const initialTeam: TeamMember[] = [
    { id: 1, name: 'Rui Silva', role: 'Gestor de Projetos', email: 'rui.s@empresa.com', activeProjects: 2, avatar: 'RS' },
    { id: 2, name: 'Ana Costa', role: 'Designer UI/UX', email: 'ana.c@empresa.com', activeProjects: 3, avatar: 'AC' },
    { id: 3, name: 'Pedro Martins', role: 'Engenheiro de Redes', email: 'pedro.m@empresa.com', activeProjects: 1, avatar: 'PM' },
    { id: 4, name: 'Sofia Mendes', role: 'Diretora de Marketing', email: 'sofia.m@empresa.com', activeProjects: 4, avatar: 'SM' },
];

// --- Components ---

const ProjectManagementModule = () => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'projects' | 'kanban' | 'team'>('dashboard');
    const [projects, setProjects] = useState<Project[]>(initialProjects);
    const [tasks, setTasks] = useState<Task[]>(initialTasks);
    const [team, setTeam] = useState<TeamMember[]>(initialTeam);

    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(val);

    // -- Derived Metrics --
    const metrics = useMemo(() => {
        const total = projects.length;
        const active = projects.filter(p => p.status === 'Em Progresso' || p.status === 'Atrasado').length;
        const delayed = projects.filter(p => p.status === 'Atrasado').length;
        const completed = projects.filter(p => p.status === 'Concluído').length;
        
        const totalBudget = projects.reduce((acc, p) => acc + p.budgetTotal, 0);
        const totalSpent = projects.reduce((acc, p) => acc + p.budgetSpent, 0);
        const overallProgress = total > 0 ? Math.round(projects.reduce((acc, p) => acc + p.progress, 0) / total) : 0;

        return { total, active, delayed, completed, totalBudget, totalSpent, overallProgress };
    }, [projects]);

    // -- Actions --
    const handleAddProject = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const newProject: Project = {
            id: Date.now(),
            name: formData.get('name') as string,
            description: formData.get('description') as string,
            status: 'Planeamento',
            deadline: formData.get('deadline') as string,
            budgetTotal: Number(formData.get('budget')),
            budgetSpent: 0,
            progress: 0,
            manager: formData.get('manager') as string,
        };
        setProjects([...projects, newProject]);
        setIsProjectModalOpen(false);
    };

    const handleMoveTask = (taskId: number, newStatus: TaskStatus) => {
        setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    };

    const handleDeleteProject = (id: number) => {
        if(confirm('Tem certeza que deseja remover este projeto?')) {
            setProjects(projects.filter(p => p.id !== id));
            setTasks(tasks.filter(t => t.projectId !== id)); // cascading delete tasks
        }
    };

    // -- Sub-renders --
    const renderDashboard = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Briefcase size={24} /></div>
                        <span className="text-xs font-bold px-2 py-1 bg-green-100 text-green-700 rounded-full">{metrics.active} Ativos</span>
                    </div>
                    <h3 className="text-zinc-500 text-sm font-medium">Total de Projetos</h3>
                    <p className="text-3xl font-black text-zinc-800">{metrics.total}</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><AlertCircle size={24} /></div>
                    </div>
                    <h3 className="text-zinc-500 text-sm font-medium">Projetos Atrasados</h3>
                    <p className="text-3xl font-black text-zinc-800">{metrics.delayed}</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><TrendingUp size={24} /></div>
                    </div>
                    <h3 className="text-zinc-500 text-sm font-medium">Progresso Global</h3>
                    <p className="text-3xl font-black text-zinc-800">{metrics.overallProgress}%</p>
                    <div className="w-full bg-zinc-100 rounded-full h-2 mt-3">
                        <div className="bg-emerald-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${metrics.overallProgress}%` }}></div>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><DollarSign size={24} /></div>
                    </div>
                    <h3 className="text-zinc-500 text-sm font-medium">Orçamento Consumido</h3>
                    <p className="text-2xl font-black text-zinc-800">{formatCurrency(metrics.totalSpent)}</p>
                    <p className="text-xs text-zinc-400 mt-1">de {formatCurrency(metrics.totalBudget)}</p>
                </div>
            </div>

            {/* List and charts area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-xl shadow-sm p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold">Projetos em Destaque</h3>
                        <button onClick={() => setActiveTab('projects')} className="text-blue-600 text-sm font-medium hover:underline">Ver Todos</button>
                    </div>
                    <div className="space-y-4">
                        {projects.slice(0,3).map(p => (
                            <div key={p.id} className="p-4 border border-zinc-100 rounded-lg hover:bg-zinc-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex-1">
                                    <h4 className="font-bold text-zinc-800">{p.name}</h4>
                                    <div className="text-sm text-zinc-500 flex items-center gap-2 mt-1">
                                        <Calendar size={14} /> Prazo: {p.deadline}
                                    </div>
                                </div>
                                <div className="w-full md:w-1/3">
                                    <div className="flex justify-between text-xs mb-1 font-medium">
                                        <span className="text-zinc-500">Progresso</span>
                                        <span className="text-zinc-800">{p.progress}%</span>
                                    </div>
                                    <div className="w-full bg-zinc-100 rounded-full h-1.5">
                                        <div className={`h-1.5 rounded-full ${p.status === 'Atrasado' ? 'bg-red-500' : p.progress === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`} style={{ width: `${p.progress}%` }}></div>
                                    </div>
                                </div>
                                <div className="md:w-32 text-right">
                                     <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider
                                        ${p.status==='Concluído' ? 'bg-emerald-100 text-emerald-700' : 
                                          p.status==='Atrasado' ? 'bg-red-100 text-red-700' : 
                                          p.status==='Planeamento' ? 'bg-zinc-100 text-zinc-700' : 
                                          'bg-blue-100 text-blue-700'}`}>
                                        {p.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white border border-zinc-200 rounded-xl shadow-sm p-6">
                    <h3 className="text-lg font-bold mb-6">Equipa Ativa</h3>
                    <div className="space-y-4">
                        {team.map(m => (
                            <div key={m.id} className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-[#003366] text-white flex items-center justify-center font-bold">{m.avatar}</div>
                                <div className="flex-1">
                                    <p className="font-bold text-sm">{m.name}</p>
                                    <p className="text-xs text-zinc-500">{m.role}</p>
                                </div>
                                <div className="text-xs font-bold text-zinc-500 px-2 py-1 bg-zinc-100 rounded">
                                    {m.activeProjects} Proj
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderProjectsList = () => (
        <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-4 border-b border-zinc-200 bg-zinc-50/50 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                    <input type="text" placeholder="Pesquisar projetos..." className="w-full pl-10 pr-4 py-2 border border-zinc-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#003366]/20 outline-none" />
                </div>
                <button 
                    onClick={() => setIsProjectModalOpen(true)}
                    className="w-full md:w-auto bg-[#003366] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#002244] transition-colors"
                >
                    <Plus size={16} /> Novo Projeto
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="text-xs text-zinc-500 bg-zinc-50 border-b border-zinc-200 uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4 font-semibold">Nome do Projeto</th>
                            <th className="px-6 py-4 font-semibold">Gestor</th>
                            <th className="px-6 py-4 font-semibold">Status</th>
                            <th className="px-6 py-4 font-semibold">Prazo</th>
                            <th className="px-6 py-4 font-semibold">Progresso</th>
                            <th className="px-6 py-4 font-semibold text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                        {projects.map(p => (
                            <tr key={p.id} className="hover:bg-zinc-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-zinc-900">{p.name}</div>
                                    <div className="text-xs text-zinc-500 truncate max-w-[200px]">{p.description}</div>
                                </td>
                                <td className="px-6 py-4 text-zinc-700">{p.manager}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider
                                        ${p.status==='Concluído' ? 'bg-emerald-100 text-emerald-700' : 
                                          p.status==='Atrasado' ? 'bg-red-100 text-red-700' : 
                                          p.status==='Planeamento' ? 'bg-zinc-100 text-zinc-700' : 
                                          'bg-blue-100 text-blue-700'}`}>
                                        {p.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-zinc-700 flex items-center gap-2"><Calendar size={14} className="text-zinc-400"/> {p.deadline}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-24 bg-zinc-200 rounded-full h-1.5 hidden md:block">
                                            <div className="bg-[#003366] h-1.5 rounded-full" style={{ width: `${p.progress}%` }}></div>
                                        </div>
                                        <span className="text-xs font-bold text-zinc-700">{p.progress}%</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button className="p-1.5 text-zinc-400 hover:text-blue-600 bg-white border border-zinc-200 rounded shadow-sm transition-colors" title="Editar"><Edit3 size={14}/></button>
                                        <button onClick={() => handleDeleteProject(p.id)} className="p-1.5 text-zinc-400 hover:text-red-600 bg-white border border-zinc-200 rounded shadow-sm transition-colors" title="Remover"><Trash2 size={14}/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {projects.length === 0 && (
                            <tr><td colSpan={6} className="text-center py-8 text-zinc-500">Nenhum projeto encontrado.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderKanban = () => {
        const columns: { title: string, status: TaskStatus, color: string }[] = [
            { title: 'A Fazer (Pendentes)', status: 'Pendente', color: 'bg-zinc-200' },
            { title: 'Em Progresso', status: 'Em Progresso', color: 'bg-blue-200' },
            { title: 'Concluído', status: 'Concluído', color: 'bg-emerald-200' }
        ];

        return (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col h-[600px]">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-zinc-600">Filtrar por Projeto:</span>
                        <select 
                            className="text-sm border-zinc-300 rounded-md shadow-sm outline-none p-1.5 bg-white"
                            onChange={(e) => setSelectedProjectId(e.target.value ? Number(e.target.value) : null)}
                        >
                            <option value="">Todos os Projetos</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden">
                    {columns.map(col => {
                        const colTasks = tasks.filter(t => t.status === col.status && (selectedProjectId ? t.projectId === selectedProjectId : true));
                        return (
                            <div key={col.status} className="bg-zinc-100 border border-zinc-200 rounded-xl flex flex-col overflow-hidden shadow-sm">
                                <div className={`px-4 py-3 border-b border-zinc-200 font-bold text-sm tracking-wide uppercase flex justify-between items-center`}>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${col.color}`}></div>
                                        {col.title}
                                    </div>
                                    <span className="bg-white text-zinc-600 text-xs py-0.5 px-2 rounded-full font-bold">{colTasks.length}</span>
                                </div>
                                <div className="flex-1 p-3 overflow-y-auto space-y-3">
                                    {colTasks.map(t => (
                                        <div key={t.id} className="bg-white p-3 rounded-lg shadow-sm border border-zinc-200 hover:border-blue-300 transition-colors cursor-pointer group flex flex-col relative">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold
                                                    ${t.priority === 'Alta' ? 'bg-red-100 text-red-700' : t.priority === 'Média' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                                    {t.priority}
                                                </span>
                                                <span className="text-xs text-zinc-400 font-mono">{t.estimatedHours}h</span>
                                            </div>
                                            <h4 className="text-sm font-bold text-zinc-800 mb-2 leading-tight">{t.name}</h4>
                                            <div className="mt-auto flex justify-between items-center text-xs text-zinc-500">
                                                <div className="flex items-center gap-1"><Users size={12}/> {t.assignee}</div>
                                                <div className="flex items-center gap-1 text-[#003366] font-medium truncate max-w-[100px]">
                                                    {projects.find(p => p.id === t.projectId)?.name}
                                                </div>
                                            </div>
                                            
                                            {/* Hover Actions Layer */}
                                            <div className="absolute inset-x-0 bottom-0 top-0 bg-white/90 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                                                {col.status !== 'Pendente' && (
                                                    <button onClick={() => handleMoveTask(t.id, 'Pendente')} className="p-2 bg-zinc-100 rounded-full hover:bg-zinc-200 text-zinc-600" title="Mover para Pendente"><ChevronRight size={14} className="rotate-180"/></button>
                                                )}
                                                {col.status !== 'Em Progresso' && (
                                                    <button onClick={() => handleMoveTask(t.id, 'Em Progresso')} className="p-2 bg-blue-100 rounded-full hover:bg-blue-200 text-blue-700" title="Mover para Em Progresso"><Play size={14}/></button>
                                                )}
                                                {col.status !== 'Concluído' && (
                                                    <button onClick={() => handleMoveTask(t.id, 'Concluído')} className="p-2 bg-emerald-100 rounded-full hover:bg-emerald-200 text-emerald-700" title="Mover para Concluído"><CheckCircle size={14}/></button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {colTasks.length === 0 && (
                                        <div className="text-center py-6 text-zinc-400 text-sm border-2 border-dashed border-zinc-200 rounded-lg">Sem tarefas</div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // --- RENDER MAIN ---
    return (
        <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#003366]/5 rounded-bl-full pointer-events-none"></div>
                <div className="z-10 relative">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-[#003366] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#003366]/20">
                            <LayoutDashboard size={20} />
                        </div>
                        <h2 className="text-3xl font-black text-[#003366] tracking-tight uppercase">Gestão de Projetos</h2>
                    </div>
                    <p className="text-zinc-500 max-w-2xl text-sm">Visualize, planeie e execute todo o portfólio de projetos da empresa em tempo real. Controle orçamentos, monitorize tarefas diárias e coordene as equipas com máxima eficiência.</p>
                </div>
                {activeTab !== 'dashboard' && (
                    <div className="flex gap-2 shrink-0 z-10 relative">
                        <button onClick={() => setIsProjectModalOpen(true)} className="bg-[#003366] hover:bg-[#002244] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95">
                            <Plus size={16}/> NOVO PROJETO
                        </button>
                    </div>
                )}
            </div>
            
            {/* Navigation Tabs */}
            <div className="flex overflow-x-auto no-scrollbar gap-2 border-b border-zinc-200">
                {[
                    { id: 'dashboard', label: 'Monitorização', icon: <BarChart3 size={16}/> },
                    { id: 'projects', label: 'Projetos', icon: <Briefcase size={16}/> },
                    { id: 'kanban', label: 'Quadro Kanban', icon: <FileText size={16}/> },
                    { id: 'team', label: 'Equipa & Recursos', icon: <Users size={16}/> }
                ].map(tab => (
                    <button 
                        key={tab.id} 
                        onClick={() => setActiveTab(tab.id as any)} 
                        className={`flex items-center gap-2 px-5 py-3 text-sm font-bold tracking-wide transition-all uppercase whitespace-nowrap
                        ${activeTab === tab.id ? 'text-[#003366] border-b-2 border-[#003366] bg-white' : 'text-zinc-500 hover:bg-white hover:text-zinc-800 rounded-t-lg'}`}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Contents */}
            <div className="min-h-[500px]">
                {activeTab === 'dashboard' && renderDashboard()}
                {activeTab === 'projects' && renderProjectsList()}
                {activeTab === 'kanban' && renderKanban()}
                {activeTab === 'team' && (
                    <div className="bg-white border border-zinc-200 rounded-xl shadow-sm p-12 text-center flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500 h-[400px]">
                         <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4"><Users size={32}/></div>
                         <h3 className="text-xl font-bold text-zinc-800 mb-2">Gestão Detalhada de Recursos em Breve</h3>
                         <p className="text-zinc-500 max-w-md">Módulo de alocação de cargas horárias (Workload), gestão de calendários e análise de desempenho da equipa será ativado na próxima atualização de sistema.</p>
                    </div>
                )}
            </div>

            {/* Modal: New Project */}
            {isProjectModalOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-0 relative overflow-hidden flex flex-col h-[90vh] md:h-auto max-h-[90vh]">
                        <div className="shrink-0 p-6 border-b border-zinc-100 bg-zinc-50/80">
                            <h3 className="text-xl font-black text-[#003366] uppercase">Adicionar Novo Projeto</h3>
                        </div>
                        <form onSubmit={handleAddProject} className="p-6 overflow-y-auto flex-1 space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-zinc-500">Nome do Projeto</label>
                                <input name="name" required className="w-full p-2 border border-zinc-300 rounded-md outline-none focus:border-[#003366] focus:ring-1 focus:ring-[#003366]" placeholder="Ex: Implementação de ERP"/>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-zinc-500">Descrição</label>
                                <textarea name="description" required rows={3} className="w-full p-2 border border-zinc-300 rounded-md outline-none focus:border-[#003366] focus:ring-1 focus:ring-[#003366]"></textarea>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase text-zinc-500">Prazo Estimado</label>
                                    <input type="date" name="deadline" required className="w-full p-2 border border-zinc-300 rounded-md outline-none focus:border-[#003366] focus:ring-1 focus:ring-[#003366]"/>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase text-zinc-500">Orçamento (MZN)</label>
                                    <input type="number" name="budget" required min={0} className="w-full p-2 border border-zinc-300 rounded-md outline-none focus:border-[#003366] focus:ring-1 focus:ring-[#003366]"/>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-zinc-500">Gestor Responsável</label>
                                <select name="manager" required className="w-full p-2 border border-zinc-300 rounded-md outline-none focus:border-[#003366] focus:ring-1 focus:ring-[#003366]">
                                    {team.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                                </select>
                            </div>
                            <div className="pt-4 flex justify-end gap-3 mt-4 border-t border-zinc-100 pb-2">
                                <button type="button" onClick={() => setIsProjectModalOpen(false)} className="px-4 py-2 font-bold text-zinc-600 hover:bg-zinc-100 rounded-md">Cancelar</button>
                                <button type="submit" className="px-6 py-2 bg-[#003366] text-white font-bold rounded-md hover:bg-[#002244] shadow-md">Gravar Projeto</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectManagementModule;
