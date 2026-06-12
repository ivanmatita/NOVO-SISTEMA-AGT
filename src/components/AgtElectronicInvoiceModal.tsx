import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Check, AlertCircle, Loader2, Info, ChevronRight, 
  FileText, CheckCircle2, History, ShieldCheck, RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

function formatCurrency(value: any) {
  const num = Number(value || 0);
  return num.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' });
}

interface IssuedDocument {
  id: string | number;
  numero_documento?: string;
  invoice_number?: string;
  tipo_documento?: string;
  document_type?: string;
  data_emissao?: string;
  date?: string;
  contravalor?: number;
  total?: number;
  moeda?: string;
  client_id?: string | number;
  client_name?: string;
  client_nif?: string;
  empresa_id?: string;
  vat_amount?: number;
  items?: any[];
}

interface AgtElectronicInvoiceModalProps {
  document: IssuedDocument;
  companyNif?: string;
  userId?: string;
  onClose: () => void;
}

export const AgtElectronicInvoiceModal: React.FC<AgtElectronicInvoiceModalProps> = ({
  document,
  companyNif = '',
  userId = '',
  onClose
}) => {
  const [nif, setNif] = useState(companyNif || '5000922200');
  const [documentNo, setDocumentNo] = useState(document.numero_documento || document.invoice_number || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  
  const [result, setResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [history, setHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any | null>(null);

  useEffect(() => {
    fetchTransmissionHistory();
  }, [documentNo]);

  const fetchTransmissionHistory = async () => {
    setIsLoadingHistory(true);
    try {
      if (!documentNo) return;
      const { data, error } = await supabase
        .from('agt_logs')
        .select('*')
        .eq('document_no', documentNo.trim())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[AGT-E-INVOICE] Erro ao buscar histórico:', error.message);
      } else {
        setHistory(data || []);
      }
    } catch (err: any) {
      console.error('[AGT-E-INVOICE] Erro inesperado histórico:', err.message);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResult(null);
    setErrorMsg(null);

    try {
      const gross = Number(document.total || document.contravalor || 0);
      const tax = Number(document.vat_amount || 0);
      const net = gross - tax;
      const docTypeAbbr = String(document.tipo_documento || document.document_type || 'FR').substring(0, 2).toUpperCase();

      const payload = {
        documentNo: documentNo.trim(),
        taxRegistrationNumber: nif.trim(),
        documentType: docTypeAbbr,
        documentDate: document.data_emissao || document.date || new Date().toISOString().split('T')[0],
        customerTaxID: document.client_nif || 'Consumidor Final',
        customerCountry: 'AO',
        companyName: document.client_name || 'Desconhecido',
        documentTotals: {
          grossTotal: Number(gross.toFixed(2)),
          netTotal: Number(net.toFixed(2)),
          taxTotal: Number(tax.toFixed(2))
        },
        documentStatusCode: "N" // N (Normal)
      };

      console.log('[AGT-E-INVOICE] Payload Registar:', payload);

      const response = await fetch('/api/agt/register-invoice', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      console.log('[AGT-E-INVOICE] Resposta Registar:', data);

      if (response.ok && data.success) {
        setResult(data);
        toast.success("Documento registado na fila assíncrona com sucesso!");
      } else {
        setErrorMsg(data.error || "A AGT não conseguiu processar ou a submissão falhou localmente.");
        setResult(data);
        toast.error(data.error || "A submissão falhou ou foi rejeitada pela AGT.");
      }
      
      fetchTransmissionHistory();
    } catch (err: any) {
      console.error('[AGT-E-INVOICE] Erro:', err);
      setErrorMsg(err.message || "Erro de rede ao registar.");
      toast.error(err.message || "Erro de rede no servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePollStatus = async (requestId: string) => {
    if (!requestId) return;
    setIsPolling(true);
    setErrorMsg(null);
    try {
      const response = await fetch('/api/agt/obter-estado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taxRegistrationNumber: nif.trim(),
          requestID: requestId
        })
      });
      const data = await response.json();
      if (response.ok) {
        setResult(data);
        const resultLabel = data.resultCode === 0 ? "CONCLUÍDO (Válido)" :
                           data.resultCode === 1 ? "CONCLUÍDO (Válido c/ Erros)" :
                           data.resultCode === 2 ? "CONCLUÍDO (Inválido)" :
                           data.resultCode === 8 ? "PROCESSANDO" : `CÓDIGO ${data.resultCode}`;
        
        toast.success(`Polling AGT: ${resultLabel}`);
        fetchTransmissionHistory(); 
      } else {
        toast.error(`Erro ao consultar status: ${data.error || 'Erro desconhecido'}`);
      }
    } catch (err: any) {
      toast.error("Falha ao comunicar com a rede para obter estado.");
    } finally {
      setIsPolling(false);
    }
  };

  const handleConsultDetail = async () => {
    if (!documentNo) {
      toast.error("Número de documento não especificado.");
      return;
    }
    setIsPolling(true);
    setErrorMsg(null);
    setResult(null);
    try {
      const response = await fetch('/api/agt/consultar-factura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taxRegistrationNumber: nif.trim(),
          invoiceNo: documentNo.trim()
        })
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        setResult(data.data);
        toast.success(`Detalhes obtidos do documento ${documentNo}.`);
      } else {
        setErrorMsg(data.error || "Documento não encontrado ou erro na consulta.");
        setResult(data.data || null);
        toast.error(data.error || "Documento desconhecido ou erro na consulta.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Erro de comunicação.");
      toast.error("Falha ao comunicar com a rede para consultar detalhes.");
    } finally {
      setIsPolling(false);
    }
  };

  const getBadgeStyle = (status: string) => {
    if (!status) return 'bg-zinc-100 text-zinc-700 border-zinc-200';
    if (status.includes('REGISTADO') || status.includes('PROCESSADO') || status.includes('ACEITE')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (status.includes('REJEITADO') || status.includes('BLOCKED_PRECHECK') || status.includes('ERRO')) return 'bg-red-50 text-red-700 border-red-200';
    if (status.includes('PENDENTE')) return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-5xl bg-white flex flex-col md:flex-row h-[94vh] md:h-[88vh] overflow-hidden rounded-md border border-zinc-200 shadow-2xl"
      >
        {/* Left column – query fields + description */}
        <div className="w-full md:w-[50%] p-6 flex flex-col justify-between border-r border-zinc-100 overflow-y-auto">
          <div>
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="bg-[#003366] text-white text-[9px] font-black tracking-widest px-2 py-0.5 uppercase block w-max mb-1.5 rounded-sm">
                  PORTAL DE INTEGRAÇÃO AGT v1.2
                </span>
                <h3 className="text-xl font-sans font-black tracking-tight text-zinc-950 flex items-center gap-2">
                  <ShieldCheck className="text-[#003366]" size={22} />
                  Consultar / Registar Factura
                </h3>
              </div>
              <button onClick={onClose} className="md:hidden p-1.5 hover:bg-zinc-100 rounded-full transition-colors text-zinc-400">
                <X size={18} />
              </button>
            </div>

            <div className="bg-zinc-50 border border-zinc-200/60 p-4 mb-5 rounded-sm">
              <h4 className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider mb-2">Fatura de Origem Selecionada</h4>
              <div className="grid grid-cols-2 gap-y-2 text-xs">
                <div>
                  <span className="text-zinc-400 block font-sans text-[10px]">Número do Documento</span>
                  <span className="font-mono font-bold text-zinc-800 break-all">{document.numero_documento || document.invoice_number || 'Sem número'}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block font-sans text-[10px]">Total de Origem</span>
                  <span className="font-bold text-[#003366]">{formatCurrency(document.contravalor || document.total)}</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label id="lbl-nif" className="block text-[10px] font-black uppercase text-zinc-500 tracking-wider mb-1.5">
                  NIF da Empresa (Emitente/Contribuinte)
                </label>
                <input 
                  id="input-company-nif"
                  type="text" 
                  value={nif}
                  onChange={(e) => setNif(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-[#003366] font-bold text-zinc-800 rounded-sm"
                  required
                />
              </div>

              <div>
                <label id="lbl-docno" className="block text-[10px] font-black uppercase text-zinc-500 tracking-wider mb-1.5 flex justify-between">
                  <span>Nº do Documento a Consultar ou Submeter</span>
                  <span className="text-zinc-400 italic font-mono lowercase">editável</span>
                </label>
                <input 
                  id="input-document-no"
                  type="text" 
                  value={documentNo}
                  onChange={(e) => setDocumentNo(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-[#003366] font-bold text-zinc-800 rounded-sm"
                  required
                />
              </div>

              <div className="bg-blue-50/50 p-4 border border-blue-100 rounded-sm text-[10px] text-blue-800 leading-relaxed font-medium">
                <Info size={14} className="inline-block mr-1.5 mb-0.5 shrink-0" />
                O serviço <strong>Consultar Factura (v1.2)</strong> destina-se a obter em tempo real os dados detalhados de faturas eletrónicas submetidas na AGT. 
                Se o documento ainda não foi comunicado, envie primeiro utilizando <strong>Registar na Fila</strong>.
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  id="btn-register-queue"
                  type="submit"
                  disabled={isSubmitting}
                  className="py-3 bg-[#003366] hover:bg-[#002244] disabled:bg-zinc-300 text-white font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 rounded-sm cursor-pointer"
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    <ShieldCheck size={14} />
                  )}
                  Registar na Fila
                </button>

                <button
                  id="btn-query-details"
                  type="button"
                  onClick={handleConsultDetail}
                  disabled={isPolling || !documentNo}
                  className="py-3 bg-zinc-950 hover:bg-zinc-800 disabled:bg-zinc-300 text-white font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 rounded-sm cursor-pointer border border-zinc-800"
                >
                  {isPolling ? (
                    <Loader2 className="animate-spin text-white" size={14} />
                  ) : (
                    <FileText size={14} />
                  )}
                  Consultar Factura
                </button>
              </div>
            </form>
          </div>
          
          <div className="mt-6 pt-4 border-t border-zinc-100 text-[10px] text-zinc-400 font-mono">
            Ambiente: <span className="font-bold text-[#003366]">HOMOLOGAÇÃO / PRODUÇÃO</span> • AGT SIFP v1.2
          </div>
        </div>

        {/* Right column – results view, logs & details */}
        <div className="w-full md:w-[50%] bg-zinc-50 p-6 flex flex-col h-full overflow-y-auto border-l border-zinc-100">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-sans font-black tracking-tight text-zinc-900 flex items-center gap-2">
                <History size={18} className="text-[#003366]" />
                Visão de Resposta & Logs
              </h4>
              <button onClick={onClose} className="hidden md:block p-1.5 hover:bg-zinc-200 rounded-full transition-colors text-zinc-400">
                <X size={18} />
              </button>
            </div>

            {/* ERROR DISPLAY SYSTEM */}
            {errorMsg && (
              <div className="mb-4 p-4 border bg-red-50 border-red-200 text-red-800 rounded-sm">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={16} />
                  <div>
                    <h5 className="font-sans font-bold text-xs uppercase tracking-wide">Erro no Retorno do Serviço</h5>
                    <p className="text-[11px] leading-relaxed mt-1 whitespace-pre-wrap font-mono uppercase bg-red-100/50 p-2 border border-red-100/50 text-red-900 rounded-sm">
                      {errorMsg}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* RESULTS RENDERING INTERACTION SYSTEM BASED ON RETURNED SCHEMA */}
            {result && (
              <div className="mb-4">
                {/* 1. CONSULTATION RESULT VIEW */}
                {('validationStatus' in result || 'documents' in result) ? (
                  <div className="p-4 bg-zinc-950 text-white rounded-sm border border-zinc-850 space-y-4 shadow-md">
                    <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                      <span className="font-sans font-bold text-emerald-400 uppercase text-[9px] tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 size={12} className="text-emerald-400" />
                        AGT CONSULTATION RESULT
                      </span>
                      <span className="text-[9px] text-zinc-500 font-mono font-bold">FE-RNG-032</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-y-3 font-mono text-xs">
                      <div>
                        <span className="text-zinc-500 text-[9px] block font-sans lowercase">nº documento retornado</span>
                        <span className="text-zinc-200 font-bold break-all">{result.documentNo || documentNo}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 text-[9px] block font-sans lowercase font-semibold">estado validação agt</span>
                        <span className={`font-bold text-[10px] uppercase px-2 py-0.5 rounded-sm inline-block ${
                          result.validationStatus === 'V' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          result.validationStatus === 'P' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        }`}>
                          {result.validationStatus === 'V' ? 'VÁLIDA (V)' :
                           result.validationStatus === 'P' ? 'PENALIZADA (P)' : 'INDISPONÍVEL / ANULADA'}
                        </span>
                      </div>
                    </div>

                    {/* Sub-documents inside results array */}
                    {result.documents && result.documents.length > 0 ? (
                      <div className="mt-3 space-y-3 pt-2 border-t border-zinc-800">
                        <h5 className="text-[9px] text-zinc-400 font-sans font-black uppercase tracking-wider">Espelho de Detalhes na AGT</h5>
                        {result.documents.map((doc: any, index: number) => (
                          <div key={index} className="p-3 bg-zinc-900 border border-zinc-800 rounded-sm font-sans space-y-2 text-xs">
                            <div className="flex justify-between items-center border-b border-zinc-800/50 pb-1.5">
                              <span className="font-mono text-[9px] font-bold text-zinc-500">Documento {index + 1} de {result.documents.length}</span>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                doc.documentStatus === 'A' ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'
                              }`}>
                                {doc.documentStatus === 'A' ? 'ANULADO' : 'ACEITE / ATIVO'}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-y-2.5 font-mono text-[10px] text-zinc-300">
                              <div>
                                <span className="text-zinc-500 block font-sans lowercase">adquirente (nif)</span>
                                <span className="font-bold">{doc.customerTaxID || 'Consumidor Final'}</span>
                              </div>
                              <div>
                                <span className="text-zinc-500 block font-sans lowercase">denominação social</span>
                                <span className="font-bold truncate block max-w-full" title={doc.companyName}>{doc.companyName || 'Consumidor Final'}</span>
                              </div>
                              <div>
                                <span className="text-zinc-500 block font-sans lowercase">data de emissão</span>
                                <span className="font-bold">{doc.documentDate ? new Date(doc.documentDate).toLocaleDateString('pt-AO') : 'Desconhecida'}</span>
                              </div>
                              <div>
                                <span className="text-zinc-500 block font-sans lowercase">total bruto de fatura</span>
                                <span className="font-bold text-emerald-400">{formatCurrency(doc.documentTotals?.grossTotal)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 italic text-center rounded-sm">
                        Nenhum espelho de documento retornado nas linhas detalhadas.
                      </div>
                    )}
                  </div>
                ) : ('resultCode' in result) ? (
                  /* 2. POLLING RESULT VIEW */
                  <div className="p-4 bg-zinc-900 text-white rounded-sm border border-zinc-800 space-y-3 font-mono text-xs shadow-md">
                    <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                      <span className="font-sans font-bold text-[#00CCFF] uppercase text-[9px] tracking-wider">Estado da Fila AGT (Polling)</span>
                      <span className="text-[9px] text-zinc-500 font-bold">Código: {result.resultCode}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-y-2 text-zinc-300 font-mono text-[11px]">
                      <div>
                        <span className="text-zinc-500 text-[9px] block font-sans">Estado da Fila</span>
                        <span className={`font-bold uppercase ${
                          result.resultCode === 0 ? 'text-emerald-400' :
                          result.resultCode === 1 ? 'text-amber-400' :
                          result.resultCode === 2 ? 'text-red-400' : 'text-blue-400'
                        }`}>
                          {result.resultCode === 0 ? "VÁLIDO (Aceitável)" :
                           result.resultCode === 1 ? "VÁLIDO ADVERTÊNCIAS" :
                           result.resultCode === 2 ? "REJEITADO (Inválido)" :
                           result.resultCode === 8 ? "PROCESSANDO" : `DESCONHECIDO (${result.resultCode})`}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500 text-[9px] block font-sans">Identificação</span>
                        <span className="text-zinc-200 select-all font-bold break-all text-[10px]">{result.requestID || 'N/A'}</span>
                      </div>
                      {result.dateTimeProcessed && (
                        <div className="col-span-2 pt-1">
                          <span className="text-zinc-500 text-[9px] block font-sans">Data Processamento</span>
                          <span className="text-zinc-200 font-bold">{new Date(result.dateTimeProcessed).toLocaleString('pt-AO')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* 3. ASYNC REGISTRATION ENJOYMENT VIEW */
                  <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-850 rounded-sm space-y-3">
                    <div className="flex items-center gap-2 text-emerald-800">
                      <CheckCircle2 size={16} className="text-emerald-600" />
                      <span className="font-sans font-black text-xs uppercase tracking-wide">Documento Enviado para Fila</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-emerald-800/80">
                      O registo assíncrono foi aceite pelo gateway AGT. A submissão recebeu o requestID abaixo. Você deve aguardar alguns segundos e clicar no botão Polling no painel de log à direita para verificar a validação final!
                    </p>
                    {result.requestID && (
                      <div className="bg-white border border-emerald-200/80 p-2.5 font-mono text-[10px] break-all rounded-sm flex flex-col gap-1 shadow-sm">
                        <span className="font-bold text-zinc-800 lowercase">identificador uníco da solicitação:</span>
                        <span className="text-[#003366] font-bold text-[11px] select-all">{result.requestID}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* LOGS HISTORY FROM SUPABASE TABLE agt_logs */}
            <div className="space-y-3 mt-4">
              <span className="block text-[10px] font-black uppercase text-zinc-400 tracking-widest flex justify-between items-center">
                <span>Histórico de Comunicação (Logs de Auditoria)</span>
                <button 
                  type="button" 
                  onClick={fetchTransmissionHistory} 
                  className="text-[#003366] hover:underline flex items-center gap-1 font-bold rounded-sm py-1 px-1.5 hover:bg-zinc-150 transition-colors"
                >
                  <RefreshCw size={11} /> Atualizar Logs
                </button>
              </span>

              {isLoadingHistory ? (
                <div className="py-8 flex justify-center text-xs text-zinc-400 font-bold">
                  <Loader2 className="animate-spin text-[#003366]" size={20} />
                </div>
              ) : history.length === 0 ? (
                <div className="py-8 text-center text-[10px] text-zinc-400 font-bold bg-white border border-dashed border-zinc-200 rounded-sm">
                  Nenhum log de comunicação registado para este documento.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[35vh] overflow-y-auto pr-1">
                  {history.map((item, index) => (
                    <div 
                      key={item.id || index}
                      className="p-3 border border-zinc-250 bg-white hover:border-[#003366] transition-all rounded-sm cursor-pointer"
                      onClick={() => setSelectedHistoryItem(selectedHistoryItem?.id === item.id ? null : item)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[9px] font-black uppercase font-mono px-2 py-0.5 border rounded-sm ${getBadgeStyle(item.status)}`}>
                          {item.status}
                        </span>
                        <span className="text-[9px] text-zinc-400 font-mono">
                          {new Date(item.created_at).toLocaleString('pt-AO')}
                        </span>
                      </div>
                      
                      <div className="text-[10px] text-zinc-500 font-mono break-all leading-tight">
                        Ação: <span className="font-bold text-zinc-800">{item.action}</span> 
                        {item.request_id && (
                          <> | ID: <span className="font-bold text-[#003366]">{item.request_id}</span></>
                        )}
                      </div>

                      {item.request_id && (
                        <div className="mt-2.5 pt-2 border-t border-zinc-100 flex justify-end">
                           <button 
                             type="button"
                             onClick={(e) => { e.stopPropagation(); handlePollStatus(item.request_id); }}
                             disabled={isPolling}
                             className="text-[9px] font-sans font-black text-[#003366] hover:bg-sky-100/60 uppercase tracking-wider flex items-center gap-1.5 bg-sky-50 px-2.5 py-1.5 rounded-sm border border-sky-100 cursor-pointer"
                           >
                             <RefreshCw size={10} className={isPolling ? "animate-spin" : ""} />
                             Consultar Status (Polling)
                           </button>
                        </div>
                      )}

                      <AnimatePresence>
                        {selectedHistoryItem?.id === item.id && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-3 pt-3 border-t border-zinc-150 text-[9px] font-mono whitespace-pre overflow-x-auto bg-zinc-950 text-zinc-400 p-3 rounded-sm scrollbar-none"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="font-bold text-white block mb-1.5 uppercase tracking-widest text-[8px]">Detalhes Técnicos da Resposta</span>
                            {JSON.stringify(item.response || item.error, null, 2)}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
