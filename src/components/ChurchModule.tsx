import React, { useState } from 'react';
import { 
  Users, Banknote, Calendar, Heart, PieChart, Plus, Download, Edit, Trash2, HeartHandshake, 
  BookOpen, Music, Activity, Target, Shield, MapPin, Search, BarChart3, TrendingUp 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';

type TabType = 'dashboard' | 'membros' | 'departamentos' | 'eventos' | 'tesouraria' | 'patrimonio' | 'missoes' | 'social';

export default function ChurchModule() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [missoes, setMissoes] = useState([
    { id: 1, pais: 'Angola (Zonas Rurais)', projeto: 'Água Vida', status: 'Ativo', investimento: 500000 },
    { id: 2, pais: 'Namíbia', projeto: 'Alfabetização', status: 'Planeado', investimento: 300000 },
  ]);

  const [social, setSocial] = useState([
    { id: 1, atividade: 'Sopa Solidária', beneficiarios: 150, data: '2026-04-12', local: 'Cazenga' },
    { id: 2, atividade: 'Doação de Roupas', beneficiarios: 80, data: '2026-04-15', local: 'Viana' },
  ]);
  const [members, setMembers] = useState([
    { id: 1, name: 'Armando Cossa', role: 'Pastor', phone: '923123456', status: 'Ativo', department: 'Liderança', dataNasc: '1980-05-12' },
    { id: 2, name: 'Lúcia Fernandes', role: 'Membro', phone: '912000111', status: 'Ativo', department: 'Coro', dataNasc: '1995-10-20' },
  ]);

  const [contributions, setContributions] = useState([
    { id: 1, type: 'Dízimo', amount: 50000, date: '2026-04-10', donor: 'Armando Cossa', status: 'Confirmado' },
    { id: 2, type: 'Oferta', amount: 15000, date: '2026-04-15', donor: 'Anónimo', status: 'Confirmado' },
  ]);

  const [departamentos, setDepartamentos] = useState([
    { id: 1, nome: 'Coro Principal', lider: 'Lúcia Fernandes', membrosCount: 25, reuniao: 'Sábados, 15h' },
    { id: 2, nome: 'Grupo de Jovens', lider: 'João Silva', membrosCount: 40, reuniao: 'Sextas, 18h' },
  ]);

  const [eventos, setEventos] = useState([
    { id: 1, titulo: 'Culto de Domingo', tipo: 'Culto', data: '2026-04-19', hora: '09:00', local: 'Santuário Principal', lotacao: 500 },
    { id: 2, titulo: 'Campanha de Libertação', tipo: 'Evento Especial', data: '2026-05-01', hora: '18:00', local: 'Santuário Principal', lotacao: 1000 },
  ]);

  const [patrimonio, setPatrimonio] = useState([
    { id: 1, nome: 'Mesa de Som Yamaha', categoria: 'Áudio', valor: 800000, estado: 'Bom', dataAquisicao: '2024-01-10' },
    { id: 2, nome: 'Cadeiras Plásticas (Cem)', categoria: 'Mobiliário', valor: 250000, estado: 'Regular', dataAquisicao: '2023-05-01' },
  ]);

  // Modals
  const [showForm, setShowForm] = useState<TabType | null>(null);

  // Form states
  const [memberForm, setMemberForm] = useState({ name: '', role: 'Membro', department: '', phone: '', dataNasc: '', status: 'Ativo' });
  const [contribForm, setContribForm] = useState({ type: 'Dízimo', amount: '', date: '', donor: '', status: 'Confirmado' });

  // Dash Data
  const dízimosMes = contributions.filter(c => c.type === 'Dízimo').reduce((a, b) => a + Number(b.amount), 0);
  const ofertasMes = contributions.filter(c => c.type !== 'Dízimo').reduce((a, b) => a + Number(b.amount), 0);
  
  const financeData = [
    { name: 'Dez', Dízimos: 150000, Ofertas: 50000 },
    { name: 'Jan', Dízimos: 180000, Ofertas: 60000 },
    { name: 'Fev', Dízimos: 200000, Ofertas: 40000 },
    { name: 'Mar', Dízimos: 170000, Ofertas: 55000 },
    { name: 'Abr', Dízimos: dízimosMes + 170000, Ofertas: ofertasMes + 45000 },
  ];

  const roleData = [
    { name: 'Pastores', value: 3 },
    { name: 'Diáconos', value: 12 },
    { name: 'Obreiros', value: 25 },
    { name: 'Membros', value: 450 },
  ];
  const COLORS = ['#003366', '#0284c7', '#38bdf8', '#bae6fd'];

  const bgModal = "fixed inset-0 z-[150] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm";

  return (
    <div className="space-y-6">
      {/* Header Geral */}
      <div className="bg-white p-6 border border-zinc-200 shadow-sm relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
          <img src="https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=800&auto=format&fit=crop" alt="Church" className="w-96 h-auto" />
        </div>
        <div className="relative z-10">
          <h2 className="text-2xl font-black text-[#003366] flex items-center gap-2">
            <BookOpen size={28} />
            Gestão de Igreja 
          </h2>
          <p className="text-zinc-500 text-sm mt-1 max-w-2xl">
            Administração completa do corpo governante, membros, departamentos, cultos e dízimos.
          </p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-zinc-200 overflow-x-auto pb-1 scrollbar-hide">
        {[
          { id: 'dashboard', label: 'Resumo Geral', icon: BarChart3 },
          { id: 'membros', label: 'Rol de Membros', icon: Users },
          { id: 'departamentos', label: 'Grupos & Departamentos', icon: Target },
          { id: 'eventos', label: 'Agenda & Cultos', icon: Calendar },
          { id: 'tesouraria', label: 'Dízimos & Tesouraria', icon: Banknote },
          { id: 'patrimonio', label: 'Ativos & Património', icon: Shield },
          { id: 'missoes', label: 'Missões & Expansão', icon: MapPin },
          { id: 'social', label: 'Ação Social', icon: Heart }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex items-center gap-2 pb-2 text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${activeTab === tab.id ? 'text-[#003366] border-b-2 border-[#003366]' : 'text-zinc-500 hover:text-zinc-800'}`}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
             <div className="bg-white p-6 border border-zinc-200 shadow-sm flex items-center gap-4">
               <div className="p-3 bg-blue-100 text-[#003366] rounded-md"><Users size={24} /></div>
               <div><p className="text-xs text-zinc-500 font-bold uppercase">Total Membros</p><h3 className="text-2xl font-black text-[#003366]">{members.length + 488}</h3></div>
             </div>
             <div className="bg-white p-6 border border-zinc-200 shadow-sm flex items-center gap-4">
               <div className="p-3 bg-emerald-100 text-emerald-800 rounded-md"><Banknote size={24} /></div>
               <div><p className="text-xs text-zinc-500 font-bold uppercase">Dízimos (Mês)</p><h3 className="text-xl font-black text-emerald-900">{new Intl.NumberFormat('pt-AO', {style: 'currency', currency:'AOA'}).format(dízimosMes+170000)}</h3></div>
             </div>
             <div className="bg-white p-6 border border-zinc-200 shadow-sm flex items-center gap-4">
               <div className="p-3 bg-purple-100 text-purple-800 rounded-md"><Target size={24} /></div>
               <div><p className="text-xs text-zinc-500 font-bold uppercase">Departamentos</p><h3 className="text-2xl font-black text-purple-900">{departamentos.length + 5}</h3></div>
             </div>
             <div className="bg-white p-6 border border-zinc-200 shadow-sm flex items-center gap-4">
               <div className="p-3 bg-amber-100 text-amber-800 rounded-md"><Calendar size={24} /></div>
               <div><p className="text-xs text-zinc-500 font-bold uppercase">Próximo Evento</p><h3 className="text-sm font-black text-amber-900">{eventos[0]?.titulo}</h3></div>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-zinc-200 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-zinc-800 uppercase mb-4">Fluxo Financeiro Mensal</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={financeData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                    <RechartsTooltip cursor={{fill: 'transparent'}} />
                    <Legend />
                    <Bar dataKey="Dízimos" fill="#003366" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Ofertas" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white border border-zinc-200 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-zinc-800 uppercase mb-4">Distribuição de Cargos Eclesiásticos</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie data={roleData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {roleData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <RechartsTooltip />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'membros' && (
        <div className="bg-white border border-zinc-200 shadow-sm">
          <div className="p-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50">
            <h3 className="font-bold text-zinc-800 uppercase tracking-wide">Rol de Membros</h3>
            <button onClick={() => setShowForm('membros')} className="bg-[#003366] hover:bg-[#002244] text-white px-4 py-2 text-xs font-bold uppercase flex items-center gap-2">
              <Plus size={16} /> Novo Membro
            </button>
          </div>
          <table className="w-full text-left">
            <thead className="bg-[#003366] text-white text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Nome do Membro</th>
                <th className="px-4 py-3">Cargo Espiritual</th>
                <th className="px-4 py-3">Departamento Principal</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {members.map(m => (
                <tr key={m.id} className="hover:bg-zinc-50 text-sm">
                  <td className="px-4 py-3 font-bold text-zinc-800">{m.name}</td>
                  <td className="px-4 py-3 text-zinc-600">{m.role}</td>
                  <td className="px-4 py-3 text-zinc-600">{m.department}</td>
                  <td className="px-4 py-3 text-zinc-500 font-mono">{m.phone}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-[10px] uppercase font-bold rounded-sm">{m.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'departamentos' && (
        <div className="bg-white border border-zinc-200 shadow-sm">
          <div className="p-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50">
            <h3 className="font-bold text-zinc-800 uppercase tracking-wide">Departamentos e Grupos Locais</h3>
            <button className="bg-[#003366] hover:bg-[#002244] text-white px-4 py-2 text-xs font-bold uppercase flex items-center gap-2">
              <Plus size={16} /> Criar Grupo
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
             {departamentos.map(d => (
               <div key={d.id} className="border border-zinc-200 p-4 shadow-sm hover:border-[#003366] transition-colors relative">
                 <div className="absolute top-4 right-4 text-[#003366]/20"><Users size={32}/></div>
                 <h4 className="font-bold text-[#003366] text-lg">{d.nome}</h4>
                 <p className="text-zinc-500 text-xs mt-1">Líder: <strong className="text-zinc-800">{d.lider}</strong></p>
                 <div className="mt-4 pt-4 border-t border-zinc-100 flex justify-between text-xs text-zinc-500">
                   <span>{d.membrosCount} Membros Inscritos</span>
                   <span>⏱ {d.reuniao}</span>
                 </div>
               </div>
             ))}
          </div>
        </div>
      )}

      {activeTab === 'tesouraria' && (
        <div className="bg-white border border-zinc-200 shadow-sm">
          <div className="p-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50">
            <h3 className="font-bold text-zinc-800 uppercase tracking-wide">Registos Financeiros</h3>
            <button onClick={() => setShowForm('tesouraria')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-bold uppercase flex items-center gap-2">
              <Plus size={16} /> Lançar Entrada
            </button>
          </div>
          <table className="w-full text-left">
            <thead className="bg-[#003366] text-white text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Contribuinte / Doador</th>
                <th className="px-4 py-3 text-right">Valor AOA</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {contributions.map(c => (
                <tr key={c.id} className="hover:bg-zinc-50 text-sm">
                  <td className="px-4 py-3 text-zinc-500">{c.date}</td>
                  <td className="px-4 py-3 font-bold text-zinc-800">{c.type}</td>
                  <td className="px-4 py-3 text-zinc-600">{c.donor}</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-700">{new Intl.NumberFormat('pt-AO').format(c.amount)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-[10px] uppercase font-bold rounded-sm">{c.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(activeTab === 'eventos' || activeTab === 'patrimonio') && (
        <div className="bg-white border border-zinc-200 p-8 text-center mt-6">
           <div className="mx-auto w-16 h-16 bg-[#003366] text-white flex items-center justify-center rounded-full mb-4 hover:scale-105 transition-transform">
             {activeTab === 'eventos' ? <Calendar size={32} /> : <Shield size={32} />}
           </div>
           <h3 className="font-bold text-[#003366] text-lg uppercase tracking-wide">Área Restrita ({activeTab})</h3>
           <p className="text-zinc-500 text-sm mt-2 max-w-md mx-auto">Esta secção está funcional. Pode gerir diretamente da central mediante a atualização de perfis.</p>
           {activeTab === 'eventos' && (
             <div className="mt-8 text-left max-w-2xl mx-auto space-y-4">
               {eventos.map(ev => (
                 <div key={ev.id} className="p-4 border border-zinc-200 flex justify-between items-center shadow-sm">
                   <div><h4 className="font-bold text-zinc-800">{ev.titulo}</h4><p className="text-xs text-zinc-500">{ev.tipo} • {ev.local}</p></div>
                   <div className="text-right"><p className="font-bold text-[#003366]">{ev.data}</p><p className="text-xs text-zinc-500">{ev.hora}</p></div>
                 </div>
               ))}
             </div>
           )}
           {activeTab === 'patrimonio' && (
             <div className="mt-8 text-left max-w-2xl mx-auto space-y-4">
               {patrimonio.map(p => (
                 <div key={p.id} className="p-4 border border-zinc-200 flex justify-between items-center shadow-sm">
                   <div><h4 className="font-bold text-zinc-800">{p.nome}</h4><p className="text-xs text-zinc-500">{p.categoria} • Aquisição: {p.dataAquisicao}</p></div>
                   <div className="text-right"><p className="font-bold text-[#003366]">{new Intl.NumberFormat('pt-AO').format(p.valor)} AOA</p><p className="text-xs text-zinc-500 uppercase">{p.estado}</p></div>
                 </div>
               ))}
             </div>
           )}
        </div>
      )}

      {activeTab === 'missoes' && (
        <div className="bg-white border border-zinc-200 shadow-sm">
          <div className="p-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50">
            <h3 className="font-bold text-zinc-800 uppercase tracking-wide">Frentes Missionárias & Expansão</h3>
            <button className="bg-[#003366] text-white px-4 py-2 text-xs font-bold uppercase flex items-center gap-2">
              <Plus size={16} /> Novo Campo
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
            {missoes.map(m => (
              <div key={m.id} className="p-4 border border-zinc-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5"><MapPin size={80} /></div>
                <h4 className="font-black text-indigo-900 text-lg">{m.projeto}</h4>
                <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest">{m.pais}</p>
                <div className="mt-4 flex justify-between items-end">
                  <div>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase">Investimento Acumulado</p>
                    <p className="font-bold text-emerald-700">{new Intl.NumberFormat('pt-AO', {style:'currency', currency:'AOA'}).format(m.investimento)}</p>
                  </div>
                  <span className={`px-2 py-1 text-[10px] uppercase font-bold rounded-sm ${m.status === 'Ativo' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>{m.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'social' && (
        <div className="bg-white border border-zinc-200 shadow-sm">
          <div className="p-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50">
            <h3 className="font-bold text-zinc-800 uppercase tracking-wide">Ação Social & Comunidade</h3>
            <button className="bg-rose-600 text-white px-4 py-2 text-xs font-bold uppercase flex items-center gap-2 hover:bg-rose-700">
              <Plus size={16} /> Registar Atividade
            </button>
          </div>
          <table className="w-full text-left">
            <thead className="bg-[#003366] text-white text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Atividade / Projeto</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Local / Bairro</th>
                <th className="px-4 py-3 text-right">Beneficiários</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {social.map(s => (
                <tr key={s.id} className="hover:bg-zinc-50 text-sm">
                  <td className="px-4 py-3 font-bold text-zinc-800">{s.atividade}</td>
                  <td className="px-4 py-3 text-zinc-600">{s.data}</td>
                  <td className="px-4 py-3 text-zinc-600">{s.local}</td>
                  <td className="px-4 py-3 text-right font-black text-rose-700">{s.beneficiarios} pessoas</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODALS */}
      <AnimatePresence>
        {showForm === 'membros' && (
          <div className={bgModal}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="bg-white max-w-lg w-full">
              <div className="bg-[#003366] text-white p-4 font-bold uppercase tracking-wider text-sm flex justify-between">
                <span>Registar Novo Membro</span>
                <button onClick={() => setShowForm(null)} className="text-white/70 hover:text-white">✕</button>
              </div>
              <form onSubmit={e => { e.preventDefault(); setMembers([...members, {...memberForm, id: Date.now()}]); setShowForm(null); }} className="p-6 space-y-4">
                <div><label className="text-xs font-bold text-zinc-500 uppercase">Nome Completo</label><input required value={memberForm.name} onChange={e=>setMemberForm({...memberForm, name: e.target.value})} className="w-full bg-zinc-50 border border-zinc-300 p-2 mt-1" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase">Cargo / Função</label>
                    <select required value={memberForm.role} onChange={e=>setMemberForm({...memberForm, role: e.target.value})} className="w-full bg-zinc-50 border border-zinc-300 p-2 mt-1">
                      <option>Membro</option><option>Obreiro</option><option>Diácono</option><option>Pastor</option>
                    </select>
                  </div>
                  <div><label className="text-xs font-bold text-zinc-500 uppercase">Departamento</label><input value={memberForm.department} onChange={e=>setMemberForm({...memberForm, department: e.target.value})} className="w-full bg-zinc-50 border border-zinc-300 p-2 mt-1" /></div>
                  <div><label className="text-xs font-bold text-zinc-500 uppercase">Telefone</label><input required value={memberForm.phone} onChange={e=>setMemberForm({...memberForm, phone: e.target.value})} className="w-full bg-zinc-50 border border-zinc-300 p-2 mt-1" /></div>
                  <div><label className="text-xs font-bold text-zinc-500 uppercase">Data Nasc.</label><input required type="date" value={memberForm.dataNasc} onChange={e=>setMemberForm({...memberForm, dataNasc: e.target.value})} className="w-full bg-zinc-50 border border-zinc-300 p-2 mt-1" /></div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <button type="button" onClick={() => setShowForm(null)} className="px-4 py-2 bg-zinc-200 text-xs font-bold uppercase">Cancelar</button>
                  <button type="submit" className="px-4 py-2 bg-[#003366] text-white text-xs font-bold uppercase">Registar</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showForm === 'tesouraria' && (
          <div className={bgModal}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="bg-white max-w-lg w-full">
             <div className="bg-emerald-700 text-white p-4 font-bold uppercase tracking-wider text-sm flex justify-between">
                <span>Lançar Dízimo / Oferta</span>
                <button onClick={() => setShowForm(null)} className="text-white/70 hover:text-white">✕</button>
              </div>
              <form onSubmit={e => { e.preventDefault(); setContributions([...contributions, {...contribForm, id: Date.now()}]); setShowForm(null); }} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase">Tipo de Entrada</label>
                    <select required value={contribForm.type} onChange={e=>setContribForm({...contribForm, type: e.target.value})} className="w-full bg-zinc-50 border border-zinc-300 p-2 mt-1">
                      <option>Dízimo</option><option>Oferta de Culto</option><option>Oferta Alçada</option><option>Voto / Primícia</option>
                    </select>
                  </div>
                  <div><label className="text-xs font-bold text-zinc-500 uppercase">Valor (AOA)</label><input required type="number" value={contribForm.amount} onChange={e=>setContribForm({...contribForm, amount: e.target.value})} className="w-full bg-zinc-50 border border-zinc-300 p-2 mt-1" /></div>
                  <div><label className="text-xs font-bold text-zinc-500 uppercase">Data</label><input required type="date" value={contribForm.date} onChange={e=>setContribForm({...contribForm, date: e.target.value})} className="w-full bg-zinc-50 border border-zinc-300 p-2 mt-1" /></div>
                  <div className="col-span-2"><label className="text-xs font-bold text-zinc-500 uppercase">Nome do Contribuinte (Deixe vazio p/ Anónimo)</label><input value={contribForm.donor} onChange={e=>setContribForm({...contribForm, donor: e.target.value})} placeholder="Opcional" className="w-full bg-zinc-50 border border-zinc-300 p-2 mt-1" /></div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <button type="button" onClick={() => setShowForm(null)} className="px-4 py-2 bg-zinc-200 text-xs font-bold uppercase">Cancelar</button>
                  <button type="submit" className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold uppercase">Gravar Entrada</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
