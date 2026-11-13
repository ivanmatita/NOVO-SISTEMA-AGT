import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Employee } from '../types';
import { Search, Printer, Calculator, Info, UserMinus, Eye, FileText, Scale, ArrowLeft, UserCheck, X } from 'lucide-react';

interface DismissedEmployee extends Employee {
  dismissal_type?: string;
  notice_period_served?: boolean;
  vacation_compensation?: number;
  seniority_bonus?: number;
  total_compensation?: number;
}

const ColaboradoresDemitidos = ({ employees, onReadmit }: { employees: Employee[], onReadmit?: (id: number, date: string, reason?: string, orderedBy?: string, observations?: string) => Promise<void> }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmp, setSelectedEmp] = useState<DismissedEmployee | null>(null);
  const [showReadmitModal, setShowReadmitModal] = useState(false);
  const [readmitTarget, setReadmitTarget] = useState<Employee | null>(null);
  const [readmitData, setReadmitData] = useState({
    date: new Date().toISOString().split('T')[0],
    reason: 'Fim do período de suspensão / Recontratação',
    orderedBy: '',
    observations: ''
  });

  const dismissedEmployees = (employees || []).filter(emp => emp.status === 'dismissed');

  const handleReadmitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readmitTarget && onReadmit) {
      // Logic for readmission with detailed data
      await onReadmit(
        readmitTarget.id, 
        readmitData.date,
        readmitData.reason,
        readmitData.orderedBy,
        readmitData.observations
      );
      setShowReadmitModal(false);
      setReadmitTarget(null);
      if (selectedEmp?.id === readmitTarget.id) {
        setSelectedEmp(null);
      }
    }
  };

  const ReadmitModal = () => {
    if (!readmitTarget) return null;
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white border border-zinc-200 w-full max-w-xl shadow-2xl overflow-hidden"
        >
          <div className="bg-emerald-600 text-white p-6 flex justify-between items-center">
            <h3 className="font-black uppercase tracking-widest flex items-center gap-2">
              <UserCheck size={20} /> Formuário de Readmissão
            </h3>
            <button onClick={() => setShowReadmitModal(false)} className="hover:bg-white/10 p-2">
              <X size={20} className="text-white" />
            </button>
          </div>
          <form onSubmit={handleReadmitSubmit} className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Data de Readmissão</label>
                <input 
                  type="date" 
                  required
                  className="w-full border border-zinc-200 p-3 text-sm focus:outline-none focus:border-emerald-600"
                  value={readmitData.date}
                  onChange={e => setReadmitData({...readmitData, date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Ordenado Por</label>
                <input 
                  type="text" 
                  className="w-full border border-zinc-200 p-3 text-sm focus:outline-none focus:border-emerald-600"
                  placeholder="Nome do responsável"
                  value={readmitData.orderedBy}
                  onChange={e => setReadmitData({...readmitData, orderedBy: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Motivo da Readmissão</label>
              <input 
                type="text" 
                required
                className="w-full border border-zinc-200 p-3 text-sm focus:outline-none focus:border-emerald-600"
                value={readmitData.reason}
                onChange={e => setReadmitData({...readmitData, reason: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Observações</label>
              <textarea 
                className="w-full border border-zinc-200 p-3 text-sm focus:outline-none focus:border-emerald-600 h-24 resize-none"
                placeholder="Notas adicionais sobre a readmissão..."
                value={readmitData.observations}
                onChange={e => setReadmitData({...readmitData, observations: e.target.value})}
              />
            </div>
            <div className="pt-4 flex gap-4">
              <button 
                type="button"
                onClick={() => setShowReadmitModal(false)}
                className="flex-1 bg-zinc-100 text-zinc-600 py-4 font-black uppercase tracking-widest text-xs hover:bg-zinc-200"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="flex-2 bg-emerald-600 text-white py-4 font-black uppercase tracking-widest text-xs hover:bg-emerald-700 shadow-xl"
              >
                Readmitir Colaborador
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    );
  };
  
  const filteredEmployees = (dismissedEmployees || []).filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' });
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center no-print">
        <div className="flex items-center gap-4">
          <div className="bg-red-600 p-3 shadow-lg">
            <UserMinus size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#003366] uppercase tracking-[0.2em]">Extinção Laboral</h2>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Base Legal: Lei Geral do Trabalho de Angola (LGT)</p>
          </div>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={handlePrint}
            className="bg-zinc-800 hover:bg-black text-white px-6 py-2 flex items-center gap-2 transition-all font-black text-[10px] uppercase tracking-widest"
          >
            <Printer size={16} />
            Imprimir Lista
          </button>
        </div>
      </div>

      {!selectedEmp ? (
        <>
          <div className="bg-white border border-zinc-200 shadow-sm no-print">
            <div className="p-4 border-b border-zinc-100 flex items-center gap-3">
              <Search size={18} className="text-zinc-400" />
              <input 
                type="text" 
                placeholder="Pesquisar histórico de extinção laboral..." 
                className="flex-1 outline-none text-xs font-bold uppercase tracking-widest text-[#003366]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#003366] text-white text-[10px] font-black uppercase tracking-[0.2em]">
                  <th className="px-6 py-4">Colaborador</th>
                  <th className="px-6 py-4">Cargo / ID</th>
                  <th className="px-6 py-4">Fim de Contrato</th>
                  <th className="px-6 py-4">Tipo de Extinção</th>
                  <th className="px-6 py-4 text-right">Indeminização Est.</th>
                  <th className="px-6 py-4 text-center">Acções</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {filteredEmployees.length > 0 ? (
                  filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-red-50/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-red-50 flex items-center justify-center text-red-600 border border-red-100 overflow-hidden">
                            {emp.image_url ? <img src={emp.image_url} className="w-full h-full object-cover" /> : <UserMinus size={16} />}
                          </div>
                          <div>
                            <p className="text-xs font-black text-[#003366] uppercase">{emp.name}</p>
                            <p className="text-[9px] text-zinc-400 font-bold uppercase">Entrada: {emp.hired_at ? new Date(emp.hired_at).toLocaleDateString() : 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">{emp.role}</span>
                        <div className="text-[8px] text-zinc-400 font-mono">ID: {1000 + emp.id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-black text-red-600 uppercase">
                          {emp.dismissed_at ? new Date(emp.dismissed_at).toLocaleDateString('pt-PT') : '---'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[9px] font-black text-zinc-600 uppercase bg-zinc-100 px-2 py-1 border border-zinc-200">
                          {emp.dismissal_reason || 'Mútuo Acordo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-xs font-black text-[#003366]">
                          {formatCurrency(emp.salary * 2.5)} {/* Rough estimate for list view */}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button 
                            onClick={() => setSelectedEmp(emp)}
                            className="p-2 bg-zinc-900 text-white hover:bg-black transition-colors"
                            title="Ver Guia de Extinção"
                          >
                            <Eye size={14} />
                          </button>
                          {onReadmit && (
                            <button 
                              onClick={() => {
                                setReadmitTarget(emp);
                                setShowReadmitModal(true);
                              }}
                              className="p-2 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                              title="Readmitir Colaborador"
                            >
                              <UserCheck size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-4 text-zinc-300">
                        <Scale size={48} strokeWidth={1} />
                        <p className="text-xs font-black uppercase tracking-[0.2em]">Sem registos de extinção laboral</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <button 
            onClick={() => setSelectedEmp(null)}
            className="flex items-center gap-2 text-zinc-500 hover:text-[#003366] font-black text-[10px] uppercase tracking-widest transition-all"
          >
            <ArrowLeft size={14} /> Voltar à Lista
          </button>

          <div className="bg-white border-2 border-zinc-900 p-12 shadow-2xl relative overflow-hidden">
            {/* Background Seal */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-45deg] opacity-[0.03] select-none pointer-events-none">
              <Scale size={600} />
            </div>

            <div className="relative z-10 space-y-12">
              <div className="flex justify-between items-start border-b-4 border-zinc-900 pb-8">
                <div className="space-y-4">
                  <h1 className="text-3xl font-black text-[#003366] uppercase tracking-tighter">Guia de Extinção Laboral</h1>
                  <div className="space-y-1">
                    <p className="text-xs font-black uppercase tracking-widest text-red-600">Documento de Cessação de Relacionamento Juridico-Laboral</p>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase">Em conformidade com a Lei nº 7/15 - Lei Geral do Trabalho</p>
                  </div>
                </div>
                <div className="text-right space-y-2">
                  <div className="bg-red-600 text-white px-4 py-1 text-[10px] font-black uppercase tracking-widest">Demitido / Rescindido</div>
                  <p className="text-[10px] font-mono font-bold text-zinc-400 uppercase">Processo Nº EL-2026-{(1000 + selectedEmp.id)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-16">
                <div className="space-y-8">
                  <section>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-4 border-b border-zinc-100 pb-2">Identificação do Trabalhador</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between border-b border-zinc-50 py-1">
                        <span className="text-[10px] font-black uppercase text-zinc-400">Nome:</span>
                        <span className="text-xs font-bold text-[#003366] uppercase">{selectedEmp.name}</span>
                      </div>
                      <div className="flex justify-between border-b border-zinc-50 py-1">
                        <span className="text-[10px] font-black uppercase text-zinc-400">Cargo:</span>
                        <span className="text-xs font-bold text-zinc-700 uppercase">{selectedEmp.role}</span>
                      </div>
                      <div className="flex justify-between border-b border-zinc-50 py-1">
                        <span className="text-[10px] font-black uppercase text-zinc-400">NIF/BI:</span>
                        <span className="text-xs font-mono font-bold text-zinc-600 uppercase">{selectedEmp.nif || selectedEmp.bi || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between border-b border-zinc-50 py-1">
                        <span className="text-[10px] font-black uppercase text-zinc-400">Data de Admissão:</span>
                        <span className="text-xs font-bold text-zinc-600">
                          {selectedEmp.hired_at ? new Date(selectedEmp.hired_at).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-zinc-50 py-1">
                        <span className="text-[10px] font-black uppercase text-zinc-400">Data de Rescisão:</span>
                        <span className="text-xs font-black text-red-600">
                          {selectedEmp.dismissed_at ? new Date(selectedEmp.dismissed_at).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-4 border-b border-zinc-100 pb-2">Detalhes da Cessação</h3>
                    <div className="bg-zinc-50 p-6 border border-zinc-100 space-y-4">
                      <div>
                        <p className="text-[10px] font-black uppercase text-zinc-400 mb-1">Motivo / Causa da Extinção:</p>
                        <p className="text-xs font-bold text-[#003366] uppercase leading-relaxed">
                          {selectedEmp.dismissal_reason || 'Rescisão por Excesso de Pessoal (Art. 210º LGT)'}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-200">
                        <div>
                          <p className="text-[9px] font-black uppercase text-zinc-400 mb-1">Aviso Prévio:</p>
                          <p className="text-[10px] font-bold text-emerald-600 uppercase">Cumprido</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase text-zinc-400 mb-1">Ordenado por:</p>
                          <p className="text-[10px] font-bold text-[#003366] uppercase">{selectedEmp.dismissal_ordered_by || 'Direcção Geral'}</p>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

                <div className="space-y-8">
                  <section>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-4 border-b border-zinc-100 pb-2">Cálculo de Indemnizações (Base LGT)</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center h-10 border-b border-zinc-100">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase">Vencimento Base Mensal:</span>
                        <span className="font-bold text-zinc-900">{formatCurrency(selectedEmp.salary)}</span>
                      </div>
                      <div className="flex justify-between items-center h-10 border-b border-zinc-100">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase block leading-none">Indemnização p/ Antiguidade:</span>
                          <span className="text-[8px] text-zinc-400 font-bold uppercase">(Art. 236º - 1 mês p/ cada ano)</span>
                        </div>
                        <span className="font-bold text-zinc-900">{formatCurrency(selectedEmp.salary * 3)}</span>
                      </div>
                      <div className="flex justify-between items-center h-10 border-b border-zinc-100">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase">Compensação Férias Não Gozadas:</span>
                        <span className="font-bold text-zinc-900">{formatCurrency(selectedEmp.salary * 0.5)}</span>
                      </div>
                      <div className="flex justify-between items-center h-10 border-b border-zinc-100">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase">Subsídio de Natal Proporcional:</span>
                        <span className="font-bold text-zinc-900">{formatCurrency(selectedEmp.salary * 0.25)}</span>
                      </div>
                      <div className="flex justify-between items-center h-12 bg-zinc-900 px-4 mt-8">
                        <span className="text-xs font-black text-white uppercase tracking-widest">Total Líquido a Receber:</span>
                        <span className="text-lg font-black text-[#F27D26]">{formatCurrency(selectedEmp.salary * 3.75)}</span>
                      </div>
                    </div>
                  </section>

                  <section className="pt-8 flex flex-col items-center">
                    <div className="w-32 h-32 border-4 border-zinc-100 flex items-center justify-center p-4">
                      <div className="w-full h-full border border-zinc-200 border-dashed animate-pulse bg-red-50 flex items-center justify-center text-[10px] font-black text-red-300 uppercase text-center rotate-[-15deg]">
                        Selo de <br /> Extinção
                      </div>
                    </div>
                  </section>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-24 pt-16 border-t border-zinc-100">
                <div className="text-center space-y-4">
                  <div className="border-t border-zinc-900 pt-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">Pela Entidade Empregadora</p>
                    <p className="text-[8px] font-bold text-zinc-400 uppercase">(Assinatura e Carimbo)</p>
                  </div>
                </div>
                <div className="text-center space-y-4">
                  <div className="border-t border-zinc-900 pt-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">O Trabalhador (Conformidade)</p>
                    <p className="text-[8px] font-bold text-zinc-400 uppercase">(Assinatura e Data)</p>
                  </div>
                </div>
              </div>
              
              <div className="pt-12 text-center border-t border-zinc-50">
                <p className="text-[8px] font-bold text-zinc-300 uppercase tracking-widest leading-relaxed max-w-2xl mx-auto">
                  Este documento serve de comprovativo de extinção do vínculo laboral, devendo ser acompanhado do respectivo Certificado de Trabalho nos termos da legislação em vigor na República de Angola.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-4 no-print">
            {onReadmit && (
              <button 
                onClick={() => {
                  setReadmitTarget(selectedEmp);
                  setShowReadmitModal(true);
                }}
                className="bg-emerald-600 text-white px-8 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center gap-2"
              >
                <UserCheck size={16} /> Readmitir Colaborador
              </button>
            )}
            <button className="bg-white border-2 border-zinc-900 text-zinc-900 px-8 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-50 transition-all flex items-center gap-2">
              <FileText size={16} /> Emitir Certificado de Trabalho
            </button>
            <button 
              onClick={handlePrint}
              className="bg-[#003366] text-white px-8 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-[#002244] transition-all flex items-center gap-2 shadow-xl"
            >
              <Printer size={16} /> Processar Guia Final
            </button>
          </div>
          {showReadmitModal && <ReadmitModal />}
        </div>
      )}
    </div>
  );
};

export default ColaboradoresDemitidos;
