import React from 'react';
import { FileText, ShieldCheck, FileSearch, Building2, Book, Calculator } from 'lucide-react';

export const RightSidebar = () => {
  const tools = [
    { title: 'Portal Contribuinte AGT', icon: <Building2 size={22} />, url: 'https://portaldocontribuinte.minfin.gov.ao/', description: 'Acesso ao portal oficial da AGT' },
    { title: 'Portal INSS', icon: <ShieldCheck size={22} />, url: 'https://www.inss.gv.ao/', description: 'Segurança social e contribuições' },
    { title: 'Portal Rents', icon: <FileText size={22} />, url: '#', description: 'Declarações de rendimentos' },
    { title: 'Consultar NIF', icon: <FileSearch size={22} />, url: 'https://portaldocontribuinte.minfin.gov.ao/', description: 'Verificação de número fiscal' },
    { title: 'Consultar Número INSS', icon: <Calculator size={22} />, url: 'https://www.inss.gv.ao/', description: 'Verificação de número INSS' },
    { title: 'Legislação Angolana', icon: <Book size={22} />, url: '#', description: 'Acesso à legislação fiscal' },
  ];

  return (
    <div className="p-4 space-y-3">
      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1 mb-4">Acesso Rápido</p>
      {tools.map((tool, index) => (
        <a
          key={index}
          href={tool.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-3 p-3 rounded-lg border border-zinc-100 hover:border-[#003366] hover:shadow-md transition-all bg-zinc-50 hover:bg-white group"
          title={tool.title}
        >
          <div className="text-[#003366] group-hover:scale-110 transition-transform shrink-0 mt-0.5">
            {tool.icon}
          </div>
          <div>
            <span className="text-xs font-bold text-zinc-700 group-hover:text-[#003366] leading-tight block">{tool.title}</span>
            <span className="text-[10px] text-zinc-400 leading-tight">{tool.description}</span>
          </div>
        </a>
      ))}
    </div>
  );
};
