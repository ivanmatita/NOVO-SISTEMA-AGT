import React, { useState } from 'react';
import { Employee } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { fetchWithAuth } from '../lib/fetchWithAuth';
import { 
  X, Eye, Edit, UserMinus, UserCheck, Trash2, 
  FileSignature, ShieldCheck, Calendar, Info,
  Coins, Shirt, ClipboardList, FolderUp, Ban, PlusCircle, Wallet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Formata valor como Kz (Kwanza Angolano)
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('pt-AO', {
    style: 'currency',
    currency: 'AOA',
    minimumFractionDigits: 2
  }).format(amount);
};

export const EmployeeOptionsMenu = ({ 
  employee, 
  onClose,
  setActiveTab,
  setAppSelectedEmployee,
  handleEditEmployee,
  handleDeleteEmployee,
  handleReadmitEmployee,
  onRefreshHRData,
  onSetIsContractModalOpen,
  onOpenDocuments,
  onOpenFines
}: {
  employee: Employee;
  onClose: () => void;
  setActiveTab: (tab: string) => void;
  setAppSelectedEmployee: (e: Employee | null) => void;
  handleEditEmployee: (e: Employee) => void;
  handleDeleteEmployee: (id: number | string) => Promise<void>;
  handleReadmitEmployee: (id: number, date: string, reason?: string, orderedBy?: string, observations?: string) => Promise<void>;
  onRefreshHRData: () => void;
  onSetIsContractModalOpen?: (open: boolean) => void;
  onOpenDocuments?: (e: Employee) => void;
  onOpenFines?: (e: Employee) => void;
}) => {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<'options' | 'dismiss' | 'readmit'>('options');
  
  // Demissão states
  const [dismissData, setDismissData] = useState({
    date: new Date().toISOString().split('T')[0],
    reason: '',
    orderedBy: '',
    observations: ''
  });
  const [isDismissing, setIsDismissing] = useState(false);

  // Readmissão states
  const [readmitData, setReadmitData] = useState({
    date: new Date().toISOString().split('T')[0],
    reason: 'Fim do período de suspensão / Recontratação',
    orderedBy: '',
    observations: ''
  });
  const [isReadmitting, setIsReadmitting] = useState(false);

  const isDismissed = employee.status === 'dismissed';

  const handleDismissSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dismissData.reason.trim()) {
      alert('Por favor, informe o motivo da demissão.');
      return;
    }
    
    setIsDismissing(true);
    try {
      // Sincronizar com o Supabase na tabela colaboradores
      if (user?.empresa_id) {
        try {
          await supabase
            .from('colaboradores')
            .update({
              status: 'dismissed',
              dismissed_at: dismissData.date,
              dismissal_reason: dismissData.reason,
              dismissal_ordered_by: dismissData.orderedBy,
              dismissal_observations: dismissData.observations
            })
            .eq('id', employee.id)
            .eq('empresa_id', user.empresa_id);
        } catch (supaErr) {
          console.error('[DismissEmployee] Erro ao sincronizar com Supabase:', supaErr);
        }
      }

      const res = await fetchWithAuth(`/api/employees/dismiss/${employee.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dismissData)
      });
      
      if (res.ok) {
        alert('Funcionário demitido de forma segura com sucesso!');
        onRefreshHRData();
        onClose();
      } else {
        alert('Erro ao processar demissão no servidor de backend.');
      }
    } catch (err) {
      console.error('Error dismissing employee:', err);
      alert('Ocorreu um erro ao demitir o funcionário.');
    } finally {
      setIsDismissing(false);
    }
  };

  const handleReadmitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsReadmitting(true);
    try {
      await handleReadmitEmployee(
        employee.id,
        readmitData.date,
        readmitData.reason,
        readmitData.orderedBy,
        readmitData.observations
      );
      
      alert('Funcionário readmitido com sucesso!');
      onRefreshHRData();
      onClose();
    } catch (err) {
      console.error('Error readmitting employee:', err);
      alert('Erro ao realizar readmissão.');
    } finally {
      setIsReadmitting(false);
    }
  };

  const handlePermanentDelete = async () => {
    const doubleConfirm = window.confirm(
      `ATENÇÃO: Deseja realmente ELIMINAR permanentemente o registro de ${employee.name}?\nEsta ação é irreversível e excluirá todos os dados do colaborador.`
    );
    if (!doubleConfirm) return;

    try {
      await handleDeleteEmployee(employee.id);
      alert('Colaborador eliminado permanentemente do sistema!');
      onRefreshHRData();
      onClose();
    } catch (err) {
      console.error('Error deleting employee:', err);
      alert('Ocorreu um erro ao eliminar o colaborador.');
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-lg bg-white shadow-2xl overflow-hidden flex flex-col border border-zinc-200"
      >
        {/* Modal Header */}
        <div className="bg-[#003366] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-none bg-white/10`}>
              {isDismissed ? <UserMinus size={20} /> : <UserCheck size={20} />}
            </div>
            <div>
              <h3 className="font-extrabold uppercase tracking-widest text-xs leading-none">
                {currentView === 'options' && 'Opções do Colaborador'}
                {currentView === 'dismiss' && 'Processar Extinção Laboral'}
                {currentView === 'readmit' && 'Processar Readmissão'}
              </h3>
              <p className="text-[10px] text-white/75 mt-1 uppercase font-bold tracking-tighter">
                {employee.name} • ID: {String(employee.id).padStart(4, '0')}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-white/80 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[75vh]">
          {currentView === 'options' && (
            <div className="space-y-6">
              {/* Briefly show employee details */}
              <div className="p-4 bg-zinc-50 border border-zinc-200 flex items-center gap-4">
                <div className="w-12 h-12 bg-zinc-200 flex items-center justify-center overflow-hidden shrink-0">
                  {employee.image_url ? (
                    <img referrerPolicy="no-referrer" src={employee.image_url} alt="Foto" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-zinc-400 font-bold uppercase text-lg">{employee.name[0]}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-xs text-[#003366] uppercase truncate">{employee.name}</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wide font-semibold mt-0.5">{employee.role}</p>
                  <p className="text-[9px] text-zinc-400 font-mono mt-1">Salário Base: {formatCurrency(employee.salary)}</p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-widest border ${
                    isDismissed 
                      ? 'bg-red-50 text-red-600 border-red-200' 
                      : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  }`}>
                    {isDismissed ? 'Contrato Extinto' : 'No Quadro'}
                  </span>
                </div>
              </div>

              {/* Grid of Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto pr-1">
                
                {/* Visualizar Ficha */}
                <button
                  onClick={() => {
                    setAppSelectedEmployee(employee);
                    setActiveTab('ficha_pessoal');
                    onClose();
                  }}
                  className="flex items-center gap-3 p-2 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 hover:border-[#003366] text-left transition-all group cursor-pointer"
                >
                  <div className="p-1.5 bg-blue-50 text-blue-600 border border-blue-100 group-hover:bg-[#003366] group-hover:text-white transition-all">
                    <Eye size={14} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-[#003366] uppercase tracking-wider">Ver Ficha Pessoal</p>
                    <p className="text-[7px] text-zinc-400 uppercase font-bold mt-0.5">Dossier e dados completos</p>
                  </div>
                </button>

                {/* Editar Cadastro */}
                <button
                  onClick={() => {
                    handleEditEmployee(employee);
                    onClose();
                  }}
                  className="flex items-center gap-3 p-2 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 hover:border-[#003366] text-left transition-all group cursor-pointer"
                >
                  <div className="p-1.5 bg-amber-50 text-amber-600 border border-amber-100 group-hover:bg-[#003366] group-hover:text-white transition-all">
                    <Edit size={14} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-[#003366] uppercase tracking-wider">Editar Cadastro</p>
                    <p className="text-[7px] text-zinc-400 uppercase font-bold mt-0.5">Alterar informações cadastrais</p>
                  </div>
                </button>

                {/* Emitir Contrato */}
                <button
                  onClick={() => {
                    setAppSelectedEmployee(employee);
                    if (onSetIsContractModalOpen) {
                      onSetIsContractModalOpen(true);
                    } else {
                      setActiveTab('contracts');
                    }
                    onClose();
                  }}
                  className="flex items-center gap-3 p-2 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 hover:border-[#003366] text-left transition-all group cursor-pointer"
                >
                  <div className="p-1.5 bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:bg-[#003366] group-hover:text-white transition-all">
                    <FileSignature size={14} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-[#003366] uppercase tracking-wider">Emitir Contrato</p>
                    <p className="text-[7px] text-zinc-400 uppercase font-bold mt-0.5">Gerar vínculo laboral em PDF</p>
                  </div>
                </button>

                {/* Acerto Salarial */}
                <button
                  onClick={() => {
                    setAppSelectedEmployee(employee);
                    setActiveTab('payroll');
                    onClose();
                  }}
                  className="flex items-center gap-3 p-2 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 hover:border-[#003366] text-left transition-all group cursor-pointer"
                >
                  <div className="p-1.5 bg-teal-50 text-teal-600 border border-teal-100 group-hover:bg-[#003366] group-hover:text-white transition-all">
                    <Coins size={14} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-[#003366] uppercase tracking-wider">Acerto Salarial</p>
                    <p className="text-[7px] text-zinc-400 uppercase font-bold mt-0.5">Lançar compensações extra</p>
                  </div>
                </button>

                {/* Adiantamento */}
                <button
                  onClick={() => {
                    setAppSelectedEmployee(employee);
                    setActiveTab('payroll');
                    onClose();
                  }}
                  className="flex items-center gap-3 p-2 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 hover:border-[#003366] text-left transition-all group cursor-pointer"
                >
                  <div className="p-1.5 bg-orange-50 text-orange-600 border border-orange-100 group-hover:bg-[#003366] group-hover:text-white transition-all">
                    <Wallet size={14} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-[#003366] uppercase tracking-wider">Adiantamento</p>
                    <p className="text-[7px] text-zinc-400 uppercase font-bold mt-0.5">Registar adiantamento mensal</p>
                  </div>
                </button>

                {/* Fardas ou Equipamentos */}
                <button
                  onClick={() => {
                    setAppSelectedEmployee(employee);
                    setActiveTab('workstation_management');
                    onClose();
                  }}
                  className="flex items-center gap-3 p-2 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 hover:border-[#003366] text-left transition-all group cursor-pointer"
                >
                  <div className="p-1.5 bg-slate-50 text-slate-600 border border-slate-100 group-hover:bg-[#003366] group-hover:text-white transition-all">
                    <Shirt size={14} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-[#003366] uppercase tracking-wider">Fardas e Equipos</p>
                    <p className="text-[7px] text-zinc-400 uppercase font-bold mt-0.5">Controlo de fardaria e EPIs</p>
                  </div>
                </button>

                {/* Informações Complementares */}
                <button
                  onClick={() => {
                    setAppSelectedEmployee(employee);
                    setActiveTab('personal_registry');
                    onClose();
                  }}
                  className="flex items-center gap-3 p-2 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 hover:border-[#003366] text-left transition-all group cursor-pointer"
                >
                  <div className="p-1.5 bg-cyan-50 text-cyan-600 border border-cyan-100 group-hover:bg-[#003366] group-hover:text-white transition-all">
                    <Info size={14} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-[#003366] uppercase tracking-wider">Inf. Complementares</p>
                    <p className="text-[7px] text-zinc-400 uppercase font-bold mt-0.5">Dossier de dados adicionais</p>
                  </div>
                </button>

                {/* Multas / Penalização */}
                <button
                  onClick={() => {
                    if (onOpenFines) {
                      onOpenFines(employee);
                    } else {
                      setAppSelectedEmployee(employee);
                      setActiveTab('payroll');
                    }
                    onClose();
                  }}
                  className="flex items-center gap-3 p-2 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 hover:border-[#003366] text-left transition-all group cursor-pointer"
                >
                  <div className="p-1.5 bg-red-50 text-red-600 border border-red-100 group-hover:bg-[#003366] group-hover:text-white transition-all">
                    <Ban size={14} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-[#003366] uppercase tracking-wider">Multas e Penalizações</p>
                    <p className="text-[7px] text-zinc-400 uppercase font-bold mt-0.5">Registar descontos disciplinares</p>
                  </div>
                </button>

                {/* Upload Documentos */}
                <button
                  onClick={() => {
                    if (onOpenDocuments) {
                      onOpenDocuments(employee);
                    } else {
                      setAppSelectedEmployee(employee);
                      setActiveTab('personal_registry');
                    }
                    onClose();
                  }}
                  className="flex items-center gap-4 p-2 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 hover:border-[#003366] text-left transition-all group cursor-pointer"
                >
                  <div className="p-1.5 bg-purple-50 text-purple-600 border border-purple-100 group-hover:bg-[#003366] group-hover:text-white transition-all">
                    <FolderUp size={14} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-[#003366] uppercase tracking-wider">Upload Documentos</p>
                    <p className="text-[7px] text-zinc-400 uppercase font-bold mt-0.5">Habilitar dossier anexado</p>
                  </div>
                </button>

                {/* Ocorrências */}
                <button
                  onClick={() => {
                    setAppSelectedEmployee(employee);
                    setActiveTab('attendance_map');
                    onClose();
                  }}
                  className="flex items-center gap-3 p-2 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 hover:border-[#003366] text-left transition-all group cursor-pointer"
                >
                  <div className="p-1.5 bg-lime-50 text-lime-600 border border-lime-100 group-hover:bg-[#003366] group-hover:text-white transition-all">
                    <ClipboardList size={14} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-[#003366] uppercase tracking-wider">Ocorrências</p>
                    <p className="text-[7px] text-zinc-400 uppercase font-bold mt-0.5">Historial das faltas e justificações</p>
                  </div>
                </button>

                {/* Cadastro Geral */}
                <button
                  onClick={() => {
                    setAppSelectedEmployee(employee);
                    setActiveTab('personal_registry');
                    onClose();
                  }}
                  className="flex items-center gap-3 p-2 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 hover:border-[#003366] text-left transition-all group cursor-pointer"
                >
                  <div className="p-1.5 bg-sky-50 text-sky-600 border border-sky-100 group-hover:bg-[#003366] group-hover:text-white transition-all">
                    <UserCheck size={14} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-[#003366] uppercase tracking-wider">Cadastro Geral</p>
                    <p className="text-[7px] text-zinc-400 uppercase font-bold mt-0.5">Controlo de dados primordiais</p>
                  </div>
                </button>

                {/* Relatório do Colaborador */}
                <button
                  onClick={() => {
                    setAppSelectedEmployee(employee);
                    setActiveTab('ficha_pessoal');
                    onClose();
                  }}
                  className="flex items-center gap-3 p-2 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 hover:border-[#003366] text-left transition-all group cursor-pointer"
                >
                  <div className="p-1.5 bg-yellow-50 text-yellow-600 border border-yellow-105 group-hover:bg-[#003366] group-hover:text-white transition-all">
                    <Eye size={14} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-[#003366] uppercase tracking-wider">Relatório do Colaborador</p>
                    <p className="text-[7px] text-zinc-400 uppercase font-bold mt-0.5">Visão curricular e financeira</p>
                  </div>
                </button>

                {/* Outros Subsídios */}
                <button
                  onClick={() => {
                    setAppSelectedEmployee(employee);
                    setActiveTab('payroll');
                    onClose();
                  }}
                  className="flex items-center gap-3 p-2 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 hover:border-[#003366] text-left transition-all group cursor-pointer"
                >
                  <div className="p-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 group-hover:bg-[#003366] group-hover:text-white transition-all">
                    <PlusCircle size={14} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-[#003366] uppercase tracking-wider">Outros Subsídios</p>
                    <p className="text-[7px] text-zinc-400 uppercase font-bold mt-0.5">Abonos, prémios e gratificações</p>
                  </div>
                </button>

                {/* Declaração de Serviço */}
                <button
                  onClick={() => {
                    setAppSelectedEmployee(employee);
                    setActiveTab('declaracao_servico');
                    onClose();
                  }}
                  className="flex items-center gap-3 p-2 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 hover:border-[#003366] text-left transition-all group cursor-pointer"
                >
                  <div className="p-1.5 bg-cyan-50 text-cyan-600 border border-cyan-100 group-hover:bg-[#003366] group-hover:text-white transition-all">
                    <FileSignature size={14} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-[#003366] uppercase tracking-wider">Declaração de Serviço</p>
                    <p className="text-[7px] text-zinc-400 uppercase font-bold mt-0.5">Emitir comprovativo profissional</p>
                  </div>
                </button>

                {/* Acordo de Confidencialidade */}
                <button
                  onClick={() => {
                    setAppSelectedEmployee(employee);
                    setActiveTab('acordo_confidencialidade');
                    onClose();
                  }}
                  className="flex items-center gap-3 p-2 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 hover:border-[#003366] text-left transition-all group cursor-pointer"
                >
                  <div className="p-1.5 bg-purple-50 text-purple-600 border border-purple-105 group-hover:bg-[#003366] group-hover:text-white transition-all">
                    <ShieldCheck size={14} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-[#003366] uppercase tracking-wider">Confidencialidade</p>
                    <p className="text-[7px] text-zinc-400 uppercase font-bold mt-0.5">Gerar acordo de sigilo e ética</p>
                  </div>
                </button>

                {/* Demitir / Suspensão ou Readmitir */}
                {!isDismissed ? (
                  <button
                    onClick={() => setCurrentView('dismiss')}
                    className="flex items-center gap-3 p-2 bg-[#FFF5F5] hover:bg-red-50 border border-red-105 hover:border-red-600 text-left transition-all group cursor-pointer"
                  >
                    <div className="p-1.5 bg-red-100 text-red-600 border border-red-200 group-hover:bg-red-600 group-hover:text-white transition-all">
                      <UserMinus size={14} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-red-600 uppercase tracking-wider">Demitir Colaborador</p>
                      <p className="text-[7px] text-red-400 uppercase font-bold mt-0.5">Rescisão e bloqueio de acesso</p>
                    </div>
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentView('readmit')}
                    className="flex items-center gap-3 p-2 bg-emerald-50 hover:bg-emerald-110 border border-emerald-100 hover:border-emerald-600 text-left transition-all group cursor-pointer"
                  >
                    <div className="p-1.5 bg-emerald-100 text-emerald-600 border border-emerald-200 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                      <UserCheck size={14} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-emerald-600 uppercase tracking-wider">Readmitir Colaborador</p>
                      <p className="text-[7px] text-emerald-400 uppercase font-bold mt-0.5">Reativar vínculo no quadro de ativos</p>
                    </div>
                  </button>
                )}

              </div>
            </div>
          )}

          {currentView === 'dismiss' && (
            <form onSubmit={handleDismissSubmit} className="space-y-4">
              <div className="bg-red-50 border border-red-100 p-4 text-xs text-red-800 flex gap-3">
                <Info size={18} className="shrink-0 text-red-600" />
                <div>
                  <p className="font-extrabold uppercase tracking-wide">Aviso de Bloqueio</p>
                  <p className="mt-1 leading-relaxed uppercase tracking-tighter text-[10px]">A demissão alterará o estado para <strong>"Demitido / Bloqueado"</strong>, impedindo qualquer processamento de salário futuro a partir da data informada.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[8px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 flex items-center gap-1">
                    <Calendar size={12} className="text-zinc-400" /> Data de Rescisão
                  </label>
                  <input
                    type="date"
                    required
                    value={dismissData.date}
                    onChange={e => setDismissData({ ...dismissData, date: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs font-bold uppercase focus:outline-none focus:border-red-600"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">
                    Ordenado por
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Administrador / Diretor de RH"
                    value={dismissData.orderedBy}
                    onChange={e => setDismissData({ ...dismissData, orderedBy: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs font-bold uppercase focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[8px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">
                  Motivo da Demissão
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Rescisão mútua, Fim de Contrato, Justa Causa..."
                  value={dismissData.reason}
                  onChange={e => setDismissData({ ...dismissData, reason: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs font-bold uppercase focus:outline-none focus:border-red-600"
                />
              </div>

              <div>
                <label className="block text-[8px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">
                  Observações Adicionais (Opcional)
                </label>
                <textarea
                  placeholder="Escreva detalhes ou termos adicionais da rescisão do contrato de trabalho..."
                  value={dismissData.observations}
                  onChange={e => setDismissData({ ...dismissData, observations: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 p-2 h-20 text-xs font-medium focus:outline-none focus:border-red-600"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setCurrentView('options')}
                  className="flex-1 py-2 text-zinc-500 font-extrabold uppercase text-[10px] tracking-widest hover:bg-zinc-50 transition-colors border border-zinc-250 cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={isDismissing}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-extrabold uppercase text-[10px] tracking-widest transition-all cursor-pointer shadow-md disabled:bg-red-300"
                >
                  {isDismissing ? 'Processando...' : 'Confirmar Demissão'}
                </button>
              </div>
            </form>
          )}

          {currentView === 'readmit' && (
            <form onSubmit={handleReadmitSubmit} className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-100 p-4 text-xs text-emerald-800 flex gap-3">
                <Info size={18} className="shrink-0 text-emerald-600" />
                <div>
                  <p className="font-extrabold uppercase tracking-wide">Processo de Readmissão</p>
                  <p className="mt-1 leading-relaxed uppercase tracking-tighter text-[10px]">A readmissão reativará o registo deste colaborador, permitindo que ele volte a ser listado normalmente e receba salários a partir da data de recontratação.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[8px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 flex items-center gap-1">
                    <Calendar size={12} className="text-zinc-400" /> Data de Readmissão
                  </label>
                  <input
                    type="date"
                    required
                    value={readmitData.date}
                    onChange={e => setReadmitData({ ...readmitData, date: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs font-bold uppercase focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">
                    Ordenado por
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Administrador / Diretor de RH"
                    value={readmitData.orderedBy}
                    onChange={e => setReadmitData({ ...readmitData, orderedBy: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs font-bold uppercase focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[8px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">
                  Motivo da Readmissão
                </label>
                <input
                  type="text"
                  required
                  value={readmitData.reason}
                  onChange={e => setReadmitData({ ...readmitData, reason: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs font-bold uppercase focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-[8px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">
                  Observações de Readmissão (Opcional)
                </label>
                <textarea
                  placeholder="Escreva termos adicionais sobre a contratação ou recolocação..."
                  value={readmitData.observations}
                  onChange={e => setReadmitData({ ...readmitData, observations: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 p-2 h-20 text-xs font-medium focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setCurrentView('options')}
                  className="flex-1 py-2 text-zinc-500 font-extrabold uppercase text-[10px] tracking-widest hover:bg-zinc-50 transition-colors border border-zinc-250 cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={isReadmitting}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold uppercase text-[10px] tracking-widest transition-all cursor-pointer shadow-md disabled:bg-emerald-300"
                >
                  {isReadmitting ? 'Readmitindo...' : 'Confirmar Readmissão'}
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};
