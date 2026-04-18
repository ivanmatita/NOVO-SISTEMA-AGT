import React, { useState } from 'react';
import { 
  Shield, 
  Users, 
  MapPin, 
  Calendar, 
  Briefcase, 
  AlertTriangle, 
  FileText, 
  TrendingUp,
  Plus,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  Lock,
  Zap,
  MoreVertical,
  Printer,
  Download,
  Truck
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { motion } from 'motion/react';

interface SecurityModuleProps {
  occurrences: any[];
  armory: any[];
  roster: any[];
  employees: any[];
  workSites: any[];
  onRefresh: () => void;
}

const SecurityModule: React.FC<SecurityModuleProps> = ({ occurrences, armory, roster, employees, workSites, onRefresh }) => {
  const [activeTab, setActiveTab] = useState('guards');
  const [showOccurrenceForm, setShowOccurrenceForm] = useState(false);
  
  const stats = [
    { label: 'Efetivo Total', value: String(employees.length), icon: Users, color: 'text-blue-600' },
    { label: 'Postos Ativos', value: String(workSites.length), icon: MapPin, color: 'text-emerald-600' },
    { label: 'Ocorrências (Mês)', value: String(occurrences.length), icon: AlertTriangle, color: 'text-amber-600' },
    { label: 'Escalas Pendentes', value: String(roster.length), icon: Calendar, color: 'text-red-600' },
  ];

  const chartData = [
    { name: 'Jan', postos: 28, efetivo: 410 },
    { name: 'Fev', postos: 30, efetivo: 435 },
    { name: 'Mar', postos: 32, efetivo: 450 },
  ];

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-black text-[#003366] flex items-center gap-3">
            <Shield size={28} />
            Gestão de Segurança Privada
          </h2>
          <p className="text-zinc-500 text-sm">Controlo operacional, pessoal de segurança e armaria.</p>
        </div>
        <div className="flex gap-2">
          <button className="bg-zinc-100 text-zinc-600 px-4 py-2 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
            <Printer size={16} /> Relatórios Ope.
          </button>
          <button 
            onClick={() => setShowOccurrenceForm(true)}
            className="bg-[#003366] text-white px-4 py-2 text-xs font-bold uppercase tracking-widest flex items-center gap-2"
          >
            <Plus size={16} /> Nova Ocorrência
          </button>
        </div>
      </header>

      {showOccurrenceForm && (
        <OccurrenceForm 
          employees={employees} 
          workSites={workSites} 
          onClose={() => setShowOccurrenceForm(false)} 
          onSuccess={() => {
            setShowOccurrenceForm(false);
            onRefresh();
          }}
        />
      )}

      {/* Tabs Navigation */}
      <div className="flex border-b border-zinc-200 overflow-x-auto no-scrollbar">
        {[
          { id: 'guards', label: 'Vigilantes / Efetivo', icon: Users },
          { id: 'sites', label: 'Postos / Clientes', icon: MapPin },
          { id: 'roster', label: 'Escalas de Serviço', icon: Calendar },
          { id: 'armory', label: 'Armaria & Meios', icon: Lock },
          { id: 'patrol', label: 'Patrulha & Viaturas', icon: Shield },
          { id: 'incidents', label: 'Ocorrências', icon: AlertTriangle },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all border-b-2 ${
              activeTab === tab.id 
                ? 'border-[#003366] text-[#003366] bg-blue-50/30' 
                : 'border-transparent text-zinc-400 hover:text-zinc-600'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="bg-white border border-zinc-200 p-5 rounded-none shadow-sm flex items-center gap-4">
            <div className={`p-3 bg-zinc-50 rounded-none ${s.color}`}>
              <s.icon size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter">{s.label}</p>
              <p className="text-xl font-bold text-zinc-800">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'guards' && <GuardsSection employees={employees} />}
          {activeTab === 'sites' && <SitesSection sites={workSites} />}
          {activeTab === 'roster' && <RosterSection roster={roster} />}
          {activeTab === 'armory' && <ArmorySection armory={armory} employees={employees} onRefresh={onRefresh} />}
          {activeTab === 'patrol' && <PatrolSection />}
          {activeTab === 'incidents' && <IncidentsSection occurrences={occurrences} />}
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-zinc-200 p-6 shadow-sm">
            <h3 className="text-sm font-black text-[#003366] uppercase tracking-widest mb-6 flex items-center gap-2">
              <TrendingUp size={18} /> Crescimento Operacional
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="postos" fill="#003366" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-[#003366] p-6 text-white overflow-hidden relative">
            <Zap className="absolute -bottom-4 -right-4 text-white/5" size={120} />
            <h3 className="text-sm font-black uppercase tracking-widest mb-4">Estado de Alerta</h3>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-4 h-4 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.5)]"></div>
              <p className="text-sm font-medium">Operações em normalidade</p>
            </div>
            <p className="text-xs text-white/70 leading-relaxed mb-6">
              Todos os postos críticos estão guarnecidos. Última ronda geral concluída há 12 minutos.
            </p>
            <button className="w-full bg-white text-[#003366] py-3 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-100 transition-colors">
              Emitir Alerta Geral
            </button>
          </div>

          <div className="bg-white border border-zinc-200 p-6 shadow-sm">
            <h3 className="text-sm font-black text-zinc-800 uppercase tracking-widest mb-4 flex items-center gap-2">
              <FileText size={18} className="text-blue-600" /> Relatórios Recentes
            </h3>
            <div className="space-y-3">
              {['Vigilância Noturna - Talatona', 'Relatório Mensal Armaria', 'Folha de Escalas - Abril'].map((r, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-zinc-50 hover:bg-zinc-100 transition-colors cursor-pointer group">
                  <span className="text-xs font-medium text-zinc-600 group-hover:text-[#003366]">{r}</span>
                  <Download size={14} className="text-zinc-400" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const OccurrenceForm = ({ employees, workSites, onClose, onSuccess }: { employees: any[], workSites: any[], onClose: () => void, onSuccess: () => void }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    site_id: '',
    guard_id: '',
    severity: 'Média',
    status: 'pending'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/security/occurrences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, company_id: workSites[0]?.company_id })
      });
      if (res.ok) {
        onSuccess();
      }
    } catch (e) { console.error(e); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-lg p-8 shadow-2xl space-y-6"
      >
        <h3 className="text-xl font-black text-[#003366] uppercase tracking-widest">Nova Ocorrência</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Título</label>
            <input 
              required
              className="w-full bg-zinc-50 border border-zinc-200 p-3 text-sm focus:outline-none focus:border-[#003366]"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Posto</label>
              <select 
                required
                className="w-full bg-zinc-50 border border-zinc-200 p-3 text-sm focus:outline-none focus:border-[#003366]"
                value={formData.site_id}
                onChange={e => setFormData({...formData, site_id: e.target.value})}
              >
                <option value="">Selecionar Posto</option>
                {workSites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Vigilante</label>
              <select 
                required
                className="w-full bg-zinc-50 border border-zinc-200 p-3 text-sm focus:outline-none focus:border-[#003366]"
                value={formData.guard_id}
                onChange={e => setFormData({...formData, guard_id: e.target.value})}
              >
                <option value="">Selecionar Vigilante</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Descrição</label>
            <textarea 
              required
              rows={4}
              className="w-full bg-zinc-50 border border-zinc-200 p-3 text-sm focus:outline-none focus:border-[#003366]"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>
          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={onClose} className="px-6 py-2 text-xs font-black uppercase text-zinc-400 tracking-widest">Cancelar</button>
            <button type="submit" className="bg-[#003366] text-white px-8 py-2 text-xs font-black uppercase tracking-widest shadow-lg">Registar Ocorrência</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const GuardsSection = ({ employees }: { employees: any[] }) => (
  <div className="bg-white border border-zinc-200 shadow-sm rounded-none overflow-hidden">
    <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
        <input type="text" placeholder="Pesquisar efetivo..." className="w-full pl-10 pr-4 py-2 text-xs border border-zinc-200 focus:outline-none focus:border-[#003366]" />
      </div>
      <div className="flex gap-2">
        <button className="p-2 border border-zinc-200 text-zinc-400 hover:text-zinc-600"><Filter size={16} /></button>
        <button className="bg-[#003366] text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
          <Plus size={14} /> Contratação
        </button>
      </div>
    </div>
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="bg-zinc-50 text-[10px] uppercase font-black text-zinc-500 tracking-wider">
          <th className="px-6 py-4">Nome / Matrícula</th>
          <th className="px-6 py-4">Categoria</th>
          <th className="px-6 py-4">Departamento</th>
          <th className="px-6 py-4">Estado</th>
          <th className="px-6 py-4 text-right">Ação</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-100 text-xs">
        {employees.length > 0 ? employees.map((g, i) => (
          <tr key={i} className="hover:bg-zinc-50 transition-colors">
            <td className="px-6 py-4">
              <p className="font-bold text-zinc-800">{g.name}</p>
              <p className="text-[10px] text-zinc-400 font-mono italic">{g.nif || 'SGP-' + g.id}</p>
            </td>
            <td className="px-6 py-4 text-zinc-600">{g.role}</td>
            <td className="px-6 py-4 text-zinc-600 font-medium">{g.department || 'Operacional'}</td>
            <td className="px-6 py-4">
              <span className={`px-2 py-0.5 rounded-full font-black text-[9px] uppercase bg-zinc-100 ${g.status === 'active' ? 'text-emerald-600' : 'text-zinc-400'}`}>
                {g.status === 'active' ? 'Ativo' : 'Inativo'}
              </span>
            </td>
            <td className="px-6 py-4 text-right">
              <button className="text-zinc-400 hover:text-zinc-600"><MoreVertical size={16} /></button>
            </td>
          </tr>
        )) : (
          <tr>
            <td colSpan={5} className="px-6 py-12 text-center text-zinc-400 italic">Nenhum vigilante encontrado.</td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

const SitesSection = ({ sites }: { sites: any[] }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {sites.length > 0 ? sites.map((s, i) => (
      <div key={i} className="bg-white border border-zinc-200 p-6 flex flex-col justify-between group hover:border-[#003366] transition-colors">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h4 className="font-black text-zinc-800 uppercase tracking-tight">{s.name}</h4>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Localização: {s.location}</p>
          </div>
          <div className={`px-2 py-1 text-[9px] font-black uppercase bg-emerald-50 text-emerald-600`}>
            Ativo
          </div>
        </div>
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-zinc-400" />
            <span className="font-bold">Efetivo Alocado</span>
          </div>
          <button className="text-[#003366] text-[10px] font-black uppercase tracking-widest hover:underline">Detalhes</button>
        </div>
      </div>
    )) : (
      <div className="col-span-2 py-12 text-center text-zinc-400 italic bg-white border border-dashed border-zinc-200">
        Nenhum posto registado.
      </div>
    )}
  </div>
);

const RosterSection = ({ roster }: { roster: any[] }) => (
  <div className="bg-white border border-zinc-200 p-8 flex flex-col items-center justify-center min-h-[400px] space-y-4">
    <Calendar size={64} className="text-zinc-100" />
    <h3 className="font-black text-zinc-300 uppercase tracking-[0.2em] text-xl">Mapa de Escalas</h3>
    <p className="text-zinc-400 text-xs italic">{roster.length} escalas registadas no sistema.</p>
    <button className="bg-[#003366] text-white px-6 py-2 text-xs font-bold uppercase tracking-widest">Gerar Escala Mensal</button>
  </div>
);

const ArmorySection = ({ armory, employees, onRefresh }: { armory: any[], employees: any[], onRefresh: () => void }) => {
  const [markingAction, setMarkingAction] = useState<any>(null);

  const handleAction = async (itemId: string, employeeId: string, action: 'IN' | 'OUT') => {
    try {
      const res = await fetch('/api/security/armory-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: itemId,
          employee_id: employeeId,
          action,
          condition: 'Bom',
          company_id: armory[0]?.company_id
        })
      });
      if (res.ok) {
        setMarkingAction(null);
        onRefresh();
      }
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Armas de Fogo', count: armory.filter(i => i.type === 'FIREARM').length, unit: 'un' },
          { label: 'Disponíveis', count: armory.filter(i => i.status === 'disponivel').length, unit: 'un' },
          { label: 'Radios HT', count: armory.filter(i => i.type === 'RADIO').length, unit: 'un' },
          { label: 'Coletes', count: armory.filter(i => i.type === 'VEST').length, unit: 'un' },
        ].map((a, i) => (
          <div key={i} className="bg-zinc-50 border border-zinc-200 p-4">
            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">{a.label}</p>
            <p className="text-xl font-black text-zinc-800">{a.count} <span className="text-[10px] font-medium text-zinc-400">{a.unit}</span></p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-zinc-200 shadow-sm p-6 overflow-hidden">
        <h4 className="text-xs font-black text-zinc-800 uppercase tracking-widest mb-4">Inventário de Armaria</h4>
        <div className="space-y-2">
          {armory.map((item, j) => (
            <div key={j} className="flex justify-between items-center text-[10px] p-3 bg-zinc-50 border border-zinc-100">
              <div>
                <span className="font-mono text-[#003366] font-bold">{item.model}</span>
                <p className="text-zinc-400">S/N: {item.serial_number}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className={`px-1.5 py-0.5 font-black uppercase text-[8px] ${item.status === 'disponivel' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                  {item.status}
                </span>
                <button 
                  onClick={() => setMarkingAction(item)}
                  className="bg-[#003366] text-white px-3 py-1 text-[8px] font-black uppercase tracking-widest"
                >
                  Registar Movimento
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {markingAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white p-6 w-full max-w-sm">
            <h4 className="font-black text-sm uppercase mb-4">Movimento: {markingAction.model}</h4>
            <div className="space-y-4">
              <select className="w-full border p-2 text-xs" id="emp-select">
                <option value="">Selecionar Funcionário</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    const empId = (document.getElementById('emp-select') as HTMLSelectElement).value;
                    if(empId) handleAction(markingAction.id, empId, 'OUT');
                  }}
                  className="flex-1 bg-red-600 text-white py-2 text-[10px] font-black uppercase"
                >
                  Levantamento (OUT)
                </button>
                <button 
                  onClick={() => {
                    const empId = (document.getElementById('emp-select') as HTMLSelectElement).value;
                    if(empId) handleAction(markingAction.id, empId, 'IN');
                  }}
                  className="flex-1 bg-emerald-600 text-white py-2 text-[10px] font-black uppercase"
                >
                  Devolução (IN)
                </button>
              </div>
              <button onClick={() => setMarkingAction(null)} className="w-full text-center text-xs text-zinc-400 mt-2">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PatrolSection = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[
        { plate: 'LD-45-21-GP', model: 'Toyota Hilux 4x4', zone: 'Talatona/Camama', fuel: '85%', status: 'Em Patrulha' },
        { plate: 'LD-12-88-GP', model: 'Mitsubishi L200', zone: 'Viana/Cacuaco', fuel: '32%', status: 'Abastecimento' },
        { plate: 'LD-90-11-GP', model: 'Toyota Land Cruiser', zone: 'Baixa/Ilha', fuel: '95%', status: 'Pronta' },
      ].map((v, i) => (
        <div key={i} className="bg-white border border-zinc-200 p-5 flex items-center gap-4">
          <div className="p-3 bg-zinc-100 text-zinc-400">
            <Truck size={24} />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <h4 className="font-mono font-bold text-[#003366]">{v.plate}</h4>
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 ${
                v.status === 'Em Patrulha' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
              }`}>{v.status}</span>
            </div>
            <p className="text-xs text-zinc-500 font-medium">{v.model} - {v.zone}</p>
            <div className="mt-2 w-full bg-zinc-100 h-1.5 overflow-hidden">
              <div className="bg-emerald-500 h-full" style={{ width: v.fuel }}></div>
            </div>
          </div>
        </div>
      ))}
    </div>
    <div className="bg-[#003366] p-6 text-white">
      <h3 className="text-xs font-black uppercase tracking-widest mb-4">Relatório de Rota em Tempo Real</h3>
      <div className="space-y-3">
        {[
          { time: '10:45', event: 'Viatura LD-45-21-GP entrou no perímetro do Banco BNA.' },
          { time: '10:32', event: 'Viatura LD-90-11-GP reportou paragem para descanso na Ilha.' },
          { time: '10:15', event: 'Início de patrulha reforçada no setor de Viana.' },
        ].map((log, i) => (
          <div key={i} className="flex gap-4 text-[11px] border-l border-white/20 pl-4 py-1">
            <span className="font-bold text-white/50">{log.time}</span>
            <span className="text-white/80">{log.event}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const IncidentsSection = ({ occurrences }: { occurrences: any[] }) => (
  <div className="bg-white border border-zinc-200 shadow-sm rounded-none overflow-hidden">
    <div className="p-4 border-b border-zinc-100 bg-zinc-50/50">
      <h3 className="text-xs font-black text-zinc-800 uppercase tracking-widest">Diário de Ocorrências</h3>
    </div>
    <div className="p-6 space-y-6">
      {occurrences && occurrences.length > 0 ? occurrences.map((inc, i) => (
        <div key={i} className="border-l-4 border-[#003366] pl-4 space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <h5 className="font-black text-zinc-800 uppercase text-sm">{inc.title}</h5>
              <div className="flex gap-4 text-[10px] text-zinc-400 font-bold uppercase mt-1">
                <span className="flex items-center gap-1"><MapPin size={10} /> Posto ID: {inc.site_id}</span>
                <span className="flex items-center gap-1"><Clock size={10} /> {new Date(inc.date).toLocaleString()}</span>
              </div>
            </div>
            <span className={`px-2 py-0.5 text-[9px] font-black uppercase ${
              inc.severity === 'Alta' ? 'bg-red-600 text-white' : 'bg-amber-100 text-amber-600'
            }`}>Severidade {inc.severity}</span>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed italic">{inc.description}</p>
        </div>
      )) : (
        <div className="py-12 text-center text-zinc-400 italic">Nenhuma ocorrência registada.</div>
      )}
    </div>
  </div>
);

export default SecurityModule;
