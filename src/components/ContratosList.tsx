import React, { useState, useEffect } from 'react';
import { Search, Printer, Calendar, FileText, Trash2, Edit, Award, UserPlus, FileCheck } from 'lucide-react';

interface ContratosListProps {
  employees: any[];
  onSetEmployee: (emp: any) => void;
  onSetIsContractModalOpen: (open: boolean) => void;
  onEditContract: (contract: any) => void;
}

const ContratosList = ({ employees, onSetEmployee, onSetIsContractModalOpen, onEditContract }: ContratosListProps) => {
  const [contracts, setContracts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/contracts');
      if (res.ok) {
        const data = await res.json();
        setContracts(data);
      }
    } catch (e) {
      console.error('Error loading contracts:', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = (contract: any) => {
    // Flawless hidden iframe print to completely bypass window.open pop-up blockers in sandbox!
    const iframeId = 'print-contract-iframe';
    let iframe = document.getElementById(iframeId) as HTMLIFrameElement;
    if (iframe) {
      iframe.parentNode?.removeChild(iframe);
    }
    
    iframe = document.createElement('iframe');
    iframe.id = iframeId;
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!iframeDoc) return;

    iframeDoc.open();
    iframeDoc.write(`
      <html>
        <head>
          <title>Contrato - ${contract.employee_name || 'Colaborador'}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            @page {
              size: A4;
              margin: 20mm;
            }
            body {
              font-family: 'Inter', sans-serif;
              margin: 0;
              padding: 2mm;
              background-color: #ffffff;
              color: #1f2937;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .a4-page {
              width: 100%;
              max-width: 210mm;
              margin: 0 auto;
              box-sizing: border-box;
            }
            p {
              margin-top: 0;
              margin-bottom: 1rem;
              text-align: justify;
              font-size: 11pt;
              line-height: 1.6;
            }
            h2 {
              text-align: center;
              font-size: 14pt;
              font-weight: 800;
              text-transform: uppercase;
              margin-bottom: 0.25rem;
              color: #003366;
            }
            strong {
              color: #111827;
            }
          </style>
        </head>
        <body>
          <div class="a4-page">
            ${contract.content}
          </div>
        </body>
      </html>
    `);
    iframeDoc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error("Print error inside iframe window: ", err);
      }
    }, 500);
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Tem a certeza que deseja revogar/apagar este contrato?')) return;
    try {
      const res = await fetch(`/api/contracts/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setContracts(contracts.filter(c => c.id !== id));
      } else {
        alert('Erro ao apagar contrato.');
      }
    } catch (e) {
      console.error('Error deleting contract:', e);
      alert('Erro de ligação.');
    }
  };

  const filteredContracts = contracts.filter(c => {
    const term = searchTerm.toLowerCase();
    return (
      (c.employee_name || '').toLowerCase().includes(term) ||
      (c.contract_type || '').toLowerCase().includes(term) ||
      (c.representative_name || '').toLowerCase().includes(term)
    );
  });

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' });
  };

  return (
    <div className="space-y-6">
      
      {/* Title block */}
      <div className="flex justify-between items-center no-print">
        <div className="flex items-center gap-4">
          <div className="bg-[#003366] p-3 shadow-lg">
            <FileText size={24} className="text-white animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#003366] uppercase tracking-[0.2em]">Gestão de Vínculos Laborais</h2>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Base Geral de Contratos e Acordos de Colaboradores</p>
          </div>
        </div>
      </div>

      {/* Filter and stats banner */}
      <div className="bg-white border border-zinc-200 shadow-sm p-4 flex flex-col md:flex-row gap-4 items-center justify-between no-print">
        <div className="flex items-center gap-3 w-full md:max-w-md border border-zinc-200 p-2 bg-zinc-50">
          <Search size={16} className="text-zinc-400" />
          <input 
            type="text" 
            placeholder="Pesquisar por colaborador ou tipo..." 
            className="outline-none bg-transparent w-full text-xs font-bold uppercase tracking-widest text-[#003366]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="text-[10px] font-black uppercase tracking-widest text-[#003366] bg-zinc-50 px-4 py-2 border border-zinc-200">
          Total de Contratos Ativos: <span className="font-bold text-sm ml-1 text-emerald-600">{contracts.length}</span>
        </div>
      </div>

      {/* Contracts table */}
      <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-zinc-50 border-b border-zinc-200 flex justify-between items-center">
          <span className="text-xs font-black uppercase tracking-wider text-zinc-600">Lista Geral de Contratos</span>
          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest font-mono">Imutabilidade LGT / AGT</span>
        </div>

        {loading ? (
          <div className="p-20 text-center text-zinc-400 uppercase font-black text-xs tracking-widest animate-pulse">
            Carregando Vínculos Laborais...
          </div>
        ) : (
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-[#003366] text-white text-[10px] font-black uppercase tracking-[0.2em]">
                <th className="px-6 py-4">Colaborador / ID</th>
                <th className="px-6 py-4">Tipo de Contrato</th>
                <th className="px-6 py-4">Admissão / Outorgante</th>
                <th className="px-6 py-4 text-right">Salário Contratual</th>
                <th className="px-6 py-4 text-center">Estado</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-xs text-zinc-700">
              {filteredContracts.length > 0 ? (
                filteredContracts.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-zinc-100 flex items-center justify-center text-[#003366] border border-zinc-200 font-bold uppercase">
                          {c.employee_name ? c.employee_name.substring(0, 2).toUpperCase() : 'CO'}
                        </div>
                        <div>
                          <p className="font-black text-[#003366] uppercase">{c.employee_name}</p>
                          <p className="text-[9px] text-zinc-400 font-bold uppercase">ID: {c.employee_id || '999'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-zinc-100 border border-zinc-200 text-[#003366] px-2.5 py-1 text-[9px] font-black uppercase tracking-widest w-fit block">
                        {c.contract_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 font-mono text-zinc-600">
                          <Calendar size={12} className="text-zinc-400" />
                          <span>{new Date(c.start_date || c.created_at).toLocaleDateString('pt-PT')}</span>
                        </div>
                        <p className="text-[9px] text-zinc-400 font-black uppercase">Outorgado por: {c.representative_name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-zinc-600 font-mono">
                      {formatCurrency(c.salary || 100000)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest">
                        Ativo
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center items-center gap-2">
                        <button 
                          onClick={() => handlePrint(c)}
                          className="p-1.5 bg-zinc-600 text-white hover:bg-black transition-all shadow-sm"
                          title="Imprimir Contrato A4"
                        >
                          <Printer size={14} />
                        </button>
                        <button 
                          onClick={() => onEditContract(c)}
                          className="p-1.5 bg-[#003366] text-white hover:bg-black transition-all shadow-sm"
                          title="Editar Contrato"
                        >
                          <Edit size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(c.id)}
                          className="p-1.5 bg-red-600 text-white hover:bg-red-700 transition-all shadow-sm"
                          title="Anular/Apagar Contrato"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-zinc-400 uppercase tracking-[0.2em]">
                      <FileCheck size={40} className="text-zinc-300 animate-bounce" />
                      <p className="text-[10px] font-black">Nenhum vínculo contratual emitido</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
};

export default ContratosList;
