import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Search, Calendar, ChevronRight, Info, FileText, 
  AlertCircle, Loader2, ShieldCheck, CheckCircle2, RefreshCw
} from 'lucide-react';
import { AgtElectronicInvoiceModal } from './AgtElectronicInvoiceModal';
import { DocumentReportModal } from './DocumentReportModal';

interface AgtElectronicInvoicesListModalProps {
  companyNif?: string;
  companyName?: string;
  userId?: string;
  onClose?: () => void;
  inlineMode?: boolean; // If true, renders as an inline panel instead of a full screen modal overlay
}

export const AgtElectronicInvoicesListModal: React.FC<AgtElectronicInvoicesListModalProps> = ({
  companyNif = '5000922200',
  companyName = 'Minha Empresa',
  userId = '',
  onClose,
  inlineMode = false
}) => {
  // Setup date range default (current month)
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  
  const defaultStartDate = `${year}-${month}-01`;
  const defaultEndDate = today.toISOString().split('T')[0];

  const [nif, setNif] = useState(companyNif || '5000922200');
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedAgtDocNo, setSelectedAgtDocNo] = useState<string | null>(null);
  const [selectedDraftDoc, setSelectedDraftDoc] = useState<any>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSearching(true);
    setResult(null);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/agt/listar-facturas', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taxRegistrationNumber: nif.trim(),
          queryStartDate: startDate,
          queryEndDate: endDate
        })
      });

      const data = await response.json();
      console.log('[AGT-LISTAR-FACTURAS] Resposta do canal:', data);

      if (response.ok) {
        setResult(data);
      } else {
        setErrorMsg(data.error || "A AGT retornou um erro ao processar o seu pedido.");
      }
    } catch (err: any) {
      console.error('[AGT-LISTAR-FACTURAS] Erro de rede ou servidor:', err);
      setErrorMsg(err.message || "Erro de rede no servidor ao ligar à AGT.");
    } finally {
      setIsSearching(false);
    }
  };

  // Perform search on mount if NIF and dates are valid
  useEffect(() => {
    if (nif && startDate && endDate) {
      handleSearch();
    }
  }, []);

  const contentMarkup = (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden w-full">
      {/* Parameters Selection Panel */}
      <div className="w-full lg:w-[35%] p-6 border-b lg:border-b-0 lg:border-r border-zinc-250 flex flex-col justify-between bg-zinc-50 overflow-y-auto">
        <div className="space-y-6">
          <div className="flex justify-between items-center lg:items-start">
            <div>
              <span className="bg-[#003366] text-white text-[9px] font-black tracking-widest px-2 py-0.5 uppercase block w-max mb-1.5 rounded-sm">
                SERVIÇO FE-RNG-032
              </span>
              <h3 className="text-lg font-sans font-black tracking-tight text-zinc-950 flex items-center gap-2">
                <ShieldCheck className="text-[#003366]" size={20} />
                Listar Facturas Eletrónicas
              </h3>
            </div>
            {onClose && inlineMode && (
              <button onClick={onClose} className="lg:hidden p-1.5 hover:bg-zinc-200 rounded-full transition-colors text-zinc-400">
                <X size={18} />
              </button>
            )}
          </div>

          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 tracking-wider mb-1.5">
                NIF do Contribuinte (Emitente)
              </label>
              <input 
                type="text" 
                value={nif}
                onChange={(e) => setNif(e.target.value)}
                className="w-full bg-white border border-zinc-250 px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#003366] font-bold text-zinc-800 rounded-sm"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 tracking-wider mb-1.5">
                Data Inicial (A partir de)
              </label>
              <div className="relative">
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-white border border-zinc-250 px-3 py-2 text-sm focus:outline-none focus:border-[#003366] font-medium text-zinc-800 rounded-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 tracking-wider mb-1.5">
                Data Final (Até)
              </label>
              <div className="relative">
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-white border border-zinc-250 px-3 py-2 text-sm focus:outline-none focus:border-[#003366] font-medium text-zinc-800 rounded-sm"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSearching}
              className="w-full py-3 bg-[#003366] hover:bg-[#002244] disabled:bg-zinc-350 text-white font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 rounded-sm cursor-pointer mt-4"
            >
              {isSearching ? (
                <Loader2 className="animate-spin" size={14} />
              ) : (
                <Search size={14} />
              )}
              Pesquisar na AGT
            </button>
          </form>

          <div className="bg-blue-50/50 p-4 border border-blue-150 rounded-sm text-[10px] text-blue-900 leading-relaxed font-medium">
            <Info size={14} className="inline-block mr-1.5 mb-0.5 shrink-0 text-blue-700" />
            Este e-serviço comunica em tempo real com a plataforma da <strong>AGT (v1.0)</strong> para extrair as faturas eletrónicas registadas em nome do contribuinte. Os resultados são gerados em tempo real com assinatura criptográfica JWS.
          </div>
        </div>

        <div className="pt-4 border-t border-zinc-200 text-[10px] text-zinc-400 font-mono mt-6">
          Gateway: <span className="font-bold text-[#003366]">SIFP HOMOLOGAÇÃO</span> • v1.0
        </div>
      </div>

      {/* Results View Panel */}
      <div className="w-full lg:w-[65%] p-6 flex flex-col h-full overflow-y-auto bg-white font-sans">
        <div className="flex justify-between items-center mb-6">
          <h4 className="text-sm font-black uppercase tracking-widest text-[#003366] flex items-center gap-2">
            <ChevronRight size={18} className="text-[#003366]" />
            Lista e Espelho de Resultados
          </h4>
          {onClose && !inlineMode && (
            <button onClick={onClose} className="p-1.5 hover:bg-zinc-100 rounded-full transition-colors text-zinc-400">
              <X size={18} />
            </button>
          )}
        </div>

        {/* ERROR MESSAGE DISPLAY */}
        {errorMsg && (
          <div className="mb-6 p-4 border bg-red-50 border-red-200 text-red-800 rounded-sm">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={16} />
              <div>
                <h5 className="font-bold text-xs uppercase tracking-wide">Erro de Comunicação com a AGT</h5>
                <p className="text-[11px] leading-relaxed mt-1 whitespace-pre-wrap font-mono uppercase bg-red-100/50 p-2 border border-red-100/50 text-red-950 rounded-sm">
                  {errorMsg}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SEARCHING PLACEHOLDER */}
        {isSearching && (
          <div className="flex-1 flex flex-col items-center justify-center py-20">
            <Loader2 className="animate-spin text-[#003366] mb-4" size={36} />
            <span className="text-xs font-bold text-zinc-600 uppercase tracking-widest">Consultando Servidores do MinFin...</span>
            <span className="text-[10px] text-zinc-400 mt-1">Por favor, aguarde enquanto o JWS é assinado e comunicado.</span>
          </div>
        )}

        {/* DATA CONTAINER */}
        {!isSearching && result && (
          <div className="space-y-6 flex-1">
            {/* Meta Data stats card banner */}
            <div className="grid grid-cols-2 gap-4 bg-[#f8fafc] border border-zinc-200 p-4 rounded-sm">
              <div>
                <span className="text-[10px] text-zinc-400 block lowercase font-mono">faturas encontradas</span>
                <span className="text-2xl font-black text-zinc-950 block">
                  {result.documentResultCount ?? result.documentListResult?.documentResultCount ?? 0} faturas
                </span>
              </div>
              <div className="flex flex-col justify-end text-right">
                <span className="text-[10px] text-zinc-400 block lowercase font-mono">período consultado</span>
                <span className="text-xs font-mono font-bold text-[#003366]">
                  {startDate} a {endDate}
                </span>
              </div>
            </div>

            {/* List Table */}
            {(() => {
              const invoicesList = result.documentResultList ?? result.documentListResult?.documentResultList ?? [];
              
              if (!invoicesList || invoicesList.length === 0) {
                return (
                  <div className="py-12 border border-dashed border-zinc-200 rounded-sm text-center">
                    <FileText className="mx-auto text-zinc-300 mb-3" size={32} />
                    <h5 className="text-xs font-bold text-zinc-600 uppercase tracking-wide">Nenhuma fatura encontrada</h5>
                    <p className="text-[10px] text-zinc-400 mt-1 max-w-sm mx-auto">
                      Não existem faturas eletrónicas registadas para este NIF no período selecionado.
                    </p>
                  </div>
                );
              }

              return (
                <div className="border border-zinc-200 rounded-sm overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-210 text-[9px] font-black text-zinc-500 uppercase tracking-wider font-sans">
                          <th className="px-4 py-3">Número Documento</th>
                          <th className="px-4 py-3">Data de Emissão</th>
                          <th className="px-4 py-3 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 text-xs font-mono">
                        {invoicesList.map((doc: any, index: number) => (
                          <tr key={index} className="hover:bg-zinc-50/50 transition-colors">
                            <td className="px-4 py-3 text-zinc-950 font-bold select-all break-all pr-4">
                              {doc.documentNo || '---'}
                            </td>
                            <td className="px-4 py-3 text-zinc-500 font-medium">
                              {doc.documentDate ? new Date(doc.documentDate).toLocaleDateString('pt-AO') : '---'}
                            </td>
                            <td className="px-4 py-3 text-right flex gap-2 justify-end">
                              {doc.currency !== 'AOA' && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedDraftDoc(doc)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-sans text-[10px] font-black uppercase tracking-wider rounded-sm transition-all shadow-sm cursor-pointer"
                                >
                                  Draft
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setSelectedAgtDocNo(doc.documentNo)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#003366] hover:bg-[#002244] text-white font-sans text-[10px] font-black uppercase tracking-wider rounded-sm transition-all shadow-sm cursor-pointer"
                              >
                                Consultar
                                <ChevronRight size={10} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* EMPTY BOARD INITIAL STATE SCREEN */}
        {!isSearching && !result && !errorMsg && (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center border border-dashed border-zinc-200 rounded-sm bg-zinc-50/30">
            <ShieldCheck className="text-zinc-300 mb-3" size={38} />
            <h5 className="text-xs font-bold text-zinc-700 uppercase tracking-widest">Início de Consulta</h5>
            <p className="text-[10px] text-zinc-400 mt-1 max-w-xs leading-relaxed">
              Configure as datas e o NIF à esquerda e proceda com a pesquisa em tempo real junto da AGT.
            </p>
          </div>
        )}
      </div>

      {/* FULL INTEGRATED DETAILS CONSULTATION FLOW DIALOG OR SHEET */}
      <AnimatePresence>
        {selectedAgtDocNo && (
          <AgtElectronicInvoiceModal
            document={{
              id: selectedAgtDocNo,
              numero_documento: selectedAgtDocNo,
              total: 0
            }}
            companyNif={nif}
            userId={userId}
            onClose={() => setSelectedAgtDocNo(null)}
          />
        )}
        {selectedDraftDoc && (
          <DocumentReportModal
            document={selectedDraftDoc}
            onClose={() => setSelectedDraftDoc(null)}
            companyName={companyName}
            companyNif={nif}
            showDraft={true}
          />
        )}
      </AnimatePresence>
    </div>
  );

  if (inlineMode) {
    return (
      <div className="bg-white border border-zinc-200 w-full h-[80vh] flex rounded-sm shadow-sm overflow-hidden">
        {contentMarkup}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-6xl bg-white flex flex-col h-[94vh] md:h-[88vh] overflow-hidden rounded-md border border-zinc-200 shadow-2xl"
      >
        {contentMarkup}
      </motion.div>
    </div>
  );
};
