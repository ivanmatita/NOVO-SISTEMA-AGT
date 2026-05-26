import React, { StrictMode, Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[Fatal Frontend Error]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white font-sans selection:bg-rose-500 selection:text-white">
          <div className="w-full max-w-lg bg-slate-800 rounded-2xl border border-slate-700/60 p-8 shadow-2xl flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-rose-500/15 border border-rose-500/30 text-rose-400 rounded-xl flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold tracking-tight">Ocorreu um erro no sistema</h2>
                <p className="text-xs text-slate-400">O sistema detetou uma falha inesperada no processador visual.</p>
              </div>
            </div>
            
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-4 font-mono text-xs text-rose-300 overflow-x-auto whitespace-pre-wrap max-h-48 leading-relaxed">
              {this.state.error?.message || "Erro de renderização desconhecido."}
            </div>
            
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => window.location.reload()}
                className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 transition-colors text-white py-2.5 rounded-lg text-sm font-medium shadow-lg hover:shadow-indigo-500/10 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-slate-800"
              >
                Recarregar Aplicação
              </button>
              <button 
                onClick={() => this.setState({ hasError: false, error: null })}
                className="w-full bg-slate-700 hover:bg-slate-600 active:bg-slate-850 transition-colors text-slate-300 py-2 rounded-lg text-sm font-medium focus:outline-none"
              >
                Ignorar e Continuar
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Global Rejection and Exception Listeners to prevent uncaught page failures
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    // Intercept with clean logs. Suppress noise or trace.
    console.warn('[SafeSystem] Intercepted Unhandled promise rejection:', event.reason);
    
    // Gracefully prevent default browser reporting
    event.preventDefault();
  });

  window.addEventListener('error', (event) => {
    console.error('[SafeSystem] Intercepted runtime exception:', event.error || event.message);
    
    // Suppress unhandled WebSocket closed errors or connection errors to never display to user as a stack
    const errorStr = event.message || '';
    if (errorStr.includes('WebSocket') || errorStr.includes('Socket') || errorStr.includes('connection')) {
      event.preventDefault();
    }
  });
}

// Monaco Editor Web Worker Fallback context
if (typeof window !== 'undefined') {
  (window as any).MonacoEnvironment = {
    getWorker: function () {
      return new Worker(
        URL.createObjectURL(
          new Blob(
            [`self.onmessage = function() { postMessage({ kind: 'ready' }); };`],
            { type: 'application/javascript' }
          )
        )
      );
    }
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
);
