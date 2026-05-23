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

    const formattedSalary = salary ? Number(salary).toLocaleString('pt-AO', { minimumFractionDigits: 2 }) : '100.000,00';
    const displayStartDate = startDate && !isNaN(Date.parse(startDate)) ? new Date(startDate).toLocaleDateString('pt-AO') : '20/05/2026';
    const displayExperimental = experimentalDays !== '' ? experimentalDays : '30';
    const displayNotice = noticeDays !== '' ? noticeDays : '30';
    const displayDuration = duration !== '' ? duration : '____';

    return `
      <div style="font-family: 'Inter', sans-serif; line-height: 1.6; color: #000; text-align: justify; font-size: 11px;">
        <h2 style="text-align: center; font-size: 13px; font-weight: 800; text-transform: uppercase; margin-bottom: 0px;">
          ${selectedType}
        </h2>
        <p style="text-align: center; font-size: 12px; font-weight: 700; margin-top: 2px; margin-bottom: 25px;">
          Lei 12/23 de 27 de Dezembro
        </p>

        <p style="margin-bottom: 5px;">Entre</p>
        <p style="margin-bottom: 10px;">
          <strong>${baseCompany}</strong>, com sede em ANGOLA- ${companyAddress}, contribuinte fiscal Nº ${companyNif}, representada neste acto por ${cleanRepName}, de nacionalidade ${cleanRepNationality}, portador do ${cleanRepDocType} nº ${cleanRepDocNum}, na qualidade de ${cleanRepRole}, com plenos poderes para o acto, adiante designado por <strong>EMPREGADOR</strong>
        </p>
        <p style="margin-bottom: 5px;">E</p>
        <p style="margin-bottom: 15px;">
          <strong>${empName}</strong>, estado civil ${empCivil}, nascido(a) em <strong>${empBirthday}</strong>, residente em ${empAddress}, Titular do Bilhete de Identidade Nº <strong>${empBi}</strong>, emitido em <strong>${displayStartDate}</strong>, pelo arquivo de identificação civil nacional, contribuinte fiscal Nº <strong>${empNif}</strong>, adiante designado por <strong>TRABALHADOR</strong>.
        </p>
        
        <p style="margin-bottom: 15px;">É celebrado o presente Contrato de Trabalho que se rege pelas disposições da Lei Geral do Trabalho e respectiva Legislação Complementar, Regulamentos Internos, Acordos Colectivos e ainda pelas cláusulas seguintes:</p>

        <p style="margin-bottom: 12px;"><strong>Cláusula 1:</strong> <i>Das Tarefas do Trabalhador</i><br />
        A Actividade do trabalhador consiste em trabalhos inerentes á actividade de <strong>${empRole}</strong>, e é prestado em local trabalho Sede da Empresa, por motivos adequados ao interesse da economia nacional e nos limites da Lei, reserva a faculdade de transferir o trabalhador para outro local de trabalho. É objecto do presente contrato a prestação de serviços de, do TRABALHADOR à EMPRESA, de acordo com o Estatuto da ${baseCompany}, Regulamentos da ${baseCompany}, a Lei Geral do Trabalho e estipulado entre as partes.</p>

        <p style="margin-bottom: 12px;"><strong>Cláusula 2:</strong> <i>Categoria Profissional</i><br />
        Ao <strong>TRABALHADOR</strong> é garantida a ocupação efectiva do posto de trabalho de <strong>${empRole}</strong> pertencentes ao qualificador ocupacional NA e integrado no grupo NA da escala salarial com a categoria ocupacional de NA.</p>

        <p style="margin-bottom: 12px;"><strong>Cláusula 3:</strong> <i>Duração do Trabalho</i><br />
        O periodo normal de trabalho diário é de <strong>8</strong> horas diárias, perfazendo um total de <strong>44</strong> horas semanais.</p>

        <p style="margin-bottom: 12px;"><strong>Cláusula 4:</strong> <i>Remuneração do Trabalhador</i><br />
        O <strong>TRABALHADOR</strong> tem direito a uma remuneração paga mensalmente, sob a forma monetária no valor de <strong>${formattedSalary} AKZ</strong> ( são ), integrado pelos seguintes elementos: gratificações e/ou outros subsídios, a título de subsídio de férias (50%) e de subsídio de Natal (50%) do salário base, nos termos da lei.</p>

        <p style="margin-bottom: 12px;"><strong>Cláusula 5:</strong> <i>Segurança, higiene e segurança.</i><br />
        O posto de trabalho obedece as condições de segurança, higiene e saúde no trabalho legalmente exigidas.</p>

        <p style="margin-bottom: 12px;"><strong>Cláusula 6:</strong> <i>Duração do Contrato</i><br />
        O contrato é celebrado por tempo indeterminado, com <strong>inicio em ${displayStartDate}</strong>, com um periodo experimental de ${displayExperimental} dias.</p>

        <p style="margin-bottom: 12px;"><strong>Cláusula 7:</strong> <i>Confidencialidade</i><br />
        No acto de assinatura do contrato o trabalhador obriga-se a não divulgar a terceiros ou mesmo em repartições da propria empresa, a natureza do seu trabalho, dados técnicos ou outra informações relevantes a que tiver acesso em função das suas actividades, decorrentes da execução do contrato.</p>

        <p style="margin-bottom: 12px;"><strong>Cláusula 8:</strong> <i>Da nulidade do Contrato</i><br />
        O contrato apenas pode ser modificado nas condições previstas na Lei Geral do Trabalho.</p>

        <p style="margin-bottom: 12px;"><strong>Cláusula 9:</strong> <i>Pré-Aviso de Rescisão</i><br />
        Ocorrendo algum dos motivos que justifiquem a rescisão com aviso prévio, a parte a quem couber a iniciativa avisa a outra com uma antecedência de ${displayNotice} dias especificando as razões que considera justificativas da rescisao que pretende concretizar, depois de observar os requisitos previstos na Lei Geral do Trabalho.</p>

        <p style="margin-bottom: 12px;"><strong>Cláusula 10:</strong> <i>Renovação do Contrato</i><br />
        O contrato cessa no termo do periodo pelo qual foi celebrado e renova-se automaticamente se nenhuma das partes se manifestar.</p>

        <p style="margin-bottom: 12px;"><strong>Cláusula 11:</strong> <i>Horário de Trabalho</i><br />
        No momento da celebração do presente contrato, o trabalhador tomou conhecimento do horário de trabalho, regulamento interno e cordo colectivo em vigor na empresa.</p>

        <p style="margin-bottom: 12px;"><strong>Cláusula 12:</strong> <i>Trâmites legais</i><br />
        O presente contrato é reproduzido em três vias, sendo uma para o trabalhador, a outra para a entidade empregadora e a teceira remetida ao Centro de Emprego competente da respectiva área de actividade.</p>

        <p style="margin-bottom: 12px;"><strong>Cláusula 13:</strong> <i>Responsabilidade acessória</i><br />
        O TRABALHADOR deverá ainda, acessoriamente, realizar quaisquer outras tarefas que lhe sejam indicadas, para as quais tenha qualificação ou capacidade bastantes e que tenha afinidade funcional com as que habitualmente correspondem as suas funções normais, sem qualquer prejuízo para a sua posição na EMPRESA.</p>

        <p style="margin-bottom: 12px;"><strong>Cláusula 14:</strong> <i>Responsabilidade Civil</i><br />
        Findo o presente contrato, seja qual for o motivo ou forma, o segundo outorgante deve devolver, os instrumentos de trabalhos e qualquer outro objeto que seja pertença desta, sob pena de incorrer em responsabilidade criminal e em responsabilidade civil pelos danos causados.</p>

        <p style="margin-bottom: 12px;"><strong>Cláusula 15:</strong> <i>Da Lei Geral do Trabalho</i><br />
        Tudo o mais omisso no presente contrato será regido pela Lei Geral do Trabalho ou outra, que regulamente o presente contrato. Em caso de litígio, será elegida a Comarca de Luanda com renúncia a qualquer outra.</p>

        <p style="margin-top: 40px; margin-bottom: 10px;">O FUNCIONARIO:</p>
        <div style="border-bottom: 1px solid #ddd; width: 100%; margin-bottom: 40px;"></div>

        <p style="margin-bottom: 10px;">O EMPREGADOR:</p>
        <div style="border-bottom: 1px solid #ddd; width: 100%; margin-bottom: 60px;"></div>

        <p style="text-align: right; margin-top: 20px;">Luanda,______ de _______________________ de _________</p>
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
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-wider">Data Inicio Contrato</label>
                    <input 
                      type="date" 
                      className="w-full border border-zinc-200 p-2 text-xs font-bold uppercase tracking-wider bg-[#fafafa] placeholder-zinc-400 focus:bg-white transition-all focus:border-[#003366] duration-200"
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-wider">Duração Contrato (meses)</label>
                    <input 
                      type="number" 
                      className="w-full border border-zinc-200 p-2 text-xs font-bold bg-[#fafafa] placeholder-zinc-400 focus:bg-white transition-all focus:border-[#003366] duration-200"
                      value={duration} 
                      onChange={(e) => setDuration(e.target.value !== '' ? Number(e.target.value) : '')} 
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-wider">Dia de Experiencia (dias)</label>
                    <input 
                      type="number" 
                      className="w-full border border-zinc-200 p-2 text-xs font-bold bg-[#fafafa] placeholder-zinc-400 focus:bg-white transition-all focus:border-[#003366] duration-200"
                      value={experimentalDays} 
                      onChange={(e) => setExperimentalDays(e.target.value !== '' ? Number(e.target.value) : '')} 
                      placeholder="30"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-wider">Pré-Aviso (dias)</label>
                    <input 
                      type="number" 
                      className="w-full border border-zinc-200 p-2 text-xs font-bold bg-[#fafafa] placeholder-zinc-400 focus:bg-white transition-all focus:border-[#003366] duration-200"
                      value={noticeDays} 
                      onChange={(e) => setNoticeDays(e.target.value !== '' ? Number(e.target.value) : '')} 
                      placeholder="30"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-wider">Salario Mensal</label>
                  <input 
                    type="number" 
                    className="w-full border border-zinc-200 p-2 text-xs font-bold text-[#003366] bg-[#fafafa] placeholder-zinc-400 focus:bg-white transition-all focus:border-[#003366] duration-200"
                    value={salary} 
                    onChange={(e) => setSalary(e.target.value !== '' ? Number(e.target.value) : '')} 
                    placeholder="100000.00"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-wider">Nome do Responsavel (Empresa)</label>
                  <input 
                    type="text" 
                    className="w-full border border-zinc-200 p-2 text-xs font-bold uppercase bg-[#fafafa] placeholder-zinc-400 focus:bg-white transition-all focus:border-[#003366] duration-200"
                    value={repName} 
                    onChange={(e) => setRepName(e.target.value)} 
                    placeholder="Xxx"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-wider">Documento de Identificação</label>
                    <select 
                      className="w-full border border-zinc-200 p-2 text-xs font-bold uppercase bg-white focus:outline-none focus:border-[#003366]"
                      value={repDocType} 
                      onChange={(e) => setRepDocType(e.target.value)}
                    >
                      <option value="Bilhete de Identidade">Bilhete de Identidade</option>
                      <option value="Passaporte">Passaporte</option>
                      <option value="Cartão de Residente">Cartão de Residente</option>
                      <option value="Cédula">Cédula</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-wider">Numero do Documento</label>
                    <input 
                      type="text" 
                      className="w-full border border-zinc-200 p-2 text-xs font-bold uppercase bg-[#fafafa] placeholder-zinc-400 focus:bg-white transition-all focus:border-[#003366] duration-200"
                      value={repDocNum} 
                      onChange={(e) => setRepDocNum(e.target.value)} 
                      placeholder="Dd"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-wider">Nacionalidade do Responsavel</label>
                    <input 
                      type="text" 
                      className="w-full border border-zinc-200 p-2 text-xs font-bold uppercase bg-[#fafafa] placeholder-zinc-400 focus:bg-white transition-all focus:border-[#003366] duration-200"
                      value={repNationality} 
                      onChange={(e) => setRepNationality(e.target.value)} 
                      placeholder="Ddd"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-wider">Cargo do Responsável</label>
                    <input 
                      type="text" 
                      className="w-full border border-zinc-200 p-2 text-xs font-bold uppercase bg-[#fafafa] placeholder-zinc-400 focus:bg-white transition-all focus:border-[#003366] duration-200"
                      value={repRole} 
                      onChange={(e) => setRepRole(e.target.value)} 
                      placeholder="Dddd"
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
                <div className="space-y-1.5 max-h-[170px] overflow-y-auto pr-2 divide-y divide-zinc-100">
                  {CONTRACT_TYPES.map((type, idx) => (
                    <label key={idx} className="flex items-center gap-3 py-1.5 cursor-pointer hover:bg-zinc-50 select-none text-xs">
                      <input 
                        type="radio" 
                        name="contract_type_group" 
                        className="w-4 h-4 text-[#003366] focus:ring-[#003366]"
                        checked={selectedType === type}
                        onChange={() => {
                          setSelectedType(type);
                          if (type === "Contrato por Tempo Indeterminado") {
                            setDuration(0);
                          } else if (duration === 0) {
                            setDuration(12);
                          }
                        }}
                      />
                      <span className={`font-bold uppercase tracking-tight ${selectedType === type ? 'text-[#003366]' : 'text-zinc-600 font-bold'}`}>{type}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* DADOS DO FUNCIONÁRIO (READ-ONLY) */}
              <div className="space-y-4 col-span-1 md:col-span-2 mt-4 pt-4 border-t border-zinc-200">
                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                  <span className="w-1.5 h-3 bg-zinc-300 block"></span>
                  Dados do Trabalhador
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-[10px] font-bold text-zinc-600 capitalize">
                  <div>
                    <span className="block text-[9px] text-zinc-400 uppercase tracking-widest font-black">Nome</span>
                    {employee?.name || '---'}
                  </div>
                  <div>
                    <span className="block text-[9px] text-zinc-400 uppercase tracking-widest font-black">Cargo</span>
                    {employee?.role || '---'}
                  </div>
                  <div>
                    <span className="block text-[9px] text-zinc-400 uppercase tracking-widest font-black">BI</span>
                    {employee?.bi || '---'}
                  </div>
                  <div>
                    <span className="block text-[9px] text-zinc-400 uppercase tracking-widest font-black">Estado Civil</span>
                    {employee?.marital_status || '---'}
                  </div>
                </div>
              </div>

            </div>

            {/* DESCRIPTION ADVICE BOX - 4 columns */}
            <div className="lg:col-span-4 bg-white border border-zinc-200 p-6 shadow-sm space-y-4 h-full">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#003366] border-b border-zinc-100 pb-2 flex items-center gap-2">
                <span className="w-1.5 h-3 bg-[#003366] block"></span>
                Descricao
              </h3>
              
              <div className="bg-zinc-50 border border-zinc-100 p-4 space-y-4">
                <div>
                  <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1.5">Periodo experimental:</h4>
                  <div className="space-y-1 font-mono text-[9px] text-zinc-500">
                    <p className="border-b border-zinc-200 pb-1">{"<=60 dias --- Trabalhadores"}</p>
                    <p className="border-b border-zinc-200 pb-1">{"<=120 / 180 dias para funções de direcção."}</p>
                    <p className="font-bold text-[#003366] pt-1">{experimentalDays || 0} dias.</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-200">
                  <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1.5">Aviso prévio:</h4>
                  <div className="space-y-1 font-mono text-[9px] text-zinc-500">
                    <p className="pt-1">{noticeDays || 0} dias.</p>
                    {selectedType === "Contrato por Tempo Indeterminado" ? (
                      <p className="mt-2 text-zinc-400">Duração por tempo indeterminado.</p>
                    ) : (
                      <p className="mt-2 text-zinc-400">Duração: {duration || 0} meses.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-zinc-400 uppercase font-black tracking-widest pt-2">
                <p>✓ Legislação vinculada: LGT Lei 12/23</p>
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
