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
      // 1. Criar conta no Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password
      });

      if (error) throw error;
      const authUser = data.user;
      if (!authUser) throw new Error('Falha ao criar usuário de autenticação');

      // 2. Criar empresa na tabela empresas (UUID novo para a empresa)
      const { data: companyData, error: companyError } = await supabase
        .from('empresas')
        .insert([
          {
            nome_empresa: formData.nome_empresa || formData.name,
            nif: formData.nif,
            email: formData.email,
            telefone: formData.telefone,
            endereco: formData.endereco,
            provincia: formData.provincia,
            municipio: formData.municipio,
            pais: formData.pais || 'Angola'
          }
        ])
        .select()
        .single();

      if (companyError) {
        console.error('Erro ao criar empresa:', companyError);
        throw companyError;
      }

      // 3. Criar perfil associando o usuário à empresa recém-criada
      const { error: profileError } = await supabase
        .from('perfis')
        .insert([
          {
            id: authUser.id,
            empresa_id: companyData.id,
            nome: formData.nome_empresa || formData.name,
            role: 'admin'
          }
        ]);

      if (profileError) {
        console.error('Erro ao criar perfil:', profileError);
        throw profileError;
      }

      // Retornar objeto User formatado
      return {
        id: authUser.id,
        username: formData.nome_empresa || formData.name,
        email: formData.email,
        company_id: companyData.id,
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
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Usuário não encontrado após login');

      sessionCache = authData.session;

      // Buscar dados do perfil e empresa associada
      const { data: perfil, error: perfilError } = await supabase
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
        .eq('id', authData.user.id)
        .maybeSingle();

      if (perfilError || !perfil) {
        // Fallback para empresas que ainda usam o modelo legado (ID do user = ID da empresa)
        const { data: legacyEmpresa } = await supabase
          .from('empresas')
          .select('*')
          .eq('id', authData.user.id)
          .maybeSingle();

        return {
          id: authData.user.id,
          username: legacyEmpresa?.nome_empresa || authData.user.email?.split('@')[0] || 'Usuário',
          email: authData.user.email || '',
          company_id: legacyEmpresa?.id || authData.user.id,
          role: 'admin',
          created_at: authData.user.created_at
        };
      }

      const empresa = perfil.empresas as any;

      return {
        id: authData.user.id,
        username: empresa?.nome_empresa || 'Usuário',
        email: empresa?.email || authData.user.email || '',
        company_id: perfil.empresa_id,
        role: perfil.role || 'admin',
        created_at: empresa?.created_at || authData.user.created_at
      };
    } catch (err: any) {
      console.error('Erro no login Supabase:', err);
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
          .eq('id', session.user.id)
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
        email: empresa?.email || session.user.email || '',
        company_id: perfil.empresa_id,
        role: perfil.role || 'admin',
        created_at: empresa?.created_at || session.user.created_at
      };
    } catch (err) {
      console.error('Erro ao buscar usuário atual:', err);
      return null;
    }
  },

  async forgotPassword(email: string) {
    const lastSent = localStorage.getItem(`last_forgot_email_${email}`);
    const now = Date.now();
    if (lastSent && now - Number(lastSent) < 60000) { // 1 minute limit
      throw new Error('Por favor, aguarde um minuto antes de solicitar novamente.');
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    
    if (error) {
      if (error.message.includes('rate limit')) {
        throw new Error('Limite de envio de emails atingido. Por favor, tente mais tarde.');
      }
      throw error;
    }

    localStorage.setItem(`last_forgot_email_${email}`, now.toString());
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
