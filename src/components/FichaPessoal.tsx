import React from 'react';
import { Employee } from '../types';
import { Printer, User, Mail, Phone, MapPin, CreditCard, Calendar, Briefcase, Building2, ShieldCheck, GraduationCap, Users as UsersIcon } from 'lucide-react';

const FichaPessoal = ({ employee }: { employee: Employee | null }) => {
  const handlePrint = () => {
    window.print();
  };

  if (!employee) return <div className="p-8 text-center text-zinc-500">Selecione um funcionário para visualizar a ficha pessoal.</div>;

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="flex justify-between items-center mb-8 no-print">
        <h1 className="text-2xl font-bold text-[#003366]">Ficha Pessoal do Funcionário</h1>
        <button 
          onClick={handlePrint}
          className="bg-[#003366] hover:bg-[#002244] text-white px-6 py-2 rounded-none flex items-center gap-2 transition-all shadow-sm font-bold text-sm uppercase tracking-widest"
        >
          <Printer size={18} />
          Imprimir Ficha
        </button>
      </div>

      <div className="bg-white p-[1.5cm] w-[210mm] min-h-[297mm] mx-auto text-zinc-900 font-sans shadow-2xl print:shadow-none print:m-0 print:w-full border border-zinc-100">
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-[#003366] pb-8 mb-8">
          <div className="flex gap-6 items-center">
            <div className="w-32 h-32 bg-zinc-100 border-2 border-zinc-200 flex items-center justify-center overflow-hidden">
              {employee.image_url ? (
                <img src={employee.image_url} alt={employee.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <User size={64} className="text-zinc-300" />
              )}
            </div>
            <div>
              <h2 className="text-3xl font-black text-[#003366] uppercase tracking-tight">{employee.name}</h2>
              <p className="text-lg font-bold text-zinc-500 uppercase tracking-widest mt-1">{employee.role}</p>
              <div className="mt-4 flex flex-wrap gap-4 text-xs font-medium text-zinc-600">
                <span className="flex items-center gap-1.5 bg-zinc-50 px-3 py-1 border border-zinc-100">
                  <ShieldCheck size={14} className="text-[#003366]" />
                  ID: {employee.id.toString().padStart(4, '0')}
                </span>
                <span className="flex items-center gap-1.5 bg-zinc-50 px-3 py-1 border border-zinc-100">
                  <Calendar size={14} className="text-[#003366]" />
                  Admissão: {new Date(employee.hired_at).toLocaleDateString('pt-PT')}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="bg-[#003366] text-white px-4 py-2 text-xs font-black uppercase tracking-[0.2em]">
              Ficha de Colaborador
            </div>
            <div className="mt-4 text-[10px] text-zinc-400 uppercase font-bold tracking-widest">
              Gerado em: {new Date().toLocaleDateString('pt-PT')}
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-2 gap-12">
          {/* Left Column: Personal Data */}
          <div className="space-y-8">
            <section>
              <h3 className="text-xs font-black text-[#003366] uppercase tracking-[0.2em] mb-4 border-b border-zinc-100 pb-2 flex items-center gap-2">
                <User size={14} /> Dados Pessoais
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-zinc-50 py-1">
                  <span className="text-zinc-400 font-medium">Data de Nascimento</span>
                  <span className="font-bold">{employee.birth_date ? new Date(employee.birth_date).toLocaleDateString('pt-PT') : '---'}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-50 py-1">
                  <span className="text-zinc-400 font-medium">Gênero</span>
                  <span className="font-bold uppercase">{employee.gender || '---'}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-50 py-1">
                  <span className="text-zinc-400 font-medium">Estado Civil</span>
                  <span className="font-bold uppercase">{employee.marital_status || '---'}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-50 py-1">
                  <span className="text-zinc-400 font-medium">Nacionalidade</span>
                  <span className="font-bold uppercase">Angolana</span>
                </div>
                <div className="flex justify-between border-b border-zinc-50 py-1">
                  <span className="text-zinc-400 font-medium">NIF</span>
                  <span className="font-bold">{employee.nif || '---'}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-50 py-1">
                  <span className="text-zinc-400 font-medium">BI nº</span>
                  <span className="font-bold">{employee.bi || '---'}</span>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-xs font-black text-[#003366] uppercase tracking-[0.2em] mb-4 border-b border-zinc-100 pb-2 flex items-center gap-2">
                <MapPin size={14} /> Contacto e Morada
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <Mail size={14} className="text-zinc-300 mt-1" />
                  <div>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase">Email</p>
                    <p className="font-bold">{employee.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone size={14} className="text-zinc-300 mt-1" />
                  <div>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase">Telefone</p>
                    <p className="font-bold">{employee.phone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin size={14} className="text-zinc-300 mt-1" />
                  <div>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase">Morada</p>
                    <p className="font-bold">{employee.address || '---'}</p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-xs font-black text-[#003366] uppercase tracking-[0.2em] mb-4 border-b border-zinc-100 pb-2 flex items-center gap-2">
                <GraduationCap size={14} /> Formação Académica
              </h3>
              <div className="bg-zinc-50 p-4 border border-zinc-100">
                <p className="text-sm font-bold text-zinc-700">{employee.academic_level || 'Nível não especificado'}</p>
              </div>
            </section>
          </div>

          {/* Right Column: Professional Data */}
          <div className="space-y-8">
            <section>
              <h3 className="text-xs font-black text-[#003366] uppercase tracking-[0.2em] mb-4 border-b border-zinc-100 pb-2 flex items-center gap-2">
                <Briefcase size={14} /> Dados Profissionais
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-zinc-50 py-1">
                  <span className="text-zinc-400 font-medium">Departamento</span>
                  <span className="font-bold uppercase">{employee.department || 'Geral'}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-50 py-1">
                  <span className="text-zinc-400 font-medium">Tipo de Contrato</span>
                  <span className="font-bold uppercase">{employee.contract_type || '---'}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-50 py-1">
                  <span className="text-zinc-400 font-medium">Salário Base</span>
                  <span className="font-bold text-[#003366]">
                    {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(employee.salary)}
                  </span>
                </div>
                <div className="flex justify-between border-b border-zinc-50 py-1">
                  <span className="text-zinc-400 font-medium">Dependentes</span>
                  <span className="font-bold">{employee.dependents || 0}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-50 py-1">
                  <span className="text-zinc-400 font-medium">Sujeito a IRT</span>
                  <span className="font-bold">{employee.subject_to_irt ? 'SIM' : 'NÃO'}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-50 py-1">
                  <span className="text-zinc-400 font-medium">Sujeito a INSS</span>
                  <span className="font-bold">{employee.subject_to_inss ? 'SIM' : 'NÃO'}</span>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-xs font-black text-[#003366] uppercase tracking-[0.2em] mb-4 border-b border-zinc-100 pb-2 flex items-center gap-2">
                <CreditCard size={14} /> Dados Bancários
              </h3>
              <div className="bg-zinc-50 p-4 border border-zinc-100 space-y-3">
                <div>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase">Banco</p>
                  <p className="text-sm font-bold">{employee.bank_name || '---'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase">IBAN</p>
                  <p className="text-sm font-mono font-bold tracking-tighter">{employee.iban || '---'}</p>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-xs font-black text-[#003366] uppercase tracking-[0.2em] mb-4 border-b border-zinc-100 pb-2 flex items-center gap-2">
                <UsersIcon size={14} /> Agregado Familiar
              </h3>
              <div className="text-sm text-zinc-500 italic">
                Nenhum dependente registado além do número base ({employee.dependents || 0}).
              </div>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-24 pt-12 border-t-2 border-zinc-100">
          <div className="grid grid-cols-2 gap-12">
            <div className="text-center space-y-4">
              <div className="h-px bg-zinc-300 w-48 mx-auto"></div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Assinatura do Colaborador</p>
            </div>
            <div className="text-center space-y-4">
              <div className="h-px bg-zinc-300 w-48 mx-auto"></div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Assinatura da Direção RH</p>
            </div>
          </div>
          <div className="mt-12 text-center">
            <p className="text-[9px] text-zinc-300 uppercase tracking-[0.3em]">COGE-FOCUS - PRESTAÇAO DE SERVIÇOS, LDA</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FichaPessoal;
