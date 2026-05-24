import React, { useState } from 'react';
import { 
  Users, BookOpen, GraduationCap, Calendar, DollarSign, LayoutDashboard, 
  Search, Plus, MapPin, BarChart3, Clock, CheckCircle, FileText, Settings, BookCopy, Wallet,
  Library, Truck, SearchCode
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type TabType = 'dashboard' | 'alunos' | 'professores' | 'turmas' | 'propinas' | 'notas' | 'biblioteca' | 'transporte';

export default function SchoolModule() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState<TabType | null>(null);

  const [livros, setLivros] = useState([
    { id: 1, titulo: 'Matemática 10ª Classe', autor: 'António Silva', status: 'Disponível', isbn: '978-0123456789' },
    { id: 2, titulo: 'História de Angola', autor: 'Mário Pinto', status: 'Emprestado', isbn: '978-9876543210' },
  ]);

  const [rotas, setRotas] = useState([
    { id: 1, nome: 'Rota Sul (Talatona)', motorista: 'João Pedro', passageiros: 22, status: 'Em Rota' },
    { id: 2, nome: 'Rota Norte (Cacuaco)', motorista: 'Pedro Simão', passageiros: 18, status: 'Garagem' },
  ]);

  // Data
  const [alunos, setAlunos] = useState([
    { id: 1, nome: 'João Baptista', matricula: 'MAT-001', classe: '10ª Classe', turma: 'A', turno: 'Manhã', status: 'Ativo', propinaData: '2026-04-05' },
    { id: 2, nome: 'Maria Silva', matricula: 'MAT-002', classe: '8ª Classe', turma: 'B', turno: 'Tarde', status: 'Ativo', propinaData: '2026-03-20' },
  ]);

  const [professores, setProfessores] = useState([
    { id: 1, nome: 'Alberto Mário', disciplina: 'Matemática', telefone: '923000111', turmas: '10ªA, 10ªB', status: 'Ativo' },
    { id: 2, nome: 'Carla Dias', disciplina: 'Língua Portuguesa', telefone: '912333444', turmas: '8ªA, 8ªB, 9ªA', status: 'Ativo' },
  ]);

  const [turmas, setTurmas] = useState([
    { id: 1, nome: '10ª Classe - A', sala: 'Sala 12', turno: 'Manhã', alunos: 35, diretor: 'Alberto Mário' },
    { id: 2, nome: '8ª Classe - B', sala: 'Sala 05', turno: 'Tarde', alunos: 40, diretor: 'Carla Dias' },
  ]);

  const [propinas, setPropinas] = useState([
    { id: 1, aluno: 'João Baptista', mes: 'Abril', valor: 25000, dataPagamento: '2026-04-05', status: 'Pago', metodo: 'TPA' },
    { id: 2, aluno: 'Maria Silva', mes: 'Abril', valor: 20000, dataPagamento: '', status: 'Pendente', metodo: '' },
  ]);

  // Forms
  const [formAluno, setFormAluno] = useState({ nome: '', classe: '', turma: '', turno: 'Manhã', status: 'Ativo' });
  const [formPropina, setFormPropina] = useState({ aluno: '', mes: 'Maio', valor: '', dataPagamento: '', status: 'Pago', metodo: 'TPA' });

  // Charts Data
  const propinasData = [
    { name: 'Jan', Pago: 1500000, Pendente: 200000 },
    { name: 'Fev', Pago: 1800000, Pendente: 300000 },
    { name: 'Mar', Pago: 2000000, Pendente: 150000 },
    { name: 'Abr', Pago: 1200000, Pendente: 900000 },
  ];

  const alunosStatus = [
    { name: 'Ativos', value: 850 },
    { name: 'Inativos', value: 45 },
    { name: 'Transferidos', value: 12 },
  ];
  const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

  const bgModal = "fixed inset-0 z-[150] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm";

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 border border-zinc-200 shadow-sm relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center">
        <div className="relative z-10">
          <h2 className="text-2xl font-black text-blue-900 flex items-center gap-2">
            <GraduationCap size={28} />
            Gestão Escolar (ERP)
          </h2>
          <p className="text-zinc-500 text-sm mt-1 max-w-2xl">
            Gestão completa de Alunos, Professores, Turmas, Propinas e Pautas Académicas.
          </p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-zinc-200 overflow-x-auto pb-1 scrollbar-hide">
        {[
          { id: 'dashboard', label: 'Resumo Geral', icon: LayoutDashboard },
          { id: 'alunos', label: 'Alunos / Matrículas', icon: Users },
          { id: 'professores', label: 'Professores', icon: BookOpen },
          { id: 'turmas', label: 'Turmas & Horários', icon: Calendar },
          { id: 'propinas', label: 'Tesouraria (Propinas)', icon: Wallet },
          { id: 'notas', label: 'Pautas & Avaliações', icon: FileText },
          { id: 'biblioteca', label: 'Biblioteca', icon: Library },
          { id: 'transporte', label: 'Transporte & Rotas', icon: Truck }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex items-center gap-2 pb-2 text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${activeTab === tab.id ? 'text-blue-700 border-b-2 border-blue-700' : 'text-zinc-500 hover:text-zinc-800'}`}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 border border-zinc-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-100 text-blue-800 rounded-md"><Users size={24} /></div>
              <div><p className="text-xs text-zinc-500 font-bold uppercase">Total Alunos</p><h3 className="text-2xl font-black text-blue-900">907</h3></div>
            </div>
            <div className="bg-white p-6 border border-zinc-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-100 text-emerald-800 rounded-md"><Wallet size={24} /></div>
              <div><p className="text-xs text-zinc-500 font-bold uppercase">Propinas (Mês)</p><h3 className="text-xl font-black text-emerald-900">AOA 1.2M</h3></div>
            </div>
            <div className="bg-white p-6 border border-zinc-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-amber-100 text-amber-800 rounded-md"><BookOpen size={24} /></div>
              <div><p className="text-xs text-zinc-500 font-bold uppercase">Professores</p><h3 className="text-2xl font-black text-amber-900">45</h3></div>
            </div>
            <div className="bg-white p-6 border border-zinc-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-purple-100 text-purple-800 rounded-md"><LayoutDashboard size={24} /></div>
              <div><p className="text-xs text-zinc-500 font-bold uppercase">Turmas Ativas</p><h3 className="text-2xl font-black text-purple-900">22</h3></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-zinc-200 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-zinc-800 uppercase mb-4">Arrecadação de Propinas</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={propinasData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{fill: 'transparent'}} />
                    <Legend />
                    <Bar dataKey="Pago" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Pendente" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white border border-zinc-200 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-zinc-800 uppercase mb-4">Status de Alunos</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={alunosStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {alunosStatus.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'alunos' && (
        <div className="bg-white border border-zinc-200 shadow-sm">
          <div className="p-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50">
            <h3 className="font-bold text-zinc-800 uppercase tracking-wide">Diretório de Alunos</h3>
            <button onClick={() => setShowForm('alunos')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-bold uppercase flex items-center gap-2">
              <Plus size={16} /> Nova Matrícula
            </button>
          </div>
          <table className="w-full text-left">
            <thead className="bg-[#003366] text-white text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Matrícula</th>
                <th className="px-4 py-3">Nome do Aluno</th>
                <th className="px-4 py-3">Classe & Turma</th>
                <th className="px-4 py-3">Turno</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {alunos.map((a: any) => (
                <tr key={a.id} className="hover:bg-zinc-50 text-sm">
                  <td className="px-4 py-3 font-mono text-zinc-500">{a.matricula}</td>
                  <td className="px-4 py-3 font-bold text-zinc-800">{a.nome}</td>
                  <td className="px-4 py-3 text-zinc-600">{a.classe} - {a.turma}</td>
                  <td className="px-4 py-3 text-zinc-600">{a.turno}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-[10px] uppercase font-bold rounded-sm">{a.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'propinas' && (
        <div className="bg-white border border-zinc-200 shadow-sm">
          <div className="p-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50">
            <h3 className="font-bold text-zinc-800 uppercase tracking-wide">Gestão de Mensalidades</h3>
            <button onClick={() => setShowForm('propinas')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-bold uppercase flex items-center gap-2">
              <Plus size={16} /> Registar Pagamento
            </button>
          </div>
          <table className="w-full text-left">
            <thead className="bg-[#003366] text-white text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">MesRef</th>
                <th className="px-4 py-3">Aluno</th>
                <th className="px-4 py-3 text-right">Valor AOA</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3">Data Pgto / Método</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {propinas.map((p: any) => (
                <tr key={p.id} className="hover:bg-zinc-50 text-sm">
                  <td className="px-4 py-3 font-bold text-zinc-800">{p.mes}</td>
                  <td className="px-4 py-3 text-zinc-600">{p.aluno}</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-700">{new Intl.NumberFormat('pt-AO').format(p.valor)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 text-[10px] uppercase font-bold rounded-sm ${p.status === 'Pago' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">
                    {p.status === 'Pago' ? `${p.dataPagamento} (${p.metodo})` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Basic Placeholders for others */}
      {(activeTab === 'professores' || activeTab === 'turmas' || activeTab === 'notas') && (
        <div className="bg-zinc-50 border border-zinc-200 p-12 text-center text-zinc-500">
          Módulo em desenvolvimento contínuo. Explore o Dashboard, Alunos e Propinas.
        </div>
      )}

      {activeTab === 'biblioteca' && (
        <div className="bg-white border border-zinc-200 shadow-sm">
          <div className="p-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50">
            <h3 className="font-bold text-zinc-800 uppercase tracking-wide">Acervo Bibliográfico</h3>
            <button className="bg-blue-600 text-white px-4 py-2 text-xs font-bold uppercase flex items-center gap-2">
              <Plus size={16} /> Novo Livro
            </button>
          </div>
          <table className="w-full text-left">
            <thead className="bg-[#003366] text-white text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">ISBN / Código</th>
                <th className="px-4 py-3">Título do Livro</th>
                <th className="px-4 py-3">Autor</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {livros.map(l => (
                <tr key={l.id} className="hover:bg-zinc-50 text-sm">
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">{l.isbn}</td>
                  <td className="px-4 py-3 font-bold text-zinc-800">{l.titulo}</td>
                  <td className="px-4 py-3 text-zinc-600">{l.autor}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 text-[10px] uppercase font-bold rounded-sm ${l.status === 'Disponível' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{l.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'transporte' && (
        <div className="bg-white border border-zinc-200 shadow-sm">
          <div className="p-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50">
            <h3 className="font-bold text-zinc-800 uppercase tracking-wide">Frota & Rotas Escolares</h3>
            <button className="bg-blue-600 text-white px-4 py-2 text-xs font-bold uppercase flex items-center gap-2">
              <Plus size={16} /> Nova Rota
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
            {rotas.map(r => (
              <div key={r.id} className="p-4 border border-zinc-200 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><Truck size={80} /></div>
                <h4 className="font-black text-blue-900 text-lg uppercase tracking-tighter">{r.nome}</h4>
                <p className="text-zinc-500 font-bold text-xs uppercase">Motorista: {r.motorista}</p>
                <div className="mt-4 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Capacidade / Ocupação</p>
                    <p className="font-black text-zinc-800 text-xl">{r.passageiros} Alunos</p>
                  </div>
                  <span className={`px-2 py-1 text-[10px] uppercase font-bold rounded-sm ${r.status === 'Em Rota' ? 'bg-blue-100 text-blue-800' : 'bg-zinc-100 text-zinc-600'}`}>{r.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {showForm === 'alunos' && (
          <div className={bgModal}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="bg-white max-w-lg w-full">
              <div className="bg-blue-900 text-white p-4 font-bold uppercase tracking-wider text-sm flex justify-between">
                <span>Nova Matrícula</span>
                <button onClick={() => setShowForm(null)} className="text-white/70 hover:text-white">✕</button>
              </div>
              <form onSubmit={e => { e.preventDefault(); setAlunos([...alunos, {...formAluno, id: Date.now(), matricula: `MAT-00${alunos.length+1}`, propinaData: ''}]); setShowForm(null); }} className="p-6 space-y-4">
                <div><label className="text-xs font-bold text-zinc-500 uppercase">Nome Completo</label><input required className="w-full bg-zinc-50 border border-zinc-300 p-2 mt-1" onChange={e => setFormAluno({...formAluno, nome: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-xs font-bold text-zinc-500 uppercase">Classe</label><input required className="w-full bg-zinc-50 border border-zinc-300 p-2 mt-1" onChange={e => setFormAluno({...formAluno, classe: e.target.value})} /></div>
                  <div><label className="text-xs font-bold text-zinc-500 uppercase">Turma</label><input required className="w-full bg-zinc-50 border border-zinc-300 p-2 mt-1" onChange={e => setFormAluno({...formAluno, turma: e.target.value})} /></div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <button type="button" onClick={() => setShowForm(null)} className="px-4 py-2 bg-zinc-200 text-xs font-bold uppercase">Cancelar</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-xs font-bold uppercase">Registar</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
        
        {showForm === 'propinas' && (
          <div className={bgModal}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="bg-white max-w-lg w-full">
              <div className="bg-emerald-700 text-white p-4 font-bold uppercase tracking-wider text-sm flex justify-between">
                <span>Registar Mensalidade</span>
                <button onClick={() => setShowForm(null)} className="text-white/70 hover:text-white">✕</button>
              </div>
              <form onSubmit={e => { e.preventDefault(); setPropinas([...propinas, {...formPropina, id: Date.now(), valor: Number(formPropina.valor)}]); setShowForm(null); }} className="p-6 space-y-4">
                <div><label className="text-xs font-bold text-zinc-500 uppercase">Nome do Aluno</label><input required className="w-full bg-zinc-50 border border-zinc-300 p-2 mt-1" onChange={e => setFormPropina({...formPropina, aluno: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-xs font-bold text-zinc-500 uppercase">Mês de Referência</label><input required className="w-full bg-zinc-50 border border-zinc-300 p-2 mt-1" onChange={e => setFormPropina({...formPropina, mes: e.target.value})} /></div>
                  <div><label className="text-xs font-bold text-zinc-500 uppercase">Valor Pago</label><input required type="number" className="w-full bg-zinc-50 border border-zinc-300 p-2 mt-1" onChange={e => setFormPropina({...formPropina, valor: e.target.value})} /></div>
                  <div><label className="text-xs font-bold text-zinc-500 uppercase">Data Pgto</label><input required type="date" className="w-full bg-zinc-50 border border-zinc-300 p-2 mt-1" onChange={e => setFormPropina({...formPropina, dataPagamento: e.target.value})} /></div>
                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase">Método</label>
                    <select className="w-full bg-zinc-50 border border-zinc-300 p-2 mt-1" onChange={e => setFormPropina({...formPropina, metodo: e.target.value})}>
                      <option>TPA</option><option>Transferência</option><option>Dinheiro Vivo</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <button type="button" onClick={() => setShowForm(null)} className="px-4 py-2 bg-zinc-200 text-xs font-bold uppercase">Cancelar</button>
                  <button type="submit" className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold uppercase">Processar Pagamento</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
