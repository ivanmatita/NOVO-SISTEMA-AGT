import React, { useState, useRef } from 'react';
import { Printer, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

import { Employee } from '../types';

const DeclaracaoServico = ({ employee }: { employee: Employee }) => {
  const [fontSize, setFontSize] = useState('16px');
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
      <h1 style="font-size: 24px; font-weight: bold; text-decoration: underline;">DECLARAÇÃO DE SERVIÇO</h1>
    </div>
    
    <p style="text-align: justify; line-height: 1.8; margin-bottom: 20px;">
      <b>COGE-FOCUS - PRESTAÇAO DE SERVIÇOS, LDA</b>, com sede em Morro Bento 2, Luanda, Província de Luanda, titular do cartão de contribuinte Nº5000509329, para os devidos efeitos declara que
    </p>

    <p style="text-align: justify; line-height: 1.8; margin-bottom: 20px;">
      <b>${employee.name}</b>, estado civil ${employee.marital_status || 'NA'}, residente em ${employee.address || 'NA'}, Titular do Bilhede de Identidade Nº ${employee.bi || 'NA'}, encontra-se ao serviço desta empresa com a categoria profissional de <b>${employee.role}</b> pertencentes ao qualificador ocupacional NA e integrado no grupo NA da escala salarial com a categoria ocupacional de NA.
    </p>

    <p style="text-align: justify; line-height: 1.8; margin-bottom: 40px;">
      Por declarar e ser verdade,
    </p>

    <div style="text-align: center; margin-top: 60px;">
      <p>Assino</p>
      <div style="width: 250px; border-bottom: 1px solid black; margin: 40px auto 10px;"></div>
      <p><b>A Gerência</b></p>
      <p style="margin-top: 20px;">Luanda, ${new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
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
          defaultValue="16px"
        >
          <option value="14px">14px</option>
          <option value="16px">16px</option>
          <option value="18px">18px</option>
          <option value="20px">20px</option>
          <option value="24px">24px</option>
        </select>
        <div className="flex-1" />
        <button 
          onClick={handlePrint}
          className="bg-[#003366] hover:bg-[#002244] text-white px-6 py-2 rounded-none flex items-center gap-2 transition-all shadow-sm font-bold text-sm uppercase tracking-widest"
        >
          <Printer size={18} />
          Imprimir Declaração
        </button>
      </div>

      <div className="bg-white p-[2.5cm] w-[210mm] min-h-[297mm] mx-auto text-zinc-900 shadow-2xl print:shadow-none print:m-0 print:w-full border border-zinc-100">
        <div 
          ref={editorRef}
          contentEditable 
          suppressContentEditableWarning
          className="outline-none min-h-full"
          style={{ fontSize, fontFamily }}
          dangerouslySetInnerHTML={{ __html: initialContent }}
        />
      </div>
    </div>
  );
};

export default DeclaracaoServico;
