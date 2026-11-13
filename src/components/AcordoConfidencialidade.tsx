import React, { useState, useRef } from 'react';
import { Printer, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

import { Employee } from '../types';

const AcordoConfidencialidade = ({ employee }: { employee: Employee }) => {
  const [fontSize, setFontSize] = useState('14px');
  const [fontFamily, setFontFamily] = useState('serif');
  const editorRef = useRef<HTMLDivElement>(null);

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
  };

  const handlePrint = () => {
    window.print();
  };

  const initialContent = `
    <div style="text-align: center; margin-bottom: 40px;">
      <h1 style="font-size: 20px; font-weight: bold;">ACORDO DE CONFIDENCIALIDADE</h1>
    </div>
    
    <p style="text-align: justify; margin-bottom: 20px;"><b>Entre:</b></p>
    
    <p style="text-align: justify; margin-bottom: 20px;">
      <b>COGE-FOCUS - PRESTAÇAO DE SERVIÇOS, LDA</b>, pessoa juridica de direito privado, titular do cartão de contribuinte Nº5000509329, com sede em Morro Bento 2, Luanda, Província de Luanda, neste ato representada na forma de seus atos constitutivos ("Parte Reveladora");
    </p>

    <p style="text-align: justify; margin-bottom: 20px;"><b>e</b></p>

    <p style="text-align: justify; margin-bottom: 40px;">
      <b>${employee.name}</b>, estado civil ${employee.marital_status || 'NA'}, residente em ${employee.address || 'NA'}, Titular do Bilhede de Identidade Nº ${employee.bi || 'NA'} ("Parte Receptora").
    </p>

    <h3 style="font-weight: bold; margin-bottom: 10px;">OBJECTO</h3>
    <p style="text-align: justify; margin-bottom: 20px;">
      1.1. O presente Acordo tem por objeto estabelecer as obrigações de confidencialidade e proteção de dados pessoais compartilhados entre as Partes em conformidade com a Lei de Proteção de Dados Pessoais de Angola (Lei n.º 22/11 de 17 de Junho) e demais legislações aplicáveis.
    </p>

    <h3 style="font-weight: bold; margin-bottom: 10px;">DEFINIÇÕES</h3>
    <p style="text-align: justify; margin-bottom: 10px;">2.1. "Dados Pessoais" significam qualquer informação relativa a uma pessoa singular identificada ou identificável, conforme definido pela Lei de Proteção de Dados Pessoais de Angola.</p>
    <p style="text-align: justify; margin-bottom: 10px;">2.2. "Tratamento de Dados" inclui qualquer operação realizada sobre Dados Pessoais, tais como coleta, armazenamento, acesso, compartilhamento e eliminação.</p>
    <p style="text-align: justify; margin-bottom: 10px;">2.3. "Parte Reveladora" é a parte que compartilha informações confidenciais e/ou Dados Pessoais.</p>
    <p style="text-align: justify; margin-bottom: 20px;">2.4. "Parte Receptora" é a parte que recebe as informações confidenciais e/ou Dados Pessoais.</p>

    <h3 style="font-weight: bold; margin-bottom: 10px;">OBRIGAÇÕES DAS PARTES</h3>
    <p style="text-align: justify; margin-bottom: 10px;">3.1. A Parte Receptora compromete-se a:</p>
    <p style="text-align: justify; margin-left: 20px; margin-bottom: 5px;">a) Utilizar os Dados Pessoais exclusivamente para os fins previstos neste Acordo;</p>
    <p style="text-align: justify; margin-left: 20px; margin-bottom: 5px;">b) Assegurar a confidencialidade e proteção adequada dos Dados Pessoais recebidos;</p>
    <p style="text-align: justify; margin-left: 20px; margin-bottom: 5px;">c) Não divulgar, compartilhar ou transferir os Dados Pessoais sem autorização escrita da Parte Reveladora;</p>
    <p style="text-align: justify; margin-left: 20px; margin-bottom: 5px;">d) Adotar medidas técnicas e organizacionais adequadas para garantir a segurança dos Dados Pessoais, conforme exigido pela Lei de Proteção de Dados Pessoais de Angola;</p>
    <p style="text-align: justify; margin-left: 20px; margin-bottom: 10px;">e) Notificar imediatamente a Parte Reveladora em caso de qualquer violação de dados.</p>
    
    <p style="text-align: justify; margin-bottom: 10px;">3.2. A Parte Reveladora compromete-se a:</p>
    <p style="text-align: justify; margin-left: 20px; margin-bottom: 5px;">a) Compartilhar apenas os Dados Pessoais estritamente necessários para a execução do presente Acordo;</p>
    <p style="text-align: justify; margin-left: 20px; margin-bottom: 20px;">b) Garantir que os Dados Pessoais compartilhados estejam em conformidade com a legislação aplicável em Angola.</p>

    <h3 style="font-weight: bold; margin-bottom: 10px;">PRAZO E RESCISÃO</h3>
    <p style="text-align: justify; margin-bottom: 10px;">4.1. O presente Acordo terá duração de 10 anos a partir da data de assinatura.</p>
    <p style="text-align: justify; margin-bottom: 20px;">4.2. Em caso de rescisão, a Parte Receptora deve devolver ou eliminar todos os Dados Pessoais recebidos, salvo obrigação legal de retenção.</p>

    <h3 style="font-weight: bold; margin-bottom: 10px;">RESPONSABILIDADES E PENALIDADES</h3>
    <p style="text-align: justify; margin-bottom: 10px;">6.1. Este Acordo é regido pelas leis aplicáveis da República de Angola.</p>
    <p style="text-align: justify; margin-bottom: 40px;">6.2. Qualquer disputa decorrente deste Acordo será submetida ao foro de [Luanda/Angola], com renúncia a qualquer outro.</p>

    <p style="text-align: justify; margin-bottom: 40px;">E por estarem de comum acordo, as Partes assinam este instrumento.</p>

    <p style="text-align: justify; margin-bottom: 60px;">Luanda, ${new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })}</p>

    <div style="display: flex; justify-content: space-between; margin-top: 40px;">
      <div style="text-align: center; width: 45%;">
        <div style="border-bottom: 1px solid black; margin-bottom: 10px;"></div>
        <p><b>("Parte Reveladora")</b></p>
      </div>
      <div style="text-align: center; width: 45%;">
        <div style="border-bottom: 1px solid black; margin-bottom: 10px;"></div>
        <p><b>("Parte Receptora")</b></p>
      </div>
    </div>
  `;

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="flex flex-wrap items-center gap-2 mb-6 bg-white p-4 border border-zinc-200 shadow-sm no-print">
        <button onClick={() => execCommand('bold')} className="p-2 hover:bg-zinc-100 rounded" title="Negrito"><Bold size={18} /></button>
        <button onClick={() => execCommand('italic')} className="p-2 hover:bg-zinc-100 rounded" title="Itálico"><Italic size={18} /></button>
        <button onClick={() => execCommand('underline')} className="p-2 hover:bg-zinc-100 rounded" title="Sublinhado"><Underline size={18} /></button>
        <div className="w-px h-6 bg-zinc-200 mx-1" />
        <button onClick={() => execCommand('justifyLeft')} className="p-2 hover:bg-zinc-100 rounded" title="Alinhar à Esquerda"><AlignLeft size={18} /></button>
        <button onClick={() => execCommand('justifyCenter')} className="p-2 hover:bg-zinc-100 rounded" title="Centralizar"><AlignCenter size={18} /></button>
        <button onClick={() => execCommand('justifyRight')} className="p-2 hover:bg-zinc-100 rounded" title="Alinhar à Direita"><AlignRight size={18} /></button>
        <div className="w-px h-6 bg-zinc-200 mx-1" />
        <select 
          onChange={(e) => setFontFamily(e.target.value)}
          className="text-sm border-zinc-200 rounded p-1"
        >
          <option value="serif">Serif (Formal)</option>
          <option value="sans-serif">Sans Serif</option>
          <option value="monospace">Monospace</option>
        </select>
        <select 
          onChange={(e) => setFontSize(e.target.value)}
          className="text-sm border-zinc-200 rounded p-1"
          defaultValue="14px"
        >
          <option value="12px">12px</option>
          <option value="14px">14px</option>
          <option value="16px">16px</option>
          <option value="18px">18px</option>
        </select>
        <div className="flex-1" />
        <button 
          onClick={handlePrint}
          className="bg-[#003366] hover:bg-[#002244] text-white px-6 py-2 rounded-none flex items-center gap-2 transition-all shadow-sm font-bold text-sm uppercase tracking-widest"
        >
          <Printer size={18} />
          Imprimir Acordo
        </button>
      </div>

      <div className="bg-white p-[2cm] w-[210mm] min-h-[297mm] mx-auto text-zinc-900 shadow-2xl print:shadow-none print:m-0 print:w-full border border-zinc-100">
        <div 
          ref={editorRef}
          contentEditable 
          suppressContentEditableWarning
          className="outline-none min-h-full leading-relaxed"
          style={{ fontSize, fontFamily }}
          dangerouslySetInnerHTML={{ __html: initialContent }}
        />
      </div>
    </div>
  );
};

export default AcordoConfidencialidade;
