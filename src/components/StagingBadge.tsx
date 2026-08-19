import React from 'react';
import { FlaskConical, ShieldCheck, ChevronRight } from 'lucide-react';
import { getAppEnvironment } from '../lib/envProtection';

interface StagingBadgeProps {
  onOpenCentral?: () => void;
}

export const StagingBadge: React.FC<StagingBadgeProps> = ({ onOpenCentral }) => {
  const env = getAppEnvironment();
  const isProd = env === 'production';
  const isStaging = env === 'staging';

  if (isProd) {
    return (
      <div className="w-full bg-slate-900 border-b border-slate-800 text-slate-400 text-[10px] font-bold py-1 px-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block"></span>
          <span className="uppercase tracking-widest text-slate-300 font-mono flex items-center gap-1">
            <ShieldCheck size={12} className="text-emerald-500" /> PRODUÇÃO
          </span>
          <span className="hidden sm:inline text-slate-500 font-normal font-sans">
            — Sistema Oficial Certificado
          </span>
        </div>
        <div className="font-mono text-[9px] text-slate-500 uppercase">
          AGT: LIVE
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-amber-600 border-b border-amber-500 text-amber-50 text-xs font-semibold py-1 px-4 flex items-center justify-between transition-colors shadow-sm">
      <div className="flex items-center gap-2">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-amber-300"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-200"></span>
        </span>
        
        <div className="flex items-center gap-1.5 font-mono">
          <FlaskConical className="w-3.5 h-3.5 text-amber-200" />
          <span className="uppercase tracking-wide font-black">
            🧪 AMBIENTE DE TESTE
          </span>
          <span className="hidden sm:inline text-amber-100/90 text-[11px] font-normal">
            — Dados fictícios (não reais) | Supabase Staging Isolado
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden md:inline-block text-[10px] font-mono bg-black/30 px-2 py-0.5 rounded border border-white/20 uppercase tracking-wider">
          AGT: SANDBOX / MOCK
        </span>

        {onOpenCentral && (
          <button
            onClick={onOpenCentral}
            className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white px-2.5 py-0.5 rounded text-[11px] font-medium transition-all"
            title="Abrir a Central de Homologação do Sistema"
          >
            <span>Central de Homologação</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};
