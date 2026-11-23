import { supabase } from '../lib/supabase';
import { User } from '../types';
import { clearTenantCache } from '../lib/tenantDataLoader';

let sessionCache: any = null;
let sessionLoading = false;
// In-flight deduplication: if getCurrentUser() is already running, new callers
// await the same Promise instead of launching parallel requests.
let inFlightUserPromise: Promise<any> | null = null;

async function safeApiFetch(url: string, options: RequestInit = {}, maxAttempts = 3): Promise<Response> {
  let attempt = 0;
  let delay = 1000;
  while (attempt < maxAttempts) {
    attempt++;
    try {
      const response = await fetch(url, options);
      return response;
    } catch (err: any) {
      const isNetwork = err?.message?.includes('Failed to fetch') || err?.message?.includes('NetworkError') || err?.message?.includes('network');
      if (isNetwork && attempt < maxAttempts) {
        console.warn(`[AuthService safeApiFetch] Tentativa ${attempt}/${maxAttempts} para '${url}' falhou. Retentando em ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
        continue;
      }
      if (isNetwork) {
        throw new Error('Falha de ligação à Internet ou servidor inacessível. Verifique a sua conexão de rede e tente novamente.');
      }
      throw err;
    }
  }
  throw new Error('Servidor indisponível após múltiplas tentativas. Verifique a sua ligação.');
}

const FALLBACK_SESSION_KEY = 'imatec_fallback_session';

function saveFallbackSession(session: any) {
  sessionCache = session;
  try {
    if (typeof sessionStorage !== 'undefined') {
      if (session?.access_token) {
        sessionStorage.setItem(FALLBACK_SESSION_KEY, JSON.stringify(session));
      } else {
        sessionStorage.removeItem(FALLBACK_SESSION_KEY);
      }
    }
  } catch {}
}

function getFallbackSession(): any {
  const isNotExpired = (s: any) => {
    if (!s?.access_token) return false;
    if (s.expires_at && Number(s.expires_at) * 1000 < Date.now() - 5000) return false;
    return true;
  };
  if (isNotExpired(sessionCache)) return sessionCache;
  try {
    if (typeof sessionStorage !== 'undefined') {
      const raw = sessionStorage.getItem(FALLBACK_SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (isNotExpired(parsed)) {
          sessionCache = parsed;
          return parsed;
        }
        sessionStorage.removeItem(FALLBACK_SESSION_KEY);
      }
    }
  } catch {}
  return null;
}

export const authService = {
  async getSessionSafe() {
    if (sessionLoading) {
      // Pequeno delay para evitar múltiplas chamadas simultâneas se já estiver a carregar
      await new Promise(r => setTimeout(r, 200));
    }

    sessionLoading = true;
    try {
      let timeoutId: any;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Timeout on getSession')), 15000);
      });
      timeoutPromise.catch(() => {}); // Prevent unhandled promise rejection
      const getSessionPromise = supabase.auth.getSession();
      
      const res = await Promise.race([
        getSessionPromise.then(res => {
          clearTimeout(timeoutId);
          return res;
        }), 
        timeoutPromise
      ]) as any;
      
      if (res.error) {
        console.error('Error getting session:', res.error);
        return getFallbackSession();
      }
      
      const session = res.data.session;
      if (session) {
        sessionCache = session;
        return session;
      }
      return getFallbackSession();
    } catch (err) {
      console.error('getSessionSafe timeout/error:', err);
      return getFallbackSession();
    } finally {
      sessionLoading = false;
    }
  },

  async registerCompany(formData: any): Promise<User> {
    try {
      console.log('[AuthService] Iniciando fluxo SaaS via Servidor (Anti-Rate-Limit)...');
      
      const emailToRegister = formData.email?.trim()?.toLowerCase() || '';

      // 🟡 PASSO 1: Chamada ao Servidor para criação Bypass com retentativa resiliente
      const response = await safeApiFetch('/api/auth/register-saas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailToRegister,
          password: formData.password,
          formData: formData
        })
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = (result.error || '').toLowerCase();
        if (
          errorMsg.includes('already registered') || 
          errorMsg.includes('already exists') ||
          errorMsg.includes('email_exists') ||
          errorMsg.includes('ja esta registado') ||
          errorMsg.includes('já está registado')
        ) {
          console.log('[AuthService] Utilizador já existe no sistema. Procedendo para Login de sessão...');
        } else {
          throw new Error(result.error || 'Falha no registo da empresa via servidor.');
        }
      }

      // 🟢 PASSO 2: Autenticar no Cliente
      console.log('[AuthService] Obtendo sessão local...');
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: emailToRegister,
        password: formData.password
      });

      if (loginError) {
        throw new Error(`Empresa criada com sucesso, mas ocorreu um problema ao iniciar sessão: ${loginError.message}`);
      }

      if (loginData?.session) {
        saveFallbackSession(loginData.session);
      }

      // Se a conta já existia no Auth sem perfil/empresa, garantir onboarding pelo servidor
      const currentUser = await this.getCurrentUser();
      if (!currentUser && loginData?.session?.access_token) {
        try {
          const repairRes = await fetch('/api/auth/repair-onboarding', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${loginData.session.access_token}`
            }
          });
          if (repairRes.ok) {
            return (await this.getCurrentUser()) as User;
          }
        } catch (_) {}
      }

      console.log('[AuthService] Fluxo SaaS concluído com sucesso!');
      return (currentUser || null) as any;
    } catch (err: any) {
      console.error('[AuthService] Falha Crítica no Fluxo SaaS:', err.message);
      throw err;
    }
  },

  async login(usernameLogin: string, password: string): Promise<User> {
    try {
      const cleanUsername = usernameLogin?.trim() || '';
      console.log('[AuthService] Tentativa de login por Username Login:', cleanUsername);

      if (!cleanUsername) {
        throw new Error('Por favor, introduza o seu Username ou E-mail.');
      }

      if (!password) {
        throw new Error('Por favor, introduza a sua palavra-passe.');
      }

      // Chamada segura ao backend para autenticação por Username Login
      const res = await safeApiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanUsername,
          password: password
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Username Login ou palavra-passe incorretos.');
      }

      const session = data.session;
      if (!session || !session.access_token) {
        throw new Error('Sessão inválida devolvida pelo servidor.');
      }

      // Sincronizar a sessão com o cliente local Supabase
      const { error: setSessionError } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token
      });

      if (setSessionError) {
        console.warn('[AuthService] Alerta ao sincronizar sessão no cliente:', setSessionError.message);
      }

      const authUser = data.user || session.user;
      if (!authUser || !authUser.id) {
        throw new Error('Falha interna: Sessão não encontrada ou credenciais inválidas.');
      }

      saveFallbackSession(session);

      // 0. Tentar primeiro via backend (/api/auth/me) que resolve perfil e empresa com service_role (bypass RLS e multi-ambiente)
      const meUser = await this.getCurrentUser();
      if (meUser && meUser.empresa_id) {
        return meUser;
      }

      // 1. Tentar buscar Perfil diretamente no cliente se /api/auth/me não retornou empresa completa
      let { data: perfil, error: perfilError } = await supabase
        .from('perfis')
        .select('*')
        .or(`id.eq.${authUser.id},user_id.eq.${authUser.id}`)
        .maybeSingle();

      if (perfilError) console.error('[AuthService] Erro de rede ao buscar perfil:', perfilError);

      // Validação Estrita de Bloqueio de Acesso
      if (perfil && (perfil.ativo === false || perfil.is_active === false)) {
        await supabase.auth.signOut();
        sessionCache = null;
        throw new Error("O seu acesso foi bloqueado. Contacte o administrador da sua empresa para obter mais informações.");
      }

      // Handle profile mappings
      if (perfil && !perfil.empresa_id && perfil.company_id) {
        perfil.empresa_id = perfil.company_id;
      }
      
      if (perfil && perfil.empresa_id) {
        perfil.company_id = perfil.empresa_id;
      }


      // 2. Se não houver perfil ou empresa vinculada, executar auto-reparação via servidor
      if (!perfil || !perfil.empresa_id) {
        console.warn('[AuthService] Perfil não encontrado. Iniciando auto-reparação...');
        let serverRepairError: string | null = null;
        
        try {
          const token = session.access_token;
          if (token) {
            console.log('[AuthService] A chamar API de reparação do onboarding...');
            const repairResponse = await fetch('/api/auth/repair-onboarding', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              }
            });
            if (repairResponse.ok) {
              const repairResult = await repairResponse.json();
              if (repairResult.success) {
                console.log('[AuthService] Onboarding reparado com sucesso pelo servidor:', repairResult.message);
                sessionCache = session;
                const repairedUser = await this.getCurrentUser();
                if (repairedUser) return repairedUser;
              }
            } else {
              const errData = await repairResponse.json().catch(() => ({}));
              serverRepairError = errData.error || `HTTP ${repairResponse.status}`;
              console.warn('[AuthService] Erro na API de reparação:', serverRepairError);
            }
          }
        } catch (repairErr: any) {
          serverRepairError = repairErr.message;
          console.warn('[AuthService] Erro ao tentar API de reparação de onboarding:', repairErr.message);
        }

        // --- FALLBACK CLIENT-SIDE (somente se o cliente local possuir auth.uid() válido no mesmo projeto Supabase) ---
        const { data: verifiedAuthData } = await supabase.auth.getUser();
        const verifiedUid = verifiedAuthData?.user?.id;
        if (!verifiedUid || verifiedUid !== authUser.id) {
          throw new Error(
            serverRepairError
              ? `Erro de Onboarding: Não foi possível concluir a associação da empresa no servidor. Detalhe: ${serverRepairError}`
              : 'Erro de Onboarding: Sessão autenticada não corresponde ao projeto Supabase ativo para criação automática da empresa.'
          );
        }

        console.log('[AuthService] Fallback: Executando reparação do lado do cliente...');
        
        const { data: company, error: companyErr } = await supabase
          .from('empresas')
          .select('id, nome_empresa')
          .eq('auth_user_id', verifiedUid)
          .limit(1)
          .maybeSingle();

        if (companyErr) console.error('[AuthService] Erro ao buscar empresa para reparação:', companyErr);

        let targetCompany;
        if (!company) {
          console.warn('[AuthService] Conta Órfã detetada. Criando Empresa Padrão...');
          
          const newCompanyId = crypto.randomUUID();
          const compName = `Empresa de ${authUser.email?.split('@')[0] || cleanUsername}`;
          const { data: newCompany, error: createError } = await supabase
            .from('empresas')
            .insert([{
              id: newCompanyId,
              auth_user_id: verifiedUid,
              nome: compName,
              nome_empresa: compName,
              email: authUser.email,
              plano: 'trial',
              ativo: false,
              licenca_ativa: false,
              status_licenca: 'SUSPENSA'
            }])
            .select('id, nome, nome_empresa')
            .single();

          if (createError) {
            console.error('[AuthService] Falha ao criar empresa base:', createError);
            const detail = serverRepairError ? `${serverRepairError} | RLS: ${createError.message}` : createError.message;
            throw new Error(`Erro de Onboarding: Autenticação ativa, mas não foi possível criar a sua empresa base. Detalhe: ${detail}`);
          }
          
          targetCompany = newCompany;
        } else {
          targetCompany = company;
        }

        console.log('[AuthService] Empresa pronta. Criando/Vinculando perfil...', targetCompany.id);

        const { error: insertError } = await supabase
          .from('perfis')
          .upsert({
            id: verifiedUid,
            user_id: verifiedUid,
            empresa_id: targetCompany.id,
            email: authUser.email,
            username: cleanUsername,
            role: 'admin',
            is_admin: true,
            is_active: true,
            ativo: true,
            level: 10,
            nome: authUser.user_metadata?.full_name || targetCompany.nome_empresa || targetCompany.nome || cleanUsername
          }, { 
            onConflict: 'id' 
          });

        if (insertError) {
           console.error('[AuthService] Falha crítica ao vincular perfil:', insertError);
           const { error: retryError } = await supabase
             .from('perfis')
             .insert([{
               id: verifiedUid,
               user_id: verifiedUid,
               empresa_id: targetCompany.id,
               email: authUser.email,
               username: cleanUsername,
               role: 'admin',
               is_admin: true,
               is_active: true,
               ativo: true,
               level: 10,
               nome: authUser.user_metadata?.full_name || targetCompany.nome_empresa || targetCompany.nome || cleanUsername
             }]);
           
           if (retryError) {
             throw new Error(`Erro de Sincronização: Não foi possível criar o seu perfil de acesso. Detalhe: ${retryError.message}`);
           }
        }
        
        console.log('[AuthService] Acesso reparado e sincronizado com sucesso.');
        return await this.getCurrentUser() as User;
      }

      // (Opcional) Verificações de acesso podem ser feitas aqui
      
      return await this.getCurrentUser() as User;
    } catch (err: any) {
      console.error('[AuthService] Falha no login:', err.message);
      throw err;
    }
  },

  async logout() {
    try {
      clearTenantCache();
      await supabase.auth.signOut();
      saveFallbackSession(null);
    } catch (err) {
      console.error('Erro ao sair:', err);
    }
  },

  async getCurrentUser(): Promise<User | null> {
    // In-flight deduplication: if a call is already in progress, return the
    // same Promise so INITIAL_SESSION, SIGNED_IN, TOKEN_REFRESHED all share one request.
    if (inFlightUserPromise) {
      return inFlightUserPromise;
    }
    inFlightUserPromise = this._doGetCurrentUser().finally(() => {
      inFlightUserPromise = null;
    });
    return inFlightUserPromise;
  },

  async _doGetCurrentUser(): Promise<User | null> {
    try {
      const session = await this.getSessionSafe();
      if (!session) {
        console.log('[AuthService] Nenhuma sessão encontrada em getCurrentUser.');
        return null;
      }

      console.log('[AuthService] Recuperando perfil para o utilizador:', session?.user?.id);

      // Try fetching via backend API to bypass RLS recursion timeouts
      try {
        const token = session.access_token;
        const res = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (res.status === 401) {
          saveFallbackSession(null);
        }

        if (res.status === 403) {
          const errData = await res.json().catch(() => ({}));
          if (errData.error === 'CONTA_BLOQUEADA') {
            console.warn('[AuthService] Utilizador bloqueado detetado via API. Efetuando logout...');
            await supabase.auth.signOut();
            saveFallbackSession(null);
            alert('O seu acesso foi bloqueado. Contacte o administrador da sua empresa para obter mais informações.');
            window.location.reload();
            return null;
          }
        }

        if (res.ok) {
          const { user: userAuth, perfil, empresa } = await res.json();
          if (perfil && empresa) {
            console.log('[AuthService] Recuperado via API (Bypass RLS):', empresa.nome_empresa);
            return {
              id: userAuth.id,
              username: perfil.nome || perfil.username || empresa.nome_empresa || userAuth.email?.split('@')[0] || 'Usuário',
              email: userAuth.email || '',
              empresa_id: perfil.empresa_id,
              role: perfil.role || 'admin',
              created_at: empresa.created_at || userAuth.created_at,
              company: empresa,
              permission_areas: (() => {
                const raw = perfil.permission_areas ?? perfil.permissions ?? perfil.permissoes;
                const isAdminProfile = perfil.is_admin || perfil.role === 'admin' || perfil.role === 'admin_empresa' || perfil.role === 'proprietario';
                if (Array.isArray(raw)) {
                  const mapped = raw.map((p: any) => String(p).trim().toLowerCase()).filter(s => s.length > 0);
                  // Array vazio para admin = sem restrições explícitas (null = acesso irrestrito)
                  if (mapped.length === 0 && isAdminProfile) return null;
                  return mapped;
                }
                if (typeof raw === 'string' && raw.trim().length > 0) {
                  try {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) return parsed.map((p: any) => String(p).trim().toLowerCase());
                  } catch {
                    if (raw.startsWith('{') && raw.endsWith('}')) {
                      return raw.slice(1, -1).split(',').map((s: string) => s.trim().replace(/^"|"$/g, '').toLowerCase());
                    }
                    return raw.split(',').map((s: string) => s.trim().toLowerCase());
                  }
                }
                return isAdminProfile ? null : [];
              })(),
              is_admin: perfil.is_admin || perfil.role === 'admin' || false,
              level: perfil.level || (perfil.role === 'admin' ? 10 : 1)
            };
          }
        }
      } catch(e) {
        console.warn('[AuthService] Fallback to direct supabase query, API failed:', e);
      }

      const createTimeout = (ms: number) => {
        let timer: any;
        const p = new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('Timeout DB Query')), ms);
        });
        // append catch to prevent unhandled promise rejection if it fires late
        p.catch(() => {});
        return { promise: p, clear: () => clearTimeout(timer) };
      };

      const startTime = Date.now();
      const perfilQuery = supabase
        .from('perfis')
        .select('*')
        .or(`id.eq.${session?.user?.id},user_id.eq.${session?.user?.id}`)
        .maybeSingle();

      const pt1 = createTimeout(30000);
      let { data: perfil, error } = await Promise.race([
        perfilQuery.then(res => {
          pt1.clear();
          return res;
        }).catch(err => {
          pt1.clear();
          throw err;
        }), 
        pt1.promise
      ]) as any;
      
      if (perfil && !perfil.empresa_id && perfil.company_id) {
        perfil.empresa_id = perfil.company_id;
      }
      if (perfil && perfil.empresa_id) {
        perfil.company_id = perfil.empresa_id;
      }
      console.log(`[AuthService] perfilQuery levou ${Date.now() - startTime}ms`);

      if (error) {
        console.error('[AuthService] Erro ao recuperar perfil:', error);
      }

      // Se o perfil do utilizador foi desativado/bloqueado pelo CRM
      if (perfil && (perfil.ativo === false || perfil.is_active === false)) {
        console.warn('[AuthService] Utilizador com conta bloqueada detetado em getCurrentUser. Efetuando logout...');
        await supabase.auth.signOut();
        saveFallbackSession(null);
        return null;
      }


      let empresa = null;
      const parsedCompanyId = perfil?.empresa_id;

      if (parsedCompanyId) {
        const pt2 = createTimeout(30000);
        const companyQuery = supabase
          .from('empresas')
          .select('*')
          .eq('id', parsedCompanyId)
          .maybeSingle();
        const { data } = await Promise.race([
          companyQuery.then(res => {
            pt2.clear();
            return res;
          }).catch(err => {
            pt2.clear();
            throw err;
          }),
          pt2.promise
        ]) as any;
        empresa = data;
      }

      if (!perfil || !empresa) {
        console.warn('[AuthService] Perfil ou empresa não encontrados via lookup simples. Tentando via lookup direto em empresas...');
        
        // Tentativa 1: Buscar empresa onde o utilizador é o dono
        const pt3 = createTimeout(30000);
        const legacyQuery = supabase
          .from('empresas')
          .select('*')
          .or(`id.eq.${session?.user?.id},auth_user_id.eq.${session?.user?.id}`)
          .maybeSingle();
          
        const { data: legacyEmpresa, error: legacyError } = await Promise.race([
          legacyQuery.then(res => {
            pt3.clear();
            return res;
          }).catch(err => {
            pt3.clear();
            throw err;
          }),
          pt3.promise
        ]) as any;

        if (legacyError) console.error('[AuthService] Erro no fallback legacy query:', legacyError);

        if (legacyEmpresa) {
          console.log('[AuthService] Empresa encontrada via fallback:', legacyEmpresa.id);
          return {
            id: session?.user?.id,
            username: legacyEmpresa.nome_empresa || session?.user?.email?.split('@')[0] || 'Usuário',
            email: session?.user?.email || '',
            empresa_id: legacyEmpresa.id,
            role: 'admin',
            created_at: legacyEmpresa.created_at || session?.user?.created_at,
            company: legacyEmpresa
          };
        }

        // Tentativa 2: Buscar QUALQUER perfil deste utilizador (caso o lookup anterior tenha falhado)
        const { data: profileOnly } = await supabase.from('perfis').select('empresa_id, role, permission_areas, is_admin, level').eq('id', session?.user?.id).maybeSingle();
        const fallbackCompanyId = profileOnly?.empresa_id;
        if (fallbackCompanyId) {
           const { data: companyOnly } = await supabase.from('empresas').select('*').eq('id', fallbackCompanyId).maybeSingle();
           if (companyOnly) {
              return {
                id: session?.user?.id,
                username: profileOnly.nome || profileOnly.username || companyOnly.nome_empresa || session?.user?.email?.split('@')[0] || 'Usuário',
                email: session?.user?.email || '',
                empresa_id: companyOnly.id,
                role: profileOnly.role || 'user',
                is_admin: profileOnly.is_admin || false,
                level: profileOnly.level || 1,
                created_at: companyOnly.created_at || session?.user?.created_at,
                company: companyOnly,
                permission_areas: profileOnly.permission_areas || []
              };
           }
        }
        
        console.error('[AuthService] Falha total na identificação da empresa para o user:', session?.user?.id);
        return null; // Don't return a half-baked user if we can't find their company
      }

      return {
        id: session?.user?.id,
        username: perfil.nome || perfil.username || empresa.nome_empresa || session?.user?.email?.split('@')[0] || 'Usuário',
        email: session?.user?.email || '',
        empresa_id: parsedCompanyId,
        role: perfil.role || 'user',
        is_admin: perfil.is_admin || false,
        level: perfil.level || 1,
        created_at: empresa.created_at || session?.user?.created_at,
        company: empresa,
        permission_areas: (() => {
          const raw = perfil.permission_areas ?? perfil.permissions ?? perfil.permissoes;
          const isAdminProfile = perfil.is_admin || perfil.role === 'admin' || perfil.role === 'admin_empresa' || perfil.role === 'proprietario';
          if (Array.isArray(raw)) {
            const mapped = raw.map((p: any) => String(p).trim().toLowerCase()).filter(s => s.length > 0);
            // Array vazio para admin = sem restrições explícitas (null = acesso irrestrito)
            if (mapped.length === 0 && isAdminProfile) return null;
            return mapped;
          }
          if (typeof raw === 'string' && raw.trim().length > 0) {
            try {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) return parsed.map((p: any) => String(p).trim().toLowerCase());
            } catch {
              if (raw.startsWith('{') && raw.endsWith('}')) {
                return raw.slice(1, -1).split(',').map((s: string) => s.trim().replace(/^"|"$/g, '').toLowerCase());
              }
              return raw.split(',').map((s: string) => s.trim().toLowerCase());
            }
          }
          return isAdminProfile ? null : [];
        })()
      };
    } catch (err) {
      console.error('[AuthService] Falha crítica em getCurrentUser:', err);
      return null;
    }
  },

  async forgotPassword(email: string) {
    const emailToReset = email?.trim() || '';
    const lastSent = localStorage.getItem(`last_forgot_email_${emailToReset}`);
    const now = Date.now();
    if (lastSent && now - Number(lastSent) < 60000) { // 1 minute limit
      throw new Error('Por favor, aguarde um minuto antes de solicitar novamente.');
    }

    const { error } = await supabase.auth.resetPasswordForEmail(emailToReset, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    
    if (error) {
      if (error.message.includes('rate limit')) {
        throw new Error('Limite de envio de emails atingido. Por favor, tente mais tarde.');
      }
      if (error.message.includes('invalid')) {
        throw new Error(`O endereço de e-mail fornecido ("${emailToReset}") aparenta ser inválido.`);
      }
      throw error;
    }

    localStorage.setItem(`last_forgot_email_${emailToReset}`, now.toString());
  },

  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    if (error) throw error;
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        saveFallbackSession(null);
      } else if (session) {
        sessionCache = session;
      }
      callback(event, session || getFallbackSession());
    });
  }
};
