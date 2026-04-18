import React, { useState } from 'react';
import { 
  Bed, Key, Calendar, Users, Coffee, LogIn, LogOut, Search, Plus, 
  Settings, CreditCard, BarChart3, MapPin, CheckCircle, AlertTriangle, ShieldCheck, ClipboardList, TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

type TabType = 'dashboard' | 'reservas' | 'quartos' | 'hospedes' | 'limpeza' | 'financeiro';

export default function HotelModule() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [showForm, setShowForm] = useState<TabType | null>(null);

  // Mock Data
  const [quartos, setQuartos] = useState([
    { id: 1, numero: '101', tipo: 'Standard', status: 'Disponível', preco: 25000, andar: '1º Andar' },
    { id: 2, numero: '102', tipo: 'Deluxe', status: 'Ocupado', preco: 45000, andar: '1º Andar' },
    { id: 3, numero: '201', tipo: 'Executivo', status: 'Limpeza', preco: 65000, andar: '2º Andar' },
    { id: 4, numero: '202', tipo: 'Standard', status: 'Manutenção', preco: 25000, andar: '2º Andar' },
  ]);

  const [reservas, setReservas] = useState([
    { id: 1, hospede: 'Manuel Neto', quarto: '102', checkIn: '2026-04-18', checkOut: '2026-04-20', status: 'Ativa', valor: 90000 },
    { id: 2, hospede: 'Sofia Gomes', quarto: '305', checkIn: '2026-04-25', checkOut: '2026-04-28', status: 'Confirmada', valor: 120000 },
  ]);

  const occupancyData = [
    { name: 'Seg', ocupacao: 65 },
    { name: 'Ter', ocupacao: 70 },
    { name: 'Qua', ocupacao: 85 },
    { name: 'Qui', ocupacao: 90 },
    { name: 'Sex', ocupacao: 98 },
    { name: 'Sáb', ocupacao: 100 },
    { name: 'Dom', ocupacao: 80 },
  ];

  const revenueData = [
    { name: 'Jan', receita: 4500000 },
    { name: 'Fev', receita: 5200000 },
    { name: 'Mar', receita: 4800000 },
    { name: 'Abr', receita: 6000000 },
  ];

  const bgModal = "fixed inset-0 z-[150] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm";

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 border border-zinc-200 shadow-sm relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center">
        <div className="relative z-10">
          <h2 className="text-2xl font-black text-indigo-900 flex items-center gap-2">
            <Bed size={28} />
            Gestão Hoteleira Pro
          </h2>
          <p className="text-zinc-500 text-sm mt-1 max-w-2xl">
            Sistema completo de Front Desk, Reservas, Housekeeping e Faturação Hoteleira.
          </p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-zinc-200 overflow-x-auto pb-1 scrollbar-hide">
        {[
          { id: 'dashboard', label: 'Overview', icon: BarChart3 },
          { id: 'reservas', label: 'Reservas & Front Desk', icon: Calendar },
          { id: 'quartos', label: 'Mapa de Quartos', icon: Bed },
          { id: 'hospedes', label: 'Guest List', icon: Users },
          { id: 'limpeza', label: 'Housekeeping', icon: ClipboardList },
          { id: 'financeiro', label: 'Financeiro', icon: CreditCard }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex items-center gap-2 pb-2 text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${activeTab === tab.id ? 'text-indigo-700 border-b-2 border-indigo-700' : 'text-zinc-500 hover:text-zinc-800'}`}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 border border-zinc-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-indigo-100 text-indigo-800 rounded-md"><LogIn size={24} /></div>
              <div><p className="text-xs text-zinc-500 font-bold uppercase">Check-ins Hoje</p><h3 className="text-2xl font-black text-indigo-900">12</h3></div>
            </div>
            <div className="bg-white p-6 border border-zinc-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-rose-100 text-rose-800 rounded-md"><LogOut size={24} /></div>
              <div><p className="text-xs text-zinc-500 font-bold uppercase">Check-outs Hoje</p><h3 className="text-2xl font-black text-rose-900">8</h3></div>
            </div>
            <div className="bg-white p-6 border border-zinc-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-100 text-emerald-800 rounded-md"><Users size={24} /></div>
              <div><p className="text-xs text-zinc-500 font-bold uppercase">Taxa Ocupação</p><h3 className="text-2xl font-black text-emerald-900">84%</h3></div>
            </div>
            <div className="bg-white p-6 border border-zinc-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-amber-100 text-amber-800 rounded-md"><TrendingUp size={24} /></div>
              <div><p className="text-xs text-zinc-500 font-bold uppercase">Receita (Mês)</p><h3 className="text-xl font-black text-amber-900">AOA 6.0M</h3></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-zinc-200 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-zinc-800 uppercase mb-4">Ocupação Semanal (%)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={occupancyData}>
                    <defs>
                      <linearGradient id="colorOcup" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="ocupacao" stroke="#4338ca" fillOpacity={1} fill="url(#colorOcup)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white border border-zinc-200 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-zinc-800 uppercase mb-4">Crescimento de Receita</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar dataKey="receita" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'reservas' && (
        <div className="bg-white border border-zinc-200 shadow-sm">
          <div className="p-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50">
            <h3 className="font-bold text-zinc-800 uppercase tracking-wide">Front Desk / Reservas Ativas</h3>
            <button onClick={() => setShowForm('reservas')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-xs font-bold uppercase flex items-center gap-2">
              <Plus size={16} /> Nova Reserva
            </button>
          </div>
          <table className="w-full text-left">
            <thead className="bg-[#003366] text-white text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Hóspede</th>
                <th className="px-4 py-3">Quarto</th>
                <th className="px-4 py-3">Check-In</th>
                <th className="px-4 py-3">Check-Out</th>
                <th className="px-4 py-3 text-right">Valor Total</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {reservas.map(r => (
                <tr key={r.id} className="hover:bg-zinc-50 text-sm">
                  <td className="px-4 py-3 font-bold text-zinc-800">{r.hospede}</td>
                  <td className="px-4 py-3 text-zinc-600">Nº {r.quarto}</td>
                  <td className="px-4 py-3 text-zinc-600">{r.checkIn}</td>
                  <td className="px-4 py-3 text-zinc-600">{r.checkOut}</td>
                  <td className="px-4 py-3 text-right font-bold text-indigo-700">{new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA'}).format(r.valor)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 text-[10px] uppercase font-bold rounded-sm ${r.status === 'Ativa' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'quartos' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {quartos.map(q => (
              <div key={q.id} className={`p-4 border shadow-sm rounded-none flex flex-col items-center justify-center aspect-square transition-all hover:scale-105 cursor-pointer ${
                q.status === 'Disponível' ? 'bg-white border-zinc-200' : 
                q.status === 'Ocupado' ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-bold' : 
                q.status === 'Limpeza' ? 'bg-amber-50 border-amber-200 text-amber-900 border-dashed' : 
                'bg-red-50 border-red-200 text-red-900'
              }`}>
                <span className="text-xs text-zinc-500 mb-1">{q.andar}</span>
                <Key size={20} className={q.status === 'Ocupado' ? 'text-indigo-600' : 'text-zinc-400'} />
                <h4 className="font-black text-2xl mt-1">{q.numero}</h4>
                <p className="text-[10px] uppercase font-bold tracking-widest mt-1 text-center">{q.tipo}</p>
                <div className="mt-2 text-[9px] font-bold px-2 py-0.5 rounded-full bg-black/5">{q.status}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Forms and placeholders for others */}
      <AnimatePresence>
        {showForm && (
          <div className={bgModal}>
            <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0 }} className="bg-white max-w-lg w-full">
              <div className="bg-indigo-900 text-white p-4 font-bold uppercase tracking-wider text-sm flex justify-between">
                <span>Nova Reserva / Guest Entry</span>
                <button onClick={() => setShowForm(null)} className="text-white/70 hover:text-white">✕</button>
              </div>
              <form className="p-6 space-y-4">
                <div><label className="text-xs font-bold text-zinc-500 uppercase">Nome Completo do Hóspede</label><input required className="w-full bg-zinc-50 border border-zinc-300 p-2 mt-1" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-xs font-bold text-zinc-500 uppercase">Documento de ID</label><input required className="w-full bg-zinc-50 border border-zinc-300 p-2 mt-1" /></div>
                  <div><label className="text-xs font-bold text-zinc-500 uppercase">Nº Quarto</label><select className="w-full bg-zinc-50 border border-zinc-300 p-2 mt-1"><option>101</option><option>201</option><option>301</option></select></div>
                  <div><label className="text-xs font-bold text-zinc-500 uppercase">Check-In</label><input required type="date" className="w-full bg-zinc-50 border border-zinc-300 p-2 mt-1" /></div>
                  <div><label className="text-xs font-bold text-zinc-500 uppercase">Check-Out</label><input required type="date" className="w-full bg-zinc-50 border border-zinc-300 p-2 mt-1" /></div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <button type="button" onClick={() => setShowForm(null)} className="px-4 py-2 bg-zinc-200 text-xs font-bold uppercase">Voltar</button>
                  <button type="submit" className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold uppercase">Confirmar Reserva</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
