import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const BusinessOverview = ({ stats, invoices, products, caixas }: any) => {
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

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

  return (
    <div className="space-y-8 p-8">
      <h2 className="text-2xl font-bold text-[#003366]">Visão Geral do Negócio</h2>
      
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
