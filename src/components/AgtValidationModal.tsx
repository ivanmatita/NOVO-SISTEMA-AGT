import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Check, AlertCircle, Loader2, Info, ChevronRight, 
  FileText, CheckCircle2, AlertTriangle, ShieldCheck, History, CornerDownRight, HelpCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';

// Helper de formatação de moeda
function formatCurrency(value: any) {
  const num = Number(value || 0);
  return num.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' });
}

interface IssuedDocument {
  id: string | number;
  numero_documento?: string;
  invoice_number?: string;
  data_emissao?: string;
  contravalor?: number;
  total?: number;
  moeda?: string;
  client_id?: string | number;
  client_name?: string;
  empresa_id?: string;
}

interface AgtValidationModalProps {
  document: IssuedDocument;
  companyNif?: string;
  userId?: string;
  onClose: () => void;
}

export const AgtValidationModal: React.FC<AgtValidationModalProps> = ({
  document,
  companyNif = '',
  userId = '',
  onClose
}) => {
  // Estados do formulário
  const [nif, setNif] = useState(companyNif || '5000922200');
  const [documentNo, setDocumentNo] = useState(document.numero_documento || document.invoice_number || '');
  const [action, setAction] = useState<'C' | 'R'>('C');
  const [deductibilityType, setDeductibilityType] = useState<'none' | 'percent' | 'amount'>('none');
  const [deductiblePercent, setDeductiblePercent] = useState<string>('');
  const [nonDeductibleVal, setNonDeductibleVal] = useState<string>('');

  // Estados de controlo
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any | null>(null);

  useEffect(() => {
    fetchValidationHistory();
  }, [document.numero_documento]);

  const fetchValidationHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const docNoToSearch = document.numero_documento || document.invoice_number;
      if (!docNoToSearch) return;

      const { data, error } = await supabase
        .from('agt_validations')
        .select('*')
        .eq('document_no', docNoToSearch)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[AGT-MODAL] Erro ao buscar histórico:', error.message);
      } else {
        setHistory(data || []);
      }
    } catch (err: any) {
      console.error('[AGT-MODAL] Erro inesperado histórico:', err.message);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResult(null);
    setErrorMsg(null);

    // Validações locais adicionais no frontend antes do envio
    if (deductibilityType === 'percent' && (!deductiblePercent || Number(deductiblePercent) < 0 || Number(deductiblePercent) > 100)) {
      setErrorMsg("A percentagem de IVA dedutível deve ser um valor entre 0 e 100");
      setIsSubmitting(false);
      return;
    }
    if (deductibilityType === 'amount' && (!nonDeductibleVal || Number(nonDeductibleVal) < 0)) {
      setErrorMsg("O valor não dedutível deve ser maior ou igual a zero");
      setIsSubmitting(false);
      return;
    }

    try {
      const payload: any = {
        taxRegistrationNumber: nif.trim(),
        documentNo: documentNo.trim(),
        action,
        empresa_id: document.empresa_id || null,
        created_by: userId || null
      };

      if (deductibilityType === 'percent') {
        payload.deductibleVATPercentage = Number(deductiblePercent);
      } else if (deductibilityType === 'amount') {
        payload.nonDeductibleAmount = Number(nonDeductibleVal);
      }

      console.log('[AGT-MODAL] Enviando validação...', payload);

      const response = await fetch('/api/agt/validate', {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Servidor respondeu com código de erro ${response.status}`);
      }

      const data = await response.json();
      console.log('[AGT-MODAL] Resposta obtida:', data);

      if (data.success) {
        setResult(data);
        // Atualizar lista de histórico imediatamente
        fetchValidationHistory();
      } else {
        setErrorMsg(data.error || "A AGT rejeitou ou não foi possível completar a validação.");
        setResult(data);
        fetchValidationHistory();
      }
    } catch (err: any) {
      console.error('[AGT-MODAL] Erro ao enviar validação:', err);
      setErrorMsg(err.message || "Ocorreu um erro de rede inesperado para a API de validação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBadgeStyle = (status: string) => {
    switch (status) {
      case 'VALIDADO':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'REJEITADO_AGT':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'FALHA_CONEXAO':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-zinc-100 text-zinc-700 border-zinc-200';
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-4xl bg-white rounded-none shadow-2xl flex flex-col md:flex-row h-[90vh] md:h-[85vh] overflow-hidden"
      >
        {/* Esquerda: Formulário de Ação */}
        <div className="w-full md:w-[55%] p-6 flex flex-col justify-between border-r border-zinc-100 overflow-y-auto">
          <div>
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="bg-[#003366] text-white text-[9px] font-black tracking-widest px-2 py-0.5 uppercase block w-max mb-1.5">
                  AGT ANGOLA INTEGRATION
                </span>
                <h3 className="text-xl font-sans font-black tracking-tight text-zinc-950 flex items-center gap-2">
                  <ShieldCheck className="text-[#00D17F]" size={22} />
                  Validar Documento
                </h3>
              </div>
              <button 
                onClick={onClose} 
                className="md:hidden p-1.5 hover:bg-zinc-100 rounded-full transition-colors text-zinc-400"
              >
                <X size={18} />
              </button>
            </div>

            {/* Preview do Documento Selecionado */}
            <div className="bg-zinc-50 border border-zinc-200/60 p-4 mb-6">
              <h4 className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider mb-2">Dados do Ficheiro Fiscal</h4>
              <div className="grid grid-cols-2 gap-y-2 text-xs">
                <div>
                  <span className="text-zinc-400 block font-mono text-[10px]">Número Documento</span>
                  <span className="font-mono font-bold text-zinc-800 break-all">{documentNo}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block font-mono text-[10px]">Total Emitido</span>
                  <span className="font-bold text-[#003366]">{formatCurrency(document.contravalor || document.total)}</span>
                </div>
              </div>
            </div>

            {/* Formulário Principal */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-zinc-500 tracking-wider mb-1.5">
                  NIF do Emitente (taxRegistrationNumber)
                </label>
                <input 
                  type="text" 
                  value={nif}
                  onChange={(e) => setNif(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2 text-sm font-mono focus:outline-none focus:border-[#003366] font-bold text-zinc-800"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-zinc-500 tracking-wider mb-1.5">
                  Ação Fiscal com a AGT (action)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAction('C')}
                    className={`py-3 px-4 border text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 ${
                      action === 'C' 
                        ? 'bg-emerald-550 border-emerald-500 bg-emerald-50 text-emerald-800' 
                        : 'border-zinc-200 hover:bg-zinc-50 text-zinc-650'
                    }`}
                  >
                    Confirmar (C)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAction('R')}
                    className={`py-3 px-4 border text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 ${
                      action === 'R' 
                        ? 'bg-red-50 border-red-200 text-red-800' 
                        : 'border-zinc-200 hover:bg-zinc-50 text-zinc-650'
                    }`}
                  >
                    Rejeitar (R)
                  </button>
                </div>
              </div>

              {/* Dedutibilidade de IVA */}
              <div className="border border-zinc-100 p-4 space-y-3 bg-zinc-50/50">
                <label className="block text-[10px] font-black uppercase text-zinc-500 tracking-wider">
                  Tratamento de IVA Dedutível (Opcional)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeductibilityType('none')}
                    className={`py-2 px-3 border text-[10px] font-bold uppercase text-center ${
                      deductibilityType === 'none' 
                        ? 'bg-[#003366] text-white border-[#003366]' 
                        : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                    }`}
                  >
                    Nenhum
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeductibilityType('percent')}
                    className={`py-2 px-3 border text-[10px] font-bold uppercase text-center ${
                      deductibilityType === 'percent' 
                        ? 'bg-[#003366] text-white border-[#003366]' 
                        : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                    }`}
                  >
                    Dedução %
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeductibilityType('amount')}
                    className={`py-2 px-3 border text-[10px] font-bold uppercase text-center ${
                      deductibilityType === 'amount' 
                        ? 'bg-[#003366] text-white border-[#003366]' 
                        : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                    }`}
                  >
                    Vlr Não Dedutível
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {deductibilityType === 'percent' && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <label className="block text-[10px] text-zinc-400 font-bold uppercase mb-1">Percentagem de IVA Dedutível (%)</label>
                      <input 
                        type="number" 
                        min="0"
                        max="100"
                        step="0.01"
                        placeholder="Ex: 50.00"
                        value={deductiblePercent}
                        onChange={(e) => setDeductiblePercent(e.target.value)}
                        className="w-full bg-white border border-zinc-200 px-3 py-2 text-xs focus:outline-none focus:border-[#003366]"
                        required
                      />
                    </motion.div>
                  )}

                  {deductibilityType === 'amount' && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <label className="block text-[10px] text-zinc-400 font-bold uppercase mb-1">Valor Não Dedutível (AOA)</label>
                      <input 
                        type="number" 
                        min="0"
                        step="0.01"
                        placeholder="Ex: 15400.00"
                        value={nonDeductibleVal}
                        onChange={(e) => setNonDeductibleVal(e.target.value)}
                        className="w-full bg-white border border-zinc-200 px-3 py-2 text-xs focus:outline-none focus:border-[#003366]"
                        required
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Botão de Envio */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-[#00D17F] hover:bg-[#00B36B] disabled:bg-zinc-300 text-white font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Comunicando com a AGT...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    Submeter Validação na AGT
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Rodapé de Aviso */}
          <div className="mt-4 pt-3 border-t border-zinc-50 flex gap-2 items-start text-[10px] text-zinc-400 font-medium leading-normal">
            <Info size={14} className="text-[#003366] shrink-0 mt-0.5" />
            <p>Esta operação é irrevogável. Se persistida ou homologada com sucesso junto à AGT, o status do lote fiscal refletirá na conformidade fiscal global.</p>
          </div>
        </div>

        {/* Direita: Logs & Histórico */}
        <div className="w-full md:w-[45%] bg-zinc-50 p-6 flex flex-col justify-between overflow-y-auto h-full">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-sans font-black tracking-tight text-zinc-900 flex items-center gap-2">
                <History size={18} className="text-[#003366]" />
                Histórico de Transmissão
              </h4>
              <button 
                onClick={onClose} 
                className="hidden md:block p-1.5 hover:bg-zinc-200 rounded-full transition-colors text-zinc-400"
              >
                <X size={18} />
              </button>
            </div>

            {/* Painel de Resultados Imediato se disponível */}
            {(result || errorMsg) && (
              <div className="mb-6 p-4 border bg-white border-zinc-200 space-y-3">
                <div className="flex items-start gap-2.5">
                  {errorMsg ? (
                    <AlertCircle className="text-red-500 shrink-0" size={18} />
                  ) : (
                    <CheckCircle2 className="text-emerald-500 shrink-0" size={18} />
                  )}
                  <div>
                    <h5 className="font-bold text-xs uppercase text-zinc-800">Resultado da Submissão</h5>
                    <p className="text-[11px] text-zinc-505 leading-relaxed mt-0.5">
                      {errorMsg 
                        ? errorMsg 
                        : `Submissão processada com status de ação resolvida de forma síncrona.`
                      }
                    </p>
                  </div>
                </div>

                {result && result.data && (
                  <div className="border-t border-zinc-100 pt-3 text-[10px] font-mono space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Resultado AGT:</span>
                      <span className="font-bold text-zinc-700">{result.actionResultCode || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Status Documento:</span>
                      <span className="font-bold text-zinc-700">{result.documentStatusCode || 'N/A'}</span>
                    </div>
                    {Array.isArray(result.errorList) && result.errorList.length > 0 && (
                      <div className="mt-2 bg-red-55 border border-red-100 p-2 text-[9px] text-red-651 max-h-[100px] overflow-y-auto">
                        <span className="font-bold block uppercase tracking-wide mb-1 text-red-700">Erros reportados pela AGT:</span>
                        <ul className="list-disc pl-3.5 space-y-0.5">
                          {result.errorList.map((err: any, i: number) => (
                            <li key={i}>{typeof err === 'object' ? JSON.stringify(err) : err}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Lista de Envios Históricos no Supabase */}
            <div className="space-y-2.5">
              <span className="block text-[10px] font-black uppercase text-zinc-400 tracking-widest">
                Transmissões Anteriores ({history.length})
              </span>

              {isLoadingHistory ? (
                <div className="py-8 flex justify-center items-center gap-1.5 text-xs text-zinc-400 font-bold text-center">
                  <Loader2 className="animate-spin text-[#003366]" size={16} />
                  A carregar conformidades anteriores...
                </div>
              ) : history.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-400 font-bold bg-white border border-dashed border-zinc-200">
                  Sem validações registadas para este documento.
                </div>
              ) : (
                <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                  {history.map((item, index) => (
                    <div 
                      key={item.id || index}
                      onClick={() => setSelectedHistoryItem(selectedHistoryItem?.id === item.id ? null : item)}
                      className="p-3 border border-zinc-200/80 bg-white hover:border-[#003366] transition-all cursor-pointer group"
                    >
                      <div className="flex justify-between items-start mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-zinc-850">Ação:</span>
                          <span className={`text-[10px] px-1 py-0.2 font-black ${
                            item.action === 'C' ? 'bg-emerald-50 text-emerald-850' : 'bg-red-50 text-red-850'
                          }`}>
                            {item.action === 'C' ? 'CONFIRMAR (C)' : 'REJEITAR (R)'}
                          </span>
                        </div>
                        <span className="text-[9px] text-zinc-400 font-mono font-bold">
                          {new Date(item.submission_timestamp || item.created_at).toLocaleString('pt-AO', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-50">
                        <div className="flex items-center gap-1">
                          <span className={`text-[9px] px-1.5 py-0.5 border font-black uppercase font-mono ${getBadgeStyle(item.status_validacao)}`}>
                            {item.status_validacao}
                          </span>
                          <span className="text-[9px] text-zinc-500 font-mono font-bold ml-1.5">
                            {item.action_result_code || 'FALHA_CONEXAO'}
                          </span>
                        </div>
                        <ChevronRight size={14} className="text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>

                      <AnimatePresence>
                        {selectedHistoryItem?.id === item.id && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-3 pt-3 border-t border-zinc-100 text-[9px] font-mono whitespace-pre overflow-x-auto bg-zinc-950 text-zinc-400 p-2.5 rounded-sm scrollbar-none"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="font-bold text-white block mb-1 uppercase tracking-widest text-[8px]">Resposta Bruta da AGT</span>
                            {JSON.stringify(item.response_received, null, 2)}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 p-3.5 bg-sky-50 text-sky-850 flex gap-2 border border-sky-100 rounded-sm">
            <ShieldCheck size={18} className="text-[#003366] shrink-0 mt-0.5" />
            <div className="text-[10px] leading-relaxed">
              <span className="font-bold block mb-0.5">Assinatura Certificada RS256</span>
              O sistema assina as validações com JWS utilizando cryptografia padrão e hashes imutáveis SHA-255 garantindo auditoria jurídica plena.
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
