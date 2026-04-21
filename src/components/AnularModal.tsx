import React, { useState } from 'react';
import { IssuedDocument } from '../types';

export const AnularModal = ({ document, onClose, onAnular }: {
  document: IssuedDocument,
  onClose: () => void,
  onAnular: (reason: string) => void
}) => {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
      <div className="bg-white p-8 w-full max-w-md shadow-2xl border-t-8 border-red-600">
        <h3 className="text-xl font-black text-red-600 uppercase mb-4 tracking-tight">⚠️ Anular Documento</h3>
        <p className="text-sm text-zinc-600 mb-4">Esta operação é irreversível e marcará o documento como "ANULADO" sem validade ({document.numero_documento || document.invoice_number}).</p>
        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Motivo da Anulação</label>
        <textarea 
          value={reason} 
          onChange={e => setReason(e.target.value)}
          className="w-full h-24 border border-zinc-200 bg-zinc-50 p-2 text-sm focus:outline-none focus:border-red-600 mb-4"
          placeholder="Insira o motivo..."
        />
        <div className="flex gap-4">
          <button onClick={onClose} className="flex-1 py-2 text-zinc-500 font-bold uppercase text-xs">Cancelar</button>
          <button onClick={() => onAnular(reason)} className="flex-1 py-2 bg-red-600 text-white font-bold uppercase text-xs hover:bg-red-700">ANULAR</button>
        </div>
      </div>
    </div>
  );
};
