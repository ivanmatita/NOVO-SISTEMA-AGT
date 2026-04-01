import React, { useState } from 'react';
import { Employee } from '../types';
import { Search, Printer, Calculator, Info, UserMinus, Eye } from 'lucide-react';

const ColaboradoresDemitidos = ({ employees }: { employees: Employee[] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const dismissedEmployees = employees.filter(emp => emp.status === 'dismissed');
  
  const filteredEmployees = dismissedEmployees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center no-print">
        <h2 className="text-xl font-bold text-[#003366] uppercase tracking-widest">Colaboradores Demitidos</h2>
        <div className="flex gap-4">
          <button 
            onClick={handlePrint}
            className="bg-zinc-800 hover:bg-black text-white px-6 py-2 flex items-center gap-2 transition-all font-bold text-xs uppercase tracking-widest"
          >
            <Printer size={16} />
            Imprimir Lista
          </button>
          <button className="bg-[#003366] hover:bg-[#002244] text-white px-6 py-2 flex items-center gap-2 transition-all font-bold text-xs uppercase tracking-widest">
            <Calculator size={16} />
            Cálculos de Extinção
          </button>
        </div>
      </div>

      <div className="bg-white border border-zinc-200 shadow-sm no-print">
        <div className="p-4 border-b border-zinc-100 flex items-center gap-3">
          <Search size={18} className="text-zinc-400" />
          <input 
            type="text" 
            placeholder="Pesquisar funcionários demitidos..." 
            className="flex-1 outline-none text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 border-b border-zinc-100">
              <th className="px-6 py-4">Funcionário</th>
              <th className="px-6 py-4">Cargo</th>
              <th className="px-6 py-4">Data Demissão</th>
              <th className="px-6 py-4">Motivo</th>
              <th className="px-6 py-4">Ordenado Por</th>
              <th className="px-6 py-4 text-right">Acções</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {filteredEmployees.length > 0 ? (
              filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-zinc-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                        <UserMinus size={14} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-zinc-800">{emp.name}</p>
                        <p className="text-[10px] text-zinc-400 font-medium">ID: {emp.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{emp.role}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-mono text-zinc-600">
                      {emp.dismissed_at ? new Date(emp.dismissed_at).toLocaleDateString('pt-PT') : '---'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-zinc-600 max-w-xs truncate block">{emp.dismissal_reason || '---'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium text-zinc-700">{emp.dismissal_ordered_by || '---'}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 hover:bg-zinc-100 text-zinc-400 hover:text-[#003366] transition-colors rounded-full">
                      <Eye size={16} />
                    </button>
                    <button className="p-2 hover:bg-zinc-100 text-zinc-400 hover:text-[#003366] transition-colors rounded-full">
                      <Info size={16} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-zinc-400 text-sm italic">
                  Nenhum colaborador demitido encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ColaboradoresDemitidos;
