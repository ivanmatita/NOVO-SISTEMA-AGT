import React, { useState, useMemo, useEffect } from 'react';
import { 
    Truck, AlertTriangle, Calendar, Settings, Plus, Wrench, FileText, 
    Search, Filter, Fuel, Shield, MapPin, ClipboardList, TrendingUp,
    MoreVertical, Edit, Trash2, History, CheckCircle2, AlertCircle, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchWithAuth } from '../lib/fetchWithAuth';
import { useAuth } from '../contexts/AuthContext';

// --- Types ---

interface Vehicle {
    id: number;
    make: string;
    model: string;
    plate: string;
    year: number;
    status: 'Ativo' | 'Manutenção' | 'Inativo' | 'Vendido';
    vin: string;
    fuelType: 'Diesel' | 'Gasolina' | 'Elétrico';
    odometer: number;
    lastService: string;
    nextService: string;
    driver?: string;
}

interface MaintenanceTask {
    id: number;
    vehicleId: number;
    date: string;
    description: string;
    type: 'Preventiva' | 'Correctiva' | 'Pneus' | 'Limpeza';
    cost: number;
    shop: string;
    status: 'Concluído' | 'Em Curso' | 'Agendado';
}

interface FuelLog {
    id: number;
    vehicleId: number;
    date: string;
    liters: number;
    cost: number;
    odometer: number;
    location: string;
}

// --- Initial Mock Data ---

const initialVehicles: Vehicle[] = [
    { id: 1, make: 'Toyota', model: 'Hilux', plate: 'LD-45-88-AB', year: 2022, status: 'Ativo', vin: 'TJT123456789', fuelType: 'Diesel', odometer: 45200, lastService: '2026-03-15', nextService: '2026-09-15', driver: 'António Silva' },
    { id: 2, make: 'Ford', model: 'Ranger', plate: 'LD-12-33-XY', year: 2021, status: 'Manutenção', vin: 'FD888222111', fuelType: 'Diesel', odometer: 68000, lastService: '2026-02-10', nextService: '2026-05-10', driver: 'Carlos Manuel' },
    { id: 3, make: 'Tesla', model: 'Model 3', plate: 'LD-00-01-EV', year: 2023, status: 'Ativo', vin: 'TSL999000111', fuelType: 'Elétrico', odometer: 12000, lastService: '2026-01-05', nextService: '2027-01-05', driver: 'Luísa Santos' },
];

const initialMaintenance: MaintenanceTask[] = [
    { id: 1, vehicleId: 1, date: '2026-03-15', description: 'Revisão dos 45.000km', type: 'Preventiva', cost: 12500, shop: 'Toyota Luanda', status: 'Concluído' },
    { id: 2, vehicleId: 2, date: '2026-04-18', description: 'Troca de Injectores', type: 'Correctiva', cost: 45000, shop: 'Auto-Mecânica F&G', status: 'Em Curso' },
];

const initialFuel: FuelLog[] = [
    { id: 1, vehicleId: 1, date: '2026-04-10', liters: 75, cost: 13500, odometer: 44900, location: 'Sonangol Talatona' },
    { id: 2, vehicleId: 1, date: '2026-04-15', liters: 60, cost: 10800, odometer: 45200, location: 'Pumangol Morro Bento' },
];

// --- Sub-Components ---

const StatCard = ({ title, value, sub, icon: Icon, color }: any) => (
    <div className="bg-white p-6 border border-zinc-200 shadow-sm flex items-start justify-between">
        <div>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">{title}</p>
            <p className="text-2xl font-bold text-[#003366]">{value}</p>
            {sub && <p className="text-xs text-zinc-400 mt-1">{sub}</p>}
        </div>
        <div className={`p-3 border border-zinc-100 ${color.replace('bg-', 'text-bg-').replace('text-bg-', 'text-')} bg-zinc-50`}>
            <Icon size={20} />
        </div>
    </div>
);

