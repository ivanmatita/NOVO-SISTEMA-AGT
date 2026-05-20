import React, { useState, useEffect, useRef } from 'react';
import { Employee, CompanyData } from '../types';
import { 
  Bold, Italic, AlignLeft, AlignCenter, AlignRight, AlignJustify, 
  Trash2, Edit, Check, Lock, FileText, Undo2, Redo2, List, ListOrdered, FileSignature, X
} from 'lucide-react';

interface ContractModalProps {
  employee?: Employee;
  contract?: any; // If editing
  companyData?: CompanyData | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const CONTRACT_TYPES = [
  "Contrato por Tempo Indeterminado",
  "Contrato por Tempo Determinado",
  "Contrato de Aprendizagem",
  "Contrato de Comissão de Serviço",
  "Contrato de Estágio",
  "Contrato de trabalho no Domicílio",
  "Contrato de trabalho Rural",
  "Contrato de trabalho a Bordo de Embarcações",
  "Contrato de trabalho a Bordo de Aeronaves",
  "Contrato de Trabalho Desportivo",
  "Contrato de Trabalho Doméstico",
  "Contrato de Grupo",
  "Contrato de Trabalho Temporário"
];

const ContractModal = ({ employee, contract, companyData, onClose, onSuccess }: ContractModalProps) => {
  const isEditing = !!contract;
  const editorRef = useRef<HTMLDivElement>(null);
  // Form Fields - Blank on emit unless editing
  const [startDate, setStartDate] = useState(contract?.start_date || '');
  const [duration, setDuration] = useState<number | ''>(contract?.duration_months !== undefined ? contract.duration_months : '');
  const [experimentalDays, setExperimentalDays] = useState<number | ''>(contract?.experimental_days !== undefined ? contract.experimental_days : '');
  const [noticeDays, setNoticeDays] = useState<number | ''>(contract?.notice_days !== undefined ? contract.notice_days : '');
  const [salary, setSalary] = useState<number | ''>(contract?.salary || '');
  
  const [repName, setRepName] = useState(contract?.representative_name || '');
  const [repDocType, setRepDocType] = useState(contract?.representative_doc_type || 'Bilhete de identidade');
  const [repDocNum, setRepDocNum] = useState(contract?.representative_doc_number || '');
  const [repNationality, setRepNationality] = useState(contract?.representative_nationality || '');
  const [repRole, setRepRole] = useState(contract?.representative_role || '');

  const [selectedType, setSelectedType] = useState<string>(contract?.contract_type || "Contrato por Tempo Indeterminado");
  const [isManualEdit, setIsManualEdit] = useState(!!contract);

  // Helper template generator
  const getTemplateContent = () => {
    const cleanRepName = repName || '_________________________________';
    const cleanRepDocType = repDocType || '_________________________________';
    const cleanRepDocNum = repDocNum || '_________________________________';
    const cleanRepNationality = repNationality || '_________________________________';
    const cleanRepRole = repRole || '_________________________________';

    const empName = employee?.name || '_________________________________';
    const empRole = employee?.role || '_________________________________';
    const empBirthday = employee?.birth_date && !isNaN(Date.parse(employee.birth_date)) ? new Date(employee.birth_date).toLocaleDateString('pt-AO') : '___/___/______';
    const empCivil = employee?.marital_status || '_________________________________';
    const empBi = employee?.bi || '_________________________________';
    const empAddress = [employee?.rua, employee?.bairro, employee?.municipio_morada || 'Luanda'].filter(Boolean).join(', ') || '_________________________________';
    const empNif = employee?.nif || empBi || '_________________________________';

    const baseCompany = companyData?.name || '_________________________________';
    const companyAddress = companyData?.address || '_________________________________';
    const companyNif = companyData?.nif || '_________________________________';

    const formattedSalary = salary ? Number(salary).toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' }) : '__________________';
    const displayStartDate = startDate && !isNaN(Date.parse(startDate)) ? new Date(startDate).toLocaleDateString('pt-AO') : '___/___/______';
    const displayExperimental = experimentalDays !== '' ? experimentalDays : '____';
    const displayNotice = noticeDays !== '' ? noticeDays : '____';
    const displayDuration = duration !== '' ? duration : '____';

    return `
      <div style="font-family: 'Inter', sans-serif; line-height: 1.6; color: #1f2937;">
        <h2 style="text-align: center; font-size: 1.25rem; font-weight: 800; text-transform: uppercase; margin-bottom: 0.25rem; color: #003366;">
          ${selectedType}
        </h2>
        <p style="text-align: center; font-size: 0.875rem; font-weight: 600; margin-top: 0; margin-bottom: 1.5rem; text-transform: uppercase; color: #4b5563;">
          Lei Geral do Trabalho de Angola (Lei 12/23 de 27 de Dezembro)
        </p>

        <p>Entre</p>
        <p>
          <strong>${baseCompany}</strong>, com sede em ${companyAddress}, contribuinte fiscal Nº ${companyNif}, representada neste acto por <strong>${cleanRepName}</strong>, de nacionalidade ${cleanRepNationality}, portador do ${cleanRepDocType} nº ${cleanRepDocNum}, na qualidade de ${cleanRepRole}, com plenos poderes para o acto, adiante designado por <strong>EMPREGADOR</strong>
        </p>
        <p>E</p>
        <p>
          <strong>${empName}</strong>, estado civil ${empCivil}, nascido(a) em <strong>${empBirthday}</strong>, residente em ${empAddress}, Titular do Bilhete de Identidade Nº <strong>${empBi}</strong>, emitido em <strong>${displayStartDate}</strong>, pelo arquivo de identificação civil nacional, contribuinte fiscal Nº <strong>${empNif}</strong>, adiante designado por <strong>TRABALHADOR</strong>.
        </p>
        
        <p>É celebrado o presente Contrato de Trabalho que se rege pelas disposições da Lei Geral do Trabalho (LGT) e respectiva Legislação Complementar, Regulamentos Internos, Acordos Colectivos e ainda pelas cláusulas seguintes:</p>

        <p><strong>Cláusula 1: (Das Tarefas do Trabalhador)</strong><br />
        A Actividade do trabalhador consiste em trabalhos inerentes à actividade de <strong>${empRole}</strong>, e é prestado em local de trabalho Sede da Empresa. Por motivos adequados ao interesse da economia nacional e nos limites da Lei, o EMPREGADOR reserva a faculdade de transferir o trabalhador para outro local de trabalho. É objecto do presente contrato a prestação de serviços do TRABALHADOR à EMPRESA, de acordo com o Estatuto da empresa, Regulamentos e a Lei Geral do Trabalho.</p>

        <p><strong>Cláusula 2: (Categoria Profissional)</strong><br />
        Ao <strong>TRABALHADOR</strong> é garantida a ocupação efectiva do posto de trabalho de <strong>${empRole}</strong> pertencente ao qualificador ocupacional regulamentado e integrado na escala salarial do sector de actividade profissional.</p>

        <p><strong>Cláusula 3: (Duração do Trabalho)</strong><br />
        O período normal de trabalho diário é de <strong>8</strong> horas diárias, perfazendo um total de <strong>44</strong> horas semanais, com os intervalos de descanso legalmente estabelecidos.</p>

        <p><strong>Cláusula 4: (Remuneração do Trabalhador)</strong><br />
        O <strong>TRABALHADOR</strong> tem direito a uma remuneração paga mensalmente, sob a forma monetária no valor bruto de <strong>${formattedSalary}</strong> (AOA), sujeito aos devidos descontos legais (IRT e INSS), integrado pelos seguintes elementos e subsídios nos termos da lei aplicável.</p>

        <p><strong>Cláusula 5: (Segurança, Higiene e Saúde no Trabalho)</strong><br />
        O posto de trabalho obedece às condições de higiene, segurança e saúde no trabalho legalmente exigidas por lei.</p>

        <p><strong>Cláusula 6: (Duração do Contrato e Início)</strong><br />
        O presente contrato é celebrado por ${selectedType === "Contrato por Tempo Indeterminado" ? "tempo indeterminado" : `${displayDuration} meses`} com início em <strong>${displayStartDate}</strong>, com um período experimental de <strong>${displayExperimental}</strong> dias.</p>

        <p><strong>Cláusula 7: (Confidencialidade)</strong><br />
        No acto de assinatura do contrato e após a cessação do mesmo, o trabalhador obriga-se a manter total confidencialidade e a não divulgar a terceiros dados técnicos, operacionais ou comerciais a que tenha acesso.</p>

        <p><strong>Cláusula 8: (Da Nulidade do Contrato)</strong><br />
        Qualquer alteração ou modificação das condições estabelecidas neste contrato apenas será válida se celebrada por mútuo acordo por escrito pelas partes.</p>

        <p><strong>Cláusula 9: (Pré-Aviso de Rescisão)</strong><br />
        Ocorrendo motivos justificativos por qualquer das partes para a rescisão com pré-aviso, a iniciativa deve ser comunicada com antecedência mínima de <strong>${displayNotice}</strong> dias nos termos da legislação em vigor.</p>

        <p><strong>Cláusula 10: (Renovação)</strong><br />
        O contrato vigora pelo período acima acordado, renovando-se nos termos permitidos pela Lei Geral do Trabalho de Angola caso nenhuma das partes se oponha por escrito.</p>

        <p><strong>Cláusula 11: (Regulamentos Internos)</strong><br />
        O TRABALHADOR declara expressamente ter tomado conhecimento das normas internas de disciplina e serviço em vigor nas instalações da empresa.</p>

        <p><strong>Cláusula 12: (Vias de Contrato e Trâmites)</strong><br />
        O presente contrato é redigido e assinado em três exemplares de igual valor jurídico, destinando-se uma via ao trabalhador, outra para a entidade empregadora e a terceira a ser arquivada pelo Centro de Emprego competente.</p>

        <p style="margin-top: 3rem;">O TRABALHADOR:<br />
        ____________________________________________________</p>

        <p style="margin-top: 2rem;">O EMPREGADOR:<br />
        ____________________________________________________</p>

        <p style="margin-top: 3rem; text-align: right;">Luanda, _____ de ____________________ de ________</p>
      </div>
    `;
  };

  useEffect(() => {
    if (!isManualEdit && editorRef.current) {
      editorRef.current.innerHTML = getTemplateContent();
    }
  }, [startDate, duration, experimentalDays, noticeDays, salary, repName, repDocType, repDocNum, repNationality, repRole, selectedType]);

  const execCommand = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    setIsManualEdit(true);
  };

