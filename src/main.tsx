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
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red', fontFamily: 'sans-serif' }}>
          <h2>Ocorreu um erro no sistema.</h2>
          <pre>{this.state.error?.message}</pre>
          <button onClick={() => window.location.reload()}>Recarregar Página</button>
        </div>
      );
    }
    return this.props.children;
  }
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
