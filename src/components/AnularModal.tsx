import React, { useState } from 'react';
import { IssuedDocument } from '../types';

export const AnularModal = ({ document, onClose, onAnular }: {
  document: IssuedDocument,
  onClose: () => void,
  onAnular: (reason: string) => void
}) => {
  const [reason, setReason] = useState('');
  
  const isAnulado = document.documento_anulado === true || 
                    document.estado === 'ANULADO' || 
                    document.status === 'anulado' || 
                    (document as any).estado_documento === 'anulado';

  const isNotaCredito = document.tipo_documento === 'NC' || 
                        document.document_type === 'Nota de Crédito' ||
                        document.document_type === 'NC' ||
                        document.tipo_documento === 'NOTA_CREDITO';

  return (
    <div id="anular-modal" className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
      <div className="bg-white p-8 w-full max-w-md shadow-2xl border-t-8 border-red-600">
        <h3 className="text-xl font-black text-red-600 uppercase mb-4 tracking-tight">⚠️ Anular Documento</h3>
        <p className="text-sm text-zinc-600 mb-4">({document.numero_documento || document.invoice_number})</p>
        
        {isAnulado ? (
          <div className="my-6 p-4 bg-red-50 border border-red-200 text-center">
            <span className="block text-lg font-black text-red-600 uppercase tracking-widest animate-pulse">
              Documento Anulado
            </span>
            <p className="text-xs text-red-500 mt-1 font-bold">
              Este documento já foi anulado e não está mais ativo fiscalmente.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-zinc-600 mb-4">Esta operação é irreversível e marcará o documento como "ANULADO" sem validade.</p>
            
            {isNotaCredito ? (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-none">
                <p className="text-xs font-black text-amber-800 uppercase tracking-wider mb-1">
                  ⚡ Ação Automática — Nota de Débito (ND)
                </p>
                <p className="text-xs text-amber-700 font-medium">
                  Ao anular esta Nota de Crédito, o sistema irá <strong>gerar automaticamente uma Nota de Débito (ND)</strong> com o mesmo valor, para reverter o crédito concedido ao cliente.
                </p>
              </div>
            ) : (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-300 rounded-none">
                <p className="text-xs font-black text-blue-800 uppercase tracking-wider mb-1">
                  ⚡ Ação Automática — Nota de Crédito (NC)
                </p>
                <p className="text-xs text-blue-700 font-medium">
                  Ao anular este documento, o sistema irá <strong>gerar automaticamente uma Nota de Crédito (NC)</strong> com o mesmo valor, para retificar o valor faturado.
                </p>
              </div>
            )}

            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Motivo da Anulação</label>
            <textarea 
              value={reason} 
              onChange={e => setReason(e.target.value)}
              className="w-full h-24 border border-zinc-200 bg-zinc-50 p-2 text-sm focus:outline-none focus:border-red-600 mb-4"
              placeholder="Insira o motivo..."
            />
          </>
        )}

        <div className="flex gap-4">
          <button id="anular-close-btn" onClick={onClose} className="flex-1 py-2 text-zinc-500 font-bold uppercase text-xs hover:bg-zinc-100">
            {isAnulado ? 'FECHAR' : 'Cancelar'}
          </button>
          {!isAnulado && (
            <button id="anular-submit-btn" onClick={() => onAnular(reason)} className="flex-1 py-2 bg-red-600 text-white font-bold uppercase text-xs hover:bg-red-700">
              {isNotaCredito ? 'ANULAR + GERAR ND' : 'ANULAR + GERAR NC'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
