import React from 'react';
import { FileText, Link, ShieldCheck, FileSearch, Building2, Book, Calculator, Building } from 'lucide-react';

export const RightSidebar = () => {
  const tools = [
    { title: 'Portal Contribuinte AGT', icon: <Building2 size={24} />, url: 'https://portaldocontribuinte.minfin.gov.ao/' },
    { title: 'Portal INSS', icon: <ShieldCheck size={24} />, url: 'https://www.inss.gv.ao/' },
    { title: 'Portal Rents', icon: <FileText size={24} />, url: '#' },
    { title: 'Consultar NIF', icon: <FileSearch size={24} />, url: 'https://portaldocontribuinte.minfin.gov.ao/' },
    { title: 'Consultar Número INSS', icon: <Calculator size={24} />, url: 'https://www.inss.gv.ao/' },
    { title: 'Legislação Angolana', icon: <Book size={24} />, url: '#' },
  ];

  return (
    <div className="w-20 lg:w-64 bg-white border-l border-zinc-200 h-screen sticky top-0 flex flex-col items-center lg:items-stretch py-6 shadow-sm overflow-y-auto shrink-0 z-10 transition-all">
      <h3 className="hidden lg:block text-xs font-black text-zinc-400 uppercase tracking-widest px-6 mb-4">Ferramentas Externas</h3>
      <div className="flex flex-col gap-3 px-3">
        {tools.map((tool, index) => (
          <a
            key={index}
            href={tool.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col lg:flex-row items-center gap-3 p-3 rounded-xl border border-zinc-100 hover:border-[#003366] hover:shadow-md transition-all bg-zinc-50 hover:bg-white group"
            title={tool.title}
          >
            <div className="text-[#003366] group-hover:scale-110 transition-transform">
              {tool.icon}
            </div>
            <span className="hidden lg:block text-xs font-bold text-zinc-700 group-hover:text-[#003366] leading-tight">
              {tool.title}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
};
