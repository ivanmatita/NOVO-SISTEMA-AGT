import { supabase } from '../lib/supabase';
import { User } from '../types';

let sessionCache: any = null;
let sessionLoading = false;

export const authService = {
  async getSessionSafe() {
    if (sessionCache) return sessionCache;
    if (sessionLoading) return null;

    sessionLoading = true;
    try {
      // Add timeout to prevent hanging forever
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout on getSession')), 5000));
      const getSessionPromise = supabase.auth.getSession();
      
      const res = await Promise.race([getSessionPromise, timeoutPromise]) as any;
      if (res.error) {
        console.error('Error getting session:', res.error);
        return null;
      }
      sessionCache = res.data.session;
      return sessionCache;
    } catch (err) {
      console.error('getSessionSafe timeout/error:', err);
      return null;
    } finally {
      sessionLoading = false;
    }
  },

  async registerCompany(formData: any): Promise<User> {
    try {
      console.log('[AuthService] Iniciando fluxo SaaS via Servidor (Anti-Rate-Limit)...');
      
      const emailToRegister = formData.email?.trim()?.toLowerCase() || '';

      // 🟡 PASSO 1: Chamada ao Servidor para criação Bypass
      const response = await fetch('/api/auth/register-saas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailToRegister,
          password: formData.password,
          formData: formData
        })
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMsg = (result.error || '').toLowerCase();
        if (
          errorMsg.includes('already registered') || 
          errorMsg.includes('already exists') ||
          errorMsg.includes('email_exists')
        ) {
          console.log('[AuthService] Utilizador já existe no sistema. Procedendo para Login de sessão...');
        } else {
          throw new Error(result.error || 'Falha no registo via servidor.');
        }
      }

      // 🟢 PASSO 2: Autenticar no Cliente
      console.log('[AuthService] Obtendo sessão local...');
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: emailToRegister,
        password: formData.password
      });

      if (loginError) {
        throw new Error(`Utilizador criado, mas falha no login: ${loginError.message}`);
      }

      console.log('[AuthService] Fluxo SaaS concluído via API Servidor!');
      sessionCache = null;
      return await this.getCurrentUser() as User;
    } catch (err: any) {
      console.error('[AuthService] Falha Crítica no Fluxo SaaS:', err.message);
      throw err;
    }
  },

  async login(email: string, password: string): Promise<User> {
    try {
      const emailToLogin = email?.trim()?.toLowerCase() || '';
      console.log('[AuthService] Tentativa de login:', emailToLogin);
      
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: emailToLogin,
        password
      });

      if (authError) {
        if (authError.message === 'Invalid login credentials' || authError.status === 400) {
          throw new Error('E-mail ou palavra-passe incorretos. Verifique os dados ou registe uma nova conta.');
        }
        if (authError.message.includes('Email not confirmed')) {
          throw new Error('O seu e-mail ainda não foi confirmado. Verifique a sua caixa de entrada.');
        }
        throw authError;
      }
      
      if (!authData.user) throw new Error('Falha interna: Sessão não encontrada.');

      sessionCache = authData.session;

      // 1. Tentar buscar Perfil
      const { data: perfil, error: perfilError } = await supabase
        .from('perfis')
        .select('empresa_id, role')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (perfilError) console.error('[AuthService] Erro de rede ao buscar perfil:', perfilError);

      // 2. Se não houver perfil, tentar buscar Empresa (Auto-reparação)
      if (!perfil) {
        console.warn('[AuthService] Perfil não encontrado. Iniciando auto-reparação...');
        
        // Verificamos se existe uma empresa cujo auth_user_id seja este utilizador (Dono da Empresa)
        // Ou se existe um convite/ligação prévia (embora aqui foquemos no registo inicial)
        const { data: company, error: companyErr } = await supabase
          .from('empresas')
          .select('id, nome_empresa')
          .eq('auth_user_id', authData.user.id)
          .limit(1)
          .maybeSingle();

        if (companyErr) console.error('[AuthService] Erro ao buscar empresa para reparação:', companyErr);

        let targetCompany;
        if (!company) {
          console.warn('[AuthService] Conta Órfã detetada. Criando Empresa Padrão...');
          
          const newCompanyId = crypto.randomUUID();
          const { data: newCompany, error: createError } = await supabase
            .from('empresas')
            .insert([{
              id: newCompanyId,
              auth_user_id: authData.user.id,
              nome_empresa: `Empresa de ${authData.user.email?.split('@')[0]}`,
              email: authData.user.email,
              plano: 'trial'
            }])
            .select('id, nome_empresa')
            .single();

          if (createError) {
            console.error('[AuthService] Falha ao criar empresa base:', createError);
            throw new Error(`Erro de Onboarding: Autenticação ativa, mas não foi possível criar a sua empresa base. Detalhe: ${createError.message}`);
          }
          
          targetCompany = newCompany;
        } else {
          targetCompany = company;
        }

        console.log('[AuthService] Empresa pronta. Criando/Vinculando perfil...', targetCompany.id);

        // IMPORTANTE: O UPSERT aqui deve funcionar porque a política 'id = auth.uid()' permite ao user gerir o seu próprio perfil.
        const { error: insertError } = await supabase
          .from('perfis')
          .upsert({
            id: authData.user.id,
            empresa_id: targetCompany.id,
            email: authData.user.email,
            role: 'admin',
            nome: authData.user.user_metadata?.full_name || targetCompany.nome_empresa || authData.user.email?.split('@')[0]
          }, { 
            onConflict: 'id' 
          });

        if (insertError) {
           console.error('[AuthService] Falha crítica ao vincular perfil:', insertError);
           // Se falhou aqui, tentamos uma última vez sem o upsert (apenas insert) caso o RLS seja restritivo
           const { error: retryError } = await supabase
             .from('perfis')
             .insert([{
               id: authData.user.id,
               empresa_id: targetCompany.id,
               email: authData.user.email,
               role: 'admin',
               nome: authData.user.user_metadata?.full_name || targetCompany.nome_empresa || authData.user.email?.split('@')[0]
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
      await supabase.auth.signOut();
      sessionCache = null;
    } catch (err) {
      console.error('Erro ao sair:', err);
    }
  },

  async getCurrentUser(): Promise<User | null> {
    try {
      const session = await this.getSessionSafe();
      if (!session) {
        console.log('[AuthService] Nenhuma sessão encontrada em getCurrentUser.');
        return null;
      }

      console.log('[AuthService] Recuperando perfil para o utilizador:', session.user.id);

      // Promise de timeout comum para as queries
      const queryTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout DB Query')), 8000));

      // Busca perfil com a empresa associada (com timeout)
      const perfilQuery = supabase
        .from('perfis')
        .select(`
          empresa_id,
          role,
          empresas (
            id,
            nome_empresa,
            email,
            created_at
          )
        `)
        .eq('id', session.user.id)
        .maybeSingle();

      const { data: perfil, error } = await Promise.race([perfilQuery, queryTimeout]) as any;

      if (error) {
        console.error('[AuthService] Erro ao recuperar perfil:', error);
      }

      const empresa = perfil?.empresas as any;

      if (!perfil || !empresa) {
        console.warn('[AuthService] Perfil ou empresa não encontrados via JOIN. Tentando via lookup direto em empresas...');
        
        // Tentativa 1: Buscar empresa onde o utilizador é o dono
        const legacyQuery = supabase
          .from('empresas')
          .select('*')
          .or(`id.eq.${session.user.id},auth_user_id.eq.${session.user.id}`)
          .maybeSingle();
          
        const { data: legacyEmpresa, error: legacyError } = await Promise.race([legacyQuery, queryTimeout]) as any;

        if (legacyError) console.error('[AuthService] Erro no fallback legacy query:', legacyError);

        if (legacyEmpresa) {
          console.log('[AuthService] Empresa encontrada via fallback:', legacyEmpresa.id);
          return {
            id: session.user.id,
            username: legacyEmpresa.nome_empresa || session.user.email?.split('@')[0] || 'Usuário',
            email: session.user.email || '',
            empresa_id: legacyEmpresa.id,
            role: 'admin',
            created_at: legacyEmpresa.created_at || session.user.created_at,
            company: legacyEmpresa
          };
        }

        // Tentativa 2: Buscar QUALQUER perfil deste utilizador (caso o JOIN tenha falhado)
        const { data: profileOnly } = await supabase.from('perfis').select('empresa_id, role').eq('id', session.user.id).maybeSingle();
        if (profileOnly?.empresa_id) {
           const { data: companyOnly } = await supabase.from('empresas').select('*').eq('id', profileOnly.empresa_id).maybeSingle();
           if (companyOnly) {
              return {
                id: session.user.id,
                username: companyOnly.nome_empresa || session.user.email?.split('@')[0] || 'Usuário',
                email: session.user.email || '',
                empresa_id: companyOnly.id,
                role: profileOnly.role || 'admin',
                created_at: companyOnly.created_at || session.user.created_at,
                company: companyOnly
              };
           }
        }

        console.error('[AuthService] Falha total na identificação da empresa para o user:', session.user.id);
        return null; // Don't return a half-baked user if we can't find their company
      }

      return {
        id: session.user.id,
        username: empresa.nome_empresa || session.user.email?.split('@')[0] || 'Usuário',
        email: session.user.email || '',
        empresa_id: perfil.empresa_id,
        role: perfil.role || 'admin',
        created_at: empresa.created_at || session.user.created_at,
        company: empresa
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
      sessionCache = session;
      callback(event, session);
    });
  }
};
