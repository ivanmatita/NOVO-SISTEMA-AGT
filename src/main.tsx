import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';

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
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
