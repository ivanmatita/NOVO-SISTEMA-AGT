import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: {
        ignored: ['**/db.json', '**/logs/**', '**/*.log', '**/*.txt', '**/*.cjs'],
      },
      headers: {
        'Content-Security-Policy': "default-src 'self' https: data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: https://*.supabase.co; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co ws://localhost:* wss: https: blob:;"
      },
      proxy: {
        // Proxy for AGT NIF consultation — bypasses CORS in dev
        '/api-agt-nif': {
          target: 'https://portaldocontribuinte.minfin.gov.ao',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api-agt-nif/, ''),
          secure: false,
        },
      },
    },
    build: {
      outDir: 'dist',
      minify: 'esbuild',
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('@supabase')) return 'vendor-supabase';
              if (id.includes('lucide-react')) return 'vendor-icons';
              if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('html2pdf')) return 'vendor-pdf';
              if (id.includes('recharts')) return 'vendor-charts';
              if (id.includes('xlsx')) return 'vendor-excel';
              if (id.includes('react-quill')) return 'vendor-quill';
              return 'vendor';
            }
          }
        }
      }
    }
  };
});
