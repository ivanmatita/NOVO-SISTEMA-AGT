import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, ShieldCheck, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AgtSeriesModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export const AgtSeriesModal: React.FC<AgtSeriesModalProps> = ({ onClose, onSuccess }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    taxRegistrationNumber: '',
    seriesYear: new Date().getFullYear().toString(),
    documentType: 'FT',
    establishmentNumber: 'SEDE',
    seriesContingencyIndicator: 'N'
  });

  const documentTypes = [
    { code: 'FT', name: 'Factura (FT)' },
    { code: 'FS', name: 'Factura Simplificada (FS)' },
    { code: 'FR', name: 'Factura Recibo (FR)' },
    { code: 'NC', name: 'Nota de Crédito (NC)' },
    { code: 'ND', name: 'Nota de Débito (ND)' },
    { code: 'RC', name: 'Recibo (RC)' },
    { code: 'GR', name: 'Guia de Remessa (GR)' },
    { code: 'GT', name: 'Guia de Transporte (GT)' },
    { code: 'OR', name: 'Orçamento (OR)' },
    { code: 'PP', name: 'Factura Proforma (PP)' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/agt/solicitar-serie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          empresa_id: user?.empresa_id,
          utilizador_id: user?.id
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult(data.data);
        if (onSuccess) onSuccess();
      } else {
        const errorList = data.errorList || [];
        const errorMsg = errorList.length > 0 
          ? errorList.map((e: any) => `[${e.idError}] ${e.descriptionError}`).join(' | ')
          : data.error || 'Erro ao solicitar série.';
        setError(errorMsg);
      }
    } catch (err: any) {
      setError(err.message || 'Erro de conexão.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-lg bg-white shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="flex justify-between items-center p-6 border-b border-zinc-100 bg-[#003366] text-white">
          <div className="flex items-center gap-3">
            <ShieldCheck size={24} />
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight">Solicitar Série Fiscal</h3>
              <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">AGT - Administração Geral Tributária</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {result ? (
            <div className="space-y-6 py-4">
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2">
                  <CheckCircle2 size={40} />
                </div>
                <h4 className="text-xl font-bold text-zinc-900">Série Autorizada com Sucesso!</h4>
                <p className="text-zinc-500 text-sm">A sua nova série já está disponível no sistema e pronta a usar.</p>
              </div>

              <div className="bg-zinc-50 border border-zinc-200 p-4 space-y-4 font-mono text-sm">
                <div className="flex justify-between border-b border-zinc-200 pb-2">
                  <span className="text-zinc-400 uppercase text-[10px] font-bold">Código da Série</span>
                  <span className="text-[#003366] font-black">{result.seriesCode}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-200 pb-2">
                  <span className="text-zinc-400 uppercase text-[10px] font-bold">Lote Autorizado</span>
                  <span className="font-bold">{result.authorizedQuantity}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-200 pb-2">
                  <span className="text-zinc-400 uppercase text-[10px] font-bold">Início</span>
                  <span className="font-bold">{result.firstDocumentNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400 uppercase text-[10px] font-bold">Fim</span>
                  <span className="font-bold">{result.lastDocumentNo}</span>
                </div>
              </div>

              <button 
                onClick={onClose}
                className="w-full py-4 bg-[#003366] text-white font-black text-xs uppercase tracking-widest hover:bg-blue-900 transition-all"
              >
                Concluir e Fechar
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-600 flex items-start gap-3">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <div className="text-xs font-bold leading-relaxed">{error}</div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">NIF Contribuinte</label>
                  <input 
                    type="text" 
                    value={formData.taxRegistrationNumber}
                    onChange={e => setFormData({...formData, taxRegistrationNumber: e.target.value})}
                    className="w-full border border-zinc-200 p-3 text-sm font-bold bg-zinc-50"
                    placeholder="5000..."
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Ano da Série</label>
                  <input 
                    type="number" 
                    value={formData.seriesYear}
                    onChange={e => setFormData({...formData, seriesYear: e.target.value})}
                    className="w-full border border-zinc-200 p-3 text-sm font-bold bg-zinc-50"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Tipo de Documento</label>
                <select 
                  value={formData.documentType}
                  onChange={e => setFormData({...formData, documentType: e.target.value})}
                  className="w-full border border-zinc-200 p-3 text-sm font-bold bg-zinc-50 outline-none"
                  required
                >
                  {documentTypes.map(t => (
                    <option key={t.code} value={t.code}>{t.code} - {t.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Cód. Estabelecimento</label>
                  <input 
                    type="text" 
                    value={formData.establishmentNumber}
                    onChange={e => setFormData({...formData, establishmentNumber: e.target.value})}
                    className="w-full border border-zinc-200 p-3 text-sm font-bold bg-zinc-50"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Regime</label>
                  <select 
                    value={formData.seriesContingencyIndicator}
                    onChange={e => setFormData({...formData, seriesContingencyIndicator: e.target.value})}
                    className="w-full border border-zinc-200 p-3 text-sm font-bold bg-zinc-50 outline-none"
                    required
                  >
                    <option value="N">Normal (Online)</option>
                    <option value="C">Contingência (Offline)</option>
                  </select>
                </div>
              </div>

              <div className="bg-zinc-50 p-4 border border-zinc-100 text-[10px] text-zinc-500 leading-relaxed italic">
                A submissão deste pedido gera uma assinatura digital <strong>JWS (RS256)</strong> que é validada pela AGT em tempo real. Certifique-se de que o NIF e o Ano estão corretos.
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-4 bg-[#003366] text-white font-black text-xs uppercase tracking-widest hover:bg-blue-900 transition-all flex items-center justify-center gap-3 drop-shadow-xl shadow-blue-900/40"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Solicitando à AGT...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={18} />
                    Finalizar e Solicitar Série
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};
