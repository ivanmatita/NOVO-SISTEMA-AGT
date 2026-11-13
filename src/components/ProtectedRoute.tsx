import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LoginPage } from './LoginPage';
import { Loader2, AlertTriangle } from 'lucide-react';
import { DiagnosticTools } from './DiagnosticTools';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const [showHelper, setShowHelper] = useState(false);

  useEffect(() => {
    let timer: any;
    if (loading) {
      timer = setTimeout(() => {
        setShowHelper(true);
      }, 5000); // Show helper if loading more than 5s
    }
    return () => clearTimeout(timer);
  }, [loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6 text-center">
        <div className="flex flex-col items-center gap-4 max-w-sm">
          <Loader2 className="animate-spin text-[#003366]" size={40} />
          <div>
            <p className="text-[10px] font-black text-[#003366] uppercase tracking-widest">Sincronizando Sistema...</p>
            <p className="text-[10px] text-zinc-400 mt-1">Isso pode levar alguns segundos dependendo da sua ligação.</p>
          </div>
          
          {showHelper && (
            <div className="mt-8 p-4 bg-amber-50 rounded-lg border border-amber-100 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-700">
              <AlertTriangle className="text-amber-500 mb-2" size={24} />
              <p className="text-xs font-bold text-amber-900 uppercase tracking-tight">O carregamento está demorado?</p>
              <p className="text-[11px] text-amber-700 mt-1 leading-relaxed">
                Se o sistema não carregar em 30 segundos, pode haver um problema de configuração no Supabase ou uma falha de rede.
              </p>
            </div>
          )}
        </div>
        <DiagnosticTools />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LoginPage />
        <DiagnosticTools />
      </>
    );
  }

  return (
    <>
      {children}
      {/* Show tools on demand or if check fails, but keep it subtle in production */}
      {showHelper && <DiagnosticTools />}
    </>
  );
};
