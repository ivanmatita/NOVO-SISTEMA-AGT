import React, { useState } from 'react';
import { Users, Banknote, Calendar, Heart, PieChart, Plus, Download, Edit, Trash2, HeartHandshake, BookOpen } from 'lucide-react';
import { motion } from 'motion/react';

export default function ChurchModule() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [members, setMembers] = useState<any[]>([]);
  const [contributions, setContributions] = useState<any[]>([]);
  
  // Modals
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showContributionModal, setShowContributionModal] = useState(false);

  // Form States
  const [memberForm, setMemberForm] = useState({ name: '', phone: '', email: '', role: 'Membro', birthDate: '' });
  const [contributionForm, setContributionForm] = useState({ memberId: '', type: 'Dízimo', amount: '', date: '', notes: '' });

  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    setMembers([...members, { ...memberForm, id: Date.now() }]);
    setShowMemberModal(false);
    setMemberForm({ name: '', phone: '', email: '', role: 'Membro', birthDate: '' });
  };

  const handleSaveContribution = (e: React.FormEvent) => {
    e.preventDefault();
    setContributions([...contributions, { ...contributionForm, amount: Number(contributionForm.amount), id: Date.now() }]);
    setShowContributionModal(false);
    setContributionForm({ memberId: '', type: 'Dízimo', amount: '', date: '', notes: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-none shadow-sm border border-zinc-200">
        <div>
          <h2 className="text-2xl font-bold text-[#003366]">Gestão de Igreja</h2>
          <p className="text-zinc-500 text-sm">Administração completa de membros, dízimos e ofertas.</p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-zinc-200">
        {['dashboard', 'membros', 'financeiro', 'relatorios'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 text-sm font-bold uppercase tracking-wider ${activeTab === tab ? 'text-[#003366] border-b-2 border-[#003366]' : 'text-zinc-500 hover:text-zinc-800'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 border border-zinc-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-[#003366] font-bold"><Users size={24} /></div>
            <div><p className="text-sm text-zinc-500 font-bold uppercase">Total Membros</p><h3 className="text-2xl font-black text-[#003366]">{members.length}</h3></div>
          </div>
          <div className="bg-white p-6 border border-zinc-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-100 text-emerald-700 font-bold"><Banknote size={24} /></div>
            <div>
              <p className="text-sm text-zinc-500 font-bold uppercase">Entradas (Mês)</p>
              <h3 className="text-2xl font-black text-emerald-600">
                {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(contributions.reduce((acc, c) => acc + c.amount, 0))}
              </h3>
            </div>
          </div>
          <div className="bg-white p-6 border border-zinc-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-purple-100 text-purple-700 font-bold"><HeartHandshake size={24} /></div>
            <div><p className="text-sm text-zinc-500 font-bold uppercase">Destaque</p><h3 className="text-2xl font-black text-purple-700">Cultos Ativos</h3></div>
          </div>
        </div>
      )}

      {activeTab === 'membros' && (
        <div className="bg-white border border-zinc-200 shadow-sm">
          <div className="p-4 border-b border-zinc-100 flex justify-between items-center">
            <h3 className="font-bold text-[#003366]">Lista de Membros</h3>
            <button onClick={() => setShowMemberModal(true)} className="bg-[#003366] text-white px-4 py-2 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
              <Plus size={16} /> Novo Membro
            </button>
          </div>
          <table className="w-full text-left">
            <thead className="bg-[#003366] text-white text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Cargo/Função</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3">Data de Nasc.</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? <tr><td colSpan={4} className="p-8 text-center text-zinc-400">Nenhum membro registado.</td></tr> : members.map(m => (
                <tr key={m.id} className="border-b border-zinc-100 text-sm">
                  <td className="px-4 py-3 font-bold">{m.name}</td>
                  <td className="px-4 py-3 text-zinc-600">{m.role}</td>
                  <td className="px-4 py-3 text-zinc-600">{m.phone}</td>
                  <td className="px-4 py-3 text-zinc-600">{m.birthDate || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'financeiro' && (
        <div className="bg-white border border-zinc-200 shadow-sm">
          <div className="p-4 border-b border-zinc-100 flex justify-between items-center">
            <h3 className="font-bold text-[#003366]">Dízimos e Ofertas</h3>
            <button onClick={() => setShowContributionModal(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
              <Plus size={16} /> Registar Entrada
            </button>
          </div>
          <table className="w-full text-left">
            <thead className="bg-[#003366] text-white text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Membro (Opcional)</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3 text-right">Valor (AOA)</th>
              </tr>
            </thead>
            <tbody>
              {contributions.length === 0 ? <tr><td colSpan={4} className="p-8 text-center text-zinc-400">Nenhuma contribuição registada.</td></tr> : contributions.map(c => (
                <tr key={c.id} className="border-b border-zinc-100 text-sm">
                  <td className="px-4 py-3 text-zinc-600">{c.date}</td>
                  <td className="px-4 py-3 font-bold">{members.find(m => m.id.toString() === c.memberId)?.name || 'Anónimo'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-white ${c.type === 'Dízimo' ? 'bg-blue-600' : 'bg-emerald-500'}`}>
                      {c.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">{new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(c.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Member Modal */}
      {showMemberModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white max-w-lg w-full p-8 rounded-none shadow-2xl">
            <h3 className="font-bold text-[#003366] text-xl mb-4 uppercase tracking-tighter">Registar Membro</h3>
            <form onSubmit={handleSaveMember} className="space-y-4">
              <div><label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Nome Completo</label><input required type="text" value={memberForm.name} onChange={e => setMemberForm({...memberForm, name: e.target.value})} className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2 focus:border-[#003366] focus:outline-none" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Telemóvel</label><input type="text" value={memberForm.phone} onChange={e => setMemberForm({...memberForm, phone: e.target.value})} className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2 focus:border-[#003366] focus:outline-none" /></div>
                <div><label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Data Nasc.</label><input type="date" value={memberForm.birthDate} onChange={e => setMemberForm({...memberForm, birthDate: e.target.value})} className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2 focus:border-[#003366] focus:outline-none" /></div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Função na Igreja</label>
                <select value={memberForm.role} onChange={e => setMemberForm({...memberForm, role: e.target.value})} className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2 focus:border-[#003366] focus:outline-none">
                  <option>Membro</option><option>Pastor(a)</option><option>Diácono/Diaconisa</option><option>Presbítero</option><option>Líder de Departamento</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setShowMemberModal(false)} className="px-6 py-2 bg-zinc-100 text-zinc-600 font-bold text-xs uppercase tracking-widest">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-[#003366] text-white font-bold text-xs uppercase tracking-widest">Registar</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Contribution Modal */}
      {showContributionModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white max-w-lg w-full p-8 rounded-none shadow-2xl">
            <h3 className="font-bold text-[#003366] text-xl mb-4 uppercase tracking-tighter">Registar Entrada</h3>
            <form onSubmit={handleSaveContribution} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Valor (AOA)</label><input required type="number" step="0.01" value={contributionForm.amount} onChange={e => setContributionForm({...contributionForm, amount: e.target.value})} className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2 focus:border-[#003366] focus:outline-none" /></div>
                <div><label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Data</label><input required type="date" value={contributionForm.date} onChange={e => setContributionForm({...contributionForm, date: e.target.value})} className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2 focus:border-[#003366] focus:outline-none" /></div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Tipo</label>
                <select value={contributionForm.type} onChange={e => setContributionForm({...contributionForm, type: e.target.value})} className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2 focus:border-[#003366] focus:outline-none">
                  <option>Dízimo</option><option>Oferta</option><option>Doação Específica</option><option>Evento</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Membro Associado (Opcional)</label>
                <select value={contributionForm.memberId} onChange={e => setContributionForm({...contributionForm, memberId: e.target.value})} className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2 focus:border-[#003366] focus:outline-none">
                  <option value="">Anónimo / Não Aplicável</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setShowContributionModal(false)} className="px-6 py-2 bg-zinc-100 text-zinc-600 font-bold text-xs uppercase tracking-widest">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-widest">Registar</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
