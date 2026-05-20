import { createClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
// Robust cleaning: remove /rest/v1, /auth/v1, and trailing slashes
const supabaseUrl = rawUrl
  .replace(/\/rest\/v1\/?$/, "")
  .replace(/\/auth\/v1\/?$/, "")
  .replace(/\/$/, "");
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

const createSupabaseClient = () => {
  if (!supabaseUrl || !supabaseAnonKey || !supabaseUrl.startsWith('http')) {
    const msg = '⚠️ Supabase credentials are missing or invalid. Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.';
    console.warn(msg);
    
    // Create a recursive proxy that returns itself for any property access or function call.
    // This allows chains like supabase.from('...').select('...').eq('...', '...') to not crash.
    const createRecursiveMock = (targetName: string): any => {
      const mock: any = new Proxy(() => mock, {
        get: (_target, prop) => {
          // Special cases for properties that components might check
          if (prop === 'then') {
            // Make it awaitable / thenable
            return (onFulfilled: any) => {
              const result = { 
                data: (targetName === 'auth' || targetName === 'getUser' || targetName === 'getSession') 
                  ? { session: null, user: null, subscription: { unsubscribe: () => {} } } 
                  : [], 
                error: null 
              };
              return Promise.resolve(onFulfilled ? onFulfilled(result) : result);
            };
          }
          
          if (prop === 'data') {
            return (targetName === 'auth' || targetName === 'getUser' || targetName === 'getSession') 
              ? { session: null, user: null, subscription: { unsubscribe: () => {} } } 
              : [];
          }
          
          if (prop === 'error') return null;
          
          // Specific method mocks for common patterns
          if (targetName === 'auth') {
            if (prop === 'getSession') return async () => ({ data: { session: null }, error: null });
            if (prop === 'getUser') return async () => ({ data: { user: null }, error: null });
            if (prop === 'signInWithPassword') return async () => ({ data: { user: null, session: null }, error: new Error(msg) });
            if (prop === 'onAuthStateChange') return (callback: any) => {
              // Optionally trigger callback with null session
              if (typeof callback === 'function') {
                setTimeout(() => callback('INITIAL_SESSION', null), 0);
              }
              return { data: { subscription: { unsubscribe: () => {} } } };
            };
          }
          
          if (prop === 'storage') return createRecursiveMock('storage');
          if (prop === 'channel') return () => createRecursiveMock('channel');
          
          // For any other access, return a new mock proxy
          return createRecursiveMock(prop.toString());
        }
      });
      return mock;
    };

    return createRecursiveMock('supabase');
  }

  return createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
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
    }
  );
};

export const supabase =
  (globalThis as any).__supabase ?? createSupabaseClient();

if (typeof window !== 'undefined') {
  (globalThis as any).__supabase = supabase;
}
