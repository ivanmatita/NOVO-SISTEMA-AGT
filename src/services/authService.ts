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
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error getting session:', error);
        return null;
      }
      sessionCache = data.session;
      return sessionCache;
    } finally {
      sessionLoading = false;
    }
  },

  async registerCompany(formData: any): Promise<User> {
    try {
      const emailToRegister = formData.email?.trim() || '';
      
      // 1. Criar conta no Supabase Auth
      let { data, error } = await supabase.auth.signUp({
        email: emailToRegister,
        password: formData.password
      });

      if (error) {
        if (error.message.includes('User already registered') || error.message.includes('already exists')) {
          // Utilizador já existe, tentar fazer login para continuar o processo
          const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email: emailToRegister,
            password: formData.password
          });
          if (loginError) {
             throw new Error('A conta já existe, mas a password está incorreta. Se esqueceu a password, por favor reinicie-a. Caso contrário use o e-mail correto.');
          }
          data = loginData; // Use the login data
        } else if (error.message.includes('rate limit')) {
          throw new Error('Limite de registos excedido no Supabase (segurança anti-spam). O Supabase limita a 3 registos por hora por IP. Por favor, aguarde cerca de 1 hora ou adicione a sua empresa usando outra rede de internet.');
        } else if (error.message.includes('invalid')) {
          throw new Error(`O endereço de e-mail fornecido ("${emailToRegister}") aparenta ser inválido.`);
        } else {
          throw error;
        }
      }

      // Garantir login se não houver sessão ativa
      if (!data.session) {
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: emailToRegister,
          password: formData.password
        });
        if (loginError) {
          throw new Error('Erro ao iniciar sessão após registo. A sua conta requer verificação de e-mail? Conta parcialmente criada.');
        }
      }

      // Verificar explicitamente se o usuário está autenticado
      const currentUser = await supabase.auth.getUser();
      if (!currentUser?.data?.user?.id) {
        throw new Error("Utilizador não autenticado após o registo. Tente fazer login manualmente.");
      }

      const authUser = currentUser.data.user;

      // Check if company already exists to avoid recreating
      const { data: existingCompany } = await supabase
        .from('empresas')
        .select('id')
        .eq('auth_user_id', authUser.id)
        .maybeSingle();

      let companyId;

      if (existingCompany) {
        companyId = existingCompany.id;
      } else {
        const { data: companyData, error: companyError } = await supabase
          .from('empresas')
          .insert([
            {
              nome_empresa: formData.nome_empresa,
              nif: formData.nif,
              email: emailToRegister,
              telefone: formData.telefone,
              endereco: formData.endereco,
              provincia: formData.provincia,
              municipio: formData.municipio,
              pais: formData.pais || 'Angola',
              tipo_empresa: formData.tipo_empresa,
              nome_administrador: formData.nome_administrador,
              email_admin: formData.email_admin,
              pacote_licenca: formData.pacote_licenca,
              valor_licenca: formData.valor_licenca,
              auth_user_id: authUser.id,
              plano: formData.plano || 'trial',
              plano_status: 'trial',
              plano_expira_em: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 days trial by default
            }
          ])
          .select()
          .single();

        if (companyError) {
          console.error('Erro ao criar empresa:', companyError);
          throw companyError;
        }
        companyId = companyData.id;
      }

      // 3. Criar perfil associando o usuário à empresa recém-criada
      const { data: existingProfile } = await supabase
         .from('perfis')
         .select('id')
         .eq('id', authUser.id)
         .maybeSingle();
         
      if (!existingProfile) {
        const { error: profileError } = await supabase
          .from('perfis')
          .insert([
            {
              id: authUser.id,
              empresa_id: companyId,
              nome: formData.nome_administrador || formData.nome_empresa,
              role: 'admin'
            }
          ]);

        if (profileError) {
          console.error('Erro ao criar perfil:', profileError);
          throw profileError;
        }
      }

      // Retornar objeto User formatado
      return {
        id: authUser.id,
        username: formData.nome_administrador || formData.nome_empresa,
        email: formData.email,
        company_id: companyId,
        role: 'admin',
        created_at: new Date().toISOString()
      };
    } catch (err: any) {
      console.error('Erro no registro da empresa:', err);
      throw err;
    }
  },

  async login(email: string, password: string): Promise<User> {
    try {
      const emailToLogin = email?.trim() || '';
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: emailToLogin,
        password
      });

      if (authError) {
        // Tratamento específico de erros comuns do Supabase
        if (authError.message === 'Invalid login credentials') {
          throw new Error('E-mail ou palavra-passe incorretos. Por favor, verifique os seus dados ou registe uma nova conta.');
        }
        if (authError.message.includes('Email not confirmed')) {
          throw new Error('O seu e-mail ainda não foi confirmado. Por favor, verifique a sua caixa de entrada.');
        }
        throw authError;
      }
      
      if (!authData.user) throw new Error('Usuário não encontrado após login');

      sessionCache = authData.session;

      // Buscar dados do perfil e empresa associada
      const { data: perfil, error: perfilError } = await supabase
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
        .eq('id', authData.user.id)
        .maybeSingle();

      if (perfilError) {
        console.error('Erro ao buscar perfil:', perfilError);
      }

      if (!perfil) {
        console.warn('Utilizador sem perfil associado. Tentando carregamento legado...');
        // Fallback para empresas que ainda usam o modelo legado (ID do user = ID da empresa)
        const { data: legacyEmpresa } = await supabase
          .from('empresas')
          .select('*')
          .or(`id.eq.${authData.user.id},auth_user_id.eq.${authData.user.id}`)
          .maybeSingle();

        if (!legacyEmpresa) {
          throw new Error('Não foi encontrada uma empresa associada a esta conta. Contacte o suporte.');
        }

        return {
          id: authData.user.id,
          username: legacyEmpresa.nome_empresa || authData.user.email?.split('@')[0] || 'Usuário',
          email: authData.user.email || '',
          company_id: legacyEmpresa.id,
          role: 'admin',
          created_at: authData.user.created_at,
          company: legacyEmpresa
        };
      }

      const empresa = perfil.empresas as any;

      return {
        id: authData.user.id,
        username: empresa?.nome_empresa || 'Usuário',
        email: authData.user.email || '',
        company_id: perfil.empresa_id,
        role: perfil.role || 'admin',
        created_at: empresa?.created_at || authData.user.created_at,
        company: empresa
      };
    } catch (err: any) {
      // Log limpo para o desenvolvedor, erro amigável para o usuário
      console.error('[AuthService] Erro no login:', err.message);
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
      if (!session) return null;

      // Busca perfil com a empresa associada
      const { data: perfil, error } = await supabase
        .from('perfis')
        .select(`
          empresa_id,
          role,
          empresas (
            nome_empresa,
            email,
            created_at
          )
        `)
        .eq('id', session.user.id)
        .maybeSingle();

      if (error || !perfil) {
        // Fallback legado
        const { data: legacyEmpresa } = await supabase
          .from('empresas')
          .select('*')
          .or(`id.eq.${session.user.id},auth_user_id.eq.${session.user.id}`)
          .maybeSingle();

        return {
          id: session.user.id,
          username: legacyEmpresa?.nome_empresa || session.user.email?.split('@')[0] || 'Usuário',
          email: session.user.email || '',
          company_id: legacyEmpresa?.id || session.user.id,
          role: 'admin',
          created_at: session.user.created_at
        };
      }

      const empresa = perfil.empresas as any;

      return {
        id: session.user.id,
        username: empresa?.nome_empresa || 'Usuário',
        email: session.user.email || '',
        company_id: perfil.empresa_id,
        role: perfil.role || 'admin',
        created_at: empresa?.created_at || session.user.created_at,
        company: empresa
      };
    } catch (err) {
      console.error('Erro ao buscar usuário atual:', err);
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