  const handleSave = async () => {
    const htmlContent = editorRef.current?.innerHTML || '';
    const payload = {
      id: contract?.id || null,
      employee_id: employee?.id || contract?.employee_id,
      employee_name: employee?.name || contract?.employee_name,
      employee_role: employee?.role || contract?.employee_role,
      contract_type: selectedType,
      start_date: startDate,
      duration_months: duration,
      experimental_days: experimentalDays,
      notice_days: noticeDays,
      salary: salary,
      representative_name: repName,
      representative_doc_type: repDocType,
      representative_doc_number: repDocNum,
      representative_nationality: repNationality,
      representative_role: repRole,
      content: htmlContent,
      status: 'active'
    };

    try {
      const url = isEditing ? `/api/contracts/${contract.id}` : '/api/contracts';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        if (onSuccess) onSuccess();
        onClose();
      } else {
        alert('Erro ao guardar o contrato. Por favor, tente novamente.');
      }
    } catch (e) {
      console.error('Error saving contract info:', e);
      alert('Erro de ligação ao servidor.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white border-2 border-zinc-900 w-full max-w-7xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden leading-normal">
        
        {/* Header */}
        <div className="bg-[#003366] text-white p-5 flex justify-between items-center border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <FileSignature size={22} className="text-white animate-pulse" />
            <div>
              <h2 className="text-sm font-black uppercase tracking-[0.2em]">
                {isEditing ? `Editar Contrato - ${contract?.employee_name}` : `Emitir Contrato - ${employee?.name}`}
              </h2>
              <p className="text-[10px] text-white/60 uppercase tracking-widest font-black">Área de Vínculos de Recursos Humanos / LGT</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form panel */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-zinc-50">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LGT Settings Panel - 10 columns divided */}
            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white border border-zinc-200 p-6 shadow-sm">
              
              {/* INTERVENIENTES */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#003366] border-b border-zinc-100 pb-2 flex items-center gap-2">
                  <span className="w-1.5 h-3 bg-[#003366] block"></span>
                  Intervenientes
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-wider">Data Início Contrato</label>
                    <input 
                      type="date" 
                      className="w-full border border-zinc-200 p-2 text-xs font-bold uppercase tracking-wider bg-[#fafafa] placeholder-zinc-400 focus:bg-white transition-all focus:border-[#003366] duration-200"
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-wider">Duração (Meses)</label>
                    <input 
                      type="number" 
                      className="w-full border border-zinc-200 p-2 text-xs font-bold bg-[#fafafa] placeholder-zinc-400 focus:bg-white transition-all focus:border-[#003366] duration-200"
                      value={duration} 
                      onChange={(e) => setDuration(e.target.value !== '' ? Number(e.target.value) : '')} 
                      placeholder="Prazo de duração do vínculo em meses (ex: 12)"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-wider">Dias Experiência</label>
                    <input 
                      type="number" 
                      className="w-full border border-zinc-200 p-2 text-xs font-bold bg-[#fafafa] placeholder-zinc-400 focus:bg-white transition-all focus:border-[#003366] duration-200"
                      value={experimentalDays} 
                      onChange={(e) => setExperimentalDays(e.target.value !== '' ? Number(e.target.value) : '')} 
                      placeholder="Duração do período experimental em dias (ex: 60)"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-wider">Aviso Prévio (Dias)</label>
                    <input 
                      type="number" 
                      className="w-full border border-zinc-200 p-2 text-xs font-bold bg-[#fafafa] placeholder-zinc-400 focus:bg-white transition-all focus:border-[#003366] duration-200"
                      value={noticeDays} 
                      onChange={(e) => setNoticeDays(e.target.value !== '' ? Number(e.target.value) : '')} 
                      placeholder="Prazo oficial para aviso prévio de cessação"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-wider">Salário Mensal (AKZ)</label>
                  <input 
                    type="number" 
                    className="w-full border border-zinc-200 p-2 text-xs font-bold text-[#003366] bg-[#fafafa] placeholder-zinc-400 focus:bg-white transition-all focus:border-[#003366] duration-200"
                    value={salary} 
                    onChange={(e) => setSalary(e.target.value !== '' ? Number(e.target.value) : '')} 
                    placeholder="Vencimento mensal de base ilíquido em Kwanzas"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-wider">Nome do Responsável (Empregador)</label>
                  <input 
                    type="text" 
                    className="w-full border border-zinc-200 p-2 text-xs font-bold uppercase bg-[#fafafa] placeholder-zinc-400 focus:bg-white transition-all focus:border-[#003366] duration-200"
                    value={repName} 
                    onChange={(e) => setRepName(e.target.value)} 
                    placeholder="Nome completo do outorgante/representante"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-wider">Doc. de Identificação</label>
                    <select 
                      className="w-full border border-zinc-200 p-2 text-xs font-bold uppercase bg-white focus:outline-none focus:border-[#003366]"
                      value={repDocType} 
                      onChange={(e) => setRepDocType(e.target.value)}
                    >
                      <option value="Bilhete de identidade">Bilhete de identidade</option>
                      <option value="Passaporte">Passaporte</option>
                      <option value="Cartão de residente">Cartão de residente</option>
                      <option value="Cédula">Cédula</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-wider">Nº de Documento</label>
                    <input 
                      type="text" 
                      className="w-full border border-zinc-200 p-2 text-xs font-bold uppercase bg-[#fafafa] placeholder-zinc-400 focus:bg-white transition-all focus:border-[#003366] duration-200"
                      value={repDocNum} 
                      onChange={(e) => setRepDocNum(e.target.value)} 
                      placeholder="Nº de documento oficial de identificação"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-wider">Nacionalidade Responsável</label>
                    <input 
                      type="text" 
                      className="w-full border border-zinc-200 p-2 text-xs font-bold uppercase bg-[#fafafa] placeholder-zinc-400 focus:bg-white transition-all focus:border-[#003366] duration-200"
                      value={repNationality} 
                      onChange={(e) => setRepNationality(e.target.value)} 
                      placeholder="Nacionalidade oficial (ex: Angolana)"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-wider">Cargo Responsável</label>
                    <input 
                      type="text" 
                      className="w-full border border-zinc-200 p-2 text-xs font-bold uppercase bg-[#fafafa] placeholder-zinc-400 focus:bg-white transition-all focus:border-[#003366] duration-200"
                      value={repRole} 
                      onChange={(e) => setRepRole(e.target.value)} 
                      placeholder="Cargo na empresa delegante (ex: Diretor Geral)"
                    />
                  </div>
                </div>
              </div>

              {/* TIPO DE CONTRATO */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#003366] border-b border-zinc-100 pb-2 flex items-center gap-2">
                  <span className="w-1.5 h-3 bg-[#003366] block"></span>
                  Selecção do Tipo de Contrato
                </h3>
                <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-2 divide-y divide-zinc-100">
                  {CONTRACT_TYPES.map((type, idx) => (
                    <label key={idx} className="flex items-center gap-3 py-1.5 cursor-pointer hover:bg-zinc-50 select-none text-xs">
                      <input 
                        type="radio" 
                        name="contract_type_group" 
                        className="w-4 h-4 text-[#003366] focus:ring-[#003366]"
                        checked={selectedType === type}
                        onChange={() => {
                          setSelectedType(type);
                          // Automatic adjustments matching normal practices
                          if (type === "Contrato por Tempo Indeterminado") {
                            setDuration(0);
                          } else if (duration === 0) {
                            setDuration(12);
                          }
                        }}
                      />
                      <span className={`font-bold uppercase tracking-tight ${selectedType === type ? 'text-[#003366]' : 'text-zinc-600'}`}>{type}</span>
                    </label>
                  ))}
                </div>
              </div>

            </div>

            {/* DESCRIPTION ADVICE BOX - 4 columns */}
            <div className="lg:col-span-4 bg-white border border-zinc-200 p-6 shadow-sm space-y-4 h-full">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#003366] border-b border-zinc-100 pb-2 flex items-center gap-2">
                <span className="w-1.5 h-3 bg-[#003366] block"></span>
                Descrição
              </h3>
              
              <div className="bg-zinc-50 border border-zinc-100 p-4 space-y-4">
                <div>
                  <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">Período Experimental:</h4>
                  <div className="space-y-1 font-mono text-[9px] text-zinc-600 line-clamp-4">
                    <p className="border-b border-zinc-200 pb-1">{"<=60 dias --- Trabalhadores"}</p>
                    <p className="border-b border-zinc-200 pb-1">{"<=120 / 180 dias para funções de direcção."}</p>
                    <p className="font-bold text-[#003366] bg-blue-50 px-2 py-0.5 mt-2">Duração definida: {experimentalDays} dias.</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-200">
                  <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">Aviso Prévio:</h4>
                  <div className="space-y-1 font-mono text-[9px] text-zinc-600">
                    <p className="font-bold text-[#003366] bg-blue-50 px-2 py-0.5 mb-1">Aviso configurado: {noticeDays} dias.</p>
                    {selectedType === "Contrato por Tempo Indeterminado" ? (
                      <p className="text-emerald-600 font-bold uppercase">Duração por tempo indeterminado.</p>
                    ) : (
                      <p className="text-amber-600 font-bold uppercase">Duração temporária definida.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-zinc-400 uppercase font-black tracking-widest pt-2">
                <p>✓ Legislação vinculada: LGT Lei 12/23</p>
                <p className="mt-1">✓ Sistema imutável certificado AGT</p>
              </div>
            </div>

          </div>

          {/* DOCUMENT EDITOR SECTION */}
          <div className="bg-white border-2 border-zinc-900 p-4 shadow-sm space-y-3">
            <div className="flex justify-between items-center border-b border-zinc-200 pb-3">
              <span className="text-xs font-black uppercase tracking-widest text-[#003366] flex items-center gap-2">
                <FileText size={16} /> Contrato de Trabalho
              </span>
              
              {/* Decorative mini menus */}
              <div className="flex gap-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest select-none">
                <span className="cursor-pointer hover:text-zinc-800">Ficheiro</span>
                <span className="cursor-pointer hover:text-zinc-800">Editar</span>
                <span className="cursor-pointer hover:text-zinc-800">Ver</span>
                <span className="cursor-pointer hover:text-zinc-800">Inserir</span>
                <span className="cursor-pointer hover:text-zinc-800">Formatar</span>
              </div>
            </div>

            {/* Editor formatting toolbar */}
            <div className="flex flex-wrap gap-1.5 p-2 bg-zinc-50 border border-zinc-200">
              <button onClick={() => execCommand('undo')} type="button" className="p-1.5 hover:bg-zinc-200" title="Desfazer"><Undo2 size={14} /></button>
              <button onClick={() => execCommand('redo')} type="button" className="p-1.5 hover:bg-zinc-200" title="Refazer"><Redo2 size={14} /></button>
              <div className="h-6 w-px bg-zinc-300 mx-1"></div>
              
              <button onClick={() => execCommand('bold')} type="button" className="p-1.5 hover:bg-zinc-200 font-bold" title="Negrito"><Bold size={14} /></button>
              <button onClick={() => execCommand('italic')} type="button" className="p-1.5 hover:bg-zinc-200 italic" title="Itálico"><Italic size={14} /></button>
              <div className="h-6 w-px bg-zinc-300 mx-1"></div>
              
              <button onClick={() => execCommand('justifyLeft')} type="button" className="p-1.5 hover:bg-zinc-200" title="Alinhar à Esquerda"><AlignLeft size={14} /></button>
              <button onClick={() => execCommand('justifyCenter')} type="button" className="p-1.5 hover:bg-zinc-200" title="Centralizar"><AlignCenter size={14} /></button>
              <button onClick={() => execCommand('justifyRight')} type="button" className="p-1.5 hover:bg-zinc-200" title="Alinhar à Direita"><AlignRight size={14} /></button>
              <button onClick={() => execCommand('justifyFull')} type="button" className="p-1.5 hover:bg-zinc-200" title="Justificado"><AlignJustify size={14} /></button>
              <div className="h-6 w-px bg-zinc-300 mx-1"></div>
              
              <button onClick={() => execCommand('insertUnorderedList')} type="button" className="p-1.5 hover:bg-zinc-200" title="Lista Pendente"><List size={14} /></button>
              <button onClick={() => execCommand('insertOrderedList')} type="button" className="p-1.5 hover:bg-zinc-200" title="Lista Ordenada"><ListOrdered size={14} /></button>

              <div className="ml-auto">
                <button 
                  onClick={() => {
                    setIsManualEdit(false);
                    if (editorRef.current) editorRef.current.innerHTML = getTemplateContent();
                  }}
                  type="button" 
                  className="px-3 py-1 bg-zinc-800 text-white rounded-none hover:bg-black font-black text-[9px] uppercase tracking-widest transition-colors"
                >
                  ↻ Carregar Grelha Original
                </button>
              </div>
            </div>

            {/* Editable Content Frame */}
            <div className="bg-zinc-200 p-8 flex justify-center max-h-[600px] overflow-y-auto border border-zinc-300 shadow-inner">
              <div
                ref={editorRef}
                contentEditable
                onInput={() => setIsManualEdit(true)}
                className="bg-white border border-zinc-300 shadow-lg outline-none text-zinc-800"
                style={{
                  width: '794px',
                  minHeight: '1123px',
                  padding: '50px 70px',
                  boxSizing: 'border-box',
                  fontFamily: '"Inter", sans-serif',
                  fontSize: '11.5px',
                  lineHeight: '1.6',
                  pageBreakInside: 'avoid'
                }}
              />
            </div>
          </div>
        </div>

        {/* Action button bar */}
        <div className="bg-zinc-100 p-4 border-t border-zinc-300 flex justify-end gap-3 no-print">
          <button 
            onClick={onClose} 
            className="px-6 py-2 border border-zinc-400 bg-white text-zinc-700 hover:bg-zinc-50 font-black text-[10px] uppercase tracking-widest transition-all rounded-none"
          >
            Cancelar
          </button>
          
          <button 
            onClick={handleSave} 
            className="px-8 py-2 bg-emerald-600 text-white hover:bg-emerald-700 font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 rounded-none shadow-md"
          >
            <Check size={16} />
            Li e confirmo emissão do contrato
          </button>
        </div>

      </div>
    </div>
  );
};

export default ContractModal;
