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

      // 2. Criar empresa na tabela empresas
      const { error: companyError } = await supabase
        .from('empresas')
        .insert([
          {
            id: authUser.id,
            nome_empresa: formData.nome_empresa || formData.name,
            nif: formData.nif,
            email: formData.email,
            telefone: formData.telefone,
            endereco: formData.endereco,
            provincia: formData.provincia,
            municipio: formData.municipio,
            pais: formData.pais || 'Angola'
          }
        ]);

      if (companyError) throw companyError;

      // Retornar objeto User formatado
      return {
        id: authUser.id,
        username: formData.nome_empresa || formData.name,
        email: formData.email,
        company_id: authUser.id, // Em sistemas owner-based, o user.id é o company_id
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

      // Buscar dados da empresa/perfil
      const { data: empresa, error: empresaError } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (empresaError || !empresa) {
        // Se a empresa não existir na tabela, mas o auth sim, retornamos um user básico
        return {
          id: authData.user.id,
          username: authData.user.email?.split('@')[0] || 'Usuário',
          email: authData.user.email || '',
          company_id: authData.user.id,
          role: 'admin',
          created_at: authData.user.created_at
        };
      }

      return {
        id: authData.user.id,
        username: empresa.nome_empresa,
        email: empresa.email || authData.user.email,
        company_id: authData.user.id,
        role: 'admin',
        created_at: empresa.created_at
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

      const { data: empresa, error } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error || !empresa) {
        return {
          id: session.user.id,
          username: session.user.email?.split('@')[0] || 'Usuário',
          email: session.user.email || '',
          company_id: session.user.id,
          role: 'admin',
          created_at: session.user.created_at
        };
      }

      return {
        id: session.user.id,
        username: empresa.nome_empresa,
        email: empresa.email || session.user.email,
        company_id: session.user.id,
        role: 'admin',
        created_at: empresa.created_at
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
