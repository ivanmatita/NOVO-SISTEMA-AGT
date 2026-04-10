import React, { useState, useRef } from 'react';
import { Employee } from '../types';
import { Bold, Underline, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

interface ContractModalProps {
  employee: Employee;
  onClose: () => void;
}

const ContractModal = ({ employee, onClose }: ContractModalProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState(`
    <h1 style="text-align: center;">Contrato de Trabalho por Tempo Determinado</h1>
    <p>Lei 12/23 de 27 de Dezembro</p>
    <p>Entre ROYAL CARS - COMERCIO E PRESTAÇAO DE SERVIÇOS, LDA...</p>
    <p>E ${employee.name}, ...</p>
  `);

  const format = (command: string, value?: string) => {
    document.execCommand(command, false, value);
  };

  const handleSave = async () => {
    const htmlContent = editorRef.current?.innerHTML || '';
    await fetch('/api/generated-contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee_id: employee.id, content: htmlContent }),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Emitir Contrato - {employee.name}</h2>
        
        <div className="flex gap-2 mb-2 p-2 border rounded">
          <button onClick={() => format('bold')}><Bold size={18} /></button>
          <button onClick={() => format('underline')}><Underline size={18} /></button>
          <button onClick={() => format('justifyLeft')}><AlignLeft size={18} /></button>
          <button onClick={() => format('justifyCenter')}><AlignCenter size={18} /></button>
          <button onClick={() => format('justifyRight')}><AlignRight size={18} /></button>
        </div>

        <div
          ref={editorRef}
          contentEditable
          className="w-full h-96 border p-4 mb-4 overflow-y-auto"
          dangerouslySetInnerHTML={{ __html: content }}
        />
        
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border rounded">Cancelar</button>
          <button onClick={handleSave} className="px-4 py-2 bg-[#003366] text-white rounded">Gerar Contrato</button>
        </div>
      </div>
    </div>
  );
};

export default ContractModal;
