import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const BusinessOverview = ({ stats, invoices, products, caixas }: any) => {
  if (!stats) {
    return <div className="p-8">Carregando dados...</div>;
  }

  const data = [
    { name: 'Vendas', value: stats.totalInvoiced },
    { name: 'Compras', value: stats.totalExpenses },
    { name: 'Lucro', value: stats.totalInvoiced - stats.totalExpenses },
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

  return (
    <div className="space-y-8 p-8">
      <h2 className="text-2xl font-bold text-[#003366]">Visão Geral do Negócio</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 border border-zinc-200 shadow-sm">
          <p className="text-xs text-zinc-500 uppercase">Total Vendas</p>
          <p className="text-2xl font-bold text-[#003366]">{stats.totalInvoiced.toLocaleString()} Kz</p>
        </div>
        <div className="bg-white p-6 border border-zinc-200 shadow-sm">
          <p className="text-xs text-zinc-500 uppercase">Total Compras</p>
          <p className="text-2xl font-bold text-red-600">{stats.totalExpenses.toLocaleString()} Kz</p>
        </div>
        <div className="bg-white p-6 border border-zinc-200 shadow-sm">
          <p className="text-xs text-zinc-500 uppercase">Lucro</p>
          <p className="text-2xl font-bold text-emerald-600">{(stats.totalInvoiced - stats.totalExpenses).toLocaleString()} Kz</p>
        </div>
        <div className="bg-white p-6 border border-zinc-200 shadow-sm">
          <p className="text-xs text-zinc-500 uppercase">Documentos Emitidos</p>
          <p className="text-2xl font-bold text-zinc-800">{stats.pendingCount}</p>
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
