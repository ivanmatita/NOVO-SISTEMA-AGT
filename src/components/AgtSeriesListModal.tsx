import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, ShieldCheck, Loader2, AlertCircle, RefreshCw, Layers, Calendar, CheckSquare } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface AgtSeriesListModalProps {
  onClose: () => void;
}

export const AgtSeriesListModal: React.FC<AgtSeriesListModalProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [series, setSeries] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [taxId, setTaxId] = useState('');

  useEffect(() => {
    // Tentar obter o NIF da empresa do utilizador
    const fetchNif = async () => {
      if (user?.empresa_id) {
        const { data } = await supabase
          .from('config_empresa')
          .select('nif')
          .eq('empresa_id', user.empresa_id)
          .single();
        if (data?.nif) setTaxId(data.nif);
      }
    };
    fetchNif();
  }, [user]);

  const fetchAgtSeries = async () => {
    if (!taxId) {
      setError("NIF da empresa não encontrado.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/agt/listar-series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taxRegistrationNumber: taxId,
          establishmentNumber: "SEDE"
        })
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setSeries(result.data.seriesInfo || []);
      } else {
        const errorList = result.errorList || [];
        const errorMsg = errorList.length > 0 
          ? errorList.map((e: any) => `[${e.idError}] ${e.descriptionError}`).join(' | ')
          : result.error || 'Erro ao obter séries da AGT.';
        setError(errorMsg);
      }
    } catch (err: any) {
      setError("Erro de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'A': return 'text-emerald-500 bg-emerald-50 border-emerald-100';
      case 'U': return 'text-blue-500 bg-blue-50 border-blue-100';
      case 'F': return 'text-zinc-500 bg-zinc-50 border-zinc-100';
      default: return 'text-amber-500 bg-amber-50 border-amber-100';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'A': return 'Aberta';
      case 'U': return 'Em Uso';
      case 'F': return 'Fechada';
      default: return status;
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-4xl bg-white shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
      >
        <div className="flex justify-between items-center p-6 border-b border-zinc-100 bg-[#003366] text-white">
          <div className="flex items-center gap-3">
            <Layers size={24} />
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight">Séries Registadas na AGT</h3>
              <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">Consulta em tempo real ao Portal do Contribuinte</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 bg-zinc-50 border-b border-zinc-200 flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 space-y-1.5">
            <label className="text-[10px] font-black uppercase text-zinc-400">NIF da Empresa para Pesquisa</label>
            <input 
              type="text" 
              value={taxId}
              onChange={e => setTaxId(e.target.value)}
              className="w-full border border-zinc-200 p-2.5 text-sm font-bold bg-white"
              placeholder="Digite o NIF..."
            />
          </div>
          <button 
            onClick={fetchAgtSeries}
            disabled={loading}
            className="bg-[#003366] text-white px-6 py-2.5 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-blue-900 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Pesquisar na AGT
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-600 flex items-start gap-3 mb-6">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <div className="text-xs font-bold leading-relaxed">{error}</div>
            </div>
          )}

          {series.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {series.map((item, idx) => (
                <div key={idx} className="bg-white border border-zinc-200 p-4 hover:border-[#003366] transition-colors group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="px-2 py-1 bg-zinc-100 text-[#003366] font-black text-[10px] rounded uppercase tracking-wider">
                      {item.documentType}
                    </div>
                    <div className={`px-2 py-1 border rounded font-black text-[9px] uppercase tracking-widest ${getStatusColor(item.seriesStatus)}`}>
                      {getStatusLabel(item.seriesStatus)}
                    </div>
                  </div>
                  
                  <h4 className="text-lg font-black text-zinc-900 border-b border-zinc-50 pb-2 mb-3 font-mono">
                    {item.seriesCode}
                  </h4>

                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-[10px]">
                    <div className="space-y-0.5">
                      <span className="text-zinc-400 font-bold uppercase block">Ano de Emissão</span>
                      <div className="flex items-center gap-1.5 font-black text-zinc-700">
                        <Calendar size={12} className="text-zinc-400" />
                        {item.seriesYear}
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-zinc-400 font-bold uppercase block">Data Criação</span>
                      <span className="font-black text-zinc-700 font-mono italic">
                        {new Date(item.seriesCreationDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-zinc-400 font-bold uppercase block">Dosc. Autorizados</span>
                      <span className="font-black text-zinc-700">
                         {item.firstDocumentApproved} - {item.lastDocumentApproved}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-zinc-400 font-bold uppercase block">Dosc. Criados</span>
                      <span className="font-black text-zinc-700">
                         {item.firstDocumentCreated || '0'} - {item.lastDocumentCreated || '0'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-dashed border-zinc-100 flex items-center justify-between">
                    <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-tighter">
                      Método: {item.invoicingMethod}
                    </span>
                    <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-tighter">
                      Regime: {item.seriesContingencyIndicator === 'N' ? 'Normal' : 'Contingência'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : !loading && (
            <div className="h-full flex flex-col items-center justify-center text-center py-20 bg-zinc-50/50 border border-dashed border-zinc-200">
              <ShieldCheck size={48} className="text-zinc-200 mb-4" />
              <h4 className="text-zinc-900 font-black uppercase text-sm">Nenhuma série pesquisada</h4>
              <p className="text-zinc-400 text-xs mt-1">Insira o NIF da empresa e clique em "Pesquisar na AGT" para ver as séries autorizadas.</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-zinc-100 bg-zinc-50 flex justify-between items-center">
          <div className="flex items-center gap-2 text-zinc-400 italic text-[10px]">
            <CheckSquare size={14} /> Total de {series.length} séries encontradas nos registos da AGT.
          </div>
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-white border border-zinc-200 text-zinc-600 font-black text-[10px] uppercase tracking-widest hover:bg-zinc-100 transition-all"
          >
            Fechar Janela
          </button>
        </div>
      </motion.div>
    </div>
  );
};
