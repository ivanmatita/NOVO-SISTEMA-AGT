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

// Safe Promise execution helper with Timeout, Try/Catch & Retries
function makeSafePromise(promise: Promise<any>, description: string): Promise<any> {
  const timeoutMs = 15000;
  
  const wrappedPromise = new Promise(async (resolve) => {
    let resolved = false;
    
    // Timeout safeguard
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.warn(`[SafeSupabase Timeout] '${description}' timed out after ${timeoutMs}ms.`);
        resolve({
          data: null,
          error: {
            message: 'O servidor do Supabase demorou demasiado tempo a responder (Timeout).',
            code: 'REQUEST_TIMEOUT',
            isTimeout: true
          }
        });
      }
    }, timeoutMs);

    let attempts = 0;
    const maxAttempts = 3;
    let delay = 1000;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const result = await promise;
        
        if (result && result.error) {
          const errCode = String(result.error.code);
          const errMsg = String(result.error.message || '');
          const isTransient = errCode === '503' || errCode === '502' || errMsg.includes('FetchError') || errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError');
          
          if (isTransient && attempts < maxAttempts) {
            console.warn(`[SafeSupabase Retry] Transient issue in '${description}'. Retrying in ${delay}ms... (Attempt ${attempts}/${maxAttempts})`);
            await new Promise(r => setTimeout(r, delay));
            delay *= 2;
            continue;
          }
        }

        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve(result);
          return;
        }
      } catch (err: any) {
        const errMsg = String(err?.message || '');
        console.error(`[SafeSupabase Exception] on '${description}':`, err);
        
        const isTransient = errMsg.includes('Failed to fetch') || errMsg.includes('network') || errMsg.includes('server unreachable') || errMsg.includes('fetch');
        if (isTransient && attempts < maxAttempts) {
          console.warn(`[SafeSupabase Exception Retry] Attempting recovery for '${description}' (Attempt ${attempts}/${maxAttempts})...`);
          await new Promise(r => setTimeout(r, delay));
          delay *= 2;
          continue;
        }

        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve({
            data: null,
            error: {
              message: errMsg || 'Erro de comunicação desconhecido com o servidor.',
              code: 'NETWORK_EXCEPTION',
              details: err
            }
          });
          return;
        }
      }
    }
  });

  return wrappedPromise;
}

// Proxied recursive query builder to intercept final execution (.then / .catch)
function createBuilderProxy(originalBuilder: any, name: string): any {
  return new Proxy(originalBuilder, {
    get(target, prop, receiver) {
      if (prop === 'then') {
        const safePromise = makeSafePromise(target, `Query: ${name}`);
        return (onFulfilled: any, onRejected: any) => {
          return safePromise.then(onFulfilled, onRejected);
        };
      }
      if (prop === 'catch') {
        const safePromise = makeSafePromise(target, `Query: ${name}`);
        return (onRejected: any) => {
          return safePromise.catch(onRejected);
        };
      }

      const val = Reflect.get(target, prop, receiver);

      if (typeof val === 'function') {
        return (...args: any[]) => {
          try {
            const result = val.apply(target, args);
            if (result && (typeof result === 'object' || typeof result === 'function')) {
              const argStr = args.map(a => typeof a === 'object' ? 'obj' : String(a)).join(', ');
              return createBuilderProxy(result, `${name}.${prop.toString()}(${argStr})`);
            }
            return result;
          } catch (err) {
            console.error(`[SafeSupabase Exception] Builder call error ${name}.${prop.toString()}:`, err);
            return createBuilderProxy(Promise.resolve({ data: null, error: err }), name);
          }
        };
      }

      return val;
    }
  });
}

// Safe wrapper for realtime database subscription channels
class SafeRealtimeChannel {
  private baseChannel: any;
  private channelName: string;
  private listeners: { type: string; filter: any; callback: any }[] = [];
  private isSubscribed = false;
  private retryCount = 0;
  private maxRetries = 10;
  private isClosed = false;
  private realSubClient: any;

