import React, { useState, useMemo } from 'react';
import { Sprout, Tractor, Package, DollarSign, Search, Plus, MapPin, Calendar, Activity, BarChart3, CheckCircle, AlertTriangle, Leaf, Store, Edit, Trash2, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type TabType = 'dashboard' | 'fazendas' | 'culturas' | 'pecuaria' | 'insumos' | 'vendas' | 'maquinaria' | 'clima' | 'relatorios';

export default function AgrobusinessModule() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');

  // Estados de dados simulados
  const [maquinaria, setMaquinaria] = useState([
    { id: 1, nome: 'Trator Massey Ferguson 4x4', status: 'Operacional', manutencao: '2026-05-10', horas: 1250, consumo: '15L/h' },
    { id: 2, nome: 'Colheitadeira John Deere', status: 'Em Manutenção', manutencao: '2026-04-15', horas: 840, consumo: '45L/h' },
    { id: 3, nome: 'Camião Cisterna (Distribuição)', status: 'Operacional', manutencao: '2026-06-01', horas: 54000, consumo: '30L/100km' },
  ]);

  const [culturas, setCulturas] = useState<any[]>([
    { id: 1, nome: 'Milho Branco', fazenda: 'Fazenda Esperança (Huambo)', area: 50, plantio: '2025-10-15', colheitaPrev: '2026-04-20', status: 'Em Crescimento', estRendimento: 150 },
    { id: 2, nome: 'Feijão Manteiga', fazenda: 'Fazenda Boa Vista (Uíge)', area: 30, plantio: '2026-02-10', colheitaPrev: '2026-05-15', status: 'Germinação', estRendimento: 45 },
    { id: 3, nome: 'Mandioca', fazenda: 'Fazenda Malanje', area: 100, plantio: '2025-08-05', colheitaPrev: '2026-08-05', status: 'Desenvolvimento', estRendimento: 2000 }
  ]);

  const [animais, setAnimais] = useState<any[]>([
    { id: 1, tipo: 'Bovino (Nelore)', quantidade: 450, proposito: 'Corte', local: 'Fazenda sul (Huíla)', vacinacao: '2026-01-10', status: 'Saudável' },
    { id: 2, tipo: 'Suínos (Large White)', quantidade: 120, proposito: 'Corte', local: 'Fazenda Kwanza Sul', vacinacao: '2026-03-20', status: 'Saudável' },
    { id: 3, tipo: 'Aves (Poedeiras)', quantidade: 5000, proposito: 'Ovos', local: 'Granja Luanda', vacinacao: '2026-04-01', status: 'Atenção' }
  ]);

  const [insumos, setInsumos] = useState<any[]>([
    { id: 1, nome: 'Fertilizante NPK 12-24-12', categoria: 'Fertilizante', qtd: 5000, unid: 'kg', local: 'Armazém Central', min: 1000 },
    { id: 2, nome: 'Semente Milho Híbrido P30', categoria: 'Semente', qtd: 200, unid: 'kg', local: 'Armazém Huambo', min: 500 },
    { id: 3, nome: 'Ração Crescimento (Aves)', categoria: 'Ração', qtd: 15000, unid: 'kg', local: 'Granja Luanda', min: 5000 }
  ]);

  const [vendas, setVendas] = useState<any[]>([
    { id: 1, produto: 'Milho Grão', cliente: 'Moinhos de Angola', qtd: 20, unid: 'Ton', valor: 3500000, data: '2026-04-10', status: 'Pago' },
    { id: 2, produto: 'Ovos (Caixas)', cliente: 'Supermercados Kero', qtd: 500, unid: 'Cx', valor: 2000000, data: '2026-04-15', status: 'Pendente' }
  ]);

  // Modals
  const [showForm, setShowForm] = useState<TabType | null>(null);
  
  // Forms States
  const [formCultura, setFormCultura] = useState({ nome: '', fazenda: '', area: '', plantio: '', colheitaPrev: '', estRendimento: '', status: 'Planejado' });
  const [formAnimal, setFormAnimal] = useState({ tipo: '', quantidade: '', proposito: '', local: '', vacinacao: '', status: 'Saudável' });
  const [formInsumo, setFormInsumo] = useState({ nome: '', categoria: 'Semente', qtd: '', unid: 'kg', local: '', min: '' });
  const [formVenda, setFormVenda] = useState({ produto: '', cliente: '', qtd: '', unid: '', valor: '', data: '', status: 'Pendente' });

  // Cálculos do Dashboard
  const totalArea = cultivas => cultivas.reduce((acc, c) => acc + Number(c.area), 0);
  const totalAnimais = animais.reduce((acc, a) => acc + Number(a.quantidade), 0);
  const alertasInsumos = insumos.filter(i => i.qtd <= i.min);
  const faturacaoAgro = vendas.reduce((acc, v) => acc + Number(v.valor), 0);

  const filterData = (data: any[], key: string) => 
    data.filter(item => Object.values(item).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase())));

  const bgModal = "fixed inset-0 z-[150] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm";

  return (
    <div className="space-y-6">
      {/* Header Geral */}
      <div className="bg-white p-6 border border-zinc-200 shadow-sm relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
          <img src="https://images.unsplash.com/photo-1592982537447-6f296ca8eb9e?w=800&auto=format&fit=crop" alt="Agronegocio Angola" className="w-96 h-auto" />
        </div>
        <div className="relative z-10">
          <h2 className="text-2xl font-black text-emerald-800 flex items-center gap-2">
            <Leaf size={28} />
            Gestão de Agronegócio
          </h2>
          <p className="text-zinc-500 text-sm mt-1 max-w-2xl">
            Painel completo para fazendas, rebanhos, produções agrícolas e comercialização (Contexto Angola).
          </p>
        </div>
      </div>

      {/* Navegação Secundária */}
      <div className="flex gap-4 border-b border-zinc-200 overflow-x-auto pb-1 scrollbar-hide">
        {[
          { id: 'dashboard', label: 'Resumo Geral', icon: BarChart3 },
          { id: 'culturas', label: 'Lavouras & Culturas', icon: Sprout },
          { id: 'pecuaria', label: 'Pecuária & Animais', icon: Activity },
          { id: 'insumos', label: 'Estoque / Insumos', icon: Package },
          { id: 'vendas', label: 'Comercialização', icon: Store },
          { id: 'maquinaria', label: 'Frota & Maquinaria', icon: Tractor },
          { id: 'clima', label: 'Clima & Rega', icon: MapPin },
          { id: 'relatorios', label: 'Análise Avançada', icon: BarChart3 }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex items-center gap-2 pb-2 text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${activeTab === tab.id ? 'text-emerald-700 border-b-2 border-emerald-700' : 'text-zinc-500 hover:text-zinc-800'}`}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
        
        <div className="ml-auto w-full md:w-64 relative hidden md:block">
          <input 
            type="text" 
            placeholder="Pesquisar..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-zinc-300 pl-10 pr-4 py-1.5 text-sm focus:outline-none focus:border-emerald-600 rounded-sm"
          />
          <Search size={14} className="absolute left-3.5 top-2 text-zinc-400" />
        </div>
      </div>

      {/* DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 border border-zinc-200 shadow-sm rounded-md relative overflow-hidden">
              <div className="absolute right-0 top-0 bottom-0 w-24 bg-emerald-50 clip-angled opacity-50"></div>
              <div className="relative z-10 flex">
                <div className="p-3 bg-emerald-100 text-emerald-800 rounded-md mr-4 h-fit"><Sprout size={24} /></div>
                <div>
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Área Plantada</p>
                  <h3 className="text-3xl font-black text-emerald-900 mt-1">{totalArea(culturas)} <span className="text-lg font-normal text-zinc-400">ha</span></h3>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 border border-zinc-200 shadow-sm rounded-md relative overflow-hidden">
              <div className="absolute right-0 top-0 bottom-0 w-24 bg-amber-50 clip-angled opacity-50"></div>
              <div className="relative z-10 flex">
                <div className="p-3 bg-amber-100 text-amber-800 rounded-md mr-4 h-fit"><Activity size={24} /></div>
                <div>
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Total de Animais</p>
                  <h3 className="text-3xl font-black text-amber-900 mt-1">{new Intl.NumberFormat().format(totalAnimais)} <span className="text-lg font-normal text-zinc-400">cabeças</span></h3>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 border border-zinc-200 shadow-sm rounded-md relative overflow-hidden">
              <div className="absolute right-0 top-0 bottom-0 w-24 bg-blue-50 clip-angled opacity-50"></div>
              <div className="relative z-10 flex">
                <div className="p-3 bg-blue-100 text-blue-800 rounded-md mr-4 h-fit"><DollarSign size={24} /></div>
                <div>
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Faturação Agro</p>
                  <h3 className="text-xl font-black text-blue-900 mt-1">{new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(faturacaoAgro)}</h3>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 border border-zinc-200 shadow-sm rounded-md relative overflow-hidden border-orange-200">
              <div className="relative z-10 flex">
                <div className="p-3 bg-orange-100 text-orange-800 rounded-md mr-4 h-fit"><AlertTriangle size={24} /></div>
                <div>
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Avisos Insumos</p>
                  <h3 className="text-3xl font-black text-orange-600 mt-1">{alertasInsumos.length}</h3>
                  <p className="text-[10px] text-zinc-500 mt-1">Materiais em stock baixo</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-zinc-200 rounded-md shadow-sm">
              <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
                <h3 className="font-bold text-zinc-800 text-sm">Resumo Lavouras</h3>
                <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">{culturas.length} Lotes</span>
              </div>
              <div className="p-4 space-y-4">
                {culturas.slice(0,4).map(c => (
                  <div key={c.id} className="flex justify-between items-center border-b border-zinc-100 pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="font-bold text-zinc-800">{c.nome}</p>
                      <p className="text-xs text-zinc-500 flex items-center gap-1"><MapPin size={10} /> {c.fazenda} • {c.area} ha</p>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-sm ${c.status === 'Em Crescimento' || c.status === 'Planejado' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}`}>
                      {c.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-zinc-200 rounded-md shadow-sm">
              <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
                <h3 className="font-bold text-zinc-800 text-sm">Alertas de Stock</h3>
              </div>
              <div className="p-4 space-y-4">
                {alertasInsumos.length === 0 ? <p className="text-zinc-500 text-sm py-4 text-center">Nenhum alerta de stock ativo.</p> : alertasInsumos.map(i => (
                  <div key={i.id} className="flex justify-between items-center border-l-4 border-orange-500 bg-orange-50 p-3 rounded-r-md">
                    <div>
                      <p className="font-bold text-orange-900 text-sm">{i.nome}</p>
                      <p className="text-xs text-orange-700">Mínimo: {i.min} {i.unid} | Atual: {i.qtd} {i.unid}</p>
                    </div>
                    <div className="text-orange-600">
                      <AlertTriangle size={20} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CULTURAS */}
      {activeTab === 'culturas' && (
        <div className="bg-white border border-zinc-200 shadow-sm rounded-md overflow-hidden">
          <div className="p-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50">
            <h3 className="font-bold text-zinc-800 uppercase tracking-wide">Gestão de Lavouras</h3>
            <button onClick={() => setShowForm('culturas')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-bold uppercase tracking-widest flex items-center gap-2 rounded-sm transition-colors">
              <Plus size={16} /> Nova Cultura
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#003366] text-white text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Cultura / Variedade</th>
                  <th className="px-4 py-3">Fazenda & Área</th>
                  <th className="px-4 py-3">Data Sementeira</th>
                  <th className="px-4 py-3">Prev. Colheita</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Rend. (Ton)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filterData(culturas, 'nome').map((c: any) => (
                  <tr key={c.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-zinc-800 flex items-center gap-2">
                       <Sprout size={16} className="text-emerald-600" /> {c.nome}
                    </td>
                    <td className="px-4 py-3">
                      <span className="block text-sm text-zinc-800">{c.fazenda}</span>
                      <span className="text-xs text-zinc-500">{c.area} ha</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600">{c.plantio}</td>
                    <td className="px-4 py-3 text-sm text-zinc-600">{c.colheitaPrev}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-[10px] uppercase font-bold tracking-wider rounded-sm">{c.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-zinc-700">{c.estRendimento} t</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PECUARIA */}
      {activeTab === 'pecuaria' && (
        <div className="bg-white border border-zinc-200 shadow-sm rounded-md overflow-hidden">
          <div className="p-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50">
            <h3 className="font-bold text-zinc-800 uppercase tracking-wide">Plantel & Rebanho</h3>
            <button onClick={() => setShowForm('pecuaria')} className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 text-xs font-bold uppercase tracking-widest flex items-center gap-2 rounded-sm transition-colors">
              <Plus size={16} /> Registar Lote
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#003366] text-white text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Tipo de Animal</th>
                  <th className="px-4 py-3">Localização</th>
                  <th className="px-4 py-3 text-center">Cabeças/Aves</th>
                  <th className="px-4 py-3">Propósito</th>
                  <th className="px-4 py-3">Última Vacina</th>
                  <th className="px-4 py-3 text-right">Status Saúde</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filterData(animais, 'tipo').map((a: any) => (
                  <tr key={a.id} className="hover:bg-zinc-50 transition-colors text-sm">
                    <td className="px-4 py-3 font-bold text-zinc-800">{a.tipo}</td>
                    <td className="px-4 py-3 text-zinc-600">{a.local}</td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-amber-700">{a.quantidade}</td>
                    <td className="px-4 py-3 text-zinc-600">{a.proposito}</td>
                    <td className="px-4 py-3 text-zinc-600">{a.vacinacao}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`px-2 py-1 text-[10px] uppercase font-bold tracking-wider rounded-sm ${a.status === 'Saudável' ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-800'}`}>{a.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* INSUMOS */}
      {activeTab === 'insumos' && (
        <div className="bg-white border border-zinc-200 shadow-sm rounded-md overflow-hidden">
          <div className="p-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50">
            <h3 className="font-bold text-zinc-800 uppercase tracking-wide">Controlo de Insumos (Stock)</h3>
            <button onClick={() => setShowForm('insumos')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-bold uppercase tracking-widest flex items-center gap-2 rounded-sm transition-colors">
              <Plus size={16} /> Adicionar Insumo
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#003366] text-white text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Insumo / Material</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Local (Armazém)</th>
                  <th className="px-4 py-3 text-right">Quantidade Atual</th>
                  <th className="px-4 py-3 text-right">Mínimo Alerta</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filterData(insumos, 'nome').map((i: any) => (
                  <tr key={i.id} className="hover:bg-zinc-50 transition-colors text-sm">
                    <td className="px-4 py-3 font-bold text-zinc-800">{i.nome}</td>
                    <td className="px-4 py-3 text-zinc-600">{i.categoria}</td>
                    <td className="px-4 py-3 text-zinc-600">{i.local}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-blue-700">{i.qtd} {i.unid}</td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-500">{i.min} {i.unid}</td>
                    <td className="px-4 py-3 text-center">
                      {i.qtd <= i.min ? 
                        <span className="text-orange-600 inline-flex items-center gap-1 font-bold text-xs"><AlertTriangle size={14}/> Baixo</span> : 
                        <span className="text-emerald-600 inline-flex items-center gap-1 font-bold text-xs"><CheckCircle size={14}/> OK</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VENDAS */}
      {activeTab === 'vendas' && (
        <div className="bg-white border border-zinc-200 shadow-sm rounded-md overflow-hidden">
          <div className="p-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50">
            <h3 className="font-bold text-zinc-800 uppercase tracking-wide">Comercialização Agrícola</h3>
            <button onClick={() => setShowForm('vendas')} className="bg-[#003366] text-white px-4 py-2 text-xs font-bold uppercase tracking-widest flex items-center gap-2 rounded-sm transition-colors hover:bg-blue-900">
              <Plus size={16} /> Nova Venda
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#003366] text-white text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Data Venda</th>
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3">Comprador / Cliente</th>
                  <th className="px-4 py-3 text-right">Qtd</th>
                  <th className="px-4 py-3 text-right">Valor Total</th>
                  <th className="px-4 py-3 text-center">Estado Financeiro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filterData(vendas, 'produto').map((v: any) => (
                  <tr key={v.id} className="hover:bg-zinc-50 transition-colors text-sm">
                    <td className="px-4 py-3 text-zinc-600">{v.data}</td>
                    <td className="px-4 py-3 font-bold text-zinc-800">{v.produto}</td>
                    <td className="px-4 py-3 text-zinc-600">{v.cliente}</td>
                    <td className="px-4 py-3 text-right font-mono">{v.qtd} {v.unid}</td>
                    <td className="px-4 py-3 text-right font-bold text-[#003366]">{new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(v.valor)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 text-[10px] uppercase font-bold tracking-wider rounded-sm ${v.status === 'Pago' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>{v.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'maquinaria' && (
        <div className="bg-white border border-zinc-200 shadow-sm rounded-md overflow-hidden">
          <div className="p-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50">
            <h3 className="font-bold text-zinc-800 uppercase tracking-wide">Frota & Maquinaria Agrícola</h3>
            <button className="bg-[#003366] text-white px-4 py-2 text-xs font-bold uppercase tracking-widest flex items-center gap-2 rounded-sm transition-colors hover:bg-blue-900">
              <Plus size={16} /> Novo Veículo
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#003366] text-white text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Equipamento</th>
                  <th className="px-4 py-3">Status Atual</th>
                  <th className="px-4 py-3 text-right">Horas de Uso</th>
                  <th className="px-4 py-3 text-right">Consumo Méd.</th>
                  <th className="px-4 py-3">Próx. Manutenção</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {maquinaria.map(m => (
                  <tr key={m.id} className="hover:bg-zinc-50 text-sm">
                    <td className="px-4 py-3 font-bold text-zinc-800">{m.nome}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-sm ${m.status === 'Operacional' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>{m.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-600">{m.horas} h</td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-600">{m.consumo}</td>
                    <td className="px-4 py-3 text-zinc-500">{m.manutencao}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'clima' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 border border-zinc-200 shadow-sm rounded-md">
            <h3 className="font-bold text-[#003366] uppercase text-sm mb-4">Monitoramento Meteorológico (Simulado)</h3>
            <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-md">
              <div className="flex items-center gap-4">
                <div className="text-blue-600 text-5xl font-black">28°C</div>
                <div>
                  <p className="font-bold text-blue-900">Huambo, Angola</p>
                  <p className="text-xs text-blue-700">Céu Limpo • Humidade: 45%</p>
                </div>
              </div>
              <Activity size={40} className="text-blue-400 opacity-30" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="text-center p-2 bg-zinc-50 border border-zinc-100">
                <p className="text-[10px] font-bold text-zinc-400 uppercase">Precipitação</p>
                <p className="font-black text-zinc-800 text-lg">5mm</p>
              </div>
              <div className="text-center p-2 bg-zinc-50 border border-zinc-100">
                <p className="text-[10px] font-bold text-zinc-400 uppercase">Vento</p>
                <p className="font-black text-zinc-800 text-lg">12km/h</p>
              </div>
              <div className="text-center p-2 bg-zinc-50 border border-zinc-100">
                <p className="text-[10px] font-bold text-zinc-400 uppercase">Pressão</p>
                <p className="font-black text-zinc-800 text-lg">1012hPa</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 border border-zinc-200 shadow-sm rounded-md">
            <h3 className="font-bold text-[#003366] uppercase text-sm mb-4">Controlo de Rega</h3>
            <p className="text-xs text-zinc-500 mb-4 italic">Defina os horários de ativação dos pivôs centrais e gotejamento.</p>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 border border-zinc-100 bg-zinc-50">
                <span className="font-bold text-sm text-zinc-700">Pivô Central 01 (Milho)</span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">Ativo</span>
              </div>
              <div className="flex justify-between items-center p-3 border border-zinc-100 bg-zinc-50 opacity-60">
                <span className="font-bold text-sm text-zinc-700">Gotejamento Lote 12</span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-zinc-200 text-zinc-600 rounded-full">Desligado</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'relatorios' && (
        <div className="bg-white p-12 border border-zinc-200 shadow-sm rounded-md text-center">
          <BarChart3 size={48} className="mx-auto text-emerald-600/30 mb-4" />
          <h3 className="font-black text-emerald-900 text-xl uppercase tracking-tighter">Relatórios de Produtividade</h3>
          <p className="text-zinc-500 text-sm mt-2 max-w-md mx-auto">Gere relatórios detalhados de rendimento por hectare, custo de produção vs faturado e previsões de colheita baseadas no clima.</p>
          <div className="mt-8 flex justify-center gap-4">
            <button className="px-6 py-2 bg-emerald-600 text-white font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-700 transition-colors">
              <Download size={14} /> PDF Safra 2025
            </button>
            <button className="px-6 py-2 bg-zinc-800 text-white font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-colors">
              <Download size={14} /> CSV Inventário
            </button>
          </div>
        </div>
      )}

      {/* MODALS */}
      <AnimatePresence>
        {showForm && (
          <div className={bgModal}>
            <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b border-zinc-100 bg-[#003366] text-white flex justify-between items-center">
                <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                  <Plus size={16} /> 
                  {showForm === 'culturas' && 'Registar Nova Cultura'}
                  {showForm === 'pecuaria' && 'Registar Novo Lote de Animais'}
                  {showForm === 'insumos' && 'Adicionar ao Stock de Insumos'}
                  {showForm === 'vendas' && 'Registar Comercialização'}
                </h3>
              </div>
              <div className="p-6 overflow-y-auto w-full">
                {/* FORMS */}
                {showForm === 'culturas' && (
                  <form onSubmit={(e) => { e.preventDefault(); setCulturas([...culturas, {...formCultura, id: Date.now()}]); setShowForm(null); }} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="text-[10px] font-bold text-zinc-500 uppercase">Variedade / Cultura</label><input required value={formCultura.nome} onChange={e=>setFormCultura({...formCultura, nome: e.target.value})} className="w-full bg-zinc-50 border border-zinc-300 p-2 text-sm focus:border-emerald-600 outline-none" /></div>
                      <div><label className="text-[10px] font-bold text-zinc-500 uppercase">Fazenda/Lote</label><input required value={formCultura.fazenda} onChange={e=>setFormCultura({...formCultura, fazenda: e.target.value})} className="w-full bg-zinc-50 border border-zinc-300 p-2 text-sm focus:border-emerald-600 outline-none" /></div>
                      <div><label className="text-[10px] font-bold text-zinc-500 uppercase">Hectares (ha)</label><input required type="number" value={formCultura.area} onChange={e=>setFormCultura({...formCultura, area: e.target.value})} className="w-full bg-zinc-50 border border-zinc-300 p-2 text-sm focus:border-emerald-600 outline-none" /></div>
                      <div><label className="text-[10px] font-bold text-zinc-500 uppercase">Est. Rendimento (Ton)</label><input type="number" value={formCultura.estRendimento} onChange={e=>setFormCultura({...formCultura, estRendimento: e.target.value})} className="w-full bg-zinc-50 border border-zinc-300 p-2 text-sm focus:border-emerald-600 outline-none" /></div>
                      <div><label className="text-[10px] font-bold text-zinc-500 uppercase">Data Plantação</label><input required type="date" value={formCultura.plantio} onChange={e=>setFormCultura({...formCultura, plantio: e.target.value})} className="w-full bg-zinc-50 border border-zinc-300 p-2 text-sm focus:border-emerald-600 outline-none" /></div>
                      <div><label className="text-[10px] font-bold text-zinc-500 uppercase">Previsão Colheita</label><input required type="date" value={formCultura.colheitaPrev} onChange={e=>setFormCultura({...formCultura, colheitaPrev: e.target.value})} className="w-full bg-zinc-50 border border-zinc-300 p-2 text-sm focus:border-emerald-600 outline-none" /></div>
                    </div>
                    <div className="flex justify-end gap-3 pt-6"><button type="button" onClick={()=>setShowForm(null)} className="px-6 py-2 text-zinc-600 font-bold text-xs uppercase bg-zinc-100 hover:bg-zinc-200">Cancelar</button><button type="submit" className="px-6 py-2 text-white font-bold text-xs uppercase bg-emerald-600 hover:bg-emerald-700">Salvar Rígisto</button></div>
                  </form>
                )}

                {showForm === 'pecuaria' && (
                  <form onSubmit={(e) => { e.preventDefault(); setAnimais([...animais, {...formAnimal, id: Date.now()}]); setShowForm(null); }} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="text-[10px] font-bold text-zinc-500 uppercase">Tipo/Raça</label><input required value={formAnimal.tipo} onChange={e=>setFormAnimal({...formAnimal, tipo: e.target.value})} className="w-full bg-zinc-50 border border-zinc-300 p-2 text-sm focus:border-amber-600 outline-none" /></div>
                      <div><label className="text-[10px] font-bold text-zinc-500 uppercase">Quantidade (Cabeças)</label><input required type="number" value={formAnimal.quantidade} onChange={e=>setFormAnimal({...formAnimal, quantidade: e.target.value})} className="w-full bg-zinc-50 border border-zinc-300 p-2 text-sm focus:border-amber-600 outline-none" /></div>
                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">Propósito</label>
                        <select required value={formAnimal.proposito} onChange={e=>setFormAnimal({...formAnimal, proposito: e.target.value})} className="w-full bg-zinc-50 border border-zinc-300 p-2 text-sm focus:border-amber-600 outline-none">
                          <option>Corte</option><option>Leite</option><option>Ovos</option><option>Reprodução</option>
                        </select>
                      </div>
                      <div><label className="text-[10px] font-bold text-zinc-500 uppercase">Fazenda / Local</label><input required value={formAnimal.local} onChange={e=>setFormAnimal({...formAnimal, local: e.target.value})} className="w-full bg-zinc-50 border border-zinc-300 p-2 text-sm focus:border-amber-600 outline-none" /></div>
                      <div><label className="text-[10px] font-bold text-zinc-500 uppercase">Última Vacinação</label><input type="date" value={formAnimal.vacinacao} onChange={e=>setFormAnimal({...formAnimal, vacinacao: e.target.value})} className="w-full bg-zinc-50 border border-zinc-300 p-2 text-sm focus:border-amber-600 outline-none" /></div>
                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">Estado Saúde</label>
                        <select value={formAnimal.status} onChange={e=>setFormAnimal({...formAnimal, status: e.target.value})} className="w-full bg-zinc-50 border border-zinc-300 p-2 text-sm focus:border-amber-600 outline-none">
                          <option>Saudável</option><option>Atenção</option><option>Quarentena</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-6"><button type="button" onClick={()=>setShowForm(null)} className="px-6 py-2 text-zinc-600 font-bold text-xs uppercase bg-zinc-100 hover:bg-zinc-200">Cancelar</button><button type="submit" className="px-6 py-2 text-white font-bold text-xs uppercase bg-amber-600 hover:bg-amber-700">Salvar Rígisto</button></div>
                  </form>
                )}

                {showForm === 'insumos' && (
                  <form onSubmit={(e) => { e.preventDefault(); setInsumos([...insumos, {...formInsumo, id: Date.now()}]); setShowForm(null); }} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2"><label className="text-[10px] font-bold text-zinc-500 uppercase">Nome do Insumo</label><input required value={formInsumo.nome} onChange={e=>setFormInsumo({...formInsumo, nome: e.target.value})} className="w-full bg-zinc-50 border border-zinc-300 p-2 text-sm focus:border-blue-600 outline-none" /></div>
                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">Categoria</label>
                        <select required value={formInsumo.categoria} onChange={e=>setFormInsumo({...formInsumo, categoria: e.target.value})} className="w-full bg-zinc-50 border border-zinc-300 p-2 text-sm focus:border-blue-600 outline-none">
                          <option>Semente</option><option>Fertilizante</option><option>Defensivo (Agro-tóxico)</option><option>Ração</option><option>Ferramenta</option>
                        </select>
                      </div>
                      <div><label className="text-[10px] font-bold text-zinc-500 uppercase">Localização (Armazém)</label><input required value={formInsumo.local} onChange={e=>setFormInsumo({...formInsumo, local: e.target.value})} className="w-full bg-zinc-50 border border-zinc-300 p-2 text-sm focus:border-blue-600 outline-none" /></div>
                      <div className="grid grid-cols-2 gap-2">
                        <div><label className="text-[10px] font-bold text-zinc-500 uppercase">Qtd Atual</label><input required type="number" value={formInsumo.qtd} onChange={e=>setFormInsumo({...formInsumo, qtd: e.target.value})} className="w-full bg-zinc-50 border border-zinc-300 p-2 text-sm focus:border-blue-600 outline-none" /></div>
                        <div><label className="text-[10px] font-bold text-zinc-500 uppercase">Unidade</label><input required value={formInsumo.unid} onChange={e=>setFormInsumo({...formInsumo, unid: e.target.value})} placeholder="kg, L, cx" className="w-full bg-zinc-50 border border-zinc-300 p-2 text-sm focus:border-blue-600 outline-none" /></div>
                      </div>
                      <div><label className="text-[10px] font-bold text-zinc-500 uppercase">Stock Mínimo (Alerta)</label><input required type="number" value={formInsumo.min} onChange={e=>setFormInsumo({...formInsumo, min: e.target.value})} className="w-full bg-zinc-50 border border-zinc-300 p-2 text-sm focus:border-blue-600 outline-none" /></div>
                    </div>
                    <div className="flex justify-end gap-3 pt-6"><button type="button" onClick={()=>setShowForm(null)} className="px-6 py-2 text-zinc-600 font-bold text-xs uppercase bg-zinc-100 hover:bg-zinc-200">Cancelar</button><button type="submit" className="px-6 py-2 text-white font-bold text-xs uppercase bg-blue-600 hover:bg-blue-700">Salvar Rígisto</button></div>
                  </form>
                )}

                {showForm === 'vendas' && (
                  <form onSubmit={(e) => { e.preventDefault(); setVendas([...vendas, {...formVenda, id: Date.now()}]); setShowForm(null); }} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="text-[10px] font-bold text-zinc-500 uppercase">Produto / Cultura Ofertada</label><input required value={formVenda.produto} onChange={e=>setFormVenda({...formVenda, produto: e.target.value})} className="w-full bg-zinc-50 border border-zinc-300 p-2 text-sm focus:border-[#003366] outline-none" /></div>
                      <div><label className="text-[10px] font-bold text-zinc-500 uppercase">Comprador / Empresa</label><input required value={formVenda.cliente} onChange={e=>setFormVenda({...formVenda, cliente: e.target.value})} className="w-full bg-zinc-50 border border-zinc-300 p-2 text-sm focus:border-[#003366] outline-none" /></div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div><label className="text-[10px] font-bold text-zinc-500 uppercase">Qtd Vendida</label><input required type="number" value={formVenda.qtd} onChange={e=>setFormVenda({...formVenda, qtd: e.target.value})} className="w-full bg-zinc-50 border border-zinc-300 p-2 text-sm focus:border-[#003366] outline-none" /></div>
                        <div><label className="text-[10px] font-bold text-zinc-500 uppercase">Unidade</label><input required value={formVenda.unid} onChange={e=>setFormVenda({...formVenda, unid: e.target.value})} placeholder="Ton, Saco" className="w-full bg-zinc-50 border border-zinc-300 p-2 text-sm focus:border-[#003366] outline-none" /></div>
                      </div>

                      <div><label className="text-[10px] font-bold text-zinc-500 uppercase">Valor Total (AOA)</label><input required type="number" value={formVenda.valor} onChange={e=>setFormVenda({...formVenda, valor: e.target.value})} className="w-full bg-zinc-50 border border-zinc-300 p-2 text-sm focus:border-[#003366] outline-none" /></div>
                      <div><label className="text-[10px] font-bold text-zinc-500 uppercase">Data da Venda</label><input required type="date" value={formVenda.data} onChange={e=>setFormVenda({...formVenda, data: e.target.value})} className="w-full bg-zinc-50 border border-zinc-300 p-2 text-sm focus:border-[#003366] outline-none" /></div>
                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">Status Pagamento</label>
                        <select required value={formVenda.status} onChange={e=>setFormVenda({...formVenda, status: e.target.value})} className="w-full bg-zinc-50 border border-zinc-300 p-2 text-sm focus:border-[#003366] outline-none">
                          <option>Pago</option><option>Pendente</option><option>Cancelado</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-6"><button type="button" onClick={()=>setShowForm(null)} className="px-6 py-2 text-zinc-600 font-bold text-xs uppercase bg-zinc-100 hover:bg-zinc-200">Cancelar</button><button type="submit" className="px-6 py-2 text-white font-bold text-xs uppercase bg-[#003366] hover:bg-blue-900">Salvar Rígisto</button></div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
