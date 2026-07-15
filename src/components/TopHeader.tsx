import React, { useState, useEffect } from 'react';
import { Search, Clock, Plus, Printer, Menu, Bell, Home, ArrowLeft, Grid } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const TopHeader = ({ 
  fiscalYear, 
  setFiscalYear, 
  onToggleSidebar, 
  onToggleRightSidebar,
  onAddTask, 
  onPrint, 
  onSearch,
  alerts = [],
  showNavButtons = false,
  onHome,
  onBack
}: { 
  fiscalYear: string, 
  setFiscalYear: (y: string) => void,
  onToggleSidebar: () => void,
  onToggleRightSidebar?: () => void,
  onAddTask?: () => void,
  onPrint?: () => void,
  onSearch?: (term: string) => void,
  alerts?: any[],
  showNavButtons?: boolean,
  onHome?: () => void,
  onBack?: () => void
}) => {
  const { user, logout } = useAuth();
  const [time, setTime] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>(['2024', '2025', '2026', '2027']);

  const loadFiscalYearsAndSelectActive = async () => {
    try {
      const { supabase } = await import('../lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/exercicios-fiscais', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const years = data.map((x: any) => x.ano.toString());
          const uniqueYears = Array.from(new Set([...years, '2024', '2025', '2026', '2027'])).sort((a: string, b: string) => Number(b) - Number(a));
          setAvailableYears(uniqueYears);
          
          const activeDbYear = data.find((x: any) => x.ativo);
          if (activeDbYear && !localStorage.getItem('user_manually_switched_year')) {
            setFiscalYear(activeDbYear.ano.toString());
          }
        }
      }
    } catch (e) {
      console.error("Erro ao carregar anos para o TopHeader:", e);
    }
  };

  useEffect(() => {
    if (user?.empresa_id) {
      loadFiscalYearsAndSelectActive();
    }

    // Escutar por atualizações globais para recarregar se necessário
    const handleRefresh = () => {
      if (user?.empresa_id) {
        loadFiscalYearsAndSelectActive();
      }
    };
    window.addEventListener('refresh_fiscal_years', handleRefresh);
    return () => window.removeEventListener('refresh_fiscal_years', handleRefresh);
  }, [user?.empresa_id]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const now = new Date();
    now.setHours(0,0,0,0);
    const active = alerts.filter(a => {
      const start = new Date(a.startDate);
      const advanceDays = parseInt(a.advanceTime) || 0;
      const alertDate = new Date(start);
      alertDate.setDate(start.getDate() - advanceDays);
      alertDate.setHours(0,0,0,0);
      return now >= alertDate;
    });
    setActiveAlerts(active);
  }, [alerts, time]); // Recalculate periodically

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) onSearch(searchTerm);
  };

  return (
    <div className="flex flex-col sticky top-0 z-40">
      {activeAlerts.length > 0 && (
        <div className="bg-amber-100 border-b border-amber-200 text-amber-900 px-4 py-2 text-xs font-bold flex flex-col items-center justify-center">
          {activeAlerts.map(a => (
            <span key={a.id}>Aviso: Tarefa '{a.name}' aproxima-se - {a.description}</span>
          ))}
        </div>
      )}
      <header className="bg-white border-b border-zinc-200 h-16 flex items-center justify-between px-4 shadow-sm">
        <div className="flex items-center gap-4 flex-1">
          {/* Sidebar Toggle removed as requested */}

          
          {showNavButtons && (
            <div className="flex items-center gap-2 mr-2">
              <button onClick={onBack} className="p-2 bg-zinc-100 text-[#003366] hover:bg-zinc-200 rounded-md transition-colors" title="Voltar">
                <ArrowLeft size={18} />
              </button>
              <button onClick={onHome} className="p-2 bg-zinc-100 text-[#003366] hover:bg-zinc-200 rounded-md transition-colors" title="Menu Principal">
                <Home size={18} />
              </button>
            </div>
          )}

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
          {/* External Tools Icon Button */}
          {onToggleRightSidebar && (
            <button
              onClick={onToggleRightSidebar}
              className="p-2 bg-zinc-100 text-zinc-600 hover:bg-[#003366] hover:text-white rounded-md transition-colors"
              title="Ferramentas Externas"
            >
              <Grid size={18} />
            </button>
          )}


          {/* Alerts Bell */}
          <div className="relative cursor-pointer text-zinc-500 hover:text-amber-600 transition-colors">
            <Bell size={20} />
            {activeAlerts.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">
                {activeAlerts.length}
              </span>
            )}
          </div>

          {/* Fiscal Year Selector */}
          <div className="hidden sm:flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-md border border-blue-100">
            <label className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Ano Exercício:</label>
            <select 
              value={fiscalYear} 
              onChange={(e) => {
                localStorage.setItem('user_manually_switched_year', 'true');
                setFiscalYear(e.target.value);
              }}
              className="bg-transparent text-sm font-bold text-[#003366] focus:outline-none cursor-pointer"
            >
              {availableYears.map(yearOption => (
                <option key={yearOption} value={yearOption}>{yearOption}</option>
              ))}
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
              className="hidden sm:flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 hover:text-emerald-600 hover:border-emerald-600 hover:bg-emerald-50 px-4 py-2 rounded-md text-sm font-bold uppercase tracking-wider transition-colors"
              title="Adicionar Tarefa"
            >
              <Plus size={20} /> Tarefa
            </button>
            
            <button 
              onClick={() => { if(onPrint) onPrint(); else window.print(); }}
              className="flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 hover:text-[#003366] hover:border-[#003366] hover:bg-blue-50 px-4 py-2 rounded-md text-sm font-bold uppercase tracking-wider transition-colors"
              title="Imprimir Página"
            >
              <Printer size={20} /> <span className="hidden sm:inline">Imprimir</span>
            </button>
          </div>
        </div>
      </header>
    </div>
  );
};