  constructor(baseChannel: any, name: string, creatorClient: any) {
    this.baseChannel = baseChannel;
    this.channelName = name;
    this.realSubClient = creatorClient;
  }

  on(type: string, filter: any, callback: any) {
    try {
      this.listeners.push({ type, filter, callback });
      this.baseChannel.on(type, filter, callback);
    } catch (e) {
      console.error(`[SafeSupabase Channel] Error registering listener on ${this.channelName}:`, e);
    }
    return this;
  }

  subscribe(callback?: (status: string, err?: any) => void) {
    if (this.isClosed) return this;
    this.isSubscribed = true;
    
    try {
      this.baseChannel.subscribe((status: string, err?: any) => {
        console.log(`[SafeSupabase Realtime] Event status '${status}' on channel '${this.channelName}'`, err || '');
        
        if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          this.handleReconnection();
        } else if (status === 'SUBSCRIBED') {
          this.retryCount = 0; // reset
        }

        if (callback) {
          try {
            callback(status, err);
          } catch (callbackErr) {
            console.error(`[SafeSupabase CallbackException] Error inside channel subscribe callback:`, callbackErr);
          }
        }
      });
    } catch (error: any) {
      console.error(`[SafeSupabase Exception] Failed to subscribe to channel ${this.channelName}:`, error);
      this.handleReconnection();
    }
    return this;
  }

  private handleReconnection() {
    if (this.isClosed) return;
    if (this.retryCount >= this.maxRetries) {
      console.warn(`[SafeSupabase Realtime] Subscription '${this.channelName}' max reconnection attempts reached. Continuing offline fallback.`);
      return;
    }

    const delay = Math.min(1000 * Math.pow(1.5, this.retryCount), 15000);
    this.retryCount++;
    console.log(`[SafeSupabase Realtime] Reconnecting channel '${this.channelName}' in ${delay.toFixed(0)}ms (Attempt ${this.retryCount}/${this.maxRetries})`);

    setTimeout(() => {
      if (this.isClosed) return;
      try {
        console.log(`[SafeSupabase Realtime] Doing resubscribe of '${this.channelName}'`);
        
        try {
          this.realSubClient.removeChannel(this.baseChannel);
        } catch (e) {}

        this.baseChannel = this.realSubClient.channel(this.channelName);
        for (const listener of this.listeners) {
          this.baseChannel.on(listener.type, listener.filter, listener.callback);
        }
        
        this.subscribe();
      } catch (err) {
        console.error(`[SafeSupabase Realtime] Exception during resubscribe of '${this.channelName}':`, err);
      }
    }, delay);
  }

  unsubscribe() {
    this.isClosed = true;
    try {
      this.baseChannel.unsubscribe();
    } catch (e) {
      console.warn(`[SafeSupabase Realtime] Suppressed exception during unsubscribe on '${this.channelName}':`, e);
    }
  }

  get native() {
    return this.baseChannel;
  }
}

// Proxied Auth Object with Timeout & Try/Catch safety
function createAuthProxy(originalAuth: any): any {
  return new Proxy(originalAuth, {
    get(target, prop, receiver) {
      if (prop === 'onAuthStateChange') {
        return (callback: any) => {
          try {
            const result = target.onAuthStateChange((event: string, session: any) => {
              try {
                callback(event, session);
              } catch (cbErr) {
                console.error('[SafeSupabase AuthCallback] Exception on event handler:', cbErr);
              }
            });
            return {
              data: {
                subscription: {
                  unsubscribe: () => {
                    try {
                      if (result && result.data && result.data.subscription) {
                        result.data.subscription.unsubscribe();
                      }
                    } catch (e) {
                      console.warn('[SafeSupabase Auth] Unsubscribe error:', e);
                    }
                  }
                }
              }
            };
          } catch (err) {
            console.error('[SafeSupabase Auth] Fault in onAuthStateChange configuration:', err);
            return {
              data: {
                subscription: {
                  unsubscribe: () => {}
                }
              }
            };
          }
        };
      }

      const val = Reflect.get(target, prop, receiver);
      if (typeof val === 'function') {
        return (...args: any[]) => {
          return makeSafePromise(
            val.apply(target, args),
            `Auth: ${prop.toString()}`
          );
        };
      }
      return val;
    }
  });
}

