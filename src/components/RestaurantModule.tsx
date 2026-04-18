import React, { useState } from 'react';
import { 
  Utensils, Coffee, ShoppingCart, UserCheck, CalendarDays, BarChart4,
  Plus, Edit, Trash2, CheckCircle, Clock, TrendingUp, Wine, ChefHat, Truck,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

type TabType = 'dashboard' | 'mesas' | 'pedidos' | 'menu' | 'estoque' | 'bar' | 'cozinha' | 'fornecedores';

export default function RestaurantModule() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [showForm, setShowForm] = useState<TabType | null>(null);

  const [drinks, setDrinks] = useState([
    { id: 1, nome: 'Cerveja Cuca (Lata)', categoria: 'Nacional', stock: 120, preco: 800 },
    { id: 2, nome: 'Vinho Tinto Reserve', categoria: 'Importado', stock: 15, preco: 12000 },
  ]);

  const [kitchenStatus, setKitchenStatus] = useState([
    { id: 1, pedido: '#1052', prato: 'Mufete de Peixe', tempo: '12 min', status: 'Preparando' },
    { id: 2, pedido: '#1055', prato: 'Galinha à Cafreal', tempo: '40 min', status: 'Fila de Espera' },
  ]);

  // Mocks
  const [mesas, setMesas] = useState([
    { id: 1, numero: '01', status: 'Livre', capacidade: 4, ocupantes: 0 },
    { id: 2, numero: '02', status: 'Ocupada', capacidade: 2, ocupantes: 2 },
    { id: 3, numero: '03', status: 'Reservada', capacidade: 6, ocupantes: 0 },
  ]);

  const [pedidos, setPedidos] = useState([
    { id: 1, mesa: '02', cliente: 'Cliente Local', itens: 'Mufete (2x), Cuca (4x)', total: 18000, status: 'Em Preparação', hora: '14:20' },
    { id: 2, mesa: 'Take-Away', cliente: 'João (Glovo)', itens: 'Prego no Prato (1x)', total: 6000, status: 'Pronto', hora: '14:45' },
  ]);

  const [menu, setMenu] = useState([
    { id: 1, nome: 'Mufete Completo', categoria: 'Pratos Principais', preco: 7500, tempoPrep: '25 min', disponivel: true },
    { id: 2, nome: 'Funge de Bombó c/ Calulu', categoria: 'Pratos Tradicionais', preco: 6000, tempoPrep: '20 min', disponivel: true },
    { id: 3, nome: 'Cerveja Cuca (Fina)', categoria: 'Bebidas', preco: 750, tempoPrep: 'Imediato', disponivel: true },
  ]);

  // Dash Data
  const faturacaoSemana = [
    { name: 'Seg', valor: 45000 },
    { name: 'Ter', valor: 60000 },
    { name: 'Qua', valor: 75000 },
    { name: 'Qui', valor: 80000 },
    { name: 'Sex', valor: 150000 },
    { name: 'Sáb', valor: 220000 },
    { name: 'Dom', valor: 190000 },
  ];

  const totalHoje = 185000;
  const pedidosHoje = 48;

  const bgModal = "fixed inset-0 z-[150] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm";

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 border border-zinc-200 shadow-sm relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center">
        <div className="relative z-10">
          <h2 className="text-2xl font-black text-rose-900 flex items-center gap-2">
            <Utensils size={28} />
            Gestão de Restaurante & Bar
          </h2>
          <p className="text-zinc-500 text-sm mt-1 max-w-2xl">
            Ponto de venda focado em Mesas, Pedidos para a Cozinha e Controlo de Ementas.
          </p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-zinc-200 overflow-x-auto pb-1 scrollbar-hide">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: BarChart4 },
          { id: 'mesas', label: 'Salão & Mesas', icon: Users },
          { id: 'pedidos', label: 'Gestão de Pedidos', icon: ShoppingCart },
          { id: 'menu', label: 'Ementa Virtual', icon: Coffee },
          { id: 'bar', label: 'Gestão de Bar', icon: Wine },
          { id: 'cozinha', label: 'KDS (Cozinha)', icon: ChefHat },
          { id: 'fornecedores', label: 'Fornecedores', icon: Truck }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex items-center gap-2 pb-2 text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${activeTab === tab.id ? 'text-rose-700 border-b-2 border-rose-700' : 'text-zinc-500 hover:text-zinc-800'}`}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 border border-zinc-200 shadow-sm flex items-center gap-4">
              <div className="p-4 bg-rose-100 text-rose-800 rounded-full"><TrendingUp size={28} /></div>
              <div><p className="text-xs text-zinc-500 font-bold uppercase">Faturação Hoje</p><h3 className="text-2xl font-black text-rose-900">{new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA'}).format(totalHoje)}</h3></div>
            </div>
            <div className="bg-white p-6 border border-zinc-200 shadow-sm flex items-center gap-4">
              <div className="p-4 bg-orange-100 text-orange-800 rounded-full"><ShoppingCart size={28} /></div>
              <div><p className="text-xs text-zinc-500 font-bold uppercase">Pedidos Hoje</p><h3 className="text-2xl font-black text-orange-900">{pedidosHoje}</h3></div>
            </div>
            <div className="bg-white p-6 border border-zinc-200 shadow-sm flex items-center gap-4">
              <div className="p-4 bg-emerald-100 text-emerald-800 rounded-full"><UserCheck size={28} /></div>
              <div><p className="text-xs text-zinc-500 font-bold uppercase">Mesas Ocupadas</p><h3 className="text-2xl font-black text-emerald-900">4 / 15</h3></div>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 p-6 shadow-sm">
            <h3 className="font-bold text-zinc-800 uppercase text-sm mb-6">Tendência de Faturação (Últimos 7 dias)</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={faturacaoSemana}>
                  <defs>
                    <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#be123c" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#be123c" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="valor" stroke="#be123c" fillOpacity={1} fill="url(#colorValor)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'mesas' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 border border-zinc-200">
            <h3 className="font-bold text-zinc-800 uppercase text-sm tracking-wide">Planta do Salão (Mesas)</h3>
            <button className="bg-rose-700 text-white px-4 py-2 font-bold uppercase tracking-widest text-xs">Nova Mesa</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {mesas.map(m => (
              <div key={m.id} className={`p-4 border shadow-sm flex flex-col items-center justify-center aspect-square ${m.status === 'Livre' ? 'bg-white border-zinc-200 text-zinc-800' : m.status === 'Ocupada' ? 'bg-rose-50 border-rose-300 text-rose-900' : 'bg-amber-50 border-amber-300 text-amber-900'}`}>
                <h4 className="font-black text-3xl mb-1">{m.numero}</h4>
                <span className="text-xs font-bold uppercase tracking-wider">{m.status}</span>
                <span className="text-[10px] text-zinc-500 mt-2">{m.capacidade} Lug.</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'pedidos' && (
        <div className="bg-white border border-zinc-200 shadow-sm">
          <div className="p-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50">
            <h3 className="font-bold text-zinc-800 uppercase tracking-wide">Fila de Pedidos (Cozinha/Bar)</h3>
            <button className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 text-xs font-bold uppercase flex items-center gap-2">
              <Plus size={16} /> Novo Pedido Libre / Take-away
            </button>
          </div>
          <table className="w-full text-left">
            <thead className="bg-zinc-800 text-white text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Hora</th>
                <th className="px-4 py-3">Mesa/Ref</th>
                <th className="px-4 py-3">Itens (Resumo)</th>
                <th className="px-4 py-3 text-right">Total AOA</th>
                <th className="px-4 py-3 text-center">Estado KDS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {pedidos.map((p: any) => (
                <tr key={p.id} className="hover:bg-zinc-50 text-sm">
                  <td className="px-4 py-3 font-mono font-bold text-zinc-500">{p.hora}</td>
                  <td className="px-4 py-3 font-bold text-zinc-800">{p.mesa}</td>
                  <td className="px-4 py-3 text-zinc-600 italic">{p.itens}</td>
                  <td className="px-4 py-3 text-right font-bold text-orange-700">{new Intl.NumberFormat('pt-AO').format(p.total)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 text-[10px] uppercase font-bold rounded-sm ${p.status === 'Pronto' ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-800 animate-pulse'}`}>{p.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'menu' && (
        <div className="bg-white border border-zinc-200 shadow-sm">
          <div className="p-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50">
            <h3 className="font-bold text-zinc-800 uppercase tracking-wide">Gestão de Ementa</h3>
            <button className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 text-xs font-bold uppercase flex items-center gap-2">
              <Plus size={16} /> Adicionar Prato
            </button>
          </div>
          <table className="w-full text-left">
            <thead className="bg-[#003366] text-white text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Prato / Bebida</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Tempo Médio</th>
                <th className="px-4 py-3 text-right">Preço de Venda</th>
                <th className="px-4 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {menu.map((i: any) => (
                <tr key={i.id} className="hover:bg-zinc-50 text-sm">
                  <td className="px-4 py-3 font-bold text-zinc-800">{i.nome}</td>
                  <td className="px-4 py-3 text-zinc-600">{i.categoria}</td>
                  <td className="px-4 py-3 text-zinc-500 flex items-center gap-1"><Clock size={14} />{i.tempoPrep}</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-700">{new Intl.NumberFormat('pt-AO').format(i.preco)}</td>
                  <td className="px-4 py-3 text-center space-x-2">
                    <button className="text-zinc-400 hover:text-blue-600"><Edit size={16}/></button>
                    <button className="text-zinc-400 hover:text-red-600"><Trash2 size={16}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'bar' && (
        <div className="bg-white border border-zinc-200 shadow-sm">
          <div className="p-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50">
            <h3 className="font-bold text-zinc-800 uppercase tracking-wide">Controlo de Bar & Bebidas</h3>
            <button className="bg-rose-700 text-white px-4 py-2 text-xs font-bold uppercase flex items-center gap-2">
              <Plus size={16} /> Registar Entrada
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {drinks.map(d => (
              <div key={d.id} className="p-4 border border-zinc-200 shadow-sm relative group cursor-pointer hover:border-rose-500 transition-colors">
                <div className="absolute top-2 right-2 opacity-10 group-hover:scale-125 transition-transform"><Wine size={40} /></div>
                <h4 className="font-black text-rose-900 text-lg uppercase leading-tight">{d.nome}</h4>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{d.categoria}</p>
                <div className="mt-4 flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="text-[10px] text-zinc-400 font-bold uppercase">Preço Unitário</p>
                    <p className="font-bold text-zinc-800 text-lg">{new Intl.NumberFormat('pt-AO').format(d.preco)} AOA</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-zinc-400 font-bold uppercase">Stock Atual</p>
                    <p className={`font-black text-2xl ${d.stock < 20 ? 'text-red-600 animate-pulse' : 'text-emerald-700'}`}>{d.stock}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'cozinha' && (
        <div className="bg-zinc-900 text-white p-6 border border-zinc-800 shadow-2xl min-h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-2xl uppercase tracking-tighter flex items-center gap-2">
              <ChefHat className="text-rose-500" /> Cozinha Central (KDS)
            </h3>
            <div className="flex gap-4 text-xs font-bold uppercase tracking-widest">
              <span className="flex items-center gap-1 text-emerald-400"><CheckCircle size={14} /> Sistema Online</span>
              <span className="flex items-center gap-1 text-amber-400"><Clock size={14} /> 2 Em Espera</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {kitchenStatus.map(k => (
              <div key={k.id} className="bg-zinc-800 border-l-4 border-rose-600 p-4 shadow-lg space-y-4">
                <div className="flex justify-between items-start">
                  <h4 className="text-zinc-500 font-bold text-sm uppercase">{k.pedido}</h4>
                  <span className="bg-rose-900 text-rose-100 px-2 py-0.5 text-[10px] uppercase font-bold rounded-sm animate-pulse">{k.status}</span>
                </div>
                <h5 className="text-xl font-black text-zinc-100 uppercase tracking-wide">{k.prato}</h5>
                <div className="pt-4 border-t border-zinc-700 flex justify-between items-center text-xs">
                  <span className="text-zinc-400 font-bold uppercase">Tempo Decorrido:</span>
                  <span className="text-rose-400 font-black">{k.tempo}</span>
                </div>
                <button className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2 text-xs uppercase tracking-widest transition-colors">
                  Marcar como Pronto
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'fornecedores' && (
        <div className="bg-white border border-zinc-200 shadow-sm p-12 text-center text-zinc-400 italic">
          Gestão de Fornecedores e Encomendas Automáticas em desenvolvimento.
        </div>
      )}
    </div>
  );
}