const FleetManagementModule = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'overview' | 'vehicles' | 'maintenance' | 'fuel' | 'reports'>('overview');
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [maintenance, setMaintenance] = useState<MaintenanceTask[]>([]);
    const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddingVehicle, setIsAddingVehicle] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

    const fetchData = async () => {
        try {
            const vRes = await fetchWithAuth(`/api/fleet?empresa_id=${user?.empresa_id}`);
            if (vRes.ok) setVehicles(await vRes.json());
            
            // For now maintenance and fuel are part of overall fleet logic or separate endpoints
            // I'll keep them as mock or assume they come from specific routes if added
            setMaintenance(initialMaintenance);
            setFuelLogs(initialFuel);
        } catch (err) {
            console.error('Error fetching fleet data:', err);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user?.empresa_id]);

    const handleAddVehicle = async (e: React.FormEvent) => {
        e.preventDefault();
        const target = e.target as any;
        try {
            const res = await fetchWithAuth('/api/fleet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    make: target.make.value,
                    model: target.model.value,
                    plate: target.plate.value,
                    year: Number(target.year.value),
                    fuelType: target.fuelType.value,
                    status: 'Ativo',
                    odometer: 0,
                    empresa_id: user?.empresa_id,
                    vin: `VIN-${Math.random().toString(36).substring(7).toUpperCase()}`
                })
            });
            if (res.ok) {
                fetchData();
                setIsAddingVehicle(false);
            }
        } catch (err) {
            console.error('Error adding vehicle:', err);
        }
    };

    // Filter Logic
    const filteredVehicles = vehicles.filter(v => 
        v.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.model.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const metrics = useMemo(() => {
        const total = vehicles.length;
        const inMaint = vehicles.filter(v => v.status === 'Manutenção').length;
        const totalCostMaint = maintenance.reduce((acc, curr) => acc + curr.cost, 0);
        const totalCostFuel = fuelLogs.reduce((acc, curr) => acc + curr.cost, 0);
        
        return { total, maintenance: inMaint, totalCostMaint, totalCostFuel };
    }, [vehicles, maintenance, fuelLogs]);

    const renderVehicleDetail = (vehicle: Vehicle) => (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
             <div className="bg-white p-6 border border-zinc-200 shadow-sm flex flex-col md:flex-row gap-8 items-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-[#003366]"></div>
                <div className="w-24 h-24 bg-zinc-900 border-4 border-white shadow-lg flex items-center justify-center">
                    <Truck size={48} className="text-white"/>
                </div>
                <div className="flex-1 text-center md:text-left">
                    <div className="flex items-center gap-4 mb-2 justify-center md:justify-start">
                        <h3 className="text-3xl font-black text-[#003366] uppercase tracking-tighter">{vehicle.make} {vehicle.model}</h3>
                        <div className="bg-zinc-800 text-white px-3 py-1 text-xs tracking-widest">{vehicle.plate}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em] justify-center md:justify-start">
                        <span>VIN: {vehicle.vin}</span>
                        <span>•</span>
                        <span>Combustível: {vehicle.fuelType}</span>
                        <span>•</span>
                        <span>Ano: {vehicle.year}</span>
                    </div>
                </div>
                <button onClick={() => setSelectedVehicle(null)} className="px-6 py-2.5 border border-zinc-300 text-zinc-600 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-zinc-50 transition-all">
                    Voltar à Frota Geral
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    {/* Performance Charts */}
                    <div className="bg-white p-6 border border-zinc-200 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h4 className="text-lg font-bold text-[#003366] uppercase">Histórico de Utilização</h4>
                            <div className="flex gap-2">
                                <div className="px-3 py-1 bg-blue-50 text-blue-800 text-[10px] font-bold uppercase border border-blue-200">KM</div>
                                <div className="px-3 py-1 bg-zinc-50 text-zinc-600 text-[10px] font-bold uppercase border border-zinc-200">Consumo</div>
                            </div>
                        </div>
                        <div className="h-48 flex items-end gap-2 px-2">
                            {[45, 60, 48, 70, 85, 95, 65, 80, 75, 90, 100, 85].map((val, i) => (
                                <div key={i} className="flex-1 bg-[#003366] rounded-t-lg transition-all hover:bg-blue-600 cursor-help" style={{ height: `${val}%` }} title={`Mês ${i+1}: ${val*200} KM`}></div>
                            ))}
                        </div>
                        <div className="flex justify-between mt-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                            <span>Jan</span>
                            <span>Dez</span>
                        </div>
                    </div>

                    {/* Maintenance History */}
                    <div className="bg-white p-6 border border-zinc-200 shadow-sm">
                        <h4 className="text-lg font-bold text-[#003366] uppercase mb-6">Ordens de Serviço Ativas</h4>
                        <div className="space-y-3">
                            {initialMaintenance.filter(m => m.vehicleId === vehicle.id).map(log => (
                                <div key={log.id} className="flex items-center justify-between p-4 border border-zinc-100 hover:bg-zinc-50 transition-colors border-l-4 border-l-[#003366]">
                                    <div>
                                        <p className="font-black text-zinc-800 uppercase tracking-tight italic mb-1">{log.description}</p>
                                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest leading-none">{log.date} • {log.shop}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-zinc-900">{log.cost.toLocaleString()} Kz</p>
                                        <p className="text-[9px] font-black text-blue-500 uppercase">{log.status}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Aligned Info Card */}
                    <div className="bg-[#003366] text-white p-6 shadow-sm relative overflow-hidden">
                        <div className="absolute bottom-0 right-0 w-32 h-32 bg-white opacity-5"></div>
                        <h4 className="text-[10px] font-bold uppercase tracking-widest mb-6 opacity-80">Operacional Stats</h4>
                        <div className="space-y-6">
                            <div>
                                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-1">Odomêtro</p>
                                <p className="text-3xl font-bold">{vehicle.odometer.toLocaleString()} <span className="text-sm font-normal">KM</span></p>
                            </div>
                            <div>
                                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-1">Motorista Alocado</p>
                                <p className="text-xl font-bold">{vehicle.driver || 'Pool Central'}</p>
                            </div>
                        </div>
                        <div className="mt-8 space-y-2">
                             <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest opacity-80">
                                <span>Próxima Inspeção</span>
                                <span>{vehicle.nextService}</span>
                             </div>
                             <div className="h-1.5 w-full bg-white/20 overflow-hidden">
                                <div className="h-full bg-emerald-500 w-3/4"></div>
                             </div>
                        </div>
                    </div>

                    {/* Quick Logs */}
                    <div className="bg-white p-6 border border-zinc-200 shadow-sm">
                        <h4 className="text-lg font-bold text-[#003366] uppercase mb-4">Últimos Abastecimentos</h4>
                        <div className="space-y-3">
                            {initialFuel.filter(f => f.vehicleId === vehicle.id).map(fuel => (
                                <div key={fuel.id} className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-zinc-100 flex items-center justify-center text-zinc-500 border border-zinc-200">
                                        <Fuel size={18}/>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs font-black text-zinc-800">{fuel.location}</p>
                                        <p className="text-[10px] text-zinc-400">{fuel.date} • {fuel.liters}L</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderOverview = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Frota Total" value={metrics.total} sub="Veículos Registados" icon={Truck} color="bg-blue-600" />
                <StatCard title="Em Manutenção" value={metrics.maintenance} sub="Aguardando Intervenção" icon={Wrench} color="bg-orange-500" />
                <StatCard title="Gastos Manutenção" value={`${metrics.totalCostMaint.toLocaleString()} Kz`} sub="Mês de Abril" icon={ClipboardList} color="bg-red-500" />
                <StatCard title="Gastos Combustível" value={`${metrics.totalCostFuel.toLocaleString()} Kz`} sub="Últimos 30 dias" icon={Fuel} color="bg-emerald-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white border border-zinc-200 p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-[#003366] uppercase text-sm">Estado Crítico da Frota</h3>
                        <TrendingUp size={18} className="text-zinc-400" />
                    </div>
                    <div className="space-y-4">
                        {initialVehicles.map(v => (
                            <div key={v.id} className="flex items-center justify-between p-4 border border-zinc-100 hover:bg-zinc-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 border ${v.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                        <Truck size={20} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-zinc-800">{v.make} {v.model}</p>
                                        <p className="text-[10px] text-zinc-400 font-mono">{v.plate} • {v.vin}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-zinc-900">{v.odometer.toLocaleString()} KM</p>
                                    <p className="text-[10px] text-zinc-400 uppercase">Odomêtro Atual</p>
                                </div>
                                <div className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
                                    v.status === 'Ativo' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 border' : 'bg-orange-50 text-orange-700 border-orange-200 border'
                                }`}>
                                    {v.status}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white border border-zinc-200 p-6 shadow-sm flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-[#003366] uppercase text-sm">Avisos de Seguro / Inspeção</h3>
                        <Shield size={18} className="text-zinc-400" />
                    </div>
                    <div className="flex-1 space-y-4">
                        <div className="p-4 bg-red-50 border border-red-100 flex items-center gap-3">
                            <AlertTriangle className="text-red-600" size={24} />
                            <div>
                                <p className="text-xs font-bold text-red-800 uppercase tracking-tight">Seguro a Expirar</p>
                                <p className="text-[10px] text-red-600 font-medium">Hilux LD-45-88-AB (Em 5 dias)</p>
                            </div>
                        </div>
                        <div className="p-4 bg-orange-50 border border-orange-100 flex items-center gap-3">
                            <Calendar className="text-orange-600" size={24} />
                            <div>
                                <p className="text-xs font-bold text-orange-800 uppercase tracking-tight">Inspeção SFT</p>
                                <p className="text-[10px] text-orange-600 font-medium">Tesla LD-00-01-EV (Em 22 dias)</p>
                            </div>
                        </div>
                    </div>
                    <button className="mt-6 w-full py-2 bg-zinc-100 border border-zinc-300 text-zinc-700 text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-200 transition-all">Ver Todos os Alertas</button>
                </div>
            </div>
        </div>
    );

    const renderVehicles = () => (
        <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-4 border-b border-zinc-200 bg-white flex justify-between items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Pesquisar por Matrícula ou Modelo..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-300 outline-none focus:border-[#003366] transition-all text-sm"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button className="p-2 bg-white border border-zinc-300 text-zinc-500 hover:bg-zinc-100 transition-all"><Filter size={20}/></button>
                    <button onClick={() => setIsAddingVehicle(true)} className="bg-[#003366] text-white px-6 py-2.5 text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-sm hover:bg-[#002244] active:scale-95 transition-all">
                        <Plus size={18}/> Novo Veículo
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead>
                        <tr className="text-[10px] font-bold uppercase text-zinc-500 border-b border-zinc-200 tracking-widest">
                            <th className="px-6 py-4">Veículo</th>
                            <th className="px-6 py-4">Informação Técnica</th>
                            <th className="px-6 py-4">Motorista Alocado</th>
                            <th className="px-6 py-4">Status Frota</th>
                            <th className="px-6 py-4 text-right">Manutenção</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                        {filteredVehicles.map(v => (
                            <tr key={v.id} className="hover:bg-zinc-50/80 transition-colors group cursor-pointer" onClick={() => setSelectedVehicle(v)}>
                                <td className="px-6 py-5">
                                    <div className="font-bold text-[#003366] uppercase text-base">{v.make} {v.model}</div>
                                    <div className="inline-block border border-zinc-300 bg-white text-zinc-700 px-2 py-0.5 font-mono text-xs mt-1">{v.plate}</div>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="text-zinc-600 font-bold">{v.year} • {v.fuelType}</div>
                                    <div className="text-[10px] text-zinc-400 uppercase tracking-widest mt-0.5">KM: {v.odometer.toLocaleString()}</div>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 border border-zinc-300 bg-zinc-50 flex items-center justify-center text-[#003366] font-bold text-xs">
                                            {v.driver?.split(' ').map(n=>n[0]).join('')}
                                        </div>
                                        <div className="text-xs font-bold text-zinc-700">{v.driver || 'Não Alocado'}</div>
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <span className={`px-2 py-1 border text-[10px] font-bold uppercase tracking-widest ${
                                        v.status === 'Ativo' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                                        v.status === 'Manutenção' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-red-50 text-red-700 border-red-200'
                                    }`}>
                                        {v.status}
                                    </span>
                                </td>
                                <td className="px-6 py-5 text-right">
                                    <div className="text-xs font-bold text-zinc-800">Próxima: {v.nextService}</div>
                                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Última: {v.lastService}</div>
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
            <div className="flex justify-between items-center bg-white p-6 border border-zinc-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#003366] text-white flex items-center justify-center shadow-sm">
                        <Truck size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-[#003366] tracking-tight">Gestão de Frotas</h2>
                        <p className="text-zinc-500 max-w-2xl text-xs font-medium uppercase tracking-widest">Controlo integrado de veículos, combustível e alertas.</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button className="px-6 py-2.5 bg-white border border-zinc-300 text-zinc-700 text-xs font-bold uppercase tracking-widest hover:bg-zinc-50 transition-all flex items-center gap-2">
                        <MapPin size={16} /> Ver no Mapa
                    </button>
                    <button onClick={() => setIsAddingVehicle(true)} className="px-6 py-2.5 bg-[#003366] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#002244] transition-all flex items-center gap-2">
                        <Plus size={16} /> Novo Ativo
                    </button>
                </div>
            </div>
            
            <div className="flex border-b border-zinc-200 bg-white">
                {[
                    { id: 'overview', label: 'Monitorização', icon: <TrendingUp size={16}/> },
                    { id: 'vehicles', label: 'Lista de Frota', icon: <Truck size={16}/> },
                    { id: 'maintenance', label: 'Oficinas & Reparos', icon: <Wrench size={16}/> },
                    { id: 'fuel', label: 'Combustível', icon: <Fuel size={16}/> },
                    { id: 'reports', label: 'Relatórios Operacionais', icon: <FileText size={16}/> }
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
                {selectedVehicle ? (
                    renderVehicleDetail(selectedVehicle)
                ) : (
                    <>
                        {activeTab === 'overview' && renderOverview()}
                        {activeTab === 'vehicles' && renderVehicles()}
                        {activeTab === 'maintenance' && (
                            <div className="bg-white border border-zinc-200 p-16 text-center shadow-sm animate-in fade-in zoom-in-95">
                                <div className="w-16 h-16 bg-orange-50 text-orange-500 flex items-center justify-center mx-auto mb-6"><Wrench size={32}/></div>
                                <h3 className="text-xl font-bold text-[#003366] uppercase mb-4 tracking-tight">Registo de Manutenção Correctiva</h3>
                                <p className="text-zinc-500 max-w-md mx-auto text-sm">Registe facturas de oficinas externas, anexe fotos de peças e orçamentos directamente na ficha de cada veículo.</p>
                                <div className="mt-8 flex flex-wrap justify-center gap-4">
                                    <button className="px-6 py-2.5 bg-[#003366] text-white text-xs font-bold uppercase tracking-widest shadow-sm">Nova Ordem</button>
                                    <button className="px-6 py-2.5 bg-white border border-zinc-300 text-zinc-700 text-xs font-bold uppercase tracking-widest hover:bg-zinc-50">Histórico de Gastos</button>
                                </div>
                            </div>
                        )}
                        {activeTab === 'fuel' && (
                            <div className="bg-white border border-zinc-200 p-16 text-center shadow-sm animate-in fade-in zoom-in-95">
                                <div className="w-16 h-16 bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto mb-6"><Fuel size={32}/></div>
                                <h3 className="text-xl font-bold text-[#003366] uppercase mb-4 tracking-tight">Controlo de Consumos e Abastecimentos</h3>
                                <p className="text-zinc-500 max-w-md mx-auto text-sm">Controle a média de consumo por 100km e detecte desvios em tempo real. Integração com cartões Sonangol.</p>
                                <button className="mt-8 px-6 py-2.5 bg-[#003366] text-white text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-[#002244]">Novo Ticket</button>
                            </div>
                        )}
                        {activeTab === 'reports' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {[
                                    { title: 'Análise de Custos TCO', desc: 'Total Cost of Ownership - Histórico completo por veículo.', icon: TrendingUp },
                                    { title: 'Utilização de Frota', desc: 'Relatório de KMs percorridos e tempo em marcha.', icon: Truck },
                                    { title: 'Próximas Manutenções', desc: 'Calendário de revisas preventivas agendadas.', icon: ClipboardList },
                                    { title: 'Gastos por Motorista', desc: 'Verificação de eficiência de condução por utilizador.', icon: MapPin },
                                    { title: 'Ficha de Inspeção', desc: 'Registo de check-lists diários (Pre-flight check).', icon: ClipboardList },
                                ].map((rep, idx) => (
                                    <div key={idx} className="bg-white p-6 border border-zinc-200 shadow-sm hover:border-blue-300 transition-all group flex flex-col cursor-pointer">
                                        <div className="p-3 border border-blue-100 text-[#003366] bg-blue-50 self-start mb-4"><rep.icon size={20}/></div>
                                        <h4 className="font-bold text-[#003366] uppercase tracking-tight mb-2 text-sm">{rep.title}</h4>
                                        <p className="text-xs text-zinc-500 flex-1 leading-relaxed">{rep.desc}</p>
                                        <button className="mt-6 text-[10px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all">Gerar Relatório <TrendingUp size={14}/></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modal placeholder */}
            <AnimatePresence>
                {isAddingVehicle && (
                    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" onClick={() => setIsAddingVehicle(false)}></div>
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="bg-white shadow-xl w-full max-w-2xl border border-zinc-200 relative z-10"
                        >
                            <div className="flex justify-between items-center p-6 border-b border-zinc-200 bg-zinc-50">
                                <h3 className="font-bold text-[#003366] uppercase text-sm tracking-widest flex items-center gap-2"><Plus size={18} /> Adicionar Novo Ativo à Frota</h3>
                                <button onClick={() => setIsAddingVehicle(false)} className="text-zinc-400 hover:text-red-500 transition-colors"><X size={24}/></button>
                            </div>
                            <form onSubmit={handleAddVehicle} className="p-6 space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Marca / Fabricante</label>
                                        <input name="make" required type="text" className="w-full bg-white border border-zinc-300 px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366] transition-all" placeholder="Ex: Mercedes-Benz" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Modelo</label>
                                        <input name="model" required type="text" className="w-full bg-white border border-zinc-300 px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366] transition-all" placeholder="Ex: Actros" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Matrícula</label>
                                        <input name="plate" required type="text" className="w-full bg-white border border-zinc-300 px-4 py-2.5 text-sm uppercase focus:outline-none focus:border-[#003366]" placeholder="XX-00-XX" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Ano</label>
                                        <input name="year" required type="number" className="w-full bg-white border border-zinc-300 px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366]" placeholder="2024" />
                                    </div>
                                    <div className="space-y-1 col-span-2">
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Combustível</label>
                                        <select name="fuelType" className="w-full bg-white border border-zinc-300 px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366]">
                                            <option>Diesel</option>
                                            <option>Gasolina</option>
                                            <option>Elétrico</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-zinc-100">
                                    <button type="button" onClick={() => setIsAddingVehicle(false)} className="px-6 py-2 bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-bold uppercase tracking-widest hover:bg-zinc-200 transition-all">Cancelar</button>
                                    <button type="submit" className="px-6 py-2 bg-[#003366] text-white text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-[#002244] transition-all">Salvar Veículo</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FleetManagementModule;
