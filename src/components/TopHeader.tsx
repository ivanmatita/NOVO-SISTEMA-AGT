import React, { useState, useEffect } from 'react';
import { Search, Clock, Plus, Printer, Menu, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const TopHeader = ({ 
  fiscalYear, 
  setFiscalYear, 
  onToggleSidebar, 
  onAddTask, 
  onPrint, 
  onSearch 
}: { 
  fiscalYear: string, 
  setFiscalYear: (y: string) => void,
  onToggleSidebar: () => void,
  onAddTask?: () => void,
  onPrint?: () => void,
  onSearch?: (term: string) => void
}) => {
  const { user, logout } = useAuth();
  const [time, setTime] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) onSearch(searchTerm);
  };

  return (
    <header className="bg-white border-b border-zinc-200 h-16 flex items-center justify-between px-4 sticky top-0 z-40 shadow-sm">
      <div className="flex items-center gap-4 flex-1">
        <button onClick={onToggleSidebar} className="p-2 hover:bg-zinc-100 rounded-md lg:hidden">
          <Menu size={20} />
        </button>
        
        {/* Global Search */}
        <form onSubmit={handleSearch} className="hidden md:flex relative w-full max-w-md">
          <input 
            type="text" 
            placeholder="Pesquisar (Clientes, Faturas, Métricas, etc...)" 
            className="w-full bg-zinc-100 border border-transparent focus:border-[#003366] focus:bg-white rounded-full py-2 pl-10 pr-4 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#003366]/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search size={16} className="absolute left-3.5 top-2.5 text-zinc-400" />
        </form>
      </div>

      <div className="flex items-center gap-5">
        {/* Fiscal Year Selector */}
        <div className="hidden sm:flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-md border border-blue-100">
          <label className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Ano Exercício:</label>
          <select 
            value={fiscalYear} 
            onChange={(e) => setFiscalYear(e.target.value)}
            className="bg-transparent text-sm font-bold text-[#003366] focus:outline-none cursor-pointer"
          >
            <option value="2024">2024</option>
            <option value="2025">2025</option>
            <option value="2026">2026</option>
            <option value="2027">2027</option>
          </select>
        </div>

        {/* Real-time Clock */}
        <div className="hidden md:flex items-center gap-2 text-zinc-500 bg-zinc-50 px-3 py-1.5 rounded-md border border-zinc-100">
          <Clock size={16} />
          <span className="text-sm font-mono font-medium">{time.toLocaleTimeString('pt-PT')}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button 
            onClick={onAddTask}
            className="hidden sm:flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 hover:text-emerald-600 hover:border-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors"
            title="Adicionar Tarefa"
          >
            <Plus size={16} /> Tarefa
          </button>
          
          <button 
            onClick={() => { if(onPrint) onPrint(); else window.print(); }}
            className="flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 hover:text-[#003366] hover:border-[#003366] hover:bg-blue-50 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors"
            title="Imprimir Página"
          >
            <Printer size={16} /> <span className="hidden sm:inline">Imprimir</span>
          </button>
        </div>
      </div>
    </header>
  );
};
