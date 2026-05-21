import React, { useState, useEffect } from 'react';
import { supabase, supabaseStatus, checkSupabaseHealth } from '../lib/supabase';
import { AlertCircle, CheckCircle, Info, RefreshCw, Database, ShieldAlert, Key, Globe, User, Activity } from 'lucide-react';

export const DiagnosticTools: React.FC = () => {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [apiStatus, setApiStatus] = useState<string>('A verificar...');

  const runCheck = async () => {
    setLoading(true);
    try {
      const result = await checkSupabaseHealth();
      setHealth(result);
      
      // Get current auth status
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);
      } catch (err) {
        setCurrentUser(null);
      }

      // Check Express backend health
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const json = await res.json();
          setApiStatus(`Ligado (${json.mode || 'offline-sync'})`);
        } else {
          setApiStatus(`Erro HTTP ${res.status}`);
        }
      } catch (err) {
        setApiStatus('Erro de Ligação');
      }
    } catch (e: any) {
      setHealth({ status: 'error', message: e.message, code: 'UNCAUGHT' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runCheck();
  }, []);

  if (!health && !loading) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] max-w-sm w-full">
      <div className={`bg-white rounded-xl shadow-2xl border-l-4 overflow-hidden ${
        health?.status === 'ok' ? 'border-green-500' : 
        health?.status === 'warning' ? 'border-amber-500' : 'border-red-500'
      }`}>
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex gap-3">
              <div className={`p-2 rounded-full ${
                health?.status === 'ok' ? 'bg-green-50 text-green-600' : 
                health?.status === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
              }`}>
                {health?.status === 'ok' ? <CheckCircle size={20} /> : 
                 health?.status === 'warning' ? <AlertCircle size={20} /> : <ShieldAlert size={20} />}
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-900">
                  Status do Supabase
                </h3>
                <p className="text-sm text-zinc-600 mt-1 leading-tight">
                  {health?.message || 'A verificar ligação...'}
                </p>
                {health?.code && (
                  <span className="inline-block mt-2 px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded text-[10px] font-mono">
                    ERROR_CODE: {health.code}
                  </span>
                )}
              </div>
            </div>
            <button 
              onClick={runCheck}
              disabled={loading}
              className="text-zinc-400 hover:text-zinc-600 transition-colors p-1"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-zinc-50 pt-3">
            <button 
              onClick={() => setShowDetails(!showDetails)}
              className="text-[10px] font-bold text-zinc-400 hover:text-zinc-900 uppercase tracking-tighter transition-colors"
            >
              {showDetails ? 'Ocultar Detalhes' : 'Ver Diagnóstico Técnico'}
            </button>
            <div className="flex gap-2">
              {supabaseStatus.configured && !(supabase as any).isMock ? (
                <div title="Conectado real" className="w-2 h-2 rounded-full bg-green-500" />
              ) : (
                <div title="Configuração Incompleta / Mock" className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
              {import.meta.env.PROD && <div title="Produção" className="w-2 h-2 rounded-full bg-indigo-500" />}
            </div>
          </div>

          {showDetails && (
            <div className="mt-4 p-3 bg-zinc-900 rounded-lg text-[10px] font-mono text-zinc-300 space-y-2 overflow-x-auto">
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-1">
                <Globe size={12} className="text-zinc-500" />
                <span className="text-green-400">Ambiente:</span> {import.meta.env.MODE}
              </div>
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-1">
                <Database size={12} className="text-zinc-500" />
                <span className="text-green-400">Tipo de Cliente:</span> {(supabase as any).isMock ? '⚠️ SIMULADOR (MOCK)' : '✅ Cliente Real'}
              </div>
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-1">
                <Database size={12} className="text-zinc-500" />
                <span className="text-green-400">Supabase URL:</span> 
                <span className="truncate max-w-[200px]">{supabaseStatus.url}</span>
              </div>
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-1">
                <Key size={12} className="text-zinc-500" />
                <span className="text-green-400">Chave Anon Key:</span> {supabaseStatus.keyPresent ? '✅ Carregada' : '❌ Ausente'}
              </div>
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-1">
                <Activity size={12} className="text-zinc-500" />
                <span className="text-green-400">Conexão API:</span> {apiStatus}
              </div>
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-1">
                <User size={12} className="text-zinc-500" />
                <span className="text-green-400">Utilizador:</span> {currentUser ? currentUser.email : 'Sessão Offline / Não autenticado'}
              </div>
              <div className="pt-2 text-zinc-500 italic">
                # Dica: Se o URL ou Key estiverem incorretos ou com a prefixo errado no Vercel (VITE_), use o menu Definições para corrigir.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
