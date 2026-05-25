import { createClient } from '@supabase/supabase-js';

const getEnvVar = (name: string): string => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return (import.meta.env[name] || '') as string;
    }
  } catch (e) {}
  try {
    if (typeof process !== 'undefined' && process.env) {
      return (process.env[name] || '') as string;
    }
  } catch (e) {}
  return '';
};

const rawUrl = getEnvVar('VITE_SUPABASE_URL').trim();
if (!rawUrl) {
  console.error("VITE_SUPABASE_URL não encontrada");
}
if (!getEnvVar('VITE_SUPABASE_ANON_KEY')) {
  console.error("VITE_SUPABASE_ANON_KEY não encontrada");
}

// Robust cleaning: remove /rest/v1, /auth/v1, and trailing slashes
const supabaseUrl = rawUrl
  .replace(/\/rest\/v1\/?$/, "")
  .replace(/\/auth\/v1\/?$/, "")
  .replace(/\/$/, "");
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY').trim();

// Connection status exported for UI inspection
export const supabaseStatus = {
  configured: Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')),
  url: supabaseUrl || 'MISSING',
  keyPresent: Boolean(supabaseAnonKey),
  environment: typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.MODE : 'development',
};

/**
 * Perform a real network health check to verify connectivity and API keys.
 * Use this in development or diagnostics screens.
 */
export async function checkSupabaseHealth() {
  if (!supabaseStatus.configured) {
    return { 
      status: 'error', 
      message: 'Credenciais não configuradas (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)', 
      code: 'CONFIG_MISSING' 
    };
  }

  try {
    const { data, error } = await supabase.from('_health').select('*').limit(1);
    if (error) {
      if (
        error.code === '42P01' || 
        error.code === 'PGRST205' || 
        error.message?.includes('does not exist') ||
        error.message?.includes('_health')
      ) {
        return { status: 'ok', message: 'Conectado ao Supabase (API respondendo)', code: 'READY' };
      }
      return { status: 'warning', message: `Erro de conexão: ${error.message}`, code: error.code };
    }
    return { status: 'ok', message: 'Sistema operacional e conectado', code: 'READY' };
  } catch (err: any) {
    return { status: 'error', message: `Falha crítica de rede: ${err.message}`, code: 'NETWORK_ERROR' };
  }
}

// Export singleton directly as requested
export const supabase = supabaseStatus.configured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      },
      global: {
        headers: {
          'x-client-info': 'erp-imatec-v3'
        }
      }
    })
  : (() => {
      // Return beautiful Proxy Mock client if not configured
      const createRecursiveMock = (targetName: string): any => {
        const mock: any = new Proxy(() => mock, {
          get: (_target, prop) => {
            if (prop === 'isMock') return true;
            if (prop === 'status') return supabaseStatus;
            
            if (prop === 'then') {
              return (onFulfilled: any) => {
                const result = { 
                  data: (targetName === 'auth' || targetName === 'getUser' || targetName === 'getSession') 
                    ? { session: null, user: null, subscription: { unsubscribe: () => {} } } 
                    : (targetName === 'single' || targetName === 'maybeSingle') ? null : [], 
                  error: { message: 'Supabase mock active due to missing configuration', code: 'MISSING_CONFIG' } 
                };
                return Promise.resolve(onFulfilled ? onFulfilled(result) : result);
              };
            }
            
            if (prop === 'data') {
              if (targetName === 'auth' || targetName === 'getUser' || targetName === 'getSession') {
                return { session: null, user: null, subscription: { unsubscribe: () => {} } };
              }
              if (targetName === 'single' || targetName === 'maybeSingle') return null;
              if (targetName === 'getPublicUrl') return { publicUrl: 'https://placehold.co/600x400?text=Supabase+Simulated+Image' };
              return [];
            }
            
            if (prop === 'error') return { message: 'Configuração ausente', code: 'CONFIG_MISSING' };
            
            if (targetName === 'auth') {
              if (prop === 'getSession') return async () => ({ data: { session: null }, error: null });
              if (prop === 'getUser') return async () => ({ data: { user: null }, error: null });
              if (prop === 'signInWithPassword') return async () => ({ data: { user: null, session: null }, error: new Error('Configuração ausente') });
              if (prop === 'onAuthStateChange') return (callback: any) => {
                if (typeof callback === 'function') {
                  setTimeout(() => callback('INITIAL_SESSION', null), 0);
                }
                return { data: { subscription: { unsubscribe: () => {} } } };
              };
            }
            
            if (prop === 'storage') return createRecursiveMock('storage');
            if (prop === 'channel') return () => createRecursiveMock('channel');
            
            const builders = ['select', 'from', 'eq', 'order', 'single', 'maybeSingle', 'insert', 'update', 'delete', 'upsert', 'match', 'or', 'range'];
            if (builders.includes(prop.toString())) {
               return () => createRecursiveMock(prop.toString());
            }

            return createRecursiveMock(prop.toString());
          }
        });
        return mock;
      };

      return createRecursiveMock('supabase');
    })();

// Ensure global sharing of single instance
if (typeof window !== 'undefined') {
  (globalThis as any).__supabase = supabase;
}
