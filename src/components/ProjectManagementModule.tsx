import React, { useState } from 'react';
import { LayoutDashboard, FileText, Users, Settings, Plus, CheckCircle, Clock } from 'lucide-react';

const projects = [
  { id: 1, name: 'Renovação Escritório', status: 'Em Progresso', deadline: '2026-05-30', team: 'Equipa A' },
  { id: 2, name: 'Website Institucional', status: 'Planeamento', deadline: '2026-06-15', team: 'Equipa B' },
];

const tasks = [
  { id: 1, projectId: 1, name: 'Design Interior', status: 'Concluído' },
  { id: 2, projectId: 1, name: 'Compra Mobiliário', status: 'Pendente' },
];

const ProjectManagementModule = () => {
    const [activeTab, setActiveTab] = useState('overview');

    return (
        <div className="p-8 space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-[#003366] uppercase tracking-tight">Gestão de Projetos</h2>
                <button className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 text-sm font-bold"><Plus size={16}/> NOVO PROJETO</button>
            </div>
            
            <div className="flex gap-4 border-b border-zinc-200">
                {['overview', 'kanban', 'team'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 font-bold ${activeTab === tab ? 'text-blue-600 border-b-2 border-blue-600' : 'text-zinc-500'}`}>{tab.toUpperCase()}</button>
                ))}
            </div>

            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {projects.map(p => (
                        <div key={p.id} className="p-6 bg-white border shadow-sm rounded">
                            <h3 className="font-bold text-lg mb-2">{p.name}</h3>
                            <p className="text-sm text-zinc-500 mb-4">Prazo: {p.deadline} | Equipa: {p.team}</p>
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">{p.status}</span>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'kanban' && (
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-100 p-4 rounded">
                        <h4 className="font-bold mb-4 flex items-center gap-2"><Clock size={16}/> Pendente</h4>
                        {tasks.filter(t => t.status === 'Pendente').map(t => <div key={t.id} className="p-3 bg-white mb-2 rounded shadow">{t.name}</div>)}
                    </div>
                    <div className="bg-zinc-100 p-4 rounded">
                        <h4 className="font-bold mb-4 flex items-center gap-2"><CheckCircle size={16}/> Concluído</h4>
                        {tasks.filter(t => t.status === 'Concluído').map(t => <div key={t.id} className="p-3 bg-white mb-2 rounded shadow">{t.name}</div>)}
                    </div>
                </div>
            )}

            {activeTab === 'team' && (
                <div className="bg-white border shadow-sm rounded p-6">
                    <p className="text-zinc-500">Gestão de Equipas em desenvolvimento...</p>
                </div>
            )}
        </div>
    );
};

export default ProjectManagementModule;
