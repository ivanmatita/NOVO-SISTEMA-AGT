import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  // loadEnv com mode='staging' lê automaticamente .env.staging
  // loadEnv com mode='development' ou 'production' lê .env
  const env = loadEnv(mode, '.', '');

  // Determinar ambiente efectivo
  const appEnv = env.VITE_APP_ENV || process.env.VITE_APP_ENV || mode;
  const isStaging = appEnv === 'staging';

  // URLs e chaves correctas por ambiente
  // Staging: usa credenciais do projecto sfnibpxfevhelaikqbiq
  // Produção/dev: usa credenciais do projecto nawqfidnawokqaheqvar
  const STAGING_URL = 'https://sfnibpxfevhelaikqbiq.supabase.co';
  const PROD_URL = 'https://nawqfidnawokqaheqvar.supabase.co';
  const STAGING_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbmlicHhmZXZoZWxhaWtxYmlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNTAyODgsImV4cCI6MjEwMjYyNjI4OH0.AnxqAF-TBY556gp2oPV0I5hfTjozaCMIHaeH7OhifiM';
  const PROD_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hd3FmaWRuYXdva3FhaGVxdmFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMTgxNDYsImV4cCI6MjA5Mzc5NDE0Nn0.qFkIexxKcQDWax3pfhcgPMR3ZFIsE-gYWTS62i5Edgs';

  const resolvedUrl = isStaging
    ? (env.VITE_SUPABASE_URL || env.SUPABASE_URL || STAGING_URL)
    : (env.VITE_SUPABASE_URL || env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || PROD_URL);

  const resolvedAnon = isStaging
    ? (env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || STAGING_ANON)
    : (env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || PROD_ANON);

  return {
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(resolvedUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(resolvedAnon),
      'import.meta.env.VITE_AGT_MODE': JSON.stringify(
        env.VITE_AGT_MODE || process.env.VITE_AGT_MODE || (isStaging ? 'SANDBOX' : 'SIMULACAO')
      ),
      'import.meta.env.VITE_APP_ENV': JSON.stringify(appEnv),
    },
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
        'Content-Security-Policy': "default-src 'self' https: data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: https://*.supabase.co; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co ws: wss: http: https: blob:;"
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