// Proxied Storage Object with Safety
function createStorageProxy(originalStorage: any): any {
  return new Proxy(originalStorage, {
    get(target, prop, receiver) {
      const val = Reflect.get(target, prop, receiver);
      if (typeof val === 'function') {
        return (...args: any[]) => {
          try {
            const result = val.apply(target, args);
            if (result && (typeof result === 'object' || typeof result === 'function')) {
              return createBuilderProxy(result, `Storage.${prop.toString()}`);
            }
            return result;
          } catch (err) {
            console.error(`[SafeSupabase Storage] Error in Storage.${prop.toString()}:`, err);
            return createBuilderProxy(Promise.resolve({ data: null, error: err }), `Storage.${prop.toString()}`);
          }
        };
      }
      return val;
    }
  });
}

// Create the actual, raw configured client
const realClientInstance = supabaseStatus.configured
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
  : null;

// Wrap configured client or create recursive mock proxy
export const supabase = realClientInstance
  ? (() => {
      const authProxied = createAuthProxy(realClientInstance.auth);
      const storageProxied = createStorageProxy(realClientInstance.storage);

      const clientProxy: any = new Proxy(realClientInstance, {
        get(target, prop, receiver) {
          if (prop === 'auth') return authProxied;
          if (prop === 'storage') return storageProxied;
          
          if (prop === 'from') {
            return (tableName: string) => {
              try {
                const builder = target.from(tableName);
                return createBuilderProxy(builder, tableName);
              } catch (err) {
                console.error(`[SafeSupabase] Error referencing table '${tableName}':`, err);
                return createBuilderProxy(Promise.resolve({ data: [], error: err }), tableName);
              }
            };
          }
          
          if (prop === 'rpc') {
            return (fnName: string, args?: any) => {
              try {
                const builder = target.rpc(fnName, args);
                return createBuilderProxy(builder, `rpc:${fnName}`);
              } catch (err) {
                console.error(`[SafeSupabase] Error calling rpc '${fnName}':`, err);
                return createBuilderProxy(Promise.resolve({ data: null, error: err }), `rpc:${fnName}`);
              }
            };
          }

          if (prop === 'channel') {
            return (channelName: string) => {
              try {
                const nativeChannel = target.channel(channelName);
                return new SafeRealtimeChannel(nativeChannel, channelName, clientProxy);
              } catch (err) {
                console.error(`[SafeSupabase] Error creating channel '${channelName}':`, err);
                // Return fallback empty mock channel
                return {
                  on: () => this,
                  subscribe: (cb: any) => {
                    if (cb) cb('CHANNEL_ERROR', err);
                    return this;
                  },
                  unsubscribe: () => {}
                };
              }
            };
          }

          if (prop === 'removeChannel') {
            return (channel: any) => {
              try {
                if (channel instanceof SafeRealtimeChannel) {
                  channel.unsubscribe();
                  return target.removeChannel(channel.native);
                }
                return target.removeChannel(channel);
              } catch (e) {
                console.warn('[SafeSupabase] Error dismissing channel:', e);
              }
            };
          }

          if (prop === 'removeAllChannels') {
            return () => {
              try {
                return target.removeAllChannels();
              } catch (e) {
                console.warn('[SafeSupabase] Error dismissing all channels:', e);
              }
            };
          }

          return Reflect.get(target, prop, receiver);
        }
      });
      
      return clientProxy;
    })()
  : (() => {
      // Proxy Mock client if credentials are empty/invalid to prevent startup crashes
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
