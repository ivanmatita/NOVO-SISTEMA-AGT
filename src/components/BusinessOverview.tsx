import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Building2, ShieldCheck, Globe } from 'lucide-react';

const BusinessOverview = ({ stats, invoices, products, caixas, companyData }: any) => {
  if (!stats) {
    return <div className="p-8">Carregando dados...</div>;
  }

  const totalInvoiced = stats.totalInvoiced || 0;
  const totalExpenses = stats.totalExpenses || 0;
  const pendingCount = stats.pendingCount || 0;

  const data = [
    { name: 'Vendas', value: totalInvoiced },
    { name: 'Compras', value: totalExpenses },
    { name: 'Lucro', value: totalInvoiced - totalExpenses },
  ];

  return (
    <div className="space-y-8 p-8">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-[#003366] tracking-tight flex items-center gap-3">
            <Building2 size={24} className="text-[#00D17F]" />
            {companyData?.name || 'Visão Geral do Negócio'}
          </h2>
          <div className="flex items-center gap-4">
            <p className="text-zinc-500 text-sm font-medium flex items-center gap-1.5">
              <Globe size={14} />
              {companyData?.country || 'Angola'} • {companyData?.type || 'Tecnologia'}
            </p>
            <span className="bg-[#00D17F]/10 text-[#00D17F] px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
              <ShieldCheck size={10} />
              Plano {companyData?.plan_type || 'Trial'}
            </span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 border border-zinc-200 shadow-sm">
          <p className="text-xs text-zinc-500 uppercase">Total Vendas</p>
          <p className="text-2xl font-bold text-[#003366]">{totalInvoiced.toLocaleString()} Kz</p>
        </div>
        <div className="bg-white p-6 border border-zinc-200 shadow-sm">
          <p className="text-xs text-zinc-500 uppercase">Total Compras</p>
          <p className="text-2xl font-bold text-red-600">{totalExpenses.toLocaleString()} Kz</p>
        </div>
        <div className="bg-white p-6 border border-zinc-200 shadow-sm">
          <p className="text-xs text-zinc-500 uppercase">Lucro</p>
          <p className="text-2xl font-bold text-emerald-600">{(totalInvoiced - totalExpenses).toLocaleString()} Kz</p>
        </div>
        <div className="bg-white p-6 border border-zinc-200 shadow-sm">
          <p className="text-xs text-zinc-500 uppercase">Documentos Emitidos</p>
          <p className="text-2xl font-bold text-zinc-800">{pendingCount}</p>
        </div>
      </div>

      <div className="bg-white p-6 border border-zinc-200 shadow-sm">
        <h3 className="text-lg font-bold text-[#003366] mb-4">Resumo Financeiro</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill="#003366" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default BusinessOverview;
