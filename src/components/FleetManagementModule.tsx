import React, { useState } from 'react';
import { Truck, AlertTriangle, Calendar, Settings } from 'lucide-react';

import React, { useState } from 'react';
import { Truck, AlertTriangle, Calendar, Settings, Plus, Wrench, FileText } from 'lucide-react';

const vehicles = [
  { id: 1, make: 'Toyota', model: 'Hilux', plate: 'ABC-123', status: 'Ativo', lastService: '2026-03-15' },
  { id: 2, make: 'Ford', model: 'Ranger', plate: 'XYZ-789', status: 'Manutenção', lastService: '2026-02-10' },
];

const maintenanceLogs = [
  { id: 1, vehicleId: 1, date: '2026-03-15', description: 'Mudança de óleo', cost: 150 },
  { id: 2, vehicleId: 2, date: '2026-02-10', description: 'Reparação de travões', cost: 450 },
];

const FleetManagementModule = () => {
    const [activeTab, setActiveTab] = useState('overview');

    return (
        <div className="p-8 space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-[#003366] uppercase tracking-tight">Gestão de Frotas</h2>
                <button className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 text-sm font-bold"><Plus size={16}/> ADICIONAR VEÍCULO</button>
            </div>
            
            <div className="flex gap-4 border-b border-zinc-200">
                {['overview', 'vehicles', 'maintenance'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 font-bold ${activeTab === tab ? 'text-blue-600 border-b-2 border-blue-600' : 'text-zinc-500'}`}>{tab.toUpperCase()}</button>
                ))}
            </div>

            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-white border shadow-sm rounded">
                        <Truck className="text-blue-600 mb-2"/>
                        <p className="text-zinc-500 text-sm">Total Veículos</p>
                        <p className="text-2xl font-bold">{vehicles.length}</p>
                    </div>
                    <div className="p-4 bg-white border shadow-sm rounded">
                        <AlertTriangle className="text-red-500 mb-2"/>
                        <p className="text-zinc-500 text-sm">Em Manutenção</p>
                        <p className="text-2xl font-bold">{vehicles.filter(v => v.status === 'Manutenção').length}</p>
                    </div>
                    <div className="p-4 bg-white border shadow-sm rounded">
                        <Calendar className="text-green-600 mb-2"/>
                        <p className="text-zinc-500 text-sm">Próxima Revisão</p>
                        <p className="text-xl font-bold">2026-04-20</p>
                    </div>
                </div>
            )}

            {activeTab === 'vehicles' && (
                <div className="bg-white border shadow-sm rounded">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase bg-zinc-100">
                            <tr>
                                <th className="px-4 py-3">Marca</th>
                                <th className="px-4 py-3">Modelo</th>
                                <th className="px-4 py-3">Matrícula</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Último Serviço</th>
                            </tr>
                        </thead>
                        <tbody>
                            {vehicles.map(v => (
                                <tr key={v.id} className="border-b hover:bg-zinc-50">
                                    <td className="px-4 py-3">{v.make}</td>
                                    <td className="px-4 py-3">{v.model}</td>
                                    <td className="px-4 py-3">{v.plate}</td>
                                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs ${v.status === 'Ativo' ? 'bg-green-100' : 'bg-red-100'}`}>{v.status}</span></td>
                                    <td className="px-4 py-3">{v.lastService}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'maintenance' && (
                <div className="bg-white border shadow-sm rounded">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase bg-zinc-100">
                            <tr>
                                <th className="px-4 py-3">Data</th>
                                <th className="px-4 py-3">Descrição</th>
                                <th className="px-4 py-3">Custo (€)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {maintenanceLogs.map(l => (
                                <tr key={l.id} className="border-b hover:bg-zinc-50">
                                    <td className="px-4 py-3">{l.date}</td>
                                    <td className="px-4 py-3">{l.description}</td>
                                    <td className="px-4 py-3">{l.cost}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default FleetManagementModule;


export default FleetManagementModule;
