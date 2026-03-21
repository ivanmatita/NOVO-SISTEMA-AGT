import React from 'react';
import { ShoppingBag, Users, FileText, Package, UserCheck, Wallet, BarChart3 } from 'lucide-react';

interface DashboardProps {
  onNavigate: (page: string) => void;
}

const Dashboard = ({ onNavigate }: DashboardProps) => {
  const menuItems = [
    { id: 'pos', label: 'Ponto de Venda', icon: ShoppingBag, color: 'bg-blue-500' },
    { id: 'clients', label: 'Clientes', icon: Users, color: 'bg-indigo-500' },
    { id: 'invoices', label: 'Faturas', icon: FileText, color: 'bg-orange-500' },
    { id: 'products', label: 'Produtos', icon: Package, color: 'bg-zinc-800' },
    { id: 'employees', label: 'Funcionários', icon: UserCheck, color: 'bg-blue-800' },
    { id: 'reports', label: 'Relatórios', icon: BarChart3, color: 'bg-emerald-700' },
  ];

  return (
    <div className="p-8 bg-zinc-50 min-h-screen">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-[#003366]">Sistema de Gestão</h1>
        <p className="text-zinc-500">Bem-vindo ao sistema de gestão FaturaPronta.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className="bg-white border border-zinc-200 p-8 flex flex-col items-center justify-center gap-4 hover:shadow-xl transition-all group hover:border-[#003366]"
          >
            <div className={`w-16 h-16 ${item.color} text-white flex items-center justify-center rounded-none group-hover:scale-110 transition-transform`}>
              <item.icon size={32} />
            </div>
            <span className="text-sm font-bold text-zinc-700 uppercase tracking-tight text-center">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
