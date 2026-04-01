import React from 'react';
import { Search, Printer } from 'lucide-react';

const ColaboradoresDemitidos = () => {
  return (
    <div className="p-8 bg-white border border-zinc-200 shadow-sm space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-[#003366]">COLABORADORES DEMITIDOS</h2>
        <div className="flex gap-2">
          <button className="bg-zinc-100 p-2"><Search size={18} /></button>
          <button className="bg-zinc-100 p-2"><Printer size={18} /></button>
        </div>
      </div>
      <div className="border border-zinc-300 p-4">
        <p>Lista de colaboradores demitidos...</p>
      </div>
    </div>
  );
};

export default ColaboradoresDemitidos;
